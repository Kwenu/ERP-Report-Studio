import { query, pool } from '../db/pool';
import { env } from '../config/env';
import { encryptSecret } from '../utils/crypto';
import { testDatasourceConnection } from '../services/datasourceDrivers';

async function main() {
  const e = env.erp;
  if (!e.server || !e.database || !e.user) {
    throw new Error('Set ERP_DB_SERVER, ERP_DB_NAME, ERP_DB_USER and ERP_DB_PASSWORD in backend/.env first.');
  }
  const name = 'ERP Production Database';
  const encrypted = e.password ? encryptSecret({ password: e.password }) : null;

  await query('UPDATE data_sources SET is_primary = false');
  const existing = await query('SELECT id FROM data_sources WHERE name = $1', [name]);
  if (existing.rows[0]) {
    await query(
      `UPDATE data_sources SET database_type=$1, server=$2, port=$3, database_name=$4,
         auth_method='Database Authentication', username=$5, encrypted_credentials=$6, is_primary=true WHERE id=$7`,
      [e.type, e.server, e.port, e.database, e.user, encrypted, existing.rows[0].id]
    );
  } else {
    await query(
      `INSERT INTO data_sources (name, database_type, server, port, database_name, auth_method, username, encrypted_credentials, is_primary)
       VALUES ($1,$2,$3,$4,$5,'Database Authentication',$6,$7,true)`,
      [name, e.type, e.server, e.port, e.database, e.user, encrypted]
    );
  }
  console.log(`Registered "${name}" (${e.type} ${e.server}:${e.port}/${e.database}) as the primary data source.`);

  const result = await testDatasourceConnection({
    server: e.server,
    port: e.port,
    database: e.database,
    databaseType: e.type,
    authMethod: 'Database Authentication',
    username: e.user,
    password: e.password
  });
  result.steps.forEach((s) => console.log(`  [${s.status.toUpperCase()}] ${s.id}: ${s.detail}`));
  await query('UPDATE data_sources SET status=$1 WHERE name=$2', [result.success ? 'Connected' : 'Error', name]);
  console.log(result.success ? '\n✅ Connected.' : `\n❌ ${result.message}`);
  await pool.end();
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
