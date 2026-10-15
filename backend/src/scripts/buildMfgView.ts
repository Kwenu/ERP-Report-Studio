/* Builds the Manufacturing Quick Report view (dbo.v_manufacturing_quick) from the transaction header AND detail tables.
 *
 *   npm run erp:mfg-view             reads the table / column names of the ERP database, writes
 *                                      db/erp_views.manufacturing.generated.sql  (run it in SSMS)
 *                                      erp-mfg-view-report.txt                   (what each transaction reads)
 *                                      erp-mfg-txn-codes.txt                     (Txn Type codes of the shared tables)
 *   npm run erp:mfg-view -- --apply  also creates / replaces the view right away
 *                                      (needs a login that is allowed to CREATE VIEW; the report's own read-only login is not)
 *
 * Nothing is changed in the database unless --apply is given. */
import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool';
import { findDataSource, getConnector } from '../db/erpConnector';
import { buildMfgView, describeDispatchCoverage, describeTxnCodes, detectInvoiceHeaders, formatReport, loadCatalog, reconcileView, resolveTxnCodes } from '../services/mfgViewBuilder';

async function main() {
  const apply = process.argv.includes('--apply');

  const row = await findDataSource();
  if (!row) throw new Error('No data source registered. Run "npm run erp:connect" first.');
  const conn = getConnector(row);
  if (conn.dialect !== 'mssql') throw new Error('The Manufacturing Quick Report view is written for SQL Server.');

  console.log(`Reading table and column names from ${conn.label} ...`);
  const catalog = await loadCatalog(conn);
  console.log('Looking up the Txn Type codes of the shared transaction names ...');
  const { codes, note } = await resolveTxnCodes(conn, catalog);
  console.log(note);
  console.log('Checking which header columns hold invoice numbers ...');
  const invoices = await detectInvoiceHeaders(conn, catalog);
  invoices.notes.forEach((n) => console.log(`  ${n}`));
  const built = buildMfgView(catalog, codes, invoices.headers);

  const sqlPath = path.resolve(__dirname, '../../db/erp_views.manufacturing.generated.sql');
  fs.writeFileSync(sqlPath, built.script);
  const report = formatReport(built, codes);
  fs.writeFileSync('erp-mfg-view-report.txt', report);

  let codesPath = '';
  try {
    const coverage = await describeDispatchCoverage(conn, catalog, codes);
    console.log(`\n${coverage}\n`);
    fs.writeFileSync('erp-mfg-txn-codes.txt', `${await describeTxnCodes(conn, catalog, codes, note)}\n\n${coverage}\n\nInvoice numbers:\n${invoices.notes.map((n) => `  ${n}`).join('\n')}\n`);
    codesPath = path.resolve('erp-mfg-txn-codes.txt');
  } catch (err: any) {
    console.warn(`Could not list the Txn Type codes: ${err.message ?? err}`);
  }

  console.log(report.split('\n').filter(Boolean).slice(0, 2).join('\n'));
  const notes = built.report.filter((r) => r.notes.length).length;
  if (notes || built.skipped.length) {
    console.log(`\n${notes} transaction(s) have notes (a detail table or column that was not found) - see erp-mfg-view-report.txt.`);
  }
  console.log(`\nWritten: ${sqlPath}\n         ${path.resolve('erp-mfg-view-report.txt')}${codesPath ? `\n         ${codesPath}` : ''}`);

  if (apply) {
    try {
      await conn.query(built.dropSql);
      await conn.query(built.createSql);
      const [{ n }] = (await conn.query('SELECT COUNT(*) AS n FROM dbo.v_manufacturing_quick')).rows;
      console.log(`\nView dbo.v_manufacturing_quick created - ${Number(n).toLocaleString()} rows in total. Press Refresh in the report.`);
      (await reconcileView(conn, built)).forEach((l, i) => console.log(i === 0 ? `\n${l}` : `  ${l}`));
    } catch (err: any) {
      console.error(`\nCould not create the view: ${err.message ?? err}`);
      console.error('If this is a permissions error, open the generated .sql file in SSMS and run it with a login that can CREATE VIEW.');
      process.exitCode = 1;
    }
  } else {
    console.log('\nNext: run the generated .sql file in SSMS on the ERP database (or run this command again with --apply), then press Refresh in the report.');
  }

  await conn.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
