import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class DocumentCategoriesService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async create(req: any, createDto: any) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_categories')
      .insert([
        {
          ...createDto,
          tenant_id: tenantId,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(req: any) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(req: any, id: string, updateDto: any) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_categories')
      .update(updateDto)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { error } = await this.supabase
      .from('document_categories')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Category deleted successfully' };
  }
}
