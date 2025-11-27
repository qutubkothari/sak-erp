import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

@Injectable()
export class GrnService {
  private supabase: SupabaseClient;

  constructor(private uidService: UidSupabaseService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async create(tenantId: string, userId: string, data: any) {
    // Generate GRN number
    const grnNumber = await this.generateGRNNumber(tenantId);

    const { data: grn, error } = await this.supabase
      .from('grns')
      .insert({
        tenant_id: tenantId,
        grn_number: grnNumber,
        po_id: data.poId,
        vendor_id: data.vendorId,
        receipt_date: data.receiptDate || new Date().toISOString(),
        invoice_number: data.invoiceNumber,
        invoice_date: data.invoiceDate,
        warehouse_id: data.warehouseId,
        status: data.status || 'DRAFT',
        notes: data.notes,
        received_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Get vendor details for UID generation
    const { data: vendor } = await this.supabase
      .from('vendors')
      .select('code, name')
      .eq('id', data.vendorId)
      .single();

    // Get warehouse details
    const { data: warehouse } = await this.supabase
      .from('warehouses')
      .select('code, name')
      .eq('id', data.warehouseId)
      .single();

    // Insert items with auto-generated UIDs
    if (data.items && data.items.length > 0) {
      const itemsWithUIDs = [];

      for (const item of data.items) {
        // Get item details to determine entity type
        const { data: itemDetails } = await this.supabase
          .from('items')
          .select('code, name, type')
          .eq('id', item.itemId)
          .single();

        // Determine entity type based on item type
        let entityType = 'RM'; // Raw Material default
        if (itemDetails?.type === 'FINISHED') entityType = 'FG';
        else if (itemDetails?.type === 'SEMI_FINISHED') entityType = 'WIP';
        else if (itemDetails?.type === 'CONSUMABLE') entityType = 'CN';

        // Generate UID for this item
        const uid = await this.uidService.generateUID(
          'SAIF',
          warehouse?.code || 'KOL',
          entityType
        );

        // Create UID record in registry with full traceability
        const mockReq = {
          user: {
            tenantId: tenantId,
            email: 'system@grn.auto',
          }
        };

        await this.uidService.createUID(mockReq, {
          tenantCode: 'SAIF',
          plantCode: warehouse?.code || 'KOL',
          entityType: entityType,
          entity_type: entityType,
          entity_id: item.itemId,
          location: warehouse?.name || 'Main Warehouse',
          status: 'ACTIVE',
          vendor_id: data.vendorId,
          vendor_name: vendor?.name,
          vendor_code: vendor?.code,
          reference: `GRN-${grnNumber}`,
          description: itemDetails?.name,
          metadata: {
            grn_number: grnNumber,
            grn_id: grn.id,
            po_id: data.poId,
            batch_number: item.batchNumber,
            received_quantity: item.receivedQuantity,
            accepted_quantity: item.acceptedQuantity,
          }
        });

        itemsWithUIDs.push({
          grn_id: grn.id,
          item_id: item.itemId,
          po_item_id: item.poItemId,
          ordered_quantity: item.orderedQuantity,
          received_quantity: item.receivedQuantity,
          accepted_quantity: item.acceptedQuantity,
          rejected_quantity: item.rejectedQuantity,
          unit_price: item.unitPrice,
          batch_number: item.batchNumber,
          expiry_date: item.expiryDate,
          uid: uid, // Store UID reference
          notes: item.notes,
        });
      }

      const { error: itemsError } = await this.supabase
        .from('grn_items')
        .insert(itemsWithUIDs);

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    return this.findOne(tenantId, grn.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('grns')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, order_date),
        vendor:vendors(id, code, name, contact_person),
        warehouse:warehouses(id, code, name),
        received_by_user:users(id, first_name, last_name, email),
        grn_items(
          *,
          item:items(id, code, name, uom)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.poId) {
      query = query.eq('po_id', filters.poId);
    }

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters?.search) {
      query = query.or(`grn_number.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('grns')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, order_date, vendor:vendors(id, code, name)),
        vendor:vendors(id, code, name, contact_person, email, phone),
        warehouse:warehouses(id, code, name),
        received_by_user:users(id, first_name, last_name, email),
        grn_items(
          *,
          item:items(id, code, name, uom)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('GRN not found');
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('grns')
      .update({
        receipt_date: data.receiptDate,
        invoice_number: data.invoiceNumber,
        invoice_date: data.invoiceDate,
        warehouse_id: data.warehouseId,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Update items if provided
    if (data.items) {
      await this.supabase
        .from('grn_items')
        .delete()
        .eq('grn_id', id);

      if (data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          grn_id: id,
          item_id: item.itemId,
          po_item_id: item.poItemId,
          ordered_quantity: item.orderedQuantity,
          received_quantity: item.receivedQuantity,
          accepted_quantity: item.acceptedQuantity,
          rejected_quantity: item.rejectedQuantity,
          unit_price: item.unitPrice,
          batch_number: item.batchNumber,
          expiry_date: item.expiryDate,
          notes: item.notes,
        }));

        await this.supabase
          .from('grn_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async submit(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('grns')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('grns')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'GRN deleted successfully' };
  }

  private async generateGRNNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `GRN-${year}-${month}`;

    const { data } = await this.supabase
      .from('grns')
      .select('grn_number')
      .eq('tenant_id', tenantId)
      .like('grn_number', `${prefix}%`)
      .order('grn_number', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(data.grn_number.split('-').pop() || '0');
    return `${prefix}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
}
