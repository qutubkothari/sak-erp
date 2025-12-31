import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private supabase: SupabaseClient;

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

    return data;
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

    return data;
  }

  async create(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
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

    // Create user
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: dto.email,
        password: hashedPassword,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role_id: dto.roleId,
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

    return data;
  }

  async update(
    id: string,
    dto: {
      first_name?: string;
      last_name?: string;
      role_id?: string;
      is_active?: boolean;
    },
    tenantId: string,
  ) {
    const { data, error } = await this.supabase
      .from('users')
      .update(dto)
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
