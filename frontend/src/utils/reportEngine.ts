import type {
  ColumnZone,
  FilterRule,
  ReportColumn,
  ReportDefinition,
  Row,
  SortRule } from
'../types/erp';
import { formatValue } from './format';

/* ------------------------------------------------------------------ *
 * The report engine turns a structured report definition + a dataset  *
 * into rendered rows. The UI never writes SQL — it edits the          *
 * definition, and this module resolves it.                            *
 * ------------------------------------------------------------------ */

export interface GroupBlock {
  key: string;
  rows: Row[];
  totals: Record<string, number | null>;
}

export interface ResolvedReport {
  rows: Row[];
  groups: GroupBlock[] | null;
  grandTotals: Record<string, number | null>;
  totalRecords: number;
  filteredRecords: number;
}

function numeric(value: Row[string] | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function matches(row: Row, rule: FilterRule): boolean {
  const raw = row[rule.key];
  const isNumeric =
  rule.dataType === 'currency' ||
  rule.dataType === 'decimal' ||
  rule.dataType === 'integer';

  switch (rule.operator) {
    case 'is empty':
      return raw === null || raw === undefined || raw === '';
    case 'equals':
      return String(raw ?? '').toLowerCase() === rule.value.trim().toLowerCase();
    case 'not equals':
      return String(raw ?? '').toLowerCase() !== rule.value.trim().toLowerCase();
    case 'contains':
      return String(raw ?? '').
      toLowerCase().
      includes(rule.value.trim().toLowerCase());
    case 'greater than':
      return isNumeric ?
      (numeric(raw) ?? -Infinity) > Number(rule.value || 0) :
      String(raw ?? '') > rule.value;
    case 'less than':
      return isNumeric ?
      (numeric(raw) ?? Infinity) < Number(rule.value || 0) :
      String(raw ?? '') < rule.value;
    case 'on or after':
      return String(raw ?? '') >= rule.value;
    case 'on or before':
      return String(raw ?? '') <= rule.value;
    case 'is between':{
        if (isNumeric) {
          const n = numeric(raw);
          if (n === null) return false;
          return n >= Number(rule.value || 0) && n <= Number(rule.value2 || 0);
        }
        const s = String(raw ?? '');
        return s >= rule.value && s <= (rule.value2 ?? '');
      }
    default:
      return true;
  }
}

export function applyFilters(rows: Row[], filters: FilterRule[]): Row[] {
  const active = filters.filter((f) => f.operator === 'is empty' || f.value !== '');
  if (!active.length) return rows;
  return rows.filter((row) => {
    let result = matches(row, active[0]);
    for (let i = 1; i < active.length; i += 1) {
      const rule = active[i];
      const hit = matches(row, rule);
      result = rule.connector === 'OR' ? result || hit : result && hit;
    }
    return result;
  });
}

export function applySort(rows: Row[], sort: SortRule[]): Row[] {
  if (!sort.length) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const rule of sort) {
      const av = a[rule.key];
      const bv = b[rule.key];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;else
      cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  return copy;
}

export function aggregate(
rows: Row[],
columns: ReportColumn[],
options: {weighted?: boolean;weightKey?: string;} = {})
: Record<string, number | null> {
  const totals: Record<string, number | null> = {};
  for (const col of columns) {
    if (col.aggregation === 'none') {
      totals[col.key] = null;
      continue;
    }
    const values = rows.
    map((r) => numeric(r[col.key])).
    filter((v): v is number => v !== null);
    if (col.aggregation === 'count') {
      totals[col.key] = rows.length;
      continue;
    }
    if (!values.length) {
      totals[col.key] = null;
      continue;
    }
    switch (col.aggregation) {
      case 'sum':
        totals[col.key] = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':{
          if (options.weighted && options.weightKey) {
            let weight = 0;
            let acc = 0;
            rows.forEach((r) => {
              const v = numeric(r[col.key]);
              const w = Math.abs(numeric(r[options.weightKey as string]) ?? 0);
              if (v !== null && w > 0) {
                acc += v * w;
                weight += w;
              }
            });
            totals[col.key] =
            weight > 0 ? acc / weight : values.reduce((a, b) => a + b, 0) / values.length;
          } else {
            totals[col.key] = values.reduce((a, b) => a + b, 0) / values.length;
          }
          break;
        }
      case 'min':
        totals[col.key] = Math.min(...values);
        break;
      case 'max':
        totals[col.key] = Math.max(...values);
        break;
      default:
        totals[col.key] = null;
    }
  }
  return totals;
}

