import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';

function formatShortDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(2);
  return `${day}/${month}/${year}`;
}

@Injectable()
export class DebitNoteService {
  private supabase: SupabaseClient;

  constructor(private emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  // Get all debit notes for tenant
  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('debit_notes')
      .select(`
        *,
        grn:grns(id, grn_number),
        vendor:vendors(id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Get single debit note with details
  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('debit_notes')
      .select(`
        *,
        grn:grns(id, grn_number, receipt_date),
        vendor:vendors(id, name, code, contact_person, email),
        debit_note_items(
          *,
          item:items(id, code, name, uom)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching debit note:', error);
      throw new NotFoundException('Debit note not found');
    }
    
    console.log('Debit note data:', JSON.stringify(data, null, 2));
    return data;
  }

  // Approve debit note
  async approve(tenantId: string, id: string, userId: string) {
    const { data, error } = await this.supabase
      .from('debit_notes')
      .update({
        status: 'APPROVED',
        approved_by: userId,
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`Debit note ${data.debit_note_number} approved by user ${userId}`);
    
    // Trigger will automatically update GRN net_payable_amount
    return data;
  }

  // Update debit note status
  async updateStatus(tenantId: string, id: string, status: string) {
    const validStatuses = ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const { data, error } = await this.supabase
      .from('debit_notes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update return status for debit note item
  async updateReturnStatus(
    tenantId: string,
    debitNoteId: string,
    itemId: string,
    returnStatus: string,
    disposalNotes?: string,
  ) {
    const validStatuses = ['PENDING', 'RETURNED', 'DESTROYED', 'REWORKED'];
    if (!validStatuses.includes(returnStatus)) {
      throw new Error(`Invalid return status: ${returnStatus}`);
    }

    const { data, error } = await this.supabase
      .from('debit_note_items')
      .update({
        return_status: returnStatus,
        return_date: returnStatus !== 'PENDING' ? new Date().toISOString().split('T')[0] : null,
        disposal_notes: disposalNotes || null,
      })
      .eq('debit_note_id', debitNoteId)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    
    // Also update grn_items return_status
    if (data.grn_item_id) {
      await this.supabase
        .from('grn_items')
        .update({ return_status: returnStatus })
        .eq('id', data.grn_item_id);
    }

    return data;
  }

  // Create manual debit note (not from QC)
  async create(tenantId: string, userId: string, data: any) {
    // Generate debit note number
    const { data: dnNumber } = await this.supabase
      .rpc('generate_debit_note_number', { p_tenant_id: tenantId });

    // Calculate GST
    const gstPercentage = data.gst_percentage || 18;
    const grossAmount = data.gross_amount || data.total_amount || 0;
    const taxAmount = Math.round(grossAmount * (gstPercentage / 100) * 100) / 100;
    const totalAmount = grossAmount + taxAmount;

    // Create debit note
    const { data: debitNote, error: dnError } = await this.supabase
      .from('debit_notes')
      .insert({
        tenant_id: tenantId,
        debit_note_number: dnNumber || `DN-${Date.now()}`,
        grn_id: data.grn_id,
        vendor_id: data.vendor_id,
        gross_amount: grossAmount,
        gst_percentage: gstPercentage,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        reason: data.reason,
        notes: data.notes,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (dnError) throw dnError;

    // Create items if provided
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => {
        const itemGrossAmount = item.amount || (item.rejected_qty * item.unit_price);
        const itemTaxAmount = Math.round(itemGrossAmount * (gstPercentage / 100) * 100) / 100;
        return {
          debit_note_id: debitNote.id,
          grn_item_id: item.grn_item_id,
          item_id: item.item_id,
          rejected_qty: item.rejected_qty,
          unit_price: item.unit_price,
          amount: itemGrossAmount,
          gst_percentage: gstPercentage,
          tax_amount: itemTaxAmount,
          rejection_reason: item.rejection_reason,
          return_status: 'PENDING',
        };
      });

      await this.supabase.from('debit_note_items').insert(items);
    }

    return debitNote;
  }

  // Get debit notes by GRN
  async findByGrn(tenantId: string, grnId: string) {
    const { data, error } = await this.supabase
      .from('debit_notes')
      .select(`
        *,
        debit_note_items(
          *,
          item:items(code, name, unit)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('grn_id', grnId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Helper: compute outstanding balance for a GRN row
  private grnOutstanding(grn: any): number {
    const gross = parseFloat(grn.gross_amount || 0);
    const tax = parseFloat(grn.tax_amount || 0);
    const debit = parseFloat(grn.debit_note_amount || 0);
    const netPayable = grn.net_payable_amount != null
      ? parseFloat(grn.net_payable_amount)
      : gross + tax - debit;
    const paid = parseFloat(grn.paid_amount || 0);
    return Math.max(0, netPayable - paid);
  }

  // Get vendor-wise payables summary (only GRNs with outstanding balance)
  async getVendorPayables(tenantId: string) {
    const { data: grnsData, error: grnsError } = await this.supabase
      .from('grns')
      .select('id, vendor_id, status, gross_amount, tax_amount, debit_note_amount, net_payable_amount, paid_amount, payment_status, invoice_number')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("REJECTED","CANCELLED")')
      .not('status', 'eq', 'DRAFT');

    if (grnsError) {
      console.error('[AP] getVendorPayables grnsError:', grnsError);
      throw grnsError;
    }
    if (!grnsData || grnsData.length === 0) return [];

    console.log('[AP] total grns fetched:', grnsData.length);

    // Keep only GRNs with an outstanding balance — invoice_approved filter is applied client-side
    const outstandingGrns = grnsData.filter((grn: any) => this.grnOutstanding(grn) > 0.009);
    console.log('[AP] outstandingGrns after balance filter:', outstandingGrns.length);
    if (outstandingGrns.length === 0) return [];

    const vendorIds = [...new Set(outstandingGrns.map((grn: any) => grn.vendor_id).filter(Boolean))];
    if (vendorIds.length === 0) return [];

    const { data: vendorsData, error: vendorsError } = await this.supabase
      .from('vendors')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .in('id', vendorIds);

    if (vendorsError) throw vendorsError;

    const vendorMap = new Map();
    vendorsData?.forEach((vendor: any) => {
      vendorMap.set(vendor.id, {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_code: vendor.code,
        total_gross: 0,
        total_debit: 0,
        total_payable: 0,
        total_paid: 0,
        total_outstanding: 0,
        grn_count: 0,
      });
    });

    outstandingGrns.forEach((grn: any) => {
      const vendor = vendorMap.get(grn.vendor_id);
      if (!vendor) return;
      const gross = parseFloat(grn.gross_amount || 0);
      const tax = parseFloat(grn.tax_amount || 0);
      const debit = parseFloat(grn.debit_note_amount || 0);
      const netPayable = grn.net_payable_amount != null
        ? parseFloat(grn.net_payable_amount)
        : gross + tax - debit;
      const paid = parseFloat(grn.paid_amount || 0);
      const outstanding = Math.max(0, netPayable - paid);
      vendor.total_gross += gross;
      vendor.total_debit += debit;
      vendor.total_payable += netPayable;
      vendor.total_paid += paid;
      vendor.total_outstanding += outstanding;
      vendor.grn_count += 1;
    });

    return Array.from(vendorMap.values()).filter((v: any) => v.total_outstanding > 0.009);
  }

  // Send debit note email to supplier
  async sendEmail(tenantId: string, id: string) {
    // Get full debit note details
    const debitNote = await this.findOne(tenantId, id);

    if (!debitNote.vendor?.email) {
      throw new Error('Vendor email not found');
    }

    // Prepare email content
    const subject = `Debit Note ${debitNote.debit_note_number} - Material Rejection`;
    
    let itemsHtml = '';
    let subtotal = 0;
    debitNote.debit_note_items?.forEach((item: any) => {
      const itemAmount = parseFloat(item.amount || 0);
      const itemTax = parseFloat(item.tax_amount || 0);
      const itemTotal = itemAmount + itemTax;
      subtotal += itemAmount;
      
      itemsHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.item.name} (${item.item.code})</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.rejected_qty} ${item.item.unit}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${itemAmount.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.gst_percentage || debitNote.gst_percentage || 18}%</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${itemTax.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.rejection_reason}</td>
        </tr>
      `;
    });

    const grossAmount = parseFloat(debitNote.gross_amount || subtotal);
    const taxAmount = parseFloat(debitNote.tax_amount || 0);
    const totalAmount = parseFloat(debitNote.total_amount || (grossAmount + taxAmount));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #f8f9fa; padding: 20px; border-bottom: 3px solid #dc3545; }
          .content { padding: 20px; }
          .footer { background: #f8f9fa; padding: 15px; margin-top: 30px; border-top: 2px solid #ddd; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #dc3545; color: white; padding: 10px; text-align: left; }
          .summary { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .total { font-size: 1.2em; font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; color: #dc3545;">Debit Note</h1>
          <p style="margin: 5px 0 0 0; font-size: 1.1em;">${debitNote.debit_note_number}</p>
        </div>
        
        <div class="content">
          <p>Dear ${debitNote.vendor.name},</p>
          
          <p>Please find below the details of Debit Note <strong>${debitNote.debit_note_number}</strong> 
          issued for rejected materials from GRN <strong>${debitNote.grn.grn_number}</strong>.</p>
          
          <div class="summary">
            <strong>Summary:</strong><br>
            Date: ${formatShortDate(debitNote.debit_note_date)}<br>
            GRN Reference: ${debitNote.grn.grn_number}<br>
            Reason: ${debitNote.reason}
          </div>
          
          <h3>Rejected Items:</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Rejected Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: right;">GST %</th>
                <th style="text-align: right;">Tax Amount</th>
                <th style="text-align: right;">Total</th>
                <th>Rejection Reason</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">
                  Subtotal (Before Tax):
                </td>
                <td colspan="5" style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">
                  ₹${grossAmount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">
                  GST (${debitNote.gst_percentage || 18}%):
                </td>
                <td colspan="5" style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">
                  ₹${taxAmount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; background: #f8f9fa;">
                  Total Debit Amount:
                </td>
                <td colspan="5" class="total" style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">
                  ₹${totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <strong>Action Required:</strong><br>
            This amount of <strong>₹${totalAmount.toFixed(2)}</strong> (including GST) will be deducted from your next payment.
            Please arrange for the collection or replacement of rejected materials at your earliest convenience.
          </div>
          
          ${debitNote.notes ? `<p><strong>Additional Notes:</strong><br>${debitNote.notes}</p>` : ''}
          
          <p>If you have any questions regarding this debit note, please contact us immediately.</p>
        </div>
        
        <div class="footer">
          <p style="margin: 0; font-size: 0.9em; color: #666;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email
    await this.emailService.sendEmail({
      to: debitNote.vendor.email,
      subject,
      html: htmlContent,
      tenantId: tenantId,
    });

    // Update debit note status to SENT
    await this.updateStatus(tenantId, id, 'SENT');

    console.log(`Debit note ${debitNote.debit_note_number} emailed to ${debitNote.vendor.email}`);

    return { message: 'Debit note sent successfully' };
  }

  // Record a payment entry against a GRN (supports multiple partial payments)
  async recordPayment(
    tenantId: string,
    grnId: string,
    paymentData: {
      amount: number;
      payment_method: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
      tds_amount?: number;
      short_payment_amount?: number;
      short_payment_reason?: string;
      close_invoice?: boolean;
      created_by?: string;
    },
  ) {
    // Fetch GRN — look across all statuses (not just COMPLETED) to avoid false 404
    const { data: grn, error: grnError } = await this.supabase
      .from('grns')
      .select('id, gross_amount, tax_amount, debit_note_amount, net_payable_amount, paid_amount, tds_amount, short_payment_amount, payment_status')
      .eq('id', grnId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (grnError) throw new Error(`Database error: ${grnError.message}`);
    if (!grn) throw new NotFoundException(`GRN not found (id: ${grnId})`);

    // Compute effective net payable (fallback if column is null)
    const gross = parseFloat(grn.gross_amount || 0);
    const tax = parseFloat(grn.tax_amount || 0);
    const debit = parseFloat(grn.debit_note_amount || 0);
    const netPayable = grn.net_payable_amount != null
      ? parseFloat(grn.net_payable_amount)
      : gross + tax - debit;

    const currentPaid = parseFloat(grn.paid_amount || 0);
    const currentTds = parseFloat(grn.tds_amount || 0);
    const currentShort = parseFloat(grn.short_payment_amount || 0);
    const tdsAmount = parseFloat(String(paymentData.tds_amount || 0));
    const shortAmount = parseFloat(String(paymentData.short_payment_amount || 0));
    const entryAmount = parseFloat(String(paymentData.amount));

    // Total effective settlement = cash paid + TDS + short payment (including already recorded)
    const totalSettlement = currentPaid + entryAmount + tdsAmount + shortAmount;
    const outstanding = Math.max(0, netPayable - currentPaid - currentTds - currentShort);

    if (entryAmount <= 0) throw new Error('Payment amount must be greater than 0');
    if (entryAmount + tdsAmount + shortAmount > outstanding + 0.009) {
      throw new Error(
        `Total settlement (₹${(entryAmount + tdsAmount + shortAmount).toFixed(2)}) exceeds outstanding balance (₹${outstanding.toFixed(2)})`,
      );
    }

    // Insert payment entry record
    const { error: entryError } = await this.supabase
      .from('grn_payment_entries')
      .insert({
        tenant_id: tenantId,
        grn_id: grnId,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: entryAmount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference || null,
        tds_amount: tdsAmount,
        short_payment_amount: shortAmount,
        short_payment_reason: paymentData.short_payment_reason || null,
        payment_notes: paymentData.payment_notes || null,
        created_by: paymentData.created_by || null,
      });

    if (entryError) throw new Error(`Failed to insert payment entry: ${entryError.message}`);

    // Recalculate aggregates from all entries
    const { data: allEntries, error: entriesError } = await this.supabase
      .from('grn_payment_entries')
      .select('amount, tds_amount, short_payment_amount')
      .eq('grn_id', grnId)
      .eq('tenant_id', tenantId);

    if (entriesError) throw new Error(`Failed to fetch entries: ${entriesError.message}`);

    const totalPaid = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
    const totalTds = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.tds_amount || 0), 0);
    const totalShort = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.short_payment_amount || 0), 0);
    const totalSettled = totalPaid + totalTds + totalShort;

    let paymentStatus = 'UNPAID';
    if (totalSettled >= netPayable - 0.009 || paymentData.close_invoice) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // Update GRN aggregate columns
    const { error: updateError } = await this.supabase
      .from('grns')
      .update({
        paid_amount: totalPaid,
        tds_amount: totalTds,
        short_payment_amount: totalShort,
        payment_status: paymentStatus,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference || null,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_notes: paymentData.payment_notes || null,
      })
      .eq('id', grnId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[recordPayment] GRN update error:', updateError.message);
      throw new Error(`Failed to update GRN: ${updateError.message}`);
    }

    const remaining = Math.max(0, netPayable - totalSettled);
    return {
      message: 'Payment recorded successfully',
      paid_amount: totalPaid,
      tds_amount: totalTds,
      short_payment_amount: totalShort,
      total_settled: totalSettled,
      remaining_amount: remaining,
      payment_status: paymentStatus,
    };
  }

  // Get all payment entries for a GRN
  async getPaymentEntries(tenantId: string, grnId: string) {
    const { data, error } = await this.supabase
      .from('grn_payment_entries')
      .select('*')
      .eq('grn_id', grnId)
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: true });

    if (error) {
      console.error('[getPaymentEntries] error:', error.message);
      return [];
    }
    return data || [];
  }

  // Get full payable detail for a single GRN (used by frontend detail modal)
  async getGrnPayableDetail(tenantId: string, grnId: string) {
    const { data: grn, error } = await this.supabase
      .from('grns')
      .select('*, purchase_order:purchase_orders(id, po_number, po_date), vendor:vendors(id, name, code)')
      .eq('id', grnId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[getGrnPayableDetail] grn fetch error:', error.message);
      throw new Error(error.message);
    }
    if (!grn) throw new NotFoundException(`GRN not found (id: ${grnId})`);  

    const entries = await this.getPaymentEntries(tenantId, grnId);

    // Fetch advance payments for this GRN's PO
    const poId = grn.po_id || grn.purchase_order?.id;
    let advanceEntries: any[] = [];
    if (poId) {
      const { data: advances } = await this.supabase
        .from('po_advance_payments')
        .select('*')
        .eq('po_id', poId)
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: true });
      advanceEntries = (advances || []).map((a: any) => ({
        ...a,
        entry_type: 'ADVANCE',
        amount: parseFloat(a.amount || 0),
        tds_amount: 0,
        short_payment_amount: 0,
      }));
    }

    const gross = parseFloat(grn.gross_amount || 0);
    const tax = parseFloat(grn.tax_amount || 0);
    const debit = parseFloat(grn.debit_note_amount || 0);
    const netPayable = grn.net_payable_amount != null
      ? parseFloat(grn.net_payable_amount)
      : gross + tax - debit;
    const totalPaid = entries.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
    const totalTds = entries.reduce((s: number, e: any) => s + parseFloat(e.tds_amount || 0), 0);
    const totalShort = entries.reduce((s: number, e: any) => s + parseFloat(e.short_payment_amount || 0), 0);
    const totalAdvance = advanceEntries.reduce((s: number, e: any) => s + e.amount, 0);
    const outstanding = Math.max(0, netPayable - totalPaid - totalTds - totalShort - totalAdvance);

    const allEntries = [
      ...advanceEntries.map(e => ({ ...e, entry_type: 'ADVANCE' })),
      ...entries.map(e => ({ ...e, entry_type: e.entry_type || 'PAYMENT' })),
    ].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    return {
      ...grn,
      net_payable_amount: netPayable,
      computed_paid: totalPaid,
      computed_tds: totalTds,
      computed_short: totalShort,
      computed_advance: totalAdvance,
      outstanding_amount: outstanding,
      payment_entries: allEntries,
    };
  }

  async recordAdvancePayment(
    tenantId: string,
    poId: string,
    paymentData: {
      amount: number;
      payment_method: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
      created_by?: string;
    },
  ) {
    const amount = parseFloat(String(paymentData.amount));
    if (!amount || amount <= 0) throw new Error('Advance amount must be greater than 0');

    const { data: po } = await this.supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, grand_total')
      .eq('id', poId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!po) throw new Error('Purchase Order not found');

    const { error } = await this.supabase.from('po_advance_payments').insert({
      tenant_id: tenantId,
      po_id: poId,
      vendor_id: po.vendor_id,
      amount,
      payment_method: paymentData.payment_method,
      payment_reference: paymentData.payment_reference || null,
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      payment_notes: paymentData.payment_notes || null,
      created_by: paymentData.created_by || null,
    });

    if (error) throw new Error(`Failed to record advance payment: ${error.message}`);

    return { message: 'Advance payment recorded successfully', po_number: po.po_number, amount };
  }

  async getAdvancePayments(tenantId: string, poId: string) {
    const { data, error } = await this.supabase
      .from('po_advance_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('po_id', poId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getAllAdvancePayments(tenantId: string) {
    const { data, error } = await this.supabase
      .from('po_advance_payments')
      .select(`*, purchase_order:purchase_orders(id, po_number, grand_total), vendor:vendors(id, name, code)`)
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
}
