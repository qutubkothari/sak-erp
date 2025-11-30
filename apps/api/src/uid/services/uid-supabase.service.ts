import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class UidSupabaseService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  /**
   * Generate UID with format: UID-{TENANT}-{PLANT}-{TYPE}-{SEQUENCE}-{CHECKSUM}
   */
  async generateUID(
    tenantCode: string,
    plantCode: string,
    entityType: string,
  ): Promise<string> {
    // Get next sequence
    const { data: existing } = await this.supabase
      .from('uid_registry')
      .select('uid')
      .like('uid', `UID-${tenantCode}-${plantCode}-${entityType}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (existing && existing.length > 0) {
      const lastUID = existing[0].uid;
      const parts = lastUID.split('-');
      sequence = parseInt(parts[4]) + 1;
    }

    const seqStr = sequence.toString().padStart(6, '0');
    const checksum = this.generateChecksum(
      `${tenantCode}${plantCode}${entityType}${seqStr}`,
    );

    return `UID-${tenantCode}-${plantCode}-${entityType}-${seqStr}-${checksum}`;
  }

  /**
   * Create UID record
   */
  async createUID(req: any, createDto: any) {
    const tenantId = req.user.tenantId;

    // Generate UID
    const uid = await this.generateUID(
      createDto.tenantCode || 'SAIF',
      createDto.plantCode || 'KOL',
      createDto.entityType || 'RM',
    );

    const { data, error } = await this.supabase
      .from('uid_registry')
      .insert([
        {
          ...createDto,
          tenant_id: tenantId,
          uid,
          lifecycle: JSON.stringify([
            {
              stage: 'CREATED',
              timestamp: new Date().toISOString(),
              location: createDto.location || 'Warehouse',
              reference: createDto.reference || 'Initial',
              user: req.user.email,
            },
          ]),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get all UIDs with filters
   */
  async findAll(req: any, filters?: any) {
    const tenantId = req.user.tenantId;

    let query = this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Search for specific UID
   */
  async searchUID(req: any, uid: string) {
    const tenantId = req.user.tenantId;
    console.log('=== SEARCH UID ===');
    console.log('UID:', uid);

    // First get the UID record
    const { data: uidData, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .single();

    if (uidError) throw new Error(uidError.message);

    console.log('UID Data:', { supplier_id: uidData.supplier_id, po_id: uidData.purchase_order_id, grn_id: uidData.grn_id });

    // Then fetch related data separately
    let supplier = null;
    let purchaseOrder = null;
    let grn = null;

    if (uidData.supplier_id) {
      console.log('Looking up vendor with ID:', uidData.supplier_id, 'for tenant:', tenantId);
      const { data: vendorData, error: vendorError } = await this.supabase
        .from('vendors')
        .select('id, name, vendor_code')
        .eq('tenant_id', tenantId)
        .eq('id', uidData.supplier_id)
        .maybeSingle();
      if (vendorError) {
        console.log('Vendor query error:', vendorError.message);
      }
      supplier = vendorData;
      console.log('Supplier found:', supplier?.name || 'NULL');
    }

    if (uidData.purchase_order_id) {
      const { data: poData } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number')
        .eq('id', uidData.purchase_order_id)
        .single();
      purchaseOrder = poData;
      console.log('PO found:', purchaseOrder?.po_number);
    }

    if (uidData.grn_id) {
      const { data: grnData } = await this.supabase
        .from('grn')
        .select('id, grn_number')
        .eq('id', uidData.grn_id)
        .single();
      grn = grnData;
      console.log('GRN found:', grn?.grn_number);
    }

    const result = {
      ...uidData,
      supplier: supplier || null,
      purchase_order: purchaseOrder || null,
      grn: grn || null,
    };
    
    console.log('=== FINAL RESULT ===');
    console.log('Supplier:', JSON.stringify(result.supplier));
    console.log('PO:', JSON.stringify(result.purchase_order));
    console.log('GRN:', JSON.stringify(result.grn));
    return result;
  }

  /**
   * Get UID with complete hierarchy
   */
  async getUIDWithHierarchy(req: any, uid: string) {
    const uidRecord = await this.searchUID(req, uid);

    // Get parent records
    let parents = [];
    if (uidRecord.parent_uids && uidRecord.parent_uids.length > 0) {
      const { data } = await this.supabase
        .from('uid_registry')
        .select('*')
        .in('uid', uidRecord.parent_uids);
      parents = data || [];
    }

    // Get child records
    let children = [];
    if (uidRecord.child_uids && uidRecord.child_uids.length > 0) {
      const { data } = await this.supabase
        .from('uid_registry')
        .select('*')
        .in('uid', uidRecord.child_uids);
      children = data || [];
    }

    return {
      ...uidRecord,
      parents,
      children,
    };
  }

  /**
   * Update UID lifecycle
   */
  async updateLifecycle(
    req: any,
    uid: string,
    stage: string,
    location: string,
    reference: string,
  ) {
    const tenantId = req.user.tenantId;

    // Get current record
    const { data: current } = await this.supabase
      .from('uid_registry')
      .select('lifecycle')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .single();

    if (!current) throw new Error('UID not found');

    const lifecycle = Array.isArray(current.lifecycle)
      ? current.lifecycle
      : [];

    lifecycle.push({
      stage,
      timestamp: new Date().toISOString(),
      location,
      reference,
      user: req.user.email,
    });

    const { data, error } = await this.supabase
      .from('uid_registry')
      .update({
        lifecycle: JSON.stringify(lifecycle),
        location,
      })
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Link UIDs (parent-child relationship)
   */
  async linkUIDs(req: any, parentUID: string, childUID: string) {
    const tenantId = req.user.tenantId;

    // Update parent
    const { data: parent } = await this.supabase
      .from('uid_registry')
      .select('child_uids')
      .eq('tenant_id', tenantId)
      .eq('uid', parentUID)
      .single();

    if (!parent) throw new Error('Parent UID not found');

    const childUIDs = Array.isArray(parent.child_uids) ? parent.child_uids : [];
    if (!childUIDs.includes(childUID)) {
      childUIDs.push(childUID);
    }

    await this.supabase
      .from('uid_registry')
      .update({ child_uids: JSON.stringify(childUIDs) })
      .eq('tenant_id', tenantId)
      .eq('uid', parentUID);

    // Update child
    const { data: child } = await this.supabase
      .from('uid_registry')
      .select('parent_uids, assembly_level')
      .eq('tenant_id', tenantId)
      .eq('uid', childUID)
      .single();

    if (!child) throw new Error('Child UID not found');

    const parentUIDs = Array.isArray(child.parent_uids)
      ? child.parent_uids
      : [];
    if (!parentUIDs.includes(parentUID)) {
      parentUIDs.push(parentUID);
    }

    await this.supabase
      .from('uid_registry')
      .update({
        parent_uids: JSON.stringify(parentUIDs),
        assembly_level: (child.assembly_level || 0) + 1,
      })
      .eq('tenant_id', tenantId)
      .eq('uid', childUID);

    return { message: 'UIDs linked successfully' };
  }

  /**
   * Update UID status
   */
  async updateStatus(req: any, uid: string, status: string, location?: string) {
    const tenantId = req.user.tenantId;

    const updateData: any = { status };
    if (location) updateData.location = location;

    const { data, error } = await this.supabase
      .from('uid_registry')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add lifecycle event
    await this.updateLifecycle(
      req,
      uid,
      `STATUS_CHANGE_${status}`,
      location || data.location,
      `Status changed to ${status}`,
    );

    return data;
  }

  /**
   * Validate UID format
   */
  validateUIDFormat(uid: string): boolean {
    const pattern = /^UID-[A-Z0-9]{2,4}-[A-Z0-9]{2,3}-[A-Z0-9]{2}-\d{6}-[A-Z0-9]{2}$/;
    return pattern.test(uid);
  }

  /**
   * Get Purchase Trail for UID
   */
  async getPurchaseTrail(req: any, uid: string) {
    const tenantId = req.user.tenantId;

    // Get UID record
    const { data: uidRecord, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .single();

    if (uidError) throw new Error('UID not found');

    // Get item details
    const { data: item } = await this.supabase
      .from('items')
      .select('code, name')
      .eq('id', uidRecord.entity_id)
      .single();

    // Get supplier details
    let supplier = null;
    if (uidRecord.supplier_id) {
      const { data } = await this.supabase
        .from('vendors')
        .select('name, contact_person')
        .eq('id', uidRecord.supplier_id)
        .single();
      supplier = data;
    }

    // Get purchase order details
    let purchase_order = null;
    if (uidRecord.purchase_order_id) {
      const { data } = await this.supabase
        .from('purchase_orders')
        .select('po_number, order_date, total_amount')
        .eq('id', uidRecord.purchase_order_id)
        .single();
      purchase_order = data;
    }

    // Get GRN details
    let grn = null;
    if (uidRecord.grn_id) {
      const { data } = await this.supabase
        .from('grn')
        .select('grn_number, received_date, received_quantity')
        .eq('id', uidRecord.grn_id)
        .single();
      grn = data;
    }

    // Parse lifecycle
    let lifecycle = [];
    try {
      lifecycle = typeof uidRecord.lifecycle === 'string' 
        ? JSON.parse(uidRecord.lifecycle) 
        : uidRecord.lifecycle || [];
    } catch {
      lifecycle = [];
    }

    return {
      uid: uidRecord.uid,
      item: item || { code: 'N/A', name: 'Unknown Item' },
      supplier,
      purchase_order,
      grn,
      batch_number: uidRecord.batch_number,
      location: uidRecord.location,
      lifecycle,
    };
  }

  /**
   * Get complete trace data for a UID including timeline, components, vendor, quality, and customer
   */
  async getCompleteTrace(req: any, uid: string) {
    const tenantId = req.user.tenantId;

    console.log('[UID Trace] Looking for UID:', uid, 'Tenant:', tenantId);

    // 1. Get main UID record
    const { data: uidRecord, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .maybeSingle();

    console.log('[UID Trace] Query result:', { found: !!uidRecord, error: uidError });

    if (uidError) {
      console.error('[UID Trace] Database error:', uidError);
      throw new Error(`Database error: ${uidError.message}`);
    }

    if (!uidRecord) {
      console.error('[UID Trace] UID not found in database');
      throw new Error('UID not found');
    }

    console.log('[UID Trace] UID record item_id:', uidRecord.item_id);

    // 2. Get item details separately
    const { data: item, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name, description, category, uom')
      .eq('id', uidRecord.item_id)
      .maybeSingle();

    console.log('[UID Trace] Item lookup result:', { found: !!item, error: itemError });

    // Attach item to UID record
    uidRecord.item = item;

    // Parse lifecycle
    const lifecycle = Array.isArray(uidRecord.lifecycle)
      ? uidRecord.lifecycle
      : typeof uidRecord.lifecycle === 'string'
      ? JSON.parse(uidRecord.lifecycle)
      : [];

    // 2. Get vendor details (from GRN if available)
    let vendor = null;
    const grnReference = lifecycle.find((event: any) => 
      event.reference && event.reference.includes('GRN')
    );
    
    if (grnReference) {
      const grnNumber = grnReference.reference;
      const { data: grn } = await this.supabase
        .from('grn')
        .select(`
          id,
          vendor:vendors(code, name, contact_person, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('grn_number', grnNumber)
        .single();

      if (grn && grn.vendor) {
        const vendorData = Array.isArray(grn.vendor) ? grn.vendor[0] : grn.vendor;
        vendor = {
          code: vendorData.code,
          name: vendorData.name,
          contact: `${vendorData.contact_person} (${vendorData.email})`,
        };
      }
    }

    // 3. Get quality checkpoints
    const quality_checkpoints = lifecycle
      .filter((event: any) => 
        event.stage.includes('QC') || 
        event.stage.includes('QUALITY') || 
        event.stage.includes('INSPECTION')
      )
      .map((event: any) => ({
        stage: event.stage,
        status: event.reference.includes('PASSED') ? 'PASSED' : 
                event.reference.includes('FAILED') ? 'FAILED' : 'PENDING',
        date: event.timestamp,
        inspector: event.user,
        notes: event.reference,
      }));

    // 4. Get components (child UIDs) with their details
    const child_uids = Array.isArray(uidRecord.child_uids) 
      ? uidRecord.child_uids 
      : typeof uidRecord.child_uids === 'string' && uidRecord.child_uids
      ? JSON.parse(uidRecord.child_uids)
      : [];

    let components: any[] = [];
    if (child_uids.length > 0) {
      const { data: childRecords } = await this.supabase
        .from('uid_registry')
        .select(`
          uid,
          batch_number,
          received_date,
          qc_status,
          item:items(code, name)
        `)
        .in('uid', child_uids);

      if (childRecords) {
        components = childRecords.map((child: any) => {
          const itemData = Array.isArray(child.item) ? child.item[0] : child.item;
          return {
            uid: child.uid,
            item_code: itemData?.code || 'N/A',
            item_name: itemData?.name || 'N/A',
            batch_number: child.batch_number || 'N/A',
            received_date: child.received_date || 'N/A',
            qc_status: child.qc_status || 'PENDING',
            vendor_name: null as string | null,
          };
        });

        // Get vendor names for components
        for (const component of components) {
          const { data: componentRecord } = await this.supabase
            .from('uid_registry')
            .select('lifecycle')
            .eq('uid', component.uid)
            .single();

          if (componentRecord) {
            const compLifecycle = Array.isArray(componentRecord.lifecycle)
              ? componentRecord.lifecycle
              : typeof componentRecord.lifecycle === 'string'
              ? JSON.parse(componentRecord.lifecycle)
              : [];
            
            const compGrnRef = compLifecycle.find((e: any) => 
              e.reference && e.reference.includes('GRN')
            );

            if (compGrnRef) {
              const { data: compGrn } = await this.supabase
                .from('grn')
                .select('vendor:vendors(name)')
                .eq('tenant_id', tenantId)
                .eq('grn_number', compGrnRef.reference)
                .single();

              if (compGrn && compGrn.vendor) {
                const vendorData = Array.isArray(compGrn.vendor) ? compGrn.vendor[0] : compGrn.vendor;
                component.vendor_name = vendorData?.name || null;
              }
            }
          }
        }
      }
    }

    // 5. Get parent products (where this UID is used)
    const parent_uids = Array.isArray(uidRecord.parent_uids) 
      ? uidRecord.parent_uids 
      : typeof uidRecord.parent_uids === 'string' && uidRecord.parent_uids
      ? JSON.parse(uidRecord.parent_uids)
      : [];

    let parent_products: any[] = [];
    if (parent_uids.length > 0) {
      const { data: parentRecords } = await this.supabase
        .from('uid_registry')
        .select(`
          uid,
          item:items(code, name)
        `)
        .in('uid', parent_uids);

      if (parentRecords) {
        parent_products = parentRecords.map((parent: any) => {
          const itemData = Array.isArray(parent.item) ? parent.item[0] : parent.item;
          return {
            uid: parent.uid,
            item_code: itemData?.code || 'N/A',
            item_name: itemData?.name || 'N/A',
          };
        });
      }
    }

    // 6. Get customer details (from sales order/delivery if available)
    let customer = null;
    const shipmentRef = lifecycle.find((event: any) => 
      event.stage.includes('SHIPPED') || 
      event.stage.includes('DELIVERED') ||
      event.reference.includes('SO-') ||
      event.reference.includes('INV-')
    );

    if (shipmentRef) {
      // Try to extract invoice or SO number
      const refNumber = shipmentRef.reference;
      
      // You can enhance this to fetch from sales_orders or invoices table
      customer = {
        name: 'Customer Name', // Placeholder - fetch from sales_orders
        location: shipmentRef.location || 'Customer Location',
        delivery_date: shipmentRef.timestamp,
        invoice_number: refNumber,
      };
    }

    const itemData = Array.isArray(uidRecord.item) ? uidRecord.item[0] : uidRecord.item;

    return {
      uid: uidRecord.uid,
      entity_type: uidRecord.entity_type,
      item: {
        code: itemData?.code || 'N/A',
        name: itemData?.name || 'N/A',
        category: itemData?.category || 'N/A',
      },
      status: uidRecord.status,
      location: uidRecord.location,
      lifecycle,
      components,
      parent_products,
      vendor,
      quality_checkpoints,
      customer,
    };
  }

  /**
   * Get all UIDs with filtering - for quality inspection form
   */
  async getAllUIDs(req: any, status?: string, entityType?: string) {
    const tenantId = req.user.tenantId;
    
    let query = this.supabase
      .from('uid_registry')
      .select('uid, entity_type, status, location, batch_number, quality_status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (status) {
      query = query.eq('status', status);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch UIDs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get UID details with vendor and item information for quality inspection
   */
  async getUIDDetails(req: any, uid: string) {
    const tenantId = req.user.tenantId;

    // Fetch UID record with related data
    const { data: uidRecord, error } = await this.supabase
      .from('uid_registry')
      .select(`
        *,
        item:items!entity_id(id, name, code, description),
        vendor:vendors!supplier_id(id, name, code)
      `)
      .eq('uid', uid)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !uidRecord) {
      throw new Error(`UID ${uid} not found`);
    }

    const itemData = Array.isArray(uidRecord.item) ? uidRecord.item[0] : uidRecord.item;
    const vendorData = Array.isArray(uidRecord.vendor) ? uidRecord.vendor[0] : uidRecord.vendor;

    return {
      uid: uidRecord.uid,
      grnId: uidRecord.grn_id,
      itemId: uidRecord.entity_id,
      itemName: itemData?.name || '',
      itemCode: itemData?.code || '',
      vendorId: uidRecord.supplier_id,
      vendorName: vendorData?.name || '',
      vendorCode: vendorData?.code || '',
      batchNumber: uidRecord.batch_number || '',
      lotNumber: '', // Add if you have lot_number field
      entityType: uidRecord.entity_type,
      status: uidRecord.status,
      location: uidRecord.location,
      assemblyLevel: uidRecord.assembly_level,
      parentUids: uidRecord.parent_uids,
      childUids: uidRecord.child_uids,
      qualityStatus: uidRecord.quality_status,
      createdAt: uidRecord.created_at,
    };
  }

  /**
   * Generate checksum
   */
  private generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().substring(0, 2).padEnd(2, '0');
  }
}
