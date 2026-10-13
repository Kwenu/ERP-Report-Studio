/* Manufacturing Quick Report - "view as PDF" for one transaction.
 * The Reference No of a row opens that transaction as a PDF in the studio's own voucher layout (same letterhead as the
 * invoice / AR documents). The PDF is drawn on demand from the transaction's header record in the ERP database;
 * nothing is stored. Tables: the transaction header tables listed in MFG_TABLES (the same ones as
 * db/erp_views.manufacturing.sql) plus dbo.fItems for the item name. */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { ErpConnector } from '../db/erpConnector';
import { LOGO_PNG_BASE64 } from '../assets/invoiceAssets';
import type { CompanyInfo } from './invoicePdf';

interface MfgTable {
  /** Default heading of the voucher (the report passes the exact transaction name when it knows it) */
  title: string;
  /** header column holding the quantity in Kg / in pieces (same choice as the report's view) */
  kg?: string;
  pcs?: string;
  /** fAdjRolHed: Qty is in Kg when IsKg = 1, otherwise pieces */
  rolKg?: boolean;
}

/** Whitelist of the tables the voucher may read (the table name is never taken from the request as-is). */
export const MFG_TABLES: Record<string, MfgTable> = {
  fCsMatHed: { title: 'Customer Mat. In', kg: 'Qty' },
  fSoBldAsHed: { title: 'SO Build Assembly', kg: 'QtyW', pcs: 'Qty' },
  fmSFgTranHed: { title: 'Finish Good Trn. SO', kg: 'Qty', pcs: 'QtyPc' },
  fAdjhed: { title: 'Adjustment Entry' },
  fmfgjbtrnhed: { title: 'FG Job Transfer', kg: 'Qty', pcs: 'QtyPc' },
  fAdjRolHed: { title: 'WIP Adjustments Addition Entry', rolKg: true },
  fmWstInHed: { title: 'Waste In', kg: 'Qty', pcs: 'QtyPc' },
  fLmpHed: { title: 'Lumps Crush Process', kg: 'Qty' },
  fmPipOrdhed: { title: 'Sales Order - Pipes' },
  fIssHed: { title: 'Wastage Transfer' },
  fIssRHed: { title: 'Acceptance / Return Note' },
  fRIssHed: { title: 'Issue - Coco' },
  fAccpHed: { title: 'Acceptance Note' },
  fmBuAshed: { title: 'Build Assembly - Cocopeat', kg: 'AloQtyKg', pcs: 'AloQty' },
  fmJbTrnhed: { title: 'Job Transfer', kg: 'Qty', pcs: 'QtyPc' },
  fmFgTranHed: { title: 'Finish Good Transfer', kg: 'Qty', pcs: 'QtyPc' },
  fmWstAshed: { title: 'Wastage Build Assembly', pcs: 'AloQty' },
  fWstHed: { title: 'Wastage Purchase' },
  fmSfAshed: { title: 'Stretch Film Build Assembly', pcs: 'AloQty' },
  fmJmTrnhed: { title: 'Jumbo Roll Transfer', pcs: 'AloQty' },
  fmMixAshed: { title: 'Mixer Build Assembly', pcs: 'AloQty' },
  fmpipAshed: { title: 'Pipe Build Assembly', kg: 'TotWeight', pcs: 'TotQty' },
  fmlsAshed: { title: 'Local Sale Build Assembly', kg: 'AloQtyKg', pcs: 'AloQty' },
  fAgloHed: { title: 'Aglo Process', kg: 'Qty' },
  fmInkAshed: { title: 'Special Ink Build Assembly', pcs: 'AloQty' },
  FiRIssHed: { title: 'Issue Note' },
  fiAccpHed: { title: 'INK Acceptance Note' },
  flRIssHed: { title: 'Issue Note (Lami)' },
  fBldAsmbHed: { title: 'Build Assembly' },
  flrIssRHed: { title: 'Issue Return (Lami)' },
  fmLspAsHed: { title: 'Packing & Other Build Assembly', pcs: 'AloQty' },
  FMixOHed: { title: 'Mix INK Out Note' },
  fMixHed: { title: 'Mix INK In Entry' },
  fmStTrnhed: { title: 'Site Transfer', kg: 'Qty', pcs: 'QtyPc' },
  fmRFgTranHed: { title: 'Roll FGTransfer', kg: 'Qty', pcs: 'QtyPc' },
  fmRStTrnhed: { title: 'Site Transfer Entry-SF', kg: 'Qty', pcs: 'QtyPc' },
  fOpnhed: { title: 'Job Wise Opening Balance' },
  fmLFgTranHed: { title: 'FG Transfer (Lami)', kg: 'Qty', pcs: 'QtyPc' },
  flmWstInHed: { title: 'Waste In - Lami' },
  fmSizTranHed: { title: 'Pipe Size Transfer', kg: 'TotWeight', pcs: 'TotQty' },
  fmPStTrnhed: { title: 'Site Transfer Entry-Pipe', kg: 'Qty', pcs: 'QtyPc' },
  frDispHed: { title: 'Sample Gate Pass' }
};