export function groupRows(rows: Row[], groupKey: string): GroupBlock[] {
  const map = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = String(row[groupKey] ?? '(none)');
    const bucket = map.get(key);
    if (bucket) bucket.push(row);else
    map.set(key, [row]);
  });
  return Array.from(map.entries()).
  sort((a, b) => a[0].localeCompare(b[0])).
  map(([key, groupedRows]) => ({ key, rows: groupedRows, totals: {} }));
}

export function resolveReport(
definition: ReportDefinition,
dataset: Row[],
search = '')
: ResolvedReport {
  let rows = dataset;

  if (definition.dateFrom && definition.dateTo) {
    rows = rows.filter((r) => {
      const d = String(r.date ?? '');
      return !d || d >= definition.dateFrom! && d <= definition.dateTo!;
    });
  }

  rows = applyFilters(rows, definition.filters);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((row) =>
    definition.columns.some((c) =>
    String(row[c.key] ?? '').
    toLowerCase().
    includes(q)
    )
    );
  }

  rows = applySort(rows, definition.sort);

  const visible = definition.columns.filter((c) => c.visible);
  const aggOptions = {
    weighted: definition.weightedAverage,
    weightKey: 'amount'
  };

  const groups = definition.groupBy ?
  groupRows(rows, definition.groupBy).map((g) => ({
    ...g,
    totals: aggregate(g.rows, visible, aggOptions)
  })) :
  null;

  return {
    rows,
    groups,
    grandTotals: aggregate(rows, visible, aggOptions),
    totalRecords: dataset.length,
    filteredRecords: rows.length
  };
}

/** The structured query definition the backend would receive. */
export function toQueryDefinition(definition: ReportDefinition) {
  return {
    source: definition.dataset,
    columns: definition.columns.filter((c) => c.visible).map((c) => c.id),
    groupBy: definition.groupBy ? [definition.groupBy] : [],
    filters: definition.filters.map((f) => ({
      field: f.key,
      operator: f.operator,
      value: f.value2 ? [f.value, f.value2] : f.value,
      connector: f.connector
    })),
    sort: definition.sort.map((s) => ({ field: s.key, direction: s.dir })),
    totals: definition.columns.
    filter((c) => c.visible && c.aggregation !== 'none').
    map((c) => ({ field: c.key, aggregation: c.aggregation }))
  };
}

/* ------------------------------------------------------------------ *
 * Pivot / summary view for Report Builder reports.                    *
 *   Rows    -> the row labels (one output row per distinct combination)*
 *   Columns -> spread across the top (one output column per distinct   *
 *              value), each cell aggregating the Values fields         *
 *   Values  -> the measures (sum / count / avg ...)                    *
 * Fixed templates carry no zones, so they stay plain detail listings.  *
 * ------------------------------------------------------------------ */

export const MAX_PIVOT_COLUMNS = 100;

export function zoneOfColumn(col: ReportColumn): ColumnZone {
  return col.zone ?? (col.aggregation !== 'none' ? 'values' : 'rows');
}

/** True when the Builder has Columns fields (cross-tab) or Rows + Values (summary). */
export function isPivotActive(columns: ReportColumn[]): boolean {
  const visible = columns.filter((c) => c.visible);
  if (!visible.some((c) => c.zone)) return false;
  const zones = visible.map(zoneOfColumn);
  return zones.includes('columns') || zones.includes('values') && zones.includes('rows');
}

