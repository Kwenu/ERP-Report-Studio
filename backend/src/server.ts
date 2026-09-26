import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

async function main() {
  // Fail fast with a clear message if the database isn't reachable.
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('❌ Could not connect to the database. Check DATABASE_URL in .env.');
    console.error(err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`✅ ERP Report Studio backend listening on http://localhost:${env.port}`);
    console.log(`   API base: http://localhost:${env.port}/api/v1`);
  });
}

main();

process.on('SIGTERM', () => pool.end());
process.on('SIGINT', () => pool.end());
