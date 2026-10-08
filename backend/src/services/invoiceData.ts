/* Reads ONE invoice (header + lines) from the ERP database, using a parameterised query.
 * Tables used: fInvhed, fInvdet, fDebtor, fSalRep, fItems  (the POLYDIME_ERP schema).
 * The login the backend uses therefore needs SELECT on these five tables (db_datareader covers it). */
import type { ErpConnector } from '../db/erpConnector';
import type { InvoiceDocument } from './invoicePdf';

const HEADER_SQL = `
  SELECT h.RefNo, h.TxnDate, h.ManuRef, h.PayType, h.CurCode, h.CurRate, h.DebCode, h.Remarks, h.Contact,
         h.CusAdd1, h.CusAdd2, h.CusAdd3, h.CusTele, h.TaxReg, h.CrdTemCode,
         h.TotalDis, h.TotalTax, h.TotalAmt,
         deb.DebName, deb.DebAdd1, deb.DebAdd2, deb.DebAdd3, deb.DebTele, deb.DebEMail, deb.CrdPeriod,
         sr.RepName
  FROM dbo.fInvhed h
  LEFT JOIN dbo.fDebtor deb ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr  ON sr.RepCode = h.RepCode
  WHERE h.RefNo = @p1`;

const LINES_SQL = `
  SELECT d.SeqNo, d.Itemcode, COALESCE(NULLIF(d.ItemDesc, ''), it.ItemName) AS ItemDesc, it.UnitCode,
         d.Qty, d.SellPrice, d.DisAmt, d.TaxAmt, d.Amt
  FROM dbo.fInvdet d
  LEFT JOIN dbo.fItems it ON it.ItemCode = d.Itemcode
  WHERE d.RefNo = @p1
  ORDER BY d.SeqNo, d.RecordId`;

const str = (v: unknown): string => v === null || v === undefined ? '' : String(v).trim();
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dateOnly = (v: unknown): string | null => v ? String(v).slice(0, 10) : null;

function addDays(iso: string | null, days: number): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Returns null when no invoice with this number exists. */
export async function loadInvoice(conn: ErpConnector, refNo: string): Promise<InvoiceDocument | null> {
  const head = (await conn.query(HEADER_SQL, [refNo])).rows[0];
  if (!head) return null;
  const lines = (await conn.query(LINES_SQL, [refNo])).rows;

  const date = dateOnly(head.TxnDate);
  const creditDays = Math.round(num(head.CrdPeriod));
  const terms = [str(head.CrdTemCode), creditDays > 0 ? `${str(head.CrdTemCode) ? '(' : ''}${creditDays} days${str(head.CrdTemCode) ? ')' : ''}` : ''].
  filter(Boolean).
  join(' ');

  // Prefer the address printed on the invoice itself; fall back to the customer master.
  const docAddress = [head.CusAdd1, head.CusAdd2, head.CusAdd3].map(str).filter(Boolean);
  const masterAddress = [head.DebAdd1, head.DebAdd2, head.DebAdd3].map(str).filter(Boolean);

  return {
    header: {
      refNo: str(head.RefNo),
      date,
      dueDate: addDays(date, creditDays),
      reference: str(head.ManuRef),
      payType: str(head.PayType),
      currency: str(head.CurCode),
      currencyRate: head.CurRate === null || head.CurRate === undefined ? null : num(head.CurRate),
      customerCode: str(head.DebCode),
      customerName: str(head.DebName),
      address: docAddress.length ? docAddress : masterAddress,
      phone: str(head.CusTele) || str(head.DebTele),
      email: str(head.DebEMail),
      contact: str(head.Contact),
      taxReg: str(head.TaxReg),
      terms,
      repName: str(head.RepName),
      remarks: str(head.Remarks),
      totalDiscount: num(head.TotalDis),
      totalTax: num(head.TotalTax),
      totalAmount: num(head.TotalAmt)
    },
    lines: lines.map((r, i) => ({
      seq: r.SeqNo === null || r.SeqNo === undefined ? i + 1 : num(r.SeqNo),
      itemCode: str(r.Itemcode),
      description: str(r.ItemDesc),
      uom: str(r.UnitCode),
      qty: num(r.Qty),
      unitPrice: num(r.SellPrice),
      discount: num(r.DisAmt),
      tax: num(r.TaxAmt),
      amount: num(r.Amt)
    }))
  };
}
