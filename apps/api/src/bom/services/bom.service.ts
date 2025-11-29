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
    console.log('[BomService] create - Input data:', JSON.stringify(data, null, 2));
    
    // Check for duplicate BOM (same item + version)
    const { data: existingBom, error: checkError } = await this.supabase
      .from('bom_headers')
      .select('id, version')
      .eq('tenant_id', tenantId)
      .eq('item_id', data.itemId)
      .eq('version', data.version || 1)
      .maybeSingle();

    if (checkError) {
      console.error('[BomService] create - Error checking for duplicates:', checkError);
    }

    if (existingBom) {
      throw new BadRequestException(
        `A BOM already exists for this item with version ${data.version || 1}. Please use a different version number or update the existing BOM.`
      );
    }
    
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
    console.log('[BomService] create - BOM header created:', bom.id);

    // Insert BOM items
    if (data.items && data.items.length > 0) {
      console.log('[BomService] create - Component item IDs:', data.items.map((i: any) => i.itemId));
      
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
    // Fetch BOM headers
    let query = this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false});

    if (filters?.itemId || filters?.productId) {
      query = query.eq('item_id', filters.itemId || filters.productId);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data: headers, error } = await query;
    if (error) throw new BadRequestException(error.message);
    
    if (!headers || headers.length === 0) return [];

    // Fetch all related items and bom_items in parallel
    const itemIds = headers.map((h: any) => h.item_id);
    const bomIds = headers.map((h: any) => h.id);

    console.log('[BomService] findAll - fetching main items for IDs:', itemIds);
    console.log('[BomService] findAll - fetching bom_items for BOM IDs:', bomIds);

    const [itemsRes, bomItemsRes] = await Promise.all([
      this.supabase.from('items').select('*').in('id', itemIds),
      this.supabase.from('bom_items').select('*').in('bom_id', bomIds)
    ]);

    if (itemsRes.error) {
      console.error('[BomService] Items query error:', itemsRes.error);
      throw new BadRequestException(itemsRes.error.message);
    }
    if (bomItemsRes.error) {
      console.error('[BomService] BOM items query error:', bomItemsRes.error);
      throw new BadRequestException(bomItemsRes.error.message);
    }

    console.log('[BomService] Main items found:', itemsRes.data?.length);
    console.log('[BomService] BOM items found:', bomItemsRes.data?.length);

    // Fetch component items (items referenced by bom_items)
    const componentItemIds = bomItemsRes.data?.map((bi: any) => bi.item_id) || [];
    console.log('[BomService] findAll - fetching component items for IDs:', componentItemIds);
    
    let componentItems = [];
    if (componentItemIds.length > 0) {
      const { data: compItems, error: compError } = await this.supabase
        .from('items')
        .select('*')
        .in('id', componentItemIds);
      
      if (compError) {
        console.error('[BomService] Component items query error:', compError);
      } else {
        componentItems = compItems || [];
        console.log('[BomService] Component items found:', componentItems.length);
      }
    }

    // Create maps
    const mainItemsMap = new Map(itemsRes.data?.map((i: any) => [i.id, i]));
    const componentItemsMap = new Map(componentItems.map((i: any) => [i.id, i]));
    const bomItemsMap = new Map();
    
    // Group bom_items by bom_id and attach component item details
    bomItemsRes.data?.forEach((bi: any) => {
      if (!bomItemsMap.has(bi.bom_id)) {
        bomItemsMap.set(bi.bom_id, []);
      }
      bomItemsMap.get(bi.bom_id).push({
        ...bi,
        item: componentItemsMap.get(bi.item_id)
      });
    });

    // Combine everything
    return headers.map((h: any) => ({
      ...h,
      item: mainItemsMap.get(h.item_id),
      bom_items: bomItemsMap.get(h.id) || []
    }));
  }

  async findOne(tenantId: string, id: string) {
    // Fetch BOM header
    const { data: header, error } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('BOM not found');

    // Fetch item and bom_items
    const [itemRes, bomItemsRes] = await Promise.all([
      this.supabase.from('items').select('*').eq('id', header.item_id).single(),
      this.supabase.from('bom_items').select('*').eq('bom_id', id)
    ]);

    if (itemRes.error) throw new BadRequestException(itemRes.error.message);
    if (bomItemsRes.error) throw new BadRequestException(bomItemsRes.error.message);

    // Fetch items for bom_items
    const bomItemIds = bomItemsRes.data?.map((bi: any) => bi.item_id) || [];
    console.log('[BomService] findOne - Component item IDs:', bomItemIds);
    
    const { data: bomItems, error: bomItemsItemsError } = await this.supabase
      .from('items')
      .select('*')
      .in('id', bomItemIds);

    console.log('[BomService] findOne - Fetched component items:', bomItems?.length || 0);
    if (bomItemsItemsError) {
      console.error('[BomService] findOne - Error fetching component items:', bomItemsItemsError);
      throw new BadRequestException(bomItemsItemsError.message);
    }

    const itemsMap = new Map(bomItems?.map((i: any) => [i.id, i]));
    console.log('[BomService] findOne - Items map size:', itemsMap.size);

    const result = {
      ...header,
      item: itemRes.data,
      bom_items: bomItemsRes.data?.map((bi: any) => {
        const item = itemsMap.get(bi.item_id);
        console.log('[BomService] findOne - Mapping bom_item:', bi.item_id, 'Found:', !!item);
        return {
          ...bi,
          item
        };
      }) || []
    };

    console.log('[BomService] findOne - Final result bom_items count:', result.bom_items.length);
    return result;
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
      purpose: `Manufacturing ${bom.item.code} - ${bom.item.name}`,
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      remarks: `Auto-generated from BOM for production quantity: ${quantity}`,
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
        request_date: new Date().toISOString().split('T')[0],
        department: prData.department,
        purpose: prData.purpose,
        requested_by: userId,
        required_date: prData.requiredDate,
        status: 'DRAFT',
        remarks: prData.remarks,
      })
      .select()
      .single();

    if (error) {
      console.error('[BomService] PR creation error:', error);
      throw new BadRequestException(error.message);
    }

    // Insert PR items with proper field names for purchase_requisition_items table
    const prItems = itemsToOrder.map((item: any) => ({
      pr_id: pr.id,
      item_code: item.itemCode,
      item_name: item.itemName,
      description: item.specifications || '',
      uom: 'Nos', // Default UOM, could be fetched from item
      requested_qty: item.quantity,
      estimated_rate: 0,
      required_date: prData.requiredDate,
      remarks: `BOM: ${bom.item.code} (Qty: ${quantity}). Drawing: ${item.drawingUrl || 'Not attached'}`,
    }));

    const { error: itemsError } = await this.supabase
      .from('purchase_requisition_items')
      .insert(prItems);

    if (itemsError) {
      console.error('[BomService] PR items creation error:', itemsError);
      throw new BadRequestException(itemsError.message);
    }

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
