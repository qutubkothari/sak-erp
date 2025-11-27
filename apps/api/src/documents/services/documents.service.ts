import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class DocumentsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async create(req: any, createDto: any) {
    const tenantId = req.user.tenantId;

    // Auto-generate document number if not provided
    if (!createDto.document_number) {
      const { data: lastDoc } = await this.supabase
        .from('documents')
        .select('document_number')
        .eq('tenant_id', tenantId)
        .like('document_number', 'DOC-%')
        .order('document_number', { ascending: false })
        .limit(1)
        .single();

      const lastNumber = lastDoc?.document_number
        ? parseInt(lastDoc.document_number.split('-')[1])
        : 0;
      createDto.document_number = `DOC-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    const { data, error } = await this.supabase
      .from('documents')
      .insert([
        {
          ...createDto,
          tenant_id: tenantId,
          created_by: req.user.userId,
          status: createDto.status || 'DRAFT',
          current_revision: createDto.current_revision || '1.0',
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log access
    await this.logAccess(tenantId, data.id, req.user.userId, 'CREATE');

    // Create initial revision
    await this.createRevision(tenantId, data.id, {
      revision_number: data.current_revision,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      change_description: 'Initial version',
      revision_type: 'MAJOR',
      status: 'ACTIVE',
      created_by: req.user.userId,
    });

    return data;
  }

  async findAll(req: any, filters?: any) {
    const tenantId = req.user.tenantId;

    let query = this.supabase
      .from('documents')
      .select(`
        *,
        category:document_categories(id, name, code),
        created_by_user:users!documents_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!documents_approved_by_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.related_entity_type) {
      query = query.eq('related_entity_type', filters.related_entity_type);
    }

    if (filters?.related_entity_id) {
      query = query.eq('related_entity_id', filters.related_entity_id);
    }

    if (filters?.uid_reference) {
      query = query.eq('uid_reference', filters.uid_reference);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%`,
      );
    }

    if (filters?.is_archived === false || filters?.is_archived === true) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false); // Default: exclude archived
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('documents')
      .select(`
        *,
        category:document_categories(id, name, code),
        created_by_user:users!documents_created_by_fkey(id, first_name, last_name, email),
        reviewed_by_user:users!documents_reviewed_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!documents_approved_by_fkey(id, first_name, last_name, email),
        revisions:document_revisions(
          id, revision_number, file_url, file_name, file_size, 
          change_description, status, created_at,
          created_by_user:users(id, first_name, last_name)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    // Log access
    await this.logAccess(tenantId, id, req.user.userId, 'VIEW');

    return data;
  }

  async update(req: any, id: string, updateDto: any) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('documents')
      .update(updateDto)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log access
    await this.logAccess(tenantId, id, req.user.userId, 'EDIT');

    return data;
  }

  async delete(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Log access
    await this.logAccess(tenantId, id, req.user.userId, 'DELETE');

    return { message: 'Document deleted successfully' };
  }

  async createRevision(tenantId: string, documentId: string, revisionDto: any) {
    const { data, error } = await this.supabase
      .from('document_revisions')
      .insert([
        {
          ...revisionDto,
          tenant_id: tenantId,
          document_id: documentId,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mark previous revisions as superseded
    if (revisionDto.status === 'ACTIVE') {
      await this.supabase
        .from('document_revisions')
        .update({ status: 'SUPERSEDED' })
        .eq('tenant_id', tenantId)
        .eq('document_id', documentId)
        .neq('id', data.id);
    }

    return data;
  }

  async addRevision(req: any, id: string, revisionDto: any) {
    const tenantId = req.user.tenantId;

    // Get current document
    const { data: doc } = await this.supabase
      .from('documents')
      .select('current_revision')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (!doc) throw new Error('Document not found');

    // Create new revision
    const revision = await this.createRevision(tenantId, id, {
      ...revisionDto,
      created_by: req.user.userId,
      status: 'ACTIVE',
    });

    // Update document with new revision number and file
    await this.supabase
      .from('documents')
      .update({
        current_revision: revisionDto.revision_number,
        file_url: revisionDto.file_url,
        file_name: revisionDto.file_name,
        file_size: revisionDto.file_size,
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    // Log access
    await this.logAccess(tenantId, id, req.user.userId, 'EDIT');

    return revision;
  }

  async submitForApproval(req: any, id: string, approvalWorkflow: any) {
    const tenantId = req.user.tenantId;

    // Update document status
    await this.supabase
      .from('documents')
      .update({ status: 'PENDING_APPROVAL' })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    // Create approval workflow
    const approvalRecords = approvalWorkflow.approvers.map(
      (approver: any, index: number) => ({
        tenant_id: tenantId,
        document_id: id,
        approval_sequence: index + 1,
        approver_role_id: approver.role_id,
        approver_user_id: approver.user_id,
        is_mandatory: approver.is_mandatory ?? true,
        sla_hours: approver.sla_hours || 48,
        due_date: new Date(Date.now() + (approver.sla_hours || 48) * 60 * 60 * 1000),
        status: 'PENDING',
      }),
    );

    const { data, error } = await this.supabase
      .from('document_approvals')
      .insert(approvalRecords)
      .select();

    if (error) throw new Error(error.message);

    return data;
  }

  async approveDocument(req: any, id: string, approvalId: string, comments?: string) {
    const tenantId = req.user.tenantId;

    // Update approval record
    await this.supabase
      .from('document_approvals')
      .update({
        status: 'APPROVED',
        comments,
        responded_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', approvalId)
      .eq('approver_user_id', req.user.userId);

    // Check if all approvals are complete
    const { data: allApprovals } = await this.supabase
      .from('document_approvals')
      .select('status, is_mandatory')
      .eq('tenant_id', tenantId)
      .eq('document_id', id);

    const allApproved = allApprovals?.every(
      (a) => !a.is_mandatory || a.status === 'APPROVED' || a.status === 'SKIPPED',
    );

    if (allApproved) {
      // Update document status to approved
      await this.supabase
        .from('documents')
        .update({
          status: 'APPROVED',
          approved_by: req.user.userId,
          approved_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('id', id);
    }

    return { message: 'Document approved successfully' };
  }

  async rejectDocument(req: any, id: string, approvalId: string, reason: string) {
    const tenantId = req.user.tenantId;

    // Update approval record
    await this.supabase
      .from('document_approvals')
      .update({
        status: 'REJECTED',
        comments: reason,
        responded_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', approvalId)
      .eq('approver_user_id', req.user.userId);

    // Update document status
    await this.supabase
      .from('documents')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    return { message: 'Document rejected' };
  }

  async archiveDocument(req: any, id: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('documents')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: req.user.userId,
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log access
    await this.logAccess(tenantId, id, req.user.userId, 'EDIT');

    return data;
  }

  async logAccess(
    tenantId: string,
    documentId: string,
    userId: string,
    action: string,
  ) {
    await this.supabase.from('document_access_logs').insert([
      {
        tenant_id: tenantId,
        document_id: documentId,
        user_id: userId,
        action,
      },
    ]);
  }

  async getAccessLogs(req: any, documentId: string) {
    const tenantId = req.user.tenantId;

    const { data, error } = await this.supabase
      .from('document_access_logs')
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .eq('tenant_id', tenantId)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getPendingApprovals(req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const { data, error } = await this.supabase
      .from('document_approvals')
      .select(`
        *,
        document:documents(id, document_number, title, document_type, current_revision)
      `)
      .eq('tenant_id', tenantId)
      .eq('approver_user_id', userId)
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }
}
