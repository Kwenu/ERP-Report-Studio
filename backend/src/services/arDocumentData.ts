/* Reads ONE accounts-receivable document (receipt, credit note, debit note or advance allocation) from the ERP
 * database, using parameterised queries, and turns it into the neutral ArDocument model that arDocumentPdf.ts draws.
 * Tables used: fDRecHed + fdrecdet (REC), fDcnHed + fDcnDet (CRD), fDdbNote (DBN), fDAdAHed (ALO), plus fDebtor and fSalRep.
 * (Invoices have their own loader: invoiceData.ts.) */
import type { ErpConnector } from '../db/erpConnector';

export type ArDocType = 'REC' | 'CRD' | 'DBN' | 'ALO';
export const AR_DOC_TYPES: ArDocType[] = ['REC', 'CRD', 'DBN', 'ALO'];

export interface ArColumn {
  label: string;
  kind: 'text' | 'date' | 'money';
  /** relative width */
  w: number;
  /** money column that is left out when every row is zero */
  optional?: boolean;
}

export interface ArDocument {
  type: ArDocType;
  title: string;
  refNo: string;
  date: string | null;
  manualNo: string;
  currency: string;
  currencyRate: number | null;
  customerCode: string;
  customerName: string;
  address: string[];
  phone: string;
  email: string;
  repName: string;
  company: string;
  /** label / value pairs printed in the right-hand box (payment method, cheque, linked documents ...) */
  info: [string, string][];
  columns: ArColumn[];
  rows: (string | number | null)[][];
  /** extra lines printed above the total (e.g. Tax) */
  subTotals: { label: string; value: number }[];
  total: number;
  totalBase: number;
  totalLabel: string;
  remarks: string;
  preparedBy: string;
}

const str = (v: unknown): string => v === null || v === undefined ? '' : String(v).trim();
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dateOnly = (v: unknown): string | null => v ? String(v).slice(0, 10) : null;
const dateOrNull = (v: unknown): string | null => {
  const d = dateOnly(v);
  return d && !d.startsWith('1900-01-01') ? d : null;
};

