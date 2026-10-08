/* Renders an invoice as a PDF from ERP data (no PDF is stored anywhere — it is drawn on demand).
 * Pure function: data in, bytes out. Uses pdf-lib (pure JavaScript, no native dependencies).
 *
 * The page reproduces Polydime's own invoice templates:
 *   - "Invoice"      (Non-Tax)  — Total Value of Supply / Total
 *   - "Tax Invoice"  (VAT)      — Total Value of Supply / VAT Amount / Total, amounts shown excluding VAT
 * and each is available in LKR and USD (currency drives the column titles, the money prefix, the
 * amount-in-words wording and the bankers block).
 *
 * All geometry below is expressed in the template's own pixel grid (910 px wide) and converted to PDF
 * points with K, so it can be compared 1:1 with the PDF the client supplied. */
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PNG_BASE64, SIGNATURE_PNG_BASE64 } from '../assets/invoiceAssets';

export interface InvoiceHeader {
  refNo: string;
  date: string | null; // ISO yyyy-mm-dd
  dueDate: string | null;
  reference: string;
  payType: string;
  currency: string;
  currencyRate: number | null;
  customerCode: string;
  customerName: string;
  address: string[];
  phone: string;
  email: string;
  contact: string;
  taxReg: string;
  terms: string;
  repName: string;
  remarks: string;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number;
}

export interface InvoiceLine {
  seq: number;
  itemCode: string;
  description: string;
  uom: string;
  qty: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amount: number;
}

export interface InvoiceDocument {
  header: InvoiceHeader;
  lines: InvoiceLine[];
}

/** Supplier details printed on the invoice. Defaults are the values on the client's template. */
export interface CompanyInfo {
  name: string;
  /** Single-line postal address, e.g. "122, Stratford Avenue, Colombo 06, Sri Lanka" */
  address: string;
  phone: string;
  email: string;
  web: string;
  /** Supplier's TIN */
  tin: string;
  /** Bankers block per currency (one array entry per printed line). USD falls back to LKR when not set. */
  bankers: { LKR: string[]; USD?: string[] };
}

export type InvoiceVariant = 'tax' | 'nontax';
export interface RenderOptions {
  /** 'tax' = VAT template, 'nontax' = plain template. Default: chosen from the invoice's tax amounts. */
  variant?: InvoiceVariant;
}

// ------------------------------------------------------------------------------------------ currency
interface CurrencyFormat {
  code: string;
  /** Printed before every total, e.g. "LKR 1,250.00" */
  prefix: string;
  /** Title of the amount column on the Non-Tax template */
  amountHeader: string;
  /** Title of the amount column on the VAT template */
  amountExclHeader: string;
  majorWord: string;
  minorWord: string;
}

export function currencyFormat(raw: string): CurrencyFormat {
  const c = (raw || '').trim().toUpperCase();
  if (c === 'USD' || c === 'US$' || c === '$' || c === 'US') {
    return {
      code: 'USD',
      prefix: 'USD ',
      amountHeader: 'Amount (USD)',
      amountExclHeader: 'Amount Excluding VAT (USD)',
      majorWord: 'US Dollars',
      minorWord: 'Cents'
    };
  }
  if (c === '' || c === 'LKR' || c === 'RS' || c === 'RS.' || c === 'LKR.') {
    return {
      code: 'LKR',
      prefix: 'LKR ',
      amountHeader: 'Amount (Rs.)',
      amountExclHeader: 'Amount Excluding VAT (Rs.)',
      majorWord: 'Rupees',
      minorWord: 'Cents'
    };
  }
  // Any other currency the ERP may hold: keep the template layout, label with its code.
  return {
    code: c,
    prefix: `${c} `,
    amountHeader: `Amount (${c})`,
    amountExclHeader: `Amount Excluding VAT (${c})`,
    majorWord: c,
    minorWord: 'Cents'
  };
}

