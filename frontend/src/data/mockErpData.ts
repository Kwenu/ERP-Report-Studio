import type { Row } from '../types/erp';
import { daysBetween, isoAddDays, pad, todayIso } from '../utils/format';

/* Deterministic pseudo-random generator so the demo data is stable. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const customers = [
'Biosmart LK (Pvt) Ltd',
'Hortigrow Substrate I.N.C.',
'Hydrocroir (Pvt) Ltd',
'7C Gallery',
'A.A.P.S.K.Amarasingha',
'A.A.P.Priyantha',
'A.E.Disanayaka',
'A.G.D.P.Karunaratne',
'A.I.Hettiarachchi',
'A.I.M.Askar',
'A.J.Farm (Pvt) Ltd',
'A.Kirinda',
'Asian Hardware Hambantota',
'Colombo Dock Yard PLC',
'Danushka Hardware',
'Deen Stores',
'Ceylon Tenny Exports'];


export const salesReps = ['DAN', 'DIS', 'Fredrick', 'Ishan', 'Nayomika', 'Nishan'];

export const repFullNames: Record<string, string> = {
  DAN: 'Danushka Weerasinghe',
  DIS: 'Dissanayake Bandara',
  Fredrick: 'Fredrick Rajapakse',
  Ishan: 'Ishan Fernando',
  Nayomika: 'Nayomika Silva',
  Nishan: 'Nishan Perera'
};

export const items = [
{ name: 'Grow Soil Substrate 5kg', category: 'Substrates', price: 1450 },
{ name: 'Riococo Lanka Slab 100x20', category: 'Substrates', price: 2380 },
{ name: 'Brown Grow Bag 40L', category: 'Grow Bags', price: 860 },
{ name: 'Peat Mix Fine 50L', category: 'Substrates', price: 1120 },
{ name: 'Ceylon Tenny Black Tea 1kg', category: 'Tea', price: 3150 },
{ name: 'DP Pack Standard', category: 'Packaging', price: 640 },
{ name: 'Basilur Tea Gift Carton', category: 'Tea', price: 4280 },
{ name: 'Helasuwaya Herbal Pack', category: 'Herbal', price: 1980 },
{ name: 'Uniworld Teas Carton 20kg', category: 'Tea', price: 12400 },
{ name: 'Nature Ceylon Spice Mix', category: 'Spices', price: 2260 },
{ name: 'Coco Peat Block 5kg', category: 'Substrates', price: 980 },
{ name: 'Husk Chips 25L Bale', category: 'Substrates', price: 1340 }];


export const termsList = ['Net 30', 'Net 15', 'Net 60', 'Due on receipt', '2% 10 Net 30'];

const termDays: Record<string, number> = {
  'Net 30': 30,
  'Net 15': 15,
  'Net 60': 60,
  'Due on receipt': 0,
  '2% 10 Net 30': 30
};

const cities = [
'Colombo 03',
'Negombo',
'Kandy',
'Hambantota',
'Galle',
'Kurunegala',
'Matara'];


function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function isoFrom(start: string, dayOffset: number) {
  return isoAddDays(start, dayOffset);
}

/* ------------------------------------------------------------------ *
 * Dataset 1 — Sales invoice line detail (April / May 2023)            *
 * ------------------------------------------------------------------ */
