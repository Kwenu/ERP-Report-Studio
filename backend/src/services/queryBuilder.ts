import { DATASETS, DatasetId } from '../schema/metadata';

/** SQL flavour the query is generated for. Postgres = the bundled demo DB; mssql = SQL Server ERP. */
export type Dialect = 'postgres' | 'mssql';

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
  | 'is empty'
  | 'is one of';

/** Separator of the values of an "is one of" filter (kept inside the single `value` string). */
export const IN_SEPARATOR = '\u0001';
/** SQL Server allows 2100 parameters per query; leave room for the date, paging and search parameters. */
const MAX_IN_VALUES = 1000;
const MAX_SEARCH_TERMS = 8;

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
  /**
   * "Search within report": free text matched against EVERY column of the dataset (not only the columns shown),
   * over the whole period. Several words must all be found (each in any column).
   */
  search?: string;
  /** Columns the search looks in (defaults to every column of the dataset). Lets the caller skip columns the view lacks. */
  searchColumns?: string[];
  page?: number;
  pageSize?: number;
  dialect?: Dialect; // defaults to 'postgres'
}

export class QueryValidationError extends Error {
  status = 400;
}

function quoteIdent(name: string, dialect: Dialect = 'postgres'): string {
  return dialect === 'mssql' ? `[${name.replace(/]/g, ']]')}]` : `"${name.replace(/"/g, '""')}"`;
}

/** Quotes a (possibly schema-qualified, e.g. "dbo.v_sales_lines") view name part by part. */
function quoteObjectName(name: string, dialect: Dialect): string {
  return name
    .split('.')
    .map((part) => quoteIdent(part, dialect))
    .join('.');
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
  dialect: Dialect;
}

