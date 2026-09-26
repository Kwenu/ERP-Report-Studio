import net from 'net';
import { Client } from 'pg';

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

function tcpReachable(host: string, port: number, timeoutMs = 4000): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    const finish = (ok: boolean, error?: string) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - started, error });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, `Timed out after ${timeoutMs}ms`));
    socket.once('error', (err) => finish(false, err.message));
    socket.connect(port, host);
  });
}

export async function testDatasourceConnection(
  creds: ConnectionCredentials
): Promise<{ success: boolean; message: string; latencyMs: number; steps: StepResult[] }> {
  const started = Date.now();
  const steps: StepResult[] = [];
  const port = Number(creds.port) || (creds.databaseType === 'PostgreSQL' ? 5432 : 1433);

  // Step 1: server reachable (real TCP check, works for any database type)
  const tcp = await tcpReachable(creds.server, port);
  steps.push({
    id: 'server',
    status: tcp.ok ? 'passed' : 'failed',
    detail: tcp.ok ? `${creds.server}:${port} responded in ${tcp.ms}ms` : `Could not reach ${creds.server}:${port} — ${tcp.error}`
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

  // Other database types: TODO add a driver (mssql for SQL Server, mysql2 for MySQL, oracledb for Oracle)
  // and mirror the PostgreSQL branch above. Being honest about this rather than faking a pass.
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
