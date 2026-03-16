import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';
import { VendorsService } from './vendors.service';
import { RfqExcelService } from './rfq-excel.service';

const PR_WORKFLOW_STATUS = {
  DRAFT: 'DRAFT',
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

  async create(tenantId: string, userId: string, data: any) {
    // Generate PR number
    const prNumber = await this.generatePRNumber(tenantId);

    const { data: pr, error } = await this.supabase
      .from('purchase_requisitions')
      .insert({
        tenant_id: tenantId,
        pr_number: prNumber,
        request_date: data.requestDate || new Date().toISOString().split('T')[0],
        department: data.department,
        purpose: data.purpose,
        requested_by: userId,
        required_date: data.requiredDate,
        status: data.status || 'DRAFT',
        remarks: data.remarks,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => ({
        pr_id: pr.id,
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

      const { error: itemsError } = await this.supabase
        .from('purchase_requisition_items')
        .insert(items);

      if (itemsError) throw new BadRequestException(itemsError.message);
    }

    return this.findOne(tenantId, pr.id);
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

  async update(tenantId: string, id: string, data: any) {
    const nowIso = new Date().toISOString();
    const updateData: any = {
      department: data.department,
      required_date: data.requiredDate,
      priority: data.priority,
      // Keep backward/forward compatibility with different client field names
      purpose: data.purpose ?? data.notes ?? null,
      notes: data.notes ?? data.purpose ?? null,
      remarks: data.remarks ?? null,
      updated_at: nowIso,
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await this.supabase
        .from('purchase_requisition_items')
        .delete()
        .eq('pr_id', id);

      // Insert new items
      if (data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          pr_id: id,
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
        }));

        await this.supabase
          .from('purchase_requisition_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async submit(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: 'SUBMITTED',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: 'APPROVED',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async reject(tenantId: string, id: string, userId: string) {
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        status: 'REJECTED',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
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

    for (let i = 0; i < vendorLookups.length; i++) {
      const vendor = vendorLookups[i];
      if (vendor?.email) {
        recipients.push({ 
          email: vendor.email, 
          name: vendor.name || 'Vendor',
          vendorId: vendorIds[i]
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
      sent,
      failed,
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
      responseRemarks: String(body?.remarks || '').trim() || null,
      followUpDate: String(body?.followUpDate || '').trim() || null,
      followUpNotes: String(body?.followUpNotes || '').trim() || null,
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

    const { data } = await this.supabase
      .from('purchase_requisitions')
      .select('pr_number')
      .eq('tenant_id', tenantId)
      .like('pr_number', `${prefix}%`)
      .order('pr_number', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(data.pr_number.split('-').pop() || '0');
    return `${prefix}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
}
