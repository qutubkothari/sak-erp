import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ItemsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  private normalizeNumber(value: any, type: 'int' | 'float' = 'float') {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = type === 'int'
      ? parseInt(value, 10)
      : parseFloat(value);

    return Number.isNaN(parsed) ? null : parsed;
  }

  async findAll(tenantId: string, search?: string, includeInactive?: boolean) {
    console.log('[ItemsService] findAll called:', { tenantId, search, includeInactive });
    
    let query = this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    // Only filter by is_active if we're not including inactive items
    if (!includeInactive) {
      console.log('[ItemsService] Filtering for active items only');
      query = query.eq('is_active', true);
    } else {
      console.log('[ItemsService] Including inactive items');
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ItemsService] Query error:', error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    console.log('[ItemsService] Query successful:', { count: data?.length || 0 });
    return data || [];
  }

  async search(tenantId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    const { data, error } = await this.supabase
      .from('items')
      .select('id, code, name, description, uom, category')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(20)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  async create(tenantId: string, itemData: any) {
    // Validate HSN code if provided
    let validatedHsn = null;
    if (itemData.hsnCode || itemData.hsn_code) {
      const hsnStr = String(itemData.hsnCode || itemData.hsn_code).trim();
      if (/^\d{4}$|^\d{6}$|^\d{8}$/.test(hsnStr)) {
        validatedHsn = hsnStr;
      }
    }

    const standardCost = this.normalizeNumber(itemData.standard_cost ?? itemData.standardCost);
    const sellingPrice = this.normalizeNumber(itemData.selling_price ?? itemData.sellingPrice);
    const reorderLevel = this.normalizeNumber(itemData.reorder_level ?? itemData.reorderLevel, 'int');
    const reorderQuantity = this.normalizeNumber(itemData.reorder_quantity ?? itemData.reorderQuantity, 'int');
    const leadTimeDays = this.normalizeNumber(itemData.lead_time_days ?? itemData.leadTimeDays, 'int');

    const { data, error } = await this.supabase
      .from('items')
      .insert({
        tenant_id: tenantId,
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        uom: itemData.uom,
        reorder_level: reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: standardCost,
        selling_price: sellingPrice,
        reorder_quantity: reorderQuantity,
        lead_time_days: leadTimeDays,
        hsn_code: validatedHsn,
        is_active: true,
        metadata: itemData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create item: ${error.message}`);
    }

    return data;
  }

  async bulkCreate(tenantId: string, items: any[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Map category names from user's format to database format
    const categoryMap: any = {
      'Services': 'SERVICE',
      'Injection Moulding': 'COMPONENT',
      'Machining': 'COMPONENT',
      'Raw Material': 'RAW_MATERIAL',
      'Products': 'FINISHED_GOODS',
      'Sub Assemblies': 'SUBASSEMBLY',
      'Consumables': 'CONSUMABLE',
      'Packing Material': 'PACKING_MATERIAL',
      'Spare Parts': 'SPARE_PART',
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Map Excel column names to database fields - support multiple formats
        const rawCode = item['Item Code'] || item.code || item.Code || item.CODE || item['Item code'] || item['item code'];
        const rawName = item['Item Name'] || item.name || item.Name || item.NAME || item['Item name'] || item['item name'];
        const rawCategory = item['Item Group'] || item.category || item.Category || item.CATEGORY || item['Item group'] || item['item group'];
        const rawUom = item['Default Unit of Measure'] || item.uom || item.UOM || item.unit || item.Unit || item['Unit of Measure'];
        const rawHsn = item['HSN/SAC'] || item.hsn || item.HSN || item.hsn_code || item['HSN Code'];

        // Validate HSN code (must be 4, 6, or 8 digits)
        let validatedHsn = null;
        if (rawHsn) {
          const hsnStr = String(rawHsn).trim();
          if (/^\d{4}$|^\d{6}$|^\d{8}$/.test(hsnStr)) {
            validatedHsn = hsnStr;
          } else {
            console.warn(`Invalid HSN code for row ${i + 1}: ${hsnStr}. Must be 4, 6, or 8 digits.`);
          }
        }

        // Map category to database format
        let mappedCategory = categoryMap[rawCategory] || rawCategory || 'RAW_MATERIAL';
        // If still not a valid category, default to RAW_MATERIAL
        if (!['RAW_MATERIAL', 'COMPONENT', 'SUBASSEMBLY', 'FINISHED_GOODS', 'CONSUMABLE', 'PACKING_MATERIAL', 'SPARE_PART', 'SERVICE'].includes(mappedCategory)) {
          mappedCategory = 'RAW_MATERIAL';
        }

        const itemData = {
          code: rawCode,
          name: rawName || rawCode, // Use code as name if name is not provided
          description: item.description || item.Description || item.DESCRIPTION || '',
          category: mappedCategory,
          uom: rawUom || 'PCS',
          standard_cost: parseFloat(item.standard_cost || item.StandardCost || item.cost || item.Cost || 0),
          selling_price: parseFloat(item.selling_price || item.SellingPrice || item.price || item.Price || 0),
          reorder_level: parseInt(item.reorder_level || item.ReorderLevel || item.min_qty || 0),
          reorder_quantity: parseInt(item.reorder_quantity || item.ReorderQuantity || item.order_qty || 0),
          lead_time_days: parseInt(item.lead_time_days || item.LeadTimeDays || item.lead_time || 0),
        };

        const { error } = await this.supabase
          .from('items')
          .insert({
            tenant_id: tenantId,
            code: itemData.code,
            name: itemData.name,
            description: itemData.description,
            category: itemData.category,
            uom: itemData.uom,
            standard_cost: itemData.standard_cost,
            selling_price: itemData.selling_price,
            reorder_level: itemData.reorder_level,
            reorder_quantity: itemData.reorder_quantity,
            lead_time_days: itemData.lead_time_days,
            hsn_code: validatedHsn,
            is_active: true,
            metadata: {
              item_group: rawCategory || null,
            },
          });

        if (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            item: itemData.name || itemData.code,
            error: error.message,
          });
        } else {
          results.success++;
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          item: item.name || item.code || 'Unknown',
          error: err.message,
        });
      }
    }

    return results;
  }

  async update(tenantId: string, id: string, itemData: any) {
    // Validate HSN code if provided
    let validatedHsn = null;
    if (itemData.hsnCode || itemData.hsn_code) {
      const hsnStr = String(itemData.hsnCode || itemData.hsn_code).trim();
      if (/^\d{4}$|^\d{6}$|^\d{8}$/.test(hsnStr)) {
        validatedHsn = hsnStr;
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (itemData.code !== undefined) updateData.code = itemData.code;
    if (itemData.name !== undefined) updateData.name = itemData.name;
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.category !== undefined) updateData.category = itemData.category;
    if (itemData.uom !== undefined) updateData.uom = itemData.uom;
    const standardCostProvided = itemData.standard_cost !== undefined || itemData.standardCost !== undefined;
    const sellingPriceProvided = itemData.selling_price !== undefined || itemData.sellingPrice !== undefined;
    const reorderLevelProvided = itemData.reorder_level !== undefined || itemData.reorderLevel !== undefined;
    const reorderQtyProvided = itemData.reorder_quantity !== undefined || itemData.reorderQuantity !== undefined;
    const leadTimeProvided = itemData.lead_time_days !== undefined || itemData.leadTimeDays !== undefined;

    if (standardCostProvided) {
      updateData.standard_cost = this.normalizeNumber(
        itemData.standard_cost ?? itemData.standardCost,
      );
    }

    if (sellingPriceProvided) {
      updateData.selling_price = this.normalizeNumber(
        itemData.selling_price ?? itemData.sellingPrice,
      );
    }

    if (reorderLevelProvided) {
      updateData.reorder_level = this.normalizeNumber(
        itemData.reorder_level ?? itemData.reorderLevel,
        'int',
      );
    }

    if (reorderQtyProvided) {
      updateData.reorder_quantity = this.normalizeNumber(
        itemData.reorder_quantity ?? itemData.reorderQuantity,
        'int',
      );
    }

    if (leadTimeProvided) {
      updateData.lead_time_days = this.normalizeNumber(
        itemData.lead_time_days ?? itemData.leadTimeDays,
        'int',
      );
    }

    if (itemData.minStock !== undefined) updateData.min_stock = itemData.minStock;
    if (itemData.maxStock !== undefined) updateData.max_stock = itemData.maxStock;
    if (itemData.metadata !== undefined) updateData.metadata = itemData.metadata;
    if (validatedHsn !== null) updateData.hsn_code = validatedHsn;
    if (itemData.is_active !== undefined) updateData.is_active = itemData.is_active;

    const { data, error } = await this.supabase
      .from('items')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async delete(tenantId: string, id: string) {
    // Soft delete
    const { error } = await this.supabase
      .from('items')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }

    return { message: 'Item deleted successfully' };
  }

  // Drawing/Document Management
  async getDrawings(tenantId: string, itemId: string) {
    const { data, error } = await this.supabase
      .from('item_drawings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch drawings: ${error.message}`);
    }

    return data || [];
  }

  async uploadDrawing(tenantId: string, userId: string, itemId: string, drawingData: any) {
    // Get current max version for this item
    const { data: existingDrawings } = await this.supabase
      .from('item_drawings')
      .select('version')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingDrawings && existingDrawings.length > 0
      ? existingDrawings[0].version + 1
      : 1;

    const { data, error } = await this.supabase
      .from('item_drawings')
      .insert({
        tenant_id: tenantId,
        item_id: itemId,
        file_name: drawingData.fileName,
        file_url: drawingData.fileUrl,
        file_type: drawingData.fileType,
        file_size: drawingData.fileSize,
        version: nextVersion,
        revision_notes: drawingData.revisionNotes,
        is_active: true,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upload drawing: ${error.message}`);
    }

    return data;
  }

  async updateDrawing(tenantId: string, itemId: string, drawingId: string, drawingData: any) {
    const { data, error } = await this.supabase
      .from('item_drawings')
      .update({
        revision_notes: drawingData.revisionNotes,
        is_active: drawingData.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('id', drawingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update drawing: ${error.message}`);
    }

    return data;
  }

  async deleteDrawing(tenantId: string, itemId: string, drawingId: string) {
    const { error } = await this.supabase
      .from('item_drawings')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('id', drawingId);

    if (error) {
      throw new Error(`Failed to delete drawing: ${error.message}`);
    }

    return { message: 'Drawing deleted successfully' };
  }
}
