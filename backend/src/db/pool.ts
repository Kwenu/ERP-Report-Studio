import { Pool, types } from 'pg';
import { env } from '../config/env';

types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val))); // NUMERIC
types.setTypeParser(1082, (val: string) => val); // DATE -> raw "YYYY-MM-DD" text, no Date object
types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10))); // BIGINT (e.g. COUNT(*))

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

export async function query<T = any>(text: string, params: any[] = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const durationMs = Date.now() - start;
  if (env.nodeEnv !== 'production' && durationMs > 200) {
    console.warn(`[slow query] ${durationMs}ms: ${text.slice(0, 120)}`);
  }
  return result;
}