export interface PivotResult {
  /** Flat columns to render / export: the row-label columns, then one per pivoted value, then totals. */
  columns: ReportColumn[];
  rows: Row[];
  grandTotals: Record<string, number | null>;
  mode: 'crosstab' | 'summary';
  /** Distinct values of the Columns fields in the data, and how many of them are shown. */
  pivotColumnCount: number;
  pivotColumnsShown: number;
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const COUNT_VALUE: ReportColumn = {
  id: '__count',
  key: '__count',
  label: 'Records',
  dataType: 'integer',
  format: 'number',
  decimals: 0,
  align: 'right',
  width: 110,
  aggregation: 'count',
  visible: true,
  pinned: false
};

function leafColumn(id: string, label: string, value: ReportColumn): ReportColumn {
  const counting = value.aggregation === 'count';
  return {
    id,
    key: id,
    label,
    dataType: counting ? 'integer' : value.dataType,
    format: counting ? 'number' : value.format,
    decimals: counting ? 0 : value.decimals,
    align: 'right',
    width: 120,
    // Grand-total row: the cell value is already an aggregate, so the totals line is computed separately.
    aggregation: 'sum',
    visible: true,
    pinned: false
  };
}

export function buildPivot(
rows: Row[],
definition: ReportDefinition)
: PivotResult {
  const visible = definition.columns.filter((c) => c.visible);
  const rowFields = visible.filter((c) => zoneOfColumn(c) === 'rows');
  const colFields = visible.filter((c) => zoneOfColumn(c) === 'columns');
  let valueFields = visible.filter((c) => zoneOfColumn(c) === 'values').map((c) => c.aggregation === 'none' ? { ...c, aggregation: 'sum' as const } : c);
  if (!valueFields.length) valueFields = [COUNT_VALUE];
  const crosstab = colFields.length > 0;

  // 1. bucket the source rows by row-label combination and by pivot-column combination
  const rowKeyOf = (r: Row) => rowFields.map((f) => String(r[f.key] ?? '')).join('\u0001');
  const colKeyOf = (r: Row) => colFields.map((f) => String(r[f.key] ?? '')).join('\u0001');
  const colLabelOf = (r: Row) =>
  colFields.map((f) => formatValue(r[f.key], f.format, f.decimals) || '(blank)').join(' / ');

  interface RowBucket {labels: Row;all: Row[];byCol: Map<string, Row[]>;}
  const buckets = new Map<string, RowBucket>();
  const colLabels = new Map<string, string>();
  const colRows = new Map<string, Row[]>();

  for (const r of rows) {
    const rk = rowKeyOf(r);
    let b = buckets.get(rk);
    if (!b) {
      const labels: Row = {};
      rowFields.forEach((f) => {
        labels[f.key] = r[f.key] ?? null;
      });
      b = { labels, all: [], byCol: new Map() };
      buckets.set(rk, b);
    }
    b.all.push(r);
    if (crosstab) {
      const ck = colKeyOf(r);
      if (!colLabels.has(ck)) colLabels.set(ck, colLabelOf(r));
      const list = b.byCol.get(ck);
      if (list) list.push(r);else b.byCol.set(ck, [r]);
      const all = colRows.get(ck);
      if (all) all.push(r);else colRows.set(ck, [r]);
    }
  }

  // 2. decide the output columns
  const allColKeys = [...colLabels.keys()].sort((a, b) => natural(a, b));
  const shownColKeys = allColKeys.slice(0, MAX_PIVOT_COLUMNS);
  const multiValue = valueFields.length > 1;

  const labelColumns: ReportColumn[] = rowFields.length ?
  rowFields.map((f) => ({ ...f, aggregation: 'none' as const, pinned: false })) :
  [{ ...COUNT_VALUE, id: '__all', key: '__all', label: 'All records', dataType: 'text' as const, format: 'text' as const, align: 'left' as const, aggregation: 'none' as const }];

  const leaves: {col: ReportColumn;colKey: string | null;value: ReportColumn;}[] = [];
  if (crosstab) {
    shownColKeys.forEach((ck, i) => {
      valueFields.forEach((v) => {
        const label = multiValue ? `${colLabels.get(ck)} · ${v.label}` : colLabels.get(ck) ?? '';
        leaves.push({ col: leafColumn(`c${i}__${v.key}`, label, v), colKey: ck, value: v });
      });
    });
    valueFields.forEach((v) => {
      leaves.push({ col: leafColumn(`total__${v.key}`, multiValue ? `Total · ${v.label}` : 'Total', v), colKey: null, value: v });
    });
  } else {
    valueFields.forEach((v) => {
      leaves.push({ col: leafColumn(`v__${v.key}`, v.label, v), colKey: null, value: v });
    });
  }

  // 3. fill the cells
  const cell = (list: Row[] | undefined, v: ReportColumn): number | null => {
    if (!list || !list.length) return null;
    return aggregate(list, [v])[v.key] ?? null;
  };

  let bucketList = [...buckets.values()];
  if (!definition.sort.length) {
    bucketList = bucketList.sort((a, b) => {
      for (const f of rowFields) {
        const av = a.labels[f.key];
        const bv = b.labels[f.key];
        if (av === bv) continue;
        if (av === null || av === '') return 1;
        if (bv === null || bv === '') return -1;
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        const c = natural(String(av), String(bv));
        if (c !== 0) return c;
      }
      return 0;
    });
  }

  const outRows: Row[] = bucketList.map((b) => {
    const out: Row = rowFields.length ? { ...b.labels } : { __all: 'All records' };
    for (const leaf of leaves) {
      const source = leaf.colKey === null ? b.all : b.byCol.get(leaf.colKey);
      out[leaf.col.key] = cell(source, leaf.value);
    }
    return out;
  });

  const grandTotals: Record<string, number | null> = {};
  for (const leaf of leaves) {
    const source = leaf.colKey === null ? rows : colRows.get(leaf.colKey);
    grandTotals[leaf.col.key] = cell(source, leaf.value);
  }

  return {
    columns: [...labelColumns, ...leaves.map((l) => l.col)],
    rows: outRows,
    grandTotals,
    mode: crosstab ? 'crosstab' : 'summary',
    pivotColumnCount: allColKeys.length,
    pivotColumnsShown: shownColKeys.length
  };
}
