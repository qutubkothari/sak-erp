import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private supabase: SupabaseClient;

  private async tryLoadUserRoles(tenantId: string, userIds: string[]) {
    if (userIds.length === 0) return new Map<string, any[]>();

    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(
          `user_id,
           role:roles (
             id,
             name,
             permissions
           )`,
        )
        .eq('tenant_id', tenantId)
        .in('user_id', userIds);

      if (error) {
        throw error;
      }

      const map = new Map<string, any[]>();
      for (const row of data || []) {
        const uid = (row as any).user_id as string;
        const role = (row as any).role;
        if (!uid || !role) continue;
        const list = map.get(uid) ?? [];
        list.push(role);
        map.set(uid, list);
      }
      return map;
    } catch {
      return new Map<string, any[]>();
    }
  }

  private async trySyncUserRoles(tenantId: string, userId: string, roleIds: string[]) {
    try {
      // Replace existing assignments
      await this.supabase
        .from('user_roles')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (roleIds.length === 0) return;

      const rows = roleIds.map((roleId) => ({
        tenant_id: tenantId,
        user_id: userId,
        role_id: roleId,
      }));

      await this.supabase
        .from('user_roles')
        .insert(rows);
    } catch {
      // ignore if user_roles doesn't exist yet
    }
  }

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        role:roles (
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = data || [];
    const rolesByUserId = await this.tryLoadUserRoles(
      tenantId,
      users.map((u: any) => u.id),
    );

    return users.map((u: any) => {
      const multi = rolesByUserId.get(u.id) ?? [];
      const fallback = u.role ? [u.role] : [];
      return {
        ...u,
        roles: (multi.length > 0 ? multi : fallback).map((role: any) => ({ role })),
      };
    });
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    const rolesByUserId = await this.tryLoadUserRoles(tenantId, [data.id]);
    const multi = rolesByUserId.get(data.id) ?? [];
    const fallback = (data as any).role ? [(data as any).role] : [];

    return {
      ...data,
      roles: (multi.length > 0 ? multi : fallback).map((role: any) => ({ role })),
    };
  }

  async create(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId?: string;
    roleIds?: string[];
    tenantId: string;
  }) {
    // Check if user already exists
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .eq('tenant_id', dto.tenantId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const roleIds = Array.isArray(dto.roleIds)
      ? dto.roleIds.filter(Boolean)
      : dto.roleId
        ? [dto.roleId]
        : [];

    // Create user
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: dto.email,
        password: hashedPassword,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role_id: roleIds[0] || null,
        tenant_id: dto.tenantId,
        is_active: true,
      })
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    await this.trySyncUserRoles(dto.tenantId, data.id, roleIds);

    return data;
  }

  async update(
    id: string,
    dto: {
      first_name?: string;
      last_name?: string;
      role_id?: string;
      roleIds?: string[];
      is_active?: boolean;
    },
    tenantId: string,
  ) {
    const roleIds = Array.isArray((dto as any).roleIds)
      ? (dto as any).roleIds.filter(Boolean)
      : dto.role_id
        ? [dto.role_id]
        : null;

    const updateDto: any = { ...dto };
    delete updateDto.roleIds;

    if (roleIds) {
      updateDto.role_id = roleIds[0] || null;
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(updateDto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at
      `)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    if (roleIds) {
      await this.trySyncUserRoles(tenantId, id, roleIds);
    }

    return data;
  }

  async delete(id: string, tenantId: string) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    return { message: 'User deleted successfully' };
  }
}
