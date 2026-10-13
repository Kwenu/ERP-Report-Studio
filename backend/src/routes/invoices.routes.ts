import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { getReportConnector, NoDataSourceError } from '../db/erpConnector';
import { loadInvoice } from '../services/invoiceData';
import { loadArDocument, AR_DOC_TYPES } from '../services/arDocumentData';
import type { ArDocType } from '../services/arDocumentData';
import { renderArDocumentPdf } from '../services/arDocumentPdf';
import { loadMfgDocument, renderMfgDocumentPdf } from '../services/mfgDocument';
import { renderInvoicePdf, chooseVariant, currencyFormat } from '../services/invoicePdf';
import type { CompanyInfo, InvoiceVariant } from '../services/invoicePdf';
import { logAudit } from '../services/audit';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

/**
 * Supplier details printed on the invoice. The defaults are the values on Polydime's own invoice template, so the
 * PDF is correct without any configuration. Optional .env overrides:
 *   COMPANY_NAME, COMPANY_ADDRESS ("line 1|line 2"), COMPANY_PHONE, COMPANY_EMAIL, COMPANY_WEB,
 *   COMPANY_TAX_REG (Supplier's TIN), COMPANY_BANK_LKR / COMPANY_BANK_USD ("Bank|Branch|City" - one printed line each)
 */
function company(): CompanyInfo {
  const list = (v: string | undefined) => (v ?? '').split('|').map((l) => l.trim()).filter(Boolean);
  const bankLkr = list(process.env.COMPANY_BANK_LKR);
  const bankUsd = list(process.env.COMPANY_BANK_USD);
  const addr = list(process.env.COMPANY_ADDRESS);
  return {
    name: process.env.COMPANY_NAME?.trim() || 'Polydime International (Pvt) Ltd',
    address: addr.length ? addr.join(', ') : '122, Stratford Avenue, Colombo 06, Sri Lanka',
    phone: process.env.COMPANY_PHONE?.trim() || '+94 77 730 64 12',
    email: process.env.COMPANY_EMAIL?.trim() || 'info@polydime.com',
    web: process.env.COMPANY_WEB?.trim() || 'www.polydime.com',
    tin: process.env.COMPANY_TAX_REG?.trim() || '114220124',
    bankers: {
      LKR: bankLkr.length ? bankLkr : ['Seylan Bank', 'Cinnamon Gardens Branch', 'Colombo-7.'],
      USD: bankUsd.length ? bankUsd : undefined
    }
  };
}

/**
 * GET /api/v1/invoices/pdf?ref=ICO/2605/001[&type=tax|nontax]
 * The layout follows the client's templates: "Tax Invoice" (VAT) or "Invoice" (Non-Tax), in LKR or USD according to
 * the invoice's own currency. The template is picked automatically (VAT on the invoice -> Tax Invoice); `type`
 * forces one when needed.
 * The ERP does not store invoices as PDF files, so the PDF is drawn on demand from the invoice's
 * rows in the ERP database. (The invoice number is a query parameter because it contains slashes.)
 */
