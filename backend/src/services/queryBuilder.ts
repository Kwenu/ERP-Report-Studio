import { DATASETS, DatasetId } from '../schema/metadata';

/* ------------------------------------------------------------------ *
 * Turns a structured report query into parameterized SQL.
 *
 * Security model: nothing from the request body is ever concatenated
 * into the SQL string directly.
 *   - `dataset` must be a key of DATASETS (whitelisted view name).
 *   - every column/filter/sort/groupBy `key` must exist in that
 *     dataset's `columns` map (whitelisted column names) — anything
 *     else is rejected with a 400 before a query is built.
 *   - all filter/sort VALUES are passed as query parameters ($1, $2, …),
 *     never interpolated into the SQL text.
 *   - column identifiers are double-quoted and taken only from the
 *     whitelist above, so there is no path for a caller to inject
 *     arbitrary identifiers either.
 * ------------------------------------------------------------------ */

export type FilterOperator =
  | 'is between'
  | 'equals'
  | 'not equals'
  | 'contains'
  | 'greater than'
  | 'less than'
  | 'on or after'
  | 'on or before'
  | 'is empty';

export interface FilterRuleInput {
  key: string;
  operator: FilterOperator;
  value?: string;
  value2?: string;
  connector?: 'AND' | 'OR';
}

export interface SortRuleInput {
  key: string;
  dir: 'asc' | 'desc';
}

export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface ColumnInput {
  key: string;
  aggregation?: Aggregation;
}

export interface ReportQueryInput {
  dataset: DatasetId;
  columns: ColumnInput[];
  filters?: FilterRuleInput[];
  sort?: SortRuleInput[];
  groupBy?: string | null;
  dateFrom?: string;
  dateTo?: string;
  dateKey?: string; // defaults to "date" when dateFrom/dateTo are supplied
  page?: number;
  pageSize?: number;
}

