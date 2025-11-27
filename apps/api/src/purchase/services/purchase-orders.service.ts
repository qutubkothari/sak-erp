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
    // Generate PO number
    const poNumber = await this.generatePONumber(tenantId);

    const { data: po, error } = await this.supabase
      .from('purchase_orders')
      .insert({
        tenant_id: tenantId,
        po_number: poNumber,
        vendor_id: data.vendorId,
        order_date: data.orderDate,
        expected_delivery: data.expectedDelivery,
        status: data.status || 'DRAFT',
        payment_terms: data.paymentTerms,
        delivery_address: data.deliveryAddress,
        notes: data.notes,
        total_amount: data.totalAmount,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => ({
        po_id: po.id,
        item_id: item.itemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        total_price: item.totalPrice,
        specifications: item.specifications,
      }));

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
        created_by_user:users(id, first_name, last_name, email),
        purchase_order_items(
          *,
          item:items(id, code, name, uom)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters?.search) {
      query = query.or(`po_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

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
        created_by_user:users(id, first_name, last_name, email),
        purchase_order_items(
          *,
          item:items(id, code, name, uom)
        )
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
        order_date: data.orderDate,
        expected_delivery: data.expectedDelivery,
        payment_terms: data.paymentTerms,
        delivery_address: data.deliveryAddress,
        notes: data.notes,
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
          item_id: item.itemId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || 0,
          total_price: item.totalPrice,
          specifications: item.specifications,
        }));

        await this.supabase
          .from('purchase_order_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const { error } = await this.supabase
      .from('purchase_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
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
