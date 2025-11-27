import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class DocumentRevisionsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async findAllByDocument(req: any, documentId: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_revisions')
      .select(`
        *,
        created_by_user:users!document_revisions_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!document_revisions_approved_by_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', tenantId)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_revisions')
      .select(`
        *,
        created_by_user:users!document_revisions_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!document_revisions_approved_by_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
