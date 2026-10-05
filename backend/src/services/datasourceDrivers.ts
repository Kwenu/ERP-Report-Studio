import net from 'net';
import { Client } from 'pg';
import sql from 'mssql';
import { buildMssqlConfig, isSqlServer } from '../db/erpConnector';

/* ------------------------------------------------------------------ *
 * Real connectivity checks for a customer's ERP database.
 *
 * "Server reachable" and, for Postgres sources, "Authentication" +
 * "Database found" are genuine network/DB calls — not simulated
 * timers. SQL Server / MySQL / Oracle need their own driver package
 * (mssql / mysql2 / oracledb) which isn't bundled by default to keep
 * install size small; the TODO below shows exactly where to plug one
 * in. Until then, those types get an honest "driver not installed"
 * result rather than a faked pass.
 * ------------------------------------------------------------------ */

export interface StepResult {
  id: 'server' | 'auth' | 'database' | 'schema';
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
}

export interface ConnectionCredentials {
  server: string;
  port: string | number;
  database: string;
  databaseType: string;
  authMethod: 'Windows Authentication' | 'Database Authentication';
  username?: string;
  password?: string;
}

/** Rejects the host/port typos that otherwise show up as a 10-30 second hang (e.g. "192.1681.215"). */
export function validateHostPort(server: string, port: number): string | null {
  const host = server.split('\\')[0].trim();
  if (!host) return 'Server / host is empty.';
  if (/\s/.test(host)) return `Server "${host}" contains spaces.`;
  if (host.includes(':') && !host.includes('[') && net.isIP(host) === 0) {
    return `Server "${host}" contains a port. Put the port in the Port field, not the server name.`;
  }
  // Looks like a dotted number (only digits and dots) -> it must be a valid IPv4 address.
  if (/^[\d.]+$/.test(host) && net.isIPv4(host) === false) {
    return `"${host}" is not a valid IPv4 address (each part must be 0-255, e.g. 192.168.1.215).`;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return `Port "${port}" is not valid (1-65535).`;
  return null;
}

/** Rejects after `ms` so one stuck network call can never freeze the whole test. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

function tcpReachable(host: string, port: number, timeoutMs = 5000): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    const socket = new net.Socket();
    // Hard timer: socket.setTimeout() does not cover a slow DNS lookup, this does.
    const hard = setTimeout(() => finish(false, `No response from ${host}:${port} within ${timeoutMs / 1000}s`), timeoutMs);
    function finish(ok: boolean, error?: string) {
      if (settled) return;
      settled = true;
      clearTimeout(hard);
      socket.destroy();
      resolve({ ok, ms: Date.now() - started, error });
    }
    socket.once('connect', () => finish(true));
    socket.once('error', (err: NodeJS.ErrnoException) => finish(false, `${err.code ?? 'ERROR'}: ${err.message}`));
    socket.connect(port, host);
  });
}

/** Turns raw driver errors into something the person at the keyboard can act on. */
export function explainSqlError(msg: string): string {
  if (/ELOGIN|Login failed/i.test(msg)) return `${msg} — wrong username/password, or SQL Server is not in "SQL Server and Windows Authentication" (mixed) mode.`;
  if (/Cannot open database/i.test(msg)) return `${msg} — the database name is wrong or this login has no access to it.`;
  if (/ETIMEOUT|timeout/i.test(msg)) return `${msg} — the port is open but SQL Server did not answer in time (VPN latency, wrong instance, or a TLS handshake problem on an old SQL Server).`;
  if (/ESOCKET|ECONNRESET|handshake|SSL|TLS|certificate/i.test(msg)) return `${msg} — usually a TLS mismatch with an older SQL Server. Set ERP_DB_LEGACY_TLS=true in backend/.env and retry.`;
  if (/ECONNREFUSED/i.test(msg)) return `${msg} — nothing is listening on that port. Check the port number and that SQL Server TCP/IP is enabled.`;
  return msg;
}

export async function testDatasourceConnection(
  creds: ConnectionCredentials
): Promise<{ success: boolean; message: string; latencyMs: number; steps: StepResult[] }> {
  const started = Date.now();
  const steps: StepResult[] = [];
  const port = Number(creds.port) || (creds.databaseType === 'PostgreSQL' ? 5432 : 1433);

  const invalid = validateHostPort(creds.server, port);
  if (invalid) {
    const step: StepResult = { id: 'server', status: 'failed', detail: invalid };
    return { success: false, message: invalid, latencyMs: Date.now() - started, steps: [step] };
  }

  // Step 1: server reachable (real TCP check, works for any database type)
  const hasInstance = creds.server.includes('\\');
  const tcp = hasInstance
    ? { ok: true, ms: 0, error: undefined }
    : await tcpReachable(creds.server, port);
  const hint = !tcp.ok
    ? ` Check: (1) the VPN is connected and routes ${creds.server}, (2) SQL Server is listening on port ${port} (default is ${creds.databaseType === 'PostgreSQL' ? 5432 : 1433}), (3) TCP/IP is enabled in SQL Server Configuration Manager, (4) no firewall blocks it.`
    : '';
  steps.push({
    id: 'server',
    status: tcp.ok ? 'passed' : 'failed',
    detail: tcp.ok ? (hasInstance ? `Named instance ${creds.server} (resolved by the SQL Server driver).` : `${creds.server}:${port} responded in ${tcp.ms}ms`) : `Could not reach ${creds.server}:${port} — ${tcp.error}.${hint}`
  });
  if (!tcp.ok) {
    return { success: false, message: steps[0].detail, latencyMs: Date.now() - started, steps };
  }

  if (creds.databaseType === 'PostgreSQL') {
    const client = new Client({
      host: creds.server,
      port,
      database: creds.database,
      user: creds.username,
      password: creds.password,
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      steps.push({ id: 'auth', status: 'passed', detail: 'Credentials accepted.' });
      const dbCheck = await client.query('SELECT current_database()');
      steps.push({ id: 'database', status: 'passed', detail: `Connected to database "${dbCheck.rows[0].current_database}".` });
      const schemaCheck = await client.query(
        `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`
      );
      steps.push({ id: 'schema', status: 'passed', detail: `${schemaCheck.rows[0].count} tables visible in schema "public".` });
      await client.end();
      return { success: true, message: 'Connection successful.', latencyMs: Date.now() - started, steps };
    } catch (err: any) {
      steps.push({ id: 'auth', status: 'failed', detail: err.message });
      await client.end().catch(() => {});
      return { success: false, message: err.message, latencyMs: Date.now() - started, steps };
    }
  }

  if (isSqlServer(creds.databaseType)) {
    let pool: sql.ConnectionPool | undefined;
    try {
      pool = new sql.ConnectionPool(buildMssqlConfig(creds));
      pool.on('error', () => undefined);
      await withTimeout(pool.connect(), 20_000, 'SQL Server login');
      steps.push({ id: 'auth', status: 'passed', detail: 'Credentials accepted.' });
      const db = await withTimeout(pool.request().query('SELECT DB_NAME() AS db'), 15_000, 'Database check');
      steps.push({ id: 'database', status: 'passed', detail: `Connected to database "${db.recordset[0].db}".` });
      const tables = await withTimeout(
        pool.request().query("SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"),
        15_000,
        'Schema check'
      );
      steps.push({ id: 'schema', status: 'passed', detail: `${tables.recordset[0].n} tables visible to this login.` });
      return { success: true, message: 'Connection successful.', latencyMs: Date.now() - started, steps };
    } catch (err: any) {
      const msg: string = explainSqlError(err.message ?? String(err));
      const dbMissing = /cannot open database/i.test(msg);
      // Steps that already passed stay passed; the failing one is the next in line.
      const failId: StepResult['id'] = steps.some((x) => x.id === 'database') ? 'schema' : steps.some((x) => x.id === 'auth') ? 'database' : dbMissing ? 'database' : 'auth';
      steps.push({ id: failId, status: 'failed', detail: msg });
      return { success: false, message: msg, latencyMs: Date.now() - started, steps };
    } finally {
      // close() can itself hang on a half-open socket, so never await it for long.
      if (pool) await withTimeout(pool.close(), 3000, 'Closing pool').catch(() => undefined);
    }
  }

  // Other database types (MySQL, Oracle, Db2) need their own driver; mirror the branches above. Being honest about this rather than faking a pass.
  steps.push({
    id: 'auth',
    status: 'skipped',
    detail: `No driver installed for "${creds.databaseType}" yet — TCP check passed, but authentication was not verified. See src/services/datasourceDrivers.ts.`
  });
  return {
    success: true,
    message: `Server is reachable. Install a driver for "${creds.databaseType}" to verify authentication and schema access.`,
    latencyMs: Date.now() - started,
    steps
  };
}
