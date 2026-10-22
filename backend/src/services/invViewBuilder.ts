/* Inventory Quick Report - builds dbo.v_inventory_quick from the transaction HEADER tables AND their DETAIL tables.
 *
 * It uses the same engine as the Manufacturing Quick Report (see mfgViewBuilder.ts): one row per detail line of a
 * transaction, detail columns read from the ERP database and matched by name, header-only documents stay one row.
 * Only the layout differs (layout: 'inventory'), as in Inventory_Quick_Report_1.xlsx:
 *
 *   Type | Reference No | Date | Manual No | Item code | Name | Machine | Quantity |
 *   From: Company, Site, Location, Bin Location | To: Company, Site, Location, Bin Location | Cost Centre
 *
 *  - table pairs (header -> detail): the sheet's "Tables need to get the data for this report"
 *  - Transfer, Damage Transfer, Inter Location Transfer, Site Transfer Entry-SF move stock between two places: the From
 *    side is read from the header's F... / From... columns (FSiteCode, FLocCode, FComCode, FBinCode ...), the To side from
 *    T... / To... columns.
 *  - every other document has ONE place (its own SiteCode / LocCode ...). It is shown under From, or under To for the
 *    documents that bring stock in (side: 'to': PO, GRN, Inv Return, Issue Return / Acceptance notes ...).
 *  - several transaction names share one header table (GRN + FOC In Entry on fGrnHed ...): the name is picked by the
 *    document's Txn Type code - `npm run erp:inv-view` finds the codes and lists them in erp-inv-txn-codes.txt.
 */
import { buildView, type AutoCodes, type Catalog, type DetailOverride, type MfgSource, type ViewConfig } from './mfgViewBuilder';

type Place = NonNullable<MfgSource['place']>;
const S = (hed: string, det: string, type: string, place: Place = {}, lookup = false): MfgSource => ({
  hed, det, type, lookup, place,
  // the header's own item / machine / cost centre columns (the detail lines fill what the header does not have)
  cols: { item: 'ItemCode', machine: 'MachCode', cost: 'CostCode' }
});
const IN: Place = { side: 'to' };
const MOVE: Place = { transfer: true };

/** Header table -> detail table. The default type name is shown when a document's Txn Type code has no name in INV_TXN_NAMES. */
export const INV_SOURCES: MfgSource[] = [
  S('fPoHed', 'fPoDet', 'Purchase Order', IN),
  S('fGrnHed', 'fGrnDet', 'Good Receive Note', IN, true),
  S('fGrnrHed', 'fGrnrDet', 'GRN Return'),
  S('fQuoHed', 'fQuoDet', 'Quotation'),
  S('fOrdHed', 'fOrdDet', 'Sales Order'),
  S('fInvHed', 'fInvDet', 'Invoice'),
  S('fInvrHed', 'fInvrDet', 'Inv Return', IN, true),
  S('fDispHed', 'fDispDet', 'Dispatch', {}, true),
  S('fIssHed', 'fIssDet', 'Issue', {}, true),
  S('fIssRHed', 'fIssRDet', 'Issue Return', IN, true),
  S('fTranHed', 'fTranDet', 'Transfer', MOVE),
  S('fDamHed', 'fDamDet', 'Damage Transfer', MOVE),
  S('fMatRetHed', 'fMatRetDet', 'Inter Location Transfer', MOVE),
  S('fAdjHed', 'fAdjDet', 'Adjustment', {}, true),
  S('FiRIssHed', 'FiRIssDet', 'Issue Note - Stock'),
  S('fiAccpHed', 'fiAccpDet', 'Acceptance Note', IN),
  S('fmRStTrnhed', 'fmRStTrnDet', 'Site Transfer Entry-SF', MOVE)
];

/** Transaction names that share one header table (rows of Inventory_Quick_Report.xlsx). Add the Txn Type code as a third
 *  value, e.g. ['fGrnHed', 'FOC In Entry', 'FOC'], to give that name to that code; codes are also matched automatically
 *  when the ERP has a transaction-type table. A code with no name shows the table's default type name. */
export const INV_TXN_NAMES: [table: string, name: string, code?: string][] = [
  ['fGrnHed', 'Good Receive Note'],
  ['fGrnHed', 'FOC In Entry'],
  ['fInvrHed', 'Inv Return with Inv'],
  ['fInvrHed', 'Inv Return'],
  ['fDispHed', 'Dispatch'],
  ['fDispHed', 'Dispatch (Inv Ret)'],
  ['fDispHed', 'Un Used Dispatch'],
  ['fIssHed', 'Issue'],
  ['fIssHed', 'Issue Note -Pipe'],
  ['fIssRHed', 'Issue Return'],
  ['fIssRHed', 'Issue Acceptance Note'],
  ['fIssRHed', 'Acceptance Note-Pipe'],
  ['fIssRHed', 'Acceptance Note-Waste'],
  ['fIssRHed', 'Un Used Product In Entry'],
  ['fAdjHed', 'Adjustment - Add'],
  ['fAdjHed', 'Adjustment - Ded'],
  ['fAdjHed', 'Floor Adjustment - Add'],
  ['fAdjHed', 'Floor Adjustment - Ded']
];

/** Columns that are not found automatically can be set here (keys = header table names, any letter case):
 *  qty = the detail column holding the Quantity; places = header columns for the From / To place;
 *  use: false = header only. */
export const INV_OVERRIDES: Record<string, DetailOverride> = {
  // Purchase Order quantity = AloQty (when this column exists; otherwise Qty is used)
  fPoHed: { qty: 'AloQty' }
  // fTranHed: { places: { fromBin: 'FBinCode', toBin: 'TBinCode' } },
  // fGrnHed: { qty: 'Qty' },
};

export const INV_CONFIG: ViewConfig = {
  sources: INV_SOURCES,
  names: INV_TXN_NAMES,
  viewName: 'v_inventory_quick',
  title: 'Inventory Quick Report',
  command: 'npm run erp:inv-view',
  opts: { overrides: INV_OVERRIDES, withCustomer: false, layout: 'inventory' }
};

/** Builds the Inventory Quick Report view from what exists in the ERP database. */
export function buildInvView(catalog: Catalog, autoCodes: AutoCodes = new Map()) {
  return buildView(INV_CONFIG, catalog, autoCodes);
}
