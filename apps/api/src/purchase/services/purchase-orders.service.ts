import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PurchaseOrdersService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async create(tenantId: string, userId: string, data: any) {
    // Check if PO already exists for this PR + vendor combination to prevent duplicates
    if (data.prId && data.vendorId) {
      const { data: existingPOs, error: checkError } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number, vendor:vendors(name)')
        .eq('tenant_id', tenantId)
        .eq('pr_id', data.prId)
        .eq('vendor_id', data.vendorId)
        .limit(1);

      if (checkError) throw new BadRequestException(checkError.message);
      
      if (existingPOs && existingPOs.length > 0) {
        const vendorName = existingPOs[0].vendor?.name || 'this vendor';
        throw new BadRequestException(
          `A Purchase Order (${existingPOs[0].po_number}) already exists for this PR and ${vendorName}. Cannot create duplicate PO.`
        );
      }
    }

    // Generate PO number
    const poNumber = await this.generatePONumber(tenantId);

    const { data: po, error } = await this.supabase
      .from('purchase_orders')
      .insert({
        tenant_id: tenantId,
        po_number: poNumber,
        pr_id: data.prId,
        vendor_id: data.vendorId,
        po_date: data.poDate || new Date().toISOString().split('T')[0],
        delivery_date: data.deliveryDate,
        payment_terms: data.paymentTerms || 'NET_30',
        delivery_address: data.deliveryAddress,
        terms_and_conditions: data.termsAndConditions,
        status: data.status || 'DRAFT',
        total_amount: data.totalAmount || 0,
        tax_amount: data.taxAmount || 0,
        discount_amount: data.discountAmount || 0,
        grand_total: data.grandTotal || 0,
        remarks: data.remarks,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => {
        const baseAmount = (item.orderedQty || 0) * (item.rate || 0);
        const taxAmount = baseAmount * ((item.taxPercent || 0) / 100);
        const discountAmount = baseAmount * ((item.discountPercent || 0) / 100);
        const finalAmount = baseAmount + taxAmount - discountAmount;
        
        return {
          po_id: po.id,
          pr_item_id: item.prItemId,
          item_code: item.itemCode,
          item_name: item.itemName,
          description: item.description,
          uom: item.uom,
          ordered_qty: item.orderedQty,
          rate: item.rate,
          tax_percent: item.taxPercent || 0,
          discount_percent: item.discountPercent || 0,
          amount: item.amount || finalAmount,
          delivery_date: item.deliveryDate,
          remarks: item.remarks,
        };
      });

      const { error: itemsError } = await this.supabase
        .from('purchase_order_items')
        .insert(items);

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    return this.findOne(tenantId, po.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(id, code, name, contact_person, email),
        purchase_order_items(*)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters?.prId) {
      query = query.eq('pr_id', filters.prId);
    }

    if (filters?.search) {
      query = query.or(`po_number.ilike.%${filters.search}%,remarks.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(id, code, name, contact_person, email, phone, address),
        purchase_order_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Purchase Order not found');
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('purchase_orders')
      .update({
        vendor_id: data.vendorId,
        po_date: data.poDate || data.orderDate,
        delivery_date: data.deliveryDate || data.expectedDelivery,
        payment_terms: data.paymentTerms,
        delivery_address: data.deliveryAddress,
        remarks: data.remarks || data.notes,
        total_amount: data.totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Update items if provided
    if (data.items) {
      await this.supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_id', id);

      if (data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          po_id: id,
          item_code: item.itemCode,
          item_name: item.itemName,
          description: item.description,
          uom: item.uom,
          ordered_qty: item.orderedQty || item.quantity,
          rate: item.rate || item.unitPrice,
          tax_percent: item.taxPercent || item.taxRate || 0,
          discount_percent: item.discountPercent || 0,
          amount: item.amount || item.totalPrice,
          delivery_date: item.deliveryDate,
          remarks: item.remarks || item.specifications,
        }));

        await this.supabase
          .from('purchase_order_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    console.log('Updating PO status:', { tenantId, id, status });
    
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Status update error:', error);
      throw new BadRequestException(error.message);
    }
    
    console.log('Status updated successfully:', data);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('purchase_orders')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Purchase Order deleted successfully' };
  }

  private async generatePONumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${year}-${month}`;

    const { data } = await this.supabase
      .from('purchase_orders')
      .select('po_number')
      .eq('tenant_id', tenantId)
      .like('po_number', `${prefix}%`)
      .order('po_number', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(data.po_number.split('-').pop() || '0');
    return `${prefix}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
}