// ------------------------------------------------------------------------------------------ helpers
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
    if (n) parts.push('and');
  }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));else
  if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales: [number, string][] = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
  const out: string[] = [];
  for (const [size, name] of scales) {
    if (n >= size) {
      out.push(`${below1000(Math.floor(n / size))} ${name}`);
      n %= size;
    }
  }
  if (n > 0) out.push(below1000(n));
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/** 1250.5 -> "Rupees One Thousand Two Hundred and Fifty and Cents Fifty Only" */
export function amountInWords(amount: number, cur: CurrencyFormat): string {
  const total = Math.round(Math.abs(amount) * 100);
  const major = Math.floor(total / 100);
  const minor = total % 100;
  let s = `${cur.majorWord} ${integerToWords(major)}`;
  if (minor > 0) s += ` and ${cur.minorWord} ${integerToWords(minor)}`;
  return `${amount < 0 ? 'Minus ' : ''}${s} Only`;
}

/** The template prints dates the way the ERP does: M/D/YYYY (e.g. 7/14/2026). */
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

const fmtNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/** Net value of the supply, VAT and gross total, tolerant of ERPs that store line amounts with or without VAT. */
export interface InvoiceTotals {
  supply: number;
  vat: number;
  total: number;
  vatRatePct: number;
  /** true when the line "Amt" values already included VAT and were converted to VAT-exclusive for display */
  linesWereGross: boolean;
}

export function computeTotals(doc: InvoiceDocument): InvoiceTotals {
  const h = doc.header;
  const sumLines = doc.lines.reduce((s, l) => s + l.amount, 0);
  const tax = h.totalTax;
  const total = h.totalAmount;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.02;

  let supply: number;
  let linesWereGross = false;
  if (doc.lines.length && near(sumLines + tax, total)) {
    supply = sumLines; // lines are VAT-exclusive (the usual case)
  } else if (doc.lines.length && tax > 0 && near(sumLines, total)) {
    supply = total - tax; // lines already include VAT
    linesWereGross = true;
  } else {
    supply = total - tax; // header is the source of truth
  }
  const vatRatePct = supply > 0.005 ? Math.round((tax / supply) * 1000) / 10 : 0;
  return { supply, vat: tax, total, vatRatePct, linesWereGross };
}

export function chooseVariant(doc: InvoiceDocument): InvoiceVariant {
  const anyLineTax = doc.lines.some((l) => Math.abs(l.tax) > 0.005);
  return Math.abs(doc.header.totalTax) > 0.005 || anyLineTax ? 'tax' : 'nontax';
}

// ------------------------------------------------------------------------------------------ geometry
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const K = PAGE_W / 910; // template px -> pt
const X = (px: number) => px * K;
const Y = (py: number) => PAGE_H - py * K;

const BLACK = rgb(0, 0, 0);
const INK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.45, 0.45, 0.45);
const HEAD_FILL = rgb(0.906, 0.906, 0.906);
const BRAND_RED = rgb(0.91, 0.11, 0.14);
const BORDER = 0.8;

// body font sizes (pt)
const S_LABEL = 9.2;
const S_BOLD = 12.3;

const LEFT = 55;
const RIGHT = 866;
const COL_X = [55, 177, 501, 623, 745, 866]; // Reference | Description | Quantity | Unit Price | Amount
const BODY_TOP = 526;
const ROW_PAD = 8; // px of padding per row
const LINE_PX = 15.5; // px per text line in a row