invoicesRouter.get(
  '/pdf',
  asyncHandler(async (req, res) => {
    const ref = String(req.query.ref ?? '').trim();
    if (!ref || ref.length > 60) return res.status(400).json({ error: 'Provide the invoice number as ?ref=…' });

    let conn;
    try {
      conn = await getReportConnector();
    } catch (err) {
      if (err instanceof NoDataSourceError) return res.status(409).json({ error: err.message });
      throw err;
    }
    if (conn.dialect !== 'mssql') {
      return res.status(501).json({ error: 'Invoice PDFs are only available for the SQL Server ERP connection.' });
    }

    let doc;
    try {
      doc = await loadInvoice(conn, ref);
    } catch (err: any) {
      console.error('Invoice PDF query failed:', err.message);
      return res.status(502).json({ error: `The ERP database rejected the invoice query: ${err.message}` });
    }
    if (!doc) return res.status(404).json({ error: `Invoice "${ref}" was not found in the ERP database.` });

    const forced = String(req.query.type ?? '').toLowerCase();
    const variant: InvoiceVariant = forced === 'tax' || forced === 'nontax' ? forced : chooseVariant(doc);
    const bytes = await renderInvoicePdf(doc, company(), { variant });
    await logAudit(req.user!.name, 'Viewed invoice PDF', undefined, `${ref} (${variant === 'tax' ? 'Tax Invoice' : 'Invoice'} - ${currencyFormat(doc.header.currency).code})`).catch(() => undefined);

    const filename = `Invoice-${ref.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(bytes));
  })
);

/**
 * GET /api/v1/invoices/document?type=REC|CRD|DBN|ALO&ref=RC/2606/0018
 * Receipt, credit note, debit note or advance allocation as a PDF (shown from the AR customer-detail report).
 * These have no client template, so they use a neutral voucher layout with the same letterhead as the invoice.
 */
invoicesRouter.get(
  '/document',
  asyncHandler(async (req, res) => {
    const ref = String(req.query.ref ?? '').trim();
    const type = String(req.query.type ?? '').toUpperCase() as ArDocType;
    if (!ref || ref.length > 60) return res.status(400).json({ error: 'Provide the document number as ?ref=…' });
    if (!AR_DOC_TYPES.includes(type)) return res.status(400).json({ error: 'type must be one of REC, CRD, DBN, ALO.' });

    let conn;
    try {
      conn = await getReportConnector();
    } catch (err) {
      if (err instanceof NoDataSourceError) return res.status(409).json({ error: err.message });
      throw err;
    }
    if (conn.dialect !== 'mssql') {
      return res.status(501).json({ error: 'Document PDFs are only available for the SQL Server ERP connection.' });
    }

    let doc;
    try {
      doc = await loadArDocument(conn, type, ref);
    } catch (err: any) {
      console.error('AR document PDF query failed:', err.message);
      return res.status(502).json({ error: `The ERP database rejected the document query: ${err.message}` });
    }
    if (!doc) return res.status(404).json({ error: `${type} "${ref}" was not found in the ERP database.` });

    const bytes = await renderArDocumentPdf(doc, company());
    await logAudit(req.user!.name, `Viewed ${doc.title} PDF`, undefined, ref).catch(() => undefined);

    const filename = `${doc.title.replace(/\s+/g, '')}-${ref.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(bytes));
  })
);

/**
 * GET /api/v1/invoices/manufacturing?source=fmBuAshed&ref=BA/2606/0012[&type=Build%20Assembly%20-%20Cocopeat]
 * A manufacturing / stock transaction (Manufacturing Quick Report) as a PDF. `source` is the transaction's header table
 * (the report's "Source Table" column), `type` the transaction name printed as the heading.
 */
invoicesRouter.get(
  '/manufacturing',
  asyncHandler(async (req, res) => {
    const ref = String(req.query.ref ?? '').trim();
    const source = String(req.query.source ?? '').trim();
    const typeName = String(req.query.type ?? '').trim().slice(0, 80);
    if (!ref || ref.length > 60) return res.status(400).json({ error: 'Provide the reference number as ?ref=…' });
    if (!source || source.length > 60) return res.status(400).json({ error: 'Provide the source table as ?source=…' });

    let conn;
    try {
      conn = await getReportConnector();
    } catch (err) {
      if (err instanceof NoDataSourceError) return res.status(409).json({ error: err.message });
      throw err;
    }
    if (conn.dialect !== 'mssql') {
      return res.status(501).json({ error: 'Manufacturing PDFs are only available for the SQL Server ERP connection.' });
    }

    let doc;
    try {
      doc = await loadMfgDocument(conn, source, ref, typeName);
    } catch (err: any) {
      if (/^Unknown source/.test(String(err.message))) return res.status(400).json({ error: err.message });
      console.error('Manufacturing PDF query failed:', err.message);
      return res.status(502).json({ error: `The ERP database rejected the transaction query: ${err.message}` });
    }
    if (!doc) return res.status(404).json({ error: `Transaction "${ref}" was not found in ${source}.` });

    const bytes = await renderMfgDocumentPdf(doc, company());
    await logAudit(req.user!.name, `Viewed ${doc.title} PDF`, undefined, ref).catch(() => undefined);

    const filename = `${doc.title.replace(/[^A-Za-z0-9]+/g, '')}-${ref.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(bytes));
  })
);