export class QueryValidationError extends Error {
  status = 400;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function assertColumn(datasetId: DatasetId, key: string): void {
  const dataset = DATASETS[datasetId];
  if (!dataset) throw new QueryValidationError(`Unknown dataset "${datasetId}".`);
  if (!Object.prototype.hasOwnProperty.call(dataset.columns, key)) {
    throw new QueryValidationError(`Column "${key}" is not reportable on dataset "${datasetId}".`);
  }
}

const AGG_SQL: Record<Exclude<Aggregation, 'none'>, string> = {
  sum: 'SUM',
  avg: 'AVG',
  count: 'COUNT',
  min: 'MIN',
  max: 'MAX'
};

export interface BuiltQuery {
  sql: string;
  countSql: string;
  params: any[];
}

export function buildReportQuery(input: ReportQueryInput): BuiltQuery {
  const dataset = DATASETS[input.dataset];
  if (!dataset) {
    throw new QueryValidationError(`Unknown dataset "${input.dataset}".`);
  }

  const columns = input.columns?.length
    ? input.columns
    : Object.keys(dataset.columns).map((key) => ({ key, aggregation: 'none' as Aggregation }));

  columns.forEach((c) => assertColumn(input.dataset, c.key));
  (input.filters ?? []).forEach((f) => assertColumn(input.dataset, f.key));
  (input.sort ?? []).forEach((s) => assertColumn(input.dataset, s.key));
  if (input.groupBy) assertColumn(input.dataset, input.groupBy);
  const dateKey = input.dateKey ?? 'date';
  if (input.dateFrom || input.dateTo) assertColumn(input.dataset, dateKey);

  const params: any[] = [];
  const push = (value: any) => {
    params.push(value);
    return `$${params.length}`;
  };

  // ---- WHERE ----
  const whereParts: string[] = [];
  if (input.dateFrom) whereParts.push(`${quoteIdent(dateKey)} >= ${push(input.dateFrom)}`);
  if (input.dateTo) whereParts.push(`${quoteIdent(dateKey)} <= ${push(input.dateTo)}`);

  const activeFilters = (input.filters ?? []).filter(
    (f) => f.operator === 'is empty' || (f.value !== undefined && f.value !== '')
  );

  let filterClause = '';
  activeFilters.forEach((f, idx) => {
    const col = quoteIdent(f.key);
    const dataType = dataset.columns[f.key].dataType;
    const isNumeric = dataType === 'currency' || dataType === 'decimal' || dataType === 'integer';
    let clause: string;

    switch (f.operator) {
      case 'is empty':
        clause = `(${col} IS NULL OR ${col}::text = '')`;
        break;
      case 'equals':
        clause = isNumeric ? `${col} = ${push(Number(f.value))}` : `LOWER(${col}::text) = LOWER(${push(f.value)})`;
        break;
      case 'not equals':
        clause = isNumeric
          ? `${col} <> ${push(Number(f.value))}`
          : `LOWER(${col}::text) <> LOWER(${push(f.value)})`;
        break;
      case 'contains':
        clause = `${col}::text ILIKE ${push(`%${f.value}%`)}`;
        break;
      case 'greater than':
        clause = isNumeric ? `${col} > ${push(Number(f.value))}` : `${col}::text > ${push(f.value)}`;
        break;
      case 'less than':
        clause = isNumeric ? `${col} < ${push(Number(f.value))}` : `${col}::text < ${push(f.value)}`;
        break;
      case 'on or after':
        clause = `${col} >= ${push(f.value)}`;
        break;
      case 'on or before':
        clause = `${col} <= ${push(f.value)}`;
        break;
      case 'is between':
        if (isNumeric) {
          clause = `${col} BETWEEN ${push(Number(f.value))} AND ${push(Number(f.value2 ?? f.value))}`;
        } else {
          clause = `${col}::text BETWEEN ${push(f.value)} AND ${push(f.value2 ?? f.value)}`;
        }
        break;
      default:
        clause = 'TRUE';
    }

    if (idx === 0) {
      filterClause = clause;
    } else {
      const connector = f.connector === 'OR' ? 'OR' : 'AND';
      filterClause = `(${filterClause} ${connector} ${clause})`;
    }
  });
  if (filterClause) whereParts.push(filterClause);

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  // ---- SELECT / GROUP BY ----
  const hasAggregation = columns.some((c) => c.aggregation && c.aggregation !== 'none');
  const groupBy = input.groupBy;

  let selectSql: string;
  let groupBySql = '';

  if (groupBy || hasAggregation) {
    const selectParts: string[] = [];
    if (groupBy) selectParts.push(`${quoteIdent(groupBy)} AS ${quoteIdent(groupBy)}`);
    columns.forEach((c) => {
      if (c.key === groupBy) return;
      if (c.aggregation && c.aggregation !== 'none') {
        const fn = AGG_SQL[c.aggregation];
        selectParts.push(`${fn}(${quoteIdent(c.key)}) AS ${quoteIdent(c.key)}`);
      } else {
        // Non-aggregated column alongside GROUP BY: use a value-agnostic aggregate
        // so the query stays valid SQL (MIN is arbitrary-but-deterministic per group).
        selectParts.push(`MIN(${quoteIdent(c.key)}::text) AS ${quoteIdent(c.key)}`);
      }
    });
    selectSql = selectParts.join(', ');
    if (groupBy) groupBySql = `GROUP BY ${quoteIdent(groupBy)}`;
  } else {
    selectSql = columns.map((c) => quoteIdent(c.key)).join(', ');
  }

  // ---- ORDER BY ----
  const sort = input.sort ?? [];
  const orderSql = sort.length
    ? `ORDER BY ${sort.map((s) => `${quoteIdent(s.key)} ${s.dir === 'desc' ? 'DESC' : 'ASC'}`).join(', ')}`
    : '';

  // ---- LIMIT / OFFSET ----
  const pageSize = Math.min(Math.max(input.pageSize ?? 5000, 1), 20000);
  const page = Math.max(input.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const limitSql = `LIMIT ${push(pageSize)} OFFSET ${push(offset)}`;

  const sql = `SELECT ${selectSql} FROM ${quoteIdent(dataset.view)} ${whereSql} ${groupBySql} ${orderSql} ${limitSql}`.replace(
    /\s+/g,
    ' '
  );

  const countParams = params.slice(0, params.length - 2); // exclude limit/offset
  const countSql = groupBy
    ? `SELECT COUNT(*) AS count FROM (SELECT ${quoteIdent(groupBy)} FROM ${quoteIdent(
        dataset.view
      )} ${whereSql} GROUP BY ${quoteIdent(groupBy)}) sub`
    : `SELECT COUNT(*) AS count FROM ${quoteIdent(dataset.view)} ${whereSql}`;

  return { sql: sql.trim(), countSql: countSql.replace(/\s+/g, ' ').trim(), params };
}

export function buildCountParams(built: BuiltQuery): any[] {
  return built.params.slice(0, built.params.length - 2);
}
