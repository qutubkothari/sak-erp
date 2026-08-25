import { BadRequestException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AccountingService } from '../accounting/accounting.service';
import { createHash } from 'crypto';

@Injectable()
export class CostingService {
  private readonly supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  constructor(private readonly accounting: AccountingService) {}

  async standardMargin(tenantId: string) {
    const { data: invoices, error: invoiceError } = await this.supabase.from('invoices').select('id,invoice_number,invoice_date,billing_status').eq('tenant_id', tenantId).neq('billing_status', 'CANCELLED');
    if (invoiceError) throw new BadRequestException(invoiceError.message);
    const safeInvoices = invoices || []; const ids = safeInvoices.map((invoice: any) => String(invoice.id));
    if (!ids.length) return { revenue: 0, standard_cost: 0, gross_margin: 0, gross_margin_percent: 0, lines: [], disclaimer: 'Standard-cost view: it does not post or replace actual COGS.' };
    const { data: invoiceLines, error: lineError } = await this.supabase.from('sales_invoice_items').select('invoice_id,item_id,item_description,quantity,taxable_amount,unit_price').in('invoice_id', ids);
    if (lineError) throw new BadRequestException(lineError.message);
    const lines = invoiceLines || []; const itemIds = Array.from(new Set(lines.map((line: any) => String(line.item_id || '')).filter(Boolean)));
    const { data: items, error: itemError } = itemIds.length ? await this.supabase.from('items').select('id,code,name,standard_cost').eq('tenant_id', tenantId).in('id', itemIds) : { data: [], error: null };
    if (itemError) throw new BadRequestException(itemError.message);
    const itemById = new Map((items || []).map((item: any) => [String(item.id), item])); const aggregate = new Map<string, any>();
    for (const line of lines as any[]) {
      const key = String(line.item_id || ''); const item = itemById.get(key); const quantity = Number(line.quantity || 0); const revenue = Number(line.taxable_amount ?? quantity * Number(line.unit_price || 0)); const cost = quantity * Number(item?.standard_cost || 0);
      const existing = aggregate.get(key) || { item_id: key, item_code: item?.code || null, item_name: item?.name || line.item_description || 'Unmapped item', quantity: 0, revenue: 0, standard_cost: 0 };
      existing.quantity += quantity; existing.revenue += revenue; existing.standard_cost += cost; aggregate.set(key, existing);
    }
    const resultLines = Array.from(aggregate.values()).map((line) => ({ ...line, revenue: Number(line.revenue.toFixed(2)), standard_cost: Number(line.standard_cost.toFixed(2)), gross_margin: Number((line.revenue - line.standard_cost).toFixed(2)), gross_margin_percent: line.revenue ? Number((((line.revenue - line.standard_cost) / line.revenue) * 100).toFixed(2)) : 0 })).sort((a, b) => a.gross_margin_percent - b.gross_margin_percent);
    const revenue = resultLines.reduce((sum, line) => sum + line.revenue, 0); const standardCost = resultLines.reduce((sum, line) => sum + line.standard_cost, 0); const grossMargin = revenue - standardCost;
    return { revenue: Number(revenue.toFixed(2)), standard_cost: Number(standardCost.toFixed(2)), gross_margin: Number(grossMargin.toFixed(2)), gross_margin_percent: revenue ? Number(((grossMargin / revenue) * 100).toFixed(2)) : 0, lines: resultLines, disclaimer: 'Standard-cost view: it does not post or replace actual COGS.' };
  }

  async fifoCogs(tenantId: string) {
    const { data, error } = await this.supabase.from('inventory_cost_events').select('id,reference_number,item_id,quantity,unit_cost,total_cost,event_at').eq('tenant_id', tenantId).eq('event_type', 'SALES_ISSUE').order('event_at', { ascending: false }).limit(200);
    if (error) throw new BadRequestException(error.message);
    const events = await this.attachItems(tenantId, data || []);
    return { total_cogs: Number(events.reduce((sum: number, event: any) => sum + Number(event.total_cost || 0), 0).toFixed(2)), event_count: events.length, events, disclaimer: 'FIFO cost events are recorded from new dispatches onward. GL entries are not created automatically.' };
  }

