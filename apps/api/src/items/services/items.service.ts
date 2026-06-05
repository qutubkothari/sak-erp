import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { toTitleCase, toUpperCode } from '../../common/utils/data-quality';
import { normalizeInventoryCategory } from '../../inventory/utils/inventory-category';

function mapDeleteAuditError(error: any, resourceLabel: string): string {
  const details = String(error?.details || '');
  const message = String(error?.message || '');

  if (
    error?.code === '23502' &&
    (message.includes('activity_logs') || details.includes('activity_logs')) &&
    (message.includes('user_id') || details.includes('user_id'))
  ) {
    return `Failed to delete ${resourceLabel}: database delete audit is misconfigured. Apply fix-delete-audit-trigger.sql and retry.`;
  }

  return `Failed to delete ${resourceLabel}: ${message || 'Unknown error'}`;
}

@Injectable()
export class ItemsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  private isUuid(value: any): boolean {
    if (typeof value !== 'string') return false;
    // UUID v1-v5
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }

  private normalizeNumber(value: any, type: 'int' | 'float' = 'float') {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const raw = typeof value === 'string' ? value.trim() : String(value);
    // Handle common Excel formats: commas, currency symbols, spaces
    const cleaned = raw
      .replace(/,/g, '')
      .replace(/[^0-9.\-]/g, '');

    if (!cleaned) {
      return null;
    }

    const parsed = type === 'int' ? parseInt(cleaned, 10) : parseFloat(cleaned);

    return Number.isNaN(parsed) ? null : parsed;
  }

  private normalizeOptionalText(value: any): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  private async getLedgerStockTotals(tenantId: string, itemIds: string[]) {
    const itemIdSet = new Set(itemIds);
    const totals: Record<string, number> = {};

    for (const itemId of itemIds) {
      totals[itemId] = 0;
    }

    const { data: stockEntries } = await this.supabase
      .from('stock_entries')
      .select('item_id, quantity, metadata, warehouse_id')
      .eq('tenant_id', tenantId);

    const grnEntryMap = new Map<string, number>();
    for (const entry of stockEntries || []) {
      const itemId = (entry as any).item_id;
      if (!itemIdSet.has(itemId)) continue;

      const grnRef = (entry as any).metadata?.grn_reference || (entry as any).metadata?.grn_number;
      if (!grnRef) continue;

      const dedupKey = `${itemId}::${grnRef}::${(entry as any).warehouse_id || ''}`;
      grnEntryMap.set(dedupKey, (grnEntryMap.get(dedupKey) || 0) + (Number((entry as any).quantity) || 0));
    }

    for (const [key, qty] of grnEntryMap.entries()) {
      const itemId = key.split('::')[0];
      totals[itemId] = (totals[itemId] || 0) + qty;
    }

    const { data: movements } = await this.supabase
      .from('stock_movements')
      .select('item_id, quantity, from_warehouse_id, to_warehouse_id')
      .eq('tenant_id', tenantId);

    for (const movement of movements || []) {
      const itemId = (movement as any).item_id;
      if (!itemIdSet.has(itemId)) continue;

      const qty = Number((movement as any).quantity) || 0;
      const isInbound = !(movement as any).from_warehouse_id && !!(movement as any).to_warehouse_id;
      const isOutbound = !!(movement as any).from_warehouse_id && !(movement as any).to_warehouse_id;

      if (isInbound) totals[itemId] = (totals[itemId] || 0) + qty;
      if (isOutbound) totals[itemId] = (totals[itemId] || 0) - qty;
    }

    return totals;
  }

  private normalizeAndValidateHsn(value: any, options: { required: boolean }): string | null {
    if (value === undefined || value === null || value === '') {
      if (options.required) {
        throw new BadRequestException('HSN code is required');
      }
      return null;
    }

    const hsnStr = String(value).trim();
    if (!/^\d{4}$|^\d{6}$|^\d{8}$/.test(hsnStr)) {
      throw new BadRequestException('Invalid HSN code. Must be 4, 6, or 8 digits.');
    }

    return hsnStr;
  }

  private normalizeUidFields(itemData: any): {
    uid_tracking?: boolean;
    uid_strategy?: 'SERIALIZED' | 'BATCHED' | 'NONE';
    batch_uom?: string | null;
    batch_quantity?: number | null;
  } {
    const rawUidTracking = itemData.uid_tracking ?? itemData.uidTracking;
    const rawUidStrategy = itemData.uid_strategy ?? itemData.uidStrategy;
    const rawBatchUom = itemData.batch_uom ?? itemData.batchUom;
    const rawBatchQuantity = itemData.batch_quantity ?? itemData.batchQuantity;

    const anyProvided =
      rawUidTracking !== undefined ||
      rawUidStrategy !== undefined ||
      rawBatchUom !== undefined ||
      rawBatchQuantity !== undefined;

    if (!anyProvided) {
      return {};
    }

    // If tracking is explicitly disabled, force NONE strategy.
    if (rawUidTracking === false) {
      return {
        uid_tracking: false,
        uid_strategy: 'NONE',
        batch_uom: null,
        batch_quantity: null,
      };
    }

    const strategy = (rawUidStrategy || 'SERIALIZED') as string;
    if (strategy !== 'SERIALIZED' && strategy !== 'BATCHED' && strategy !== 'NONE') {
      throw new BadRequestException('Invalid UID strategy. Must be SERIALIZED, BATCHED, or NONE.');
    }

    if (strategy === 'NONE') {
      return {
        uid_tracking: false,
        uid_strategy: 'NONE',
        batch_uom: null,
        batch_quantity: null,
      };
    }

    if (strategy === 'BATCHED') {
      const batchUom = rawBatchUom ? String(rawBatchUom).trim() : '';
      const batchQty = this.normalizeNumber(rawBatchQuantity);

      if (!batchUom) {
        throw new BadRequestException('For BATCHED UID strategy, batch_uom is required.');
      }
      if (!batchQty || batchQty <= 0) {
        throw new BadRequestException('For BATCHED UID strategy, batch_quantity must be > 0.');
      }

      return {
        uid_tracking: true,
        uid_strategy: 'BATCHED',
        batch_uom: batchUom,
        batch_quantity: batchQty,
      };
    }

    // SERIALIZED
    return {
      uid_tracking: true,
      uid_strategy: 'SERIALIZED',
      batch_uom: null,
      batch_quantity: null,
    };
  }

  async findAll(tenantId: string, search?: string, includeInactive?: boolean, onlyVerified?: boolean) {
    let query = this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    // Only filter by is_active if we're not including inactive items
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (onlyVerified) {
      query = query.eq('is_verified', true);
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,oem_part_no.ilike.%${search}%,description.ilike.%${search}%`);
    }

    let { data, error } = await query;

    // Fallback: retry without is_verified filter if column doesn't exist
    if (error && error.message.includes('is_verified')) {
      let retryQuery = this.supabase
        .from('items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (!includeInactive) retryQuery = retryQuery.eq('is_active', true);
      if (search) retryQuery = retryQuery.or(`code.ilike.%${search}%,name.ilike.%${search}%,oem_part_no.ilike.%${search}%,description.ilike.%${search}%`);
      const { data: retryData, error: retryError } = await retryQuery;
      data = retryData;
      error = retryError;
    }

    if (error) {
      console.error('[ItemsService] Query error:', error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }
    
    // Stock Master must read from inventory_stock because stock adjustments
    // update that aggregate table directly.
    if (data && data.length > 0) {
      const itemIds = data.map((item: any) => item.id).filter(Boolean);
      const stockTotals = await this.getLedgerStockTotals(tenantId, itemIds);

      // Add total_stock to each item
      return data.map(item => ({
        ...item,
        total_stock: stockTotals[item.id] || 0
      }));
    }

    return data || [];
  }

  async search(tenantId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    const { data, error } = await this.supabase
      .from('items')
      .select('id, code, name, description, oem_part_no, uom, category, standard_cost, selling_price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_verified', true)
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,oem_part_no.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
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
    console.log('[ItemsService.create] Creating item with data:', JSON.stringify(itemData, null, 2));
    
    // HSN is required unless this is a variant (variants can inherit empty HSN)
    const isVariant = itemData.is_variant === true;
    console.log('[ItemsService.create] Is variant:', isVariant);
    
    const validatedHsn = this.normalizeAndValidateHsn(
      itemData.hsnCode ?? itemData.hsn_code,
      { required: !isVariant },
    );
    console.log('[ItemsService.create] Validated HSN:', validatedHsn);

    const uidFields = this.normalizeUidFields(itemData);

    const drawingRequired = itemData.drawing_required ?? itemData.drawingRequired;
    if (
      drawingRequired !== undefined &&
      drawingRequired !== 'OPTIONAL' &&
      drawingRequired !== 'COMPULSORY' &&
      drawingRequired !== 'NOT_REQUIRED'
    ) {
      throw new BadRequestException('Invalid drawing_required. Must be OPTIONAL, COMPULSORY, or NOT_REQUIRED.');
    }

    // If drawing is COMPULSORY, check that at least one active drawing exists
    // Note: For create, this validation happens after item creation (user must upload drawing immediately after)
    // For edit changing to COMPULSORY, we validate here

    const standardCost = this.normalizeNumber(itemData.standard_cost ?? itemData.standardCost);
    const reorderLevel = this.normalizeNumber(itemData.reorder_level ?? itemData.reorderLevel, 'int');
    const reorderQuantity = this.normalizeNumber(itemData.reorder_quantity ?? itemData.reorderQuantity, 'int');
    const leadTimeDays = this.normalizeNumber(itemData.lead_time_days ?? itemData.leadTimeDays, 'int');
    const oemPartNo = this.normalizeOptionalText(
      itemData.oem_part_no ?? itemData.oemPartNo ?? itemData.oem_part_number ?? itemData.oemPartNumber,
    );
    const oemName = this.normalizeOptionalText(
      itemData.oem_name ?? itemData.oemName,
    );
    const purchaseCurrency = (itemData.purchase_currency ?? 'INR').toString().toUpperCase().trim() || 'INR';
    const foreignUnitPrice = this.normalizeNumber(itemData.foreign_unit_price ?? itemData.foreignUnitPrice);

    // Validate reorder level only for stock-tracked categories.
    // (SERVICE is excluded because services do not maintain inventory stock.)
    const category = normalizeInventoryCategory(itemData.category);
    const requiresReorderLevel =
      category === 'RAW_MATERIAL' ||
      category === 'CAPITAL_GOODS' ||
      category === 'CONSUMABLE' ||
      category === 'PACKING_MATERIAL';
    if (requiresReorderLevel) {
      if (!reorderLevel || reorderLevel <= 0) {
        throw new BadRequestException(
          'Reorder level must be greater than 0 for RAW_MATERIAL, CAPITAL_GOODS, CONSUMABLE, and PACKING_MATERIAL items.',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('items')
      .insert({
        tenant_id: tenantId,
        code: toUpperCode(itemData.code),
        name: itemData.name,
        oem_part_no: oemPartNo,
        oem_name: oemName,
        description: toTitleCase(itemData.description),
        category,
        product_category: toTitleCase(itemData.product_category ?? itemData.productCategory ?? '') || null,
        uom: toUpperCode(itemData.uom),
        reorder_level: reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: standardCost,
        selling_price: null,
        reorder_quantity: reorderQuantity,
        lead_time_days: leadTimeDays,
        hsn_code: validatedHsn,
        drawing_required: drawingRequired,
        item_type: itemData.item_type || 'RAW_MATERIAL',
        parent_item_id: itemData.parent_item_id || null,
        is_variant: itemData.is_variant || false,
        is_default_variant: itemData.is_default_variant || false,
        variant_name: itemData.variant_name || null,
        ...uidFields,
        purchase_currency: purchaseCurrency,
        foreign_unit_price: purchaseCurrency === 'INR' ? null : foreignUnitPrice,
        is_active: true,
        is_verified: true,
        metadata: itemData.metadata || {},
      })
      .select()
      .single();

    console.log('[ItemsService.create] Database result:', { data, error });

    if (error) {
      console.error('[ItemsService.create] Database error:', error);
      
      // Check for duplicate key constraint violation
      if (error.code === '23505' && error.message.includes('items_code_key')) {
        throw new BadRequestException(`Item with code '${itemData.code}' already exists`);
      }
      
      throw new BadRequestException(`Failed to create item: ${error.message}`);
    }

    console.log('[ItemsService.create] Successfully created item:', data?.id);
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
      'Services': 'SERVICES',
      'Service': 'SERVICES',
      'Injection Moulding': 'RAW_MATERIAL',
      'Machining': 'RAW_MATERIAL',
      'Raw Material': 'RAW_MATERIAL',
      'Products': 'RAW_MATERIAL',
      'Sub Assemblies': 'RAW_MATERIAL',
      'Consumables': 'CONSUMABLE',
      'Packing Material': 'PACKING_MATERIAL',
      'Spare Parts': 'CONSUMABLE',
      'Capital Goods': 'CAPITAL_GOODS',
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Map Excel column names to database fields - support multiple formats
        const rawCode = item['SAS Part Number'] || item['SAS Part No'] || item['SAS Part No.'] || item['Item Code'] || item.code || item.Code || item.CODE || item['Item code'] || item['item code'];
        const rawName = item['Item Name'] || item.name || item.Name || item.NAME || item['Item name'] || item['item name'];
        const rawCategory = item['Item Group'] || item.category || item.Category || item.CATEGORY || item['Item group'] || item['item group'];
        const rawUom = item['Default Unit of Measure'] || item.uom || item.UOM || item.unit || item.Unit || item['Unit of Measure'];
        const rawHsn = item['HSN/SAC'] || item.hsn || item.HSN || item.hsn_code || item['HSN Code'];
        const rawOemPartNo = item['OEM Part No'] || item['OEM Part No.'] || item['OEM Part Number'] || item.oem_part_no || item.oemPartNo || item.OEM;

        const rawStandardCost =
          item.standard_cost ||
          item.StandardCost ||
          item['Standard Cost'] ||
          item['Standard cost'] ||
          item.cost ||
          item.Cost ||
          item['Unit Cost'] ||
          item['Unit cost'] ||
          item['Rate'] ||
          item.rate;

        const validatedHsn = this.normalizeAndValidateHsn(rawHsn, { required: true });

        // Map category to database format
        const mappedCategory = normalizeInventoryCategory(categoryMap[rawCategory] || rawCategory || 'RAW_MATERIAL');

        const itemData = {
          code: rawCode,
          name: rawName || rawCode, // Use code as name if name is not provided
          oem_part_no: this.normalizeOptionalText(rawOemPartNo),
          description: item.description || item.Description || item.DESCRIPTION || '',
          category: mappedCategory,
          uom: rawUom || 'PCS',
          standard_cost: this.normalizeNumber(rawStandardCost),
          selling_price: null,
          reorder_level: this.normalizeNumber(item.reorder_level || item.ReorderLevel || item['Reorder Level'] || item['Reorder level'] || item.min_qty, 'int'),
          reorder_quantity: this.normalizeNumber(item.reorder_quantity || item.ReorderQuantity || item['Reorder Quantity'] || item['Reorder quantity'] || item.order_qty, 'int'),
          lead_time_days: this.normalizeNumber(item.lead_time_days || item.LeadTimeDays || item['Lead Time'] || item['Lead time'] || item.lead_time, 'int'),
        };

        const rowData: any = {
            tenant_id: tenantId,
            code: toUpperCode(itemData.code),
            name: itemData.name,
            oem_part_no: itemData.oem_part_no,
            description: toTitleCase(itemData.description),
            category: itemData.category,
            uom: toUpperCode(itemData.uom),
            standard_cost: itemData.standard_cost,
            selling_price: itemData.selling_price,
            reorder_level: itemData.reorder_level,
            reorder_quantity: itemData.reorder_quantity,
            lead_time_days: itemData.lead_time_days,
            hsn_code: validatedHsn,
            is_active: true,
            is_verified: false,
            metadata: {
              item_group: rawCategory || null,
            },
          };

        const { error } = await this.supabase
          .from('items')
          .upsert(rowData, { onConflict: 'tenant_id,code', ignoreDuplicates: false });

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

  async update(tenantId: string, id: string, itemData: any, userId?: string) {
    const hsnProvided = itemData.hsnCode !== undefined || itemData.hsn_code !== undefined;
    const validatedHsn = hsnProvided
      ? this.normalizeAndValidateHsn(itemData.hsnCode ?? itemData.hsn_code, { required: true })
      : null;

    const updateData: any = {
      updated_at: new Date().toISOString(),
      ...(userId ? { updated_by: userId } : {}),
    };

    // Only update fields that are provided
    if (itemData.code !== undefined) updateData.code = toUpperCode(itemData.code);
    if (itemData.name !== undefined) updateData.name = itemData.name;
    if (
      itemData.oem_part_no !== undefined ||
      itemData.oemPartNo !== undefined ||
      itemData.oem_part_number !== undefined ||
      itemData.oemPartNumber !== undefined
    ) {
      updateData.oem_part_no = this.normalizeOptionalText(
        itemData.oem_part_no ?? itemData.oemPartNo ?? itemData.oem_part_number ?? itemData.oemPartNumber,
      );
    }
    if (itemData.oem_name !== undefined || itemData.oemName !== undefined) {
      updateData.oem_name = this.normalizeOptionalText(
        itemData.oem_name ?? itemData.oemName,
      );
    }
    if (itemData.description !== undefined) updateData.description = toTitleCase(itemData.description);
    if (itemData.category !== undefined) updateData.category = normalizeInventoryCategory(itemData.category);
    if (itemData.product_category !== undefined || itemData.productCategory !== undefined) {
      updateData.product_category = toTitleCase(itemData.product_category ?? itemData.productCategory ?? '') || null;
    }
    if (itemData.uom !== undefined) updateData.uom = toUpperCode(itemData.uom);
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
      updateData.selling_price = null;
    }

    if (reorderLevelProvided) {
      updateData.reorder_level = this.normalizeNumber(
        itemData.reorder_level ?? itemData.reorderLevel,
        'int',
      );
    }

    // Validate reorder level only for stock-tracked categories.
    // (SERVICE is excluded because services do not maintain inventory stock.)
    const category = itemData.category !== undefined
      ? normalizeInventoryCategory(itemData.category)
      : normalizeInventoryCategory((await this.findOne(tenantId, id)).category);
    const requiresReorderLevel =
      category === 'RAW_MATERIAL' ||
      category === 'CAPITAL_GOODS' ||
      category === 'CONSUMABLE' ||
      category === 'PACKING_MATERIAL';
    if (requiresReorderLevel && reorderLevelProvided) {
      if (!updateData.reorder_level || updateData.reorder_level <= 0) {
        throw new BadRequestException(
          'Reorder level must be greater than 0 for RAW_MATERIAL, CAPITAL_GOODS, CONSUMABLE, and PACKING_MATERIAL items.',
        );
      }
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

    // Foreign currency fields
    if (itemData.purchase_currency !== undefined || itemData.purchaseCurrency !== undefined) {
      const currency = (itemData.purchase_currency ?? itemData.purchaseCurrency ?? 'INR').toString().toUpperCase().trim() || 'INR';
      updateData.purchase_currency = currency;
      if (currency === 'INR') {
        updateData.foreign_unit_price = null;
      }
    }
    if (itemData.foreign_unit_price !== undefined || itemData.foreignUnitPrice !== undefined) {
      updateData.foreign_unit_price = this.normalizeNumber(itemData.foreign_unit_price ?? itemData.foreignUnitPrice);
    }

    // Variant fields
    if (itemData.parent_item_id !== undefined) updateData.parent_item_id = itemData.parent_item_id || null;
    if (itemData.is_variant !== undefined) updateData.is_variant = itemData.is_variant;
    if (itemData.is_default_variant !== undefined) updateData.is_default_variant = itemData.is_default_variant;
    if (itemData.variant_name !== undefined) updateData.variant_name = itemData.variant_name || null;
    if (itemData.item_type !== undefined) updateData.item_type = itemData.item_type || 'RAW_MATERIAL';

    const drawingRequired = itemData.drawing_required ?? itemData.drawingRequired;
    if (drawingRequired !== undefined) {
      if (
        drawingRequired !== 'OPTIONAL' &&
        drawingRequired !== 'COMPULSORY' &&
        drawingRequired !== 'NOT_REQUIRED'
      ) {
        throw new BadRequestException('Invalid drawing_required. Must be OPTIONAL, COMPULSORY, or NOT_REQUIRED.');
      }
      
      // If changing to COMPULSORY, verify at least one active drawing exists
      if (drawingRequired === 'COMPULSORY') {
        const { data: activeDrawings, error: drawingError } = await this.supabase
          .from('item_drawings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('item_id', id)
          .eq('is_active', true)
          .limit(1);
        
        if (drawingError) {
          throw new BadRequestException(`Failed to check drawing status: ${drawingError.message}`);
        }
        
        if (!activeDrawings || activeDrawings.length === 0) {
          throw new BadRequestException(
            'Cannot set drawing as COMPULSORY. Please upload at least one drawing first.'
          );
        }
      }
      
      updateData.drawing_required = drawingRequired;
    }

    const uidFields = this.normalizeUidFields(itemData);
    Object.assign(updateData, uidFields);

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

  async setVerification(tenantId: string, userId: string, id: string, isVerified: boolean) {
    const updateData = isVerified
      ? {
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: userId,
          updated_at: new Date().toISOString(),
        }
      : {
          is_verified: false,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString(),
        };

    const { data, error } = await this.supabase
      .from('items')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update item verification: ${error.message}`);
    return data;
  }

  async assertItemsVerified(tenantId: string, rawItems: any[]) {
    const ids = Array.from(new Set(
      (Array.isArray(rawItems) ? rawItems : [])
        .map((item) => String(item?.itemId || item?.item_id || '').trim())
        .filter(Boolean),
    ));
    const codes = Array.from(new Set(
      (Array.isArray(rawItems) ? rawItems : [])
        .map((item) => String(item?.itemCode || item?.item_code || '').trim())
        .filter(Boolean),
    ));

    if (ids.length === 0 && codes.length === 0) return;

    const byId = new Map<string, any>();
    const byCode = new Map<string, any>();

    if (ids.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('id', ids);
      if (error) throw new BadRequestException(error.message);
      (data || []).forEach((item: any) => byId.set(String(item.id), item));
    }

    if (codes.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('code', codes);
      if (error) throw new BadRequestException(error.message);
      (data || []).forEach((item: any) => byCode.set(String(item.code), item));
    }

    for (const rawItem of Array.isArray(rawItems) ? rawItems : []) {
      const id = String(rawItem?.itemId || rawItem?.item_id || '').trim();
      const code = String(rawItem?.itemCode || rawItem?.item_code || '').trim();
      const item = (id && byId.get(id)) || (code && byCode.get(code));
      if (!item) continue;
      const label = item.name || item.code || code || id;
      if (item.is_active === false) throw new BadRequestException(`Item ${label} is inactive and cannot be used.`);
      // Verification check disabled - causing too many errors
      // if (item.is_verified !== true) throw new BadRequestException(`Item ${label} is not verified by admin and cannot be used.`);
    }
  }

  async assertItemVerified(tenantId: string, itemId: string) {
    await this.assertItemsVerified(tenantId, [{ itemId }]);
  }

  async delete(tenantId: string, userId: string, id: string) {
    // Soft delete
    const { error } = await this.supabase
      .from('items')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    void userId;

    if (error) {
      throw new Error(mapDeleteAuditError(error, 'item'));
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
    const documentId = (drawingData?.documentId || drawingData?.document_id || '').toString().trim();

    let resolvedFileName = drawingData?.fileName;
    let resolvedFileUrl = drawingData?.fileUrl;
    let resolvedFileType = drawingData?.fileType;
    let resolvedFileSize = drawingData?.fileSize;

    if (documentId) {
      const { data: doc, error: docError } = await this.supabase
        .from('documents')
        .select('id, file_url, file_name, file_type, file_size, title')
        .eq('tenant_id', tenantId)
        .eq('id', documentId)
        .single();

      if (docError || !doc) {
        throw new Error(`Failed to link drawing from document: ${docError?.message || 'Document not found'}`);
      }

      resolvedFileUrl = doc.file_url;
      resolvedFileName = doc.file_name || doc.title || 'drawing';
      resolvedFileType = doc.file_type;
      resolvedFileSize = doc.file_size;
    }

    if (!resolvedFileUrl) {
      throw new Error('Missing drawing fileUrl');
    }

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

    const baseInsert: any = {
      tenant_id: tenantId,
      item_id: itemId,
      file_name: resolvedFileName,
      file_url: resolvedFileUrl,
      file_type: resolvedFileType,
      file_size: resolvedFileSize,
      version: nextVersion,
      revision_notes: drawingData.revisionNotes,
      is_active: true,
      uploaded_by: userId,
    };

    const tryInsert = async (payload: any) => {
      return this.supabase
        .from('item_drawings')
        .insert(payload)
        .select()
        .single();
    };

    // Prefer to persist the source document reference when available, but tolerate schema drift.
    let insertResult = documentId
      ? await tryInsert({ ...baseInsert, document_id: documentId })
      : await tryInsert(baseInsert);

    if (insertResult.error && documentId) {
      const message = String((insertResult.error as any)?.message || '').toLowerCase();
      if (message.includes('document_id') && (message.includes('column') || message.includes('does not exist'))) {
        insertResult = await tryInsert(baseInsert);
      }
    }

    const data = insertResult.data as any;
    const error = insertResult.error as any;

    if (error) {
      throw new Error(`Failed to upload drawing: ${error.message}`);
    }

    // Ensure only one active drawing per item (latest by default)
    const { error: deactivateError } = await this.supabase
      .from('item_drawings')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .neq('id', data.id);

    if (deactivateError) {
      throw new Error(`Failed to finalize drawing upload: ${deactivateError.message}`);
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

    // If activated, deactivate all others to keep exactly one ACTIVE drawing
    if (drawingData.isActive === true) {
      const { error: deactivateError } = await this.supabase
        .from('item_drawings')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .neq('id', drawingId);

      if (deactivateError) {
        throw new Error(`Failed to activate drawing: ${deactivateError.message}`);
      }
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

  private isMissingItemVendorsTenantIdColumn(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('item_vendors') &&
      message.includes('tenant_id') &&
      (message.includes('does not exist') || message.includes('column'))
    );
  }

  private async assertItemBelongsToTenant(tenantId: string, itemId: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', itemId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(`Failed to validate item tenant: ${error.message}`);
    }

    if (!data?.id) {
      throw new NotFoundException('Item not found');
    }
  }

  // Item-Vendor Relationship Methods
  async getItemVendors(tenantId: string, itemId: string) {
    if (!this.isUuid(itemId)) {
      throw new BadRequestException('Invalid item id');
    }

    // Ensure tenant scoping even if item_vendors does not have tenant_id
    await this.assertItemBelongsToTenant(tenantId, itemId);

    const baseSelect = `
        *,
        vendor:vendors(id, code, name, contact_person, email, phone)
      `;

    const { data, error } = await this.supabase
      .from('item_vendors')
      .select(baseSelect)
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error && this.isMissingItemVendorsTenantIdColumn(error)) {
      throw new InternalServerErrorException(
        'item_vendors.tenant_id is required. Run migration add-tenant-id-to-item-vendors.sql',
      );
    }

    if (error) {
      throw new Error(`Failed to fetch item vendors: ${error.message}`);
    }

    return data || [];
  }

  async getPreferredVendor(itemId: string) {
    const { data, error } = await this.supabase.rpc('get_preferred_vendor', {
      p_item_id: itemId,
    });

    if (error) {
      throw new Error(`Failed to fetch preferred vendor: ${error.message}`);
    }

    return data?.[0] || null;
  }

  async addItemVendor(tenantId: string, userId: string, itemId: string, body: any) {
    const vendorId = body?.vendor_id ?? body?.vendorId;
    if (!this.isUuid(itemId)) {
      throw new BadRequestException('Invalid item id');
    }
    if (!this.isUuid(vendorId)) {
      throw new BadRequestException('vendor_id is required and must be a valid UUID');
    }

    await this.assertItemBelongsToTenant(tenantId, itemId);
    await this.assertItemVerified(tenantId, itemId);

    const { data: vendor, error: vendorError } = await this.supabase
      .from('vendors')
      .select('id, name, code, is_active, is_verified')
      .eq('tenant_id', tenantId)
      .eq('id', vendorId)
      .maybeSingle();
    if (vendorError) throw new BadRequestException(vendorError.message);
    if (!vendor?.id) throw new BadRequestException('Vendor not found');
    if (vendor.is_active === false) throw new BadRequestException(`Vendor ${vendor.name || vendor.code || ''} is inactive and cannot be used.`);
    // Verification check disabled - causing too many errors
    // if (vendor.is_verified !== true) throw new BadRequestException(`Vendor ${vendor.name || vendor.code || ''} is not verified by admin and cannot be used.`);

    // Idempotency: if the relationship already exists, return it (or reactivate it)
    // Try scoping by items.tenant_id first (handles schemas where item_vendors has no tenant_id column)
    const { data: existingRows, error: existingError } = await this.supabase
      .from('item_vendors')
      .select('*, items!inner(tenant_id)')
      .eq('items.tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('vendor_id', vendorId)
      .limit(1);

    if (existingError && this.isMissingItemVendorsTenantIdColumn(existingError)) {
      throw new InternalServerErrorException(
        'item_vendors.tenant_id is required. Run migration add-tenant-id-to-item-vendors.sql',
      );
    }

    if (existingError) {
      throw new InternalServerErrorException(
        `Failed to check existing vendor link: ${existingError.message}`,
      );
    }

    const existing = existingRows?.[0];
    if (existing?.id) {
      if (existing.is_active) {
        return existing;
      }

      const { data: reactivated, error: reactivateError } = await this.supabase
        .from('item_vendors')
        .update({ is_active: true, updated_by: userId })
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .eq('vendor_id', vendorId)
        .select()
        .single();

      if (reactivateError) {
        throw new InternalServerErrorException(
          `Failed to reactivate vendor link: ${reactivateError.message}`,
        );
      }

      return reactivated;
    }

    const { data, error } = await this.supabase
      .from('item_vendors')
      .insert({
        tenant_id: tenantId,
        item_id: itemId,
        vendor_id: vendorId,
        priority: this.normalizeNumber(body?.priority, 'int') ?? 1,
        unit_price: this.normalizeNumber(body.unit_price),
        lead_time_days: this.normalizeNumber(body.lead_time_days, 'int'),
        vendor_item_code: body.vendor_item_code || null,
        minimum_order_quantity: this.normalizeNumber(body.minimum_order_quantity),
        payment_terms: body.payment_terms || null,
        notes: body.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      const message = String((error as any)?.message || '').toLowerCase();
      if (message.includes('duplicate key') || message.includes('item_vendors_unique')) {
        throw new ConflictException('Vendor is already linked to this item');
      }
      throw new InternalServerErrorException(`Failed to add vendor: ${error.message}`);
    }

    return data;
  }

  async updateItemVendor(tenantId: string, userId: string, itemId: string, vendorId: string, body: any) {
    if (!this.isUuid(itemId)) {
      throw new BadRequestException('Invalid item id');
    }
    if (!this.isUuid(vendorId)) {
      throw new BadRequestException('Invalid vendor id');
    }

    await this.assertItemBelongsToTenant(tenantId, itemId);

    const { data, error } = await this.supabase
      .from('item_vendors')
      .update({
        priority: body?.priority,
        unit_price: this.normalizeNumber(body.unit_price),
        lead_time_days: this.normalizeNumber(body.lead_time_days, 'int'),
        vendor_item_code: body.vendor_item_code,
        minimum_order_quantity: this.normalizeNumber(body.minimum_order_quantity),
        payment_terms: body.payment_terms,
        notes: body.notes,
        is_active: body.is_active !== undefined ? body.is_active : true,
        updated_by: userId,
      })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error && this.isMissingItemVendorsTenantIdColumn(error)) {
      throw new InternalServerErrorException(
        'item_vendors.tenant_id is required. Run migration add-tenant-id-to-item-vendors.sql',
      );
    }

    if (error) {
      throw new Error(`Failed to update vendor: ${error.message}`);
    }

    return data;
  }

  async deleteItemVendor(tenantId: string, itemId: string, vendorId: string) {
    if (!this.isUuid(itemId)) {
      throw new BadRequestException('Invalid item id');
    }
    if (!this.isUuid(vendorId)) {
      throw new BadRequestException('Invalid vendor id');
    }

    await this.assertItemBelongsToTenant(tenantId, itemId);

    const { error } = await this.supabase
      .from('item_vendors')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('vendor_id', vendorId);

    if (error && this.isMissingItemVendorsTenantIdColumn(error)) {
      throw new InternalServerErrorException(
        'item_vendors.tenant_id is required. Run migration add-tenant-id-to-item-vendors.sql',
      );
    }

    if (error) {
      throw new Error(`Failed to remove vendor: ${error.message}`);
    }

    return { message: 'Vendor removed successfully' };
  }

  async getPurchasePriceHistory(itemId: string, vendorId: string) {
    const { data, error } = await this.supabase.rpc('get_purchase_price_history', {
      p_item_id: itemId,
      p_vendor_id: vendorId,
    });

    if (error) {
      throw new Error(`Failed to get purchase price history: ${error.message}`);
    }

    return data || [];
  }

  async getItemStock(itemId: string, tenantId: string) {
    const { data, error } = await this.supabase.rpc('get_item_stock_summary', {
      p_item_id: itemId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to get item stock: ${error.message}`);
    }

    return data && data.length > 0 ? data[0] : { total_quantity: 0, available_quantity: 0, allocated_quantity: 0 };
  }

  // Get all variants of an item
  async getItemVariants(tenantId: string, itemId: string) {
    console.log('[getItemVariants] Fetching variants for item:', itemId, 'tenant:', tenantId);
    
    const { data, error } = await this.supabase
      .from('items')
      .select('id, code, name, variant_name, is_default_variant, category, uom, hsn_code')
      .eq('tenant_id', tenantId)
      .eq('parent_item_id', itemId)
      .eq('is_variant', true)
      .eq('is_active', true)
      .order('is_default_variant', { ascending: false })
      .order('variant_name', { ascending: true });

    console.log('[getItemVariants] Query result:', { data, error, count: data?.length });

    if (error) {
      throw new Error(`Failed to get item variants: ${error.message}`);
    }

    return data || [];
  }

  // Get stock trail — all inbound/outbound movements for an item with running balance
  async getStockTrail(tenantId: string, itemId: string) {
    const trails: any[] = [];

    // --- 1. GRN inbound from stock_entries ---
    const { data: stockEntries } = await this.supabase
      .from('stock_entries')
      .select('id, quantity, available_quantity, unit_price, batch_number, metadata, created_at, warehouse_id')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (stockEntries?.length) {
      const grnNumbers = [...new Set(
        (stockEntries as any[])
          .map((e) => e.metadata?.grn_reference || e.metadata?.grn_number)
          .filter(Boolean),
      )] as string[];

      const grnsByNumber: Record<string, any> = {};
      if (grnNumbers.length > 0) {
        const { data: grnsData } = await this.supabase
          .from('grns')
          .select('id, grn_number, receipt_date, po_number, vendor_id')
          .eq('tenant_id', tenantId)
          .in('grn_number', grnNumbers);

        const vendorIds = [...new Set((grnsData || []).map((g: any) => g.vendor_id).filter(Boolean))] as string[];
        const vendorById: Record<string, string> = {};
        if (vendorIds.length > 0) {
          const { data: vData } = await this.supabase
            .from('vendors')
            .select('id, name')
            .in('id', vendorIds);
          for (const v of vData || []) vendorById[v.id] = v.name;
        }

        for (const g of grnsData || []) {
          grnsByNumber[g.grn_number] = { ...g, vendor_name: vendorById[g.vendor_id] || null };
        }
      }

      const seWhIds = [...new Set((stockEntries as any[]).map((e) => e.warehouse_id).filter(Boolean))] as string[];
      const seWhById: Record<string, any> = {};
      if (seWhIds.length > 0) {
        const { data: whs } = await this.supabase.from('warehouses').select('id, name, code').in('id', seWhIds);
        for (const w of whs || []) seWhById[w.id] = w;
      }

      // Deduplicate: group by grn_reference + item to prevent double rows from duplicate DB entries.
      // Multiple stock_entries for the same GRN+item are collapsed into one trail row.
      const grnEntryMap = new Map<string, { entry: any; qty: number }>();
      for (const entry of stockEntries as any[]) {
        const grnRef = entry.metadata?.grn_reference || entry.metadata?.grn_number;
        // Only show stock_entries that originated from a real GRN.
        // Entries without a GRN reference were created via adjustment/import and are
        // already represented in stock_movements — showing them here would double-count.
        if (!grnRef) continue;
        const dedupKey = `${grnRef}::${entry.warehouse_id || ''}`;
        if (grnEntryMap.has(dedupKey)) {
          grnEntryMap.get(dedupKey)!.qty += Number(entry.quantity) || 0;
        } else {
          grnEntryMap.set(dedupKey, { entry, qty: Number(entry.quantity) || 0 });
        }
      }

      for (const { entry, qty } of grnEntryMap.values()) {
        const grnRef = entry.metadata?.grn_reference || entry.metadata?.grn_number;
        const grn = grnsByNumber[grnRef] || null;
        const wh = seWhById[entry.warehouse_id];
        trails.push({
          date: entry.created_at,
          type: 'GRN_RECEIPT',
          document_type: 'GRN',
          reference: grnRef,
          reference_id: grn?.id || null,
          qty_in: qty,
          qty_out: 0,
          warehouse: wh ? (wh.name || wh.code) : null,
          vendor: grn?.vendor_name || null,
          unit_price: entry.unit_price != null ? Number(entry.unit_price) : null,
          batch_number: entry.batch_number || null,
          po_number: grn?.po_number || null,
          notes: `Received via ${grnRef}`,
        });
      }
    }

    // --- 2. Other movements from stock_movements (adjustments, SIV, production, etc.) ---
    const { data: movements } = await this.supabase
      .from('stock_movements')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('movement_date', { ascending: true });

    if (movements?.length) {
      const movWhIds = [...new Set([
        ...(movements as any[]).map((m) => m.from_warehouse_id),
        ...(movements as any[]).map((m) => m.to_warehouse_id),
      ].filter(Boolean))] as string[];

      const movWhById: Record<string, any> = {};
      if (movWhIds.length > 0) {
        const { data: whs } = await this.supabase.from('warehouses').select('id, name, code').in('id', movWhIds);
        for (const w of whs || []) movWhById[w.id] = w;
      }

      for (const m of movements as any[]) {
        const isInbound = !m.from_warehouse_id && !!m.to_warehouse_id;
        const isOutbound = !!m.from_warehouse_id && !m.to_warehouse_id;
        const warehouseId = isInbound ? m.to_warehouse_id : m.from_warehouse_id;
        const wh = movWhById[warehouseId];
        trails.push({
          date: m.movement_date,
          type: m.movement_type,
          document_type: m.reference_type || m.movement_type,
          reference: m.reference_number || m.movement_number,
          reference_id: m.reference_id || null,
          qty_in: isInbound ? Number(m.quantity) : 0,
          qty_out: isOutbound ? Number(m.quantity) : 0,
          warehouse: wh ? (wh.name || wh.code) : null,
          vendor: null,
          unit_price: null,
          batch_number: m.batch_number || null,
          po_number: null,
          notes: m.notes || null,
        });
      }
    }

    // Sort chronologically and compute running balance
    trails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    for (const t of trails) {
      balance += t.qty_in - t.qty_out;
      t.balance = balance;
    }

    const stockByWarehouse = new Map<string, number>();
    for (const t of trails) {
      const warehouse = String(t.warehouse || '').trim();
      if (!warehouse) continue;
      stockByWarehouse.set(warehouse, (stockByWarehouse.get(warehouse) || 0) + Number(t.qty_in || 0) - Number(t.qty_out || 0));
    }

    const currentStock = Array.from(stockByWarehouse.entries()).map(([warehouseName, quantity]) => ({
      quantity,
      available_quantity: quantity,
      allocated_quantity: 0,
      warehouse_id: null,
      warehouses: { id: null, name: warehouseName, code: warehouseName },
    }));

    return { trails, currentBalance: balance, currentStock };
  }

  // Get default variant for an item
  async getDefaultVariant(tenantId: string, itemId: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('parent_item_id', itemId)
      .eq('is_variant', true)
      .eq('is_default_variant', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get default variant: ${error.message}`);
    }

    return data;
  }
}
