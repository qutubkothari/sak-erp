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
    // Check if GRN already exists for this PO
    const { data: existingGRN } = await this.supabase
      .from('grn')
      .select('id, grn_number')
      .eq('tenant_id', tenantId)
      .eq('po_id', data.poId)
      .maybeSingle();

    if (existingGRN) {
      throw new BadRequestException(
        `GRN already exists for this Purchase Order (${existingGRN.grn_number}). Cannot create multiple receipts for the same PO.`
      );
    }

    // Generate GRN number
    const grnNumber = await this.generateGRNNumber(tenantId);

    const { data: grn, error} = await this.supabase
      .from('grn')
      .insert({
        tenant_id: tenantId,
        grn_number: grnNumber,
        po_id: data.poId,
        vendor_id: data.vendorId,
        grn_date: data.grnDate || new Date().toISOString().split('T')[0],
        invoice_number: data.invoiceNumber,
        invoice_date: data.invoiceDate,
        warehouse_id: data.warehouseId,
        status: data.status || 'DRAFT',
        remarks: data.remarks,
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

    // Insert GRN items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => ({
        grn_id: grn.id,
        po_item_id: item.poItemId,
        item_code: item.itemCode,
        item_name: item.itemName,
        description: item.description,
        uom: item.uom,
        ordered_qty: item.orderedQty,
        received_qty: item.receivedQty,
        accepted_qty: item.acceptedQty || 0,
        rejected_qty: item.rejectedQty || 0,
        inspection_status: item.inspectionStatus || 'PENDING',
        inspection_remarks: item.inspectionRemarks,
        batch_number: item.batchNumber,
        manufacturing_date: item.manufacturingDate,
        expiry_date: item.expiryDate,
        rate: item.rate,
        amount: (item.receivedQty || 0) * (item.rate || 0),
        remarks: item.remarks,
      }));

      const { error: itemsError } = await this.supabase
        .from('grn_items')
        .insert(items);

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    // Calculate totals
    await this.updateGRNTotals(grn.id);

    return this.findOne(tenantId, grn.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('grn')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, po_date),
        vendor:vendors(id, code, name, contact_person),
        warehouse:warehouses(id, code, name),
        grn_items(*)
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
      .from('grn')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, po_date),
        vendor:vendors(id, code, name, contact_person, email, phone),
        warehouse:warehouses(id, code, name),
        grn_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('GRN not found');
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('grn')
      .update({
        grn_date: data.grnDate,
        invoice_number: data.invoiceNumber,
        invoice_date: data.invoiceDate,
        warehouse_id: data.warehouseId,
        remarks: data.remarks,
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

  async submit(tenantId: string, id: string, userId: string) {
    // Get GRN details with items
    const grn = await this.findOne(tenantId, id);
    
    // Update GRN status
    const { error } = await this.supabase
      .from('grn')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Auto-generate UIDs for accepted items
    if (grn.grn_items && grn.grn_items.length > 0) {
      for (const item of grn.grn_items) {
        if (item.accepted_qty > 0) {
          await this.generateUIDsForItem(tenantId, userId, grn, item);
        }
      }
    }

    return this.findOne(tenantId, id);
  }

  private async generateUIDsForItem(tenantId: string, userId: string, grn: any, grnItem: any) {
    try {
      const acceptedQty = grnItem.accepted_qty || 0;
      const uidsCreated = [];

      // Get item details
      const { data: item } = await this.supabase
        .from('items')
        .select('id, code, name, category')
        .eq('code', grnItem.item_code)
        .single();

      if (!item) return; // Skip if item not found

      // Determine entity type based on item category
      let entityType = 'RM'; // Raw Material
      if (item.category?.includes('COMPONENT')) entityType = 'CP';
      else if (item.category?.includes('FINISHED')) entityType = 'FG';
      else if (item.category?.includes('ASSEMBLY')) entityType = 'SA';

      // Generate UIDs for accepted quantity
      for (let i = 0; i < acceptedQty; i++) {
        // Generate UID using the UID service
        const uid = await this.uidService.generateUID(
          'SAIF', // tenant code - you may want to fetch this from tenant table
          'MFG',  // plant code
          entityType,
        );

        // Create UID record with complete purchase trail
        const { error: uidError } = await this.supabase
          .from('uid_registry')
          .insert({
            tenant_id: tenantId,
            uid: uid,
            entity_type: entityType,
            entity_id: item.id,
            supplier_id: grn.vendor_id,
            purchase_order_id: grn.po_id,
            grn_id: grn.id,
            batch_number: grnItem.batch_number,
            location: grn.warehouse?.name || 'Warehouse',
            status: 'ACTIVE',
            lifecycle: JSON.stringify([
              {
                stage: 'RECEIVED',
                timestamp: new Date().toISOString(),
                location: grn.warehouse?.name || 'Warehouse',
                reference: `GRN ${grn.grn_number}`,
                user: userId,
              },
            ]),
            metadata: JSON.stringify({
              item_code: grnItem.item_code,
              item_name: grnItem.item_name,
              grn_item_id: grnItem.id,
              manufacturing_date: grnItem.manufacturing_date,
              expiry_date: grnItem.expiry_date,
              invoice_number: grn.invoice_number,
            }),
          });

        if (!uidError) {
          uidsCreated.push(uid);
        }
      }

      console.log(`Generated ${uidsCreated.length} UIDs for GRN ${grn.grn_number}, Item: ${grnItem.item_code}`);
      return uidsCreated;
    } catch (error) {
      console.error('Error generating UIDs:', error);
      // Don't throw - allow GRN to be submitted even if UID generation fails
      return [];
    }
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('grn')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'GRN deleted successfully' };
  }

  async generateUIDs(tenantId: string, grnItemId: string, data: any) {
    // Get GRN item details
    const { data: grnItem, error } = await this.supabase
      .from('grn_items')
      .select('*')
      .eq('id', grnItemId)
      .single();

    if (error || !grnItem) {
      throw new NotFoundException('GRN item not found');
    }

    // Call the stored function to generate UIDs
    const { data: result, error: generateError } = await this.supabase
      .rpc('generate_uids_for_grn_item', {
        p_grn_item_id: grnItemId,
        p_tenant_id: tenantId,
        p_item_code: grnItem.item_code,
        p_item_name: grnItem.item_name,
        p_batch_number: grnItem.batch_number,
        p_manufacturing_date: grnItem.manufacturing_date,
        p_accepted_qty: data.acceptedQty || grnItem.accepted_qty,
        p_warranty_months: data.warrantyMonths || 12,
      });

    if (generateError) {
      throw new BadRequestException(generateError.message);
    }

    // Get generated UIDs
    const { data: uids } = await this.supabase
      .from('uids')
      .select('*')
      .eq('grn_item_id', grnItemId);

    return {
      grnItemId,
      uidsGenerated: result,
      uids: uids || [],
    };
  }

  async getUIDsByGRN(tenantId: string, grnId: string) {
    const { data, error } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('grn_id', grnId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  private async updateGRNTotals(grnId: string) {
    // Get sum of quantities from items
    const { data: items } = await this.supabase
      .from('grn_items')
      .select('received_qty, accepted_qty, rejected_qty')
      .eq('grn_id', grnId);

    if (items && items.length > 0) {
      const totals = items.reduce(
        (acc, item) => ({
          total: acc.total + (parseFloat(item.received_qty) || 0),
          accepted: acc.accepted + (parseFloat(item.accepted_qty) || 0),
          rejected: acc.rejected + (parseFloat(item.rejected_qty) || 0),
        }),
        { total: 0, accepted: 0, rejected: 0 }
      );

      await this.supabase
        .from('grn')
        .update({
          total_quantity: totals.total,
          accepted_quantity: totals.accepted,
          rejected_quantity: totals.rejected,
        })
        .eq('id', grnId);
    }
  }

  private async generateGRNNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `GRN-${year}-${month}`;

    const { data } = await this.supabase
      .from('grn')
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
