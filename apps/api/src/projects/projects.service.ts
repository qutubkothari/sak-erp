import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function text(value: any, fallback = '') {
  return String(value ?? fallback).trim();
}

function code(value: any) {
  return text(value).toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-_]/g, '').slice(0, 60);
}

function isMissingSchemaError(error: any) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('schema cache') || message.includes('does not exist') || message.includes('exec_sql');
}

@Injectable()
export class ProjectsService {
  private supabase: SupabaseClient;
  private schemaReady: Promise<void> | null = null;

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  }

  async ensureSchema() {
    if (this.schemaReady) return this.schemaReady;

    this.schemaReady = (async () => {
      const sql = `
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_code VARCHAR(80) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  department VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, project_code)
);

CREATE TABLE IF NOT EXISTS public.project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  source_module VARCHAR(80),
  source_id UUID,
  source_number VARCHAR(120),
  remarks TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_project_events_project ON public.project_events(project_id);

ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS is_rnd_item BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';
`;

      const { error } = await this.supabase.rpc('exec_sql', { sql });
      if (!error) return;

      const message = String(error.message || '');
      if (message.includes('exec_sql')) {
        const probe = await this.supabase.from('projects').select('id', { count: 'exact', head: true }).limit(1);
        if (!probe.error) return;
      }

      if (isMissingSchemaError(error)) {
        console.warn('[ProjectsService] project schema unavailable; returning empty read models until migration is applied.');
        return;
      }

      throw new BadRequestException(`Project schema setup failed: ${error.message}`);
    })();

    return this.schemaReady;
  }

  async findAll(tenantId: string, query: any = {}) {
    await this.ensureSchema();
    let db = this.supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (query.department) db = db.eq('department', text(query.department).toUpperCase());
    if (query.status && query.status !== 'ALL') db = db.eq('status', text(query.status).toUpperCase());
    if (query.search) {
      const search = text(query.search).replace(/[%*,]/g, '');
      if (search) db = db.or(`project_code.ilike.%${search}%,project_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await db;
    if (error) {
      if (isMissingSchemaError(error)) return [];
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async findOne(tenantId: string, id: string) {
    await this.ensureSchema();
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Project not found');
    return data;
  }

  async create(tenantId: string, userId: string, body: any) {
    await this.ensureSchema();
    const name = text(body.projectName ?? body.project_name ?? body.name);
    if (!name) throw new BadRequestException('Project name is required.');
    const department = text(body.department || 'PRODUCTION').toUpperCase();
    if (!['PRODUCTION', 'R&D', 'RND'].includes(department)) {
      throw new BadRequestException('Department must be Production or R&D.');
    }
    const normalizedDepartment = department === 'RND' ? 'R&D' : department;
    const projectCode = code(body.projectCode ?? body.project_code) || code(name);

    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        tenant_id: tenantId,
        project_code: projectCode,
        project_name: name,
        department: normalizedDepartment,
        status: text(body.status || 'ACTIVE').toUpperCase(),
        description: text(body.description) || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.logEvent(tenantId, data.id, userId, {
      eventType: 'PROJECT_CREATED',
      sourceModule: 'PROJECTS',
      sourceId: data.id,
      sourceNumber: data.project_code,
      remarks: 'Project master created',
    });
    return data;
  }

  async update(tenantId: string, id: string, body: any) {
    await this.ensureSchema();
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.projectName !== undefined || body.project_name !== undefined || body.name !== undefined) {
      payload.project_name = text(body.projectName ?? body.project_name ?? body.name);
    }
    if (body.projectCode !== undefined || body.project_code !== undefined) payload.project_code = code(body.projectCode ?? body.project_code);
    if (body.department !== undefined) {
      const department = text(body.department).toUpperCase();
      payload.department = department === 'RND' ? 'R&D' : department;
    }
    if (body.status !== undefined) payload.status = text(body.status).toUpperCase();
    if (body.description !== undefined) payload.description = text(body.description) || null;

    const { data, error } = await this.supabase
      .from('projects')
      .update(payload)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async trail(tenantId: string, id: string) {
    await this.ensureSchema();
    const project = await this.findOne(tenantId, id);
    const { data, error } = await this.supabase
      .from('project_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return { project, events: data || [] };
  }

  async logEvent(tenantId: string, projectId: string | null, userId: string | null, params: {
    eventType: string;
    sourceModule?: string;
    sourceId?: string | null;
    sourceNumber?: string | null;
    remarks?: string | null;
    metadata?: Record<string, any>;
  }) {
    await this.ensureSchema();
    if (!projectId) return null;
    const { error } = await this.supabase.from('project_events').insert({
      tenant_id: tenantId,
      project_id: projectId,
      event_type: params.eventType,
      source_module: params.sourceModule || null,
      source_id: params.sourceId || null,
      source_number: params.sourceNumber || null,
      remarks: params.remarks || null,
      metadata: params.metadata || {},
      created_by: userId || null,
    });
    if (error) throw new BadRequestException(error.message);
    return true;
  }
}
