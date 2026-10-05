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

  const server = app.listen(env.port, () => {
    console.log(`✅ ERP Report Studio backend listening on http://localhost:${env.port}`);
    console.log(`   API base: http://localhost:${env.port}/api/v1`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `❌ Port ${env.port} is already in use (another backend still running?).` : err);
    process.exit(1);
  });
}

// A failed ERP connection must never take the API down.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

main();

process.on('SIGTERM', () => pool.end());
process.on('SIGINT', () => pool.end());
