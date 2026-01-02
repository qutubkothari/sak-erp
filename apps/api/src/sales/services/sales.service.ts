import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { EmailService } from '../../email/email.service';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

@Injectable()
export class SalesService {
  private supabase: SupabaseClient;

  constructor(
    private emailService: EmailService,
    private uidSupabaseService: UidSupabaseService,
  ) {
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

  async updateCustomer(req: Request, customerId: string, customerData: any) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Customer not found');

    const updatePayload: any = {
      customer_name: customerData.customer_name,
      customer_type: customerData.customer_type,
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
      country: customerData.country,
      pincode: customerData.pincode,
      credit_limit: customerData.credit_limit,
      credit_days: customerData.credit_days,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteCustomer(req: Request, customerId: string) {
    const { tenantId } = req.user as any;

    // Soft delete to avoid breaking references
    const { data, error } = await this.supabase
      .from('customers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Customer not found');
    return { message: 'Customer deactivated successfully' };
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

  async deleteQuotation(req: Request, quotationId: string) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Quotation not found');
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotations can be deleted');
    }

    const { error: itemsError } = await this.supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', quotationId);

    if (itemsError) throw new BadRequestException(itemsError.message);

    const { error: deleteError } = await this.supabase
      .from('quotations')
      .delete()
      .eq('id', quotationId)
      .eq('tenant_id', tenantId);

    if (deleteError) throw new BadRequestException(deleteError.message);
    return { message: 'Quotation deleted successfully' };
  }

  async convertQuotationToSO(req: Request, quotationId: string, conversionData?: any) {
    const { tenantId, userId } = req.user as any;

    // Get quotation with items
    const { data: quotation } = await this.supabase
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!quotation) throw new NotFoundException('Quotation not found');
    
    // Allow APPROVED or PARTIALLY_CONVERTED quotations
    if (!['APPROVED', 'PARTIALLY_CONVERTED'].includes(quotation.status)) {
      throw new BadRequestException('Only approved or partially converted quotations can be converted to sales orders');
    }

    // Validate partial conversion quantities if provided
    const itemsToConvert = (conversionData?.items || quotation.quotation_items.map((item: any) => ({
      quotation_item_id: item.id,
      quantity: (Number(item.quantity) || 0) - (Number(item.converted_quantity) || 0), // remaining qty
    }))).map((item: any) => ({
      quotation_item_id: item.quotation_item_id,
      quantity: Number(item.quantity) || 0,
    }));

    // Validate each item
    for (const convItem of itemsToConvert) {
      const quotItem = quotation.quotation_items.find((qi: any) => qi.id === convItem.quotation_item_id);
      if (!quotItem) {
        throw new BadRequestException(`Quotation item ${convItem.quotation_item_id} not found`);
      }
      
      const pendingQty = quotItem.quantity - (quotItem.converted_quantity || 0);
      if (convItem.quantity > pendingQty) {
        throw new BadRequestException(
          `Cannot convert ${convItem.quantity} of item ${quotItem.item_description}. Only ${pendingQty} remaining.`
        );
      }
      
      if (convItem.quantity <= 0) {
        throw new BadRequestException(`Quantity must be greater than 0 for item ${quotItem.item_description}`);
      }
    }

    // Create sales order
    const soNumber = await this.generateSONumber(req);

    const advanceAmount = Number(conversionData?.advance_amount || 0) || 0;

    // Calculate totals based on items being converted
    let soTotalAmount = 0;
    const soItems = itemsToConvert.map((convItem: any) => {
      const quotItem = quotation.quotation_items.find((qi: any) => qi.id === convItem.quotation_item_id);
      
      // Proportional calculation based on quantity
      const quoteQty = Number(quotItem.quantity) || 0;
      const ratio = quoteQty > 0 ? (Number(convItem.quantity) || 0) / quoteQty : 0;
      const lineTotal = quotItem.line_total * ratio;
      const taxAmount = quotItem.tax_amount * ratio;
      const discountAmount = quotItem.discount_amount * ratio;
      
      soTotalAmount += lineTotal + taxAmount;
      
      return {
        sales_order_id: null, // Will be set after SO creation
        item_id: quotItem.item_id,
        item_description: quotItem.item_description,
        quantity: Number(convItem.quantity) || 0,
        unit_price: quotItem.unit_price,
        discount_amount: discountAmount,
        tax_percentage: quotItem.tax_percentage,
        tax_amount: taxAmount,
        line_total: lineTotal,
        notes: quotItem.notes,
      };
    });

    const salesOrder = {
      tenant_id: tenantId,
      so_number: soNumber,
      quotation_id: quotationId,
      customer_id: quotation.customer_id,
      order_date: conversionData?.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: conversionData?.expected_delivery_date || null,
      status: 'CONFIRMED',
      total_amount: soTotalAmount,
      discount_amount: 0,
      net_amount: soTotalAmount,
      balance_amount: soTotalAmount - advanceAmount,
      advance_paid: advanceAmount,
      payment_terms: conversionData?.payment_terms || quotation.payment_terms,
      delivery_terms: quotation.delivery_terms,
      notes: conversionData?.special_instructions || quotation.notes,
      created_by: userId,
    };

    const { data: soRecord, error: soError } = await this.supabase
      .from('sales_orders')
      .insert(salesOrder)
      .select()
      .single();

    if (soError) throw new BadRequestException(soError.message);

    // Update SO items with the correct sales_order_id (and ensure only schema fields are sent)
    const soItemsWithId = soItems.map((item: any) => ({
      ...item,
      sales_order_id: soRecord.id,
    }));

    const { error: itemsError } = await this.supabase
      .from('sales_order_items')
      .insert(soItemsWithId);

    if (itemsError) throw new BadRequestException(itemsError.message);

    // Update converted_quantity for each quotation item
    for (const convItem of itemsToConvert) {
      const quotItem = quotation.quotation_items.find((qi: any) => qi.id === convItem.quotation_item_id);
      const newConvertedQty = (quotItem.converted_quantity || 0) + convItem.quantity;
      
      await this.supabase
        .from('quotation_items')
        .update({ converted_quantity: newConvertedQty })
        .eq('id', convItem.quotation_item_id);
    }

    // Check if quotation is fully converted
    const { data: updatedItems } = await this.supabase
      .from('quotation_items')
      .select('quantity, converted_quantity')
      .eq('quotation_id', quotationId);

    const allFullyConverted = updatedItems && updatedItems.every(
      (item: any) => (item.converted_quantity || 0) >= item.quantity
    );

    // Update quotation status
    const newStatus = allFullyConverted ? 'CONVERTED' : 'PARTIALLY_CONVERTED';
    await this.supabase
      .from('quotations')
      .update({
        status: newStatus,
        converted_to_so_id: allFullyConverted ? soRecord.id : quotation.converted_to_so_id,
        converted_at: allFullyConverted ? new Date().toISOString() : quotation.converted_at,
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

  async updateSalesOrder(req: Request, soId: string, soData: any) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('sales_orders')
      .select('id')
      .eq('id', soId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Sales order not found');

    const updatePayload: any = {
      expected_delivery_date: soData.expected_delivery_date,
      payment_terms: soData.payment_terms,
      delivery_terms: soData.delivery_terms,
      notes: soData.notes,
      status: soData.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('sales_orders')
      .update(updatePayload)
      .eq('id', soId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteSalesOrder(req: Request, soId: string) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('sales_orders')
      .select('id')
      .eq('id', soId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Sales order not found');

    const { data: dispatchExists, error: dispatchError } = await this.supabase
      .from('dispatch_notes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sales_order_id', soId)
      .limit(1);

    if (dispatchError) throw new BadRequestException(dispatchError.message);
    if (dispatchExists && dispatchExists.length > 0) {
      throw new BadRequestException('Cannot delete sales order with dispatch notes');
    }

    const { error: itemsError } = await this.supabase
      .from('sales_order_items')
      .delete()
      .eq('sales_order_id', soId);

    if (itemsError) throw new BadRequestException(itemsError.message);

    const { error } = await this.supabase
      .from('sales_orders')
      .delete()
      .eq('id', soId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Sales order deleted successfully' };
  }

  async sendSalesOrderEmail(req: Request, soId: string) {
    const { tenantId } = req.user as any;

    const { data: so, error } = await this.supabase
      .from('sales_orders')
      .select(`
        *,
        customers:customer_id(
          id,
          customer_name,
          contact_person,
          email,
          contact_email,
          shipping_address,
          billing_address
        ),
        sales_order_items(*)
      `)
      .eq('id', soId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!so) throw new NotFoundException('Sales order not found');

    const customer = (so as any).customers;
    const toEmail = customer?.contact_email || customer?.email;
    if (!toEmail) {
      throw new BadRequestException('Customer email not found for this sales order');
    }

    const soItems = Array.isArray((so as any).sales_order_items) ? (so as any).sales_order_items : [];

    const itemIds = Array.from(
      new Set(
        soItems
          .map((i: any) => i?.item_id)
          .filter((id: any) => typeof id === 'string' && id.length > 0),
      ),
    );

    const itemMetaById = new Map<string, { code?: string; name?: string }>();
    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('items')
        .select('id, code, name')
        .in('id', itemIds)
        .eq('tenant_id', tenantId);

      if (!itemsError && Array.isArray(itemsData)) {
        for (const item of itemsData as any[]) {
          if (item?.id) itemMetaById.set(item.id, { code: item.code, name: item.name });
        }
      }
    }

    const emailItems = soItems.map((item: any) => {
      const quantity = Number(item?.quantity) || 0;
      const unitPrice = Number(item?.unit_price) || 0;
      const amount = item?.line_total !== undefined && item?.line_total !== null
        ? Number(item.line_total) || 0
        : quantity * unitPrice;

      const meta = item?.item_id ? itemMetaById.get(item.item_id) : undefined;
      const metaName = meta?.name ? `${meta.code ? `${meta.code} - ` : ''}${meta.name}` : '';
      const itemName = metaName || item?.item_description || 'Item';

      return {
        item_name: itemName,
        quantity,
        unit_price: unitPrice,
        amount,
      };
    });

    const totalAmount = Number(
      (so as any).net_amount ??
      (so as any).total_amount ??
      emailItems.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0),
    );

    const soData = {
      so_number: (so as any).so_number,
      customer_name: customer?.customer_name || '',
      order_date: (so as any).order_date,
      delivery_date: (so as any).expected_delivery_date || (so as any).delivery_date,
      payment_terms: (so as any).payment_terms,
      shipping_address:
        (so as any).shipping_address || customer?.shipping_address || customer?.billing_address,
      total_amount: totalAmount,
      items: emailItems,
    };

    await this.emailService.sendSO(toEmail, soData);

    return {
      message: 'Sales order email sent successfully',
      to: toEmail,
    };
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

    // Validate dispatched UIDs are saleable (QC PASSED) before inserting dispatch items
    const dispatchedUids = Array.from(
      new Set<string>(
        (dispatchData.items || [])
          .flatMap((i: any) => {
            const uids = Array.isArray(i?.uid) ? i.uid : (i?.uid ? [i.uid] : []);
            return uids.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
          })
      )
    );

    if (dispatchedUids.length > 0) {
      const { data: uidRows, error: uidFetchError } = await this.supabase
        .from('uid_registry')
        .select('uid, status, quality_status')
        .eq('tenant_id', tenantId)
        .in('uid', dispatchedUids);

      if (uidFetchError) throw new BadRequestException(uidFetchError.message);

      const byUid = new Map((uidRows || []).map((r: any) => [r.uid, r]));
      const missing = dispatchedUids.filter((u) => !byUid.has(u));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Some UIDs are invalid/not found: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`
        );
      }

      const notSaleable = dispatchedUids.filter((u) => {
        const row: any = byUid.get(u);
        const status = String(row?.status || '');
        const quality = String(row?.quality_status || '');
        const statusOk = status === 'IN_STOCK';
        const qualityOk = quality === 'PASSED';
        return !(statusOk && qualityOk);
      });

      if (notSaleable.length > 0) {
        throw new BadRequestException(
          `Some UIDs are not saleable (must be QC PASSED and IN_STOCK): ${notSaleable.slice(0, 10).join(', ')}${notSaleable.length > 10 ? '...' : ''}`
        );
      }
    }

    // Insert dispatch items with UID assignment
    // Each item can have multiple UIDs, so we create one dispatch_item per UID
    const dispatchItems = dispatchData.items.flatMap((item: any) => {
      const uids = Array.isArray(item.uid) ? item.uid : (item.uid ? [item.uid] : []);
      
      // If no UIDs, create one item with quantity
      if (uids.length === 0) {
        return [{
          dispatch_note_id: dispatchRecord.id,
          sales_order_item_id: item.sales_order_item_id,
          item_id: item.item_id,
          uid: null,
          quantity: item.quantity,
          batch_number: item.batch_number,
          serial_number: item.serial_number,
          notes: item.notes,
        }];
      }
      
      // Create one dispatch_item per UID with quantity 1
      return uids.map((uid: string) => ({
        dispatch_note_id: dispatchRecord.id,
        sales_order_item_id: item.sales_order_item_id,
        item_id: item.item_id,
        uid: uid,
        quantity: 1, // One unit per UID
        batch_number: item.batch_number,
        serial_number: item.serial_number,
        notes: item.notes,
      }));
    });

    const { error: itemsError } = await this.supabase
      .from('dispatch_items')
      .insert(dispatchItems);

    if (itemsError) throw new BadRequestException(itemsError.message);

    // Update UID status/location and create deployment mapping (customer/location) for each dispatched UID.
    // This ensures dispatched UIDs stop appearing as AVAILABLE/GENERATED and can be traced to customer + delivery address.
    if (dispatchedUids.length > 0) {
      // Fetch customer contact + name
      const { data: customer } = await this.supabase
        .from('customers')
        .select('customer_name, contact_person, contact_email, contact_phone, email, phone, shipping_address')
        .eq('id', salesOrder.customer_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const deliveryLocation =
        dispatchData.delivery_address || customer?.shipping_address || 'Customer Location';

      // Mark each UID as shipped/in-transit and log lifecycle
      for (const uid of dispatchedUids) {
        try {
          await this.uidSupabaseService.updateStatus(req as any, uid, 'IN_TRANSIT', deliveryLocation);
          await this.uidSupabaseService.updateLifecycle(
            req as any,
            uid,
            'SHIPPED',
            deliveryLocation,
            `Dispatch ${dispatchRecord.dn_number}`,
          );
        } catch (e) {
          // Do not block dispatch if UID tagging fails, but log it.
          console.error(`[Dispatch] Failed to tag UID ${uid}:`, e);
        }
      }

      // Create deployment history entry (customer/location mapping) per UID
      try {
        const { data: uidRows } = await this.supabase
          .from('uid_registry')
          .select('id, uid')
          .eq('tenant_id', tenantId)
          .in('uid', dispatchedUids);

        if (uidRows && uidRows.length > 0) {
          await this.supabase.from('product_deployment_history').insert(
            uidRows.map((row: any) => ({
              tenant_id: tenantId,
              uid_id: row.id,
              deployment_level: 'CUSTOMER',
              organization_name: customer?.customer_name || 'Customer',
              location_name: deliveryLocation,
              deployment_date: dispatchRecord.dispatch_date,
              contact_person: customer?.contact_person || null,
              contact_email: customer?.contact_email || customer?.email || null,
              contact_phone: customer?.contact_phone || customer?.phone || null,
              deployment_notes: `Auto-created from dispatch ${dispatchRecord.dn_number}`,
              is_current_location: true,
              created_by: userId,
            }))
          );
        }
      } catch (e) {
        console.error(`[Dispatch] Failed to create deployment mapping for ${dispatchRecord.dn_number}:`, e);
      }
    }

    // ✅ Reduce stock for dispatched items
    await this.reduceStockForDispatch(tenantId, userId, dispatchData.items, dispatchRecord.dn_number);

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

    // Check if all items in the Sales Order are fully dispatched
    const { data: allItems } = await this.supabase
      .from('sales_order_items')
      .select('quantity, dispatched_quantity')
      .eq('sales_order_id', dispatchData.sales_order_id);

    const allFullyDispatched = allItems && allItems.every(
      (item: any) => (item.dispatched_quantity || 0) >= item.quantity
    );

    // Update sales order status: COMPLETED if fully dispatched, otherwise DISPATCHED
    await this.supabase
      .from('sales_orders')
      .update({ status: allFullyDispatched ? 'COMPLETED' : 'DISPATCHED' })
      .eq('id', dispatchData.sales_order_id);

    // Create warranties for dispatched items
    await this.createWarrantiesForDispatch(req, dispatchRecord.id, {
      ...dispatchData,
      customer_id: salesOrder.customer_id,
    });

    // 🎫 Generate and email issue certificate for final products
    await this.generateAndEmailCertificate(req, dispatchRecord, salesOrder, dispatchData);

    return dispatchRecord;
  }

  async updateDispatch(req: Request, dispatchId: string, dispatchData: any) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('dispatch_notes')
      .select('id')
      .eq('id', dispatchId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Dispatch note not found');

    const { data, error } = await this.supabase
      .from('dispatch_notes')
      .update({
        dispatch_date: dispatchData.dispatch_date,
        transporter_name: dispatchData.transporter_name,
        vehicle_number: dispatchData.vehicle_number,
        lr_number: dispatchData.lr_number,
        lr_date: dispatchData.lr_date,
        delivery_address: dispatchData.delivery_address,
        notes: dispatchData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dispatchId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteDispatch(req: Request, dispatchId: string) {
    const { tenantId } = req.user as any;

    const { data: dispatchNote, error: dnError } = await this.supabase
      .from('dispatch_notes')
      .select('id, dn_number, sales_order_id')
      .eq('id', dispatchId)
      .eq('tenant_id', tenantId)
      .single();

    if (dnError) throw new BadRequestException(dnError.message);
    if (!dispatchNote) throw new NotFoundException('Dispatch note not found');

    const { data: dispatchItems, error: itemsError } = await this.supabase
      .from('dispatch_items')
      .select('id, item_id, uid, quantity, sales_order_item_id')
      .eq('dispatch_note_id', dispatchId);

    if (itemsError) throw new BadRequestException(itemsError.message);

    const itemQtyByItemId = new Map<string, number>();
    const itemQtyBySoItemId = new Map<string, number>();
    const dispatchItemIds: string[] = [];
    const uidsToRevert: string[] = [];

    for (const di of dispatchItems || []) {
      dispatchItemIds.push(di.id);
      const itemId = di.item_id;
      const qty = Number(di.quantity) || 0;
      itemQtyByItemId.set(itemId, (itemQtyByItemId.get(itemId) || 0) + qty);
      if (di.sales_order_item_id) {
        itemQtyBySoItemId.set(
          di.sales_order_item_id,
          (itemQtyBySoItemId.get(di.sales_order_item_id) || 0) + qty,
        );
      }
      if (di.uid) uidsToRevert.push(di.uid);
    }

    // Reverse stock using stock_movements + stock_entries (best-effort)
    // We rely on the movements created during dispatch to restore stock back to the same warehouses.
    const { data: dispatchMovements, error: dispatchMovementsError } = await this.supabase
      .from('stock_movements')
      .select('item_id, from_warehouse_id, quantity')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'DISPATCH')
      .eq('reference_number', dispatchNote.dn_number)
      .eq('movement_type', 'SALES_ISSUE');

    if (dispatchMovementsError) throw new BadRequestException(dispatchMovementsError.message);

    const qtyByItemWarehouse = new Map<string, number>();
    for (const mv of dispatchMovements || []) {
      const warehouseId = mv.from_warehouse_id;
      const itemId = mv.item_id;
      const qty = Number(mv.quantity) || 0;
      if (!warehouseId || !itemId || qty <= 0) continue;
      const key = `${itemId}::${warehouseId}`;
      qtyByItemWarehouse.set(key, (qtyByItemWarehouse.get(key) || 0) + qty);
    }

    for (const [key, qty] of qtyByItemWarehouse.entries()) {
      if (qty <= 0) continue;
      const [itemId, warehouseId] = key.split('::');
      if (!itemId || !warehouseId) continue;

      const { data: latestEntry, error: latestEntryError } = await this.supabase
        .from('stock_entries')
        .select('id, quantity, available_quantity')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestEntryError) throw new BadRequestException(latestEntryError.message);

      if (latestEntry?.id) {
        const nextQty = (Number(latestEntry.quantity) || 0) + qty;
        const nextAvailable = (Number(latestEntry.available_quantity) || 0) + qty;
        const { error: updErr } = await this.supabase
          .from('stock_entries')
          .update({
            quantity: nextQty,
            available_quantity: nextAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', latestEntry.id);
        if (updErr) throw new BadRequestException(updErr.message);
      } else {
        const { error: insErr } = await this.supabase
          .from('stock_entries')
          .insert({
            tenant_id: tenantId,
            item_id: itemId,
            warehouse_id: warehouseId,
            quantity: qty,
            available_quantity: qty,
            allocated_quantity: 0,
            metadata: {
              created_from: 'DISPATCH_REVERT',
              reference_number: dispatchNote.dn_number,
            },
          });
        if (insErr) throw new BadRequestException(insErr.message);
      }

      // Log reversal movement
      await this.supabase
        .from('stock_movements')
        .insert({
          tenant_id: tenantId,
          movement_type: 'ADJUSTMENT',
          item_id: itemId,
          uid: null,
          to_warehouse_id: warehouseId,
          quantity: qty,
          reference_type: 'DISPATCH_REVERT',
          reference_number: dispatchNote.dn_number,
          notes: `Reverted dispatch ${dispatchNote.dn_number}`,
          moved_by: (req.user as any)?.userId,
          movement_date: new Date().toISOString(),
        });
    }

    // Reverse dispatched quantities
    for (const [soItemId, qty] of itemQtyBySoItemId.entries()) {
      const { data: soItem, error: soItemErr } = await this.supabase
        .from('sales_order_items')
        .select('dispatched_quantity')
        .eq('id', soItemId)
        .maybeSingle();

      if (soItemErr) throw new BadRequestException(soItemErr.message);
      const current = Number(soItem?.dispatched_quantity) || 0;
      const next = Math.max(current - qty, 0);
      const { error: updErr } = await this.supabase
        .from('sales_order_items')
        .update({ dispatched_quantity: next })
        .eq('id', soItemId);

      if (updErr) throw new BadRequestException(updErr.message);
    }

    // Revert UID tagging (best-effort)
    for (const uid of uidsToRevert) {
      try {
        await this.uidSupabaseService.updateStatus(req as any, uid, 'GENERATED', 'Warehouse');
        await this.uidSupabaseService.updateLifecycle(req as any, uid, 'RETURNED', 'Warehouse', `Reverted ${dispatchNote.dn_number}`);
      } catch (e) {
        console.error(`[Dispatch] Failed to revert UID ${uid}:`, e);
      }
    }

    // Delete warranties created for this dispatch
    if (dispatchItemIds.length > 0) {
      const { error: wErr } = await this.supabase
        .from('warranties')
        .delete()
        .eq('tenant_id', tenantId)
        .in('dispatch_item_id', dispatchItemIds);
      if (wErr) throw new BadRequestException(wErr.message);
    }

    // Delete deployment mapping rows created from this dispatch (best-effort)
    await this.supabase
      .from('product_deployment_history')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('deployment_notes', `Auto-created from dispatch ${dispatchNote.dn_number}`);

    // Restore sales order status (best-effort)
    await this.supabase
      .from('sales_orders')
      .update({ status: 'CONFIRMED' })
      .eq('tenant_id', tenantId)
      .eq('id', dispatchNote.sales_order_id);

    // Delete dispatch note (cascades dispatch_items)
    const { error: delErr } = await this.supabase
      .from('dispatch_notes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', dispatchId);

    if (delErr) throw new BadRequestException(delErr.message);
    return { message: 'Dispatch note deleted and stock reverted' };
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
    userId: string,
    dispatchItems: any[],
    dispatchNumber: string
  ) {
    for (const item of dispatchItems) {
      const itemId = item?.item_id;
      const requiredQty = Number(item?.quantity) || 0;
      if (!itemId || requiredQty <= 0) continue;

      const { data: stockEntries, error: stockError } = await this.supabase
        .from('stock_entries')
        .select('id, warehouse_id, quantity, available_quantity, created_at')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: true });

      if (stockError) {
        throw new BadRequestException(
          `Error checking stock for item ${itemId}: ${stockError.message}`,
        );
      }

      const totalAvailable = (stockEntries || []).reduce(
        (sum: number, entry: any) => sum + (Number(entry.available_quantity) || 0),
        0,
      );

      if (!stockEntries || stockEntries.length === 0 || totalAvailable <= 0) {
        throw new BadRequestException(
          `No stock available for item ${itemId}. Please receive inventory first.`,
        );
      }

      if (totalAvailable < requiredQty) {
        throw new BadRequestException(
          `Insufficient stock for item ${itemId}. ` +
          `Available: ${totalAvailable}, Required: ${requiredQty}`,
        );
      }

      let remainingToConsume = requiredQty;
      const movementUid = Array.isArray(item?.uid) ? null : (item?.uid ?? null);

      for (const entry of stockEntries) {
        if (remainingToConsume <= 0) break;
        const entryAvailable = Number(entry.available_quantity) || 0;
        if (entryAvailable <= 0) continue;

        const toConsume = Math.min(entryAvailable, remainingToConsume);
        const entryQty = Number(entry.quantity) || 0;

        const { error: updateError } = await this.supabase
          .from('stock_entries')
          .update({
            quantity: Math.max(entryQty - toConsume, 0),
            available_quantity: Math.max(entryAvailable - toConsume, 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id)
          .eq('tenant_id', tenantId);

        if (updateError) {
          throw new BadRequestException(`Error reducing stock: ${updateError.message}`);
        }

        // Create stock movement record for audit trail
        await this.supabase
          .from('stock_movements')
          .insert({
            tenant_id: tenantId,
            movement_type: 'SALES_ISSUE',
            item_id: itemId,
            uid: movementUid,
            from_warehouse_id: entry.warehouse_id,
            quantity: toConsume,
            reference_type: 'DISPATCH',
            reference_number: dispatchNumber,
            notes: `Dispatched via ${dispatchNumber} to customer`,
            moved_by: userId,
            movement_date: new Date().toISOString(),
          });

        remainingToConsume -= toConsume;
      }

      console.log(
        `✅ Stock reduced for item ${itemId}: -${requiredQty} units (DN: ${dispatchNumber})`,
      );
    }
  }

  // ==================== WARRANTY ====================

  async createWarranty(req: Request, warrantyData: any) {
    const { tenantId } = req.user as any;

    const uid = String(warrantyData?.uid || '').trim().toUpperCase();
    if (!uid) throw new BadRequestException('UID is required');

    const warrantyDurationMonths = Number(warrantyData?.warranty_duration_months) || 12;
    if (!Number.isFinite(warrantyDurationMonths) || warrantyDurationMonths <= 0) {
      throw new BadRequestException('warranty_duration_months must be a positive number');
    }

    const warrantyNumber = `WR-${uid}`;

    // Ensure warranty doesn't already exist (by warranty_number)
    const { data: existing } = await this.supabase
      .from('warranties')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('warranty_number', warrantyNumber)
      .maybeSingle();

    if (existing?.id) {
      throw new BadRequestException('Warranty already exists for this UID');
    }

    // Warranty must be tied to a dispatched UID (finished goods)
    const { data: dispatchItem, error: dispatchItemError } = await this.supabase
      .from('dispatch_items')
      .select(`
        id,
        uid,
        item_id,
        dispatch_note_id,
        dispatch_notes:dispatch_note_id(id, tenant_id, dn_number, dispatch_date, sales_order_id, customer_id)
      `)
      .eq('uid', uid)
      .maybeSingle();

    if (dispatchItemError) throw new BadRequestException(dispatchItemError.message);
    if (!dispatchItem?.id || !dispatchItem?.dispatch_notes) {
      throw new BadRequestException('UID not found in dispatch items. Dispatch the item first.');
    }

    if (dispatchItem.dispatch_notes.tenant_id !== tenantId) {
      throw new NotFoundException('Dispatch item not found');
    }

    const warrantyStartDate =
      String((dispatchItem.dispatch_notes as any).dispatch_date || '').trim() ||
      new Date().toISOString().split('T')[0];
    const warrantyEndDate = this.calculateWarrantyEndDate(warrantyStartDate, warrantyDurationMonths);

    const insertPayload = {
      tenant_id: tenantId,
      warranty_number: warrantyNumber,
      uid,
      sales_order_id: (dispatchItem.dispatch_notes as any).sales_order_id,
      dispatch_item_id: dispatchItem.id,
      customer_id: (dispatchItem.dispatch_notes as any).customer_id,
      item_id: dispatchItem.item_id,
      warranty_start_date: warrantyStartDate,
      warranty_duration_months: warrantyDurationMonths,
      warranty_end_date: warrantyEndDate,
      warranty_type: warrantyData?.warranty_type || 'STANDARD',
      warranty_terms: warrantyData?.warranty_terms,
      covered_components: warrantyData?.covered_components,
      status: 'ACTIVE',
    };

    const { data, error } = await this.supabase
      .from('warranties')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getWarrantyById(req: Request, warrantyId: string) {
    const { tenantId } = req.user as any;

    // Do not use FK-based joins here (schema cache may not have relationships).
    const { data: warranty, error: warrantyError } = await this.supabase
      .from('warranties')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', warrantyId)
      .maybeSingle();

    if (warrantyError) throw new BadRequestException(warrantyError.message);
    if (!warranty) throw new NotFoundException('Warranty not found');

    const safeMaybeSingle = async <T>(promise: Promise<{ data: T | null; error: any }>): Promise<T | null> => {
      try {
        const { data, error } = await promise;
        if (error) return null;
        return data ?? null;
      } catch {
        return null;
      }
    };

    const customerPromise = warranty.customer_id
      ? safeMaybeSingle<any>(
          this.supabase
            .from('customers')
            .select('customer_code, customer_name, contact_person, email, phone')
            .eq('tenant_id', tenantId)
            .eq('id', warranty.customer_id)
            .maybeSingle(),
        )
      : Promise.resolve(null);

    const itemPromise = warranty.item_id
      ? safeMaybeSingle<any>(
          this.supabase
            .from('items')
            .select('id, code, name')
            .eq('tenant_id', tenantId)
            .eq('id', warranty.item_id)
            .maybeSingle(),
        )
      : Promise.resolve(null);

    const soPromise = warranty.sales_order_id
      ? safeMaybeSingle<any>(
          this.supabase
            .from('sales_orders')
            .select('id, so_number')
            .eq('tenant_id', tenantId)
            .eq('id', warranty.sales_order_id)
            .maybeSingle(),
        )
      : Promise.resolve(null);

    const dispatchItemPromise = warranty.dispatch_item_id
      ? safeMaybeSingle<any>(
          this.supabase
            .from('dispatch_items')
            .select('id, uid, serial_number, batch_number, dispatch_note_id')
            .eq('id', warranty.dispatch_item_id)
            .maybeSingle(),
        )
      : Promise.resolve(null);

    const [customer, item, salesOrder, dispatchItem] = await Promise.all([
      customerPromise,
      itemPromise,
      soPromise,
      dispatchItemPromise,
    ]);

    const dispatchNote = dispatchItem?.dispatch_note_id
      ? await safeMaybeSingle<any>(
          this.supabase
            .from('dispatch_notes')
            .select('id, dn_number, dispatch_date')
            .eq('tenant_id', tenantId)
            .eq('id', dispatchItem.dispatch_note_id)
            .maybeSingle(),
        )
      : null;

    return {
      ...warranty,
      customer_name: customer?.customer_name || null,
      customer_code: customer?.customer_code || null,
      item_code: item?.code || null,
      item_name: item?.name || null,
      so_number: salesOrder?.so_number || null,
      dn_number: dispatchNote?.dn_number || null,
      dn_date: dispatchNote?.dispatch_date || null,
      serial_number: dispatchItem?.serial_number || null,
      batch_number: dispatchItem?.batch_number || null,
    };
  }
  
  private async createWarrantiesForDispatch(req: Request, dispatchNoteId: string, dispatchData: any) {
    const { tenantId } = req.user as any;

    const { data: dispatchItems } = await this.supabase
      .from('dispatch_items')
      .select('*')
      .eq('dispatch_note_id', dispatchNoteId);

    if (!dispatchItems || dispatchItems.length === 0) return;

    // Only create warranties for dispatched UIDs (finished goods). Skip rows without UID.
    const uidItems = (dispatchItems || []).filter(
      (it: any) => typeof it?.uid === 'string' && String(it.uid).trim().length > 0,
    );

    if (uidItems.length === 0) return;

    // Avoid inserting duplicates (warranty_number is unique)
    const warrantyNumbers = uidItems.map((it: any) => `WR-${String(it.uid).trim().toUpperCase()}`);
    const { data: existing } = await this.supabase
      .from('warranties')
      .select('warranty_number')
      .eq('tenant_id', tenantId)
      .in('warranty_number', warrantyNumbers);

    const existingSet = new Set((existing || []).map((w: any) => w.warranty_number));

    const warranties = uidItems
      .map((item: any) => {
        const normalizedUid = String(item.uid).trim().toUpperCase();
        const warrantyNumber = `WR-${normalizedUid}`;
        if (existingSet.has(warrantyNumber)) return null;

      const warrantyStartDate = dispatchData.dispatch_date || new Date().toISOString().split('T')[0];
      const warrantyDurationMonths = dispatchData.warranty_duration_months || 12;
      const warrantyEndDate = this.calculateWarrantyEndDate(warrantyStartDate, warrantyDurationMonths);

      return {
        tenant_id: tenantId,
        warranty_number: warrantyNumber,
        uid: normalizedUid,
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
    })
      .filter(Boolean);

    if (warranties.length === 0) return;

    const { error } = await this.supabase.from('warranties').insert(warranties);

    if (error) throw new BadRequestException(error.message);
  }

  private calculateWarrantyEndDate(startDate: string, durationMonths: number): string {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split('T')[0];
  }

  /**
   * 🎫 Generate and email issue certificate for dispatched products
   * Automatically triggered when final products are dispatched
   */
  private async generateAndEmailCertificate(
    req: Request,
    dispatchRecord: any,
    salesOrder: any,
    dispatchData: any
  ) {
    try {
      // Get customer details
      const { data: customer } = await this.supabase
        .from('customers')
        .select('customer_name, contact_email, contact_person')
        .eq('id', salesOrder.customer_id)
        .single();

      if (!customer || !customer.contact_email) {
        console.warn('⚠️ Certificate not sent - customer email not found');
        return;
      }

      // Get sales order details
      const { data: salesOrderDetails } = await this.supabase
        .from('sales_orders')
        .select('order_number')
        .eq('id', dispatchData.sales_order_id)
        .single();

      // Get dispatch items with product details
      const { data: dispatchItems } = await this.supabase
        .from('dispatch_items')
        .select(`
          *,
          items:item_id (
            item_code,
            item_name
          )
        `)
        .eq('dispatch_note_id', dispatchRecord.id);

      if (!dispatchItems || dispatchItems.length === 0) {
        console.warn('⚠️ Certificate not sent - no dispatch items found');
        return;
      }

      // Get warranty information for each item
      const { data: warranties } = await this.supabase
        .from('warranties')
        .select('uid, warranty_duration_months, warranty_end_date')
        .in('uid', dispatchItems.map((item: any) => item.uid));

      const warrantyMap = new Map(warranties?.map((w: any) => [w.uid, w]) || []);

      // Prepare certificate data
      const certificateData = {
        certificate_number: `CERT-${dispatchRecord.dn_number}`,
        customer_name: customer.customer_name,
        issue_date: dispatchRecord.dispatch_date,
        so_number: salesOrderDetails?.order_number || 'N/A',
        dispatch_number: dispatchRecord.dn_number,
        items: dispatchItems.map((item: any) => {
          const warranty = warrantyMap.get(item.uid);
          const warrantyMonths = warranty?.warranty_duration_months || 12;
          const warrantyYears = Math.floor(warrantyMonths / 12);
          const remainingMonths = warrantyMonths % 12;
          let warrantyPeriod = '';
          
          if (warrantyYears > 0) {
            warrantyPeriod = `${warrantyYears} Year${warrantyYears > 1 ? 's' : ''}`;
            if (remainingMonths > 0) {
              warrantyPeriod += ` ${remainingMonths} Month${remainingMonths > 1 ? 's' : ''}`;
            }
          } else {
            warrantyPeriod = `${warrantyMonths} Month${warrantyMonths > 1 ? 's' : ''}`;
          }

          return {
            product_name: item.items?.item_name || 'Unknown',
            uid_number: item.uid,
            serial_number: item.serial_number,
            warranty_period: warrantyPeriod,
            warranty_expiry: warranty?.warranty_end_date,
          };
        }),
        warranty_info: 'Standard warranty terms apply as per sales agreement. Please retain this certificate for warranty claims.',
      };

      // Send certificate email
      await this.emailService.sendIssueCertificate(
        customer.contact_email,
        certificateData
      );

      console.log(`✅ Issue certificate sent to ${customer.contact_email} for dispatch ${dispatchRecord.dn_number}`);
    } catch (error) {
      console.error('❌ Failed to send issue certificate:', error);
      // Don't throw - certificate generation failure should not block dispatch
    }
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

  async updateWarranty(req: Request, warrantyId: string, warrantyData: any) {
    const { tenantId } = req.user as any;

    const { data: existing, error: fetchError } = await this.supabase
      .from('warranties')
      .select('id')
      .eq('id', warrantyId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) throw new NotFoundException('Warranty not found');

    const { data, error } = await this.supabase
      .from('warranties')
      .update({
        status: warrantyData.status,
        warranty_type: warrantyData.warranty_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', warrantyId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteWarranty(req: Request, warrantyId: string) {
    const { tenantId } = req.user as any;

    const { error } = await this.supabase
      .from('warranties')
      .delete()
      .eq('id', warrantyId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Warranty deleted successfully' };
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
