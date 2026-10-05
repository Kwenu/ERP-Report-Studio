/* Reads the REAL schema (tables, columns, keys, foreign keys) from the ERP database. */
import type { ErpConnector } from '../db/erpConnector';
import type { DataType, ErpTable, ErpField, Relationship } from '../schema/metadata';

export interface IntrospectedSchema {
  tables: ErpTable[];
  relationships: Relationship[];
  primaryKeys: number;
  foreignKeys: number;
  fieldCount: number;
}

function mapType(raw: string): DataType {
  const t = raw.toLowerCase();
  if (/^(money|smallmoney)$/.test(t)) return 'currency';
  if (/^(bigint|int|integer|smallint|tinyint|serial|bigserial)$/.test(t)) return 'integer';
  if (/^(decimal|numeric|float|real|double precision)$/.test(t)) return 'decimal';
  if (/^(datetime|datetime2|smalldatetime|datetimeoffset|timestamp|timestamp without time zone|timestamp with time zone)$/.test(t)) return 'datetime';
  if (/^date$/.test(t)) return 'date';
  if (/^(bit|boolean)$/.test(t)) return 'boolean';
  return 'text';
}

const MSSQL = {
  columns: `
    SELECT c.TABLE_SCHEMA AS table_schema, c.TABLE_NAME AS table_name, c.COLUMN_NAME AS column_name,
           c.DATA_TYPE AS data_type, c.IS_NULLABLE AS is_nullable
    FROM INFORMATION_SCHEMA.COLUMNS c
    JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`,
  pks: `
    SELECT kcu.TABLE_SCHEMA AS table_schema, kcu.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`,
  fks: `
    SELECT OBJECT_SCHEMA_NAME(fkc.parent_object_id) AS from_schema, OBJECT_NAME(fkc.parent_object_id) AS from_table,
           pc.name AS from_column, OBJECT_SCHEMA_NAME(fkc.referenced_object_id) AS to_schema,
           OBJECT_NAME(fkc.referenced_object_id) AS to_table, rc.name AS to_column
    FROM sys.foreign_key_columns fkc
    JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
    JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id`
};

const POSTGRES = {
  columns: `
    SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE t.table_type = 'BASE TABLE' AND c.table_schema = 'public'
    ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
  pks: `
    SELECT kcu.table_schema, kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'`,
  fks: `
    SELECT kcu.table_schema AS from_schema, kcu.table_name AS from_table, kcu.column_name AS from_column,
           ccu.table_schema AS to_schema, ccu.table_name AS to_table, ccu.column_name AS to_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
};

const fullName = (schema: string, table: string) => (schema === 'dbo' || schema === 'public' ? table : `${schema}.${table}`);

export async function introspectSchema(conn: ErpConnector): Promise<IntrospectedSchema> {
  const q = conn.dialect === 'mssql' ? MSSQL : POSTGRES;
  const [cols, pks, fks] = await Promise.all([conn.query(q.columns), conn.query(q.pks), conn.query(q.fks)]);

  const pkSet = new Set(pks.rows.map((r) => `${fullName(r.table_schema, r.table_name)}.${r.column_name}`));
  const fkMap = new Map<string, string>();
  fks.rows.forEach((r) =>
    fkMap.set(
      `${fullName(r.from_schema, r.from_table)}.${r.from_column}`,
      `${fullName(r.to_schema, r.to_table)}.${r.to_column}`
    )
  );

  const tables = new Map<string, ErpTable>();
  for (const r of cols.rows) {
    const tName = fullName(r.table_schema, r.table_name);
    if (!tables.has(tName)) tables.set(tName, { name: tName, description: '', fields: [] });
    const id = `${tName}.${r.column_name}`;
    const field: ErpField = {
      id,
      table: tName,
      name: r.column_name,
      displayName: r.column_name,
      dataType: mapType(r.data_type),
      description: '',
      nullable: String(r.is_nullable).toUpperCase() === 'YES',
      reportable: true,
      isKey: pkSet.has(id),
      references: fkMap.get(id)
    };
    tables.get(tName)!.fields.push(field);
  }

  const relationships: Relationship[] = fks.rows.map((r) => ({
    // parent (referenced) -> child (referencing), matching the UI's "PK -> FK" convention
    fromTable: fullName(r.to_schema, r.to_table),
    fromField: r.to_column,
    toTable: fullName(r.from_schema, r.from_table),
    toField: r.from_column
  }));

  const list = [...tables.values()];
  return {
    tables: list,
    relationships,
    primaryKeys: list.filter((t) => t.fields.some((f) => f.isKey)).length,
    foreignKeys: fks.rows.length,
    fieldCount: list.reduce((s, t) => s + t.fields.length, 0)
  };
}

/** Row counts for the given (already validated) table names. */
export async function countRows(conn: ErpConnector, tableNames: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const quote = (n: string) =>
    n
      .split('.')
      .map((p) => (conn.dialect === 'mssql' ? `[${p.replace(/]/g, ']]')}]` : `"${p.replace(/"/g, '""')}"`))
      .join('.');
  for (const t of tableNames) {
    const r = await conn.query(`SELECT COUNT(*) AS total FROM ${quote(t)}`);
    out[t] = Number(r.rows[0]?.total ?? 0);
  }
  return out;
}


/**
 * Row counts for EVERY table in one fast catalogue query (no table is scanned).
 * SQL Server: sys.partitions · PostgreSQL: pg_stat_user_tables (estimate, refreshed by autovacuum).
 */
export async function tableRowCounts(conn: ErpConnector): Promise<Record<string, number>> {
  const sql =
    conn.dialect === 'mssql'
      ? `SELECT s.name AS table_schema, t.name AS table_name, SUM(p.rows) AS row_count
         FROM sys.tables t
         JOIN sys.schemas s ON s.schema_id = t.schema_id
         JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
         GROUP BY s.name, t.name`
      : `SELECT schemaname AS table_schema, relname AS table_name, n_live_tup AS row_count
         FROM pg_stat_user_tables WHERE schemaname = 'public'`;
  const r = await conn.query(sql);
  const out: Record<string, number> = {};
  for (const row of r.rows) out[fullName(row.table_schema, row.table_name)] = Number(row.row_count ?? 0);
  return out;
}
