import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';

@Injectable()
export class SalesService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  // ==================== CUSTOMERS ====================
  
  async getCustomers(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters?.customer_type) {
      query = query.eq('customer_type', filters.customer_type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('customer_name');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createCustomer(req: Request, customerData: any) {
    const { tenantId, userId } = req.user as any;

    console.log('Creating customer with tenantId:', tenantId);
    
    const customerCode = await this.generateCustomerCode(req);
    console.log('Generated customer code:', customerCode);

    const customer = {
      tenant_id: tenantId,
      customer_code: customerCode,
      customer_name: customerData.customer_name,
      customer_type: customerData.customer_type || 'REGULAR',
      contact_person: customerData.contact_person,
      email: customerData.email,
      phone: customerData.phone,
      mobile: customerData.mobile,
      gst_number: customerData.gst_number,
      pan_number: customerData.pan_number,
      billing_address: customerData.billing_address,
      shipping_address: customerData.shipping_address,
      city: customerData.city,
      state: customerData.state,
      country: customerData.country || 'India',
      pincode: customerData.pincode,
      credit_limit: customerData.credit_limit || 0,
      credit_days: customerData.credit_days || 30,
      is_active: true,
    };

    console.log('Inserting customer:', JSON.stringify(customer, null, 2));

    const { data, error } = await this.supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) {
      console.error('Customer creation error:', error);
      throw new BadRequestException(error.message);
    }
    
    console.log('Customer created successfully:', data);
    return data;
  }

  private async generateCustomerCode(req: Request): Promise<string> {
    const { tenantId } = req.user as any;

    const { count, error } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error counting customers:', error);
    }

    const code = `CUST-${String((count || 0) + 1).padStart(5, '0')}`;
    console.log('Generated customer code:', code, 'from count:', count);
    return code;
  }

  private prepareQuotationItems(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Quotation must include at least one item');
    }

    let totalAmount = 0;
    const preparedItems = items.map((item: any, index: number) => {
      if (!item.item_id) {
        throw new BadRequestException(`Quotation item ${index + 1} is missing item selection`);
      }

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const baseAmount = quantity * unitPrice;
      const discountPercentage = item.discount_percentage !== undefined
        ? Number(item.discount_percentage)
        : 0;

      let discountAmount = item.discount_amount !== undefined
        ? Number(item.discount_amount)
        : (baseAmount * discountPercentage) / 100;

      if (Number.isNaN(discountAmount)) {
        discountAmount = 0;
      }

      const lineTotal = Math.max(baseAmount - discountAmount, 0);
      const taxPercentage = item.tax_percentage !== undefined
        ? Number(item.tax_percentage)
        : 18;
      const taxAmount = (lineTotal * taxPercentage) / 100;
      totalAmount += lineTotal + taxAmount;

      return {
        item_id: item.item_id,
        item_description: item.item_description || '',
        quantity,
        unit_price: unitPrice,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        line_total: lineTotal,
        delivery_days: item.delivery_days,
        notes: item.notes,
      };
    });

    return { preparedItems, totalAmount };
  }

  // ==================== QUOTATIONS ====================
  
  async getQuotations(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('quotations')
      .select(`
        *,
        customers:customer_id(id, customer_code, customer_name, contact_person)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    const { data, error } = await query.order('quotation_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    
    // Flatten customer data for frontend
    const formattedData = data?.map((q: any) => ({
      ...q,
      customer_name: q.customers?.customer_name || null,
      customer_code: q.customers?.customer_code || null,
    }));
    
    return formattedData;
  }

  async createQuotation(req: Request, quotationData: any) {
    const { tenantId, userId } = req.user as any;

    const quotationNumber = await this.generateQuotationNumber(req);

    const { preparedItems, totalAmount } = this.prepareQuotationItems(quotationData.items || []);

    const discountAmount = quotationData.discount_amount || 0;
    const netAmount = totalAmount - discountAmount;

    const quotation = {
      tenant_id: tenantId,
      quotation_number: quotationNumber,
      customer_id: quotationData.customer_id,
      quotation_date: quotationData.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: quotationData.valid_until,
      status: 'DRAFT',
      total_amount: totalAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      payment_terms: quotationData.payment_terms,
      delivery_terms: quotationData.delivery_terms,
      notes: quotationData.notes,
      terms_conditions: quotationData.terms_conditions,
      created_by: userId,
    };

    const { data: quotationRecord, error: quotationError } = await this.supabase
      .from('quotations')
      .insert(quotation)
      .select()
      .single();

    if (quotationError) throw new BadRequestException(quotationError.message);

    // Insert quotation items
    const quotationItems = preparedItems.map((item: any) => ({
      quotation_id: quotationRecord.id,
      item_id: item.item_id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount || 0,
      tax_percentage: item.tax_percentage || 18,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
      delivery_days: item.delivery_days,
      notes: item.notes,
    }));

    const { error: itemsError } = await this.supabase
      .from('quotation_items')
      .insert(quotationItems);

    if (itemsError) throw new BadRequestException(itemsError.message);

    return quotationRecord;
  }

  async getQuotationById(req: Request, quotationId: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('quotations')
      .select(`
        *,
        customers:customer_id(id, customer_code, customer_name, contact_person, email, phone),
        quotation_items(*)
      `)
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Quotation not found');
    }

    return {
      ...data,
      customer_name: data.customers?.customer_name || null,
      customer_code: data.customers?.customer_code || null,
    };
  }

  async updateQuotation(req: Request, quotationId: string, quotationData: any) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Quotation not found');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotations can be edited');
    }

    const { preparedItems, totalAmount } = this.prepareQuotationItems(quotationData.items || []);
    const discountAmount = quotationData.discount_amount ? Number(quotationData.discount_amount) : 0;
    const netAmount = totalAmount - discountAmount;

    const { data: updatedQuotation, error: quotationError } = await this.supabase
      .from('quotations')
      .update({
        customer_id: quotationData.customer_id,
        quotation_date: quotationData.quotation_date,
        valid_until: quotationData.valid_until,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        payment_terms: quotationData.payment_terms,
        delivery_terms: quotationData.delivery_terms,
        notes: quotationData.notes,
        terms_conditions: quotationData.terms_conditions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (quotationError) {
      throw new BadRequestException(quotationError.message);
    }

    const { error: deleteError } = await this.supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', quotationId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    const quotationItems = preparedItems.map((item: any) => ({
      quotation_id: quotationId,
      item_id: item.item_id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      tax_percentage: item.tax_percentage,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
      delivery_days: item.delivery_days,
      notes: item.notes,
    }));

    const { error: itemsError } = await this.supabase
      .from('quotation_items')
      .insert(quotationItems);

    if (itemsError) {
      throw new BadRequestException(itemsError.message);
    }

    return updatedQuotation;
  }

  async approveQuotation(req: Request, quotationId: string) {
    const { tenantId, userId } = req.user as any;

    const { error } = await this.supabase
      .from('quotations')
      .update({
        status: 'APPROVED',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Quotation approved successfully' };
  }

  async convertQuotationToSO(req: Request, quotationId: string) {
    const { tenantId, userId } = req.user as any;

    // Get quotation with items
    const { data: quotation } = await this.supabase
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== 'APPROVED') {
      throw new BadRequestException('Only approved quotations can be converted to sales orders');
    }

    // Create sales order
    const soNumber = await this.generateSONumber(req);

    const salesOrder = {
      tenant_id: tenantId,
      so_number: soNumber,
      quotation_id: quotationId,
      customer_id: quotation.customer_id,
      order_date: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
      total_amount: quotation.total_amount,
      discount_amount: quotation.discount_amount,
      net_amount: quotation.net_amount,
      balance_amount: quotation.net_amount,
      payment_terms: quotation.payment_terms,
      delivery_terms: quotation.delivery_terms,
      notes: quotation.notes,
      created_by: userId,
    };

    const { data: soRecord, error: soError } = await this.supabase
      .from('sales_orders')
      .insert(salesOrder)
      .select()
      .single();

    if (soError) throw new BadRequestException(soError.message);

    // Insert sales order items
    const soItems = quotation.quotation_items.map((item: any) => ({
      sales_order_id: soRecord.id,
      item_id: item.item_id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      tax_percentage: item.tax_percentage,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
      notes: item.notes,
    }));

    const { error: itemsError } = await this.supabase
      .from('sales_order_items')
      .insert(soItems);

    if (itemsError) throw new BadRequestException(itemsError.message);

    // Update quotation status
    await this.supabase
      .from('quotations')
      .update({
        status: 'CONVERTED',
        converted_to_so_id: soRecord.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', quotationId);

    return soRecord;
  }

  private async generateQuotationNumber(req: Request): Promise<string> {
    const { tenantId } = req.user as any;

    const { count } = await this.supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `QT-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  // ==================== SALES ORDERS ====================
  
  async getSalesOrders(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('sales_orders')
      .select(`
        *,
        customers:customer_id(id, customer_code, customer_name, contact_person)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    const { data, error } = await query.order('order_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    
    // Flatten customer data for frontend
    const formattedData = data?.map((so: any) => ({
      ...so,
      customer_name: so.customers?.customer_name || null,
      customer_code: so.customers?.customer_code || null,
    }));
    
    return formattedData;
  }

  async getSalesOrderById(req: Request, soId: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('sales_orders')
      .select(`
        *,
        customers:customer_id(id, customer_code, customer_name, contact_person, email, phone),
        sales_order_items(*)
      `)
      .eq('id', soId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async generateSONumber(req: Request): Promise<string> {
    const { tenantId } = req.user as any;

    const { count } = await this.supabase
      .from('sales_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `SO-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  // ==================== DISPATCH ====================
  
  async createDispatch(req: Request, dispatchData: any) {
    const { tenantId, userId } = req.user as any;

    // Get sales order to extract customer_id
    const { data: salesOrder } = await this.supabase
      .from('sales_orders')
      .select('customer_id')
      .eq('id', dispatchData.sales_order_id)
      .single();

    if (!salesOrder) throw new NotFoundException('Sales order not found');

    const dnNumber = await this.generateDNNumber(req);

    const dispatch = {
      tenant_id: tenantId,
      dn_number: dnNumber,
      sales_order_id: dispatchData.sales_order_id,
      customer_id: salesOrder.customer_id,
      dispatch_date: dispatchData.dispatch_date || new Date().toISOString().split('T')[0],
      transporter_name: dispatchData.transporter_name,
      vehicle_number: dispatchData.vehicle_number,
      lr_number: dispatchData.lr_number,
      lr_date: dispatchData.lr_date,
      delivery_address: dispatchData.delivery_address,
      notes: dispatchData.notes,
      created_by: userId,
    };

    const { data: dispatchRecord, error: dispatchError } = await this.supabase
      .from('dispatch_notes')
      .insert(dispatch)
      .select()
      .single();

    if (dispatchError) throw new BadRequestException(dispatchError.message);

    // Insert dispatch items with UID assignment
    const dispatchItems = dispatchData.items.map((item: any) => ({
      dispatch_note_id: dispatchRecord.id,
      sales_order_item_id: item.sales_order_item_id,
      item_id: item.item_id,
      uid: item.uid, // UID of the dispatched product
      quantity: item.quantity,
      batch_number: item.batch_number,
      serial_number: item.serial_number,
      notes: item.notes,
    }));

    const { error: itemsError } = await this.supabase
      .from('dispatch_items')
      .insert(dispatchItems);

    if (itemsError) throw new BadRequestException(itemsError.message);

    // ✅ CRITICAL FIX: Reduce stock for dispatched items
    await this.reduceStockForDispatch(tenantId, dispatchData.items, dispatchRecord.dn_number);

    // Update sales order item dispatched quantities
    for (const item of dispatchData.items) {
      const { data: soItem } = await this.supabase
        .from('sales_order_items')
        .select('dispatched_quantity')
        .eq('id', item.sales_order_item_id)
        .single();

      if (soItem) {
        await this.supabase
          .from('sales_order_items')
          .update({
            dispatched_quantity: (soItem.dispatched_quantity || 0) + item.quantity,
          })
          .eq('id', item.sales_order_item_id);
      }
    }

    // Update sales order status
    await this.supabase
      .from('sales_orders')
      .update({ status: 'DISPATCHED' })
      .eq('id', dispatchData.sales_order_id);

    // Create warranties for dispatched items
    await this.createWarrantiesForDispatch(req, dispatchRecord.id, {
      ...dispatchData,
      customer_id: salesOrder.customer_id,
    });

    return dispatchRecord;
  }

  private async generateDNNumber(req: Request): Promise<string> {
    const { tenantId } = req.user as any;

    const { count } = await this.supabase
      .from('dispatch_notes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `DN-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  /**
   * 🔧 CRITICAL FIX: Reduce stock when items are dispatched
   * This was missing and causing inventory to never decrease on sales!
   */
  private async reduceStockForDispatch(
    tenantId: string,
    dispatchItems: any[],
    dispatchNumber: string
  ) {
    for (const item of dispatchItems) {
      // Get current stock entry
      const { data: stockEntry, error: stockError } = await this.supabase
        .from('stock_entries')
        .select('quantity, available_quantity, warehouse_id')
        .eq('tenant_id', tenantId)
        .eq('item_id', item.item_id)
        .maybeSingle();

      if (stockError) {
        throw new BadRequestException(`Error checking stock for item ${item.item_id}: ${stockError.message}`);
      }

      if (!stockEntry) {
        throw new BadRequestException(
          `No stock available for item ${item.item_id}. Please receive inventory first.`
        );
      }

      if (stockEntry.available_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for item ${item.item_id}. ` +
          `Available: ${stockEntry.available_quantity}, Required: ${item.quantity}`
        );
      }

      // Reduce stock quantities
      const { error: updateError } = await this.supabase
        .from('stock_entries')
        .update({
          quantity: stockEntry.quantity - item.quantity,
          available_quantity: stockEntry.available_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('item_id', item.item_id)
        .eq('warehouse_id', stockEntry.warehouse_id);

      if (updateError) {
        throw new BadRequestException(`Error reducing stock: ${updateError.message}`);
      }

      // Create stock movement record for audit trail
      await this.supabase
        .from('stock_movements')
        .insert({
          tenant_id: tenantId,
          movement_type: 'OUTBOUND',
          item_id: item.item_id,
          uid: item.uid,
          from_warehouse_id: stockEntry.warehouse_id,
          quantity: item.quantity,
          reference_type: 'DISPATCH',
          reference_number: dispatchNumber,
          notes: `Dispatched via ${dispatchNumber} to customer`,
          movement_date: new Date().toISOString(),
        });

      console.log(
        `✅ Stock reduced for item ${item.item_id}: -${item.quantity} units (DN: ${dispatchNumber})`
      );
    }
  }

  // ==================== WARRANTY ====================
  
  private async createWarrantiesForDispatch(req: Request, dispatchNoteId: string, dispatchData: any) {
    const { tenantId } = req.user as any;

    const { data: dispatchItems } = await this.supabase
      .from('dispatch_items')
      .select('*')
      .eq('dispatch_note_id', dispatchNoteId);

    if (!dispatchItems || dispatchItems.length === 0) return;

    const warranties = dispatchItems.map((item: any) => {
      const warrantyStartDate = dispatchData.dispatch_date || new Date().toISOString().split('T')[0];
      const warrantyDurationMonths = dispatchData.warranty_duration_months || 12;
      const warrantyEndDate = this.calculateWarrantyEndDate(warrantyStartDate, warrantyDurationMonths);

      return {
        tenant_id: tenantId,
        warranty_number: `WR-${item.uid}`,
        uid: item.uid,
        sales_order_id: dispatchData.sales_order_id,
        dispatch_item_id: item.id,
        customer_id: dispatchData.customer_id,
        item_id: item.item_id,
        warranty_start_date: warrantyStartDate,
        warranty_duration_months: warrantyDurationMonths,
        warranty_end_date: warrantyEndDate,
        warranty_type: dispatchData.warranty_type || 'STANDARD',
        covered_components: dispatchData.covered_components,
        warranty_terms: dispatchData.warranty_terms,
        status: 'ACTIVE',
      };
    });

    const { error } = await this.supabase
      .from('warranties')
      .insert(warranties);

    if (error) throw new BadRequestException(error.message);
  }

  private calculateWarrantyEndDate(startDate: string, durationMonths: number): string {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split('T')[0];
  }

  async getWarranties(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('warranties')
      .select(`
        *,
        customers:customer_id(customer_code, customer_name, contact_person)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    const { data, error } = await query.order('warranty_start_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    
    // Flatten customer data for frontend
    const formattedData = data?.map((w: any) => ({
      ...w,
      customer_name: w.customers?.customer_name || null,
      customer_code: w.customers?.customer_code || null,
    }));
    
    return formattedData;
  }

  async validateWarranty(req: Request, uid: string) {
    const { tenantId } = req.user as any;

    const { data: warranty } = await this.supabase
      .from('warranties')
      .select('*')
      .eq('uid', uid)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .single();

    if (!warranty) {
      return { valid: false, message: 'No active warranty found for this UID' };
    }

    const today = new Date().toISOString().split('T')[0];
    if (today > warranty.warranty_end_date) {
      return { valid: false, message: 'Warranty has expired', warranty };
    }

    return { valid: true, message: 'Warranty is active', warranty };
  }

  async getDispatchNotes(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('dispatch_notes')
      .select(`
        *,
        sales_orders:sales_order_id(so_number),
        customers:customer_id(customer_code, customer_name)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.sales_order_id) {
      query = query.eq('sales_order_id', filters.sales_order_id);
    }

    const { data, error } = await query.order('dispatch_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    
    // Flatten nested data for frontend
    const formattedData = data?.map((dn: any) => ({
      ...dn,
      so_number: dn.sales_orders?.so_number || null,
      customer_name: dn.customers?.customer_name || null,
      customer_code: dn.customers?.customer_code || null,
    }));
    
    return formattedData;
  }
}
