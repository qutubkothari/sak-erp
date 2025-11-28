import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class VendorsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async create(tenantId: string, data: any) {
    // Generate vendor code if not provided
    const code = data.code || await this.generateVendorCode(tenantId);

    const { data: vendor, error } = await this.supabase
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        code,
        name: data.name,
        legal_name: data.legalName || data.name,
        tax_id: data.taxId,
        category: data.category,
        rating: data.rating,
        payment_terms: data.paymentTerms,
        credit_limit: data.creditLimit,
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        is_active: data.isActive !== undefined ? data.isActive : true,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return vendor;
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.search) {
      query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Vendor not found');
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('vendors')
      .update({
        name: data.name,
        legal_name: data.legalName,
        tax_id: data.taxId,
        category: data.category,
        rating: data.rating,
        payment_terms: data.paymentTerms,
        credit_limit: data.creditLimit,
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        is_active: data.isActive,
        metadata: data.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('vendors')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Vendor deleted successfully' };
  }

  private async generateVendorCode(tenantId: string): Promise<string> {
    const prefix = 'VEN';

    // Get the count of all vendors to generate a unique code
    const { count, error } = await this.supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) {
      // Fallback to timestamp-based code if count fails
      return `${prefix}${Date.now().toString().slice(-6)}`;
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }
}