const tableFor = (source: string): [string, MfgTable] | undefined =>
  Object.entries(MFG_TABLES).find(([name]) => name.toLowerCase() === source.trim().toLowerCase());

export interface MfgDocument {
  title: string;
  refNo: string;
  date: string | null;
  pairs: [string, string][];
  /** item / quantity line (when the header carries one) */
  line: { itemCode: string; itemName: string; machine: string; kg: number | null; pcs: number | null } | null;
  details: [string, string][];
  remarks: string;
  preparedBy: string;
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const isoDate = (v: unknown): string | null => {
  const s = str(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m && !s.startsWith('1900-01-01') ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
const mdy = (iso: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}/${y}`;
};
const fmtQty = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

/** Friendlier names for the header columns; anything else is split from CamelCase. */
const LABELS: Record<string, string> = {
  refno1: 'Job No', refno2: 'Ref No 2', jobno: 'Job No', issrefno: 'Issue Ref No', mrnrefno: 'MRN Ref No', debcode: 'Customer Code',
  cuspo: 'Customer PO', totalamt: 'Total Amount', qoh: 'Qty on Hand (Kg)', qohpc: 'Qty on Hand (Pcs)', qty: 'Quantity',
  qtypc: 'Pieces', aloqty: 'Pieces', aloqtykg: 'Quantity (Kg)', balqty: 'Balance Qty', costprice: 'Cost Price', perweight: 'Per Weight',
  fcomcode: 'From Company', fsitecode: 'From Site', floccode: 'From Location', tcomcode: 'To Company',
  tsitecode: 'To Site', tloccode: 'To Location', fromloccode: 'From Location', comcode: 'Company', sitecode: 'Site',
  loccode: 'Location', stagcode: 'Stage', prvstagcode: 'Previous Stage', costcode: 'Cost Centre', machcode: 'Machine',
  fmachcode: 'From Machine', txntype: 'Txn Type', adddate: 'Entered On', rpmcode: 'Raw Material Code', excode: 'Extruder',
  totweight: 'Total Weight (Kg)', totqty: 'Total Pieces', netweight: 'Net Weight', grosweight: 'Gross Weight', qtyw: 'Weight (Kg)'
};
const labelOf = (col: string): string =>
  LABELS[col.toLowerCase()] ?? col.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** Header columns that are system / bookkeeping fields, or already shown elsewhere on the voucher. */
const HIDDEN = new Set([
  'recordid', 'timestamp_column', 'prtcopy', 'glpost', 'glbatch', 'addmach', 'adduser', 'refno', 'txndate', 'manuref',
  'remarks', 'remark', 'itemcode', 'machcode', 'comcode', 'sitecode', 'loccode', 'stagcode', 'costcode', 'refno1', 'jobno', 'prvstagcode'
]);

/** Returns null when the transaction does not exist. Throws when the source is not one of MFG_TABLES. */
export async function loadMfgDocument(conn: ErpConnector, source: string, ref: string, typeName?: string): Promise<MfgDocument | null> {
  const found = tableFor(source);
  if (!found) throw new Error(`Unknown source "${source}".`);
  const [table, cfg] = found;

  const h: any = (await conn.query(`SELECT TOP 1 h.* FROM dbo.[${table}] h WHERE RTRIM(h.RefNo) = @p1`, [ref])).rows[0];
  if (!h) return null;
  const col = new Map<string, string>(Object.keys(h).map((k) => [k.toLowerCase(), k]));
  const get = (...names: string[]): unknown => {
    for (const n of names) {
      const k = col.get(n.toLowerCase());
      if (k && str(h[k]) !== '') return h[k];
    }
    return undefined;
  };

  const itemCode = str(get('ItemCode'));
  let itemName = '';
  if (itemCode) {
    const it = (await conn.query(`SELECT TOP 1 ItemName FROM dbo.fItems WHERE RTRIM(ItemCode) = @p1`, [itemCode]).catch(() => ({ rows: [] as any[] }))).rows[0];
    itemName = str(it?.ItemName);
  }
  let kg = cfg.kg ? numOrNull(get(cfg.kg)) : null;
  let pcs = cfg.pcs ? numOrNull(get(cfg.pcs)) : null;
  if (cfg.rolKg) {
    const q = numOrNull(get('Qty'));
    if (Number(get('IsKg')) === 1) kg = q; else pcs = q;
  }

  const date = isoDate(get('TxnDate'));
  const keep = (pairs: [string, unknown][]): [string, string][] =>
    pairs.map(([k, v]) => [k, str(v)] as [string, string]).filter(([, v]) => v !== '');
  const pairs = keep([
    ['Reference No', get('RefNo')], ['Date', mdy(date)], ['Manual No', get('ManuRef')], ['Job No', get('JobNo', 'RefNo1')],
    ['Company', get('ComCode', 'FComCode')], ['Site', get('SiteCode', 'FSiteCode', 'TSiteCode')],
    ['Location', get('LocCode', 'FLocCode', 'TLocCode', 'FromLocCode')], ['Stage', get('StagCode', 'PrvStagCode')],
    ['Cost Centre', get('CostCode')], ['Machine', get('MachCode', 'Fmachcode')]]);

  const used = new Set([cfg.kg, cfg.pcs].filter(Boolean).map((c) => c!.toLowerCase()));
  const details: [string, string][] = [];
  for (const [lower, key] of col) {
    if (HIDDEN.has(lower) || used.has(lower)) continue;
    const v = h[key];
    if (v === null || v === undefined) continue;
    let text: string;
    if (typeof v === 'number') {
      if (v === 0) continue;
      text = fmtQty(v);
    } else {
      const d = isoDate(v);
      text = d ? mdy(d) : str(v);
      if (/^1900-01-01/.test(str(v))) continue;
    }
    if (text !== '') details.push([labelOf(key), text]);
  }

  return {
    title: str(typeName) || cfg.title,
    refNo: str(h[col.get('refno')!]),
    date,
    pairs,
    line: itemCode || kg !== null || pcs !== null ?
      { itemCode, itemName, machine: str(get('MachCode', 'Fmachcode')), kg, pcs } : null,
    details,
    remarks: str(get('Remarks', 'Remark')),
    preparedBy: str(get('AddUser'))
  };
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const INK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.75, 0.75, 0.75);
const HEAD_FILL = rgb(0.906, 0.906, 0.906);
const BRAND_RED = rgb(0.91, 0.11, 0.14);

export async function renderMfgDocumentPdf(doc: MfgDocument, company: CompanyInfo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} ${doc.refNo}`);
  pdf.setAuthor(company.name);
  pdf.setProducer('ERP Report Studio');
  pdf.setCreator('ERP Report Studio');
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const supported = new Set<number>([...sans.getCharacterSet(), ...sansB.getCharacterSet()]);
  const clean = (value: unknown): string => {
    const s = String(value ?? '').replace(/[\r\n\t]+/g, ' ');
    let out = '';
    for (const ch of s) out += supported.has(ch.codePointAt(0)!) ? ch : '?';
    return out.trim();
  };
  const tw = (f: PDFFont, size: number, t: string) => f.widthOfTextAtSize(t, size);
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (let w of words) {
      while (tw(f, size, w) > maxW) {
        let cut = w.length - 1;
        while (cut > 1 && tw(f, size, w.slice(0, cut)) > maxW) cut--;
        if (line) { lines.push(line); line = ''; }
        lines.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const next = line ? `${line} ${w}` : w;
      if (tw(f, size, next) <= maxW) line = next; else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  };

  const totalW = PAGE_W - 2 * M;
  const pages: PDFPage[] = [];
  const newPage = () => {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    const lh = 46;
    p.drawImage(logo, { x: M, y: PAGE_H - M - lh, width: lh * (logo.width / logo.height), height: lh });
    const right = PAGE_W - M;
    [company.name, company.address, `${company.phone}  |  ${company.email}  |  ${company.web}`].forEach((t, i) => {
      const f = i === 0 ? sansB : sans;
      const s = i === 0 ? 10.5 : 8;
      const c = clean(t);
      p.drawText(c, { x: right - tw(f, s, c), y: PAGE_H - M - 9 - i * 11.5, size: s, font: f, color: i === 0 ? INK : GREY });
    });
    let y = PAGE_H - M - lh - 12;
    p.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1.4, color: BRAND_RED });
    y -= 26;
    const title = clean(doc.title.toUpperCase());
    p.drawText(title, { x: PAGE_W / 2 - tw(sansB, 16, title) / 2, y, size: 16, font: sansB, color: INK });
    return { p, y: y - 18 };
  };
  let { p: page, y } = newPage();
  const ensure = (h: number) => {
    if (y - h < M + 30) ({ p: page, y } = newPage());
  };

