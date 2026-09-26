import { query } from '../db/pool';

export async function logAudit(userName: string, action: string, report?: string, dataSource?: string) {
  await query(
    `INSERT INTO audit_log (user_name, action, report, data_source) VALUES ($1, $2, $3, $4)`,
    [userName, action, report ?? null, dataSource ?? null]
  );
}