  async fifoCoverage(tenantId: string) {
    const { data, error } = await this.supabase
      .from('inventory_cost_events')
      .select('event_type,quantity,total_cost')
      .eq('tenant_id', tenantId)
      .in('event_type', ['PURCHASE_RECEIPT', 'SALES_ISSUE']);
    if (error) throw new BadRequestException(error.message);
    const events = data || [];
    const receipts = events.filter((event: any) => event.event_type === 'PURCHASE_RECEIPT');
    const issues = events.filter((event: any) => event.event_type === 'SALES_ISSUE');
    const sum = (rows: any[], field: string) => Number(rows.reduce((total, row) => total + Number(row[field] || 0), 0).toFixed(2));
    return {
      receipt_event_count: receipts.length,
      receipt_quantity: sum(receipts, 'quantity'),
      receipt_cost: sum(receipts, 'total_cost'),
      issue_event_count: issues.length,
      issue_quantity: sum(issues, 'quantity'),
      issue_cost: sum(issues, 'total_cost'),
      disclaimer: 'Coverage begins when FIFO receipt evidence is enabled. It is an operational reconciliation indicator, not an inventory valuation or GL balance.',
    };
  }

  async inventoryEvents(tenantId: string) {
    const { data, error } = await this.supabase.from('inventory_cost_events').select('id,event_type,item_id,reference_number,quantity,unit_cost,total_cost,event_at').eq('tenant_id', tenantId).order('event_at', { ascending: false }).limit(200);
    if (error) throw new BadRequestException(error.message);
    const events = await this.attachItems(tenantId, data || []); const ids = events.map((row: any) => row.id); let postings: any[] = [];
    if (ids.length) { const result = await this.supabase.from('accounting_source_postings').select('source_id,status,journal:accounting_journals(id,journal_number,status)').eq('tenant_id', tenantId).in('source_id', ids); if (result.error) throw new BadRequestException(result.error.message); postings = result.data || []; }
    const byId = new Map(postings.map((row: any) => [String(row.source_id), row]));
    return events.map((row: any) => ({ ...row, posting: byId.get(String(row.id)) || null }));
  }

  private async attachItems(tenantId: string, rows: any[]) {
    const itemIds = [...new Set(rows.map((row: any) => String(row.item_id || '')).filter(Boolean))]; if (!itemIds.length) return rows;
    const { data, error } = await this.supabase.from('items').select('id,code,name').eq('tenant_id', tenantId).in('id', itemIds); if (error) throw new BadRequestException(error.message);
    const items = new Map((data || []).map((item: any) => [String(item.id), item])); return rows.map((row: any) => ({ ...row, items: items.get(String(row.item_id)) || null }));
  }

