import { allocatePoSettlement } from './po-settlement';

describe('allocatePoSettlement', () => {
  it('leaves the invoice due when there is no settlement', () => {
    const result = allocatePoSettlement([{ id: '1', netPayable: 700000 }], 0);
    expect(result.outstanding).toBe(700000);
    expect(result.invoices[0].paymentStatus).toBe('UNPAID');
  });

  it('subtracts a partial PO advance from total invoiced value', () => {
    const result = allocatePoSettlement([
      { id: '1', date: '2026-05-13', netPayable: 562669 },
      { id: '2', date: '2026-06-22', netPayable: 210783.4 },
    ], 400000);
    expect(result.invoiced).toBe(773452.4);
    expect(result.advanceApplied).toBe(400000);
    expect(result.outstanding).toBe(373452.4);
  });

  it('fully settles an invoice covered by an advance', () => {
    const result = allocatePoSettlement([{ id: '1', netPayable: 300000 }], 400000);
    expect(result.outstanding).toBe(0);
    expect(result.advanceAvailable).toBe(100000);
    expect(result.invoices[0].paymentStatus).toBe('PAID');
  });

  it('does not reuse one advance across multiple invoices', () => {
    const result = allocatePoSettlement([
      { id: '1', date: '2026-01-01', netPayable: 300000 },
      { id: '2', date: '2026-02-01', netPayable: 300000 },
    ], 400000);
    expect(result.invoices[0].advanceApplied).toBe(300000);
    expect(result.invoices[1].advanceApplied).toBe(100000);
    expect(result.outstanding).toBe(200000);
  });

  it('uses multiple advances as one finite PO pool', () => {
    const result = allocatePoSettlement([
      { id: '1', netPayable: 500000 },
      { id: '2', netPayable: 500000 },
    ], 650000);
    expect(result.advanceApplied).toBe(650000);
    expect(result.outstanding).toBe(350000);
  });

  it('combines cash and advance without double counting', () => {
    const result = allocatePoSettlement([{ id: '1', netPayable: 700000, cashPaid: 200000 }], 400000);
    expect(result.totalSettled).toBe(600000);
    expect(result.outstanding).toBe(100000);
  });

  it('includes TDS and approved short payment in settlement', () => {
    const result = allocatePoSettlement([
      { id: '1', netPayable: 700000, cashPaid: 200000, tds: 20000, shortPayment: 10000 },
    ], 400000);
    expect(result.totalSettled).toBe(630000);
    expect(result.outstanding).toBe(70000);
  });

  it('retains excess advance as available instead of producing negative dues', () => {
    const result = allocatePoSettlement([{ id: '1', netPayable: 100000 }], 250000);
    expect(result.advanceApplied).toBe(100000);
    expect(result.advanceAvailable).toBe(150000);
    expect(result.outstanding).toBe(0);
  });

  it('allocates by invoice date even when input order differs', () => {
    const result = allocatePoSettlement([
      { id: 'new', date: '2026-02-01', netPayable: 300000 },
      { id: 'old', date: '2026-01-01', netPayable: 300000 },
    ], 300000);
    expect(result.invoices.find((invoice) => invoice.id === 'old')?.advanceApplied).toBe(300000);
    expect(result.invoices.find((invoice) => invoice.id === 'new')?.advanceApplied).toBe(0);
  });
});
