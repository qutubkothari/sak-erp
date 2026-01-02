import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';
import { VendorsService } from './vendors.service';

@Injectable()
export class PurchaseRequisitionsService {
  private supabase: SupabaseClient;

  constructor(
    private readonly emailService: EmailService,
    private readonly vendorsService: VendorsService,
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
    return data;
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
    return data;
  }

  async update(tenantId: string, id: string, data: any) {
    const { error } = await this.supabase
      .from('purchase_requisitions')
      .update({
        department: data.department,
        required_date: data.requiredDate,
        priority: data.priority,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
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
          item_id: item.itemId,
          quantity: item.quantity,
          estimated_price: item.estimatedPrice,
          specifications: item.specifications,
          notes: item.notes,
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

  async sendRFQ(tenantId: string, requisitionId: string, body: any) {
    const vendorIds: string[] = Array.isArray(body?.vendorIds) ? body.vendorIds : [];
    const vendorEmails: string[] = Array.isArray(body?.vendorEmails) ? body.vendorEmails : [];

    if (vendorIds.length === 0 && vendorEmails.length === 0) {
      throw new BadRequestException('vendorIds or vendorEmails is required');
    }

    const pr = await this.findOne(tenantId, requisitionId);

    if (!pr) {
      throw new NotFoundException('Purchase Requisition not found');
    }

    if (pr.status !== 'APPROVED') {
      throw new BadRequestException('PR must be APPROVED to send RFQ');
    }

    const rfqNumber = `RFQ-${pr.pr_number}`;
    const items = (pr.purchase_requisition_items || []).map((item: any) => ({
      item_name: item.item_name || item.itemName || '-',
      description: item.description || item.specifications || item.remarks || '-',
      quantity: item.requested_qty ?? item.quantity ?? 0,
      required_date: item.required_date || pr.required_date || '-',
    }));

    const vendorLookups = await Promise.all(
      vendorIds.map(async (vendorId) => this.vendorsService.findOne(tenantId, vendorId)),
    );

    const recipients: Array<{ email: string; name: string } > = [];

    for (const vendor of vendorLookups) {
      if (vendor?.email) {
        recipients.push({ email: vendor.email, name: vendor.name || 'Vendor' });
      }
    }

    for (const email of vendorEmails) {
      if (typeof email === 'string' && email.trim()) {
        recipients.push({ email: email.trim(), name: 'Vendor' });
      }
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No valid vendor emails found');
    }

    const responseDate = body?.responseDate || body?.response_date;
    const remarks = body?.remarks;

    const sendResults = await Promise.allSettled(
      recipients.map((recipient) =>
        this.emailService.sendRFQ(recipient.email, {
          rfq_number: rfqNumber,
          vendor_name: recipient.name,
          items,
          response_date: responseDate,
          remarks,
          attachments: Array.isArray(body?.attachments) ? body.attachments : [],
        }),
      ),
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
      rfq_number: rfqNumber,
      requisition_id: requisitionId,
      sent_count: sent.length,
      failed_count: failed.length,
      sent,
      failed,
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