function buildSalesLines(): Row[] {
  const rng = mulberry32(20230401);
  const rows: Row[] = [];
  let invoiceSeq = 24100;
  let lineSeq = 441000;

  for (let i = 0; i < 96; i += 1) {
    const customer = pick(rng, customers);
    const rep = pick(rng, salesReps);
    const terms = pick(rng, termsList);
    const dayOffset = Math.floor(rng() * 60);
    const date = isoFrom('2023-04-01', dayOffset);
    const dueDate = isoAddDays(date, termDays[terms]);
    invoiceSeq += 1;
    const num = `INV-${invoiceSeq}`;
    const po = rng() > 0.45 ? `PO-${Math.floor(rng() * 90000 + 10000)}` : '';
    const lineCount = 1 + Math.floor(rng() * 4);
    const paid = rng() > 0.35 ? 'Yes' : 'No';
    const city = pick(rng, cities);

    for (let l = 0; l < lineCount; l += 1) {
      const item = pick(rng, items);
      const qty = Math.round((5 + rng() * 240) / 5) * 5;
      const priceJitter = 1 + (rng() - 0.5) * 0.12;
      const salesPrice = Math.round(item.price * priceJitter * 100) / 100;
      const amount = Math.round(qty * salesPrice * 100) / 100;
      lineSeq += 1;
      rows.push({
        lineId: lineSeq,
        invoiceId: invoiceSeq,
        customerId: 10000 + customers.indexOf(customer),
        date,
        num,
        name: customer,
        terms,
        dueDate,
        item: item.name,
        category: item.category,
        paid,
        qty,
        salesPrice,
        amount,
        other1: rep,
        other2: po || '—',
        memo: `${item.category} order — ${city}`,
        rep,
        repName: repFullNames[rep],
        department: 'Sales',
        status: paid === 'Yes' ? 'Paid' : 'Open',
        city,
        po,
        uom: 'EA',
        itemId: 300 + items.indexOf(item),
        repId: 1 + salesReps.indexOf(rep),
        email: `accounts@${customer.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.lk`,
        creditLimit: 500000 + Math.floor(rng() * 20) * 250000
      });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * Dataset 2 — Payment transactions for Average Days to Pay            *
 * ------------------------------------------------------------------ */
function buildPaymentTxns(): Row[] {
  const rng = mulberry32(77123);
  const rows: Row[] = [];
  let seq = 21400;

  customers.forEach((customer) => {
    const txnCount = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < txnCount; i += 1) {
      const terms = pick(rng, termsList);
      const date = isoFrom('2023-01-05', Math.floor(rng() * 150));
      const dueDate = isoAddDays(date, termDays[terms]);
      const paidFlag = rng() > 0.12;
      const drift = Math.floor(rng() * 46) - 12;
      const paidDate = paidFlag ? isoAddDays(dueDate, drift) : '';
      const amount = Math.round((18000 + rng() * 640000) * 100) / 100;
      const rep = pick(rng, salesReps);
      seq += 1;
      rows.push({
        paymentId: 55000 + seq,
        invoiceId: seq,
        date,
        num: `INV-${seq}`,
        paid: paidFlag ? 'Yes' : 'No',
        amount,
        name: customer,
        terms,
        dueDate,
        paidDate,
        avgDaysToPay: paidFlag ? daysBetween(paidDate, dueDate) : null,
        paidAmount: paidFlag ? amount : 0,
        paymentMethod: pick(rng, ['Bank Transfer', 'Cheque', 'Cash']),
        rep,
        repName: repFullNames[rep],
        status: paidFlag ? 'Paid' : 'Open',
        customerId: 10000 + customers.indexOf(customer)
      });
    }
  });
  return rows;
}

/* ------------------------------------------------------------------ *
 * Dataset 3 — Open invoices as of today                               *
 * ------------------------------------------------------------------ */
function buildOpenInvoices(): Row[] {
  const rng = mulberry32(4451);
  const today = todayIso();
  const rows: Row[] = [];
  let seq = 31800;

  customers.forEach((customer) => {
    const invoiceCount = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < invoiceCount; i += 1) {
      const terms = pick(rng, termsList);
      const date = isoAddDays(today, -Math.floor(rng() * 150) - 2);
      const dueDate = isoAddDays(date, termDays[terms]);
      const aging = Math.max(0, daysBetween(today, dueDate));
      const amount = Math.round((24000 + rng() * 780000) * 100) / 100;
      const openBalance =
      rng() > 0.7 ? Math.round(amount * (0.15 + rng() * 0.6) * 100) / 100 : amount;
      const rep = pick(rng, salesReps);
      seq += 1;
      rows.push({
        type: rng() > 0.92 ? 'Credit Memo' : 'Invoice',
        date,
        num: `INV-${seq}`,
        po: rng() > 0.4 ? `PO-${Math.floor(rng() * 90000 + 10000)}` : '',
        terms,
        aging,
        openBalance,
        amount,
        name: customer,
        dueDate,
        rep,
        repName: repFullNames[rep],
        status: 'Open',
        customerId: 10000 + customers.indexOf(customer),
        invoiceId: seq,
        city: pick(rng, cities)
      });
    }
  });
  return rows;
}

/* ------------------------------------------------------------------ *
 * Curated rows that reproduce the familiar ERP report examples        *
 * (Biosmart April detail, and the 08 May rep-detail day).             *
 * ------------------------------------------------------------------ */
interface CuratedSpec {
  date: string;
  customer: string;
  rep: string;
  item: string;
  qty: number;
  price: number;
  terms: string;
  paid: 'Yes' | 'No';
  memo: string;
}

function buildCurated(specs: CuratedSpec[], startInvoice: number): Row[] {
  return specs.map((s, i) => {
    const invoiceId = startInvoice + i;
    const amount = Math.round(s.qty * s.price * 100) / 100;
    const item = items.find((it) => it.name === s.item);
    return {
      lineId: 400000 + i,
      invoiceId,
      customerId: 10000 + customers.indexOf(s.customer),
      date: s.date,
      num: `INV-${invoiceId}`,
      name: s.customer,
      terms: s.terms,
      dueDate: isoAddDays(s.date, termDays[s.terms]),
      item: s.item,
      category: item?.category ?? 'General',
      paid: s.paid,
      qty: s.qty,
      salesPrice: s.price,
      amount,
      other1: s.rep,
      other2: `PO-${44000 + i}`,
      memo: s.memo,
      rep: s.rep,
      repName: repFullNames[s.rep],
      department: 'Sales',
      status: s.paid === 'Yes' ? 'Paid' : 'Open',
      city: 'Colombo 03',
      po: `PO-${44000 + i}`,
      uom: 'EA',
      itemId: 300 + (item ? items.indexOf(item) : 0),
      repId: 1 + salesReps.indexOf(s.rep),
      email: 'accounts@polydime.lk',
      creditLimit: 2500000
    };
  });
}

const curatedApril = buildCurated(
  [
  { date: '2023-04-09', customer: 'Biosmart LK (Pvt) Ltd', rep: 'DIS', item: 'Grow Soil Substrate 5kg', qty: 240, price: 1450, terms: 'Net 30', paid: 'Yes', memo: 'April bulk despatch' },
  { date: '2023-04-26', customer: 'Biosmart LK (Pvt) Ltd', rep: 'DIS', item: 'Riococo Lanka Slab 100x20', qty: 120, price: 2380, terms: 'Net 30', paid: 'Yes', memo: 'Slab replenishment' },
  { date: '2023-04-26', customer: 'Biosmart LK (Pvt) Ltd', rep: 'DIS', item: 'Brown Grow Bag 40L', qty: 500, price: 860, terms: 'Net 30', paid: 'No', memo: 'Grow bag order' },
  { date: '2023-04-26', customer: 'Biosmart LK (Pvt) Ltd', rep: 'DIS', item: 'Coco Peat Block 5kg', qty: 300, price: 980, terms: 'Net 30', paid: 'No', memo: 'Peat block order' },
  { date: '2023-04-12', customer: 'Hortigrow Substrate I.N.C.', rep: 'Nishan', item: 'Peat Mix Fine 50L', qty: 180, price: 1120, terms: 'Net 60', paid: 'Yes', memo: 'Export consignment' },
  { date: '2023-04-19', customer: 'Hydrocroir (Pvt) Ltd', rep: 'DAN', item: 'Husk Chips 25L Bale', qty: 220, price: 1340, terms: 'Net 15', paid: 'No', memo: 'Hydroponics supply' }],

  24010
);

const curatedMay8 = buildCurated(
  [
  { date: '2023-05-08', customer: 'Ceylon Tenny Exports', rep: 'DAN', item: 'Ceylon Tenny Black Tea 1kg', qty: 60, price: 3150, terms: 'Net 30', paid: 'Yes', memo: 'Tea despatch 1' },
  { date: '2023-05-08', customer: 'Ceylon Tenny Exports', rep: 'DAN', item: 'Ceylon Tenny Black Tea 1kg', qty: 45, price: 3150, terms: 'Net 30', paid: 'No', memo: 'Tea despatch 2' },
  { date: '2023-05-08', customer: 'Biosmart LK (Pvt) Ltd', rep: 'DIS', item: 'Grow Soil Substrate 5kg', qty: 150, price: 1450, terms: 'Net 30', paid: 'Yes', memo: 'Substrate order' },
  { date: '2023-05-08', customer: 'Hydrocroir (Pvt) Ltd', rep: 'DIS', item: 'Riococo Lanka Slab 100x20', qty: 90, price: 2380, terms: 'Net 30', paid: 'No', memo: 'Slab order' },
  { date: '2023-05-08', customer: 'A.J.Farm (Pvt) Ltd', rep: 'DIS', item: 'Brown Grow Bag 40L', qty: 400, price: 860, terms: 'Net 15', paid: 'No', memo: 'Grow bag order' },
  { date: '2023-05-08', customer: 'Hortigrow Substrate I.N.C.', rep: 'DIS', item: 'Peat Mix Fine 50L', qty: 260, price: 1120, terms: 'Net 60', paid: 'Yes', memo: 'Peat mix order' },
  { date: '2023-05-08', customer: 'Deen Stores', rep: 'Fredrick', item: 'DP Pack Standard', qty: 800, price: 640, terms: 'Net 30', paid: 'No', memo: 'DP Pack — retail' },
  { date: '2023-05-08', customer: 'Danushka Hardware', rep: 'Fredrick', item: 'DP Pack Standard', qty: 350, price: 640, terms: 'Due on receipt', paid: 'Yes', memo: 'DP Pack — counter' },
  { date: '2023-05-08', customer: '7C Gallery', rep: 'Ishan', item: 'Basilur Tea Gift Carton', qty: 75, price: 4280, terms: 'Net 30', paid: 'Yes', memo: 'Gift carton order' },
  { date: '2023-05-08', customer: 'A.I.M.Askar', rep: 'Nayomika', item: 'Helasuwaya Herbal Pack', qty: 210, price: 1980, terms: 'Net 15', paid: 'No', memo: 'Herbal pack order' },
  { date: '2023-05-08', customer: 'Colombo Dock Yard PLC', rep: 'Nishan', item: 'Uniworld Teas Carton 20kg', qty: 40, price: 12400, terms: 'Net 60', paid: 'No', memo: 'Canteen supply' },
  { date: '2023-05-08', customer: 'Asian Hardware Hambantota', rep: 'Nishan', item: 'Nature Ceylon Spice Mix', qty: 160, price: 2260, terms: 'Net 30', paid: 'Yes', memo: 'Spice mix order' }],

  24050
);

export const salesLines = [...curatedApril, ...curatedMay8, ...buildSalesLines()];
export const paymentTxns = buildPaymentTxns();
export const openInvoices = buildOpenInvoices();

export const datasets: Record<string, Row[]> = {
  salesLines,
  paymentTxns,
  openInvoices
};

export const asOfDate = todayIso();

export const agingBuckets = [
{ id: 'current', label: 'Current', test: (d: number) => d <= 0 },
{ id: '1-30', label: '1–30 days', test: (d: number) => d >= 1 && d <= 30 },
{ id: '31-60', label: '31–60 days', test: (d: number) => d >= 31 && d <= 60 },
{ id: '61-90', label: '61–90 days', test: (d: number) => d >= 61 && d <= 90 },
{ id: '90+', label: '90+ days', test: (d: number) => d > 90 }];


export const currentPeriodLabel = `${pad(new Date().getMonth() + 1)}/${pad(
  new Date().getDate()
)}/${new Date().getFullYear()}`;