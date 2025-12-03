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

    // Pagination parameters
    const page = filters?.page ? parseInt(filters.page) : 1;
    const limit = filters?.limit ? parseInt(filters.limit) : 50;
    const offset = (page - 1) * limit;

    // Get total count first
    let countQuery = this.supabase
      .from('uid_registry')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      countQuery = countQuery.eq('status', filters.status);
    }

    if (filters?.entity_type) {
      countQuery = countQuery.eq('entity_type', filters.entity_type);
    }

    if (filters?.location) {
      countQuery = countQuery.ilike('location', `%${filters.location}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);

    let query = this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
    
    // Manually fetch item details for each UID to avoid relationship issues
    const processedData = [];
    for (const uid of data || []) {
      let itemDetails = null;
      
      // Try to fetch item details if item_id exists
      if (uid.item_id) {
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name, category')
          .eq('id', uid.item_id)
          .maybeSingle();
        itemDetails = item;
      }
      // Fallback: try entity_id if item_id doesn't exist
      else if (uid.entity_id) {
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name, category')
          .eq('id', uid.entity_id)
          .maybeSingle();
        itemDetails = item;
      }
      
      processedData.push({
        ...uid,
        items: itemDetails
      });
    }
    
    return {
      data: processedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
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
        .select('id, name, code')
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

    // 2. Get vendor details directly from supplier_id
    let vendor = null;
    console.log('[UID Trace] UID Record supplier_id:', uidRecord.supplier_id);
    if (uidRecord.supplier_id) {
      const { data: vendorData, error: vendorError } = await this.supabase
        .from('vendors')
        .select('code, name, contact_person, email')
        .eq('tenant_id', tenantId)
        .eq('id', uidRecord.supplier_id)
        .maybeSingle();

      console.log('[UID Trace] Vendor lookup result:', { vendorData, vendorError });
      if (vendorData) {
        vendor = {
          code: vendorData.code,
          name: vendorData.name,
          contact: `${vendorData.contact_person || 'N/A'} (${vendorData.email || 'N/A'})`,
        };
        console.log('[UID Trace] Vendor object created:', vendor);
      } else {
        console.log('[UID Trace] No vendor data found for supplier_id:', uidRecord.supplier_id);
      }
    } else {
      console.log('[UID Trace] No supplier_id in UID record');
    }

    // 2b. Get PO details if available
    let purchase_order = null;
    console.log('[UID Trace] UID Record purchase_order_id:', uidRecord.purchase_order_id);
    if (uidRecord.purchase_order_id) {
      const { data: poData, error: poError } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number, order_date, total_amount')
        .eq('id', uidRecord.purchase_order_id)
        .maybeSingle();
      
      console.log('[UID Trace] PO lookup result:', { poData, poError });
      if (poData) {
        purchase_order = {
          po_number: poData.po_number,
          order_date: poData.order_date,
          total_amount: poData.total_amount,
        };
        console.log('[UID Trace] PO object created:', purchase_order);
      } else {
        console.log('[UID Trace] No PO data found for purchase_order_id:', uidRecord.purchase_order_id);
      }
    } else {
      console.log('[UID Trace] No purchase_order_id in UID record');
    }

    // 2c. Get GRN details if available
    let grn_info = null;
    if (uidRecord.grn_id) {
      const { data: grnData } = await this.supabase
        .from('grn')
        .select('id, grn_number, grn_date, received_date')
        .eq('id', uidRecord.grn_id)
        .maybeSingle();
      
      if (grnData) {
        grn_info = {
          grn_number: grnData.grn_number,
          grn_date: grnData.grn_date || grnData.received_date,
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

    const result = {
      uid: uidRecord.uid,
      entity_type: uidRecord.entity_type,
      item: {
        code: itemData?.code || 'N/A',
        name: itemData?.name || 'N/A',
        category: itemData?.category || 'N/A',
      },
      status: uidRecord.status,
      location: uidRecord.location,
      batch_number: uidRecord.batch_number,
      lifecycle,
      components,
      parent_products,
      vendor: vendor || null,
      purchase_order: purchase_order || null,
      grn: grn_info || null,
      quality_checkpoints: quality_checkpoints || [],
      customer: customer || null,
    };

    console.log('[UID Trace] Final result vendor:', result.vendor);
    console.log('[UID Trace] Final result purchase_order:', result.purchase_order);

    return result;
  }

  /**
   * Get all UIDs with filtering - for quality inspection form
   */
  async getAllUIDs(req: any, status?: string, entityType?: string, itemId?: string, page?: number, limit?: number) {
    const tenantId = req.user?.tenantId || req.tenantId;
    
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Pagination parameters
    const currentPage = page || 1;
    const pageLimit = limit || 50;
    const offset = (currentPage - 1) * pageLimit;
    
    let query = this.supabase
      .from('uid_registry')
      .select(`
        uid, 
        entity_id, 
        entity_type, 
        status, 
        location, 
        batch_number, 
        quality_status, 
        created_at
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (itemId) {
      query = query.eq('entity_id', itemId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[getAllUIDs] Error:', error);
      throw new Error(`Failed to fetch UIDs: ${error.message}`);
    }

    // Fetch item details separately if we have UIDs
    if (data && data.length > 0) {
      const entityIds = [...new Set(data.map(uid => uid.entity_id).filter(Boolean))];
      
      if (entityIds.length > 0) {
        const { data: items } = await this.supabase
          .from('items')
          .select('id, code, name')
          .in('id', entityIds);
        
        if (items) {
          const itemsMap = new Map(items.map(item => [item.id, item]));
          
          // Attach item details to UIDs
          data.forEach((uid: any) => {
            const item = itemsMap.get(uid.entity_id);
            if (item) {
              uid.items = item;
            }
          });
        }
      }
    }

    return {
      data,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    };
  }

  /**
   * Get UID details with vendor and item information for quality inspection
   */
  async getUIDDetails(req: any, uid: string) {
    const tenantId = req.user.tenantId;
    console.log(`[getUIDDetails] Fetching UID: ${uid} for tenant: ${tenantId}`);

    // First check if UID exists
    const { data: uidCheck, error: checkError } = await this.supabase
      .from('uid_registry')
      .select('uid, entity_id, supplier_id, grn_id, tenant_id')
      .eq('uid', uid)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    console.log(`[getUIDDetails] UID check result:`, uidCheck);
    console.log(`[getUIDDetails] Check error:`, checkError);

    if (checkError) {
      console.error('Error checking UID:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (!uidCheck) {
      console.error(`UID ${uid} not found for tenant ${tenantId}`);
      throw new Error(`UID ${uid} not found or does not belong to your tenant`);
    }

    console.log(`[getUIDDetails] UID exists, fetching related data...`);

    // Fetch UID record - don't use joins, fetch items and vendors separately
    const { data: uidRecord, error } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('uid', uid)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    console.log(`[getUIDDetails] Full UID record:`, JSON.stringify(uidRecord, null, 2));
    console.log(`[getUIDDetails] Fetch error:`, error);

    if (error) {
      console.error('Error fetching UID details:', error);
      throw new Error(`Failed to fetch UID details: ${error.message}`);
    }

    if (!uidRecord) {
      throw new Error(`UID ${uid} data not found`);
    }

    // Fetch item details separately if entity_id exists
    let itemData = null;
    if (uidRecord.entity_id) {
      const { data: item } = await this.supabase
        .from('items')
        .select('id, name, code, description')
        .eq('id', uidRecord.entity_id)
        .maybeSingle();
      itemData = item;
    }

    // Fetch vendor details separately if supplier_id exists
    let vendorData = null;
    if (uidRecord.supplier_id) {
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('id, name, code')
        .eq('id', uidRecord.supplier_id)
        .maybeSingle();
      vendorData = vendor;
    }

    console.log(`[getUIDDetails] Item data:`, itemData);
    console.log(`[getUIDDetails] Vendor data:`, vendorData);

    const result = {
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

    console.log(`[getUIDDetails] Returning result:`, result);
    return result;
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
