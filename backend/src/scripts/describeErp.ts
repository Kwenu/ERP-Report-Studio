/* Prints every column (name, type, keys) of the tables you name.
 *   npm run erp:describe -- fDispHed fDispDet Customer ffitems
 * Add --sample to also print the first 3 rows of each table (skip it if the data is sensitive).
 * Output is also saved to erp-describe.txt
 */
import fs from 'fs';
import { pool } from '../db/pool';
import { findDataSource, getConnector } from '../db/erpConnector';
import { introspectSchema } from '../services/introspect';

async function main() {
  const args = process.argv.slice(2);
  const sample = args.includes('--sample');
  const names = args.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase());
  if (!names.length) throw new Error('Usage: npm run erp:describe -- <table> [table...] [--sample]');

  const row = await findDataSource();
  if (!row) throw new Error('No data source registered. Run "npm run erp:connect" first.');
  const conn = getConnector(row);
  const schema = await introspectSchema(conn);

  const out: string[] = [];
  for (const n of names) {
    const t = schema.tables.find((x) => x.name.toLowerCase() === n);
    if (!t) {
      out.push(`\n### ${n}: TABLE NOT FOUND`);
      continue;
    }
    out.push(`\n### ${t.name}  (${t.fields.length} columns)`);
    for (const f of t.fields) {
      out.push(`  ${f.name}  [${f.dataType}${f.nullable ? ', null' : ''}]${f.isKey ? '  PK' : ''}${f.references ? `  -> ${f.references}` : ''}`);
    }
    if (sample) {
      const r = await conn.query(`SELECT TOP 3 * FROM [${t.name.replace(/]/g, ']]')}]`);
      out.push('  -- sample rows --');
      r.rows.forEach((x) => out.push('  ' + JSON.stringify(x)));
    }
  }
  const text = out.join('\n');
  console.log(text);
  fs.writeFileSync('erp-describe.txt', text);
  console.log('\n(also saved to erp-describe.txt)');
  await conn.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});