/* Applies db/schema.sql to the database pointed to by DATABASE_URL.
 * Run with: npm run db:init
 */
import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function main() {
  const sqlPath = path.resolve(__dirname, '../../db/schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Applying schema from ${sqlPath} ...`);
  await pool.query(sql);
  console.log('Schema applied successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Failed to apply schema:', err);
  process.exit(1);
});
