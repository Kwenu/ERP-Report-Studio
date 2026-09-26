import type {
  FilterRule,
  ReportColumn,
  ReportDefinition,
  Row,
  SortRule } from
'../types/erp';

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