  /** Label / value pairs in two columns inside a bordered box, with a small heading. */
  const drawGrid = (heading: string, pairs: [string, string][]) => {
    if (!pairs.length) return;
    const colW = (totalW - 12) / 2;
    const labelW = 86;
    const rows: { l: string; v: string[] }[] = pairs.map(([l, v]) => ({ l, v: wrap(v, sans, 9, colW - labelW - 14) }));
    const heights = rows.map((r) => Math.max(1, r.v.length) * 11.5 + 3);
    // alternate: left column gets the first half
    const half = Math.ceil(rows.length / 2);
    const leftH = heights.slice(0, half).reduce((a, b) => a + b, 0);
    const rightH = heights.slice(half).reduce((a, b) => a + b, 0);
    const boxH = Math.max(leftH, rightH) + 30;
    ensure(boxH + 8);
    page.drawText(clean(heading), { x: M + 2, y: y - 9, size: 8, font: sansB, color: GREY });
    const top = y - 14;
    page.drawRectangle({ x: M, y: top - boxH + 14, width: totalW, height: boxH - 14, borderColor: LINE, borderWidth: 0.8 });
    [rows.slice(0, half), rows.slice(half)].forEach((col, ci) => {
      let yy = top - 14;
      const x = M + ci * (colW + 12) + 8;
      col.forEach((r, ri) => {
        page.drawText(clean(r.l), { x, y: yy, size: 8.2, font: sansB, color: GREY });
        r.v.forEach((t, li) => page.drawText(t, { x: x + labelW, y: yy - li * 11.5, size: 9, font: sans, color: INK }));
        yy -= heights[ci === 0 ? ri : half + ri];
      });
    });
    y = top - boxH + 14 - 14;
  };

