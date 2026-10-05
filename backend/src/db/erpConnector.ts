/* ------------------------------------------------------------------ *
 * ERP connector — the ONLY place the backend opens connections to the
 * company's ERP database (SQL Server or PostgreSQL).
 *
 *   getConnector(row)      pooled connector for one data_sources row
 *   getReportConnector()   connector for the PRIMARY data source; falls
 *                          back to the app's own Postgres (bundled demo
 *                          data) only when no data source exists yet
 *
 * Credentials are decrypted here, in memory, and never leave the server.
 * ------------------------------------------------------------------ */
import sql from 'mssql';
import { Pool } from 'pg';
import { query as appQuery } from './pool';
import { env } from '../config/env';
import { decryptSecret } from '../utils/crypto';
import type { Dialect } from '../services/queryBuilder';

export interface ErpConnector {
  dialect: Dialect;
  label: string;
  query(text: string, params?: any[]): Promise<{ rows: any[] }>;
  close(): Promise<void>;
}

export interface DataSourceRow {
  id: string;
  name: string;
  database_type: string;
  server: string;
  port: string;
  database_name: string;
  auth_method: string;
  username: string | null;
  encrypted_credentials: string | null;
}

/** SQL Server returns JS Date objects; the UI expects plain "YYYY-MM-DD" for date-only values. */
function normalizeValue(v: any): any {
  if (v instanceof Date) {
    const iso = v.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  if (typeof v === 'bigint') return Number(v);
  return v;
}

export function isSqlServer(type: string) {
  return /sql\s*server|mssql/i.test(type);
}

export interface PlainCredentials {
  server: string;
  port: string | number;
  database: string;
  authMethod: string;
  username?: string | null;
  password?: string | null;
}

export function buildMssqlConfig(c: PlainCredentials): sql.config {
  if (c.authMethod === 'Windows Authentication') {
    throw new Error(
      'Windows Authentication is not supported by the Node SQL Server driver. ' +
        'Create a SQL login (e.g. "svc_reporting") with read-only access and use "Database Authentication".'
    );
  }
  // "HOST\INSTANCE" style server names -> host + instanceName (no port)
  const [host, instance] = c.server.split('\\');
  return {
    server: host,
    ...(instance ? {} : { port: Number(c.port) || 1433 }),
    database: c.database,
    user: c.username ?? undefined,
    password: c.password ?? undefined,
    connectionTimeout: 15_000,
    requestTimeout: 60_000,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    options: {
      encrypt: env.erp.encrypt,
      trustServerCertificate: env.erp.trustServerCertificate,
      ...(instance ? { instanceName: instance } : {}),
      readOnlyIntent: true,
      ...(env.erp.legacyTls
        ? { cryptoCredentialsDetails: { minVersion: 'TLSv1' as const, ciphers: 'DEFAULT@SECLEVEL=0' } }
        : {})
    }
  };
}

export function mssqlConfig(row: DataSourceRow): sql.config {
  const secret = decryptSecret(row.encrypted_credentials);
  return buildMssqlConfig({
    server: row.server,
    port: row.port,
    database: row.database_name,
    authMethod: row.auth_method,
    username: row.username,
    password: (secret?.password as string) ?? undefined
  });
}

function wrapMssql(row: DataSourceRow): ErpConnector {
  const pool = new sql.ConnectionPool(mssqlConfig(row));
  // Without a listener, a dropped VPN / reset socket emits an unhandled 'error' and can crash the process.
  pool.on('error', (err) => {
    console.error(`ERP SQL Server pool error (${row.name}):`, err.message);
    void invalidateConnector(row.id);
  });
  const poolPromise = pool.connect();
  // If the first connect fails, forget this connector so the NEXT request retries with a fresh pool
  // (before: the rejected promise stayed cached and every report failed until the server restarted).
  poolPromise.catch(() => void invalidateConnector(row.id));
  return {
    dialect: 'mssql',
    label: `${row.name} (SQL Server ${row.server}/${row.database_name})`,
    async query(text, params = []) {
      const p = await poolPromise;
      const request = p.request();
      params.forEach((value, i) => request.input(`p${i + 1}`, value));
      const result = await request.query(text);
      const rows = (result.recordset ?? []).map((r: any) => {
        const out: any = {};
        for (const k of Object.keys(r)) out[k] = normalizeValue(r[k]);
        return out;
      });
      return { rows };
    },
    async close() {
      try {
        await (await poolPromise).close();
      } catch {
        /* ignore */
      }
    }
  };
}

function wrapPostgres(row: DataSourceRow): ErpConnector {
  const secret = decryptSecret(row.encrypted_credentials);
  const pg = new Pool({
    host: row.server,
    port: Number(row.port) || 5432,
    database: row.database_name,
    user: row.username ?? undefined,
    password: (secret?.password as string) ?? undefined,
    max: 10,
    idleTimeoutMillis: 30_000
  });
  pg.on('error', (err) => console.error('ERP Postgres pool error', err));
  return {
    dialect: 'postgres',
    label: `${row.name} (PostgreSQL ${row.server}/${row.database_name})`,
    query: (text, params = []) => pg.query(text, params),
    close: () => pg.end()
  };
}

const cache = new Map<string, ErpConnector>();

/** Drop (and close) the cached pool for a data source — call after it is edited, deleted or re-tested. */
export async function invalidateConnector(id: string) {
  const existing = cache.get(id);
  cache.delete(id);
  if (existing) await existing.close().catch(() => undefined);
}

export function getConnector(row: DataSourceRow): ErpConnector {
  let c = cache.get(row.id);
  if (!c) {
    if (isSqlServer(row.database_type)) c = wrapMssql(row);
    else if (/postgres/i.test(row.database_type)) c = wrapPostgres(row);
    else throw new Error(`Database type "${row.database_type}" is not supported yet. Supported: SQL Server, PostgreSQL.`);
    cache.set(row.id, c);
  }
  return c;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds a data source by id. Only a missing id or the legacy placeholder "ds-erp-prod" resolves to the
 * primary data source. Any other non-UUID id is "not found" (before, it silently tested the PRIMARY
 * database while the screen claimed to test the one you had just typed in).
 */
export async function findDataSource(id?: string): Promise<DataSourceRow | undefined> {
  if (id && UUID_RE.test(id)) {
    return (await appQuery('SELECT * FROM data_sources WHERE id = $1', [id])).rows[0];
  }
  if (id && id !== 'ds-erp-prod') return undefined;
  return (await appQuery('SELECT * FROM data_sources ORDER BY is_primary DESC, created_at ASC LIMIT 1')).rows[0];
}

export class NoDataSourceError extends Error {
  constructor() {
    super('No primary data source is configured. Open Data Sources and add (or make primary) your ERP database.');
    this.name = 'NoDataSourceError';
  }
}

/**
 * Connector used by the report query engine: always the PRIMARY data source.
 * Reports never silently fall back to sample data — with no data source they fail with a clear message.
 */
export async function getReportConnector(): Promise<ErpConnector> {
  const primary = (await appQuery('SELECT * FROM data_sources WHERE is_primary = true LIMIT 1')).rows[0];
  if (!primary) throw new NoDataSourceError();
  return getConnector(primary);
}