export function buildReportQuery(input: ReportQueryInput): BuiltQuery {
  const dialect: Dialect = input.dialect ?? 'postgres';
  const mssql = dialect === 'mssql';
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

  const q = (name: string) => quoteIdent(name, dialect);
  // On SQL Server always use an explicit schema, so the view is found no matter which default schema the login has.
  const viewSql = quoteObjectName(mssql && !dataset.view.includes('.') ? `dbo.${dataset.view}` : dataset.view, dialect);
  const asText = (col: string) => (mssql ? `CAST(${col} AS NVARCHAR(4000))` : `${col}::text`);

  const params: any[] = [];
  const push = (value: any) => {
    params.push(value);
    return mssql ? `@p${params.length}` : `$${params.length}`;
  };
  // Dates are sent as ISO strings; on SQL Server convert explicitly (style 23 = yyyy-mm-dd)
  // so the result never depends on the server's language / DATEFORMAT setting.
  const pushDate = (value: any) => {
    const ph = push(value);
    return mssql ? `CONVERT(date, ${ph}, 23)` : ph;
  };
  const dateCol = (col: string, dataType: string) => (mssql && dataType === 'datetime' ? `CAST(${col} AS date)` : col);

  // ---- WHERE ----
  const whereParts: string[] = [];
  if (input.dateFrom) whereParts.push(`${dateCol(q(dateKey), dataset.columns[dateKey].dataType)} >= ${pushDate(input.dateFrom)}`);
  if (input.dateTo) whereParts.push(`${dateCol(q(dateKey), dataset.columns[dateKey].dataType)} <= ${pushDate(input.dateTo)}`);

  const activeFilters = (input.filters ?? []).filter(
    (f) => f.operator === 'is empty' || (f.value !== undefined && f.value !== '')
  );

  let filterClause = '';
  activeFilters.forEach((f, idx) => {
    const col = q(f.key);
    const dataType = dataset.columns[f.key].dataType;
    const isNumeric = dataType === 'currency' || dataType === 'decimal' || dataType === 'integer';
    const isDate = dataType === 'date' || dataType === 'datetime';
    const num = (v: string | undefined) => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new QueryValidationError(`"${v}" is not a valid number for "${f.key}".`);
      return n;
    };
    let clause: string;

    switch (f.operator) {
      case 'is empty':
        clause = `(${col} IS NULL OR ${asText(col)} = '')`;
        break;
      case 'equals':
        clause = isNumeric
          ? `${col} = ${push(num(f.value))}`
          : isDate
          ? `${dateCol(col, dataType)} = ${pushDate(f.value)}`
          : `LOWER(${asText(col)}) = LOWER(${push(f.value)})`;
        break;
      case 'not equals':
        clause = isNumeric
          ? `${col} <> ${push(num(f.value))}`
          : isDate
          ? `${dateCol(col, dataType)} <> ${pushDate(f.value)}`
          : `LOWER(${asText(col)}) <> LOWER(${push(f.value)})`;
        break;
      case 'is one of': {
        const values = String(f.value ?? '')
          .split(IN_SEPARATOR)
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length > MAX_IN_VALUES) {
          throw new QueryValidationError(`Too many values selected for "${f.key}" (maximum ${MAX_IN_VALUES}).`);
        }
        clause = values.length
          ? `LOWER(${asText(col)}) IN (${values.map((v) => `LOWER(${push(v)})`).join(', ')})`
          : '1=0';
        break;
      }
      case 'contains':
        clause = mssql
          ? `LOWER(${asText(col)}) LIKE LOWER(${push(`%${f.value}%`)})`
          : `${asText(col)} ILIKE ${push(`%${f.value}%`)}`;
        break;
      case 'greater than':
        clause = isNumeric
          ? `${col} > ${push(num(f.value))}`
          : isDate
          ? `${dateCol(col, dataType)} > ${pushDate(f.value)}`
          : `${asText(col)} > ${push(f.value)}`;
        break;
      case 'less than':
        clause = isNumeric
          ? `${col} < ${push(num(f.value))}`
          : isDate
          ? `${dateCol(col, dataType)} < ${pushDate(f.value)}`
          : `${asText(col)} < ${push(f.value)}`;
        break;
      case 'on or after':
        clause = isDate ? `${dateCol(col, dataType)} >= ${pushDate(f.value)}` : `${col} >= ${push(f.value)}`;
        break;
      case 'on or before':
        clause = isDate ? `${dateCol(col, dataType)} <= ${pushDate(f.value)}` : `${col} <= ${push(f.value)}`;
        break;
      case 'is between':
        if (isNumeric) {
          clause = `${col} BETWEEN ${push(num(f.value))} AND ${push(num(f.value2 ?? f.value))}`;
        } else if (isDate) {
          clause = `${dateCol(col, dataType)} BETWEEN ${pushDate(f.value)} AND ${pushDate(f.value2 ?? f.value)}`;
        } else {
          clause = `${asText(col)} BETWEEN ${push(f.value)} AND ${push(f.value2 ?? f.value)}`;
        }
        break;
      default:
        clause = '1=1';
    }

    if (idx === 0) {
      filterClause = clause;
    } else {
      const connector = f.connector === 'OR' ? 'OR' : 'AND';
      filterClause = `(${filterClause} ${connector} ${clause})`;
    }
  });
  if (filterClause) whereParts.push(filterClause);

  // ---- Search within report: every word must appear in at least one column of the row ----
  const searchTerms = (input.search ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS);
  if (searchTerms.length) {
    const searchKeys = (input.searchColumns?.length ? input.searchColumns : Object.keys(dataset.columns)).filter((key) =>
      Object.prototype.hasOwnProperty.call(dataset.columns, key)
    );
    // What a column looks like to the search. Dates are searchable the way they are written on screen (dd/mm/yyyy) and as yyyy-mm-dd.
    const searchable = (key: string): string[] => {
      const col = q(key);
      const type = dataset.columns[key].dataType;
      if (type === 'date' || type === 'datetime') {
        return mssql
          ? [`CONVERT(NVARCHAR(10), ${col}, 23)`, `CONVERT(NVARCHAR(10), ${col}, 103)`]
          : [`to_char(${col}, 'YYYY-MM-DD')`, `to_char(${col}, 'DD/MM/YYYY')`];
      }
      return [asText(col)];
    };
    const expressions = searchKeys.flatMap(searchable);
    if (expressions.length) {
      searchTerms.forEach((term) => {
        // % _ [ and \ are literal characters when typed into the search box
        const pattern = `%${term.toLowerCase().replace(/[\\%_[]/g, (ch) => `\\${ch}`)}%`;
        const ph = push(pattern);
        whereParts.push(`(${expressions.map((expr) => `LOWER(${expr}) LIKE ${ph} ESCAPE '\\'`).join(' OR ')})`);
      });
    }
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  // ---- SELECT / GROUP BY ----
  const hasAggregation = columns.some((c) => c.aggregation && c.aggregation !== 'none');
  const groupBy = input.groupBy;

  let selectSql: string;
  let groupBySql = '';

  if (groupBy || hasAggregation) {
    const selectParts: string[] = [];
    if (groupBy) selectParts.push(`${q(groupBy)} AS ${q(groupBy)}`);
    columns.forEach((c) => {
      if (c.key === groupBy) return;
      if (c.aggregation && c.aggregation !== 'none') {
        const fn = AGG_SQL[c.aggregation];
        const colType = dataset.columns[c.key].dataType;
        const numericCol = colType === 'currency' || colType === 'decimal' || colType === 'integer';
        if ((c.aggregation === 'sum' || c.aggregation === 'avg') && !numericCol) {
          throw new QueryValidationError(`Cannot ${c.aggregation} the non-numeric column "${c.key}".`);
        }
        selectParts.push(`${fn}(${q(c.key)}) AS ${q(c.key)}`);
      } else {
        // Non-aggregated column alongside GROUP BY: use a value-agnostic aggregate
        // so the query stays valid SQL (MIN is arbitrary-but-deterministic per group).
        selectParts.push(`MIN(${asText(q(c.key))}) AS ${q(c.key)}`);
      }
    });
    selectSql = selectParts.join(', ');
    if (groupBy) groupBySql = `GROUP BY ${q(groupBy)}`;
  } else {
    selectSql = columns.map((c) => q(c.key)).join(', ');
  }

  // ---- ORDER BY ----
  const sort = input.sort ?? [];
  let orderSql = sort.length
    ? `ORDER BY ${sort.map((s) => `${q(s.key)} ${s.dir === 'desc' ? 'DESC' : 'ASC'}`).join(', ')}`
    : '';

  // ---- paging ----
  const pageSize = Math.min(Math.max(Math.floor(input.pageSize ?? 5000), 1), 20000);
  const page = Math.max(Math.floor(input.page ?? 1), 1);
  const offset = (page - 1) * pageSize;

  let limitSql: string;
  if (mssql) {
    // SQL Server's OFFSET/FETCH is only legal after an ORDER BY.
    if (!orderSql) orderSql = 'ORDER BY (SELECT NULL)';
    limitSql = `OFFSET ${push(offset)} ROWS FETCH NEXT ${push(pageSize)} ROWS ONLY`;
  } else {
    limitSql = `LIMIT ${push(pageSize)} OFFSET ${push(offset)}`;
  }

  const sql = `SELECT ${selectSql} FROM ${viewSql} ${whereSql} ${groupBySql} ${orderSql} ${limitSql}`
    .replace(/\s+/g, ' ')
    .trim();

  const countSql = groupBy
    ? `SELECT COUNT(*) AS total FROM (SELECT ${q(groupBy)} AS g FROM ${viewSql} ${whereSql} GROUP BY ${q(groupBy)}) sub`
    : `SELECT COUNT(*) AS total FROM ${viewSql} ${whereSql}`;

  return {
    sql,
    countSql: countSql.replace(/\s+/g, ' ').trim(),
    params,
    dialect
  };
}

export function buildCountParams(built: BuiltQuery): any[] {
  // The last two params are always the paging values (offset/limit).
  return built.params.slice(0, built.params.length - 2);
}
