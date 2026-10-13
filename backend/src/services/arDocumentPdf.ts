/* Draws a receipt, credit note, debit note or advance allocation as a PDF (A4, pdf-lib, nothing is stored).
 * Invoices keep the client's own invoice templates (invoicePdf.ts); these documents share its letterhead,
 * colours and currency wording so the whole set looks like one family. */
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PNG_BASE64 } from '../assets/invoiceAssets';
import { amountInWords, currencyFormat } from './invoicePdf';
import type { CompanyInfo } from './invoicePdf';
import type { ArDocument } from './arDocumentData';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; // page margin
const INK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.75, 0.75, 0.75);
const HEAD_FILL = rgb(0.906, 0.906, 0.906);
const BRAND_RED = rgb(0.91, 0.11, 0.14);

const fmtNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${m}/${d}/${y}` : iso;
}

export async function renderArDocumentPdf(doc: ArDocument, company: CompanyInfo): Promise<Uint8Array> {
  const cur = currencyFormat(doc.currency);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} ${doc.refNo}`);
  pdf.setAuthor(company.name);
  pdf.setProducer('ERP Report Studio');
  pdf.setCreator('ERP Report Studio');

  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo: PDFImage = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const supported = new Set<number>([...sans.getCharacterSet(), ...sansB.getCharacterSet()]);
  const clean = (value: unknown): string => {
    const s = String(value ?? '').replace(/[\r\n\t]+/g, ' ');
    let out = '';
    for (const ch of s) out += supported.has(ch.codePointAt(0)!) ? ch : '?';
    return out.trim();
  };
  const tw = (f: PDFFont, size: number, t: string) => f.widthOfTextAtSize(t, size);

  /** Word wrap into lines no wider than maxW points. */
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (let w of words) {
      while (tw(f, size, w) > maxW) {
        let cut = w.length - 1;
        while (cut > 1 && tw(f, size, w.slice(0, cut)) > maxW) cut--;
        if (line) {lines.push(line);line = '';}
        lines.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const next = line ? `${line} ${w}` : w;
      if (tw(f, size, next) <= maxW) line = next;else {lines.push(line);line = w;}
    }
    if (line) lines.push(line);
    return lines;
  };

  // ------------------------------------------------------------------ which columns are shown
  const cols = doc.columns.
  map((c, i) => ({ ...c, i })).
  filter((c) => !c.optional || doc.rows.some((r) => Math.abs(Number(r[c.i]) || 0) > 0.005));
  const totalW = PAGE_W - 2 * M;
  const sumW = cols.reduce((s, c) => s + c.w, 0);
  let acc = M;
  const layout = cols.map((c) => {
    const w = c.w / sumW * totalW;
    const out = { ...c, x: acc, wpt: w };
    acc += w;
    return out;
  });
  const cellText = (c: (typeof layout)[number], v: string | number | null): string => {
    if (v === null || v === undefined || v === '') return '';
    if (c.kind === 'money') return fmtNum(Number(v) || 0);
    if (c.kind === 'date') return fmtDate(String(v));
    return String(v);
  };

  // ------------------------------------------------------------------ page furniture
  const pages: PDFPage[] = [];
  const headerBottom = (p: PDFPage, first: boolean): number => {
    // letterhead: logo left, company details right
    const lh = 46;
    const lw = lh * (logo.width / logo.height);
    p.drawImage(logo, { x: M, y: PAGE_H - M - lh, width: lw, height: lh });
    const right = PAGE_W - M;
    const lines = [company.name, company.address, `${company.phone}  |  ${company.email}  |  ${company.web}`, `Supplier's TIN: ${company.tin}`];
    lines.forEach((t, i) => {
      const f = i === 0 ? sansB : sans;
      const s = i === 0 ? 10.5 : 8;
      const c = clean(t);
      p.drawText(c, { x: right - tw(f, s, c), y: PAGE_H - M - 9 - i * 11.5, size: s, font: f, color: i === 0 ? INK : GREY });
    });
    let y = PAGE_H - M - lh - 12;
    p.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1.4, color: BRAND_RED });
    y -= 26;
    const title = clean(doc.title.toUpperCase());
    p.drawText(title, { x: PAGE_W / 2 - tw(sansB, 17, title) / 2, y, size: 17, font: sansB, color: INK });
    return y - 14;
  };

  const newPage = (first: boolean) => {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return { p, y: headerBottom(p, first) };
  };

  // ------------------------------------------------------------------ first page: parties + document box
  let { p: page, y } = newPage(true);
  const boxTop = y;
  const half = (totalW - 12) / 2;
  const labelW = 88;

  const drawPairs = (p: PDFPage, x: number, top: number, w: number, pairs: [string, string][], heading?: string): number => {
    let yy = top - 14;
    if (heading) {
      p.drawText(heading, { x: x + 8, y: yy, size: 8, font: sansB, color: GREY });
      yy -= 14;
    }
    for (const [label, value] of pairs) {
      const lines = wrap(value, sans, 9, w - labelW - 16);
      if (!lines.length) continue;
      p.drawText(clean(label), { x: x + 8, y: yy, size: 8.2, font: sansB, color: GREY });
      lines.forEach((l, i) => p.drawText(l, { x: x + 8 + labelW, y: yy - i * 11.5, size: 9, font: sans, color: INK }));
      yy -= Math.max(1, lines.length) * 11.5 + 3;
    }
    return yy;
  };

  const customerPairs: [string, string][] = [
  ['Customer', doc.customerName || doc.customerCode],
  ['Customer Code', doc.customerCode],
  ['Address', doc.address.join(', ')],
  ['Telephone', doc.phone],
  ['E-mail', doc.email]];
  const docPairs: [string, string][] = [
  [`${doc.title} No`, doc.refNo],
  ['Date', fmtDate(doc.date)],
  ['Manual No', doc.manualNo],
  ['Currency', `${cur.code}${doc.currencyRate && cur.code !== 'LKR' ? `  (rate ${doc.currencyRate.toFixed(4)})` : ''}`],
  ['Company', doc.company],
  ['Sales Rep', doc.repName],
  ...doc.info];

  const leftEnd = drawPairs(page, M, boxTop, half, customerPairs, 'CUSTOMER');
  const rightEnd = drawPairs(page, M + half + 12, boxTop, half, docPairs, 'DOCUMENT');
  const boxBottom = Math.min(leftEnd, rightEnd) - 4;
  for (const x of [M, M + half + 12]) {
    page.drawRectangle({ x, y: boxBottom, width: half, height: boxTop - boxBottom, borderColor: LINE, borderWidth: 0.8 });
  }
  y = boxBottom - 20;

  // ------------------------------------------------------------------ details table
  const rowFont = 8.6;
  const drawTableHead = (p: PDFPage, top: number): number => {
    p.drawRectangle({ x: M, y: top - 20, width: totalW, height: 20, color: HEAD_FILL, borderColor: LINE, borderWidth: 0.6 });
    for (const c of layout) {
      const lab = clean(c.label);
      const x = c.kind === 'money' ? c.x + c.wpt - 6 - tw(sansB, 8.2, lab) : c.x + 6;
      p.drawText(lab, { x, y: top - 13.5, size: 8.2, font: sansB, color: INK });
    }
    return top - 20;
  };
  y = drawTableHead(page, y);

  const FOOT_RESERVE = 235; // room needed under the table on the last page (totals, words, signatures)
  const rowsOut = doc.rows.map((r) => layout.map((c) => {
    const t = cellText(c, r[c.i]);
    return c.kind === 'text' ? wrap(t, sans, rowFont, c.wpt - 12) : [t];
  }));
  rowsOut.forEach((cells, idx) => {
    const lines = Math.max(1, ...cells.map((c) => c.length));
    const h = lines * 11.5 + 8;
    const isLast = idx === rowsOut.length - 1;
    if (y - h < M + 30 + (isLast ? FOOT_RESERVE : 0)) {
      // keep the last row together with the totals: a new page is started when they would not fit
      ({ p: page, y } = newPage(false));
      y = drawTableHead(page, y - 4);
    }
    page.drawLine({ start: { x: M, y: y - h }, end: { x: M + totalW, y: y - h }, thickness: 0.5, color: LINE });
    layout.forEach((c, ci) => {
      cells[ci].forEach((t, li) => {
        const x = c.kind === 'money' ? c.x + c.wpt - 6 - tw(sans, rowFont, t) : c.x + 6;
        if (t) page.drawText(t, { x, y: y - 14 - li * 11.5, size: rowFont, font: sans, color: INK });
      });
    });
    y -= h;
  });
  if (!doc.rows.length) {
    page.drawText('No detail lines were found for this document.', { x: M + 6, y: y - 16, size: 9, font: sans, color: GREY });
    y -= 26;
  }

  // ------------------------------------------------------------------ totals
  y -= 14;
  const tx = PAGE_W - M - 230;
  const totalLine = (label: string, value: string, bold = false, fill = false) => {
    if (fill) page.drawRectangle({ x: tx, y: y - 18, width: 230, height: 20, color: HEAD_FILL });
    const f = bold ? sansB : sans;
    page.drawText(clean(label), { x: tx + 8, y: y - 12, size: 9.2, font: f, color: INK });
    page.drawText(clean(value), { x: tx + 222 - tw(f, 9.2, clean(value)), y: y - 12, size: 9.2, font: f, color: INK });
    y -= 21;
  };
  for (const s of doc.subTotals) totalLine(s.label, `${cur.prefix}${fmtNum(s.value)}`);
  totalLine(doc.totalLabel, `${cur.prefix}${fmtNum(doc.total)}`, true, true);
  if (cur.code !== 'LKR') totalLine('Value in Rs.', `LKR ${fmtNum(doc.totalBase)}`);

  // amount in words
  y -= 6;
  const words = wrap(`Amount in Words: ${amountInWords(doc.total, cur)}`, sans, 9, totalW - 16);
  const wordsH = words.length * 12 + 12;
  page.drawRectangle({ x: M, y: y - wordsH, width: totalW, height: wordsH, borderColor: LINE, borderWidth: 0.8 });
  words.forEach((l, i) => page.drawText(l, { x: M + 8, y: y - 16 - i * 12, size: 9, font: i === 0 ? sansB : sans, color: INK }));
  y -= wordsH + 10;

  if (doc.remarks) {
    const rl = wrap(`Remarks: ${doc.remarks}`, sans, 9, totalW - 16);
    const rh = rl.length * 12 + 12;
    page.drawRectangle({ x: M, y: y - rh, width: totalW, height: rh, borderColor: LINE, borderWidth: 0.8 });
    rl.forEach((l, i) => page.drawText(l, { x: M + 8, y: y - 16 - i * 12, size: 9, font: sans, color: INK }));
    y -= rh + 10;
  }

  // signatures (lines sit above the bottom margin of the last page)
  const sigY = Math.max(M + 50, y - 60);
  const sigLabels = doc.type === 'REC' ?
  [`Prepared by${doc.preparedBy ? `: ${doc.preparedBy}` : ''}`, 'Authorised Signature', "Customer's Signature"] :
  [`Prepared by${doc.preparedBy ? `: ${doc.preparedBy}` : ''}`, 'Authorised Signature'];
  const slot = totalW / sigLabels.length;
  sigLabels.forEach((lab, i) => {
    const x1 = M + i * slot + 6;
    const x2 = M + (i + 1) * slot - 18;
    page.drawLine({ start: { x: x1, y: sigY }, end: { x: x2, y: sigY }, thickness: 0.7, color: INK, dashArray: [1, 2] });
    const c = clean(lab);
    page.drawText(c, { x: x1 + (x2 - x1) / 2 - tw(sans, 8.5, c) / 2, y: sigY - 13, size: 8.5, font: sans, color: INK });
  });

  // footer on every page
  pages.forEach((p, i) => {
    const note = `${clean(doc.title)} ${clean(doc.refNo)}  -  generated from the ERP database`;
    p.drawText(note, { x: M, y: 24, size: 7.5, font: sans, color: GREY });
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: PAGE_W - M - tw(sans, 7.5, pg), y: 24, size: 7.5, font: sans, color: GREY });
  });

  return pdf.save();
}
