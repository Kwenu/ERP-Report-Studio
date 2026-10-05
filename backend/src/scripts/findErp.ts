/* Searches the ERP catalogue by keyword (table or column names). Reads no data rows.
 *   npm run erp:find -- invoice customer
 * Prints every table whose name or columns match, with row counts.
 */
import { pool } from '../db/pool';
import { findDataSource, getConnector } from '../db/erpConnector';
import { introspectSchema } from '../services/introspect';

async function main() {
  const words = process.argv.slice(2).map((w) => w.toLowerCase()).filter(Boolean);
  if (!words.length) throw new Error('Usage: npm run erp:find -- <keyword> [keyword...]   e.g. npm run erp:find -- invoice customer');
  const row = await findDataSource();
  if (!row) throw new Error('No data source registered. Run "npm run erp:connect" first.');
  const conn = getConnector(row);
  const schema = await introspectSchema(conn);

  for (const w of words) {
    console.log(`\n=== "${w}" ===`);
    const hits = schema.tables.filter(
      (t) => t.name.toLowerCase().includes(w) || t.fields.some((f) => f.name.toLowerCase().includes(w))
    );
    if (!hits.length) console.log('  (no matches)');
    for (const t of hits.slice(0, 40)) {
      const nameHit = t.name.toLowerCase().includes(w);
      const cols = t.fields.filter((f) => f.name.toLowerCase().includes(w)).map((f) => f.name);
      console.log(`  ${t.name}${nameHit ? '  <- table name' : ''}${cols.length ? `   columns: ${cols.slice(0, 8).join(', ')}` : ''}`);
    }
    if (hits.length > 40) console.log(`  ...and ${hits.length - 40} more — use a more specific keyword`);
  }
  await conn.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
