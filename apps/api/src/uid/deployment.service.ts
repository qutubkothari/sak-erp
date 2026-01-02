import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateDeploymentDto, UpdateDeploymentDto, PublicDeploymentUpdateDto } from './dto/deployment.dto';

@Injectable()
export class DeploymentService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async createDeployment(tenantId: string, userId: string, dto: CreateDeploymentDto) {
    // Verify UID exists and belongs to tenant
    const { data: uid, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('id, uid, entity_id, entity_type')
      .eq('id', dto.uid_id)
      .eq('tenant_id', tenantId)
      .single();

    if (uidError || !uid) {
      throw new NotFoundException('UID not found');
    }

    // Generate public access token
    const publicToken = await this.generatePublicToken();

    // Create deployment record
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .insert({
        tenant_id: tenantId,
        uid_id: dto.uid_id,
        deployment_level: dto.deployment_level,
        organization_name: dto.organization_name,
        location_name: dto.location_name,
        deployment_date: dto.deployment_date,
        parent_deployment_id: dto.parent_deployment_id || null,
        contact_person: dto.contact_person || null,
        contact_email: dto.contact_email || null,
        contact_phone: dto.contact_phone || null,
        deployment_notes: dto.deployment_notes || null,
        warranty_expiry_date: dto.warranty_expiry_date || null,
        maintenance_schedule: dto.maintenance_schedule || null,
        is_current_location: dto.is_current_location !== false, // Default to true
        public_access_token: publicToken,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Deployment creation error:', error);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async getDeploymentStatus(tenantId: string, filters?: {
    uid?: string;
    part_number?: string;
    organization?: string;
    location?: string;
    search?: string;
    offset?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }) {
    const offset = Number.isFinite(filters?.offset) ? Math.max(0, filters!.offset!) : 0;
    const limit = Number.isFinite(filters?.limit) ? Math.min(200, Math.max(1, filters!.limit!)) : 50;

    const allowedSortFields = new Set([
      'uid',
      'client_part_number',
      'item_name',
      'item_code',
      'current_level',
      'current_organization',
      'current_location',
      'current_deployment_date',
      'deployment_count',
      'warranty_expiry_date',
    ]);

    const sortBy = allowedSortFields.has(filters?.sort_by || '') ? (filters!.sort_by as string) : 'uid';
    const sortAscending = (filters?.sort_order || 'asc').toLowerCase() !== 'desc';

    let query = this.supabase
      .from('v_uid_deployment_status')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    if (filters?.part_number) {
      query = query.eq('client_part_number', filters.part_number);
    }

    if (filters?.organization) {
      query = query.ilike('current_organization', `%${filters.organization}%`);
    }

    if (filters?.location) {
      query = query.ilike('current_location', `%${filters.location}%`);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(
        [
          `uid.ilike.%${q}%`,
          `client_part_number.ilike.%${q}%`,
          `item_name.ilike.%${q}%`,
          `item_code.ilike.%${q}%`,
          `current_organization.ilike.%${q}%`,
          `current_location.ilike.%${q}%`,
          `current_level.ilike.%${q}%`,
        ].join(','),
      );
    }

    query = query.order(sortBy, { ascending: sortAscending }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Fetch deployment status error:', error);
      throw new BadRequestException(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
      offset,
      limit,
    };
  }

  async getDeployments(tenantId: string, filters?: {
    uid_id?: string;
    organization?: string;
    deployment_level?: string;
    is_current?: boolean;
  }) {
    let query = this.supabase
      .from('product_deployment_history')
      .select(`
        *,
        uid:uid_registry (
          uid,
          client_part_number,
          entity_id,
          entity_type
        )
      `)
      .eq('tenant_id', tenantId)
      .order('deployment_date', { ascending: false });

    if (filters?.uid_id) {
      query = query.eq('uid_id', filters.uid_id);
    }

    if (filters?.organization) {
      query = query.ilike('organization_name', `%${filters.organization}%`);
    }

    if (filters?.deployment_level) {
      query = query.eq('deployment_level', filters.deployment_level);
    }

    if (filters?.is_current !== undefined) {
      query = query.eq('is_current_location', filters.is_current);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch deployments error:', error);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async getDeploymentById(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .select(`
        *,
        uid:uid_registry (
          uid,
          client_part_number,
          entity_id,
          entity_type
        ),
        parent:product_deployment_history!parent_deployment_id (
          id,
          organization_name,
          location_name,
          deployment_level
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Deployment not found');
    }

    return data;
  }

  async getDeploymentChain(tenantId: string, uidId: string) {
    // Get all deployments for this UID ordered by date
    const { data: deployments, error } = await this.supabase
      .from('product_deployment_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid_id', uidId)
      .order('deployment_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch deployment chain error:', error);
      throw new BadRequestException(error.message);
    }

    // Build hierarchy
    const deploymentMap = new Map(deployments.map(d => [d.id, { ...d, children: [] }]));
    const rootDeployments: any[] = [];

    deployments.forEach(deployment => {
      const node = deploymentMap.get(deployment.id);
      if (deployment.parent_deployment_id) {
        const parent = deploymentMap.get(deployment.parent_deployment_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootDeployments.push(node);
        }
      } else {
        rootDeployments.push(node);
      }
    });

    return rootDeployments;
  }

  async getCurrentLocation(tenantId: string, uidId: string) {
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .select(`
        *,
        uid:uid_registry (
          uid,
          client_part_number,
          item:items (
            name,
            code
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('uid_id', uidId)
      .eq('is_current_location', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Fetch current location error:', error);
      throw new BadRequestException(error.message);
    }

    return data || null;
  }

  async updateDeployment(tenantId: string, id: string, dto: UpdateDeploymentDto) {
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .update({
        organization_name: dto.organization_name,
        location_name: dto.location_name,
        deployment_date: dto.deployment_date,
        contact_person: dto.contact_person,
        contact_email: dto.contact_email,
        contact_phone: dto.contact_phone,
        deployment_notes: dto.deployment_notes,
        warranty_expiry_date: dto.warranty_expiry_date,
        maintenance_schedule: dto.maintenance_schedule,
        is_current_location: dto.is_current_location,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Update deployment error:', error);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async setCurrentLocation(tenantId: string, uidId: string, deploymentId: string) {
    // First, unmark all other deployments as current
    const { error: unmarkError } = await this.supabase
      .from('product_deployment_history')
      .update({ is_current_location: false })
      .eq('tenant_id', tenantId)
      .eq('uid_id', uidId)
      .neq('id', deploymentId);

    if (unmarkError) {
      console.error('Unmark current location error:', unmarkError);
      throw new BadRequestException(unmarkError.message);
    }

    // Then mark the specified deployment as current
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .update({ is_current_location: true })
      .eq('id', deploymentId)
      .eq('tenant_id', tenantId)
      .eq('uid_id', uidId)
      .select()
      .single();

    if (error) {
      console.error('Set current location error:', error);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async deleteDeployment(tenantId: string, id: string) {
    // Check if this deployment has children
    const { data: children } = await this.supabase
      .from('product_deployment_history')
      .select('id')
      .eq('parent_deployment_id', id)
      .eq('tenant_id', tenantId);

    if (children && children.length > 0) {
      throw new BadRequestException('Cannot delete deployment with child deployments');
    }

    const { error } = await this.supabase
      .from('product_deployment_history')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Delete deployment error:', error);
      throw new BadRequestException(error.message);
    }

    return { message: 'Deployment deleted successfully' };
  }

  // Public warranty portal methods (no tenant check)
  async searchByPartNumberOrUid(search: string) {
    // Try to find by client_part_number or uid
    const { data, error } = await this.supabase
      .from('uid_registry')
      .select(`
        id,
        uid,
        client_part_number,
        item:items (
          name,
          code
        )
      `)
      .or(`uid.eq.${search},client_part_number.eq.${search}`)
      .limit(1)
      .single();

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }

    // Get current deployment with public token
    const { data: deployment } = await this.supabase
      .from('product_deployment_history')
      .select('public_access_token')
      .eq('uid_id', data.id)
      .eq('is_current_location', true)
      .single();

    return {
      uid_id: data.id,
      uid: data.uid,
      client_part_number: data.client_part_number,
      item: data.item,
      public_token: deployment?.public_access_token || null,
    };
  }

  async getByPublicToken(token: string) {
    const { data, error } = await this.supabase
      .from('product_deployment_history')
      .select(`
        id,
        deployment_level,
        organization_name,
        location_name,
        deployment_date,
        contact_person,
        contact_email,
        contact_phone,
        deployment_notes,
        warranty_expiry_date,
        maintenance_schedule,
        is_current_location,
        uid:uid_registry (
          uid,
          client_part_number,
          item:items (
            name,
            code
          )
        )
      `)
      .eq('public_access_token', token)
      .single();

    if (error || !data) {
      throw new NotFoundException('Invalid or expired warranty token');
    }

    // Get deployment history
    const { data: history } = await this.supabase
      .from('product_deployment_history')
      .select('deployment_level, organization_name, location_name, deployment_date, is_current_location')
      .eq('uid_id', (data.uid as any).id)
      .order('deployment_date', { ascending: true });

    return {
      ...data,
      history: history || [],
    };
  }

  async updateViaPublicToken(token: string, dto: PublicDeploymentUpdateDto) {
    // Get current deployment
    const { data: currentDeployment, error } = await this.supabase
      .from('product_deployment_history')
      .select('id, uid_id, tenant_id')
      .eq('public_access_token', token)
      .eq('is_current_location', true)
      .single();

    if (error || !currentDeployment) {
      throw new NotFoundException('Invalid or expired warranty token');
    }

    // Create new deployment as child of current
    const newToken = await this.generatePublicToken();
    
    const { data: newDeployment, error: createError } = await this.supabase
      .from('product_deployment_history')
      .insert({
        tenant_id: currentDeployment.tenant_id,
        uid_id: currentDeployment.uid_id,
        deployment_level: 'END_LOCATION', // Public updates default to END_LOCATION
        organization_name: dto.organization_name,
        location_name: dto.location_name,
        deployment_date: new Date().toISOString().split('T')[0],
        parent_deployment_id: currentDeployment.id,
        contact_email: dto.verification_email,
        deployment_notes: dto.deployment_notes || 'Updated via public warranty portal',
        is_current_location: true,
        public_access_token: newToken,
      })
      .select()
      .single();

    if (createError) {
      console.error('Public deployment update error:', createError);
      throw new BadRequestException(createError.message);
    }

    return {
      message: 'Location updated successfully',
      new_token: newToken,
    };
  }

  private async generatePublicToken(): Promise<string> {
    // Generate token: WRT-{16 chars}
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'WRT-';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
