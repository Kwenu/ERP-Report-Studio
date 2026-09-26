/* Populates the database with:
 *   - a few app_users (admin, designer, viewer) you can log in with
 *   - a realistic demo ERP dataset (customers, employees, items, invoices,
 *     invoice lines, payments) so reports return real, meaningful rows
 *   - a couple of starter report definitions
 *
 * Run with: npm run seed   (after `npm run db:init`)
 * Safe to re-run: it clears the demo tables first (TRUNCATE ... CASCADE).
 */
import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { env } from '../config/env';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20230401);
const pick = <T,>(list: T[]): T => list[Math.floor(rng() * list.length)];
const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const CUSTOMERS = [
  ['Biosmart LK (Pvt) Ltd', 'Colombo 03'],
  ['Hortigrow Substrate Inc', 'Negombo'],
  ['Hydrocroir (Pvt) Ltd', 'Kandy'],
  ['7C Gallery', 'Colombo 03'],
  ['A.J. Farm (Pvt) Ltd', 'Kurunegala'],
  ['Asian Hardware Hambantota', 'Hambantota'],
  ['Colombo Dock Yard PLC', 'Colombo 03'],
  ['Danushka Hardware', 'Galle'],
  ['Deen Stores', 'Matara'],
  ['Ceylon Tenny Exports', 'Negombo']
] as const;

const REPS = [
  ['DAN', 'Danushka Weerasinghe'],
  ['DIS', 'Dissanayake Bandara'],
  ['FRE', 'Fredrick Rajapakse'],
  ['ISH', 'Ishan Fernando'],
  ['NAY', 'Nayomika Silva'],
  ['NIS', 'Nishan Perera']
] as const;

const ITEMS = [
  ['Grow Soil Substrate 5kg', 'Substrates', 1450],
  ['Riococo Lanka Slab 100x20', 'Substrates', 2380],
  ['Brown Grow Bag 40L', 'Grow Bags', 860],
  ['Peat Mix Fine 50L', 'Substrates', 1120],
  ['Coco Peat Block 5kg', 'Substrates', 980],
  ['Husk Chips 25L Bale', 'Substrates', 1340],
  ['DP Pack Standard', 'Packaging', 640]
] as const;

const TERMS: Record<string, number> = { 'Net 30': 30, 'Net 15': 15, 'Net 60': 60, 'Due on receipt': 0 };

