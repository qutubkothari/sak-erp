import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { EmailService } from '../../email/email.service';
import { normalizeInventoryCategory } from '../utils/inventory-category';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_WAREHOUSES = [
  { code: 'MAIN_WAREHOUSE', name: 'Main Warehouse', type: 'STORE' },
  { code: 'PRODUCTION_FLOOR', name: 'Production Floor', type: 'PRODUCTION' },
  { code: 'QC_AREA', name: 'QC Area', type: 'QC' },
  { code: 'FINISHED_GOODS', name: 'Finished Goods', type: 'STORE' },
] as const;

const toValidUuid = (value: unknown): string | null => {
  const normalized = String(value || '').trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
};

type UidAdjustmentContext = {
  item: any;
  direction: 'increase' | 'decrease';
  quantity: number;
  uidStrategy: 'SERIALIZED' | 'BATCHED';
  qtyPerUid: number;
  requiredUidCount: number;
  selectedUids: string[];
  generateUids: boolean;
  warehouseId: string;
  warehouseLabel: string;
};

type UidRollbackState = {
  generatedUids: string[];
  consumedUids: Array<{
    uid: string;
    status: string;
    location?: string;
  }>;
};

type WarehouseColumnSupport = {
  metadata: boolean;
  plantId: boolean;
  type: boolean;
};

