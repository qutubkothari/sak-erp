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
      console.log('[BomService] create - Components:', data.items.map((i: any) => `${i.componentType}:${i.itemId || i.childBomId}`));
      
      // Validate no circular references for child BOMs
      const childBomIds = data.items.filter((i: any) => i.componentType === 'BOM').map((i: any) => i.childBomId);
      for (const childId of childBomIds) {
        const hasCycle = await this.validateNoCycle(bom.id, childId);
        if (hasCycle) {
          throw new BadRequestException(`Circular BOM reference detected: Cannot add BOM as it would create a cycle`);
        }
      }
      
      const items = data.items.map((item: any, index: number) => ({
        bom_id: bom.id,
        item_id: item.componentType === 'ITEM' ? item.itemId : null,
        child_bom_id: item.componentType === 'BOM' ? item.childBomId : null,
        component_type: item.componentType || 'ITEM',
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
    if (bomItemsRes.data && bomItemsRes.data.length > 0) {
      bomItemsRes.data.slice(0, 25).forEach((item: any) => {
        console.log('[BomService] Raw bom_item snapshot', {
          id: item.id,
          bomId: item.bom_id,
          componentType: item.component_type,
          itemId: item.item_id,
          childBomId: item.child_bom_id,
        });
      });
    }

    // Fetch component items and child BOMs
    const componentItemIds = bomItemsRes.data?.filter((bi: any) => bi.component_type === 'ITEM').map((bi: any) => bi.item_id) || [];
    const childBomIds = bomItemsRes.data?.filter((bi: any) => bi.component_type === 'BOM').map((bi: any) => bi.child_bom_id) || [];
    console.log('[BomService] findAll - fetching component items for IDs:', componentItemIds);
    console.log('[BomService] findAll - fetching child BOMs for IDs:', childBomIds);
    
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

    // Fetch child BOMs
    let childBoms = [];
    if (childBomIds.length > 0) {
      const { data: boms, error: bomsError } = await this.supabase
        .from('bom_headers')
        .select('*')
        .in('id', childBomIds);
      
      if (bomsError) {
        console.error('[BomService] Child BOMs query error:', bomsError);
      } else {
        // Fetch items for child BOMs
        const childBomItemIds = boms?.map((b: any) => b.item_id) || [];
        if (childBomItemIds.length > 0) {
          const { data: childItems } = await this.supabase
            .from('items')
            .select('*')
            .in('id', childBomItemIds);
          
          const childItemsMap = new Map(childItems?.map((i: any) => [i.id, i]));
          childBoms = boms?.map((b: any) => ({
            ...b,
            item: childItemsMap.get(b.item_id)
          })) || [];
        }
        console.log('[BomService] Child BOMs found:', childBoms.length);
      }
    }

    // Create maps
    const mainItemsMap = new Map(itemsRes.data?.map((i: any) => [i.id, i]));
    const componentItemsMap = new Map(componentItems.map((i: any) => [i.id, i]));
    const childBomsMap = new Map(childBoms.map((b: any) => [b.id, b]));
    const bomItemsMap = new Map();
    
    // Group bom_items by bom_id and attach component item/BOM details
    bomItemsRes.data?.forEach((bi: any) => {
      if (!bomItemsMap.has(bi.bom_id)) {
        bomItemsMap.set(bi.bom_id, []);
      }
      if (bi.component_type === 'BOM') {
        const resolvedChild = childBomsMap.get(bi.child_bom_id);
        if (!resolvedChild) {
          console.warn('[BomService] Missing child BOM details for component', {
            bomId: bi.bom_id,
            childBomId: bi.child_bom_id,
          });
        }
        bomItemsMap.get(bi.bom_id).push({
          ...bi,
          child_bom: resolvedChild
        });
      } else {
        const resolvedItem = componentItemsMap.get(bi.item_id);
        if (!resolvedItem) {
          console.warn('[BomService] Missing component item details', {
            bomId: bi.bom_id,
            itemId: bi.item_id,
          });
        }
        bomItemsMap.get(bi.bom_id).push({
          ...bi,
          item: resolvedItem
        });
      }
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

    // Fetch items and child BOMs for bom_items
    const bomItemIds = bomItemsRes.data?.filter((bi: any) => bi.component_type === 'ITEM').map((bi: any) => bi.item_id) || [];
    const childBomIds = bomItemsRes.data?.filter((bi: any) => bi.component_type === 'BOM').map((bi: any) => bi.child_bom_id) || [];
    console.log('[BomService] findOne - Component item IDs:', bomItemIds);
    console.log('[BomService] findOne - Child BOM IDs:', childBomIds);
    
    // Fetch items
    let bomItems = [];
    if (bomItemIds.length > 0) {
      const { data: items, error: itemsError } = await this.supabase
        .from('items')
        .select('*')
        .in('id', bomItemIds);

      if (itemsError) {
        console.error('[BomService] findOne - Error fetching component items:', itemsError);
        throw new BadRequestException(itemsError.message);
      }
      bomItems = items || [];
    }

    // Fetch child BOMs
    let childBoms = [];
    if (childBomIds.length > 0) {
      const { data: boms, error: bomsError } = await this.supabase
        .from('bom_headers')
        .select('*')
        .in('id', childBomIds);

      if (bomsError) {
        console.error('[BomService] findOne - Error fetching child BOMs:', bomsError);
      } else {
        // Fetch items for child BOMs
        const childBomItemIds = boms?.map((b: any) => b.item_id) || [];
        if (childBomItemIds.length > 0) {
          const { data: childItems } = await this.supabase
            .from('items')
            .select('*')
            .in('id', childBomItemIds);
          
          const childItemsMap = new Map(childItems?.map((i: any) => [i.id, i]));
          childBoms = boms?.map((b: any) => ({
            ...b,
            item: childItemsMap.get(b.item_id)
          })) || [];
        }
      }
    }

    const itemsMap = new Map(bomItems.map((i: any) => [i.id, i]));
    const childBomsMap = new Map(childBoms.map((b: any) => [b.id, b]));
    console.log('[BomService] findOne - Items map size:', itemsMap.size);
    console.log('[BomService] findOne - Child BOMs map size:', childBomsMap.size);

    const result = {
      ...header,
      item: itemRes.data,
      bom_items: bomItemsRes.data?.map((bi: any) => {
        if (bi.component_type === 'BOM') {
          const childBom = childBomsMap.get(bi.child_bom_id);
          return {
            ...bi,
            child_bom: childBom
          };
        } else {
          const item = itemsMap.get(bi.item_id);
          return {
            ...bi,
            item
          };
        }
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
        // Validate no circular references for child BOMs
        const childBomIds = data.items.filter((i: any) => i.componentType === 'BOM').map((i: any) => i.childBomId);
        for (const childId of childBomIds) {
          const hasCycle = await this.validateNoCycle(id, childId);
          if (hasCycle) {
            throw new BadRequestException(`Circular BOM reference detected: Cannot add BOM as it would create a cycle`);
          }
        }

        const items = data.items.map((item: any, index: number) => ({
          bom_id: id,
          item_id: item.componentType === 'ITEM' ? item.itemId : null,
          child_bom_id: item.componentType === 'BOM' ? item.childBomId : null,
          component_type: item.componentType || 'ITEM',
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

    // First, explode BOM to get all actual items (handles nested BOMs)
    const explodedItems = await this.explodeBOMForPR(bomId, quantity);

    // Check stock availability for each exploded item
    const itemsToOrder = [];

    for (const explodedItem of explodedItems) {
      // Check current stock AND get reorder level
      const [stockRes, itemRes] = await Promise.all([
        this.supabase
          .from('stock_entries')
          .select('available_quantity')
          .eq('tenant_id', tenantId)
          .eq('item_id', explodedItem.itemId),
        this.supabase
          .from('items')
          .select('code, name, reorder_level')
          .eq('id', explodedItem.itemId)
          .single(),
      ]);

      const availableQty = stockRes.data?.reduce((sum, s) => sum + parseFloat(s.available_quantity.toString()), 0) || 0;
      const reorderLevel = itemRes.data?.reorder_level ? parseFloat(itemRes.data.reorder_level.toString()) : 0;
      
      // Calculate usable stock (available minus reorder level safety stock)
      const usableStock = Math.max(0, availableQty - reorderLevel);
      const shortfall = explodedItem.quantity - usableStock;

      console.log(`[BOM PR] Item ${explodedItem.itemId}: Required=${explodedItem.quantity}, Available=${availableQty}, ReorderLevel=${reorderLevel}, Usable=${usableStock}, Shortfall=${shortfall}`);

      if (shortfall > 0) {
        if (itemRes.data) {
          itemsToOrder.push({
            itemId: explodedItem.itemId,
            itemCode: itemRes.data.code,
            itemName: itemRes.data.name,
            quantity: Math.ceil(shortfall),
            specifications: explodedItem.notes,
            drawingUrl: explodedItem.drawingUrl,
          });
        }
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

  /**
   * Explode BOM recursively to get all actual items needed (for PR generation)
   */
  private async explodeBOMForPR(bomId: string, quantity: number): Promise<Array<{
    itemId: string;
    quantity: number;
    notes: string;
    drawingUrl: string;
  }>> {
    const { data: bomItems } = await this.supabase
      .from('bom_items')
      .select('component_type, item_id, child_bom_id, quantity, scrap_percentage, notes, drawing_url')
      .eq('bom_id', bomId);

    if (!bomItems || bomItems.length === 0) return [];

    const allItems: Map<string, { quantity: number; notes: string; drawingUrl: string }> = new Map();

    for (const bomItem of bomItems) {
      const scrapFactor = 1 + (bomItem.scrap_percentage || 0) / 100;
      const adjustedQty = bomItem.quantity * quantity * scrapFactor;

      if (bomItem.component_type === 'ITEM' && bomItem.item_id) {
        // Direct item
        const existing = allItems.get(bomItem.item_id);
        allItems.set(bomItem.item_id, {
          quantity: (existing?.quantity || 0) + adjustedQty,
          notes: bomItem.notes || existing?.notes || '',
          drawingUrl: bomItem.drawing_url || existing?.drawingUrl || '',
        });
      } else if (bomItem.component_type === 'BOM' && bomItem.child_bom_id) {
        // Recursively explode child BOM
        const childItems = await this.explodeBOMForPR(bomItem.child_bom_id, adjustedQty);
        childItems.forEach(childItem => {
          const existing = allItems.get(childItem.itemId);
          allItems.set(childItem.itemId, {
            quantity: (existing?.quantity || 0) + childItem.quantity,
            notes: childItem.notes || existing?.notes || '',
            drawingUrl: childItem.drawingUrl || existing?.drawingUrl || '',
          });
        });
      }
    }

    return Array.from(allItems.entries()).map(([itemId, details]) => ({
      itemId,
      quantity: details.quantity,
      notes: details.notes,
      drawingUrl: details.drawingUrl,
    }));
  }

  /**
   * Validate that adding childBomId to parentBomId won't create a circular reference
   * Uses DFS to check if childBomId already contains parentBomId in its hierarchy
   */
  private async validateNoCycle(parentBomId: string, childBomId: string): Promise<boolean> {
    const visited = new Set<string>();
    const stack = [childBomId];

    while (stack.length > 0) {
      const currentBomId = stack.pop()!;
      
      // If we've reached the parent, there's a cycle
      if (currentBomId === parentBomId) {
        return true;
      }

      // Skip if already visited
      if (visited.has(currentBomId)) {
        continue;
      }
      visited.add(currentBomId);

      // Get child BOMs of current BOM
      const { data: bomItems } = await this.supabase
        .from('bom_items')
        .select('child_bom_id')
        .eq('bom_id', currentBomId)
        .eq('component_type', 'BOM');

      if (bomItems && bomItems.length > 0) {
        bomItems.forEach((bi: any) => {
          if (bi.child_bom_id) {
            stack.push(bi.child_bom_id);
          }
        });
      }
    }

    return false;
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