export async function renderInvoicePdf(
doc: InvoiceDocument,
company: CompanyInfo,
options: RenderOptions = {})
: Promise<Uint8Array> {
  const h = doc.header;
  const cur = currencyFormat(h.currency);
  const variant: InvoiceVariant = options.variant ?? chooseVariant(doc);
  const isTax = variant === 'tax';
  const totals = computeTotals(doc);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${isTax ? 'Tax Invoice' : 'Invoice'} ${h.refNo}`);
  pdf.setAuthor(company.name);
  pdf.setProducer('ERP Report Studio');
  pdf.setCreator('ERP Report Studio');

  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const logo: PDFImage = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const signature: PDFImage = await pdf.embedPng(Buffer.from(SIGNATURE_PNG_BASE64, 'base64'));

  const supported = new Set<number>([...sans.getCharacterSet(), ...sansB.getCharacterSet(), ...serif.getCharacterSet(), ...serifB.getCharacterSet()]);
  /** Standard PDF fonts only cover Western characters; anything else is shown as "?" instead of failing. */
  const clean = (value: unknown): string => {
    const s = String(value ?? '').replace(/[\r\n\t]+/g, ' ');
    let out = '';
    for (const ch of s) out += supported.has(ch.codePointAt(0)!) ? ch : '?';
    return out.trim();
  };
  const width = (f: PDFFont, size: number, t: string) => f.widthOfTextAtSize(t, size);
  const widthPx = (f: PDFFont, size: number, t: string) => width(f, size, t) / K;

  /** Greedy word wrap into at most maxLines lines of maxWpx template pixels (last line gets an ellipsis if cut). */
  const wrap = (text: string, f: PDFFont, size: number, maxWpx: number, maxLines: number, firstLineWpx = maxWpx): string[] => {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur2 = '';
    const limit = () => lines.length === 0 ? firstLineWpx : maxWpx;
    for (let word of words) {
      while (widthPx(f, size, word) > limit()) {
        let cut = word.length - 1;
        while (cut > 1 && widthPx(f, size, word.slice(0, cut)) > limit()) cut--;
        if (cur2) {
          lines.push(cur2);
          cur2 = '';
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = cur2 ? `${cur2} ${word}` : word;
      if (widthPx(f, size, next) <= limit()) cur2 = next;else
      {
        lines.push(cur2);
        cur2 = word;
      }
    }
    if (cur2) lines.push(cur2);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length > 1 && widthPx(f, size, `${last}...`) > maxWpx) last = last.slice(0, -1);
      kept[maxLines - 1] = `${last.trimEnd()}...`;
      return kept;
    }
    return lines;
  };

  /** Draw text with its visual centre on cyPx (template px). */
  const put = (p: PDFPage, t: string, xPx: number, cyPx: number, size: number, f: PDFFont = sans, color = INK) => {
    const c = clean(t);
    if (c) p.drawText(c, { x: X(xPx), y: Y(cyPx) - size * 0.34, size, font: f, color });
  };
  const putRight = (p: PDFPage, t: string, xRightPx: number, cyPx: number, size: number, f: PDFFont = sans, color = INK) => {
    const c = clean(t);
    if (c) p.drawText(c, { x: X(xRightPx) - width(f, size, c), y: Y(cyPx) - size * 0.34, size, font: f, color });
  };
  const putCenter = (p: PDFPage, t: string, cxPx: number, cyPx: number, size: number, f: PDFFont = sans, color = INK) => {
    const c = clean(t);
    if (c) p.drawText(c, { x: X(cxPx) - width(f, size, c) / 2, y: Y(cyPx) - size * 0.34, size, font: f, color });
  };
  /** Single line shrunk (down to minSize) so that it fits maxWpx; truncated with "..." as a last resort. */
  const putFit = (p: PDFPage, t: string, xPx: number, cyPx: number, size: number, maxWpx: number, f: PDFFont = serif, minSize = 6.5) => {
    let c = clean(t);
    if (!c) return;
    let s = size;
    while (s > minSize && widthPx(f, s, c) > maxWpx) s -= 0.25;
    if (widthPx(f, s, c) > maxWpx) {
      while (c.length > 1 && widthPx(f, s, `${c}...`) > maxWpx) c = c.slice(0, -1);
      c = `${c.trimEnd()}...`;
    }
    put(p, c, xPx, cyPx, s, f);
  };

  const box = (p: PDFPage, x1: number, y1: number, x2: number, y2: number, fill?: ReturnType<typeof rgb>) =>
  p.drawRectangle({ x: X(x1), y: Y(y2), width: (x2 - x1) * K, height: (y2 - y1) * K, borderColor: BLACK, borderWidth: BORDER, color: fill });
  const vline = (p: PDFPage, xPx: number, y1: number, y2: number) =>
  p.drawLine({ start: { x: X(xPx), y: Y(y1) }, end: { x: X(xPx), y: Y(y2) }, thickness: BORDER, color: BLACK });
  const hline = (p: PDFPage, y: number, x1: number, x2: number) =>
  p.drawLine({ start: { x: X(x1), y: Y(y) }, end: { x: X(x2), y: Y(y) }, thickness: BORDER, color: BLACK });
  const dotted = (p: PDFPage, y: number, x1: number, x2: number) =>
  p.drawLine({ start: { x: X(x1), y: Y(y) }, end: { x: X(x2), y: Y(y) }, thickness: 0.7, color: BLACK, dashArray: [0.9, 1.6] });

  // ---------------------------------------------------------------- little icons for the letterhead
  const iconColor = rgb(0.25, 0.25, 0.25);
  const drawIcon = (p: PDFPage, kind: 'pin' | 'phone' | 'mail' | 'web', xPx: number, cyPx: number) => {
    const s = 0.52; // 16-unit icon -> pt
    const ox = X(xPx);
    const oy = Y(cyPx) + 8 * s; // top-left of the icon box (pdf-lib SVG paths grow downwards)
    const opts = { x: ox, y: oy, scale: s, color: iconColor, borderWidth: 0 };
    if (kind === 'pin') {
      p.drawSvgPath('M8 0C4.7 0 2.2 2.5 2.2 5.6c0 4.2 5.8 10.4 5.8 10.4s5.8-6.2 5.8-10.4C13.8 2.5 11.3 0 8 0zm0 8a2.4 2.4 0 110-4.8A2.4 2.4 0 018 8z', opts);
    } else if (kind === 'phone') {
      p.drawSvgPath('M3.6 1 6 1.4 7.2 5 5.7 6.2c.9 1.9 2.2 3.200 4.100 4.100L11 8.800l3.600 1.200.4 2.400C14.800 14 13.700 15 12.500 15 6.500 14.600 1.400 9.500 1 3.500 1 2.300 2 1.200 3.600 1z', opts);
    } else if (kind === 'mail') {
      p.drawSvgPath('M1 3h14v10H1zM2.600 4.200 8 8.600l5.400-4.400V4.200z', { ...opts, color: undefined, borderColor: iconColor, borderWidth: 1.2 / s * 0.5 });
    } else {
      p.drawSvgPath('M8 1a7 7 0 100 14A7 7 0 008 1zM1.500 8h13M8 1.200c-3.500 3.500-3.500 10.100 0 13.600M8 1.200c3.500 3.500 3.500 10.100 0 13.600', { ...opts, color: undefined, borderColor: iconColor, borderWidth: 1.2 / s * 0.5 });
    }
  };

  // ---------------------------------------------------------------- row layout (needed before pages are known)
  const amountColumnHeader = isTax ? cur.amountExclHeader : cur.amountHeader;
  const tableTop = isTax ? 471 : 474;
  const headerBottom = tableTop + 49;
  // total rows (bottom y of each)
  const tableBottomLast = isTax ? 793 : 821; // body ends here on the last page
  const FIRST_ROW_TOP = BODY_TOP - (isTax ? 3 : 0);
  const tableBottomMid = 1011; // on non-final pages the table runs down to the bottom of the totals block

  interface Row {
    code: string[];
    desc: string[];
    qty: string;
    unit: string;
    amt: string;
    hPx: number;
  }
  const rows: Row[] = doc.lines.map((l) => {
    const desc = wrap(l.description, sans, 8.6, COL_X[2] - COL_X[1] - 16, 3);
    const code = wrap(l.itemCode, sans, 8.6, COL_X[1] - COL_X[0] - 14, 2);
    const lines = Math.max(desc.length, code.length, 1);
    const shownAmount = totals.linesWereGross ? l.amount - l.tax : l.amount;
    const qty = `${fmtQty(l.qty)}${l.uom ? ` ${l.uom}` : ''}`;
    return {
      code,
      desc,
      qty,
      unit: fmtNum(l.unitPrice),
      amt: fmtNum(shownAmount),
      hPx: lines * LINE_PX + ROW_PAD
    };
  });

  // split rows into pages
  const lastCap = tableBottomLast - FIRST_ROW_TOP - 4;
  const midCap = tableBottomMid - FIRST_ROW_TOP - 24; // keeps room for the "continued" note
  const pagesRows: Row[][] = [];
  {
    let i = 0;
    for (;;) {
      const rest = rows.slice(i);
      const restH = rest.reduce((s, r) => s + r.hPx, 0);
      if (restH <= lastCap) {
        pagesRows.push(rest); // final page: remaining rows + totals + signature
        break;
      }
      const take: Row[] = [];
      let used = 0;
      for (const r of rest) {
        if (used + r.hPx > midCap && take.length) break;
        take.push(r);
        used += r.hPx;
      }
      // never leave the totals page empty: carry the last row over so the totals never stand alone
      if (take.length === rest.length && take.length > 1) take.pop();
      pagesRows.push(take);
      i += take.length;
    }
  }
  const pageCount = pagesRows.length;

  // ---------------------------------------------------------------- one page
  const bankLines = (cur.code === 'USD' ? company.bankers.USD : undefined) ?? company.bankers.LKR;

  const drawPage = (pageRows: Row[], pageNo: number) => {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    const last = pageNo === pageCount;

    // --- letterhead
    p.drawImage(logo, { x: X(70), y: Y(133), width: 192 * K, height: (192 * 750 / 2031) * K });
    putRight(p, company.name.toUpperCase(), 857, 75, 16.5, sansB, BRAND_RED);
    const contact: ['pin' | 'phone' | 'mail' | 'web', string][] = [
    ['pin', `${company.address}.`],
    ['phone', company.phone],
    ['mail', company.email],
    ['web', company.web]];

    const rowsC = [100, 119, 137];
    // the phone and e-mail share a line in the template
    const l1 = contact[0];
    putRight(p, l1[1], 858, rowsC[0], 9.4, sans);
    drawIcon(p, l1[0], 858 - widthPx(sans, 9.4, clean(l1[1])) - 17, rowsC[0]);
    const phoneTxt = clean(company.phone);
    const mailTxt = clean(company.email);
    const wPhone = widthPx(sans, 9.4, phoneTxt);
    const wMail = widthPx(sans, 9.4, mailTxt);
    putRight(p, mailTxt, 858, rowsC[1], 9.4, sans);
    drawIcon(p, 'mail', 858 - wMail - 17, rowsC[1]);
    putRight(p, phoneTxt, 858 - wMail - 22, rowsC[1], 9.4, sans);
    drawIcon(p, 'phone', 858 - wMail - 22 - wPhone - 15, rowsC[1]);
    putRight(p, company.web, 858, rowsC[2], 9.4, sans);
    drawIcon(p, 'web', 858 - widthPx(sans, 9.4, clean(company.web)) - 17, rowsC[2]);

    // red -> black rule under the letterhead
    {
      const x0 = 70;
      const x1 = 862;
      const steps = 110;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const f = Math.min(1, Math.max(0, (t - 0.18) / 0.4)); // 0 = red, 1 = black
        const colour = rgb(0.91 * (1 - f) + 0.04 * f, 0.11 * (1 - f) + 0.04 * f, 0.14 * (1 - f) + 0.04 * f);
        const xa = x0 + (x1 - x0) * t;
        p.drawRectangle({ x: X(xa), y: Y(152) - 0.6, width: ((x1 - x0) / steps + 0.6) * K, height: 1.25, color: colour });
      }
    }

    putCenter(p, isTax ? 'Tax Invoice' : 'Invoice', 460, 179, 14.3, sansB, BLACK);

    // --- date / number boxes
    box(p, 55, 204, 455, 231);
    put(p, 'Date of Invoice:', 61, 217.5, S_LABEL, sans);
    put(p, fmtDate(h.date), 185, 217.5, S_LABEL, sans);
    box(p, 489, 204, 866, 231);
    const noLabel = isTax ? 'Tax Invoice No.:' : 'Invoice No.:';
    put(p, noLabel, 497, 217.5, S_LABEL, serif);
    put(p, h.refNo, 497 + widthPx(serif, S_LABEL, noLabel) + 8, 217.5, S_LABEL + 0.4, serifB);

    // --- supplier box
    box(p, 55, 238, 455, 411);
    const sup: [string, number][] = [["Supplier's TIN:", 252], ["Supplier's Name:", 270], ['Address:', 293], ['Bankers', 340], ['Telephone No:', 397]];
    for (const [lbl, cy] of sup) put(p, lbl, 61, cy, S_LABEL, serif);
    put(p, company.tin, 186, 252, S_LABEL, serif);
    put(p, company.name.toUpperCase(), 186, 270, S_LABEL, serif);
    wrap(company.address, serif, S_LABEL, 215, 3).forEach((l, i) => put(p, l, 186, 293 + i * 15.5, S_LABEL, serif));
    bankLines.slice(0, 3).forEach((l, i) => put(p, l, 186, 340 + i * 15.5, S_LABEL, serif));
    put(p, company.phone, 186, 397, S_LABEL, serif);

    // --- delivery date box
    box(p, 55, 432, 455, 461);
    put(p, 'Date of Delivery', 61, 447, S_LABEL, sans);
    put(p, fmtDate(h.date), 183, 447, S_LABEL, sans);

    // --- purchaser box
    box(p, 489, 238, 866, 462);
    const topX = 493 + Math.max(...["Purchaser's TIN:", "Purchaser's Name:", 'Address:'].map((t) => widthPx(serif, S_LABEL, t))) + 10;
    const botX = 493 + Math.max(...['P.O. No.', 'Sales Order Number:', 'Salesman', 'Delivery Note No', 'Telephone No:'].map((t) => widthPx(serif, S_LABEL, t))) + 10;
    put(p, "Purchaser's TIN:", 493, 250, S_LABEL, serif);
    putFit(p, h.taxReg, topX, 250, S_LABEL, RIGHT - 8 - topX);
    put(p, "Purchaser's Name:", 493, 271, S_LABEL, serif);
    putFit(p, h.customerName || h.customerCode, topX, 271, S_LABEL, RIGHT - 8 - topX);
    put(p, 'Address:', 493, 292, S_LABEL, serif);
    wrap(h.address.filter(Boolean).join(', '), serif, S_LABEL, RIGHT - 8 - topX, 3).forEach((l, i) => put(p, l, topX, 292 + i * 15.5, S_LABEL, serif));
    const bottom: [string, string, number][] = [
    ['P.O. No.', h.reference, 354], ['Sales Order Number:', '', 374], ['Salesman', h.repName, 395],
    ['Delivery Note No', '', 416], ['Telephone No:', h.phone, 443]];
    for (const [lbl, val, cy] of bottom) {
      put(p, lbl, 493, cy, S_LABEL, serif);
      putFit(p, val, botX, cy, S_LABEL, RIGHT - 8 - botX);
    }

    // --- line table
    const bottomY = last ? tableBottomLast : tableBottomMid;
    box(p, LEFT, tableTop, RIGHT, bottomY);
    p.drawRectangle({ x: X(LEFT), y: Y(headerBottom), width: (RIGHT - LEFT) * K, height: 49 * K, color: HEAD_FILL, borderColor: BLACK, borderWidth: BORDER });
    for (const cx of COL_X.slice(1, -1)) vline(p, cx, tableTop, bottomY);
    const headCy = tableTop + 24.5;
    putCenter(p, 'Reference', (COL_X[0] + COL_X[1]) / 2, headCy, S_LABEL);
    putCenter(p, 'Description of Goods or Services', (COL_X[1] + COL_X[2]) / 2, headCy, S_LABEL);
    putCenter(p, 'Quantity', (COL_X[2] + COL_X[3]) / 2, headCy, S_LABEL);
    putCenter(p, 'Unit Price', (COL_X[3] + COL_X[4]) / 2, headCy, S_LABEL);
    const amtCx = (COL_X[4] + COL_X[5]) / 2;
    const amtW = COL_X[5] - COL_X[4] - 10;
    if (widthPx(sans, S_LABEL, amountColumnHeader) <= amtW) putCenter(p, amountColumnHeader, amtCx, headCy, S_LABEL);else
    {
      // "Amount Excluding VAT (Rs.)" does not fit on one line (the old template cut it off) — wrap onto two lines
      wrap(amountColumnHeader, sans, 8.8, amtW, 3).forEach((l, i, arr) => putCenter(p, l, amtCx, headCy + (i - (arr.length - 1) / 2) * 13.5, 8.8));
    }

    let yTop = FIRST_ROW_TOP;
    for (const r of pageRows) {
      const cy = yTop + 6 + LINE_PX / 2;
      r.code.forEach((l, i) => put(p, l, COL_X[0] + 7, cy + i * LINE_PX, 8.6));
      r.desc.forEach((l, i) => put(p, l, COL_X[1] + 8, cy + i * LINE_PX, 8.6));
      putRight(p, r.qty, COL_X[3] - 8, cy, 8.6);
      putRight(p, r.unit, COL_X[4] - 8, cy, 8.6);
      putRight(p, r.amt, COL_X[5] - 8, cy, 8.6);
      yTop += r.hPx;
    }

    if (!last) {
      const note = `Continued on next page  (${pageNo} of ${pageCount})`;
      const noteW = widthPx(sansB, 8, note) + 16;
      p.drawRectangle({ x: X(RIGHT - 4 - noteW), y: Y(tableBottomMid - 2), width: noteW * K, height: 20 * K, color: rgb(1, 1, 1) });
      putRight(p, note, RIGHT - 12, tableBottomMid - 12, 8, sansB, GREY);
    } else {
      // --- totals block
      const supplyTop = tableBottomLast;
      const valueDivider = 664;
      const money = (n: number) => `${cur.prefix}${fmtNum(n)}`;
      let y = supplyTop;
      const totalRow = (label: string, value: string, hPx: number) => {
        box(p, LEFT, y, RIGHT, y + hPx);
        vline(p, valueDivider, y, y + hPx);
        put(p, label, 61, y + hPx / 2, S_BOLD, sansB, BLACK);
        putRight(p, value, 853, y + hPx / 2, S_LABEL, serif);
        y += hPx;
      };
      if (isTax) {
        totalRow('Total Value of Supply:', money(totals.supply), 32);
        totalRow(`VAT Amount (Total Value of Supply @) (${totals.vatRatePct.toFixed(1)}%)`, money(totals.vat), 28);
        totalRow('Total', money(totals.total), 28);
      } else {
        totalRow('Total Value of Supply:', money(totals.total), 32);
        totalRow('Total', money(totals.total), 28);
      }

      // amount in words
      box(p, LEFT, 881, RIGHT, 945);
      put(p, 'Amount in Words:', 61, 894, S_BOLD, sansB, BLACK);
      const wordsLabelW = widthPx(sansB, S_BOLD, 'Amount in Words:') + 61 + 10;
      const words = wrap(amountInWords(totals.total, cur), sans, 9.4, RIGHT - 12 - 61, 2, RIGHT - 12 - wordsLabelW);
      if (words[0]) put(p, words[0], wordsLabelW, 894, 9.4, sans);
      if (words[1]) put(p, words[1], 61, 921, 9.4, sans);

      // mode of payment
      box(p, LEFT, 945, RIGHT, 981);
      put(p, 'Mode Payment:', 61, 963, S_BOLD, sansB, BLACK);
      put(p, h.payType, 61 + widthPx(sansB, S_BOLD, 'Mode Payment:') + 10, 963, 9.4, sans);

      // due date
      box(p, LEFT, 981, RIGHT, 1011);
      put(p, 'Payment Due Date:', 61, 996, S_BOLD, sansB, BLACK);
      put(p, fmtDate(h.dueDate), 242, 996, S_LABEL, sans);

      // disclaimer
      put(p, "**Under no circumstances should any of the sellers representations set out above be treated as a guarantee of it's products whether", 62, 1021, 9, serifB, BLACK);
      put(p, 'implied or expressed.', 62, 1036, 9, serifB, BLACK);

      // signature block
      put(p, company.name.toUpperCase(), 551, 1080, 10.3, serif, BLACK);
      // the template stretches the signature a little wider than its natural shape; keep clear of the company name above it
      const sigH = 84;
      const sigW = 172;
      p.drawImage(signature, { x: X(675 - sigW / 2), y: Y(1176), width: sigW * K, height: sigH * K });
      dotted(p, 1172, 512, 838);
      putCenter(p, 'Director Signature', 674, 1188, 12.2, serif, BLACK);
      dotted(p, 1181, 55, 382);
      putCenter(p, "Customer's Seal & Signature", 219, 1196, 12.2, serif, BLACK);
    }

    if (pageCount > 1) putRight(p, `Page ${pageNo} of ${pageCount}`, RIGHT, 1250, 8, sans, GREY);
  };

  pagesRows.forEach((pr, i) => drawPage(pr, i + 1));
  return pdf.save();
}
