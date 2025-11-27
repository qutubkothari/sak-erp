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

    const { data, error } = await this.supabase
      .from('uid_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .single();

    if (error) throw new Error(error.message);
    return data;
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
