import { BadRequestException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class MrpService {
  private readonly supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  async latest(tenantId: string) {
    const { data: run, error } = await this.supabase.from('mrp_planning_runs').select('*').eq('tenant_id', tenantId).order('run_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!run) return { run: null, lines: [] };
    const { data: lines, error: lineError } = await this.supabase.from('mrp_planning_lines').select('*').eq('tenant_id', tenantId).eq('run_id', run.id).order('net_requirement', { ascending: false });
    if (lineError) throw new BadRequestException(lineError.message);
    return { run, lines: lines || [] };
  }

  async run(tenantId: string, userId?: string) {
    const { data: orders, error: orderError } = await this.supabase
      .from('production_job_orders').select('id,job_order_number,status,start_date,due_date')
      .eq('tenant_id', tenantId).in('status', ['DRAFT', 'PENDING', 'RELEASED', 'IN_PROGRESS']);
    if (orderError) throw new BadRequestException(orderError.message);
    const safeOrders = orders || [];
    const ids = safeOrders.map((order: any) => String(order.id));
    const materials = ids.length ? (await this.supabase.from('job_order_materials').select('job_order_id,item_id,selected_variant_id,item_code,item_name,required_quantity,issued_quantity').in('job_order_id', ids)).data || [] : [];
    const itemIds = Array.from(new Set(materials.map((m: any) => String(m.selected_variant_id || m.item_id || '')).filter(Boolean)));
    const [entriesResult, inventoryResult, itemResult, bomResult] = await Promise.all([
      itemIds.length ? this.supabase.from('stock_entries').select('item_id,available_quantity').eq('tenant_id', tenantId).in('item_id', itemIds).gt('available_quantity', 0) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? this.supabase.from('inventory_stock').select('item_id,available_quantity').eq('tenant_id', tenantId).in('item_id', itemIds) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? this.supabase.from('items').select('id,code,name').eq('tenant_id', tenantId).in('id', itemIds) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? this.supabase.from('bom_headers').select('item_id').eq('tenant_id', tenantId).eq('is_active', true).in('item_id', itemIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const quantityByItem = (rows: any[]) => rows.reduce((map, row) => map.set(String(row.item_id), (map.get(String(row.item_id)) || 0) + Number(row.available_quantity || 0)), new Map<string, number>());
    const entryQty = quantityByItem(entriesResult.data || []); const inventoryQty = quantityByItem(inventoryResult.data || []);
    const itemById = new Map((itemResult.data || []).map((item: any) => [String(item.id), item]));
    const buildable = new Set((bomResult.data || []).map((bom: any) => String(bom.item_id)));
    const orderById = new Map(safeOrders.map((order: any) => [String(order.id), order]));
    const aggregate = new Map<string, any>();
    for (const material of materials as any[]) {
      const itemId = String(material.selected_variant_id || material.item_id || ''); if (!itemId) continue;
      const existing = aggregate.get(itemId) || { item_id: itemId, gross_requirement: 0, issued_quantity: 0, demand_references: [] };
      existing.gross_requirement += Number(material.required_quantity || 0);
      existing.issued_quantity += Number(material.issued_quantity || 0);
      const order = orderById.get(String(material.job_order_id));
      if (order) existing.demand_references.push({ job_order_id: order.id, job_order_number: order.job_order_number, status: order.status, due_date: order.due_date || order.start_date || null });
      aggregate.set(itemId, existing);
    }
    const lines = Array.from(aggregate.values()).map((line) => {
      const available = Math.max(entryQty.get(line.item_id) || 0, inventoryQty.get(line.item_id) || 0);
      const gross = Number(line.gross_requirement.toFixed(4)); const issued = Number(line.issued_quantity.toFixed(4));
      const net = Number(Math.max(0, gross - issued - available).toFixed(4)); const item = itemById.get(line.item_id);
      return { tenant_id: tenantId, item_id: line.item_id, item_code: item?.code || null, item_name: item?.name || null, gross_requirement: gross, issued_quantity: issued, available_quantity: Number(available.toFixed(4)), net_requirement: net, supply_action: net > 0 ? (buildable.has(line.item_id) ? 'BUILD' : 'BUY') : 'MONITOR', demand_references: line.demand_references };
    });
    const { data: run, error: runError } = await this.supabase.from('mrp_planning_runs').insert({ tenant_id: tenantId, created_by: userId || null, demand_orders: safeOrders.length, material_lines: lines.length, shortage_lines: lines.filter((line) => line.net_requirement > 0).length }).select().single();
    if (runError || !run) throw new BadRequestException(runError?.message || 'Unable to save the MRP run.');
    if (lines.length) { const { error: lineError } = await this.supabase.from('mrp_planning_lines').insert(lines.map((line) => ({ ...line, run_id: run.id }))); if (lineError) throw new BadRequestException(lineError.message); }
    return this.latest(tenantId);
  }
}
