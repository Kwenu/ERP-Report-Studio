import type { ReportColumn, ReportDefinition, Row } from '../types/erp';
import type { GroupBlock } from './reportEngine';
import { formatCell, formatDate, formatValue } from './format';

interface ExportPayload {
  definition: ReportDefinition;
  columns: ReportColumn[];
  groups: GroupBlock[] | null;
  rows: Row[];
  grandTotals: Record<string, number | null>;
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9]+/gi, '_');
}

function headerLines(definition: ReportDefinition): string[][] {
  const lines: string[][] = [['Polydime'], [definition.name]];
  if (definition.subtitle) lines.push([definition.subtitle]);
  if (definition.dateFrom && definition.dateTo)
  lines.push([`${formatDate(definition.dateFrom)} - ${formatDate(definition.dateTo)}`]);
  if (definition.basis) lines.push([`Report Basis: ${definition.basis}`]);
  definition.filters.forEach((f) =>
  lines.push([`Filter: ${f.label} ${f.operator} ${f.value}${f.value2 ? ` and ${f.value2}` : ''}`])
  );
  lines.push([]);
  return lines;
}

function bodyMatrix(payload: ExportPayload): string[][] {
  const { definition, columns, groups, rows, grandTotals } = payload;
  const matrix: string[][] = [];
  matrix.push(columns.map((c) => c.label));

  const totalRow = (
  totals: Record<string, number | null>,
  label: string)
  : string[] =>
  columns.map((c, i) =>
  i === 0 ?
  label :
  totals[c.key] === null || totals[c.key] === undefined ?
  '' :
  formatValue(totals[c.key], c.format, c.decimals)
  );

  if (groups) {
    groups.forEach((group) => {
      matrix.push([group.key]);
      group.rows.forEach((row) => matrix.push(columns.map((c) => formatCell(row, c))));
      if (definition.showSubtotals) matrix.push(totalRow(group.totals, `Total ${group.key}`));
      matrix.push([]);
    });
  } else {
    rows.forEach((row) => matrix.push(columns.map((c) => formatCell(row, c))));
  }

  if (definition.showGrandTotal) matrix.push(totalRow(grandTotals, 'TOTAL'));
  return matrix;
}

export function exportCsv(payload: ExportPayload) {
  const matrix = [...headerLines(payload.definition), ...bodyMatrix(payload)];
  const csv = matrix.
  map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).
  join('\n');
  download(`${safeName(payload.definition.name)}.csv`, 'text/csv', csv);
}

export function exportExcel(payload: ExportPayload) {
  const matrix = bodyMatrix(payload);
  const headRows = headerLines(payload.definition).
  map(
    (line) =>
    `<tr><td colspan="${payload.columns.length}" style="font-weight:bold">${line[0] ?? ''}</td></tr>`
  ).
  join('');
  const bodyRows = matrix.
  map((line, index) => {
    const isTotal = line[0]?.startsWith('Total ') || line[0] === 'TOTAL';
    const style = index === 0 || isTotal ? 'font-weight:bold;background:#eef0f3' : '';
    return `<tr>${payload.columns.
    map((c, i) => {
      const align = c.align === 'right' ? 'text-align:right' : '';
      return `<td style="${style};${align}">${line[i] ?? ''}</td>`;
    }).
    join('')}</tr>`;
  }).
  join('');
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table border="1">${headRows}${bodyRows}</table></body></html>`;
  download(`${safeName(payload.definition.name)}.xls`, 'application/vnd.ms-excel', html);
}

export function exportPdf() {
  window.print();
}