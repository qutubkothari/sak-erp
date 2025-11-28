import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class BomService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async create(tenantId: string, data: any) {
    const { data: bom, error } = await this.supabase
      .from('bom_headers')
      .insert({
        tenant_id: tenantId,
        item_id: data.itemId,
        version: data.version || 1,
        is_active: true,
        effective_from: data.effectiveFrom || new Date().toISOString(),
        effective_to: data.effectiveTo,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert BOM items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any, index: number) => ({
        bom_id: bom.id,
        item_id: item.itemId,
        quantity: item.quantity,
        scrap_percentage: item.scrapPercentage || 0,
        sequence: item.sequence || index + 1,
        notes: item.notes,
        drawing_url: item.drawingUrl, // Drawing attachment URL
      }));

      const { error: itemsError } = await this.supabase
        .from('bom_items')
        .insert(items);

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    return this.findOne(tenantId, bom.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false});

    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('BOM not found');
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('bom_headers')
      .update({
        effective_from: data.effectiveFrom,
        effective_to: data.effectiveTo,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Update items if provided
    if (data.items) {
      await this.supabase
        .from('bom_items')
        .delete()
        .eq('bom_id', id);

      if (data.items.length > 0) {
        const items = data.items.map((item: any, index: number) => ({
          bom_id: id,
          item_id: item.itemId,
          quantity: item.quantity,
          scrap_percentage: item.scrapPercentage || 0,
          sequence: item.sequence || index + 1,
          notes: item.notes,
          drawing_url: item.drawingUrl,
        }));

        await this.supabase
          .from('bom_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async generatePurchaseRequisition(tenantId: string, userId: string, bomId: string, quantity: number) {
    // Get BOM with all items
    const bom = await this.findOne(tenantId, bomId);

    if (!bom.bom_items || bom.bom_items.length === 0) {
      throw new BadRequestException('BOM has no items');
    }

    // Check stock availability for each item
    const itemsToOrder = [];

    for (const bomItem of bom.bom_items) {
      const requiredQty = bomItem.quantity * quantity * (1 + (bomItem.scrap_percentage || 0) / 100);

      // Check current stock
      const { data: stock } = await this.supabase
        .from('stock_entries')
        .select('available_quantity')
        .eq('tenant_id', tenantId)
        .eq('item_id', bomItem.item_id);

      const availableQty = stock?.reduce((sum, s) => sum + s.available_quantity, 0) || 0;
      const shortfall = requiredQty - availableQty;

      if (shortfall > 0) {
        itemsToOrder.push({
          itemId: bomItem.item_id,
          itemCode: bomItem.item.code,
          itemName: bomItem.item.name,
          quantity: Math.ceil(shortfall),
          specifications: bomItem.notes,
          drawingUrl: bomItem.drawing_url, // Include drawing for PR
        });
      }
    }

    if (itemsToOrder.length === 0) {
      return { message: 'All items are in stock', itemsToOrder: [] };
    }

    // Create Purchase Requisition
    const prData = {
      department: 'PRODUCTION',
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      priority: 'MEDIUM',
      notes: `Auto-generated from BOM ${bom.item.code} - ${bom.item.name} (Qty: ${quantity})`,
      items: itemsToOrder.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        specifications: item.specifications,
        drawingUrl: item.drawingUrl,
      })),
    };

    // Call PR service to create
    const { data: pr, error } = await this.supabase
      .from('purchase_requisitions')
      .insert({
        tenant_id: tenantId,
        pr_number: await this.generatePRNumber(tenantId),
        department: prData.department,
        requested_by: userId,
        required_date: prData.requiredDate,
        status: 'DRAFT',
        priority: prData.priority,
        notes: prData.notes,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert PR items
    const prItems = prData.items.map((item: any) => ({
      pr_id: pr.id,
      item_id: item.itemId,
      quantity: item.quantity,
      specifications: item.specifications,
      notes: `Drawing: ${item.drawingUrl || 'Not attached'}`,
    }));

    await this.supabase
      .from('purchase_requisition_items')
      .insert(prItems);

    return {
      message: 'Purchase Requisition generated from BOM',
      prNumber: pr.pr_number,
      prId: pr.id,
      itemsToOrder,
    };
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('bom_headers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'BOM deleted successfully' };
  }

  private async generatePRNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PR-${year}-${month}`;

    const { data } = await this.supabase
      .from('purchase_requisitions')
      .select('pr_number')
      .eq('tenant_id', tenantId)
      .like('pr_number', `${prefix}%`)
      .order('pr_number', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(data.pr_number.split('-').pop() || '0');
    return `${prefix}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
}
