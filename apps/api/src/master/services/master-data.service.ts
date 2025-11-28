import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class MasterDataService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }

  async getDepartments(tenantId: string) {
    const { data, error } = await this.supabase
      .from('departments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getWarehouses(tenantId: string) {
    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getUnitsOfMeasure(tenantId: string) {
    const { data, error } = await this.supabase
      .from('units_of_measure')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getItemCategories(tenantId: string) {
    const { data, error } = await this.supabase
      .from('item_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getPaymentTerms(tenantId: string) {
    const { data, error } = await this.supabase
      .from('payment_terms')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('days', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }
}
