/* Manufacturing Quick Report - builds dbo.v_manufacturing_quick from the transaction HEADER tables AND their DETAIL tables.
 *
 * One row per detail line of a transaction (item, quantity, pieces ... come from the lines), plus the customer.
 * A transaction without lines - or one whose detail table is the header itself - stays one row, as before.
 *
 * The header mapping below is the one the report already used (it is known to work on your ERP). The detail tables'
 * columns are NOT hard-coded: they are read from the ERP database (INFORMATION_SCHEMA) and matched by name, so a column
 * that does not exist can never break the view. `npm run erp:mfg-view` prints, per transaction, exactly which detail
 * columns were used - if one is wrong or missing, set it in DETAIL_OVERRIDES and run the command again.
 *
 *  - table pairs (header -> detail) : Manufacturing_Quick_Report.xlsx
 *  - the pure functions here are used by src/scripts/buildMfgView.ts
 */
import type { ErpConnector } from '../db/erpConnector';

/** A header column that holds a quantity, or a SQL expression over the header alias `h`. */
type Qty = string | { expr: string };

interface HeaderColumns {
  /** header column holding the invoice number the document belongs to (shown as Invoice No) */
  inv?: string;
  job?: string;
  machine?: string;
  item?: string;
  kg?: Qty;
  pcs?: Qty;
  site?: string;
  stage?: string;
  loc?: string;
  com?: string;
  cost?: string;
}

export interface MfgSource {
  /** header table (the document) and its detail table (the lines). Same name = the table has no separate lines. */
  hed: string;
  det: string;
  /** Type shown in the report (the default when the Txn Type code is not found in TXN_NAMES) */
  type: string;
  /** several transaction names share this header table: pick the name from TXN_NAMES by the Txn Type code */
  lookup: boolean;
  cols: HeaderColumns;
}

const S = (hed: string, det: string, type: string, cols: HeaderColumns, lookup = false): MfgSource => ({ hed, det, type, lookup, cols });