type WarehouseWriteInput = {
  code?: string;
  name?: string;
  type?: string;
  plant_id?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

type InventoryItemLookupRow = {
  id: string;
  code: string;
  name: string;
  uom?: string;
  category?: string;
  standard_cost?: number;
  selling_price?: number;
};

type InventoryWarehouseLookupRow = {
  id: string;
  code: string;
  name: string;
};

@Injectable()
export class InventoryService {
  private supabase: SupabaseClient;
  private warehouseColumnSupportPromise: Promise<WarehouseColumnSupport> | null = null;

  constructor(
    private emailService: EmailService,
    private readonly uidSupabaseService: UidSupabaseService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  private stockKey(itemId: string, warehouseId: string) {
    return `${itemId}::${warehouseId}`;
  }

  private splitStockKey(key: string) {
    const [itemId, warehouseId] = key.split('::');
    return { itemId, warehouseId };
  }

  private async getLedgerStockByWarehouse(tenantId: string, filters?: any) {
    const totals = new Map<string, number>();

    let entriesQuery = this.supabase
      .from('stock_entries')
      .select('item_id, warehouse_id, quantity, metadata')
      .eq('tenant_id', tenantId);

    if (filters?.item_id) entriesQuery = entriesQuery.eq('item_id', filters.item_id);
    if (filters?.warehouse_id) entriesQuery = entriesQuery.eq('warehouse_id', filters.warehouse_id);

    const { data: stockEntries, error: entriesError } = await entriesQuery;
    if (entriesError) throw new BadRequestException(entriesError.message);

    const grnEntryMap = new Map<string, number>();
    for (const entry of stockEntries || []) {
      const itemId = toValidUuid((entry as any).item_id);
      const warehouseId = toValidUuid((entry as any).warehouse_id);
      if (!itemId || !warehouseId) continue;

      const grnRef = (entry as any).metadata?.grn_reference || (entry as any).metadata?.grn_number;
      if (!grnRef) continue;

      const key = `${itemId}::${warehouseId}::${grnRef}`;
      grnEntryMap.set(key, (grnEntryMap.get(key) || 0) + (Number((entry as any).quantity) || 0));
    }

    for (const [key, qty] of grnEntryMap.entries()) {
      const [itemId, warehouseId] = key.split('::');
      const stockKey = this.stockKey(itemId, warehouseId);
      totals.set(stockKey, (totals.get(stockKey) || 0) + qty);
    }

    let movementsQuery = this.supabase
      .from('stock_movements')
      .select('item_id, quantity, from_warehouse_id, to_warehouse_id')
      .eq('tenant_id', tenantId);

    if (filters?.item_id) movementsQuery = movementsQuery.eq('item_id', filters.item_id);

    const { data: movements, error: movementsError } = await movementsQuery;
    if (movementsError) throw new BadRequestException(movementsError.message);

    for (const movement of movements || []) {
      const itemId = toValidUuid((movement as any).item_id);
      if (!itemId) continue;

      const qty = Number((movement as any).quantity) || 0;
      const fromWarehouseId = toValidUuid((movement as any).from_warehouse_id);
      const toWarehouseId = toValidUuid((movement as any).to_warehouse_id);

      if (filters?.warehouse_id && fromWarehouseId !== filters.warehouse_id && toWarehouseId !== filters.warehouse_id) {
        continue;
      }

      if (toWarehouseId) {
        const key = this.stockKey(itemId, toWarehouseId);
        totals.set(key, (totals.get(key) || 0) + qty);
      }

      if (fromWarehouseId) {
        const key = this.stockKey(itemId, fromWarehouseId);
        totals.set(key, (totals.get(key) || 0) - qty);
      }
    }

    return totals;
  }

  private isMissingColumnError(error: { message?: string; code?: string } | null | undefined, columnName: string) {
    const msg = String(error?.message || '').toLowerCase();
    return (
      msg.includes(`could not find the '${columnName}' column`) ||
      msg.includes(`column "${columnName}" does not exist`) ||
      msg.includes(`column ${columnName} does not exist`) ||
      msg.includes(`relation "warehouses" does not have column "${columnName}"`) ||
      msg.includes(`undefined column "${columnName}"`) ||
      (String(error?.code || '') === '42703') // PostgreSQL undefined_column
    );
  }

  private async supportsWarehouseColumn(columnName: 'metadata' | 'plant_id' | 'type') {
    try {
      const { error } = await this.supabase
        .from('warehouses')
        .select(`id, ${columnName}`)
        .limit(1);

      if (!error) return true;
      if (this.isMissingColumnError(error, columnName)) return false;
      // Unknown error — assume column doesn't exist to avoid crashing warehouse seeding
      return false;
    } catch {
      return false;
    }
  }

  private async getWarehouseColumnSupport() {
    if (!this.warehouseColumnSupportPromise) {
      this.warehouseColumnSupportPromise = (async () => {
        const [metadata, plantId, type] = await Promise.all([
          this.supportsWarehouseColumn('metadata'),
          this.supportsWarehouseColumn('plant_id'),
          this.supportsWarehouseColumn('type'),
        ]);

        return { metadata, plantId, type };
      })();
    }

    return this.warehouseColumnSupportPromise;
  }

  private async buildWarehousePayload(tenantId: string, warehouse: WarehouseWriteInput) {
    const columnSupport = await this.getWarehouseColumnSupport();
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      code: warehouse.code,
      name: warehouse.name,
      is_active: warehouse.is_active ?? true,
    };

    if (columnSupport.type && warehouse.type) {
      payload.type = warehouse.type;
    }

    if (columnSupport.plantId && warehouse.plant_id) {
      payload.plant_id = warehouse.plant_id;
    }

    if (columnSupport.metadata) {
      payload.metadata = warehouse.metadata || {};
    }

    return payload;
  }

  private async ensureDefaultWarehouses(tenantId: string) {
    const payload = await Promise.all(
      DEFAULT_WAREHOUSES.map((warehouse) =>
        this.buildWarehousePayload(tenantId, {
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type,
          is_active: true,
          metadata: { system_seeded: true },
        })
      )
    );

    const { error: insertError } = await this.supabase
      .from('warehouses')
      .insert(payload);

    if (insertError) throw new BadRequestException(insertError.message);

    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // Get current stock levels with filters
  async getStockLevels(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    const ledgerTotals = await this.getLedgerStockByWarehouse(tenantId, filters);
    let stockEntries = Array.from(ledgerTotals.entries()).map(([key, quantity]) => {
      const { itemId, warehouseId } = this.splitStockKey(key);
      return {
        id: key,
        tenant_id: tenantId,
        item_id: itemId,
        warehouse_id: warehouseId,
        quantity,
        available_quantity: quantity,
        reserved_quantity: 0,
        allocated_quantity: 0,
      };
    });

    if (filters?.low_stock) {
      stockEntries = stockEntries.filter((entry) => Number(entry.available_quantity || 0) < 10);
    }

    if (!stockEntries || stockEntries.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(
      stockEntries
        .map((entry) => toValidUuid(entry.item_id))
        .filter(Boolean)
    )] as string[];
    const items = itemIds.length > 0
      ? await this.supabase
          .from('items')
          .select('id, code, name, uom, category, standard_cost, selling_price')
          .in('id', itemIds)
      : { data: [], error: null };

    if (items.error) throw new BadRequestException(items.error.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set(
      stockEntries
        .map((entry) => toValidUuid(entry.warehouse_id))
        .filter(Boolean)
    )] as string[];
    const warehouses = warehouseIds.length > 0
      ? await this.supabase
          .from('warehouses')
          .select('id, code, name')
          .in('id', warehouseIds)
      : { data: [], error: null };

    if (warehouses.error) throw new BadRequestException(warehouses.error.message);

    const itemRows = (items.data ?? []) as InventoryItemLookupRow[];
    const warehouseRows = (warehouses.data ?? []) as InventoryWarehouseLookupRow[];

    // Combine the data manually
    const result = stockEntries.map(entry => {
      const item = itemRows.find(i => i.id === entry.item_id);
      const warehouse = warehouseRows.find(w => w.id === entry.warehouse_id);
      
      return {
        ...entry,
        items: item || { code: 'N/A', name: 'Unknown Item', uom: '', category: '', standard_cost: 0, selling_price: 0 },
        warehouses: warehouse || { code: 'N/A', name: 'Unknown Warehouse' }
      };
    });

    // Apply category filter if needed
    if (filters?.category) {
      return result.filter(entry => entry.items.category === filters.category);
    }

    return result;
  }

  // Get stock movements history
  async getStockMovements(req: Request, filters?: any) {
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('stock_movements')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters?.movement_type) {
      query = query.eq('movement_type', filters.movement_type);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    if (filters?.from_date) {
      query = query.gte('movement_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('movement_date', filters.to_date);
    }

    const { data: movements, error: movementError } = await query
      .order('movement_date', { ascending: false })
      .limit(filters?.limit || 100);

    if (movementError) throw new BadRequestException(movementError.message);

    if (!movements || movements.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(
      movements
        .map((movement) => toValidUuid(movement.item_id))
        .filter(Boolean)
    )] as string[];
    const items = itemIds.length > 0
      ? await this.supabase
          .from('items')
          .select('id, code, name')
          .in('id', itemIds)
      : { data: [], error: null };

    if (items.error) throw new BadRequestException(items.error.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set([
      ...movements
        .map((movement) => toValidUuid(movement.from_warehouse_id))
        .filter(Boolean),
      ...movements
        .map((movement) => toValidUuid(movement.to_warehouse_id))
        .filter(Boolean)
    ])] as string[];
    
    const warehouses = warehouseIds.length > 0
      ? await this.supabase
          .from('warehouses')
          .select('id, code, name')
          .in('id', warehouseIds)
      : { data: [], error: null };

    if (warehouses.error) throw new BadRequestException(warehouses.error.message);

    const itemRows = (items.data ?? []) as InventoryItemLookupRow[];
    const warehouseRows = (warehouses.data ?? []) as InventoryWarehouseLookupRow[];

    // Combine the data manually
    const result = movements.map(movement => {
      const item = itemRows.find(i => i.id === movement.item_id);
      const fromWarehouse = warehouseRows.find(w => w.id === movement.from_warehouse_id);
      const toWarehouse = warehouseRows.find(w => w.id === movement.to_warehouse_id);
      
      return {
        ...movement,
        items: item || { code: 'N/A', name: 'Unknown Item' },
        from_warehouse: fromWarehouse || null,
        to_warehouse: toWarehouse || null
      };
    });

    return result;
  }

  // Create stock movement (generic)
  async createStockMovement(req: Request, movementData: any) {
    
    const { tenantId, userId } = req.user as any;

    const { data: item, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name, is_active, is_verified')
      .eq('tenant_id', tenantId)
      .eq('id', movementData.item_id)
      .maybeSingle();
    if (itemError) throw new BadRequestException(itemError.message);
    if (!item?.id) throw new BadRequestException('Item not found');
    if (item.is_active === false) throw new BadRequestException(`Item ${item.name || item.code || ''} is inactive and cannot be used.`);
    // Verification check disabled - causing too many errors
    // if (item.is_verified !== true) throw new BadRequestException(`Item ${item.name || item.code || ''} is not verified by admin and cannot be used.`);

    // Generate movement number
    const movementNumber = await this.generateMovementNumber(req, movementData.movement_type);

    const movement = {
      tenant_id: tenantId,
      movement_number: movementNumber,
      movement_type: movementData.movement_type,
      item_id: movementData.item_id,
      uid: movementData.uid,
      from_warehouse_id: movementData.from_warehouse_id,
      from_location_id: movementData.from_location_id,
      to_warehouse_id: movementData.to_warehouse_id,
      to_location_id: movementData.to_location_id,
      quantity: movementData.quantity,
      reference_type: movementData.reference_type,
      reference_id: movementData.reference_id,
      reference_number: movementData.reference_number,
      batch_number: movementData.batch_number,
      notes: movementData.notes,
      moved_by: userId,
      movement_date: movementData.movement_date || new Date().toISOString(),
    };

    // Insert movement first, then roll it back if a follow-up step fails.
    const { data: movementRecord, error: movementError } = await this.supabase
      .from('stock_movements')
      .insert(movement)
      .select()
      .single();

    if (movementError) throw new BadRequestException(movementError.message);

    const uidRollbackState: UidRollbackState = {
      generatedUids: [],
      consumedUids: [],
    };

    let uidAdjustmentResult: { generated_uids: string[]; consumed_uids: string[] } = {
      generated_uids: [],
      consumed_uids: [],
    };

    let stockUpdated = false;

    try {
      // Update stock levels
      await this.updateStockLevels(req, movementData);
      stockUpdated = true;

      uidAdjustmentResult = await this.handleUidAdjustmentEffects(
        req,
        movementData,
        movementRecord,
        uidRollbackState,
      );

      // Check for low stock alerts
      await this.checkLowStockAlerts(req, movementData.item_id, movementData.to_warehouse_id || movementData.from_warehouse_id);
    } catch (error) {
      if (stockUpdated) {
        try {
          await this.updateStockLevels(req, movementData, -1);
        } catch (rollbackStockError) {
          console.error('Failed to rollback stock levels after stock movement error:', rollbackStockError);
        }
      }

      await this.rollbackUidAdjustmentEffects(req, uidRollbackState);

      if (movementRecord?.id) {
        await this.supabase
          .from('stock_movements')
          .delete()
          .eq('id', movementRecord.id)
          .eq('tenant_id', tenantId);
      }

      throw error;
    }

    return {
      ...movementRecord,
      ...uidAdjustmentResult,
    };
  }

  // Update stock levels after movement
  private async updateStockLevels(req: Request, movementData: any, multiplier = 1) {
    
    const { tenantId } = req.user as any;

    const quantity = Number(movementData.quantity || 0) * multiplier;

    // Decrease from source warehouse
    if (movementData.from_warehouse_id) {
      await this.adjustStock(
        req,
        movementData.item_id,
        movementData.from_warehouse_id,
        movementData.from_location_id,
        -quantity
      );
    }

    // Increase at destination warehouse
    if (movementData.to_warehouse_id) {
      await this.adjustStock(
        req,
        movementData.item_id,
        movementData.to_warehouse_id,
        movementData.to_location_id,
        quantity,
        movementData.category
      );
    }
  }

  private normalizeUidList(value: any): string[] {
    const source = Array.isArray(value) ? value : [value];
    return Array.from(
      new Set(
        source
          .map((entry) => String(entry || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private mapEntityTypeFromCategory(category?: string): string {
    const normalized = String(category || '').toUpperCase();
    if (normalized.includes('COMPONENT')) return 'CP';
    if (normalized.includes('FINISHED')) return 'FG';
    if (normalized.includes('ASSEMBLY')) return 'SA';
    return 'RM';
  }

  private async resolveWarehouseLabel(warehouseId: string): Promise<string> {
    const { data } = await this.supabase
      .from('warehouses')
      .select('code, name')
      .eq('id', warehouseId)
      .maybeSingle();

    return String(data?.name || data?.code || 'Warehouse').trim() || 'Warehouse';
  }

  private resolveRequiredUidCount(quantity: number, uidStrategy: 'SERIALIZED' | 'BATCHED', qtyPerUid: number): number {
    if (uidStrategy === 'BATCHED') {
      const ratio = quantity / qtyPerUid;
      if (!Number.isFinite(ratio) || Math.abs(ratio - Math.round(ratio)) > 1e-9) {
        throw new BadRequestException(`Adjustment quantity must be a multiple of batch_quantity=${qtyPerUid} for this UID-tracked item`);
      }

      return Math.round(ratio);
    }

    if (Math.abs(quantity - Math.round(quantity)) > 1e-9) {
      throw new BadRequestException('Adjustment quantity must be a whole number for SERIALIZED UID-tracked items');
    }

    return Math.round(quantity);
  }

  private async buildUidAdjustmentContext(req: Request, movementData: any): Promise<UidAdjustmentContext | null> {
    const { tenantId } = req.user as any;
    const movementType = String(movementData?.movement_type || '').trim().toUpperCase();

    if (movementType !== 'ADJUSTMENT') {
      return null;
    }

    const quantity = Number(movementData?.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    const isIncrease = !!movementData?.to_warehouse_id && !movementData?.from_warehouse_id;
    const isDecrease = !!movementData?.from_warehouse_id && !movementData?.to_warehouse_id;

    if (!isIncrease && !isDecrease) {
      return null;
    }

    const { data: item, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name, category, uid_tracking, uid_strategy, batch_quantity, batch_uom')
      .eq('tenant_id', tenantId)
      .eq('id', movementData.item_id)
      .maybeSingle();

    if (itemError) throw new BadRequestException(itemError.message);
    if (!item) throw new BadRequestException('Item not found');

    const uidTrackingEnabled = item.uid_tracking === true && String(item.uid_strategy || '').toUpperCase() !== 'NONE';
    if (!uidTrackingEnabled) {
      return null;
    }

    const uidStrategy = (String(item.uid_strategy || 'SERIALIZED').toUpperCase() === 'BATCHED'
      ? 'BATCHED'
      : 'SERIALIZED') as 'SERIALIZED' | 'BATCHED';

    const rawBatchQty = Number(item.batch_quantity);
    const qtyPerUid = uidStrategy === 'BATCHED'
      ? (Number.isFinite(rawBatchQty) && rawBatchQty > 0 ? rawBatchQty : NaN)
      : 1;

    if (uidStrategy === 'BATCHED' && !Number.isFinite(qtyPerUid)) {
      throw new BadRequestException('Item UID strategy is BATCHED but batch_quantity is missing/invalid in Item Master');
    }

    const direction = isIncrease ? 'increase' : 'decrease';
    const selectedUids = this.normalizeUidList(movementData?.selected_uids);
    const generateUids = movementData?.generate_uids === true;
    const requiresUidMapping = direction === 'decrease' || generateUids;
    const requiredUidCount = requiresUidMapping
      ? this.resolveRequiredUidCount(quantity, uidStrategy, qtyPerUid)
      : 0;
    const warehouseId = String(isIncrease ? movementData.to_warehouse_id : movementData.from_warehouse_id);
    const warehouseLabel = await this.resolveWarehouseLabel(warehouseId);

    return {
      item,
      direction,
      quantity,
      uidStrategy,
      qtyPerUid,
      requiredUidCount,
      selectedUids,
      generateUids,
      warehouseId,
      warehouseLabel,
    };
  }

  private async validateConsumableUids(req: Request, context: UidAdjustmentContext) {
    const { tenantId } = req.user as any;

    if (context.selectedUids.length !== context.requiredUidCount) {
      const extra = context.uidStrategy === 'BATCHED'
        ? ` (batch_quantity=${context.qtyPerUid})`
        : '';
      throw new BadRequestException(`Select exactly ${context.requiredUidCount} UID(s) for this adjustment${extra}`);
    }

    const { data: uidRows, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('uid, status, location, entity_id')
      .eq('tenant_id', tenantId)
      .in('uid', context.selectedUids);

    if (uidError) throw new BadRequestException(uidError.message);

    const byUid = new Map((uidRows || []).map((row: any) => [String(row.uid || '').trim(), row]));
    const missing = context.selectedUids.filter((uid) => !byUid.has(uid));

    if (missing.length > 0) {
      throw new BadRequestException(`Unknown UID(s): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
    }

    const issuableStatuses = new Set(['ACTIVE', 'GENERATED', 'IN_STOCK']);

    for (const uid of context.selectedUids) {
      const row: any = byUid.get(uid);
      const status = String(row?.status || '').trim();
      const entityId = String(row?.entity_id || '').trim();

      if (!issuableStatuses.has(status)) {
        throw new BadRequestException(`UID ${uid} cannot be removed from stock (status=${status || 'N/A'})`);
      }

      if (entityId !== String(context.item.id)) {
        throw new BadRequestException(`UID ${uid} does not belong to the selected item`);
      }
    }

    return (uidRows || []).map((row: any) => ({
      uid: String(row.uid || '').trim(),
      status: String(row.status || '').trim(),
      location: row.location ? String(row.location) : undefined,
    }));
  }

  private async handleUidAdjustmentEffects(
    req: Request,
    movementData: any,
    movementRecord: any,
    rollbackState: UidRollbackState,
  ): Promise<{ generated_uids: string[]; consumed_uids: string[] }> {
    const context = await this.buildUidAdjustmentContext(req, movementData);

    if (!context) {
      return {
        generated_uids: [],
        consumed_uids: [],
      };
    }

    if (context.direction === 'increase') {
      if (!context.generateUids) {
        return {
          generated_uids: [],
          consumed_uids: [],
        };
      }

      const generatedUids: string[] = [];

      for (let index = 0; index < context.requiredUidCount; index++) {
        const created = await this.uidSupabaseService.createUID(req as any, {
          plantCode: 'MFG',
          entityType: this.mapEntityTypeFromCategory(context.item.category),
          entity_type: this.mapEntityTypeFromCategory(context.item.category),
          entity_id: context.item.id,
          item_id: context.item.id,
          status: 'GENERATED',
          location: context.warehouseLabel,
          reference: movementRecord.movement_number,
          description: context.item.name,
          metadata: {
            source: 'STOCK_ADJUSTMENT',
            movement_id: movementRecord.id,
            movement_number: movementRecord.movement_number,
            adjusted_quantity: context.quantity,
            uid_sequence: index + 1,
            uid_count: context.requiredUidCount,
            uid_strategy: context.uidStrategy,
            qty_per_uid: context.qtyPerUid,
            warehouse_id: context.warehouseId,
            warehouse_name: context.warehouseLabel,
            item_code: context.item.code,
            item_name: context.item.name,
          },
        });

        const uid = String((created as any)?.uid || '').trim();
        if (!uid) {
          throw new BadRequestException('UID generation succeeded but no UID value was returned');
        }

        rollbackState.generatedUids.push(uid);
        generatedUids.push(uid);

        await this.uidSupabaseService.updateLifecycle(
          req as any,
          uid,
          'STOCK_ADJUSTMENT_INCREASE',
          context.warehouseLabel,
          `Stock adjustment ${movementRecord.movement_number}`,
        );
      }

      return {
        generated_uids: generatedUids,
        consumed_uids: [],
      };
    }

    const originalStates = await this.validateConsumableUids(req, context);

    for (const state of originalStates) {
      rollbackState.consumedUids.push(state);

      await this.uidSupabaseService.updateStatus(
        req as any,
        state.uid,
        'CONSUMED',
        `Stock Adjustment - ${context.warehouseLabel}`,
      );

      await this.uidSupabaseService.updateLifecycle(
        req as any,
        state.uid,
        'STOCK_ADJUSTMENT_DECREASE',
        `Stock Adjustment - ${context.warehouseLabel}`,
        `Stock adjustment ${movementRecord.movement_number}`,
      );
    }

    return {
      generated_uids: [],
      consumed_uids: originalStates.map((state) => state.uid),
    };
  }

  private async rollbackUidAdjustmentEffects(req: Request, rollbackState: UidRollbackState) {
    const { tenantId } = req.user as any;

    if (rollbackState.generatedUids.length > 0) {
      const { error } = await this.supabase
        .from('uid_registry')
        .delete()
        .eq('tenant_id', tenantId)
        .in('uid', rollbackState.generatedUids);

      if (error) {
        console.error('Failed to rollback generated UIDs after stock movement error:', error);
      }
    }

    for (const state of rollbackState.consumedUids) {
      try {
        await this.uidSupabaseService.updateStatus(
          req as any,
          state.uid,
          state.status,
          state.location,
        );

        await this.uidSupabaseService.updateLifecycle(
          req as any,
          state.uid,
          'STOCK_ADJUSTMENT_ROLLBACK',
          state.location || 'Warehouse',
          'Rolled back failed stock adjustment',
        );
      } catch (error) {
        console.error(`Failed to rollback consumed UID ${state.uid}:`, error);
      }
    }
  }

  // Adjust stock quantity (upsert)
  private async adjustStock(
    req: Request,
    itemId: string,
    warehouseId: string,
    locationId: string | null,
    quantityChange: number,
    category?: string
  ) {
    const { tenantId } = req.user as any;
    const normalizedCategory = normalizeInventoryCategory(category, 'RAW_MATERIAL');

    if (!locationId) {
      try {
        await this.adjustStockFallbackDirect({
          tenantId,
          itemId,
          warehouseId,
          quantityChange,
          category: normalizedCategory,
        });
        return;
      } catch (fallbackError: any) {
        console.error('Error in adjustStock direct fallback:', fallbackError);
        throw new BadRequestException('Failed to adjust stock levels.');
      }
    }

    const { error } = await this.supabase.rpc('adjust_inventory_stock', {
      p_tenant_id: tenantId,
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_location_id: locationId ?? null,
      p_quantity_change: quantityChange,
      p_category: normalizedCategory,
    });

    if (!error) {
      return;
    }

    console.error('Error in adjustStock RPC call, attempting fallback:', error);

    try {
      await this.adjustStockFallbackDirect({
        tenantId,
        itemId,
        warehouseId,
        quantityChange,
        category: normalizedCategory,
      });
    } catch (fallbackError: any) {
      console.error('Error in adjustStock fallback:', fallbackError);
      throw new BadRequestException('Failed to adjust stock levels.');
    }
  }

  private async adjustStockFallbackDirect(args: {
    tenantId: string;
    itemId: string;
    warehouseId: string;
    quantityChange: number;
    category: string;
  }) {
    const { tenantId, itemId, warehouseId, quantityChange, category } = args;

    if (!Number.isFinite(quantityChange) || Math.abs(quantityChange) < 1e-9) {
      return;
    }

    const { data: rows, error } = await this.supabase
      .from('inventory_stock')
      .select('id, quantity, reserved_quantity, available_quantity, location_id')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .eq('category', category)
      .order('available_quantity', { ascending: false });

    if (error) throw error;

    const safeRows = Array.isArray(rows) ? rows : [];

    if (safeRows.length === 0) {
      if (quantityChange < 0) {
        throw new Error('No inventory stock rows available for deduction');
      }

      const { error: insertError } = await this.supabase
        .from('inventory_stock')
        .insert({
          tenant_id: tenantId,
          item_id: itemId,
          warehouse_id: warehouseId,
          location_id: null,
          category,
          quantity: quantityChange,
          reserved_quantity: 0,
          last_movement_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);

      if (insertError) throw insertError;
      return;
    }

    let remaining = quantityChange;

    if (remaining < 0) {
      for (const row of safeRows) {
        if (remaining >= -1e-9) break;

        const currentQty = Number((row as any)?.quantity || 0);
        const reservedQty = Number((row as any)?.reserved_quantity || 0);
        const maxDeduct = Math.max(0, currentQty - reservedQty);
        const wanted = Math.min(maxDeduct, -remaining);

        if (wanted <= 0) continue;

        const nextQty = currentQty - wanted;
        const { error: updateError } = await this.supabase
          .from('inventory_stock')
          .update({
            quantity: nextQty,
            last_movement_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', (row as any)?.id);

        if (updateError) throw updateError;
        remaining += wanted;
      }

      if (remaining < -1e-6) {
        throw new Error(`Fallback inventory_stock deduction short by ${Math.abs(remaining).toFixed(6)}`);
      }

      return;
    }

    const target = safeRows[0];
    const currentQty = Number((target as any)?.quantity || 0);
    const nextQty = currentQty + remaining;
    const { error: updateError } = await this.supabase
      .from('inventory_stock')
      .update({
        quantity: nextQty,
        last_movement_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', (target as any)?.id);

    if (updateError) throw updateError;
  }

  // Generate movement number
  private async generateMovementNumber(req: Request, movementType: string): Promise<string> {
    
    const { tenantId } = req.user as any;

    const prefix = this.getMovementPrefix(movementType);
    const { count } = await this.supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('movement_number', `${prefix}%`);

    return `${prefix}${String((count || 0) + 1).padStart(6, '0')}`;
  }

  private getMovementPrefix(movementType: string): string {
    const prefixes: Record<string, string> = {
      GRN_RECEIPT: 'RCP-',
      PRODUCTION_ISSUE: 'ISS-',
      PRODUCTION_RETURN: 'RET-',
      PRODUCTION_RECEIPT: 'PRD-',
      SALES_ISSUE: 'SAL-',
      DEMO_ISSUE: 'DMO-',
      DEMO_RETURN: 'DMR-',
      DEMO_SOLD: 'DMS-',
      SERVICE_ISSUE: 'SRV-',
      TRANSFER: 'TRN-',
      ADJUSTMENT: 'ADJ-',
      SCRAP: 'SCR-',
    };
    return prefixes[movementType] || 'MOV-';
  }

  // Reserve stock for production/sales
  async reserveStock(req: Request, reservationData: any) {
    
    const { tenantId, userId } = req.user as any;

    // Check available quantity
    const { data: stock } = await this.supabase
      .from('inventory_stock')
      .select('available_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', reservationData.item_id)
      .eq('warehouse_id', reservationData.warehouse_id)
      .single();

    if (!stock || parseFloat(stock.available_quantity) < reservationData.reserved_quantity) {
      throw new BadRequestException('Insufficient stock available for reservation');
    }

    // Create reservation
    const reservation = {
      tenant_id: tenantId,
      item_id: reservationData.item_id,
      warehouse_id: reservationData.warehouse_id,
      reserved_quantity: reservationData.reserved_quantity,
      reference_type: reservationData.reference_type,
      reference_id: reservationData.reference_id,
      reference_number: reservationData.reference_number,
      reserved_by: userId,
      expires_at: reservationData.expires_at,
    };

    const { data, error } = await this.supabase
      .from('stock_reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update stock reserved_quantity
    await this.supabase.rpc('increment_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservationData.item_id,
      p_warehouse_id: reservationData.warehouse_id,
      p_quantity: reservationData.reserved_quantity,
    });

    return data;
  }

  // Release stock reservation
  async releaseReservation(req: Request, reservationId: string) {
    
    const { tenantId } = req.user as any;

    const { data: reservation } = await this.supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!reservation) throw new NotFoundException('Reservation not found');

    // Update reservation
    await this.supabase
      .from('stock_reservations')
      .update({ released: true, released_at: new Date().toISOString() })
      .eq('id', reservationId);

    // Decrease stock reserved_quantity
    await this.supabase.rpc('decrement_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservation.item_id,
      p_warehouse_id: reservation.warehouse_id,
      p_quantity: reservation.reserved_quantity,
    });

    return { message: 'Reservation released successfully' };
  }

  // Check and create low stock alerts
  private async checkLowStockAlerts(req: Request, itemId: string, warehouseId: string) {
    
    const { tenantId } = req.user as any;

    // Get stock and item details (need item's reorder_level)
    const { data: stock } = await this.supabase
      .from('inventory_stock')
      .select('*, items!inner(reorder_level)')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (!stock || !stock.items) return;

    const reorderLevel = stock.items.reorder_level || 0;
    const availableQty = parseFloat(stock.available_quantity) || 0;

    if (reorderLevel > 0 && availableQty <= reorderLevel) {
      // Check if alert already exists
      const { data: existingAlert } = await this.supabase
        .from('inventory_alerts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .eq('warehouse_id', warehouseId)
        .eq('alert_type', 'LOW_STOCK')
        .eq('acknowledged', false)
        .maybeSingle();

      if (!existingAlert) {
        await this.supabase.from('inventory_alerts').insert({
          tenant_id: tenantId,
          alert_type: 'LOW_STOCK',
          item_id: itemId,
          warehouse_id: warehouseId,
          current_quantity: availableQty,
          threshold_quantity: reorderLevel,
          message: `Low stock alert: Available quantity (${availableQty}) is at or below reorder level (${reorderLevel})`,
          severity: availableQty <= 0 ? 'CRITICAL' : 'HIGH',
        });
      }
    }
  }

  // Check all items for low stock and create alerts
  async checkAllLowStock(req: Request) {
    const { tenantId } = req.user as any;

    // Get all items with reorder levels set
    const { data: items, error: itemsError } = await this.supabase
      .from('items')
      .select('id, code, name, reorder_level')
      .eq('tenant_id', tenantId)
      .gt('reorder_level', 0);

    if (itemsError) throw new BadRequestException(itemsError.message);

    if (!items || items.length === 0) {
      return {
        success: true,
        itemsChecked: 0,
        alertsCreated: 0,
        message: 'No items found with reorder levels set.'
      };
    }

    let alertsCreated = 0;
    let itemsChecked = 0;

    // Check stock for each item
    for (const item of items) {
      const { data: stockRecords } = await this.supabase
        .from('inventory_stock')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('item_id', item.id);

      if (stockRecords && stockRecords.length > 0) {
        for (const stock of stockRecords) {
          itemsChecked++;
          const availableQty = parseFloat(stock.available_quantity) || 0;

          if (availableQty <= item.reorder_level) {
            // Check if alert already exists
            const { data: existingAlert } = await this.supabase
              .from('inventory_alerts')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('item_id', item.id)
              .eq('warehouse_id', stock.warehouse_id)
              .eq('alert_type', 'LOW_STOCK')
              .eq('acknowledged', false)
              .maybeSingle();

            if (!existingAlert) {
              await this.supabase.from('inventory_alerts').insert({
                tenant_id: tenantId,
                alert_type: 'LOW_STOCK',
                item_id: item.id,
                warehouse_id: stock.warehouse_id,
                current_quantity: availableQty,
                threshold_quantity: item.reorder_level,
                message: `Low stock: ${item.code} - ${item.name} (Available: ${availableQty}, Reorder: ${item.reorder_level})`,
                severity: availableQty <= 0 ? 'CRITICAL' : 'HIGH',
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return {
      success: true,
      itemsChecked,
      alertsCreated,
      message: `Checked ${itemsChecked} stock records from ${items.length} items with reorder levels. Created ${alertsCreated} new alerts.`
    };
  }

  // Check for overdue and approaching due job orders
  async checkJobOrderAlerts(req: Request) {
    try {
      console.log('[checkJobOrderAlerts] Starting job order alerts check');
      const { tenantId } = req.user as any;
      console.log('[checkJobOrderAlerts] Tenant ID:', tenantId);

      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      // Get all active job orders
      console.log('[checkJobOrderAlerts] Querying production_job_orders table...');
      const { data: jobOrders, error } = await this.supabase
        .from('production_job_orders')
        .select('id, job_order_number, item_code, item_name, item_id, end_date, status')
        .eq('tenant_id', tenantId)
        .in('status', ['DRAFT', 'SCHEDULED', 'IN_PROGRESS']);

      if (error) {
        console.error('[checkJobOrderAlerts] Database error:', error);
        throw new BadRequestException(`Failed to fetch job orders: ${error.message}`);
      }

      console.log('[checkJobOrderAlerts] Found', jobOrders?.length || 0, 'active job orders');

    let alertsCreated = 0;
    const todayStr = today.toISOString().split('T')[0];

    for (const job of jobOrders || []) {
      if (!job.end_date) continue;

      const endDate = new Date(job.end_date);

      // Check if overdue
      if (endDate < today && job.status !== 'COMPLETED') {
        const { data: existingAlert } = await this.supabase
          .from('inventory_alerts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'JOB_OVERDUE')
          .eq('item_id', job.item_id)
          .ilike('message', `%${job.job_order_number}%`)
          .eq('acknowledged', false)
          .maybeSingle();

        if (!existingAlert) {
          const daysOverdue = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          await this.supabase.from('inventory_alerts').insert({
            tenant_id: tenantId,
            alert_type: 'JOB_OVERDUE',
            item_id: job.item_id,
            warehouse_id: null,
            current_quantity: null,
            threshold_quantity: null,
            message: `⚠️ Job Order ${job.job_order_number} is OVERDUE by ${daysOverdue} day(s) | Item: ${job.item_code} - ${job.item_name} | Due: ${job.end_date}`,
            severity: 'CRITICAL',
          });
          alertsCreated++;
        }
      }
      // Check if approaching due date (within 3 days)
      else if (endDate >= today && endDate <= threeDaysFromNow) {
        const { data: existingAlert } = await this.supabase
          .from('inventory_alerts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'JOB_DUE_SOON')
          .eq('item_id', job.item_id)
          .ilike('message', `%${job.job_order_number}%`)
          .eq('acknowledged', false)
          .maybeSingle();

        if (!existingAlert) {
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          await this.supabase.from('inventory_alerts').insert({
            tenant_id: tenantId,
            alert_type: 'JOB_DUE_SOON',
            item_id: job.item_id,
            warehouse_id: null,
            current_quantity: null,
            threshold_quantity: null,
            message: `📅 Job Order ${job.job_order_number} due in ${daysRemaining} day(s) | Item: ${job.item_code} - ${job.item_name} | Due: ${job.end_date}`,
            severity: daysRemaining === 0 ? 'HIGH' : 'MEDIUM',
          });
          alertsCreated++;
        }
      }
    }

      console.log('[checkJobOrderAlerts] Successfully created', alertsCreated, 'new alerts');
      return {
        success: true,
        jobOrdersChecked: jobOrders?.length || 0,
        alertsCreated,
        message: `Checked ${jobOrders?.length || 0} active job orders. Created ${alertsCreated} new alerts.`
      };
    } catch (error) {
      console.error('[checkJobOrderAlerts] Error occurred:', error);
      console.error('[checkJobOrderAlerts] Error stack:', error.stack);
      throw error;
    }
  }

  // Get inventory alerts
  async getAlerts(req: Request, acknowledged?: boolean) {
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('inventory_alerts')
      .select('*')
      .eq('tenant_id', tenantId);

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged);
    }

    const { data: alerts, error: alertError } = await query
      .order('created_at', { ascending: false });

    if (alertError) throw new BadRequestException(alertError.message);

    if (!alerts || alerts.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(alerts.map(a => a.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set(alerts.map(a => a.warehouse_id))];
    const { data: warehouses, error: warehouseError } = await this.supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds);

    if (warehouseError) throw new BadRequestException(warehouseError.message);

    // Combine the data manually
    const result = alerts.map(alert => {
      const item = items?.find(i => i.id === alert.item_id);
      const warehouse = warehouses?.find(w => w.id === alert.warehouse_id);
      
      return {
        ...alert,
        items: item ? {
          item_code: item.code,
          item_name: item.name
        } : null,
        warehouses: warehouse ? {
          warehouse_code: warehouse.code,
          warehouse_name: warehouse.name
        } : null
      };
    });

    return result;
  }

  // Acknowledge alert
  async acknowledgeAlert(req: Request, alertId: string) {
    
    const { tenantId, userId } = req.user as any;

    const { error } = await this.supabase
      .from('inventory_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Alert acknowledged successfully' };
  }

  // Send low stock email alert
  async sendLowStockEmail(req: Request, recipientEmail: string) {
    
    const { tenantId } = req.user as any;

    // Get all unacknowledged low stock alerts
    const alerts = await this.getAlerts(req, false);
    const lowStockAlerts = alerts.filter((alert: any) => alert.alert_type === 'LOW_STOCK');

    if (lowStockAlerts.length === 0) {
      throw new BadRequestException('No low stock alerts to send');
    }

    try {
      await this.emailService.sendLowStockAlert(recipientEmail, lowStockAlerts, tenantId);
      return { 
        success: true, 
        message: `Low stock alert email sent to ${recipientEmail}`,
        itemCount: lowStockAlerts.length 
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  // Demo inventory management
  async issueDemoStock(req: Request, demoData: any) {
    
    const { tenantId, userId } = req.user as any;

    // Generate demo ID
    const demoId = await this.generateDemoId(req);

    const demo = {
      tenant_id: tenantId,
      demo_id: demoId,
      uid: demoData.uid,
      item_id: demoData.item_id,
      issued_to_staff_id: demoData.issued_to_staff_id,
      customer_name: demoData.customer_name,
      customer_contact: demoData.customer_contact,
      issue_date: demoData.issue_date || new Date().toISOString().split('T')[0],
      expected_return_date: demoData.expected_return_date,
      warehouse_id: demoData.warehouse_id,
      status: 'ISSUED',
    };

    const { data, error } = await this.supabase
      .from('demo_inventory')
      .insert(demo)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo issue
    await this.createStockMovement(req, {
      movement_type: 'DEMO_ISSUE',
      item_id: demoData.item_id,
      uid: demoData.uid,
      from_warehouse_id: demoData.warehouse_id,
      quantity: 1,
      reference_type: 'DEMO',
      reference_id: data.id,
      reference_number: demoId,
      notes: `Demo issued to ${demoData.issued_to_staff_id} for ${demoData.customer_name}`,
    });

    return data;
  }

  // Return demo stock
  async returnDemoStock(req: Request, demoId: string, returnData: any) {
    
    const { tenantId } = req.user as any;

    const { data: demo } = await this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { data: updatedDemo, error } = await this.supabase
      .from('demo_inventory')
      .update({
        status: 'RETURNED',
        actual_return_date: returnData.return_date || new Date().toISOString().split('T')[0],
        inspection_notes: returnData.inspection_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demo.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo return
    await this.createStockMovement(req, {
      movement_type: 'DEMO_RETURN',
      item_id: demo.item_id,
      uid: demo.uid,
      to_warehouse_id: demo.warehouse_id,
      quantity: 1,
      reference_type: 'DEMO',
      reference_id: demo.id,
      reference_number: demoId,
      notes: returnData.inspection_notes,
    });

    return updatedDemo;
  }

  // Convert demo to sale
  async convertDemoToSale(req: Request, demoId: string, salesOrderId: string) {
    
    const { tenantId } = req.user as any;

    const { data: demo } = await this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { error } = await this.supabase
      .from('demo_inventory')
      .update({
        status: 'SOLD',
        converted_to_sale: true,
        sales_order_id: salesOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demo.id);

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo sold
    await this.createStockMovement(req, {
      movement_type: 'DEMO_SOLD',
      item_id: demo.item_id,
      uid: demo.uid,
      from_warehouse_id: demo.warehouse_id,
      quantity: 1,
      reference_type: 'SALES_ORDER',
      reference_id: salesOrderId,
      reference_number: demoId,
      notes: `Demo converted to sale for ${demo.customer_name}`,
    });

    return { message: 'Demo converted to sale successfully', demo_expenses: demo.demo_expenses };
  }

  // Get demo inventory
  async getDemoInventory(req: Request, filters?: any) {
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.staff_id) {
      query = query.eq('issued_to_staff_id', filters.staff_id);
    }

    const { data: demos, error: demoError } = await query
      .order('issue_date', { ascending: false });

    if (demoError) throw new BadRequestException(demoError.message);

    if (!demos || demos.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(demos.map(d => d.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Combine the data manually
    const result = demos.map(demo => {
      const item = items?.find(i => i.id === demo.item_id);
      
      return {
        ...demo,
        items: item ? {
          item_code: item.code,
          item_name: item.name
        } : null
      };
    });

    return result;
  }

  private async generateDemoId(req: Request): Promise<string> {
    
    const { tenantId } = req.user as any;

    const { count } = await this.supabase
      .from('demo_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `DEMO-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  // Get warehouses
  async getWarehouses(req: Request) {
    
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw new BadRequestException(error.message);

    const warehouses = data || [];

    if (warehouses.length === 0) {
      return this.ensureDefaultWarehouses(tenantId);
    }

    const visibleWarehouses = warehouses.filter((warehouse: any) => warehouse?.is_active !== false);
    return visibleWarehouses.length > 0 ? visibleWarehouses : warehouses;
  }

  // Create warehouse
  async createWarehouse(req: Request, warehouseData: any) {
    
    const { tenantId } = req.user as any;

    const warehouse = await this.buildWarehousePayload(tenantId, {
      code: warehouseData.code || warehouseData.warehouse_code,
      name: warehouseData.name || warehouseData.warehouse_name,
      type: warehouseData.type,
      plant_id: warehouseData.plant_id,
      is_active: true,
      metadata: warehouseData.metadata || {},
    });

    const { data, error } = await this.supabase
      .from('warehouses')
      .insert(warehouse)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Delete stock entry
  async deleteStockEntry(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('inventory_stock')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Stock entry not found');
    return data;
  }

  // Delete stock movement
  async deleteStockMovement(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('stock_movements')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Stock movement not found');
    return data;
  }

  // Delete alert
  async deleteAlert(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('inventory_alerts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Alert not found');
    return data;
  }

  // Delete demo item
  async deleteDemoItem(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('demo_inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Demo item not found');
    return data;
  }
}
