import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';

@Injectable()
export class PurchaseOrdersService {
  private supabase: SupabaseClient;

  constructor(private emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async create(tenantId: string, userId: string, data: any) {
    console.log('=== PO CREATE - Payment data received:', {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });
    
    // Check if PO already exists for this PR + vendor combination to prevent duplicates
    if (data.prId && data.vendorId) {
      const { data: existingPOs, error: checkError } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id')
        .eq('tenant_id', tenantId)
        .eq('pr_id', data.prId)
        .eq('vendor_id', data.vendorId)
        .limit(1);

      if (checkError) {
        console.error('Duplicate check error:', checkError);
        throw new BadRequestException(checkError.message);
      }
      
      if (existingPOs && existingPOs.length > 0) {
        // Fetch vendor name separately to avoid relation issues
        const { data: vendorData } = await this.supabase
          .from('vendors')
          .select('name')
          .eq('id', existingPOs[0].vendor_id)
          .single();
        
        const vendorName = vendorData?.name || 'this vendor';
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
        payment_status: data.paymentStatus || 'UNPAID',
        payment_notes: data.paymentNotes,
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
        pr:purchase_requisitions(id, pr_number),
        vendor:vendors(id, code, name, contact_person, email),
        purchase_order_items(id, item_id, item_code, item_name, ordered_qty, rate, item:items(hsn_code))
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
        pr:purchase_requisitions(id, pr_number),
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
    console.log('=== PO UPDATE - Payment data received:', {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });
    
    const { error } = await this.supabase
      .from('purchase_orders')
      .update({
        vendor_id: data.vendorId,
        po_date: data.poDate || data.orderDate,
        delivery_date: data.deliveryDate || data.expectedDelivery,
        payment_terms: data.paymentTerms,
        payment_status: data.paymentStatus,
        payment_notes: data.paymentNotes,
        delivery_address: data.deliveryAddress,
        remarks: data.remarks || data.notes,
        total_amount: data.totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    
    console.log('=== PO UPDATE - After update:', {
      id,
      paymentStatus: data.paymentStatus,
      error: error
    });

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

    const nowIso = new Date().toISOString();
    const updateData: any = {
      status,
      updated_at: nowIso,
    };

    // In DB, purchase order status is pr_po_status (no 'SENT'). We treat 'PENDING' as "sent to vendor".
    if (status === 'PENDING') {
      updateData.sent_at = nowIso;
    }
    
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update(updateData)
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

  async updateTracking(tenantId: string, id: string, trackingData: any) {
    console.log('Updating PO tracking:', { tenantId, id, trackingData });
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (trackingData.tracking_number !== undefined) {
      updateData.tracking_number = trackingData.tracking_number;
    }
    if (trackingData.shipped_date !== undefined) {
      updateData.shipped_date = trackingData.shipped_date;
    }
    if (trackingData.estimated_delivery_date !== undefined) {
      updateData.estimated_delivery_date = trackingData.estimated_delivery_date;
    }
    if (trackingData.actual_delivery_date !== undefined) {
      updateData.actual_delivery_date = trackingData.actual_delivery_date;
    }
    if (trackingData.carrier_name !== undefined) {
      updateData.carrier_name = trackingData.carrier_name;
    }
    if (trackingData.tracking_url !== undefined) {
      updateData.tracking_url = trackingData.tracking_url;
    }
    if (trackingData.delivery_status !== undefined) {
      updateData.delivery_status = trackingData.delivery_status;
    }

    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Tracking update error:', error);
      throw new BadRequestException(error.message);
    }
    
    console.log('Tracking updated successfully:', data);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const { data: po, error: poError } = await this.supabase
      .from('purchase_orders')
      .select('id, po_number')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();

    if (poError) {
      throw new BadRequestException(poError.message);
    }

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const grnBlock = await this.findBlockingGrnForPo(tenantId, id);
    if (grnBlock) {
      throw new BadRequestException(
        `Cannot delete Purchase Order ${po.po_number} because GRN ${grnBlock.grnNumber} exists. Delete/void the GRN first.`,
      );
    }

    const { error } = await this.supabase
      .from('purchase_orders')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      // Foreign key violations are common here (e.g., GRN references); show a clearer message.
      if (error.code === '23503') {
        throw new BadRequestException(
          `Cannot delete Purchase Order ${po.po_number} because it is referenced by other records (e.g., GRN). Remove related records first.`,
        );
      }

      throw new BadRequestException(error.message);
    }

    return { message: 'Purchase Order deleted successfully' };
  }

  private async findBlockingGrnForPo(
    tenantId: string,
    poId: string,
  ): Promise<{ table: 'grns' | 'grn'; grnNumber: string } | null> {
    const tryFindInTable = async (table: 'grns' | 'grn') => {
      const { data, error } = await this.supabase
        .from(table)
        .select('id, grn_number')
        .eq('tenant_id', tenantId)
        .eq('po_id', poId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Ignore missing legacy tables.
        if (error.code === '42P01') {
          return null;
        }

        throw new BadRequestException(error.message);
      }

      if (!data) {
        return null;
      }

      return {
        table,
        grnNumber: (data as any).grn_number,
      };
    };

    return (await tryFindInTable('grns')) ?? (await tryFindInTable('grn'));
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

  private sanitizeFilename(value: string) {
    const safe = (value || 'attachment').trim();
    return safe.replace(/[\\/:*?"<>|\r\n]+/g, '_');
  }

  private dataUrlToNodemailerAttachment(input: {
    fileUrl: string;
    filename: string;
    contentType?: string | null;
  }) {
    const filename = this.sanitizeFilename(input.filename);
    const fileUrl = input.fileUrl;

    if (!fileUrl) {
      throw new BadRequestException('Attachment fileUrl missing');
    }

    if (fileUrl.startsWith('data:')) {
      const commaIndex = fileUrl.indexOf(',');
      if (commaIndex === -1) {
        throw new BadRequestException('Invalid data URL');
      }

      const header = fileUrl.slice(0, commaIndex);
      const base64Payload = fileUrl.slice(commaIndex + 1);

      const isBase64 = header.toLowerCase().includes(';base64');
      const mimeMatch = header.match(/^data:([^;]+)/i);
      const contentType = input.contentType || (mimeMatch ? mimeMatch[1] : undefined);

      if (!isBase64) {
        throw new BadRequestException('Unsupported data URL encoding (expected base64)');
      }

      return {
        filename,
        content: Buffer.from(base64Payload, 'base64'),
        contentType,
      };
    }

    // Fallback for non-data URLs (e.g. http(s) links)
    return {
      filename,
      path: fileUrl,
      contentType: input.contentType || undefined,
    };
  }

  async sendPOEmail(tenantId: string, poId: string) {
    const po = await this.findOne(tenantId, poId);
    
    if (!po.vendor?.email) {
      throw new BadRequestException('Vendor email not found');
    }

    const poItems: any[] = Array.isArray(po.purchase_order_items)
      ? po.purchase_order_items
      : [];

    // Resolve drawing requirements + item ids (some older PO items may not have item_id populated)
    const uniqueItemIds = Array.from(
      new Set(poItems.map((i) => i?.item_id).filter(Boolean)),
    );
    const uniqueItemCodes = Array.from(
      new Set(poItems.map((i) => i?.item_code).filter(Boolean)),
    );

    const itemsById = new Map<string, any>();
    const itemsByCode = new Map<string, any>();

    if (uniqueItemIds.length > 0) {
      const { data: itemsByIdData, error: itemsByIdError } = await this.supabase
        .from('items')
        .select('id, code, name, drawing_required')
        .eq('tenant_id', tenantId)
        .in('id', uniqueItemIds);

      if (itemsByIdError) {
        throw new BadRequestException(itemsByIdError.message);
      }

      for (const row of itemsByIdData || []) {
        itemsById.set(row.id, row);
        if (row.code) {
          itemsByCode.set(row.code, row);
        }
      }
    }

    if (uniqueItemCodes.length > 0) {
      const { data: itemsByCodeData, error: itemsByCodeError } = await this.supabase
        .from('items')
        .select('id, code, name, drawing_required')
        .eq('tenant_id', tenantId)
        .in('code', uniqueItemCodes);

      if (itemsByCodeError) {
        throw new BadRequestException(itemsByCodeError.message);
      }

      for (const row of itemsByCodeData || []) {
        itemsById.set(row.id, row);
        if (row.code) {
          itemsByCode.set(row.code, row);
        }
      }
    }

    const attachments: any[] = [];
    const missingCompulsory: string[] = [];

    const resolvedItemIds = Array.from(
      new Set(
        poItems
          .map((poItem) => {
            const resolvedItem =
              (poItem?.item_id ? itemsById.get(poItem.item_id) : null) ||
              (poItem?.item_code ? itemsByCode.get(poItem.item_code) : null);
            return resolvedItem?.id || poItem?.item_id || null;
          })
          .filter(Boolean),
      ),
    );

    const activeDrawingByItemId = new Map<string, any>();
    if (resolvedItemIds.length > 0) {
      const { data: activeDrawings, error: activeDrawingsError } = await this.supabase
        .from('item_drawings')
        .select('id, item_id, file_name, file_type, file_url, file_size, version, is_active')
        .eq('tenant_id', tenantId)
        .in('item_id', resolvedItemIds)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (activeDrawingsError) {
        throw new BadRequestException(activeDrawingsError.message);
      }

      for (const drawing of activeDrawings || []) {
        // Defensive: if multiple active exist, keep highest version due to order()
        if (!activeDrawingByItemId.has(drawing.item_id)) {
          activeDrawingByItemId.set(drawing.item_id, drawing);
        }
      }
    }

    for (const poItem of poItems) {
      const resolvedItem =
        (poItem?.item_id ? itemsById.get(poItem.item_id) : null) ||
        (poItem?.item_code ? itemsByCode.get(poItem.item_code) : null);

      const resolvedItemId = resolvedItem?.id || poItem?.item_id || null;
      const drawingRequired = resolvedItem?.drawing_required;
      const isCompulsory = drawingRequired === 'COMPULSORY';

      if (!resolvedItemId) {
        // Can't resolve item -> don't attach drawings; also can't enforce compulsory reliably
        continue;
      }

      const activeDrawing = activeDrawingByItemId.get(resolvedItemId) || null;

      if (!activeDrawing) {
        if (isCompulsory) {
          const label = poItem?.item_code || poItem?.item_name || resolvedItem?.code || resolvedItem?.name || resolvedItemId;
          missingCompulsory.push(label);
        }
        continue;
      }

      const itemCodeOrName = poItem?.item_code || resolvedItem?.code || poItem?.item_name || resolvedItem?.name || 'ITEM';
      const versionText = activeDrawing.version ? `v${activeDrawing.version}` : 'v';
      const baseName = activeDrawing.file_name || 'drawing';
      const filename = `${itemCodeOrName}_${versionText}_${baseName}`;

      attachments.push(
        this.dataUrlToNodemailerAttachment({
          fileUrl: activeDrawing.file_url,
          filename,
          contentType: activeDrawing.file_type,
        }),
      );
    }

    if (missingCompulsory.length > 0) {
      throw new BadRequestException(
        `Cannot send PO email. ACTIVE drawing missing for compulsory item(s): ${missingCompulsory.join(', ')}`,
      );
    }

    const emailData = {
      po_number: po.po_number,
      po_date: po.po_date,
      delivery_date: po.delivery_date,
      payment_terms: po.payment_terms,
      vendor_name: po.vendor.name,
      items: po.purchase_order_items.map((item: any) => ({
        item_name: item.item_name,
        quantity: item.ordered_qty,
        unit_price: item.rate,
        tax_percent: item.tax_percent,
        amount: item.amount,
      })),
      customs_duty: po.customs_duty,
      other_charges: po.other_charges,
      total_amount: po.total_amount,
      delivery_address: po.delivery_address,
      remarks: po.remarks,
      attachments,
    };

    await this.emailService.sendPO(po.vendor.email, emailData);

    // Record that the PO was sent (used for automatic tracking reminders).
    // Also move APPROVED -> PENDING to represent "sent to vendor" using the existing pr_po_status enum.
    const nowIso = new Date().toISOString();
    const statusUpdate: any = {
      sent_at: po.sent_at || nowIso,
      updated_at: nowIso,
    };
    if (po.status === 'APPROVED') {
      statusUpdate.status = 'PENDING';
    }
    await this.supabase
      .from('purchase_orders')
      .update(statusUpdate)
      .eq('tenant_id', tenantId)
      .eq('id', poId);

    return { message: 'PO email sent successfully', recipient: po.vendor.email };
  }

  async sendTrackingReminder(tenantId: string, poId: string) {
    const po = await this.findOne(tenantId, poId);
    
    if (!po.vendor?.email) {
      throw new BadRequestException('Vendor email not found');
    }

    const emailData = {
      po_number: po.po_number,
      po_date: po.po_date,
      delivery_date: po.delivery_date,
      vendor_name: po.vendor.name,
      items: po.purchase_order_items,
    };

    await this.emailService.sendPOTrackingReminder(po.vendor.email, emailData);

    return { message: 'Tracking reminder sent successfully', recipient: po.vendor.email };
  }
}

