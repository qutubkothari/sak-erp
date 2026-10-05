import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuditActivityInput {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceCode?: string | null;
  resourceName?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  limit?: number;
  offset?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  source?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async logActivity(input: AuditActivityInput): Promise<void> {
    if (!input.tenantId || !input.userId) return;

    try {
      const oldValue = this.sanitizeAuditValue(input.oldValue ?? null);
      const newValue = this.sanitizeAuditValue(input.newValue ?? null);
      const metadata = this.sanitizeAuditValue(input.metadata || {});
      const changedFields = this.getChangedFields(input.action, oldValue, newValue);
      if (changedFields.length > 0) metadata.changed_fields = changedFields;

      const { error } = await this.supabase.from('activity_logs').insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId || null,
        resource_code: input.resourceCode || null,
        resource_name: input.resourceName || null,
        old_value: oldValue,
        new_value: newValue,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        metadata,
      });

      if (error) {
        this.logger.warn(`Audit log insert failed: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.warn(`Audit log insert failed: ${error?.message || error}`);
    }
  }

  async listActivityLogs(tenantId: string, query: AuditLogQuery = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    const offset = Math.max(Number(query.offset) || 0, 0);

    let request = this.supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.action) request = request.eq('action', query.action);
    if (query.resourceType) request = request.eq('resource_type', query.resourceType);
    if (query.userId) request = request.eq('user_id', query.userId);
    if (query.source) request = request.eq(query.source === 'AuditInterceptor' ? 'metadata->>audit_source' : 'metadata->>source', query.source);
    if (query.status) request = request.eq('metadata->>status', query.status);
    if (query.from) request = request.gte('created_at', query.from);
    if (query.to) request = request.lte('created_at', query.to);

    const search = String(query.search || '').trim();
    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&');
      request = request.or(`resource_code.ilike.%${escaped}%,resource_name.ilike.%${escaped}%,resource_type.ilike.%${escaped}%,action.ilike.%${escaped}%,metadata->>employee_code.ilike.%${escaped}%,metadata->>document_reference.ilike.%${escaped}%`);
    }

    const { data, error, count } = await request;
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const userIds = Array.from(new Set(rows.map((row: any) => row?.user_id).filter(Boolean)));
    const userMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: users } = await this.supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .in('id', userIds);

      for (const user of users || []) {
        userMap.set(user.id, {
          id: user.id,
          name: this.formatUserName(user),
          email: user.email || '',
        });
      }
    }

    return {
      data: rows.map((row: any) => ({
        ...row,
        user: row?.user_id ? userMap.get(row.user_id) || null : null,
      })),
      total: count || 0,
      limit,
      offset,
    };
  }

  async getActivityLogFilters(tenantId: string) {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('action, resource_type, metadata, user_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const userIds = Array.from(new Set((data || []).map((row: any) => row.user_id).filter(Boolean)));
    const { data: users } = userIds.length ? await this.supabase
      .from('users')
      .select('id, first_name, last_name, username, email')
      .eq('tenant_id', tenantId)
      .in('id', userIds) : { data: [] as any[] };

    return {
      actions: Array.from(new Set((data || []).map((row: any) => row.action).filter(Boolean))).sort(),
      resourceTypes: Array.from(new Set((data || []).map((row: any) => row.resource_type).filter(Boolean))).sort(),
      sources: Array.from(new Set((data || []).map((row: any) => row.metadata?.source || row.metadata?.audit_source).filter(Boolean))).sort(),
      users: (users || []).map((user: any) => ({ id: user.id, name: this.formatUserName(user), email: user.email || '' })),
    };
  }

  private formatUserName(user: any): string {
    return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || user?.email || 'Unknown user';
  }

  private sanitizeAuditValue(value: any, depth = 0): any {
    if (value === null || value === undefined) return value;
    if (depth > 8) return '[MAX_DEPTH]';
    if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.slice(0, 100).map((entry) => this.sanitizeAuditValue(entry, depth + 1));
    if (typeof value !== 'object') return String(value);

    const result: Record<string, any> = {};
    const sensitive = /password|token|secret|authorization|cookie|api.?key|private.?key|credential|otp|refresh.?token|access.?token/i;
    for (const [key, entry] of Object.entries(value)) {
      result[key] = sensitive.test(key) ? '[REDACTED]' : this.sanitizeAuditValue(entry, depth + 1);
    }
    return result;
  }

  private getChangedFields(action: string, before: any, after: any): Array<{ field: string; before: any; after: any }> {
    const isRecord = (value: any) => !!value && typeof value === 'object' && !Array.isArray(value);
    const sensitiveKey = /password|token|secret|authorization|cookie|api.?key|private.?key|credential|otp|refresh.?token|access.?token/i;
    const normalizedAction = String(action || '').toUpperCase();
    if (['CREATE', 'CREATED'].includes(normalizedAction) && !isRecord(before) && isRecord(after) && !('request' in after) && !('response' in after)) {
      return Object.entries(after).filter(([key]) => !/^(id|tenant_id|created_at|updated_at)$/i.test(key) && !sensitiveKey.test(key)).map(([field, value]) => ({ field, before: null, after: value ?? null }));
    }
    if (['DELETE', 'DELETED', 'SOFT_DELETE', 'HARD_DELETE', 'REVERSED', 'REVERSAL'].includes(normalizedAction) && isRecord(before) && !isRecord(after)) {
      return Object.entries(before).filter(([key]) => !/^(id|tenant_id|created_at|updated_at)$/i.test(key) && !sensitiveKey.test(key)).map(([field, value]) => ({ field, before: value ?? null, after: null }));
    }
    if (!isRecord(before) || !isRecord(after)) return [];
    const changed: Array<{ field: string; before: any; after: any }> = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (/^(id|tenant_id|created_at|updated_at)$/i.test(key) || sensitiveKey.test(key)) continue;
      const oldEntry = before[key];
      const newEntry = after[key];
      if (JSON.stringify(oldEntry) !== JSON.stringify(newEntry)) {
        changed.push({ field: key, before: oldEntry ?? null, after: newEntry ?? null });
      }
    }
    return changed;
  }
}
