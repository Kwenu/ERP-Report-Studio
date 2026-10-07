import fs from 'fs';
import { pool } from '../db/pool';
import { findDataSource, getConnector } from '../db/erpConnector';
import { introspectSchema } from '../services/introspect';

async function main() {
  const row = await findDataSource();
  if (!row) throw new Error('No data source registered. Run "npm run erp:connect" first.');
  const conn = getConnector(row);
  const schema = await introspectSchema(conn);

  const lines: string[] = [`Database: ${row.database_name} on ${row.server}`, `${schema.tables.length} tables, ${schema.fieldCount} columns`, ''];
  for (const t of schema.tables) {
    lines.push(t.name);
    for (const f of t.fields) {
      lines.push(`    ${f.name}  [${f.dataType}${f.nullable ? ', null' : ''}]${f.isKey ? '  PK' : ''}${f.references ? `  -> ${f.references}` : ''}`);
    }
    lines.push('');
  }
  fs.writeFileSync('erp-schema.txt', lines.join('\n'));
  console.log(lines.slice(0, 3).join('\n'));
  console.log('Full catalogue written to ./erp-schema.txt');
  await conn.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