/** Header table -> detail table, and which header column feeds which report column (unchanged from the header-only report). */
export const MFG_SOURCES: MfgSource[] = [
  S('fCsMatHed', 'fCsMatDet', 'Customer Mat. In', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', site: 'SiteCode', loc: 'LocCode', com: 'comcode', cost: 'CostCode' }),
  S('fSoBldAsHed', 'fSoBldAsDet', 'SO Build Assembly', { job: 'RefNo1', machine: 'machcode', item: 'ItemCode', kg: 'QtyW', pcs: 'Qty', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmSFgTranHed', 'fmSFgTranDet', 'Finish Good Trn. SO', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', cost: 'CostCode' }),
  S('fAdjhed', 'fAdjDet', 'Adjustment Entry', { site: 'SiteCode', loc: 'LocCode', com: 'comcode', cost: 'CostCode' }, true),
  S('fmfgjbtrnhed', 'fmfgjbtrndet', 'FG Job Transfer', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', loc: 'LocCode', cost: 'CostCode' }, true),
  S('fAdjRolHed', 'fAdjRolHed', 'WIP Adjustments Addition Entry', { job: 'RefNo1', item: 'ItemCode', kg: { expr: 'CASE WHEN h.IsKg = 1 THEN h.Qty END' }, pcs: { expr: 'CASE WHEN h.IsKg = 1 THEN NULL ELSE h.Qty END' }, site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', cost: 'CostCode' }),
  S('fmWstInHed', 'fmWstInDet', 'Waste In', { job: 'RefNo1', machine: 'MachCode', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fLmpHed', 'fLmpHed', 'Lumps Crush Process', { machine: 'machcode', item: 'ItemCode', kg: 'Qty', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmPipOrdhed', 'fmPipOrdDet', 'Sales Order - Pipes', { job: 'RefNo1', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fIssHed', 'FIssDet', 'Wastage Transfer', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fIssRHed', 'FIssrDet', 'Acceptance / Return Note', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fRIssHed', 'frIssDet', 'Issue - Coco', { job: 'Refno1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fAccpHed', 'fAccpDet', 'Acceptance Note', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmBuAshed', 'fmBuAsDet', 'Build Assembly - Cocopeat', { job: 'RefNo1', machine: 'MachCode', item: 'ItemCode', kg: 'AloQtyKg', pcs: 'AloQty', stage: 'PrvStagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmJbTrnhed', 'fmJbTrnDet', 'Job Transfer', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', loc: 'LocCode', cost: 'CostCode' }),
  S('fmFgTranHed', 'fmFgTranDet', 'Finish Good Transfer', { job: 'RefNo1', kg: 'Qty', pcs: 'QtyPc', stage: 'StagCode', cost: 'CostCode' }),
  S('fmWstAshed', 'fmWstAsDet', 'Wastage Build Assembly', { machine: 'MachCode', item: 'ItemCode', pcs: 'AloQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('fWstHed', 'fWstDet', 'Wastage Purchase', { site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmSfAshed', 'fmSfAsDet', 'Stretch Film Build Assembly', { machine: 'MachCode', item: 'ItemCode', pcs: 'AloQty', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmJmTrnhed', 'fmJmTrnDet', 'Jumbo Roll Transfer', { machine: 'MachCode', item: 'ItemCode', pcs: 'AloQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmMixAshed', 'fmMixAsDet', 'Mixer Build Assembly', { machine: 'MachCode', item: 'ItemCode', pcs: 'AloQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmpipAshed', 'fmPipAsdet', 'Pipe Build Assembly', { machine: 'machcode', item: 'ItemCode', kg: 'TotWeight', pcs: 'TotQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fmlsAshed', 'fmLsAsDet', 'Local Sale Build Assembly', { job: 'RefNo1', machine: 'MachCode', item: 'ItemCode', kg: 'AloQtyKg', pcs: 'AloQty', stage: 'PrvStagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fAgloHed', 'fAgloHed', 'Aglo Process', { machine: 'machcode', item: 'ItemCode', kg: 'Qty', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmInkAshed', 'fmInkAsDet', 'Special Ink Build Assembly', { machine: 'MachCode', item: 'ItemCode', pcs: 'AloQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('FiRIssHed', 'FiRIssDet', 'Issue Note', { job: 'Refno1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fiAccpHed', 'fiAccpDet', 'INK Acceptance Note', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('flRIssHed', 'flrissdet', 'Issue Note (Lami)', { site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }, true),
  S('fBldAsmbHed', 'fBldAsmbDet', 'Build Assembly', { job: 'RefNo1', machine: 'machcode', site: 'FSiteCode', loc: 'FLocCode', com: 'ComCode', cost: 'CostCode' }),
  S('flrIssRHed', 'flrissrdet', 'Issue Return (Lami)', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmLspAsHed', 'fmLspAsdet', 'Packing & Other Build Assembly', { machine: 'machcode', item: 'ItemCode', pcs: 'AloQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('FMixOHed', 'FMixODet', 'Mix INK Out Note', { job: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fMixHed', 'fMixDet', 'Mix INK In Entry', { job: 'jobno', site: 'SiteCode', loc: 'LocCode', com: 'ComCode' }),
  S('fmStTrnhed', 'fmStTrnDet', 'Site Transfer', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', site: 'sitecode', stage: 'stagcode', loc: 'LocCode', com: 'comcode', cost: 'CostCode' }, true),
  S('fmRFgTranHed', 'fmRFgTranDet', 'Roll FGTransfer', { job: 'RefNo1', kg: 'Qty', pcs: 'QtyPc', stage: 'StagCode', cost: 'CostCode' }),
  S('fmRStTrnhed', 'fmRStTrnDet', 'Site Transfer Entry-SF', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', loc: 'LocCode', cost: 'CostCode' }),
  S('fOpnhed', 'fstkin', 'Job Wise Opening Balance', { job: 'JobNo', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmLFgTranHed', 'fmLFgTranDet', 'FG Transfer (Lami)', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', site: 'SiteCode', stage: 'StagCode', loc: 'LocCode', cost: 'CostCode' }),
  S('flmWstInHed', 'flmWstInDet', 'Waste In - Lami', { site: 'SiteCode', loc: 'LocCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmSizTranHed', 'fmSizTrandet', 'Pipe Size Transfer', { item: 'ItemCode', kg: 'TotWeight', pcs: 'TotQty', stage: 'StagCode', com: 'ComCode', cost: 'CostCode' }),
  S('fmPStTrnhed', 'fmPStTrnDet', 'Site Transfer Entry-Pipe', { job: 'RefNo1', item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc', loc: 'LocCode', cost: 'CostCode' }),
  S('frDispHed', 'frDispDet', 'Dispatch', { inv: 'RefNo1', site: 'SiteCode', loc: 'LocCode', com: 'comcode', cost: 'CostCode' }, true)
];

/** Transaction names that share one header table. Add the Txn Type code as a third value, e.g. ['frDispHed', 'Dispatch - Walk In', 'DWI'],
 *  to show that name for that code (`npm run erp:mfg-view` lists the codes found in the database - erp-mfg-txn-codes.txt).
 *  Codes are also looked up automatically: when the ERP has a transaction-type table, the names below are matched to it.
 *  A code that has no name yet shows the table's default type name (no code is ever appended to a type name). */
export const TXN_NAMES: [table: string, name: string, code?: string][] = [
  ['fAdjhed', 'Lami. FG Adjustments Addition Entry'],
  ['fAdjhed', 'Return Accept Quantity In Entry'],
  ['fAdjhed', 'Return Reject Quantity In Entry'],
  ['fAdjhed', 'FG Adjustments Addition Entry'],
  ['fAdjhed', 'FG Adjustments Deduction Entry'],
  ['fAdjhed', 'SF Adjustments Deduction Entry'],
  ['fmfgjbtrnhed', 'Lami. FG Job Transfer'],
  ['fmfgjbtrnhed', 'FG Job Transfer'],
  ['fmWstInHed', 'FG To Waste'],
  ['fmWstInHed', 'Wastage In Job Wise'],
  ['fIssRHed', 'Acceptance Note'],
  ['fIssRHed', 'INK Return Entry'],
  ['fRIssHed', 'Issue - Coco'],
  ['fRIssHed', 'Issue Extra - Coco'],
  ['fmpipAshed', 'Pipe Build Assembly'],
  ['fmpipAshed', 'Pipe Waste Build Allocation'],
  ['FiRIssHed', 'INK Issue Note'],
  ['FiRIssHed', 'Issue Note'],
  ['flRIssHed', 'Issue Note - Standard (Lami)'],
  ['flRIssHed', 'Issue Note - Extra (Lami)'],
  ['fmStTrnhed', 'Site Transfer FG'],
  ['fmStTrnhed', 'Site Transfer WIP'],
  ['frDispHed', 'Sample Gate Pass'],
  ['frDispHed', 'Dispatch - Stretch Film'],
  ['frDispHed', 'Dispatch - Local Sales'],
  ['frDispHed', 'Dispatch - Walk In'],
  ['frDispHed', 'Dispatch - Pipes'],
  ['frDispHed', 'Dispatch Walking-Pipe'],
  ['frDispHed', 'Dispatch Note - Coco'],
  ['frDispHed', 'Dispatch Note - Lamination'],
  ['frDispHed', 'Dispatch Note - Trading'],
  ['frDispHed', 'Dispatch Return Note'],
  ['frDispHed', 'Dispatch Ret. Note-Pipe']
];

/** Set a detail column by hand when the automatic match is wrong. Keys are header table names (any letter case). */
export interface DetailOverride {
  /** false = keep this transaction header-only (one row per document) */
  use?: boolean;
  /** detail column that holds the header's Ref No (default RefNo) */
  key?: string;
  item?: string;
  kg?: string;
  pcs?: string;
  /** unique line id / sort column (default RecordId, then SeqNo) */
  id?: string;
  /** column holding the customer code (looked for on the header first, then on the detail table); linked to fDebtor */
  customer?: string;
  /** Quantity (Kg) = the detail's Kg column, or its Qty column on lines where the Kg column is empty / 0 */
  kgOrQty?: boolean;
}
export const DETAIL_OVERRIDES: Record<string, DetailOverride> = {
  // Dispatch lines keep their quantity in Qty; the Kg column (QtyKG) is 0 on most of them.
  frDispHed: { kgOrQty: true }
  // fAdjhed: { item: 'ItemCode', kg: 'Qty', pcs: 'QtyPc' },
  // fmBuAshed: { use: false },
};

/* ---------------- how detail columns are found (first name that exists wins; letter case does not matter) ---------------- */
const DET_ID = ['RecordId', 'SeqNo'];
const DET_KG = ['QtyKg', 'AloQtyKg', 'QtyW', 'TotWeight', 'Weight', 'NetWeight'];
const DET_PCS = ['QtyPc', 'AloQty', 'Pieces', 'TotQty', 'NoOfPcs'];
const DET_FILL: Record<'job' | 'machine' | 'stage' | 'site' | 'loc' | 'com' | 'cost', string[]> = {
  job: ['RefNo1', 'JobNo'],
  machine: ['MachCode'],
  stage: ['StagCode'],
  site: ['SiteCode'],
  loc: ['LocCode'],
  com: ['ComCode'],
  cost: ['CostCode']
};
/** Columns that hold the customer code (matched on the header first, then on the detail table). */
const CUSTOMER_COLUMNS = ['DebCode', 'DebtorCode', 'DebNo', 'CusCode', 'CustCode', 'CustomerCode', 'CusNo', 'CustNo', 'CustomerNo', 'CustomerId', 'DbCode'];
/** The customer master (dbo.fDebtor): its key and name columns, found in the database by these names. */
const DEBTOR_TABLE = 'fDebtor';
const DEBTOR_KEY = ['DebCode', 'CusCode', 'CustCode', 'DebtorCode'];
const DEBTOR_NAME = ['DebName', 'CusName', 'CustName', 'DebtorName', 'CustomerName'];
/** Only used to point out candidates in the report when no customer column was matched. */
const CUSTOMER_LIKE = /(deb|cus|client|buyer|party)/i;

/* ---------------- catalogue of the ERP database ---------------- */
/** lower-case table name -> (lower-case column name -> column name as stored) */
export type Catalog = Map<string, Map<string, string>>;

export async function loadCatalog(conn: ErpConnector): Promise<Catalog> {
  const { rows } = await conn.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo'`
  );
  return catalogFromRows(rows as { t: string; c: string }[]);
}

/** the spelling of each table as stored in the database (the catalogue itself is keyed by lower-case names) */
const TABLE_SPELLING = new WeakMap<Catalog, Map<string, string>>();

export function catalogFromRows(rows: { t: string; c: string }[]): Catalog {
  const catalog: Catalog = new Map();
  const spelling = new Map<string, string>();
  TABLE_SPELLING.set(catalog, spelling);
  rows.forEach(({ t, c }) => {
    const key = String(t).toLowerCase();
    spelling.set(key, String(t));
    if (!catalog.has(key)) catalog.set(key, new Map());
    catalog.get(key)!.set(String(c).toLowerCase(), String(c));
  });
  return catalog;
}

/* ---------------- SQL helpers ---------------- */
const q = (name: string) => `[${name.replace(/]/g, ']]')}]`;
const esc = (text: string) => text.replace(/'/g, "''");
const nvarchar = (e: string) => `CAST(${e} AS nvarchar(200))`;
const numeric = (e: string) => `CAST(${e} AS numeric(18,4))`;
const trimmed = (alias: string, col: string) => `RTRIM(${alias}.${q(col)})`;
const blank = (e: string) => `NULLIF(${e}, '')`;

/** Txn Type codes found automatically: key = codeKey(table, name) */
export type AutoCodes = Map<string, string>;
const normName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
const codeKey = (tbl: string, name: string) => `${tbl.toLowerCase()}|${normName(name)}`;
const codeFor = (tbl: string, name: string, explicit: string | undefined, auto: AutoCodes) => explicit ?? auto.get(codeKey(tbl, name));

export interface SourceReport {
  header: string;
  detail: string;
  /** lines = one row per detail line; header = one row per document */
  mode: 'lines' | 'header';
  /** report column -> where its value comes from */
  from: Record<string, string>;
  notes: string[];
}

export interface BuiltView {
  /** DROP + CREATE, with GO separators, for SSMS */
  script: string;
  dropSql: string;
  createSql: string;
  report: SourceReport[];
  skipped: string[];
}

function buildBranch(src: MfgSource, catalog: Catalog, invoiceHeaders: Set<string>): { sql: string; report: SourceReport } | { skipped: string } {
  const hedCols = catalog.get(src.hed.toLowerCase());
  if (!hedCols) return { skipped: `${src.hed}: table not found in this database - its transactions are left out of the report` };

  const notes: string[] = [];
  const from: Record<string, string> = {};
  const override = Object.entries(DETAIL_OVERRIDES).find(([k]) => k.toLowerCase() === src.hed.toLowerCase())?.[1] ?? {};

  /** actual spelling of a header column, or null (with a note) when this database does not have it */
  const hcol = (name: string | undefined, label: string): string | null => {
    if (!name) return null;
    const actual = hedCols.get(name.toLowerCase());
    if (!actual) notes.push(`header column ${name} (${label}) not found - left empty`);
    return actual ?? null;
  };
  const refNo = hedCols.get('refno');
  if (!refNo) return { skipped: `${src.hed}: has no RefNo column` };

  /* ---- detail table ---- */
  const sameTable = src.det.toLowerCase() === src.hed.toLowerCase();
  const detCols = !sameTable && override.use !== false ? catalog.get(src.det.toLowerCase()) : undefined;
  if (!sameTable && override.use !== false && !detCols) notes.push(`detail table ${src.det} not found - header only`);
  const pick = (names: (string | undefined)[], exclude: string[] = []): string | null => {
    for (const n of names) {
      if (!n || exclude.includes(n.toLowerCase())) continue;
      const actual = detCols?.get(n.toLowerCase());
      if (actual) return actual;
    }
    return null;
  };
  const detKey = detCols ? pick([override.key ?? 'RefNo']) : null;
  if (detCols && !detKey) {
    notes.push(`detail table ${src.det} has no ${override.key ?? 'RefNo'} column to join on - header only (columns: ${[...detCols.values()].join(', ')})`);
  }
  const hasDetail = Boolean(detCols && detKey);

  /* ---- header side ---- */
  const hKgName = typeof src.cols.kg === 'string' ? src.cols.kg : undefined;
  const hPcsName = typeof src.cols.pcs === 'string' ? src.cols.pcs : undefined;
  // Invoice No: the header column named in the spec, or - when the data shows that the header's job column really holds
  // invoice numbers (see detectInvoiceHeaders) - that column. In that case the job number comes from the detail lines only.
  const invName = src.cols.inv ?? (invoiceHeaders.has(src.hed.toLowerCase()) ? src.cols.job : undefined);
  const hInv = hcol(invName, 'Invoice No');
  const hJob = src.cols.inv || (invName && invName === src.cols.job) ? null : hcol(src.cols.job, 'Job No');
  const hMachine = hcol(src.cols.machine, 'Machine');
  const hItem = hcol(src.cols.item, 'Item');
  const hKg = typeof src.cols.kg === 'string' ? hcol(src.cols.kg, 'Quantity (Kg)') : null;
  const hPcs = typeof src.cols.pcs === 'string' ? hcol(src.cols.pcs, 'Pieces') : null;
  const hSite = hcol(src.cols.site, 'Site');
  const hStage = hcol(src.cols.stage, 'Stage');
  const hLoc = hcol(src.cols.loc, 'Location');
  const hCom = hcol(src.cols.com, 'Company');
  const hCost = hcol(src.cols.cost, 'Cost Centre');
  const hKgExpr = typeof src.cols.kg === 'object' ? src.cols.kg.expr : hKg ? `h.${q(hKg)}` : null;
  const hPcsExpr = typeof src.cols.pcs === 'object' ? src.cols.pcs.expr : hPcs ? `h.${q(hPcs)}` : null;

  /* ---- detail side ---- */
  const noHeaderQty = !src.cols.kg && !src.cols.pcs;
  const dId = hasDetail ? pick([override.id, ...DET_ID]) : null;
  const dItem = hasDetail ? pick([override.item, 'ItemCode']) : null;
  const dKg = hasDetail
    ? pick([override.kg, hKgName, ...DET_KG, ...(noHeaderQty ? ['Qty'] : [])], hPcsName ? [hPcsName.toLowerCase()] : [])
    : null;
  const dPcs = hasDetail
    ? pick([override.pcs, hPcsName, ...DET_PCS], hKgName ? [hKgName.toLowerCase()] : [])
    : null;
  /** Quantity (Kg) falls back to the detail's Qty where its Kg column is empty / 0 (override kgOrQty) */
  const dQtyPlain = hasDetail ? pick(['Qty']) : null;
  const kgFallback = Boolean(override.kgOrQty && dQtyPlain && (!dKg || dKg.toLowerCase() !== dQtyPlain.toLowerCase()));
  const dFill = (key: keyof typeof DET_FILL): string | null => (hasDetail ? pick(DET_FILL[key]) : null);
  const dJob = dFill('job');
  const dMachine = dFill('machine');
  const dStage = dFill('stage');
  const dSite = dFill('site');
  const dLoc = dFill('loc');
  const dCom = dFill('com');
  const dCost = dFill('cost');

  /* ---- customer ---- */
  const debtor = catalog.get(DEBTOR_TABLE.toLowerCase());
  const pickFrom = (cols: Map<string, string> | undefined, names: (string | undefined)[]): string | null => {
    for (const n of names) {
      const actual = n ? cols?.get(n.toLowerCase()) : undefined;
      if (actual) return actual;
    }
    return null;
  };
  const debKey = pickFrom(debtor, DEBTOR_KEY);
  const debName = pickFrom(debtor, DEBTOR_NAME);
  const canJoinDebtor = Boolean(debKey && debName);
  if (!debtor) notes.push(`customer master ${DEBTOR_TABLE} not found - the customer code is shown instead of the name`);
  else if (!canJoinDebtor) notes.push(`${DEBTOR_TABLE} has no recognisable code / name columns (columns: ${[...debtor.values()].join(', ')}) - the customer code is shown instead of the name`);

  let custFrom: 'h' | 'd' | null = null;
  let custCol: string | null = pickFrom(hedCols, [override.customer, ...CUSTOMER_COLUMNS]);
  if (custCol) custFrom = 'h';
  else if (hasDetail) {
    custCol = pickFrom(detCols, [override.customer, ...CUSTOMER_COLUMNS]);
    if (custCol) custFrom = 'd';
  }
  if (!custCol) {
    const like = [...hedCols.values()].filter((c) => CUSTOMER_LIKE.test(c)).map((c) => `${src.hed}.${c}`)
      .concat(detCols ? [...detCols.values()].filter((c) => CUSTOMER_LIKE.test(c)).map((c) => `${src.det}.${c}`) : []);
    notes.push(
      `no customer column on ${src.hed}${hasDetail ? ` / ${src.det}` : ''}` +
      (like.length ? ` - possible: ${like.join(', ')} (set customer: '<column>' in DETAIL_OVERRIDES)` : '')
    );
  }

  const contributes = Boolean(
    dItem || dKg || kgFallback || dPcs || dJob || dMachine || dStage || dSite || dLoc || dCom || dCost || custFrom === 'd'
  );
  const active = hasDetail && contributes;
  if (hasDetail && !contributes) {
    notes.push(`detail table ${src.det} has none of the report's columns - header only (columns: ${[...detCols!.values()].join(', ')})`);
  }
  const D = active; // detail columns may be used

  /* a header quantity repeated on every line would be counted several times: show it on the first line only */
  const guardKg = D && !dKg && !kgFallback && Boolean(hKgExpr);
  const guardPcs = D && !dPcs && Boolean(hPcsExpr);
  const needLineNo = D && (!dId || guardKg || guardPcs);
  const lineOne = `(d.${q(detKey ?? 'RefNo')} IS NULL OR d.[_ln] = 1)`;

  const idCol = D ? (dId ?? '_ln') : null;
  const lineId = nvarchar(
    `'${esc(src.hed)}:' + RTRIM(h.${q(refNo)})` + (D ? ` + ISNULL(':' + CAST(d.${q(idCol!)} AS varchar(30)), '')` : '')
  );

  /* text columns: header value first, the detail line's value only where the header has none */
  const text = (h: string | null, d: string | null, label: string): string => {
    const dd = D ? d : null;
    if (h && dd) { from[label] = `${src.hed}.${h} (then ${src.det}.${dd})`; return nvarchar(`COALESCE(${blank(trimmed('h', h))}, ${blank(trimmed('d', dd))})`); }
    if (h) { from[label] = `${src.hed}.${h}`; return nvarchar(trimmed('h', h)); }
    if (dd) { from[label] = `${src.det}.${dd}`; return nvarchar(trimmed('d', dd)); }
    return nvarchar('NULL');
  };

  const itemExprRaw = D && dItem && hItem ? `COALESCE(d.${q(dItem)}, h.${q(hItem)})` : D && dItem ? `d.${q(dItem)}` : hItem ? `h.${q(hItem)}` : null;
  const itemCode = text(hItem, dItem, 'Item code');
  const itemName = itemExprRaw ? nvarchar('RTRIM(it.ItemName)') : nvarchar('NULL');
  if (itemExprRaw) from.Name = 'fItems.ItemName';

  const quantity = (hExpr: string | null, dCol: string | null, guard: boolean, label: string, orQty: string | null = null): string => {
    if (D && (dCol || orQty)) {
      const dVal = dCol && orQty ? `COALESCE(NULLIF(d.${q(dCol)}, 0), d.${q(orQty)})` : `d.${q(dCol ?? orQty!)}`;
      from[label] = `${src.det}.${dCol ?? orQty}${dCol && orQty ? ` (or ${src.det}.${orQty} when it is 0)` : ''}` + (hExpr ? ` (document total when it has no lines)` : '');
      return numeric(hExpr ? `CASE WHEN d.${q(detKey!)} IS NULL THEN ${hExpr} ELSE ${dVal} END` : dVal);
    }
    if (hExpr) {
      from[label] = `${src.hed}` + (typeof hExpr === 'string' && hExpr.startsWith('h.') ? `.${hExpr.slice(2).replace(/[[\]]/g, '')}` : ' (expression)') + (guard ? ' (first line only)' : '');
      return numeric(guard ? `CASE WHEN ${lineOne} THEN ${hExpr} END` : hExpr);
    }
    return numeric('NULL');
  };
  const kgSql = quantity(hKgExpr, dKg, guardKg, 'Quantity (Kg)', kgFallback ? dQtyPlain : null);
  const pcsSql = quantity(hPcsExpr, dPcs, guardPcs, 'Pieces');

  /* invoice number (header) */
  let invoiceNo = nvarchar('NULL');
  if (hInv) {
    invoiceNo = nvarchar(trimmed('h', hInv));
    from['Invoice No'] = `${src.hed}.${hInv}`;
  }

  /* customer */
  let customer = nvarchar('NULL');
  if (custCol && custFrom) {
    const a = custFrom;
    const code = trimmed(a, custCol);
    from.Customer = `${custFrom === 'h' ? src.hed : src.det}.${custCol}` + (canJoinDebtor ? ` -> ${DEBTOR_TABLE}.${debName}` : '');
    customer = nvarchar(canJoinDebtor ? `COALESCE(${blank(`RTRIM(deb.${q(debName!)})`)}, ${code})` : code);
  }

  /* joins */
  const joins: string[] = [];
  if (D) {
    const key = q(detKey!);
    joins.push(
      needLineNo
        ? `LEFT JOIN (SELECT x.*, ROW_NUMBER() OVER (PARTITION BY x.${key} ORDER BY ${dId ? `x.${q(dId)}` : '(SELECT NULL)'}) AS [_ln] FROM dbo.${q(src.det)} x) d ON d.${key} = h.${q(refNo)}`
        : `LEFT JOIN dbo.${q(src.det)} d ON d.${key} = h.${q(refNo)}`
    );
  }
  if (custCol && canJoinDebtor) joins.push(`LEFT JOIN dbo.${q(DEBTOR_TABLE)} deb ON deb.${q(debKey!)} = ${custFrom}.${q(custCol)}`);
  if (itemExprRaw) joins.push(`LEFT JOIN dbo.fItems it ON it.ItemCode = ${itemExprRaw}`);
  if (src.lookup) joins.push(`LEFT JOIN txn m ON m.tbl = '${esc(src.hed)}' AND m.code = RTRIM(h.${q(hedCols.get('txntype') ?? 'TxnType')})`);

  const txnTypeCol = hedCols.get('txntype');
  const type = src.lookup ?
    nvarchar(`COALESCE(m.name, N'${esc(src.type)}')`) :
    nvarchar(`N'${esc(src.type)}'`);
  const body = [
    `${lineId} AS [lineId],`,
    `${type} AS [type],`,
    `${nvarchar(txnTypeCol ? trimmed('h', txnTypeCol) : 'NULL')} AS [txnType],`,
    `${nvarchar(`'${esc(src.hed)}'`)} AS [source],`,
    `${nvarchar(trimmed('h', refNo))} AS [reference],`,
    `${customer} AS [customer],`,
    `${invoiceNo} AS [invoiceNo],`,
    `CAST(h.${q(hedCols.get('txndate') ?? 'TxnDate')} AS date) AS [date],`,
    `${text(hJob, dJob, 'Job No')} AS [jobNo],`,
    `${nvarchar(hedCols.get('manuref') ? trimmed('h', hedCols.get('manuref')!) : 'NULL')} AS [manualNo],`,
    `${itemCode} AS [itemCode],`,
    `${itemName} AS [itemName],`,
    `${text(hMachine, dMachine, 'Machine')} AS [machine],`,
    `${kgSql} AS [qtyKg],`,
    `${pcsSql} AS [pieces],`,
    `${text(hSite, dSite, 'Site')} AS [site],`,
    `${text(hStage, dStage, 'Stage')} AS [stage],`,
    `${text(hLoc, dLoc, 'Location')} AS [location],`,
    `${text(hCom, dCom, 'Company')} AS [company],`,
    `${text(hCost, dCost, 'Cost Centre')} AS [costCentre]`,
  ];
  const sql = ['SELECT', ...body.map((l) => `    ${l}`), `  FROM dbo.${q(src.hed)} h`, ...joins.map((j) => `  ${j}`)].join('\n');

  return {
    sql,
    report: { header: src.hed, detail: src.det, mode: D ? 'lines' : 'header', from, notes }
  };
}

/** Builds the whole view from what exists in the ERP database. */
export function buildMfgView(catalog: Catalog, autoCodes: AutoCodes = new Map(), invoiceHeaders: Set<string> = new Set()): BuiltView {
  const branches: string[] = [];
  const report: SourceReport[] = [];
  const skipped: string[] = [];
  MFG_SOURCES.forEach((src) => {
    const built = buildBranch(src, catalog, invoiceHeaders);
    if ('skipped' in built) skipped.push(built.skipped);
    else {
      branches.push(built.sql);
      report.push(built.report);
    }
  });
  if (!branches.length) throw new Error('None of the manufacturing header tables were found in this database.');

  const txnRows = TXN_NAMES.map(([tbl, name, code]) => `    ('${esc(tbl)}', '${esc(code ?? autoCodes.get(codeKey(tbl, name)) ?? '?')}', N'${esc(name)}')`).join(',\n');
  const createSql = [
    'CREATE VIEW dbo.v_manufacturing_quick AS',
    'WITH txn AS (',
    '  SELECT tbl, code, name FROM (VALUES',
    txnRows,
    '  ) v(tbl, code, name)',
    ')',
    branches.join('\n\n  UNION ALL\n\n  ')
  ].join('\n');
  const dropSql = `IF OBJECT_ID('dbo.v_manufacturing_quick', 'V') IS NOT NULL DROP VIEW dbo.v_manufacturing_quick;`;

  const script = [
    '-- Manufacturing Quick Report view - GENERATED by `npm run erp:mfg-view` from the header AND detail tables of this database.',
    '-- Do not edit by hand: change DETAIL_OVERRIDES in backend/src/services/mfgViewBuilder.ts and generate it again.',
    dropSql,
    'GO',
    createSql,
    ';',
    'GO',
    '',
    'SELECT TOP 20 * FROM dbo.v_manufacturing_quick ORDER BY [date] DESC;',
    ''
  ].join('\n');

  return { script, dropSql, createSql: `${createSql}\n;`, report, skipped };
}

/** Plain-text summary of what each transaction now reads (printed by the command and saved next to the SQL). */
export function formatReport(built: BuiltView, autoCodes: AutoCodes = new Map()): string {
  const lines: string[] = [];
  const withLines = built.report.filter((r) => r.mode === 'lines');
  const needCode = TXN_NAMES.filter(([t, n, code]) => !codeFor(t, n, code, autoCodes)).length;
  const withCustomer = built.report.filter((r) => r.from.Customer).length;
  lines.push(
    `Manufacturing Quick Report view: ${built.report.length} transaction tables - ${withLines.length} read their detail lines, ${built.report.length - withLines.length} header only; ${withCustomer} have a customer.`,
    needCode ? `${needCode} transaction names that share a table still have no Txn Type code, so their documents show the table's default type name (see erp-mfg-txn-codes.txt).` : `All shared-table transaction names have a Txn Type code.`,
    ''
  );
  built.report.forEach((r) => {
    lines.push(`${r.header}  ->  ${r.detail}   [${r.mode === 'lines' ? 'header + detail lines' : 'header only'}]`);
    Object.entries(r.from).forEach(([label, where]) => lines.push(`      ${label.padEnd(14)} ${where}`));
    r.notes.forEach((n) => lines.push(`      ! ${n}`));
  });
  if (built.skipped.length) lines.push('', 'Skipped:', ...built.skipped.map((s) => `  ${s}`));
  return lines.join('\n');
}

/** For the tables shared by several transaction names: the Txn Type codes actually used in the database, with how many
 *  documents use each and one sample reference number (the prefix usually tells which name it is). */
export async function describeTxnCodes(conn: ErpConnector, catalog: Catalog, autoCodes: AutoCodes = new Map(), masterNote = ''): Promise<string> {
  const out: string[] = ['Txn Type codes in the ERP database, for the transaction names that share one header table.',
    "A code with no name yet shows the table's default type name in the report. To give it its own name, add the code in TXN_NAMES (mfgViewBuilder.ts),",
    "e.g. ['frDispHed', 'Dispatch - Walk In', 'DWI'], then run the command again.", masterNote, ''];
  const tables = [...new Set(MFG_SOURCES.filter((s) => s.lookup).map((s) => s.hed))];
  for (const hed of tables) {
    const cols = catalog.get(hed.toLowerCase());
    const typeCol = cols?.get('txntype');
    const refCol = cols?.get('refno');
    if (!typeCol || !refCol) continue;
    const names = TXN_NAMES.filter(([t]) => t.toLowerCase() === hed.toLowerCase());
    out.push(`${hed}  (${names.length} names: ${names.map(([, n, c]) => { const k = codeFor(hed, n, c, autoCodes); return k ? `${n} = ${k}` : n; }).join(' | ')})`);
    try {
      const { rows } = await conn.query(
        `SELECT RTRIM(${q(typeCol)}) AS code, COUNT(*) AS n, MIN(RTRIM(${q(refCol)})) AS sample FROM dbo.${q(hed)} GROUP BY RTRIM(${q(typeCol)}) ORDER BY RTRIM(${q(typeCol)})`
      );
      (rows as any[]).forEach((r) => {
        const mapped = names.find(([t, n, c]) => (codeFor(t, n, c, autoCodes) ?? '').toLowerCase() === String(r.code ?? '').toLowerCase() && codeFor(t, n, c, autoCodes));
        out.push(`    code ${String(r.code ?? '(blank)').padEnd(10)} ${String(r.n).padStart(7)} documents   e.g. ${r.sample}${mapped ? `   -> ${mapped[1]}` : '   (no name yet)'}`);
      });
    } catch (err: any) {
      out.push(`    could not read the codes: ${err.message ?? err}`);
    }
    out.push('');
  }
  // a transaction-type master table, if the ERP has one, usually gives code -> name directly
  const masters = [...catalog.keys()].filter((t) => /(txn|trn|tran)_?typ/.test(t)).slice(0, 5);
  for (const t of masters) {
    try {
      const real = TABLE_SPELLING.get(catalog)?.get(t) ?? t;
      const { rows } = await conn.query(`SELECT TOP 80 * FROM dbo.${q(real)}`);
      out.push(`Possible type master table dbo.${real}:`, ...(rows as any[]).map((r) => `    ${Object.values(r).map((v) => String(v ?? '').trim()).join(' | ')}`), '');
    } catch {
      /* not readable - ignore */
    }
  }
  return out.join('\n');
}

/* ---------------- Txn Type codes found automatically ---------------- */
const MASTER_CODE = ['TxnType', 'TxnCode', 'TrnType', 'TranType', 'TypeCode', 'DocType', 'TxnTypeCode'];
const MASTER_NAME = ['TxnName', 'TxnDesc', 'TxnDescription', 'TypeName', 'TrnName', 'TranName', 'TxnTypeName', 'Description', 'Desc', 'Name', 'DocName', 'DocDesc'];

/**
 * Finds the Txn Type code of each transaction name that has none: looks for a table of the ERP that lists the names
 * (a transaction-type master), matches them with the names in TXN_NAMES (ignoring case and punctuation) and keeps only
 * codes that really occur on that header table. Names that cannot be matched are simply left out.
 */
export async function resolveTxnCodes(conn: ErpConnector, catalog: Catalog): Promise<{ codes: AutoCodes; note: string }> {
  const codes: AutoCodes = new Map();
  const shared = [...new Set(MFG_SOURCES.filter((s) => s.lookup).map((s) => s.hed))];

  // codes that occur on each shared header table
  const used = new Map<string, Set<string>>();
  for (const hed of shared) {
    const typeCol = catalog.get(hed.toLowerCase())?.get('txntype');
    if (!typeCol) continue;
    try {
      const { rows } = await conn.query(`SELECT DISTINCT RTRIM(${q(typeCol)}) AS code FROM dbo.${q(hed)}`);
      used.set(hed.toLowerCase(), new Set((rows as any[]).map((r) => String(r.code ?? '').toLowerCase())));
    } catch { /* ignore */ }
  }

  const own = new Set(MFG_SOURCES.flatMap((s) => [s.hed, s.det]).map((t) => t.toLowerCase()));
  const pickCol = (cols: Map<string, string>, names: string[]) => names.map((n) => cols.get(n.toLowerCase())).find(Boolean);
  const spelled = (t: string) => TABLE_SPELLING.get(catalog)?.get(t) ?? t;
  const candidates = [...catalog.entries()]
    .filter(([t, cols]) => !own.has(t) && pickCol(cols, MASTER_CODE) && pickCol(cols, MASTER_NAME))
    .sort((a, b) => Number(/typ/.test(b[0])) - Number(/typ/.test(a[0])))
    .slice(0, 25);

  let best: { table: string; map: Map<string, string>; score: number } | null = null;
  for (const [table, cols] of candidates) {
    const codeCol = pickCol(cols, MASTER_CODE)!;
    const nameCol = pickCol(cols, MASTER_NAME)!;
    try {
      const { rows } = await conn.query(
        `SELECT DISTINCT TOP 3000 RTRIM(CAST(${q(codeCol)} AS nvarchar(100))) AS code, RTRIM(CAST(${q(nameCol)} AS nvarchar(300))) AS name FROM dbo.${q(spelled(table))}`
      );
      const byName = new Map<string, string>();
      (rows as any[]).forEach((r) => {
        const k = normName(String(r.name ?? ''));
        if (k && r.code && !byName.has(k)) byName.set(k, String(r.code));
      });
      let score = 0;
      const map = new Map<string, string>();
      TXN_NAMES.forEach(([tbl, name, explicit]) => {
        if (explicit) return;
        const code = byName.get(normName(name));
        if (code && used.get(tbl.toLowerCase())?.has(code.toLowerCase())) {
          map.set(codeKey(tbl, name), code);
          score += 1;
        }
      });
      if (score > (best?.score ?? 0)) best = { table, map, score };
    } catch { /* not readable - ignore */ }
  }

  if (best && best.score >= 2) {
    best.map.forEach((v, k) => codes.set(k, v));
    return { codes, note: `Codes matched automatically from dbo.${spelled(best.table)}: ${best.score} of ${TXN_NAMES.filter(([, , c]) => !c).length} names.` };
  }
  return { codes, note: 'No transaction-type table matching the names was found, so no code could be matched automatically.' };
}

/* ---------------- Invoice No: which header columns hold invoice numbers ---------------- */
/**
 * A header column mapped as the job (RefNo1 ...) sometimes holds the INVOICE number the document belongs to
 * (frDispHed.RefNo1 = 'ILS/2604/002'; the job number is then on the detail lines). The data decides: when at least 80 %
 * of the recent values of that column are real invoice numbers (they exist in dbo.fInvhed), the column is shown as
 * Invoice No and the job number is taken from the detail lines instead.
 */
export async function detectInvoiceHeaders(conn: ErpConnector, catalog: Catalog): Promise<{ headers: Set<string>; notes: string[] }> {
  const headers = new Set<string>();
  const notes: string[] = [];
  const invCols = catalog.get('finvhed');
  const invRef = invCols?.get('refno');
  if (!invCols || !invRef) {
    return { headers, notes: ['Invoice table fInvhed not found - Invoice No is filled only for the tables set explicitly (dispatch).'] };
  }
  const invTable = TABLE_SPELLING.get(catalog)?.get('finvhed') ?? 'fInvhed';

  for (const src of MFG_SOURCES) {
    const name = src.cols.inv ?? src.cols.job;
    const cols = catalog.get(src.hed.toLowerCase());
    const col = name ? cols?.get(name.toLowerCase()) : undefined;
    const dateCol = cols?.get('txndate');
    if (!col || !dateCol) continue;
    try {
      const { rows } = await conn.query(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN i.${q(invRef)} IS NOT NULL THEN 1 ELSE 0 END) AS hits, MIN(x.v) AS sample ` +
        `FROM (SELECT TOP 3000 RTRIM(h.${q(col)}) AS v FROM dbo.${q(src.hed)} h WHERE RTRIM(h.${q(col)}) <> '' ORDER BY h.${q(dateCol)} DESC) x ` +
        `LEFT JOIN dbo.${q(invTable)} i ON i.${q(invRef)} = x.v`
      );
      const total = Number((rows as any[])[0]?.total ?? 0);
      const hits = Number((rows as any[])[0]?.hits ?? 0);
      if (total < 1 || hits === 0) continue;
      const pct = Math.round((hits / total) * 100);
      const explicit = Boolean(src.cols.inv);
      if (explicit || (total >= 5 && pct >= 80)) {
        if (!explicit) headers.add(src.hed.toLowerCase());
        notes.push(`${src.hed}.${col}: ${pct}% of ${total} recent values are invoice numbers (e.g. ${(rows as any[])[0].sample}) -> Invoice No${explicit ? '' : '; the job number now comes from the detail lines'}`);
      } else {
        notes.push(`${src.hed}.${col}: only ${pct}% of ${total} recent values are invoice numbers - left as Job No`);
      }
    } catch { /* not readable - ignore */ }
  }
  return { headers, notes };
}

/* ---------------- are all dispatches in the report? ---------------- */
/** Other dispatch-like tables of the database that the report does not read, plus the dispatch documents' coverage. */
export async function describeDispatchCoverage(conn: ErpConnector, catalog: Catalog, autoCodes: AutoCodes): Promise<string> {
  const out: string[] = ['Dispatch coverage', ''];
  const own = new Set(MFG_SOURCES.flatMap((s) => [s.hed, s.det]).map((t) => t.toLowerCase()));
  const spelled = (t: string) => TABLE_SPELLING.get(catalog)?.get(t) ?? t;

  // 1. documents of the dispatch table and how many have a code that has no name yet
  const hed = 'frDispHed';
  const cols = catalog.get(hed.toLowerCase());
  const typeCol = cols?.get('txntype');
  if (typeCol) {
    try {
      const { rows } = await conn.query(`SELECT RTRIM(${q(typeCol)}) AS code, COUNT(*) AS n FROM dbo.${q(hed)} GROUP BY RTRIM(${q(typeCol)})`);
      const named = new Set(
        TXN_NAMES.filter(([t]) => t.toLowerCase() === hed.toLowerCase())
          .map(([t, n, c]) => (codeFor(t, n, c, autoCodes) ?? '').toLowerCase()).filter(Boolean)
      );
      let total = 0;
      let unnamed = 0;
      (rows as any[]).forEach((r) => {
        total += Number(r.n);
        if (!named.has(String(r.code ?? '').toLowerCase())) unnamed += Number(r.n);
      });
      out.push(`${hed}: ${total.toLocaleString()} dispatch documents, all included in the report.`,
        unnamed ? `  ${unnamed.toLocaleString()} of them have a Txn Type code that has no name yet and show as "Dispatch" (codes: erp-mfg-txn-codes.txt).` : '  Every Txn Type code has a name.');
    } catch (err: any) {
      out.push(`${hed}: could not be read - ${err.message ?? err}`);
    }
  }

  // 2. other tables that look like dispatches but are not in the report
  const others = [...catalog.keys()].filter((t) => /disp/.test(t) && !own.has(t));
  if (!others.length) out.push('', 'No other dispatch-like tables (names containing "Disp") exist in this database.');
  else {
    out.push('', 'Other tables with "Disp" in the name that the report does NOT read:');
    for (const t of others) {
      let count = '';
      try {
        const { rows } = await conn.query(`SELECT COUNT(*) AS n FROM dbo.${q(spelled(t))}`);
        count = ` - ${Number((rows as any[])[0].n).toLocaleString()} rows`;
      } catch { /* ignore */ }
      out.push(`    ${spelled(t)}${count}`);
    }
    out.push('  If any of these hold dispatches that should be in the report, tell me the header / detail table names and the type names.');
  }
  return out.join('\n');
}

/** After the view exists: every header document must appear in the view (compares document counts per source table). */
export async function reconcileView(conn: ErpConnector, built: BuiltView): Promise<string[]> {
  const issues: string[] = [];
  const { rows: viewRows } = await conn.query(`SELECT [source], COUNT(DISTINCT [reference]) AS docs, COUNT(*) AS lines FROM dbo.v_manufacturing_quick GROUP BY [source]`);
  const inView = new Map((viewRows as any[]).map((r) => [String(r.source).toLowerCase(), { docs: Number(r.docs), lines: Number(r.lines) }]));
  const heads = [...new Set(built.report.map((r) => r.header))];
  const { rows: headRows } = await conn.query(heads.map((h) => `SELECT '${esc(h)}' AS src, COUNT(*) AS n FROM dbo.${q(h)}`).join(' UNION ALL '));
  (headRows as any[]).forEach((r) => {
    const v = inView.get(String(r.src).toLowerCase());
    if (!v || v.docs !== Number(r.n)) issues.push(`${r.src}: ${Number(r.n).toLocaleString()} documents in the ERP, ${(v?.docs ?? 0).toLocaleString()} in the report`);
  });
  const lines = [...inView.values()].reduce((a, b) => a + b.lines, 0);
  issues.unshift(issues.length ? `Documents that do not match (${issues.length}):` : `Check passed: every document of the ${heads.length} header tables is in the report (${lines.toLocaleString()} rows in total).`);
  return issues;
}