  drawGrid('TRANSACTION', doc.pairs);

  // item / quantity line
  if (doc.line) {
    const cols = [
      { label: 'Item Code', w: 1.4, right: false, v: doc.line.itemCode },
      { label: 'Name', w: 3, right: false, v: doc.line.itemName },
      { label: 'Machine', w: 1.2, right: false, v: doc.line.machine },
      { label: 'Quantity (Kg)', w: 1.4, right: true, v: doc.line.kg === null ? '' : fmtQty(doc.line.kg) },
      { label: 'Pieces', w: 1.1, right: true, v: doc.line.pcs === null ? '' : fmtQty(doc.line.pcs) }
    ];
    const sum = cols.reduce((s, c) => s + c.w, 0);
    let acc = M;
    const lay = cols.map((c) => { const w = (c.w / sum) * totalW; const o = { ...c, x: acc, wpt: w }; acc += w; return o; });
    const cells = lay.map((c) => (c.right ? [clean(c.v)] : wrap(c.v, sans, 8.8, c.wpt - 12)));
    const rowH = Math.max(1, ...cells.map((c) => c.length)) * 11.5 + 8;
    ensure(20 + rowH + 10);
    page.drawRectangle({ x: M, y: y - 20, width: totalW, height: 20, color: HEAD_FILL, borderColor: LINE, borderWidth: 0.6 });
    lay.forEach((c) => {
      const lab = clean(c.label);
      page.drawText(lab, { x: c.right ? c.x + c.wpt - 6 - tw(sansB, 8.2, lab) : c.x + 6, y: y - 13.5, size: 8.2, font: sansB, color: INK });
    });
    y -= 20;
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + totalW, y: y - rowH }, thickness: 0.5, color: LINE });
    lay.forEach((c, ci) => cells[ci].forEach((t, li) => {
      if (!t) return;
      page.drawText(t, { x: c.right ? c.x + c.wpt - 6 - tw(sans, 8.8, t) : c.x + 6, y: y - 14 - li * 11.5, size: 8.8, font: sans, color: INK });
    }));
    y -= rowH + 14;
  }

  drawGrid('OTHER DETAILS', doc.details);

  if (doc.remarks) {
    const rl = wrap(`Remarks: ${doc.remarks}`, sans, 9, totalW - 16);
    const rh = rl.length * 12 + 12;
    ensure(rh + 10);
    page.drawRectangle({ x: M, y: y - rh, width: totalW, height: rh, borderColor: LINE, borderWidth: 0.8 });
    rl.forEach((l, i) => page.drawText(l, { x: M + 8, y: y - 16 - i * 12, size: 9, font: sans, color: INK }));
    y -= rh + 12;
  }

  if (!doc.line) {
    const note = wrap('The item and quantity lines of this transaction are held in its detail records and are not part of this summary.', sans, 8, totalW);
    ensure(note.length * 10 + 8);
    note.forEach((l, i) => page.drawText(l, { x: M, y: y - 8 - i * 10, size: 8, font: sans, color: GREY }));
    y -= note.length * 10 + 12;
  }

  // signatures
  ensure(70);
  const sigY = Math.max(M + 50, y - 50);
  const labels = [`Prepared by${doc.preparedBy ? `: ${doc.preparedBy}` : ''}`, 'Checked by', 'Authorised Signature'];
  const slot = totalW / labels.length;
  labels.forEach((lab, i) => {
    const x1 = M + i * slot + 6;
    const x2 = M + (i + 1) * slot - 18;
    page.drawLine({ start: { x: x1, y: sigY }, end: { x: x2, y: sigY }, thickness: 0.7, color: INK, dashArray: [1, 2] });
    const c = clean(lab);
    page.drawText(c, { x: x1 + (x2 - x1) / 2 - tw(sans, 8.5, c) / 2, y: sigY - 13, size: 8.5, font: sans, color: INK });
  });

  pages.forEach((p, i) => {
    p.drawText(`${clean(doc.title)} ${clean(doc.refNo)}  -  generated from the ERP database`, { x: M, y: 24, size: 7.5, font: sans, color: GREY });
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: PAGE_W - M - tw(sans, 7.5, pg), y: 24, size: 7.5, font: sans, color: GREY });
  });
  return pdf.save();
}
