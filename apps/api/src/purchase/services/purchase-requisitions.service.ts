import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';
import { VendorsService } from './vendors.service';
import { RfqExcelService } from './rfq-excel.service';

const PR_WORKFLOW_STATUS = {
  DRAFT: 'DRAFT',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  RFQ_ISSUED: 'RFQ_ISSUED',
  RFQ_RCVD: 'RFQ_RCVD',
  PO_DONE: 'PO_DONE',
  GOODS_RCVD: 'GOODS_RCVD',
  REJECTED: 'REJECTED',
} as const;

function normalizeStatus(value: any): string {
  return String(value || '').trim().toUpperCase();
}

function safeJsonParse(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildRfqNumber(prNumber: string, recipientKey: string, index: number): string {
  const sanitizedKey = String(recipientKey || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  return `RFQ-${String(prNumber || '').trim()}-${sanitizedKey || String(index + 1).padStart(2, '0')}`;
}

function buildWorkflowStatusLabel(status: string, detail?: string | null): string {
  switch (status) {
    case PR_WORKFLOW_STATUS.DRAFT:
      return 'Draft';
    case PR_WORKFLOW_STATUS.AWAITING_APPROVAL:
      return detail ? `Awaiting Approval (${detail})` : 'Awaiting Approval';
    case PR_WORKFLOW_STATUS.RFQ_ISSUED:
      if (detail === 'No') return 'RFQ Not Sent';
      if (detail === 'Yes') return 'RFQ Sent';
      return 'RFQ Sent';
    case PR_WORKFLOW_STATUS.RFQ_RCVD:
      return 'RFQ Response Received';
    case PR_WORKFLOW_STATUS.PO_DONE:
      return 'PO Done';
    case PR_WORKFLOW_STATUS.GOODS_RCVD:
      return 'Goods Recvd';
    case PR_WORKFLOW_STATUS.REJECTED:
      return 'Rejected';
    default:
      return status;
  }
}

function normalizeDateOnly(value: any): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ddmmyyyy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function isUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function canonicalizeRequisitionItems(entries: any[], persisted: boolean) {
  return (Array.isArray(entries) ? entries : [])
    .map((item) => ({
      key: String(
        persisted
          ? item?.item_id || item?.item_code || ''
          : item?.itemId || item?.item_id || item?.itemCode || item?.item_code || '',
      ).trim().toLowerCase(),
      quantity: Number(persisted ? item?.requested_qty : item?.quantity ?? item?.requestedQty),
    }))
    .filter((item) => item.key && Number.isFinite(item.quantity))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function requisitionItemsMatch(left: Array<{ key: string; quantity: number }>, right: Array<{ key: string; quantity: number }>) {
  return left.length === right.length && left.every((item, index) => (
    item.key === right[index].key && item.quantity === right[index].quantity
  ));
}

@Injectable()
export class PurchaseRequisitionsService {
  private supabase: SupabaseClient;

  constructor(
    private readonly emailService: EmailService,
    private readonly vendorsService: VendorsService,
    private readonly rfqExcelService: RfqExcelService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  private async assertItemsVerified(tenantId: string, rawItems: any[]) {
    const items = Array.isArray(rawItems) ? rawItems : [];
    const ids = Array.from(new Set(items.map((item) => String(item?.itemId || item?.item_id || '').trim()).filter(Boolean)));
    const codes = Array.from(new Set(items.map((item) => String(item?.itemCode || item?.item_code || '').trim()).filter(Boolean)));
    if (ids.length === 0 && codes.length === 0) return;

    const byId = new Map<string, any>();
    const byCode = new Map<string, any>();

    if (ids.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('id', ids);
      if (error) {
        // Log but don't fail for items lookup errors - job order items may not exist in master
        console.warn('Items verification lookup warning (job-order items may not exist):', error.message);
      }
      (data || []).forEach((item: any) => byId.set(String(item.id), item));
    }

    if (codes.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('code', codes);
      if (error) {
        // Log but don't fail for items lookup errors - job order items may not exist in master
        console.warn('Items verification lookup warning (job-order items may not exist):', error.message);
      }
      (data || []).forEach((item: any) => byCode.set(String(item.code), item));
    }

    for (const rawItem of items) {
      const id = String(rawItem?.itemId || rawItem?.item_id || '').trim();
      const code = String(rawItem?.itemCode || rawItem?.item_code || '').trim();
      const item = (id && byId.get(id)) || (code && byCode.get(code));
      if (!item) throw new BadRequestException(`Item ${code || id || 'unknown'} was not found in the item master.`);
      const label = item.name || item.code || code || id;
      if (item.is_active === false) throw new BadRequestException(`Item ${label} is inactive and cannot be used.`);
      if (item.is_verified !== true) throw new BadRequestException(`Item ${label} is not verified and cannot be used.`);
    }
  }

  private async assertVendorsVerified(tenantId: string, vendorIds: Array<string | null | undefined>) {
    const ids = Array.from(new Set(vendorIds.map((vendorId) => String(vendorId || '').trim()).filter(Boolean)));
    await Promise.all(ids.map((vendorId) => this.vendorsService.assertVendorVerified(tenantId, vendorId)));
  }

  async create(tenantId: string, userId: string, data: any) {
    await this.assertItemsVerified(tenantId, data.items || []);
    await this.assertVendorsVerified(
      tenantId,
      (Array.isArray(data.items) ? data.items : []).map((item: any) => item.vendorId ?? item.vendor_id ?? null),
    );

    // Generate PR number
    const prNumber = await this.generatePRNumber(tenantId);

    const requestedStatus = normalizeStatus(data.status || 'DRAFT');
    if (!['DRAFT', 'SUBMITTED'].includes(requestedStatus)) {
      throw new BadRequestException('A new requisition can only be saved as draft or submitted.');
    }

    const { data: pr, error } = await this.supabase
      .from('purchase_requisitions')
      .insert({
        tenant_id: tenantId,
        pr_number: prNumber,
        request_date: data.requestDate || new Date().toISOString().split('T')[0],
        department: data.department,
        purpose: data.purpose,
        delivery_address: data.deliveryAddress ?? data.delivery_address ?? null,
        requested_by: userId,
        required_date: data.requiredDate,
        priority: normalizeStatus(data.priority || 'MEDIUM'),
        status: 'DRAFT',
        remarks: data.remarks,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => ({
        pr_id: pr.id,
        item_id: item.itemId ?? item.item_id ?? null,
        item_code: item.itemCode,
        item_name: item.itemName,
        vendor_id: item.vendorId ?? item.vendor_id ?? null,
        description: item.description,
        uom: item.uom,
        requested_qty: item.requestedQty,
        estimated_rate: item.estimatedRate,
        required_date: item.requiredDate,
        payment_terms: item.paymentTerms ?? null,
        delivery_terms: item.deliveryTerms ?? null,
        remarks: item.remarks,
      }));

      let { error: itemsError } = await this.supabase
        .from('purchase_requisition_items')
        .insert(items);

      // Fallback: retry without commercial-terms columns if schema cache is stale
      if (itemsError && (itemsError.message.includes('payment_terms') || itemsError.message.includes('delivery_terms'))) {
        const safeItems = items.map(({ payment_terms, delivery_terms, ...rest }: any) => rest);
        const { error: retryError } = await this.supabase
          .from('purchase_requisition_items')
          .insert(safeItems);
        itemsError = retryError ?? null;
      }

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    if (requestedStatus === 'SUBMITTED') {
      return this.submit(tenantId, pr.id, userId);
    }

    return this.findOne(tenantId, pr.id);
  }

  async checkDuplicates(tenantId: string, rawItems: any[]) {
    const items = Array.isArray(rawItems) ? rawItems : [];
    if (items.length === 0) return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };

    const requested = canonicalizeRequisitionItems(items, false);
    if (requested.length !== items.length) {
      throw new BadRequestException('Each duplicate-check item requires an item ID or code and a valid quantity.');
    }

    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase
      .from('purchase_requisitions')
      .select('id, pr_number, status, created_at, purchase_requisition_items(item_id, item_code, requested_qty)')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    if (error) throw new BadRequestException(error.message);

    const match = (data || []).find((pr: any) => {
      const existing = canonicalizeRequisitionItems(pr?.purchase_requisition_items || [], true);
      return requisitionItemsMatch(existing, requested);
    });

    if (!match) return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };

    return {
      hasDuplicates: true,
      exactMatches: [],
      fuzzyMatches: [{
        id: match.id,
        matchScore: 100,
        matchedFields: ['items'],
        data: match,
      }],
      message: `A requisition with the same items and quantities was created recently (${match.pr_number}).`,
    };
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('purchase_requisitions')
      .select(`
        *,
        purchase_requisition_items(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }

    if (filters?.requestedBy) {
      query = query.eq('requested_by', filters.requestedBy);
    }

    if (filters?.search) {
      query = query.or(`pr_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    const requisitions: any[] = Array.isArray(data) ? data : [];

    // Backfill missing UOM in response from master items (best-effort)
    try {
      const allItems: any[] = requisitions.flatMap((r: any) =>
        Array.isArray(r?.purchase_requisition_items) ? r.purchase_requisition_items : [],
      );

      const missing = allItems.filter((it: any) => {
        const uom = String(it?.uom ?? '').trim();
        const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
        const id = String(it?.item_id ?? it?.itemId ?? '').trim();
        return (!uom || uom.length === 0) && (code.length > 0 || id.length > 0);
      });

      if (missing.length > 0) {
        const codeSet = new Set<string>();
        const idSet = new Set<string>();
        missing.forEach((it: any) => {
          const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
          const id = String(it?.item_id ?? it?.itemId ?? '').trim();
          if (code) codeSet.add(code);
          if (id) idSet.add(id);
        });

        const codes = Array.from(codeSet);
        const ids = Array.from(idSet);
        const itemUomByCode = new Map<string, string>();
        const itemUomById = new Map<string, string>();

        if (codes.length > 0 || ids.length > 0) {
          const itemsQuery = this.supabase
            .from('items')
            .select('id, code, uom')
            .eq('tenant_id', tenantId);

          if (ids.length > 0 && codes.length > 0) {
            // Supabase doesn't support OR across two different IN clauses cleanly; do two queries.
            const [{ data: byId }, { data: byCode }] = await Promise.all([
              this.supabase
                .from('items')
                .select('id, code, uom')
                .eq('tenant_id', tenantId)
                .in('id', ids),
              this.supabase
                .from('items')
                .select('id, code, uom')
                .eq('tenant_id', tenantId)
                .in('code', codes),
            ]);

            (Array.isArray(byId) ? byId : []).forEach((row: any) => {
              if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
              if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
            });
            (Array.isArray(byCode) ? byCode : []).forEach((row: any) => {
              if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
              if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
            });
          } else if (ids.length > 0) {
            const { data: itemsData } = await itemsQuery.in('id', ids);
            (Array.isArray(itemsData) ? itemsData : []).forEach((row: any) => {
              if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
              if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
            });
          } else if (codes.length > 0) {
            const { data: itemsData } = await itemsQuery.in('code', codes);
            (Array.isArray(itemsData) ? itemsData : []).forEach((row: any) => {
              if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
              if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
            });
          }
        }

        requisitions.forEach((r: any) => {
          const items = Array.isArray(r?.purchase_requisition_items)
            ? r.purchase_requisition_items
            : [];
          items.forEach((it: any) => {
            const currentUom = String(it?.uom ?? '').trim();
            if (currentUom) return;
            const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
            const id = String(it?.item_id ?? it?.itemId ?? '').trim();
            const backfill = (id && itemUomById.get(id)) || (code && itemUomByCode.get(code)) || '';
            if (backfill) it.uom = backfill;
          });
        });
      }
    } catch (e) {
      // Never block PR list rendering on backfill
      console.warn('PR UOM response backfill failed:', (e as any)?.message || e);
    }

    return this.attachWorkflowMetadata(tenantId, requisitions);
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('purchase_requisitions')
      .select(`
        *,
        purchase_requisition_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Purchase Requisition not found');

    // Backfill missing UOM in response from master items (best-effort)
    try {
      const pr: any = data as any;
      const items: any[] = Array.isArray(pr?.purchase_requisition_items)
        ? pr.purchase_requisition_items
        : [];

      const missing = items.filter((it: any) => {
        const uom = String(it?.uom ?? '').trim();
        const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
        const itemId = String(it?.item_id ?? it?.itemId ?? '').trim();
        return (!uom || uom.length === 0) && (code.length > 0 || itemId.length > 0);
      });

      if (missing.length > 0) {
        const codeSet = new Set<string>();
        const idSet = new Set<string>();
        missing.forEach((it: any) => {
          const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
          const itemId = String(it?.item_id ?? it?.itemId ?? '').trim();
          if (code) codeSet.add(code);
          if (itemId) idSet.add(itemId);
        });

        const codes = Array.from(codeSet);
        const ids = Array.from(idSet);
        const itemUomByCode = new Map<string, string>();
        const itemUomById = new Map<string, string>();

        if (ids.length > 0) {
          const { data: byId } = await this.supabase
            .from('items')
            .select('id, code, uom')
            .eq('tenant_id', tenantId)
            .in('id', ids);
          (Array.isArray(byId) ? byId : []).forEach((row: any) => {
            if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
            if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
          });
        }

        if (codes.length > 0) {
          const { data: byCode } = await this.supabase
            .from('items')
            .select('id, code, uom')
            .eq('tenant_id', tenantId)
            .in('code', codes);
          (Array.isArray(byCode) ? byCode : []).forEach((row: any) => {
            if (row?.id && row?.uom) itemUomById.set(String(row.id), String(row.uom));
            if (row?.code && row?.uom) itemUomByCode.set(String(row.code), String(row.uom));
          });
        }

        items.forEach((it: any) => {
          const currentUom = String(it?.uom ?? '').trim();
          if (currentUom) return;
          const code = String(it?.item_code ?? it?.itemCode ?? '').trim();
          const itemId = String(it?.item_id ?? it?.itemId ?? '').trim();
          const backfill = (itemId && itemUomById.get(itemId)) || (code && itemUomByCode.get(code)) || '';
          if (backfill) it.uom = backfill;
        });
      }
    } catch (e) {
      console.warn('PR UOM response backfill failed:', (e as any)?.message || e);
    }

    try {
      const prData: any = data as any;
      const approverId = String(prData?.approved_by || '').trim();

      if (approverId) {
        const { data: approver } = await this.supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', approverId)
          .maybeSingle();

        if (approver) {
          const firstName = String((approver as any).first_name || '').trim();
          const lastName = String((approver as any).last_name || '').trim();
          const email = String((approver as any).email || '').trim();

          prData.approved_by_name =
            [firstName, lastName].filter(Boolean).join(' ').trim() ||
            email ||
            null;
        }
      }
    } catch (e) {
      console.warn('PR approver name resolution failed:', (e as any)?.message || e);
    }

    const [withWorkflow] = await this.attachWorkflowMetadata(tenantId, [data as any]);
    return withWorkflow || data;
  }

  async findOneAvailableForPO(tenantId: string, id: string) {
    const pr = await this.findOne(tenantId, id);

    const { data: poRows, error: poError } = await this.supabase
      .from('purchase_orders')
      .select(`
        id,
        purchase_order_items(pr_item_id)
      `)
      .eq('tenant_id', tenantId)
      .eq('pr_id', id);

    if (poError) throw new BadRequestException(poError.message);

    const usedPrItemIds = new Set<string>();
    (poRows || []).forEach((po: any) => {
      const items = Array.isArray(po?.purchase_order_items) ? po.purchase_order_items : [];
      items.forEach((it: any) => {
        const prItemId = String(it?.pr_item_id || '').trim();
        if (prItemId) usedPrItemIds.add(prItemId);
      });
    });

    const prItems = Array.isArray((pr as any)?.purchase_requisition_items)
      ? (pr as any).purchase_requisition_items
      : [];

    const availableItems = prItems.filter((it: any) => {
      const prItemId = String(it?.id || '').trim();
      if (!prItemId) return false;
      return !usedPrItemIds.has(prItemId);
    });

    return {
      ...pr,
      purchase_requisition_items: availableItems,
      _meta: {
        excluded_pr_item_ids: Array.from(usedPrItemIds),
      },
    };
  }

  async findApprovalHistory(tenantId: string, id: string) {
    await this.getRequisitionForTransition(tenantId, id);
    const { data, error } = await this.supabase
      .from('purchase_requisition_approval_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pr_id', id)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn(`Failed to load requisition approval history for ${id}: ${error.message}`);
      return [];
    }

    const rows = data || [];
    const actorIds = Array.from(new Set(rows.map((row: any) => String(row.actor_id || '')).filter(Boolean)));
    const actorsById = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: users } = await this.supabase.from('users').select('id, first_name, last_name, email').in('id', actorIds);
      (users || []).forEach((user: any) => {
        actorsById.set(String(user.id), [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Unknown user');
      });
    }
    return rows.map((row: any) => ({ ...row, actor_name: actorsById.get(String(row.actor_id)) || 'Unknown user' }));
  }

  private async logApprovalAction(args: {
    tenantId: string;
    prId: string;
    actorId: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    reason?: string | null;
    approvalLevel?: number;
    approvalRuleId?: string | null;
  }) {
    const { error } = await this.supabase.from('purchase_requisition_approval_history').insert({
      tenant_id: args.tenantId,
      pr_id: args.prId,
      actor_id: args.actorId,
      action: args.action,
      from_status: args.fromStatus || null,
      to_status: args.toStatus || null,
      reason: args.reason || null,
      approval_level: args.approvalLevel || 0,
      approval_rule_id: args.approvalRuleId || null,
    });
    if (error) {
      console.warn('Failed to record requisition history:', error.message);
    }
  }

  private async getRequisitionForTransition(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('purchase_requisitions')
      .select(`
        *,
        purchase_requisition_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load purchase requisition: ${error.message}`);
    if (!data) throw new NotFoundException('Purchase Requisition not found');
    return data as any;
  }

  private async getMatchingApprovalRules(tenantId: string, department: string, totalAmount: number) {
    const { data, error } = await this.supabase
      .from('purchase_requisition_approval_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sequence', { ascending: true });
    if (error) throw new BadRequestException(`Failed to load approval rules: ${error.message}`);
    return (data || []).filter((rule: any) => {
      const departmentMatches = !rule.department || normalizeStatus(rule.department) === normalizeStatus(department);
      const minimumMatches = totalAmount >= Number(rule.min_amount || 0);
      const maximumMatches = rule.max_amount === null || rule.max_amount === undefined || totalAmount <= Number(rule.max_amount);
      return departmentMatches && minimumMatches && maximumMatches;
    });
  }

  private async assertRuleApprover(userId: string, rule: any) {
    if (rule?.approver_user_id && String(rule.approver_user_id) !== String(userId)) {
      throw new BadRequestException('This approval step is assigned to another approver.');
    }
    if (!rule?.approver_role_id) return;

    const [{ data: membership }, { data: legacyUser }] = await Promise.all([
      this.supabase.from('user_roles').select('user_id').eq('user_id', userId).eq('role_id', rule.approver_role_id).maybeSingle(),
      this.supabase.from('users').select('id').eq('id', userId).eq('role_id', rule.approver_role_id).maybeSingle(),
    ]);
    if (!membership && !legacyUser) throw new BadRequestException('Your role is not assigned to this approval step.');
  }

  private async assertDefaultApprover(tenantId: string, userId: string) {
    const [{ data: memberships, error: membershipError }, { data: legacyUser, error: userError }] = await Promise.all([
      this.supabase.from('user_roles').select('role_id').eq('user_id', userId),
      this.supabase.from('users').select('role_id').eq('tenant_id', tenantId).eq('id', userId).maybeSingle(),
    ]);
    if (membershipError || userError) {
      throw new BadRequestException('Unable to verify the approver role.');
    }

    const roleIds = Array.from(new Set([
      ...(memberships || []).map((membership: any) => membership.role_id),
      legacyUser?.role_id,
    ].filter(Boolean)));
    if (roleIds.length === 0) {
      throw new BadRequestException('A Manager or Administrator role is required to approve this requisition.');
    }

    const { data: roles, error: rolesError } = await this.supabase
      .from('roles')
      .select('code, name')
      .in('id', roleIds);
    if (rolesError) throw new BadRequestException('Unable to verify the approver role.');

    const allowedRole = (roles || []).some((role: any) => {
      const identity = `${normalizeStatus(role.code)} ${normalizeStatus(role.name)}`;
      return ['MANAGER', 'ADMIN', 'DIRECTOR', 'OWNER'].some((keyword) => identity.includes(keyword));
    });
    if (!allowedRole) {
      throw new BadRequestException('A Manager or Administrator role is required to approve this requisition.');
    }
  }

  async update(tenantId: string, id: string, data: any, userId: string) {
    const current = await this.getRequisitionForTransition(tenantId, id);
    const currentStatus = normalizeStatus(current.status);
    if (!['DRAFT', 'SUBMITTED', 'REJECTED'].includes(currentStatus)) {
      throw new BadRequestException(`A requisition in ${currentStatus} status cannot be edited.`);
    }

    let existingRowsForSync: any[] = [];
    if (Array.isArray(data.items)) {
      const { data: existingRows, error: existingError } = await this.supabase
        .from('purchase_requisition_items')
        .select('id, total_ordered_qty')
        .eq('pr_id', id);
      if (existingError) throw new BadRequestException(existingError.message);
      existingRowsForSync = existingRows || [];

      const retainedIds = new Set(
        data.items
          .map((item: any) => String(item?.id || '').trim())
          .filter((itemId: string) => isUuid(itemId)),
      );
      const removedRows = existingRowsForSync.filter((item: any) => !retainedIds.has(String(item.id)));
      const removedIds = removedRows.map((item: any) => String(item.id));
      if (removedRows.some((item: any) => Number(item.total_ordered_qty || 0) > 0)) {
        throw new BadRequestException('An item already converted to a purchase order cannot be removed.');
      }
      if (removedIds.length > 0) {
        const [{ data: poLinks }, { data: rfqLinks }] = await Promise.all([
          this.supabase.from('purchase_order_items').select('id').in('pr_item_id', removedIds).limit(1),
          this.supabase.from('rfq_items').select('id').in('pr_item_id', removedIds).limit(1),
        ]);
        if ((poLinks || []).length > 0 || (rfqLinks || []).length > 0) {
          throw new BadRequestException('An item referenced by a PO or RFQ cannot be removed.');
        }
      }
    }
    if (data.items) {
      await this.assertItemsVerified(tenantId, data.items);
      await this.assertVendorsVerified(
        tenantId,
        (Array.isArray(data.items) ? data.items : []).map((item: any) => item.vendorId ?? item.vendor_id ?? null),
      );
    }

    const nowIso = new Date().toISOString();
    const requestedStatus = data.status === undefined ? currentStatus : normalizeStatus(data.status);
    if (!['DRAFT', 'SUBMITTED'].includes(requestedStatus)) {
      throw new BadRequestException('An edited requisition can only be saved as draft or submitted.');
    }
    if (requestedStatus === 'DRAFT' && currentStatus !== 'DRAFT') {
      throw new BadRequestException('A submitted or rejected requisition cannot be moved back to draft.');
    }
    const updateData: any = {
      department: data.department,
      required_date: data.requiredDate,
      priority: data.priority,
      // Keep backward/forward compatibility with different client field names
      purpose: data.purpose ?? data.notes ?? null,
      delivery_address: data.deliveryAddress ?? data.delivery_address ?? null,
      notes: data.notes ?? data.purpose ?? null,
      remarks: data.remarks ?? null,
      updated_by: userId,
      updated_at: nowIso,
    };
    if (currentStatus === 'SUBMITTED') {
      updateData.approved_by = null;
      updateData.approved_at = null;
      updateData.rejected_by = null;
      updateData.rejected_at = null;
      updateData.rejection_reason = null;
      updateData.current_approval_level = 0;
    }

    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    if (Array.isArray(data.items)) {
      const existingRows = existingRowsForSync;

      const existingById = new Map((existingRows || []).map((item: any) => [String(item.id), item]));
      const retainedIds = new Set<string>();
      const newRows: any[] = [];

      const buildItemPayload = (item: any) => ({
        item_id: item.itemId ?? item.item_id ?? null,
        item_code: item.itemCode,
        item_name: item.itemName,
        vendor_id: item.vendorId ?? item.vendor_id ?? null,
        description: item.description ?? item.specifications ?? null,
        uom: item.uom ?? null,
        requested_qty: item.requestedQty ?? item.quantity ?? null,
        estimated_rate: item.estimatedRate ?? item.estimatedPrice ?? null,
        required_date: item.requiredDate ?? null,
        payment_terms: item.paymentTerms ?? null,
        delivery_terms: item.deliveryTerms ?? null,
        remarks: item.remarks ?? item.notes ?? null,
        updated_by: userId,
        updated_at: nowIso,
      });

      for (const item of data.items) {
        const incomingId = String(item?.id || '').trim();
        if (isUuid(incomingId) && existingById.has(incomingId)) {
          retainedIds.add(incomingId);
          const { error: itemError } = await this.supabase
            .from('purchase_requisition_items')
            .update(buildItemPayload(item))
            .eq('pr_id', id)
            .eq('id', incomingId);
          if (itemError) throw new BadRequestException(`Failed to update PR item: ${itemError.message}`);
        } else {
          newRows.push({ pr_id: id, ...buildItemPayload(item), updated_by: undefined, updated_at: undefined });
        }
      }

      if (newRows.length > 0) {
        const sanitizedRows = newRows.map(({ updated_by, updated_at, ...row }) => row);
        const { error: insertError } = await this.supabase.from('purchase_requisition_items').insert(sanitizedRows);
        if (insertError) throw new BadRequestException(`Failed to add PR item: ${insertError.message}`);
      }

      const removedRows = (existingRows || []).filter((item: any) => !retainedIds.has(String(item.id)));
      const removedIds = removedRows.map((item: any) => String(item.id));
      if (removedIds.length > 0) {
        const { error: deleteError } = await this.supabase.from('purchase_requisition_items').delete().in('id', removedIds).eq('pr_id', id);
        if (deleteError) throw new BadRequestException(`Failed to remove PR item: ${deleteError.message}`);
      }
    }

    if (requestedStatus === 'SUBMITTED' && currentStatus !== 'SUBMITTED') {
      return this.submit(tenantId, id, userId);
    }
    if (currentStatus === 'SUBMITTED') {
      await this.logApprovalAction({ tenantId, prId: id, actorId: userId, action: 'EDITED_AND_RESUBMITTED', fromStatus: currentStatus, toStatus: 'SUBMITTED' });
    }
    return this.findOne(tenantId, id);
  }

  async submit(tenantId: string, id: string, userId: string) {
    const pr = await this.getRequisitionForTransition(tenantId, id);
    const fromStatus = normalizeStatus(pr.status);
    if (!['DRAFT', 'REJECTED'].includes(fromStatus)) {
      throw new BadRequestException(`Only draft or rejected requisitions can be submitted; current status is ${fromStatus}.`);
    }
    if (!String(pr.department || '').trim() || !pr.required_date || !(pr.purchase_requisition_items || []).length) {
      throw new BadRequestException('Department, required date, and at least one item are required before submission.');
    }
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        approved_by: null,
        approved_at: null,
        current_approval_level: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    await this.logApprovalAction({ tenantId, prId: id, actorId: userId, action: 'SUBMITTED', fromStatus, toStatus: 'SUBMITTED' });
    return this.findOne(tenantId, id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const pr = await this.getRequisitionForTransition(tenantId, id);
    const fromStatus = normalizeStatus(pr.status);
    if (fromStatus !== 'SUBMITTED') throw new BadRequestException(`Only submitted requisitions can be approved; current status is ${fromStatus}.`);
    if (String(pr.requested_by) === String(userId)) throw new BadRequestException('You cannot approve your own purchase requisition.');

    const totalAmount = (pr.purchase_requisition_items || []).reduce(
      (sum: number, item: any) => sum + Number(item.requested_qty || 0) * Number(item.estimated_rate || 0),
      0,
    );
    const rules = await this.getMatchingApprovalRules(tenantId, pr.department, totalAmount);
    const currentLevel = Number(pr.current_approval_level || 0);
    const currentRule = rules[currentLevel];
    if (currentRule) {
      await this.assertRuleApprover(userId, currentRule);
    } else if (rules.length === 0) {
      await this.assertDefaultApprover(tenantId, userId);
    }
    const finalApproval = rules.length === 0 || currentLevel + 1 >= rules.length;
    const nextStatus = finalApproval ? 'APPROVED' : 'SUBMITTED';

    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: nextStatus,
        approved_by: finalApproval ? userId : null,
        approved_at: finalApproval ? new Date().toISOString() : null,
        current_approval_level: currentLevel + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    await this.logApprovalAction({
      tenantId,
      prId: id,
      actorId: userId,
      action: finalApproval ? 'APPROVED' : 'APPROVED_STEP',
      fromStatus,
      toStatus: nextStatus,
      approvalLevel: currentLevel + 1,
      approvalRuleId: currentRule?.id || null,
    });
    return this.findOne(tenantId, id);
  }

  async reject(tenantId: string, id: string, userId: string, reason: string) {
    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason) throw new BadRequestException('A rejection reason is required.');
    const pr = await this.getRequisitionForTransition(tenantId, id);
    const fromStatus = normalizeStatus(pr.status);
    if (fromStatus !== 'SUBMITTED') throw new BadRequestException(`Only submitted requisitions can be rejected; current status is ${fromStatus}.`);
    if (String(pr.requested_by) === String(userId)) throw new BadRequestException('You cannot reject your own purchase requisition.');
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: 'REJECTED',
        approved_by: null,
        approved_at: null,
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: normalizedReason,
        current_approval_level: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    await this.logApprovalAction({ tenantId, prId: id, actorId: userId, action: 'REJECTED', fromStatus, toStatus: 'REJECTED', reason: normalizedReason });
    return this.findOne(tenantId, id);
  }

  async sendRFQ(tenantId: string, requisitionId: string, userId: string, body: any) {
    const vendorIds: string[] = Array.isArray(body?.vendorIds) ? body.vendorIds : [];
    const vendorEmails: string[] = Array.isArray(body?.vendorEmails) ? body.vendorEmails : [];
    const itemVendors: Array<{ itemId: string; vendorIds: string[] }> = Array.isArray(body?.itemVendors) ? body.itemVendors : [];

    const recipientOverrides: Record<string, string> =
      body?.recipientOverrides && typeof body.recipientOverrides === 'object'
        ? body.recipientOverrides
        : body?.recipient_overrides && typeof body.recipient_overrides === 'object'
          ? body.recipient_overrides
          : {};

    const subjectOverride: string | undefined =
      typeof body?.subject === 'string' && body.subject.trim() ? body.subject.trim() : undefined;

    const customMessage: string | undefined =
      typeof body?.customMessage === 'string'
        ? body.customMessage
        : typeof body?.custom_message === 'string'
          ? body.custom_message
          : undefined;

    if (vendorIds.length === 0 && vendorEmails.length === 0) {
      throw new BadRequestException('vendorIds or vendorEmails is required');
    }

    await this.assertVendorsVerified(tenantId, vendorIds);

    const pr = await this.findOne(tenantId, requisitionId);

    if (!pr) {
      throw new NotFoundException('Purchase Requisition not found');
    }

    const baseStatus = normalizeStatus((pr as any)?.status);
    if (baseStatus === PR_WORKFLOW_STATUS.DRAFT || baseStatus === PR_WORKFLOW_STATUS.REJECTED) {
      throw new BadRequestException('PR must be approved before sending RFQ');
    }

    // Save item-vendor mappings to pr_item_rfq_vendors table
    if (itemVendors.length > 0) {
      // First, delete existing mappings for this PR
      await this.supabase
        .from('pr_item_rfq_vendors')
        .delete()
        .in('pr_item_id', itemVendors.map(iv => iv.itemId));

      // Then insert new mappings
      const mappings = itemVendors.flatMap(iv => 
        iv.vendorIds.map(vendorId => ({
          pr_item_id: iv.itemId,
          vendor_id: vendorId,
        }))
      );

      if (mappings.length > 0) {
        const { error: mappingError } = await this.supabase
          .from('pr_item_rfq_vendors')
          .insert(mappings);

        if (mappingError) {
          console.error('Error saving item-vendor mappings:', mappingError);
          // Don't throw - continue with RFQ sending even if mapping save fails
        }
      }
    }

    const vendorLookups = await Promise.all(
      vendorIds.map(async (vendorId) => this.vendorsService.findOne(tenantId, vendorId)),
    );

    const recipients: Array<{ email: string; name: string; vendorId?: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    for (let i = 0; i < vendorLookups.length; i++) {
      const vendor = vendorLookups[i];
      if (vendor?.email) {
        recipients.push({ 
          email: vendor.email, 
          name: vendor.name || 'Vendor',
          vendorId: vendorIds[i]
        });
      } else {
        skipped.push({ name: vendor?.name || vendorIds[i], reason: 'No email address on file' });
      }
    }

    for (const email of vendorEmails) {
      if (typeof email === 'string' && email.trim()) {
        recipients.push({ email: email.trim(), name: 'Vendor' });
      }
    }

    // Apply recipient overrides (by vendorId or by original email)
    for (const recipient of recipients) {
      const keyByVendorId = recipient.vendorId ? String(recipient.vendorId) : '';
      const keyByEmail = String(recipient.email || '').trim();
      const override =
        (keyByVendorId && typeof recipientOverrides[keyByVendorId] === 'string'
          ? recipientOverrides[keyByVendorId]
          : undefined) ||
        (keyByEmail && typeof recipientOverrides[keyByEmail] === 'string'
          ? recipientOverrides[keyByEmail]
          : undefined);

      if (typeof override === 'string' && override.trim()) {
        recipient.email = override.trim();
      }
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No valid vendor emails found');
    }

    const responseDate = body?.responseDate || body?.response_date;
    const remarks = body?.remarks;

    const persistedRfqByVendorId = new Map<string, any>();

    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];
      if (!recipient?.vendorId) continue;

      const recipientKey = recipient.vendorId || recipient.email || String(index + 1);
      const rfqNumber = buildRfqNumber(pr.pr_number, recipientKey, index);
      const vendorItems = (pr.purchase_requisition_items || []).filter((item: any) => {
        if (itemVendors.length === 0) return true;
        return itemVendors
          .filter((iv) => iv.vendorIds.includes(recipient.vendorId as string))
          .some((iv) => iv.itemId === item.id);
      });

      const payloadNotes = {
        ...(safeJsonParse(undefined)),
        remarks: remarks || null,
        subject: subjectOverride || null,
        customMessage: customMessage || null,
        recipientEmail: recipient.email,
        responseDate: responseDate || null,
      };

      const { data: existingRfq } = await this.supabase
        .from('rfqs')
        .select('id, notes')
        .eq('tenant_id', tenantId)
        .eq('pr_id', requisitionId)
        .eq('vendor_id', recipient.vendorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let rfqRecord = existingRfq;

      if (existingRfq?.id) {
        const mergedNotes = {
          ...safeJsonParse(existingRfq.notes),
          ...payloadNotes,
        };

        const { data: updatedRfq, error: updateRfqError } = await this.supabase
          .from('rfqs')
          .update({
            rfq_number: rfqNumber,
            sent_at: new Date().toISOString(),
            response_deadline: responseDate || null,
            status: 'SENT',
            notes: JSON.stringify(mergedNotes),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRfq.id)
          .select()
          .single();

        if (updateRfqError) throw new BadRequestException(updateRfqError.message);
        rfqRecord = updatedRfq;

        await this.supabase.from('rfq_items').delete().eq('rfq_id', existingRfq.id);
      } else {
        const { data: createdRfq, error: createRfqError } = await this.supabase
          .from('rfqs')
          .insert({
            tenant_id: tenantId,
            pr_id: requisitionId,
            rfq_number: rfqNumber,
            vendor_id: recipient.vendorId,
            sent_at: new Date().toISOString(),
            response_deadline: responseDate || null,
            status: 'SENT',
            notes: JSON.stringify(payloadNotes),
            created_by: userId,
          })
          .select()
          .single();

        if (createRfqError) throw new BadRequestException(createRfqError.message);
        rfqRecord = createdRfq;
      }

      if (rfqRecord?.id && vendorItems.length > 0) {
        const { error: rfqItemsError } = await this.supabase
          .from('rfq_items')
          .insert(
            vendorItems.map((item: any) => ({
              rfq_id: rfqRecord.id,
              pr_item_id: item.id,
              item_code: item.item_code || item.itemCode || null,
              item_name: item.item_name || item.itemName || null,
              requested_qty: item.requested_qty ?? item.quantity ?? 0,
              uom: item.uom || null,
              vendor_notes: null,
            })),
          );

        if (rfqItemsError) throw new BadRequestException(rfqItemsError.message);
      }

      persistedRfqByVendorId.set(String(recipient.vendorId), rfqRecord);
    }

    const sendResults = await Promise.allSettled(
      recipients.map(async (recipient, index) => {
        // Filter items for this vendor based on itemVendors mappings
        let vendorItems = pr.purchase_requisition_items || [];
        
        if (recipient.vendorId && itemVendors.length > 0) {
          // Get items assigned to this vendor
          const assignedItemIds = itemVendors
            .filter(iv => iv.vendorIds.includes(recipient.vendorId as string))
            .map(iv => iv.itemId);
          
          vendorItems = vendorItems.filter((item: any) => 
            assignedItemIds.includes(item.id)
          );
        }

        const items = vendorItems.map((item: any) => ({
          item_name: item.item_name || item.itemName || '-',
          item_code: item.item_code || item.itemCode || '-',
          uom: item.uom || '-',
          description: item.description || item.specifications || item.remarks || '-',
          quantity: item.requested_qty ?? item.quantity ?? 0,
          required_date: item.required_date || pr.required_date || '-',
        }));

        // Generate Excel attachment for this vendor
        const excelBuffer = await this.rfqExcelService.generateRFQExcel({
          prNumber: pr.pr_number,
          department: pr.department,
          requiredDate: pr.required_date,
          vendorName: recipient.name,
          vendorEmail: recipient.email,
          items: vendorItems.map((item: any) => ({
            item_id: item.id,
            item_code: item.item_code || item.itemCode || '-',
            item_name: item.item_name || item.itemName || '-',
            description: item.description || item.specifications || item.remarks || '',
            requested_qty: item.requested_qty ?? item.quantity ?? 0,
            uom: item.uom || '-',
            required_date: item.required_date || pr.required_date,
            specifications: item.specifications || '',
          })),
          responseDeadline: responseDate,
          remarks: remarks,
        });

        const excelFilename = this.rfqExcelService.generateFilename(pr.pr_number, recipient.name);
        
        const attachments = [
          ...(Array.isArray(body?.attachments) ? body.attachments : []),
          {
            filename: excelFilename,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ];

        const rfqRecord = recipient.vendorId ? persistedRfqByVendorId.get(String(recipient.vendorId)) : null;
        const rfqNumber = rfqRecord?.rfq_number || buildRfqNumber(pr.pr_number, recipient.vendorId || recipient.email, index);

        return this.emailService.sendRFQ(recipient.email, {
          tenant_id: tenantId,
          rfq_number: rfqNumber,
          vendor_name: recipient.name,
          items,
          response_date: responseDate,
          remarks,
          subject: subjectOverride,
          custom_message: customMessage,
          attachments,
        });
      }),
    );

    const sent: Array<{ email: string; messageId?: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    sendResults.forEach((result, idx) => {
      const email = recipients[idx]?.email;
      if (!email) return;
      if (result.status === 'fulfilled') {
        sent.push({ email, messageId: (result.value as any)?.messageId });
      } else {
        failed.push({ email, error: result.reason?.message || String(result.reason) });
      }
    });

    return {
      requisition_id: requisitionId,
      sent_count: sent.length,
      failed_count: failed.length,
      skipped_count: skipped.length,
      sent,
      failed,
      skipped,
    };
  }

  async previewRFQ(tenantId: string, requisitionId: string, body: any) {
    const vendorIds: string[] = Array.isArray(body?.vendorIds) ? body.vendorIds : [];
    const vendorEmails: string[] = Array.isArray(body?.vendorEmails) ? body.vendorEmails : [];
    const itemVendors: Array<{ itemId: string; vendorIds: string[] }> = Array.isArray(body?.itemVendors)
      ? body.itemVendors
      : [];

    const recipientOverrides: Record<string, string> =
      body?.recipientOverrides && typeof body.recipientOverrides === 'object'
        ? body.recipientOverrides
        : body?.recipient_overrides && typeof body.recipient_overrides === 'object'
          ? body.recipient_overrides
          : {};

    const subjectOverride: string | undefined =
      typeof body?.subject === 'string' && body.subject.trim() ? body.subject.trim() : undefined;

    const customMessage: string | undefined =
      typeof body?.customMessage === 'string'
        ? body.customMessage
        : typeof body?.custom_message === 'string'
          ? body.custom_message
          : undefined;

    if (vendorIds.length === 0 && vendorEmails.length === 0) {
      throw new BadRequestException('vendorIds or vendorEmails is required');
    }

    await this.assertVendorsVerified(tenantId, vendorIds);

    const pr = await this.findOne(tenantId, requisitionId);

    if (!pr) {
      throw new NotFoundException('Purchase Requisition not found');
    }

    const baseStatus = normalizeStatus((pr as any)?.status);
    if (baseStatus === PR_WORKFLOW_STATUS.DRAFT || baseStatus === PR_WORKFLOW_STATUS.REJECTED) {
      throw new BadRequestException('PR must be approved before previewing RFQ');
    }

    const vendorLookups = await Promise.all(
      vendorIds.map(async (vendorId) => this.vendorsService.findOne(tenantId, vendorId)),
    );

    const recipients: Array<{ email: string; name: string; vendorId?: string }> = [];

    for (let i = 0; i < vendorLookups.length; i++) {
      const vendor = vendorLookups[i];
      if (vendor?.email) {
        recipients.push({
          email: vendor.email,
          name: vendor.name || 'Vendor',
          vendorId: vendorIds[i],
        });
      }
    }

    for (const email of vendorEmails) {
      if (typeof email === 'string' && email.trim()) {
        recipients.push({ email: email.trim(), name: 'Vendor' });
      }
    }

    // Apply recipient overrides (by vendorId or by original email)
    for (const recipient of recipients) {
      const keyByVendorId = recipient.vendorId ? String(recipient.vendorId) : '';
      const keyByEmail = String(recipient.email || '').trim();
      const override =
        (keyByVendorId && typeof recipientOverrides[keyByVendorId] === 'string'
          ? recipientOverrides[keyByVendorId]
          : undefined) ||
        (keyByEmail && typeof recipientOverrides[keyByEmail] === 'string'
          ? recipientOverrides[keyByEmail]
          : undefined);

      if (typeof override === 'string' && override.trim()) {
        recipient.email = override.trim();
      }
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No valid vendor emails found');
    }

    const responseDate = body?.responseDate || body?.response_date;
    const remarks = body?.remarks;

    const previews = await Promise.all(
      recipients.map(async (recipient, index) => {
        // Filter items for this vendor based on itemVendors mappings
        let vendorItems = pr.purchase_requisition_items || [];

        if (recipient.vendorId && itemVendors.length > 0) {
          const assignedItemIds = itemVendors
            .filter((iv) => iv.vendorIds.includes(recipient.vendorId as string))
            .map((iv) => iv.itemId);

          vendorItems = vendorItems.filter((item: any) => assignedItemIds.includes(item.id));
        }

        const items = vendorItems.map((item: any) => ({
          item_name: item.item_name || item.itemName || '-',
          item_code: item.item_code || item.itemCode || '-',
          uom: item.uom || '-',
          description: item.description || item.specifications || item.remarks || '-',
          quantity: item.requested_qty ?? item.quantity ?? 0,
          required_date: item.required_date || pr.required_date || '-',
        }));

        const excelBuffer = await this.rfqExcelService.generateRFQExcel({
          prNumber: pr.pr_number,
          department: pr.department,
          requiredDate: pr.required_date,
          vendorName: recipient.name,
          vendorEmail: recipient.email,
          items: vendorItems.map((item: any) => ({
            item_id: item.id,
            item_code: item.item_code || item.itemCode || '-',
            item_name: item.item_name || item.itemName || '-',
            description: item.description || item.specifications || item.remarks || '',
            requested_qty: item.requested_qty ?? item.quantity ?? 0,
            uom: item.uom || '-',
            required_date: item.required_date || pr.required_date,
            specifications: item.specifications || '',
          })),
          responseDeadline: responseDate,
          remarks: remarks,
        });

        const excelFilename = this.rfqExcelService.generateFilename(pr.pr_number, recipient.name);

        const attachments = [
          ...(Array.isArray(body?.attachments) ? body.attachments : []),
          {
            filename: excelFilename,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ];

        const preview = await this.emailService.buildRFQPreview(recipient.email, {
          tenant_id: tenantId,
          rfq_number: buildRfqNumber(pr.pr_number, recipient.vendorId || recipient.email, index),
          vendor_name: recipient.name,
          items,
          response_date: responseDate,
          remarks,
          subject: subjectOverride,
          custom_message: customMessage,
          attachments,
        });

        return {
          vendor_name: recipient.name,
          vendor_id: recipient.vendorId,
          ...preview,
        };
      }),
    );

    return {
      rfq_number: null,
      requisition_id: requisitionId,
      preview_count: previews.length,
      previews,
    };
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Purchase Requisition deleted successfully' };
  }

  async findRFQs(tenantId: string, requisitionId: string) {
    const { data, error } = await this.supabase
      .from('rfqs')
      .select(`
        *,
        vendor:vendors(id, code, name, email),
        rfq_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('pr_id', requisitionId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (Array.isArray(data) ? data : []).map((row: any) => {
      const meta = safeJsonParse(row.notes);
      return {
        ...row,
        meta,
        follow_up_date: meta.followUpDate || null,
        follow_up_notes: meta.followUpNotes || null,
        response_attachments: Array.isArray(meta.responseAttachments) ? meta.responseAttachments : [],
        response_remarks: meta.responseRemarks || null,
      };
    });
  }

  async recordRFQResponse(
    tenantId: string,
    requisitionId: string,
    rfqId: string,
    userId: string,
    body: any,
  ) {
    const { data: rfq, error } = await this.supabase
      .from('rfqs')
      .select(`
        *,
        rfq_items(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('pr_id', requisitionId)
      .eq('id', rfqId)
      .single();

    if (error || !rfq) throw new NotFoundException('RFQ not found');

    const existingMeta = safeJsonParse(rfq.notes);
    const normalizedFollowUpDate = normalizeDateOnly(body?.followUpDate || body?.follow_up_date);
    const attachments = Array.isArray(body?.attachments)
      ? body.attachments
          .map((item: any) => ({
            url: String(item?.url || '').trim(),
            name: String(item?.name || '').trim() || 'Attachment',
          }))
          .filter((item: any) => item.url)
      : [];

    const itemPayload = Array.isArray(body?.items) ? body.items : [];
    const existingItems = Array.isArray(rfq.rfq_items) ? rfq.rfq_items : [];

    for (const item of itemPayload) {
      const match = existingItems.find(
        (rfqItem: any) =>
          (item?.id && String(rfqItem.id) === String(item.id)) ||
          (item?.prItemId && String(rfqItem.pr_item_id) === String(item.prItemId)),
      );

      const itemUpdate = {
        vendor_quoted_price:
          item?.quotedPrice === '' || item?.quotedPrice == null ? null : Number(item.quotedPrice),
        vendor_quoted_lead_time:
          item?.leadTime === '' || item?.leadTime == null ? null : Number(item.leadTime),
        vendor_notes: String(item?.notes || '').trim() || null,
      };

      if (match?.id) {
        const { error: updateItemError } = await this.supabase
          .from('rfq_items')
          .update(itemUpdate)
          .eq('id', match.id);

        if (updateItemError) throw new BadRequestException(updateItemError.message);
      } else if (item?.prItemId) {
        const { error: createItemError } = await this.supabase
          .from('rfq_items')
          .insert({
            rfq_id: rfqId,
            pr_item_id: item.prItemId,
            item_code: item.itemCode || null,
            item_name: item.itemName || null,
            requested_qty: item.requestedQty ?? null,
            uom: item.uom || null,
            ...itemUpdate,
          });

        if (createItemError) throw new BadRequestException(createItemError.message);
      }
    }

    const updatedMeta = {
      ...existingMeta,
      responseRemarks: String(body?.remarks || body?.responseRemarks || '').trim() || null,
      followUpDate: normalizedFollowUpDate,
      followUpNotes: String(body?.followUpNotes || body?.follow_up_notes || '').trim() || null,
      responseAttachments: attachments,
      respondedBy: userId,
    };

    const { error: updateRfqError } = await this.supabase
      .from('rfqs')
      .update({
        status: 'RECEIVED',
        vendor_quote_received_at: body?.receivedAt || new Date().toISOString(),
        notes: JSON.stringify(updatedMeta),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rfqId);

    if (updateRfqError) throw new BadRequestException(updateRfqError.message);

    const rows = await this.findRFQs(tenantId, requisitionId);
    return rows.find((row: any) => String(row.id) === String(rfqId)) || { id: rfqId };
  }

  private async attachWorkflowMetadata(tenantId: string, requisitions: any[]) {
    if (!Array.isArray(requisitions) || requisitions.length === 0) return requisitions;

    const prIds = requisitions
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean);

    if (prIds.length === 0) return requisitions;

    const [{ data: rfqRows }, { data: poRows }] = await Promise.all([
      this.supabase
        .from('rfqs')
        .select('id, pr_id, status, sent_at, response_deadline, vendor_quote_received_at, notes')
        .eq('tenant_id', tenantId)
        .in('pr_id', prIds),
      this.supabase
        .from('purchase_orders')
        .select('id, pr_id, purchase_order_items(ordered_qty, received_qty)')
        .eq('tenant_id', tenantId)
        .in('pr_id', prIds),
    ]);

    const rfqSummaryByPr = new Map<string, any>();
    (Array.isArray(rfqRows) ? rfqRows : []).forEach((row: any) => {
      const prId = String(row?.pr_id || '').trim();
      if (!prId) return;
      const current = rfqSummaryByPr.get(prId) || {
        total: 0,
        sentCount: 0,
        receivedCount: 0,
        nextFollowUpDate: null,
      };
      const notes = safeJsonParse(row?.notes);
      const normalized = normalizeStatus(row?.status);
      current.total += 1;
      if (row?.sent_at) current.sentCount += 1;
      if (normalized === 'RECEIVED' || row?.vendor_quote_received_at) current.receivedCount += 1;
      const followUpDate = String(notes.followUpDate || '').trim();
      if (followUpDate && (!current.nextFollowUpDate || followUpDate < current.nextFollowUpDate)) {
        current.nextFollowUpDate = followUpDate;
      }
      rfqSummaryByPr.set(prId, current);
    });

    const poSummaryByPr = new Map<string, any>();
    (Array.isArray(poRows) ? poRows : []).forEach((row: any) => {
      const prId = String(row?.pr_id || '').trim();
      if (!prId) return;
      const current = poSummaryByPr.get(prId) || {
        totalOrderedQty: 0,
        totalReceivedQty: 0,
      };
      const items = Array.isArray(row?.purchase_order_items) ? row.purchase_order_items : [];
      items.forEach((item: any) => {
        current.totalOrderedQty += Number(item?.ordered_qty || 0);
        current.totalReceivedQty += Number(item?.received_qty || 0);
      });
      poSummaryByPr.set(prId, current);
    });

    return requisitions.map((row: any) => {
      const prId = String(row?.id || '').trim();
      const baseStatus = normalizeStatus(row?.status);
      const items = Array.isArray(row?.purchase_requisition_items) ? row.purchase_requisition_items : [];
      const rfqSummary = rfqSummaryByPr.get(prId) || {
        total: 0,
        sentCount: 0,
        receivedCount: 0,
        nextFollowUpDate: null,
      };
      const poSummary = poSummaryByPr.get(prId) || {
        totalOrderedQty: 0,
        totalReceivedQty: 0,
      };

      const poDone =
        items.length > 0 &&
        items.every((item: any) => Number(item?.remaining_qty ?? item?.requested_qty ?? 0) <= 0);
      const goodsReceived = poSummary.totalOrderedQty > 0 && poSummary.totalReceivedQty >= poSummary.totalOrderedQty;

      let workflowStatus = baseStatus;
      let workflowDetail: string | null = null;

      if (baseStatus === 'REJECTED') {
        workflowStatus = PR_WORKFLOW_STATUS.REJECTED;
      } else if (baseStatus === 'DRAFT' || !baseStatus) {
        workflowStatus = PR_WORKFLOW_STATUS.DRAFT;
      } else if (baseStatus === 'SUBMITTED') {
        workflowStatus = PR_WORKFLOW_STATUS.AWAITING_APPROVAL;
        workflowDetail = `Level ${Number(row?.current_approval_level || 0) + 1}`;
      } else if (goodsReceived) {
        workflowStatus = PR_WORKFLOW_STATUS.GOODS_RCVD;
      } else if (poDone) {
        workflowStatus = PR_WORKFLOW_STATUS.PO_DONE;
      } else if (rfqSummary.receivedCount > 0) {
        workflowStatus = PR_WORKFLOW_STATUS.RFQ_RCVD;
        workflowDetail = 'Received';
      } else {
        workflowStatus = PR_WORKFLOW_STATUS.RFQ_ISSUED;
        workflowDetail = rfqSummary.sentCount > 0 ? 'Yes' : 'No';
      }

      return {
        ...row,
        workflow_status: workflowStatus,
        workflow_status_detail: workflowDetail,
        workflow_status_label: buildWorkflowStatusLabel(workflowStatus, workflowDetail),
        rfq_summary: rfqSummary,
        po_summary: poSummary,
      };
    });
  }

  private async generatePRNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PR-${year}-${month}`;

    // Fetch ALL PR numbers to find the global max sequence (never resets on month rollover)
    const { data } = await this.supabase
      .from('purchase_requisitions')
      .select('pr_number')
      .eq('tenant_id', tenantId)
      .like('pr_number', 'PR-%');

    let maxSeq = 0;
    for (const row of (data || [])) {
      const match = /^PR-\d{4}-\d{2}-(\d+)$/.exec(row.pr_number || '');
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
  }
}
