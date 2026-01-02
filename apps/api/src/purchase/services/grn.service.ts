import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class GrnService {
  private supabase: SupabaseClient;

  constructor(private uidService: UidSupabaseService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  private getUploadsRoot(): string {
    return (
      process.env.UPLOAD_ROOT_DIR ||
      resolve(process.cwd(), '..', '..', 'uploads')
    );
  }

  async uploadInvoice(tenantId: string, userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ]);

    if (!file.mimetype || !allowedTypes.has(file.mimetype)) {
      if ((file as any).path) {
        await unlink((file as any).path).catch(() => undefined);
      }
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype || 'unknown'}`,
      );
    }

    const maxSizeBytes = 50 * 1024 * 1024;
    if (typeof file.size === 'number' && file.size > maxSizeBytes) {
      if ((file as any).path) {
        await unlink((file as any).path).catch(() => undefined);
      }
      throw new BadRequestException('File too large (max 50MB)');
    }

    // If multer used disk storage, the file is already written; just return the public URL.
    const filePath = (file as any).path as string | undefined;
    if (filePath && filePath.length > 0) {
      const uploadsRoot = this.getUploadsRoot();
      const relativePath = filePath.startsWith(uploadsRoot)
        ? filePath.slice(uploadsRoot.length)
        : filePath;
      const urlPath = relativePath.replace(/\\/g, '/');
      return {
        url: `/uploads${urlPath.startsWith('/') ? '' : '/'}${urlPath}`,
        name: file.originalname || (file as any).filename || 'invoice',
        type: file.mimetype,
        size: file.size,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const extensionFromName = extname(file.originalname || '').toLowerCase();
    const safeExtension =
      extensionFromName && extensionFromName.length <= 10
        ? extensionFromName
        : file.mimetype === 'application/pdf'
          ? '.pdf'
          : '';

    const relativeDir = `grn/invoices/${today}/${tenantId}/${userId}`;
    const fileName = `${randomUUID()}${safeExtension}`;

    const uploadsRoot = this.getUploadsRoot();
    const targetDir = join(uploadsRoot, relativeDir);
    await mkdir(targetDir, { recursive: true });
    const targetPath = join(targetDir, fileName);
    await writeFile(targetPath, file.buffer);

    return {
      url: `/uploads/${relativeDir}/${fileName}`,
      name: file.originalname || fileName,
      type: file.mimetype,
      size: file.size,
    };
  }

  async uploadQcAttachment(tenantId: string, userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ]);

    if (!file.mimetype || !allowedTypes.has(file.mimetype)) {
      if ((file as any).path) {
        await unlink((file as any).path).catch(() => undefined);
      }
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype || 'unknown'}`,
      );
    }

    const maxSizeBytes = 50 * 1024 * 1024;
    if (typeof file.size === 'number' && file.size > maxSizeBytes) {
      if ((file as any).path) {
        await unlink((file as any).path).catch(() => undefined);
      }
      throw new BadRequestException('File too large (max 50MB)');
    }

    // If multer used disk storage, the file is already written; just return the public URL.
    const filePath = (file as any).path as string | undefined;
    if (filePath && filePath.length > 0) {
      const uploadsRoot = this.getUploadsRoot();
      const relativePath = filePath.startsWith(uploadsRoot)
        ? filePath.slice(uploadsRoot.length)
        : filePath;
      const urlPath = relativePath.replace(/\\/g, '/');
      return {
        url: `/uploads${urlPath.startsWith('/') ? '' : '/'}${urlPath}`,
        name: file.originalname || (file as any).filename || 'qc',
        type: file.mimetype,
        size: file.size,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const extensionFromName = extname(file.originalname || '').toLowerCase();
    const safeExtension =
      extensionFromName && extensionFromName.length <= 10
        ? extensionFromName
        : file.mimetype === 'application/pdf'
          ? '.pdf'
          : '';

    const relativeDir = `grn/qc/${today}/${tenantId}/${userId}`;
    const fileName = `${randomUUID()}${safeExtension}`;

    const uploadsRoot = this.getUploadsRoot();
    const targetDir = join(uploadsRoot, relativeDir);
    await mkdir(targetDir, { recursive: true });
    const targetPath = join(targetDir, fileName);
    await writeFile(targetPath, file.buffer);

    return {
      url: `/uploads/${relativeDir}/${fileName}`,
      name: file.originalname || fileName,
      type: file.mimetype,
      size: file.size,
    };
  }

  async create(tenantId: string, userId: string, data: any) {
    console.log('=== GRN CREATE START ===');
    console.log('Data items count:', data.items?.length);
    if (data.items && data.items.length > 0) {
      data.items.forEach((item: any, idx: number) => {
        console.log(`Item ${idx}: ${item.itemCode}, acceptedQty=${item.acceptedQty}, type=${typeof item.acceptedQty}`);
      });
    }
    
    // Check if GRN already exists for this PO
    const { data: existingGRN } = await this.supabase
      .from('grns')
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
      .from('grns')
      .insert({
        tenant_id: tenantId,
        grn_number: grnNumber,
        po_id: data.poId,
        vendor_id: data.vendorId,
        receipt_date: data.grnDate || new Date().toISOString().split('T')[0],
        invoice_number: data.invoiceNumber || null,
        invoice_date: data.invoiceDate || null,
        invoice_file_url: data.invoiceFileUrl || null,
        invoice_file_name: data.invoiceFileName || null,
        invoice_file_type: data.invoiceFileType || null,
        invoice_file_size: data.invoiceFileSize || null,
        warehouse_id: data.warehouseId,
        status: data.status || 'DRAFT',
        notes: data.remarks || null,
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
        item_id: item.itemId, // Add item_id UUID
        item_code: item.itemCode,
        item_name: item.itemName,
        description: item.description,
        uom: item.uom,
        ordered_qty: item.orderedQty,
        received_qty: item.receivedQty,
        accepted_qty: item.acceptedQty || 0,
        rejected_qty: item.rejectedQty || 0,
        rejection_reason: item.rejectionReason || null,
        inspection_status: item.inspectionStatus || 'PENDING',
        inspection_remarks: item.inspectionRemarks || null,
        batch_number: item.batchNumber || null,
        manufacturing_date: item.manufacturingDate || null,
        expiry_date: item.expiryDate || null,
        rate: item.rate,
        amount: (item.receivedQty || 0) * (item.rate || 0),
        remarks: item.remarks || null,
      }));
      
      console.log('GRN Items before insert:', JSON.stringify(items.map((i: any) => ({ 
        item_code: i.item_code, 
        accepted_qty: i.accepted_qty,
        ordered_qty: i.ordered_qty,
        received_qty: i.received_qty 
      })), null, 2));

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
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    let query = this.supabase
      .from('grns')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, po_date),
        vendor:vendors(id, code, name, contact_person),
        warehouse:warehouses(id, code, name),
        grn_items(id, accepted_qty, rejected_qty, received_qty, uid_count)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false});

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

    if (error) {
      console.error('GRN findAll error:', error);
      throw new BadRequestException(error.message);
    }
    
    return data || [];
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('grns')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, po_date),
        vendor:vendors(id, code, name, contact_person),
        warehouse:warehouses(id, code, name),
        grn_items(*, item:items(id, code, name, hsn_code))
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
        receipt_date: data.grnDate || null,
        invoice_number: data.invoiceNumber || null,
        invoice_date: data.invoiceDate || null,
        invoice_file_url: data.invoiceFileUrl || null,
        invoice_file_name: data.invoiceFileName || null,
        invoice_file_type: data.invoiceFileType || null,
        invoice_file_size: data.invoiceFileSize || null,
        warehouse_id: data.warehouseId,
        notes: data.remarks || null,
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
          batch_number: item.batchNumber || null,
          expiry_date: item.expiryDate || null,
          notes: item.notes || null,
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
      .from('grns')
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

  async updateStatus(tenantId: string, id: string, status: string, userId: string) {
    // Accept both frontend values (APPROVED/REJECTED) and database values (DRAFT/COMPLETED/CANCELLED)
    const validStatuses = ['DRAFT', 'COMPLETED', 'CANCELLED', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get current GRN
    const grn = await this.findOne(tenantId, id);

    // Map frontend values to database enum values (grn_status only has: DRAFT, COMPLETED, CANCELLED)
    let dbStatus = status;
    if (status === 'APPROVED') {
      dbStatus = 'COMPLETED';  // Approval means processing complete
    } else if (status === 'REJECTED') {
      dbStatus = 'CANCELLED';  // Rejection means cancelled
    }

    // If approved, check if QC is completed before generating UIDs
    if (status === 'APPROVED') {
      // Check if QC is completed
      if (!grn.qc_completed) {
        throw new BadRequestException('Cannot approve GRN: QC inspection must be completed first. Please complete QC via the QC Accept action.');
      }

      console.log('=== UID GENERATION START ===');
      console.log('GRN object:', JSON.stringify(grn, null, 2));
      console.log('Has grn_items:', !!grn.grn_items);
      console.log('grn_items length:', grn.grn_items?.length || 0);
      
      if (grn.grn_items && grn.grn_items.length > 0) {
        console.log('Processing', grn.grn_items.length, 'items for UID generation');
        for (const item of grn.grn_items) {
          console.log('=== FULL ITEM DATA ===');
          console.log('Item keys:', Object.keys(item));
          console.log('Full item:', JSON.stringify(item, null, 2));
          console.log('Item accepted_qty:', item.accepted_qty, 'Type:', typeof item.accepted_qty);
          console.log('Item accepted_quantity:', item.accepted_quantity, 'Type:', typeof item.accepted_quantity);
          console.log('======================');
          
          const acceptedQty = item.accepted_qty || item.accepted_quantity || 0;
          if (acceptedQty > 0) {
            await this.generateUIDsForItem(tenantId, userId, grn, item);
            // Note: Stock entry creation is handled inside generateUIDsForItem
          } else {
            console.log('Skipping item due to accepted_qty <= 0. Value was:', acceptedQty);
          }
        }
      } else {
        console.log('No grn_items found or array is empty');
      }
      console.log('=== UID GENERATION END ===');
    }

    // Update GRN status
    const { error } = await this.supabase
      .from('grns')
      .update({
        status: dbStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return this.findOne(tenantId, id);
  }

  private async generateUIDsForItem(tenantId: string, userId: string, grn: any, grnItem: any) {
    try {
      console.log('generateUIDsForItem called for:', grnItem.item_code);
      console.log('grnItem data:', JSON.stringify(grnItem, null, 2));
      
      const acceptedQty = Number(grnItem.accepted_qty ?? grnItem.accepted_quantity ?? 0) || 0;
      console.log('Parsed acceptedQty:', acceptedQty);
      const uidsCreated = [];

      if (acceptedQty === 0) {
        console.log('Skipping UID generation - acceptedQty is 0');
        return [];
      }

      // Get item details including UID strategy
      const { data: item } = await this.supabase
        .from('items')
        .select('id, code, name, category, uid_tracking, uid_strategy, batch_quantity, batch_uom')
        .eq('code', grnItem.item_code)
        .single();

      console.log('Item found:', item ? item.code : 'NOT FOUND');
      if (!item) return; // Skip if item not found

      // Check UID tracking settings
      if (item.uid_tracking === false || item.uid_strategy === 'NONE') {
        console.log(`Skipping UID generation - item ${item.code} has uid_tracking=false or uid_strategy=NONE`);
        return [];
      }

      // Calculate number of UIDs to generate based on strategy
      let uidsToGenerate = acceptedQty;
      if (item.uid_strategy === 'BATCHED' && item.batch_quantity) {
        uidsToGenerate = Math.ceil(acceptedQty / item.batch_quantity);
        console.log(`BATCHED strategy: ${acceptedQty} pcs / ${item.batch_quantity} per ${item.batch_uom || 'container'} = ${uidsToGenerate} UIDs`);
      } else {
        console.log(`SERIALIZED strategy: Generating ${uidsToGenerate} UIDs (one per piece)`);
      }

      // Check if UIDs already exist for THIS SPECIFIC ITEM in this GRN to prevent duplicates
      const { data: existingUIDs, count } = await this.supabase
        .from('uid_registry')
        .select('uid', { count: 'exact' })
        .eq('grn_id', grn.id)
        .eq('entity_id', item.id)
        .eq('tenant_id', tenantId);
      
      if (count && count > 0) {
        console.log(`UIDs already exist for item ${item.code} in this GRN (${count} UIDs found). Skipping generation to prevent duplicates.`);
        return existingUIDs.map(u => u.uid);
      }

      // Determine entity type based on item category
      let entityType = 'RM'; // Raw Material
      if (item.category?.includes('COMPONENT')) entityType = 'CP';
      else if (item.category?.includes('FINISHED')) entityType = 'FG';
      else if (item.category?.includes('ASSEMBLY')) entityType = 'SA';

      console.log(`Starting loop to generate ${uidsToGenerate} UIDs, entityType: ${entityType}`);
      
      // Generate UIDs based on strategy
      for (let i = 0; i < uidsToGenerate; i++) {
        console.log(`Loop iteration ${i + 1}/${acceptedQty}`);
        
        // Generate UID using the UID service
        const uid = await this.uidService.generateUID(
          'SAIF', // tenant code - you may want to fetch this from tenant table
          'MFG',  // plant code
          entityType,
        );
        
        console.log(`Generated UID: ${uid}`);

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
            status: 'GENERATED',
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
              manufacturing_date: grnItem.manufacturing_date || null,
              expiry_date: grnItem.expiry_date || null,
              invoice_number: grn.invoice_number,
            }),
          });

        console.log(`UID insert result - Error: ${uidError ? JSON.stringify(uidError) : 'none'}`);
        
        if (!uidError) {
          uidsCreated.push(uid);
        }
      }

      console.log(`Generated ${uidsCreated.length} UIDs for GRN ${grn.grn_number}, Item: ${grnItem.item_code}`);
      
      // Update uid_count in grn_items
      if (uidsCreated.length > 0) {
        await this.supabase
          .from('grn_items')
          .update({ 
            uid_count: uidsCreated.length,
            uid_generated: true 
          })
          .eq('id', grnItem.id);
        console.log(`Updated grn_item uid_count to ${uidsCreated.length}`);
      }
      
      return uidsCreated;
    } catch (error) {
      console.error('Error generating UIDs:', error);
      // Don't throw - allow GRN to be submitted even if UID generation fails
      return [];
    }
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

  async qcAccept(tenantId: string, grnId: string, userId: string, body: any) {
    // body contains: items array with { itemId, acceptedQty, rejectedQty, qcNotes, rejectionReason }
    console.log('=== QC ACCEPT START ===');
    console.log('GRN ID:', grnId);
    console.log('User ID:', userId);
    console.log('Body items:', JSON.stringify(body.items, null, 2));
    
    try {
      const now = new Date().toISOString();
      
      // Update each GRN item with QC results
      for (const item of body.items) {
        console.log('Processing item:', item.itemId, 'acceptedQty:', item.acceptedQty, 'rejectedQty:', item.rejectedQty);
        const qcStatus = 
          item.rejectedQty > 0 && item.acceptedQty > 0 ? 'PARTIAL' :
          item.rejectedQty > 0 ? 'REJECTED' :
          'ACCEPTED';

        const updatePayload: any = {
          accepted_qty: item.acceptedQty,
          rejected_qty: item.rejectedQty,
          qc_status: qcStatus,
          qc_date: now,
          qc_by: userId,
          qc_notes: item.qcNotes || null,
          rejection_reason: item.rejectionReason || null,
          // Optional QC attachment fields (requires DB columns)
          qc_file_url: item.qcFileUrl || null,
          qc_file_name: item.qcFileName || null,
          qc_file_type: item.qcFileType || null,
          qc_file_size: item.qcFileSize || null,
        };

        let { error } = await this.supabase
          .from('grn_items')
          .update(updatePayload)
          .eq('id', item.itemId);

        // Backward compatible: if DB doesn't have qc_file_* columns, retry without them.
        if (error && /qc_file_(url|name|type|size)/i.test(error.message || '')) {
          const { qc_file_url, qc_file_name, qc_file_type, qc_file_size, ...fallbackPayload } = updatePayload;
          const retry = await this.supabase
            .from('grn_items')
            .update(fallbackPayload)
            .eq('id', item.itemId);
          error = retry.error;
        }

        console.log('GRN item update result:', error ? `ERROR: ${error.message}` : 'SUCCESS');
        if (error) throw new Error(`Failed to update item ${item.itemId}: ${error.message}`);

        // Update stock entries: only accepted quantity goes to available stock
        // Rejected quantity may require debit note creation (future enhancement)
        if (item.acceptedQty > 0) {
          console.log('🟢 Calling createStockEntry from qcAccept for item:', item.itemId, 'qty:', item.acceptedQty);
          
          const { data: grnItem, error: grnItemError } = await this.supabase
            .from('grn_items')
            .select('item_id, grn_id, unit_price, batch_number, item_code')
            .eq('id', item.itemId)
            .single();

          if (grnItemError || !grnItem) {
            console.error(`Failed to retrieve GRN item details for id: ${item.itemId}`, grnItemError);
            continue; // Skip to next item
          }

          const { data: grn } = await this.supabase
            .from('grns')
            .select('warehouse_id, grn_number')
            .eq('id', grnItem.grn_id)
            .single();

          if (!grn) {
            console.error(`Failed to retrieve GRN header for item: ${grnItem.item_id}`);
            continue; // Skip to next item
          }

          await this.createStockEntry({
            tenant_id: tenantId,
            item_id: grnItem.item_id,
            warehouse_id: grn.warehouse_id,
            quantity: item.acceptedQty,
            available_quantity: item.acceptedQty,
            allocated_quantity: 0,
            unit_price: grnItem.unit_price,
            batch_number: grnItem.batch_number,
            grn_reference: grn.grn_number,
            created_from: 'GRN_QC_ACCEPT',
            metadata: {
              grn_item_id: item.itemId,
              item_code: grnItem.item_code,
            },
          });
        }

        // Handle rejections - update rejection amount and status
        if (item.rejectedQty > 0) {
          console.log('Item has rejections, calculating debit amount...');
          
          // Get item price from GRN item (column is 'rate' not 'unit_price')
          const { data: grnItemData } = await this.supabase
            .from('grn_items')
            .select('rate')
            .eq('id', item.itemId)
            .single();

          if (grnItemData?.rate) {
            const rejectionAmount = item.rejectedQty * grnItemData.rate;
            console.log(`Rejection amount: ${item.rejectedQty} x ${grnItemData.rate} = ${rejectionAmount}`);
            
            // Update grn_item with rejection details
            await this.supabase
              .from('grn_items')
              .update({
                return_status: 'PENDING_RETURN',
                rejection_amount: rejectionAmount,
              })
              .eq('id', item.itemId);
          }
        }
      }

      console.log('Checking if all items have QC completed...');
      // Update GRN status if all items have QC completed
      const { data: allItems } = await this.supabase
        .from('grn_items')
        .select('qc_status')
        .eq('grn_id', grnId);

      const allCompleted = allItems?.every(item => 
        item.qc_status === 'ACCEPTED' || 
        item.qc_status === 'REJECTED' || 
        item.qc_status === 'PARTIAL'
      );

      if (allCompleted) {
        console.log('All items QC completed, updating GRN qc_completed flag...');
        const { error: grnUpdateError } = await this.supabase
          .from('grns')
          .update({ qc_completed: true, updated_at: now })
          .eq('id', grnId)
          .eq('tenant_id', tenantId);
        
        console.log('GRN qc_completed update result:', grnUpdateError ? `ERROR: ${grnUpdateError.message}` : 'SUCCESS');
        if (grnUpdateError) {
          console.error('Failed to update GRN qc_completed:', grnUpdateError);
        }

        // Auto-create debit note for any rejected items
        await this.createDebitNoteForRejections(tenantId, grnId, userId);
      }

      console.log('=== QC ACCEPT COMPLETE ===');
      return { message: 'QC acceptance recorded successfully', qcCompleted: allCompleted };
    } catch (error) {
      console.error('QC ACCEPT ERROR:', error);
      throw new BadRequestException(`QC acceptance failed: ${error.message}`);
    }
  }

  // Auto-create debit note for rejected materials
  private async createDebitNoteForRejections(tenantId: string, grnId: string, userId: string) {
    try {
      console.log('Checking for rejected items to create debit note...');
      console.log('GRN ID:', grnId, 'Tenant ID:', tenantId);
      
      // Get GRN details and rejected items
      const { data: grn, error: grnError } = await this.supabase
        .from('grns')
        .select(`
          id,
          vendor_id,
          grn_items (
            id,
            item_id,
            po_item_id,
            rejected_qty,
            rate,
            rejection_reason,
            rejection_amount
          )
        `)
        .eq('id', grnId)
        .eq('tenant_id', tenantId)
        .single();

      console.log('GRN query result:', grn ? 'Found GRN' : 'No GRN found');
      if (grnError) console.log('GRN query error:', grnError);
      if (grn) {
        console.log('GRN items count:', grn.grn_items?.length || 0);
        console.log('GRN items:', JSON.stringify(grn.grn_items, null, 2));
      }

      if (!grn) return;

      const poItemCache = new Map<string, any>();
      const rejectedItems: any[] = [];
      for (const item of grn.grn_items || []) {
        if (!(item.rejected_qty > 0)) {
          continue;
        }

        // Fall back to PO rate if GRN rate is missing; compute rejection amount if absent
        let fallbackRate = 0;
        if (!item.rate && item.po_item_id) {
          if (!poItemCache.has(item.po_item_id)) {
            const { data: poItem } = await this.supabase
              .from('po_items')
              .select('id, item_id, rate, unit_price')
              .eq('id', item.po_item_id)
              .maybeSingle();
            poItemCache.set(item.po_item_id, poItem || null);
          }
          const poItem = poItemCache.get(item.po_item_id);
          fallbackRate = parseFloat(poItem?.rate ?? poItem?.unit_price ?? '0') || 0;
        }

        const rate = parseFloat(item.rate ?? fallbackRate) || 0;
        const computedAmount = item.rejection_amount ?? (rate * item.rejected_qty);

        if (!computedAmount || computedAmount <= 0) {
          console.log('Skipping rejected item due to zero/invalid amount', {
            grn_item_id: item.id,
            rejected_qty: item.rejected_qty,
            rate,
            fallbackRate,
            rejection_amount: item.rejection_amount,
          });
          continue;
        }

        // Persist the computed rejection amount so future runs have a value
        await this.supabase
          .from('grn_items')
          .update({
            rejection_amount: item.rejection_amount ?? computedAmount,
            rate: item.rate ?? rate,
            return_status: 'PENDING_RETURN',
          })
          .eq('id', item.id);

        rejectedItems.push({
          ...item,
          computed_rate: rate,
          computed_amount: computedAmount,
        });
      }

      console.log('Rejected items after filter:', rejectedItems.length);
      if (rejectedItems.length === 0) {
        console.log('No rejected items found, skipping debit note creation');
        return;
      }

      console.log(`Found ${rejectedItems.length} rejected items, creating debit note...`);

      // Calculate total debit amount
      const totalAmount = rejectedItems.reduce((sum: number, item: any) => 
        sum + parseFloat(item.computed_amount), 0
      );

      // Generate debit note number
      const { data: dnNumber } = await this.supabase
        .rpc('generate_debit_note_number', { p_tenant_id: tenantId });

      // Create debit note
      const { data: debitNote, error: dnError } = await this.supabase
        .from('debit_notes')
        .insert({
          tenant_id: tenantId,
          debit_note_number: dnNumber || `DN-${Date.now()}`,
          grn_id: grnId,
          vendor_id: grn.vendor_id,
          total_amount: totalAmount,
          reason: 'QC Rejection - Materials failed quality inspection',
          status: 'DRAFT',
          created_by: userId,
        })
        .select()
        .single();

      if (dnError) {
        console.error('Failed to create debit note:', dnError);
        return;
      }

      console.log('Debit note created:', debitNote.debit_note_number);

      // Create debit note items
      const dnItems = rejectedItems.map((item: any) => ({
        debit_note_id: debitNote.id,
        grn_item_id: item.id,
        item_id: item.item_id || item.po_item?.item_id,
        rejected_qty: item.rejected_qty,
        unit_price: item.computed_rate,
        amount: item.computed_amount,
        rejection_reason: item.rejection_reason || 'Quality inspection failed',
        return_status: 'PENDING',
      }));

      const { error: itemsError } = await this.supabase
        .from('debit_note_items')
        .insert(dnItems);

      if (itemsError) {
        console.error('Failed to create debit note items:', itemsError);
        return;
      }

      // Link debit note to grn_items
      for (const item of rejectedItems) {
        await this.supabase
          .from('grn_items')
          .update({ debit_note_id: debitNote.id })
          .eq('id', item.id);
      }

      // Update GRN amounts
      const { data: grnAmounts } = await this.supabase
        .from('grn_items')
        .select('unit_price, received_qty')
        .eq('grn_id', grnId);

      const grossAmount = grnAmounts?.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.unit_price) * parseFloat(item.received_qty)), 0
      ) || 0;

      await this.supabase
        .from('grns')
        .update({
          gross_amount: grossAmount,
          debit_note_amount: totalAmount,
          net_payable_amount: grossAmount - totalAmount,
        })
        .eq('id', grnId)
        .eq('tenant_id', tenantId);

      console.log(`Debit note ${debitNote.debit_note_number} created for ₹${totalAmount}`);
      
    } catch (error) {
      console.error('Error in createDebitNoteForRejections:', error);
      // Don't throw - this is a background operation
    }
  }

  // Helper method to create stock entries
  private async createStockEntry(stockData: any) {
    try {
      console.log('=== CREATE STOCK ENTRY CALLED ===');
      console.log('Stock Data:', JSON.stringify(stockData, null, 2));

      const quantityChange = Number(stockData.quantity ?? 0) || 0;
      const availableQuantity =
        stockData.available_quantity === undefined || stockData.available_quantity === null
          ? quantityChange
          : (Number(stockData.available_quantity) || 0);
      const allocatedQuantity = Number(stockData.allocated_quantity ?? 0) || 0;
      const unitPrice =
        stockData.unit_price === undefined || stockData.unit_price === null
          ? null
          : (Number(stockData.unit_price) || 0);

      const metadataFromCaller =
        stockData.metadata && typeof stockData.metadata === 'object' ? stockData.metadata : {};

      const metadata = {
        ...metadataFromCaller,
        ...(stockData.grn_reference ? { grn_reference: stockData.grn_reference } : {}),
        ...(stockData.created_from ? { created_from: stockData.created_from } : {}),
      };

      // 1) Insert into stock_entries (used by items stock display)
      const { error: stockEntryError } = await this.supabase
        .from('stock_entries')
        .insert({
          tenant_id: stockData.tenant_id,
          item_id: stockData.item_id,
          warehouse_id: stockData.warehouse_id,
          quantity: quantityChange,
          available_quantity: availableQuantity,
          allocated_quantity: allocatedQuantity,
          unit_price: unitPrice,
          batch_number: stockData.batch_number ?? null,
          expiry_date: stockData.expiry_date ?? null,
          metadata,
        });

      if (stockEntryError) {
        console.error('❌ ERROR inserting stock_entries row:', stockEntryError);
        console.error('Error details:', JSON.stringify(stockEntryError, null, 2));
      } else {
        console.log('✅ stock_entries row inserted successfully');
      }
      
      const { data: item } = await this.supabase
        .from('items')
        .select('category')
        .eq('id', stockData.item_id)
        .single();

      // 2) Keep inventory_stock in sync (used by other modules)
      const { error } = await this.supabase.rpc('adjust_inventory_stock', {
        p_tenant_id: stockData.tenant_id,
        p_item_id: stockData.item_id,
        p_warehouse_id: stockData.warehouse_id,
        p_location_id: null, // Assuming null location for now
        p_quantity_change: quantityChange,
        p_category: item?.category || 'RAW_MATERIAL'
      });

      if (error) {
        console.error('❌ ERROR creating stock entry:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Stock entry created successfully!');
        console.log(`Created new stock entry for item ${stockData.item_id}`);
      }
      console.log('=== CREATE STOCK ENTRY COMPLETED ===');
    } catch (error) {
      console.error('❌ EXCEPTION in createStockEntry:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      // Don't throw - allow GRN to continue even if stock creation fails
    }
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
        p_batch_number: grnItem.batch_number || null,
        p_manufacturing_date: grnItem.manufacturing_date || null,
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
    console.log('=== GET UIDs BY GRN ===');
    console.log('TenantId:', tenantId);
    console.log('GRN ID:', grnId);
    
    // First, get UIDs from uid_registry
    const { data: uidData, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('grn_id', grnId)
      .order('created_at', { ascending: false });

    if (uidError) {
      console.error('Error fetching UIDs:', uidError);
      throw new BadRequestException(uidError.message);
    }

    if (!uidData || uidData.length === 0) {
      console.log('No UIDs found');
      return [];
    }

    console.log('UIDs found:', uidData.length);

    // Get unique entity_ids where entity_type is ITEM or similar
    const itemEntityIds = [...new Set(
      uidData
        .filter(uid => uid.entity_type && uid.entity_id)
        .map(uid => uid.entity_id)
    )].filter(Boolean);
    
    // Fetch items data if we have entity_ids
    let itemsMap = new Map();
    if (itemEntityIds.length > 0) {
      const { data: itemsData } = await this.supabase
        .from('items')
        .select('id, code, name')
        .in('id', itemEntityIds);

      itemsMap = new Map(itemsData?.map(item => [item.id, item]) || []);
    }

    // Attach item data to each UID based on entity_id
    const enrichedData = uidData.map(uid => ({
      ...uid,
      item: uid.entity_id ? itemsMap.get(uid.entity_id) : null,
    }));

    console.log('Sample UIDs with items:', enrichedData.slice(0, 3).map(u => ({ 
      uid: u.uid, 
      grn_id: u.grn_id,
      entity_type: u.entity_type,
      entity_id: u.entity_id,
      item: u.item 
    })));
    
    return enrichedData;
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
        .from('grns')
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