async function main() {
  console.log('Seeding database...');

  await pool.query(
    'TRUNCATE erp_payments, erp_invoice_lines, erp_invoices, erp_items, erp_employees, erp_departments, erp_customers RESTART IDENTITY CASCADE'
  );
  await pool.query('TRUNCATE favorites, recently_viewed, reports RESTART IDENTITY CASCADE');

  // --- app users ---
  const adminHash = await bcrypt.hash(env.seedAdminPassword, 10);
  const designerHash = await bcrypt.hash('Designer123!', 10);
  const viewerHash = await bcrypt.hash('Viewer123!', 10);

  await pool.query(
    `INSERT INTO app_users (name, email, password_hash, role, department, status, last_active)
     VALUES
       ($1,$2,$3,'Administrator','Finance','Active', now()),
       ('Dilani Gunawardena','dilani.gunawardena@polydime.lk',$4,'Report Designer','Finance','Active', now()),
       ('Fredrick Rajapakse','fredrick.rajapakse@polydime.lk',$5,'Report Viewer','Sales','Active', now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [env.seedAdminName, env.seedAdminEmail, adminHash, designerHash, viewerHash]
  );
  console.log(`  Users: admin <${env.seedAdminEmail}> / password "${env.seedAdminPassword}"`);

  // --- departments & employees ---
  const deptRes = await pool.query(
    `INSERT INTO erp_departments (department_name) VALUES ('Sales'), ('Finance') RETURNING department_id`
  );
  const salesDeptId = deptRes.rows[0].department_id;

  const employeeIds: number[] = [];
  for (const [code, name] of REPS) {
    const r = await pool.query(
      `INSERT INTO erp_employees (employee_name, department_id, rep_code, territory) VALUES ($1,$2,$3,$4) RETURNING employee_id`,
      [name, salesDeptId, code, pick(['Western', 'Southern', 'Central', 'North Western'])]
    );
    employeeIds.push(r.rows[0].employee_id);
  }

  // --- customers ---
  const customerIds: number[] = [];
  for (const [name, city] of CUSTOMERS) {
    const slug = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const r = await pool.query(
      `INSERT INTO erp_customers (customer_name, address, city, phone, email, credit_limit)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING customer_id`,
      [
        name,
        `${10 + Math.floor(rng() * 200)} Main Street`,
        city,
        `+94 11 ${200 + Math.floor(rng() * 700)} ${1000 + Math.floor(rng() * 8999)}`,
        `accounts@${slug}.lk`,
        500000 + Math.floor(rng() * 20) * 250000
      ]
    );
    customerIds.push(r.rows[0].customer_id);
  }

  // --- items ---
  const itemIds: number[] = [];
  for (const [name, category, price] of ITEMS) {
    const r = await pool.query(
      `INSERT INTO erp_items (item_name, category, unit_price, uom) VALUES ($1,$2,$3,'EA') RETURNING item_id`,
      [name, category, price]
    );
    itemIds.push(r.rows[0].item_id);
  }

  // --- invoices + invoice lines (last ~150 days) ---
  const today = new Date().toISOString().slice(0, 10);
  let invoiceSeq = 24100;
  const invoiceCount = 220;
  for (let i = 0; i < invoiceCount; i += 1) {
    const customerId = pick(customerIds);
    const repId = pick(employeeIds);
    const termsKey = pick(Object.keys(TERMS));
    const date = addDays(today, -Math.floor(rng() * 150));
    const dueDate = addDays(date, TERMS[termsKey]);
    invoiceSeq += 1;
    const paidRoll = rng();
    const paidStatus = paidRoll > 0.35 ? 'Yes' : 'No';
    const status = paidStatus === 'Yes' ? 'Paid' : 'Open';

    const lineCount = 1 + Math.floor(rng() * 4);
    let total = 0;
    const lines: Array<{ itemId: number; qty: number; price: number; amount: number }> = [];
    for (let l = 0; l < lineCount; l += 1) {
      const itemId = pick(itemIds);
      const basePrice = ITEMS[itemIds.indexOf(itemId)][2] as number;
      const qty = Math.round((5 + rng() * 100) / 5) * 5;
      const price = Math.round(basePrice * (1 + (rng() - 0.5) * 0.1) * 100) / 100;
      const amount = Math.round(qty * price * 100) / 100;
      total += amount;
      lines.push({ itemId, qty, price, amount });
    }
    const openBalance = status === 'Open' ? Math.round(total * (0.2 + rng() * 0.7) * 100) / 100 : 0;

    const invRes = await pool.query(
      `INSERT INTO erp_invoices
         (invoice_number, invoice_date, customer_id, sales_rep_id, terms, due_date, total_amount, open_balance, status, po_number, memo, type, paid_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Invoice',$12) RETURNING invoice_id`,
      [
        `INV-${invoiceSeq}`,
        date,
        customerId,
        repId,
        termsKey,
        dueDate,
        total,
        openBalance,
        status,
        rng() > 0.45 ? `PO-${Math.floor(rng() * 90000 + 10000)}` : null,
        `Order — ${date}`,
        paidStatus
      ]
    );
    const invoiceId = invRes.rows[0].invoice_id;

    for (const line of lines) {
      await pool.query(
        `INSERT INTO erp_invoice_lines (invoice_id, item_id, quantity, sales_price, amount, line_memo)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invoiceId, line.itemId, line.qty, line.price, line.amount, null]
      );
    }

    if (paidStatus === 'Yes') {
      const drift = Math.floor(rng() * 20) - 5;
      const paidDate = addDays(dueDate, drift);
      await pool.query(
        `INSERT INTO erp_payments (invoice_id, customer_id, payment_date, payment_amount, payment_method, reference, avg_days_to_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          invoiceId,
          customerId,
          paidDate,
          total,
          pick(['Bank Transfer', 'Cheque', 'Cash']),
          `REF-${invoiceSeq}`,
          drift
        ]
      );
    }
  }

  console.log(`  Demo ERP data: ${customerIds.length} customers, ${invoiceCount} invoices, ${itemIds.length} items.`);

  // --- a couple of starter report definitions ---
  const adminUser = await pool.query('SELECT id, name FROM app_users WHERE email = $1', [env.seedAdminEmail]);
  const ownerId = adminUser.rows[0].id;
  const ownerName = adminUser.rows[0].name;

  const openInvoicesDef = {
    id: 'open-invoices',
    name: 'Open Invoices',
    description: 'All currently open invoices with aging.',
    category: 'Receivables',
    owner: ownerName,
    createdBy: ownerName,
    visibility: 'Shared with Company',
    type: 'Fixed Template',
    dataset: 'openInvoices',
    columns: [
      { id: 'c1', key: 'num', label: 'Num', dataType: 'text', format: 'text', decimals: 0, align: 'left', width: 100, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c2', key: 'name', label: 'Name', dataType: 'text', format: 'text', decimals: 0, align: 'left', width: 200, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c3', key: 'dueDate', label: 'Due Date', dataType: 'date', format: 'date', decimals: 0, align: 'left', width: 100, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c4', key: 'aging', label: 'Aging', dataType: 'integer', format: 'number', decimals: 0, align: 'right', width: 80, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c5', key: 'openBalance', label: 'Open Balance', dataType: 'currency', format: 'currency', decimals: 2, align: 'right', width: 130, aggregation: 'sum', visible: true, pinned: false, locked: true }
    ],
    groupBy: null,
    filters: [],
    sort: [{ key: 'dueDate', label: 'Due Date', dir: 'asc' }],
    showSubtotals: false,
    showGrandTotal: true,
    showRowCount: true,
    weightedAverage: false,
    headerStyle: 'bold',
    fontSize: 'normal',
    lastModified: new Date().toISOString(),
    lastRun: null
  };

  const salesByCustomerDef = {
    id: 'sales-by-customer-detail',
    name: 'Sales by Customer (Detail)',
    description: 'Invoice line detail grouped by customer.',
    category: 'Sales',
    owner: ownerName,
    createdBy: ownerName,
    visibility: 'Shared with Company',
    type: 'Fixed Template',
    dataset: 'salesLines',
    columns: [
      { id: 'c1', key: 'date', label: 'Date', dataType: 'date', format: 'date', decimals: 0, align: 'left', width: 96, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c2', key: 'num', label: 'Num', dataType: 'text', format: 'text', decimals: 0, align: 'left', width: 100, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c3', key: 'name', label: 'Name', dataType: 'text', format: 'text', decimals: 0, align: 'left', width: 200, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c4', key: 'item', label: 'Item', dataType: 'text', format: 'text', decimals: 0, align: 'left', width: 210, aggregation: 'none', visible: true, pinned: false, locked: true },
      { id: 'c5', key: 'qty', label: 'Qty', dataType: 'decimal', format: 'number', decimals: 0, align: 'right', width: 70, aggregation: 'sum', visible: true, pinned: false, locked: true },
      { id: 'c6', key: 'amount', label: 'Amount', dataType: 'currency', format: 'currency', decimals: 2, align: 'right', width: 120, aggregation: 'sum', visible: true, pinned: false, locked: true }
    ],
    groupBy: 'name',
    filters: [],
    sort: [{ key: 'date', label: 'Date', dir: 'asc' }],
    showSubtotals: true,
    showGrandTotal: true,
    showRowCount: true,
    weightedAverage: false,
    headerStyle: 'bold',
    fontSize: 'normal',
    lastModified: new Date().toISOString(),
    lastRun: null
  };

  for (const def of [openInvoicesDef, salesByCustomerDef]) {
    await pool.query(
      `INSERT INTO reports (id, name, description, category, owner, visibility, type, dataset, definition, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition, last_modified = now()`,
      [def.id, def.name, def.description, def.category, ownerName, def.visibility, def.type, def.dataset, JSON.stringify(def), ownerId]
    );
  }
  console.log('  Starter reports: open-invoices, sales-by-customer-detail');

  console.log('Seed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
