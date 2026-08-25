import { BadRequestException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

@Injectable()
export class KnowledgeGraphService {
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  private hash(value: any) { return createHash('sha256').update(String(value)).digest('hex'); }

  async refresh(tenantId: string) {
    const results = await Promise.all([
      this.db.from('mizantra_exception_register').select('*').eq('tenant_id', tenantId).limit(500),
      this.db.from('mizantra_operating_events').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1000),
      this.db.from('value_graph_edges').select('*').eq('tenant_id', tenantId).eq('status', 'APPROVED').limit(1000),
      this.db.from('vendors').select('id,code,name').eq('tenant_id', tenantId).limit(1000),
      this.db.from('customers').select('id,customer_code,customer_name').eq('tenant_id', tenantId).limit(1000),
      this.db.from('items').select('id,code,name').eq('tenant_id', tenantId).limit(2000),
      this.db.from('purchase_orders').select('id,po_number,vendor_id,status').eq('tenant_id', tenantId).limit(1000),
      this.db.from('grns').select('id,grn_number,po_id,vendor_id,status').eq('tenant_id', tenantId).limit(1000),
      this.db.from('production_job_orders').select('id,job_order_number,item_id,status').eq('tenant_id', tenantId).limit(1000),
      this.db.from('ncr').select('id,ncr_number,vendor_id,production_order_id,item_id,status,cost_impact').eq('tenant_id', tenantId).limit(1000),
      this.db.from('invoices').select('id,invoice_number,customer_id,sales_order_id,billing_status,balance_amount').eq('tenant_id', tenantId).limit(1000),
    ]);
    const [exceptions, events, valueEdges, vendors, customers, items, orders, receipts, jobs, ncrs, invoices] = results;
    const nodes = new Map<string, any>(), edges = new Map<string, any>(), now = new Date().toISOString();
    const node = (key: string, type: string, label: string, extra: any = {}) => nodes.set(key, { tenant_id: tenantId, node_key: key, node_type: type, label, source_table: extra.source_table || null, source_id: extra.source_id || null, route: extra.route || null, attributes: extra.attributes || {}, last_observed_at: now, updated_at: now });
    const edge = (from: string, to: string, relationship: string, evidence: any, confidence = 'HIGH') => { const key = this.hash(`${from}|${to}|${relationship}`); edges.set(key, { tenant_id: tenantId, edge_key: key, from_node_key: from, to_node_key: to, relationship_type: relationship, confidence, evidence, last_observed_at: now, updated_at: now }); };
    const rows = (result: any) => result?.error ? [] : result?.data || [];

    for (const item of rows(vendors)) node(`vendor:${item.id}`, 'SUPPLIER', item.name || item.code, { source_table: 'vendors', source_id: item.id, route: '/dashboard/purchase/vendors', attributes: { code: item.code } });
    for (const item of rows(customers)) node(`customer:${item.id}`, 'CUSTOMER', item.customer_name || item.customer_code, { source_table: 'customers', source_id: item.id, route: '/dashboard/sales', attributes: { code: item.customer_code } });
    for (const item of rows(items)) node(`item:${item.id}`, 'ITEM', item.name || item.code, { source_table: 'items', source_id: item.id, route: '/dashboard/inventory/items', attributes: { code: item.code } });
    for (const item of rows(orders)) { const key = `purchase_order:${item.id}`; node(key, 'PURCHASE_ORDER', item.po_number || item.id, { source_table: 'purchase_orders', source_id: item.id, route: '/dashboard/purchase/orders', attributes: { status: item.status } }); if (item.vendor_id) edge(key, `vendor:${item.vendor_id}`, 'ORDERED_FROM', { purchase_order_id: item.id }); }
    for (const item of rows(receipts)) { const key = `grn:${item.id}`; node(key, 'GOODS_RECEIPT', item.grn_number || item.id, { source_table: 'grns', source_id: item.id, route: '/dashboard/purchase/grn', attributes: { status: item.status } }); if (item.po_id) edge(key, `purchase_order:${item.po_id}`, 'RECEIVED_AGAINST', { grn_id: item.id }); if (item.vendor_id) edge(key, `vendor:${item.vendor_id}`, 'RECEIVED_FROM', { grn_id: item.id }); }
    for (const item of rows(jobs)) { const key = `job_order:${item.id}`; node(key, 'WORK_ORDER', item.job_order_number || item.id, { source_table: 'production_job_orders', source_id: item.id, route: '/dashboard/production/job-orders', attributes: { status: item.status } }); if (item.item_id) edge(key, `item:${item.item_id}`, 'PRODUCES', { job_order_id: item.id }); }
    for (const item of rows(ncrs)) { const key = `ncr:${item.id}`; node(key, 'QUALITY_CASE', item.ncr_number || item.id, { source_table: 'ncr', source_id: item.id, route: '/dashboard/quality', attributes: { status: item.status, cost_impact: item.cost_impact } }); if (item.vendor_id) edge(key, `vendor:${item.vendor_id}`, 'CONCERNS_SUPPLIER', { ncr_id: item.id }); if (item.production_order_id) edge(key, `job_order:${item.production_order_id}`, 'CONCERNS_WORK_ORDER', { ncr_id: item.id }); if (item.item_id) edge(key, `item:${item.item_id}`, 'CONCERNS_ITEM', { ncr_id: item.id }); }
    for (const item of rows(invoices)) { const key = `invoice:${item.id}`; node(key, 'SALES_INVOICE', item.invoice_number || item.id, { source_table: 'invoices', source_id: item.id, route: '/dashboard/accounts/collections', attributes: { status: item.billing_status, balance_amount: item.balance_amount } }); if (item.customer_id) edge(key, `customer:${item.customer_id}`, 'BILLED_TO', { invoice_id: item.id }); }
    for (const item of rows(exceptions)) { const key = `exception:${item.id}`, domain = `domain:${item.source_type || 'ERP'}`; node(key, 'EXCEPTION', item.title, { source_table: 'mizantra_exception_register', source_id: item.id, route: item.source_route, attributes: { status: item.status, severity: item.severity, priority_score: item.priority_score } }); node(domain, 'DOMAIN', item.source_type || 'ERP'); edge(key, domain, 'OBSERVED_IN', { source: 'exception_register' }); }
    for (const item of rows(events)) { const key = `event:${item.id}`; node(key, 'EVENT', item.title, { source_table: 'mizantra_operating_events', source_id: item.id, route: item.route, attributes: { event_type: item.event_type, severity: item.severity, occurred_at: item.created_at } }); if (item.source_type && item.source_id) { const source = `source:${item.source_type}:${item.source_id}`; node(source, 'SOURCE_RECORD', `${item.source_type} ${item.source_id}`, { source_table: item.source_type, source_id: item.source_id, route: item.route }); edge(key, source, 'EVIDENCED_BY', { source_event_id: item.id }); } if (item.correlation_id) { const match = rows(exceptions).find((candidate: any) => candidate.source_key === item.correlation_id); if (match) edge(key, `exception:${match.id}`, 'CORRELATED_WITH', { correlation_id: item.correlation_id }); } }
    for (const item of rows(valueEdges)) { const from = `value:${item.from_type}:${item.from_id}`, to = `value:${item.to_type}:${item.to_id}`; node(from, 'VALUE_NODE', `${item.from_type} ${item.from_id}`, { source_id: item.from_id }); node(to, 'VALUE_NODE', `${item.to_type} ${item.to_id}`, { source_id: item.to_id }); edge(from, to, item.relationship_type, { value_graph_edge_id: item.id, rationale: item.rationale, allocation_pct: item.allocation_pct }); }

    if (nodes.size) { const { error } = await this.db.from('mizantra_knowledge_nodes').upsert(Array.from(nodes.values()), { onConflict: 'tenant_id,node_key' }); if (error) throw new BadRequestException(error.message); }
    if (edges.size) { const { error } = await this.db.from('mizantra_knowledge_edges').upsert(Array.from(edges.values()), { onConflict: 'tenant_id,edge_key' }); if (error) throw new BadRequestException(error.message); }
    return { nodes_upserted: nodes.size, edges_upserted: edges.size, source_adapters: { available: results.slice(3).filter((result: any) => !result.error).length, attempted: results.length - 3 }, methodology: 'Master, purchasing, receipt, production, quality, customer, invoice, exception, event and finance-approved value relationships use explicit record identifiers only.' };
  }

  async graph(tenantId: string, limit = 500) {
    const bounded = Math.min(Math.max(Number(limit) || 500, 10), 2000);
    const [nodes, edges] = await Promise.all([this.db.from('mizantra_knowledge_nodes').select('*').eq('tenant_id', tenantId).order('last_observed_at', { ascending: false }).limit(bounded), this.db.from('mizantra_knowledge_edges').select('*').eq('tenant_id', tenantId).order('last_observed_at', { ascending: false }).limit(bounded * 2)]);
    if (nodes.error || edges.error) throw new BadRequestException((nodes.error || edges.error)?.message);
    return { nodes: nodes.data || [], edges: edges.data || [], coverage: { nodes: (nodes.data || []).length, edges: (edges.data || []).length }, bounded: true, methodology: 'Only explicit source identifiers, exact correlations and approved value links are represented. Similarity is never promoted to causation automatically.' };
  }

  async path(tenantId: string, from: string, to: string) {
    if (!from || !to) throw new BadRequestException('Both graph node keys are required.');
    const graph = await this.graph(tenantId, 2000), queue: Array<[string, string[]]> = [[from, [from]]], seen = new Set([from]);
    while (queue.length) { const [current, path] = queue.shift()!; if (current === to) return { found: true, path }; for (const item of graph.edges.filter((edge: any) => edge.from_node_key === current || edge.to_node_key === current)) { const next = item.from_node_key === current ? item.to_node_key : item.from_node_key; if (!seen.has(next)) { seen.add(next); queue.push([next, [...path, next]]); } } }
    return { found: false, path: [], note: 'No explicit evidence path exists between these nodes.' };
  }
}