  async createCogsDraft(tenantId: string, userId: string, id: string) {
    const { data: event, error } = await this.supabase.from('inventory_cost_events').select('*').eq('tenant_id', tenantId).eq('id', id).eq('event_type', 'SALES_ISSUE').maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!event) throw new BadRequestException('FIFO COGS event not found.');
    return this.accounting.queueAutomaticOperationalPosting(tenantId, userId, { source_type: 'STOCK_ISSUE', source_id: event.id, source_number: event.reference_number, amount: Number(event.total_cost || 0), journal_date: String(event.event_at || new Date().toISOString()).slice(0, 10), narration: `FIFO COGS for dispatch ${event.reference_number || event.id}` });
  }

  async createEventDraft(tenantId: string, userId: string, id: string) {
    const { data: event, error } = await this.supabase.from('inventory_cost_events').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!event) throw new BadRequestException('Inventory cost event not found.');
    const receipts = ['PURCHASE_RECEIPT', 'PRODUCTION_RECEIPT', 'SALES_RETURN'];
    const issues = ['SALES_ISSUE', 'PRODUCTION_ISSUE'];
    if (!receipts.includes(event.event_type) && !issues.includes(event.event_type)) throw new BadRequestException('This event type requires a manual inventory-adjustment review.');
    const sourceType = receipts.includes(event.event_type) ? 'STOCK_RECEIPT' : 'STOCK_ISSUE';
    return this.accounting.queueAutomaticOperationalPosting(tenantId, userId, { source_type: sourceType, source_id: event.id, source_number: event.reference_number, amount: Number(event.total_cost || 0), journal_date: String(event.event_at || new Date().toISOString()).slice(0, 10), narration: `${event.event_type.replaceAll('_', ' ')} FIFO valuation for ${event.reference_number || event.id}` });
  }

  async listValuationRuns(tenantId: string) {
    const { data, error } = await this.supabase.from('inventory_valuation_runs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  private direction(eventType: string) {
    return ['PURCHASE_RECEIPT', 'PRODUCTION_RECEIPT', 'SALES_RETURN'].includes(eventType) ? 1 : ['SALES_ISSUE', 'PRODUCTION_ISSUE'].includes(eventType) ? -1 : 0;
  }

  async createValuationRun(tenantId: string, userId: string, body: any) {
    const start = String(body.period_start || '').slice(0, 10); const end = String(body.period_end || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) throw new BadRequestException('Enter a valid valuation period.');
    const { data: allEvents, error } = await this.supabase.from('inventory_cost_events').select('id,event_type,item_id,quantity,unit_cost,total_cost,reference_number,event_at').eq('tenant_id', tenantId).lte('event_at', `${end}T23:59:59.999Z`).order('event_at');
    if (error) throw new BadRequestException(error.message);
    const relevant = (allEvents || []).filter((row: any) => this.direction(row.event_type));
    const before = relevant.filter((row: any) => String(row.event_at).slice(0, 10) < start);
    const period = relevant.filter((row: any) => String(row.event_at).slice(0, 10) >= start);
    const sum = (rows: any[], sign?: number) => Number(rows.reduce((total, row) => total + Number(row.total_cost || 0) * (sign ?? this.direction(row.event_type)), 0).toFixed(4));
    const opening = sum(before); const receipts = period.filter((row: any) => this.direction(row.event_type) === 1); const issues = period.filter((row: any) => this.direction(row.event_type) === -1);
    const receiptValue = sum(receipts, 1); const issueValue = sum(issues, 1); const closing = Number((opening + receiptValue - issueValue).toFixed(4));
    const ids = period.map((row: any) => row.id); let postings: any[] = [];
    if (ids.length) { const result = await this.supabase.from('accounting_source_postings').select('source_id,amount,status,journal:accounting_journals(id,journal_number,status)').eq('tenant_id', tenantId).in('source_id', ids); if (result.error) throw new BadRequestException(result.error.message); postings = result.data || []; }
    const postingByEvent = new Map(postings.map((row: any) => [String(row.source_id), row]));
    const posted = (rows: any[]) => Number(rows.reduce((total, row) => { const link: any = postingByEvent.get(String(row.id)); return total + (link?.journal?.status === 'POSTED' ? Number(link.amount || 0) : 0); }, 0).toFixed(4));
    const postedReceipts = posted(receipts); const postedIssues = posted(issues); const movementVariance = Number(((receiptValue - issueValue) - (postedReceipts - postedIssues)).toFixed(4));
    const exceptions = period.filter((row: any) => Number(row.unit_cost || 0) <= 0 || Number(row.total_cost || 0) <= 0 || postingByEvent.get(String(row.id))?.journal?.status !== 'POSTED');
    const evidence = { generated_at: new Date().toISOString(), period_events: period.map((row: any) => ({ ...row, posting: postingByEvent.get(String(row.id)) || null })), exception_event_ids: exceptions.map((row: any) => row.id) };
    const evidenceHash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
    const payload = { tenant_id: tenantId, run_code: String(body.run_code || `INV-${end}-${Date.now()}`).trim(), period_start: start, period_end: end, currency_code: 'AED', opening_value: opening, receipt_value: receiptValue, issue_value: issueValue, closing_value: closing, posted_receipt_value: postedReceipts, posted_issue_value: postedIssues, movement_variance: movementVariance, event_count: period.length, exception_count: exceptions.length, evidence, evidence_hash: evidenceHash, prepared_by: userId };
    const { data, error: insertError } = await this.supabase.from('inventory_valuation_runs').insert(payload).select().single();
    if (insertError || !data) throw new BadRequestException(insertError?.code === '23505' ? 'Valuation run code already exists.' : insertError?.message || 'Valuation run could not be created.');
    return data;
  }

  async certifyValuationRun(tenantId: string, userId: string, id: string, body: any) {
    const { data: run, error } = await this.supabase.from('inventory_valuation_runs').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (error) throw new BadRequestException(error.message); if (!run) throw new BadRequestException('Valuation run not found.');
    if (run.status === 'CERTIFIED') return run;
    if (String(run.prepared_by || '') === String(userId || '')) throw new BadRequestException('An independent finance user must certify the valuation.');
    if (Number(run.exception_count) || Math.abs(Number(run.movement_variance)) > 0.005) throw new BadRequestException('Resolve all missing/zero-cost postings and movement variance before certification.');
    const note = String(body.certification_note || '').trim(); if (note.length < 10) throw new BadRequestException('Enter a meaningful finance certification note.');
    const { data, error: updateError } = await this.supabase.from('inventory_valuation_runs').update({ status: 'CERTIFIED', certified_by: userId, certified_at: new Date().toISOString(), certification_note: note }).eq('tenant_id', tenantId).eq('id', id).eq('status', 'DRAFT').select().single();
    if (updateError) throw new BadRequestException(updateError.message); return data;
  }
}