const mdy = (iso: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

const DEBTOR = `deb.DebName, deb.DebAdd1, deb.DebAdd2, deb.DebAdd3, deb.DebTele, deb.DebEMail, sr.RepName`;
const JOINS = `LEFT JOIN dbo.fDebtor deb ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr ON sr.RepCode = h.RepCode`;

function base(type: ArDocType, title: string, h: any): ArDocument {
  return {
    type,
    title,
    refNo: str(h.RefNo),
    date: dateOnly(h.TxnDate),
    manualNo: str(h.ManuRef),
    currency: str(h.CurCode),
    currencyRate: h.CurRate === null || h.CurRate === undefined ? null : num(h.CurRate),
    customerCode: str(h.DebCode),
    customerName: str(h.DebName),
    address: [h.DebAdd1, h.DebAdd2, h.DebAdd3].map(str).filter(Boolean),
    phone: str(h.DebTele),
    email: str(h.DebEMail),
    repName: str(h.RepName),
    company: str(h.ComCode),
    info: [],
    columns: [],
    rows: [],
    subTotals: [],
    total: 0,
    totalBase: 0,
    totalLabel: 'Total',
    remarks: str(h.Remarks),
    preparedBy: str(h.AddUser)
  };
}

const keep = (pairs: [string, unknown][]): [string, string][] =>
pairs.map(([k, v]) => [k, str(v)] as [string, string]).filter(([, v]) => v !== '');

async function loadReceipt(conn: ErpConnector, ref: string): Promise<ArDocument | null> {
  const h = (await conn.query(
    `SELECT h.RefNo, h.ManuRef, h.SaleRefNo, h.TxnDate, h.CurCode, h.CurRate, h.DebCode, h.TotalAmt, h.BTotalAmt,
            h.PayType, h.Chqno, h.ChqDate, h.BankCur, h.BankRate, h.BankAmt, h.BankCharge, h.BBankChg, h.Remarks,
            h.CardSlipNo, h.SlpNo, h.bankcode, h.AddUser, h.ComCode, ${DEBTOR}
     FROM dbo.fDRecHed h ${JOINS} WHERE h.RefNo = @p1`, [ref])).rows[0];
  if (!h) return null;
  const lines = (await conn.query(
    `SELECT d.RefNo1, d.DtxnDate, d.DCurCode, d.Amt, d.BAmt, d.BnkChgs, d.GainLosAmt, d.OvPayAmt
     FROM dbo.fdrecdet d WHERE d.RefNo = @p1 ORDER BY d.RecordId`, [ref])).rows;

  const doc = base('REC', 'Receipt', h);
  const chq = str(h.Chqno);
  doc.info = keep([
    ['Payment Method', h.PayType],
    ['Cheque / Ref No', chq],
    ['Cheque Date', chq ? mdy(dateOrNull(h.ChqDate)) : ''],
    ['Bank', h.bankcode],
    ['Card Slip No', h.CardSlipNo || h.SlpNo],
    ['Bank Charges', num(h.BankCharge) ? `${num(h.BankCharge).toFixed(2)} ${str(h.BankCur)}`.trim() : ''],
    ['Advance / Sale Ref', h.SaleRefNo]]);
  doc.columns = [
  { label: 'Invoice No', kind: 'text', w: 2.2 },
  { label: 'Invoice Date', kind: 'date', w: 1.4 },
  { label: 'Inv. Cur.', kind: 'text', w: 0.9 },
  { label: 'Amount Settled', kind: 'money', w: 1.6 },
  { label: 'Amount (Rs.)', kind: 'money', w: 1.6 },
  { label: 'Bank Charges', kind: 'money', w: 1.3, optional: true },
  { label: 'Gain / Loss', kind: 'money', w: 1.3, optional: true },
  { label: 'Over Payment', kind: 'money', w: 1.3, optional: true }];
  doc.rows = lines.map((d: any) => [str(d.RefNo1), dateOrNull(d.DtxnDate), str(d.DCurCode), num(d.Amt), num(d.BAmt), num(d.BnkChgs), num(d.GainLosAmt), num(d.OvPayAmt)]);
  doc.total = num(h.TotalAmt);
  doc.totalBase = num(h.BTotalAmt);
  doc.totalLabel = 'Total Received';
  return doc;
}

async function loadCredit(conn: ErpConnector, ref: string): Promise<ArDocument | null> {
  const h = (await conn.query(
    `SELECT h.RefNo, h.AloRef, h.SaleRefNo, h.ManuRef, h.TxnDate, h.CurCode, h.CurRate, h.DebCode, h.TotalAmt, h.BTotalAmt,
            h.TotBal, h.Remarks, h.AddUser, h.ComCode, ${DEBTOR}
     FROM dbo.fDcnHed h ${JOINS} WHERE h.RefNo = @p1`, [ref])).rows[0];
  if (!h) return null;
  const lines = (await conn.query(
    `SELECT d.RefNo1, d.DtxnDate, d.DCurCode, d.Amt, d.BAmt, d.TaxAmt, d.GainLosAmt, d.Remark
     FROM dbo.fDcnDet d WHERE d.RefNo = @p1 ORDER BY d.RecordId`, [ref])).rows;

  const doc = base('CRD', 'Credit Note', h);
  doc.info = keep([
    ['Allocation Ref', h.AloRef],
    ['Sale Ref', h.SaleRefNo],
    ['Unallocated Balance', num(h.TotBal) ? num(h.TotBal).toFixed(2) : '']]);
  doc.columns = [
  { label: 'Applied to Invoice', kind: 'text', w: 2.2 },
  { label: 'Invoice Date', kind: 'date', w: 1.4 },
  { label: 'Inv. Cur.', kind: 'text', w: 0.9 },
  { label: 'Tax', kind: 'money', w: 1.2, optional: true },
  { label: 'Amount', kind: 'money', w: 1.6 },
  { label: 'Amount (Rs.)', kind: 'money', w: 1.6 },
  { label: 'Gain / Loss', kind: 'money', w: 1.2, optional: true },
  { label: 'Remark', kind: 'text', w: 2 }];
  doc.rows = lines.map((d: any) => [str(d.RefNo1), dateOrNull(d.DtxnDate), str(d.DCurCode), num(d.TaxAmt), num(d.Amt), num(d.BAmt), num(d.GainLosAmt), str(d.Remark)]);
  doc.total = num(h.TotalAmt);
  doc.totalBase = num(h.BTotalAmt);
  doc.totalLabel = 'Total Credit';
  return doc;
}

async function loadDebit(conn: ErpConnector, ref: string): Promise<ArDocument | null> {
  const rows = (await conn.query(
    `SELECT h.RefNo, h.RefInv, h.SaleRefNo, h.ManuRef, h.TxnDate, h.CurCode, h.CurRate, h.DebCode, h.TaxComCode,
            h.TaxAmt, h.BTaxAmt, h.Amt, h.BAmt, h.TotBal, h.Remarks, h.jobno, h.AddUser, h.ComCode, ${DEBTOR}
     FROM dbo.fDdbNote h ${JOINS}
     WHERE h.RefNo = @p1 AND LTRIM(RTRIM(h.TxnType)) = '20' ORDER BY h.RecordId`, [ref])).rows;
  const h: any = rows[0];
  if (!h) return null;
  const doc = base('DBN', 'Debit Note', h);
  doc.info = keep([
    ['Against Invoice', h.RefInv],
    ['Sale Ref', h.SaleRefNo],
    ['Job No', h.jobno],
    ['Balance Outstanding', num(h.TotBal) ? num(h.TotBal).toFixed(2) : '']]);
  doc.columns = [
  { label: 'Against Invoice', kind: 'text', w: 2.2 },
  { label: 'Tax Code', kind: 'text', w: 1.2 },
  { label: 'Remarks', kind: 'text', w: 3 },
  { label: 'Tax', kind: 'money', w: 1.3, optional: true },
  { label: 'Amount', kind: 'money', w: 1.6 },
  { label: 'Amount (Rs.)', kind: 'money', w: 1.6 }];
  doc.rows = rows.map((d: any) => [str(d.RefInv), str(d.TaxComCode), str(d.Remarks), num(d.TaxAmt), num(d.Amt), num(d.BAmt)]);
  doc.total = rows.reduce((s: number, d: any) => s + num(d.Amt), 0);
  doc.totalBase = rows.reduce((s: number, d: any) => s + num(d.BAmt), 0);
  doc.totalLabel = 'Total Debit';
  return doc;
}

async function loadAllocation(conn: ErpConnector, ref: string): Promise<ArDocument | null> {
  const h = (await conn.query(
    `SELECT h.RefNo, h.SaleRefNo, h.AdvNo, h.AdvCur, h.AdvRate, h.ManuRef, h.TxnDate, h.CurCode, h.CurRate, h.DebCode,
            h.Remarks, h.TotalAmt, h.BTotalAmt, h.AddUser, ${DEBTOR}
     FROM dbo.fDAdAHed h ${JOINS} WHERE h.RefNo = @p1`, [ref])).rows[0];
  if (!h) return null;
  const doc = base('ALO', 'Advance Allocation', h);
  doc.info = keep([
    ['Advance No', h.AdvNo],
    ['Advance Currency', h.AdvCur],
    ['Advance Rate', num(h.AdvRate) ? num(h.AdvRate).toFixed(4) : '']]);
  doc.columns = [
  { label: 'Allocated to Invoice', kind: 'text', w: 2.2 },
  { label: 'Advance No', kind: 'text', w: 1.8 },
  { label: 'Remarks', kind: 'text', w: 3 },
  { label: 'Amount', kind: 'money', w: 1.6 },
  { label: 'Amount (Rs.)', kind: 'money', w: 1.6 }];
  doc.rows = [[str(h.SaleRefNo), str(h.AdvNo), str(h.Remarks), num(h.TotalAmt), num(h.BTotalAmt)]];
  doc.total = num(h.TotalAmt);
  doc.totalBase = num(h.BTotalAmt);
  doc.totalLabel = 'Total Allocated';
  return doc;
}

/** Returns null when no document of this type and number exists. */
export async function loadArDocument(conn: ErpConnector, type: ArDocType, ref: string): Promise<ArDocument | null> {
  switch (type) {
    case 'REC':return loadReceipt(conn, ref);
    case 'CRD':return loadCredit(conn, ref);
    case 'DBN':return loadDebit(conn, ref);
    case 'ALO':return loadAllocation(conn, ref);
  }
}
