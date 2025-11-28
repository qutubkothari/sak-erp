import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ItemsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async findAll(tenantId: string, search?: string) {
    let query = this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return data || [];
  }

  async search(tenantId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    const { data, error } = await this.supabase
      .from('items')
      .select('id, code, name, description, uom, category')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(20)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  async create(tenantId: string, itemData: any) {
    const { data, error } = await this.supabase
      .from('items')
      .insert({
        tenant_id: tenantId,
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        uom: itemData.uom,
        reorder_level: itemData.reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: itemData.standardCost,
        is_active: true,
        metadata: itemData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create item: ${error.message}`);
    }

    return data;
  }

  async update(tenantId: string, id: string, itemData: any) {
    const { data, error } = await this.supabase
      .from('items')
      .update({
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        uom: itemData.uom,
        reorder_level: itemData.reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: itemData.standardCost,
        metadata: itemData.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async delete(tenantId: string, id: string) {
    // Soft delete
    const { error } = await this.supabase
      .from('items')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }

    return { message: 'Item deleted successfully' };
  }
}
