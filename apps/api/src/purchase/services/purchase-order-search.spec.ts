import * as ExcelJS from 'exceljs';
import { PurchaseOrdersService } from './purchase-orders.service';

const queries: Array<{ table: string; filters: any[]; offset: number }> = [];
function fixture() {
  queries.length = 0;
  const vendors = [{ id: 'v1', name: 'Macfos Components' }, { id: 'v2', name: 'Other Supplier' }];
  const rows = Array.from({ length: 521 }, (_, i) => ({
    id: `po-${i}`, tenant_id: 't1', po_number: `PO-2026-${String(i + 1).padStart(4, '0')}`,
    vendor_id: i === 0 ? 'v2' : 'v1', vendor: null,
    status: i === 1 ? 'DRAFT' : 'APPROVED', pr_id: i === 520 ? 'pr-late' : null,
    purchase_order_items: [{ id: `line-${i}`, item_code: i === 520 ? 'SAS-ZX521' : 'REGULAR', item_name: i === 520 ? 'Brushless Actuator' : 'Bolt', description: i === 520 ? 'Titanium angular housing' : 'Plain', ordered_qty: 1, rate: 1, amount: 1 }],
  }));
  const service: any = Object.create(PurchaseOrdersService.prototype);
  service.supabase = { from(table: string) {
    const filters: any[] = []; let offset = 0, end = Infinity;
    const query: any = {
      select: () => query, order: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      in: (key, values) => { filters.push([key, values]); return query; },
      range: (start, last) => { offset = start; end = last; return query; },
      then(resolve, reject) {
        queries.push({ table, filters: [...filters], offset });
        const data = table === 'purchase_orders' ? [...rows, { ...rows[520], id: 'foreign', tenant_id: 't2' }]
          : table === 'purchase_requisitions' ? [{ id: 'pr-late', tenant_id: 't1', pr_number: 'PR-SPECIAL-24' }] : [];
        const filtered = data.filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        // Simulate a database response cap, smaller than the requested range.
        return Promise.resolve({ data: filtered.slice(offset, Math.min(end + 1, offset + 100)), error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  service.resolveVendorMap = jest.fn().mockResolvedValue(new Map(vendors.map(v => [v.id, v])));
  service.fetchReceiptLedgerForPurchaseOrders = jest.fn().mockResolvedValue({});
  service.computeReceiptSummary = jest.fn(async (_tenant, po) => ({ receipt_status: po.id === 'po-2' ? 'FULLY_RECEIVED' : 'NOT_RECEIVED', receipt_progress: { remaining_qty: po.id === 'po-2' ? 0 : 1 } }));
  service.hydratePODrawingSelections = (po) => po;
  service.withPoAmountCalculation = (po) => po;
  service.getReceiptAwarePoStatus = po => po.status;
  service.resolvePoPaymentTermsDisplay = () => '';
  return { service, rows };
}

describe('PO register server search and Excel parity', () => {
  const terms = ['po-2026-0521', 'mAcFoS', 'pr-special-24', 'sas-zx521', 'brushless actuator', 'titanium angular housing'];
  it.each(terms)('searches %s across the complete register', async search => {
    const { service } = fixture(); const result = await service.findAll('t1', { search });
    expect(result.map(po => po.id)).toContain('po-520');
    expect(result.some(po => po.id === 'foreign')).toBe(false);
    expect(queries.filter(q => q.table === 'purchase_orders').some(q => q.offset >= 500)).toBe(true);
  });
  it('attaches PR references before matching', async () => {
    const { service } = fixture(); const result = await service.findAll('t1', { search: 'PR-SPECIAL-24' });
    expect(result.map(po => po.id)).toEqual(['po-520']); expect(result[0].pr.pr_number).toBe('PR-SPECIAL-24');
  });
  it('combines Open PO and search with the existing receipt/status rules', async () => {
    const { service } = fixture(); const result = await service.findAll('t1', { status: 'OPEN_PO', search: 'Macfos' });
    expect(result).toHaveLength(518); expect(result.every(po => po.open_po)).toBe(true);
    expect(result.some(po => ['po-0','po-1','po-2'].includes(po.id))).toBe(false);
  });
  it('combines supplier and item search', async () => {
    const { service } = fixture();
    expect(await service.findAll('t1', { vendorId: 'v2', search: 'SAS-ZX521' })).toEqual([]);
    expect((await service.findAll('t1', { vendorId: 'v1', search: 'SAS-ZX521' })).map(po => po.id)).toEqual(['po-520']);
  });
  it('combines normal status and PO search', async () => {
    const { service } = fixture();
    expect(await service.findAll('t1', { status: 'DRAFT', search: 'PO-2026-0521' })).toEqual([]);
    expect(await service.findAll('t1', { status: 'APPROVED', search: 'PO-2026-0521' })).toHaveLength(1);
  });
  it.each(terms)('exports exactly the server matches for %s with active filters', async search => {
    const { service } = fixture(); const filters = { search, vendorId: 'v1', status: 'OPEN_PO' };
    const expected = (await service.findAll('t1', filters)).map(po => po.po_number);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await service.exportRegister('t1', filters));
    const actual: any[] = []; workbook.worksheets[0].eachRow((row, index) => { if (index > 1) actual.push(row.getCell(2).value); });
    expect(actual).toEqual(expected); expect(actual).toContain('PO-2026-0521');
  });
  it('exports all matching pages rather than the visible ten rows', async () => {
    const { service } = fixture(); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await service.exportRegister('t1', { vendorId: 'v1', status: 'OPEN_PO', search: 'Macfos' }));
    expect(workbook.worksheets[0].rowCount - 1).toBe(518);
  });
});
