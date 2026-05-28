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

    // Calculate GST - preserve 0% GST (don't default to 18% when gst_percentage is 0)
    const gstPercentage = data.gst_percentage !== undefined && data.gst_percentage !== null ? data.gst_percentage : 18;
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
      .select('id, vendor_id, po_id, status, gross_amount, tax_amount, debit_note_amount, net_payable_amount, paid_amount, payment_status, invoice_number')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("REJECTED","CANCELLED")')
      .not('status', 'eq', 'DRAFT');

    if (grnsError) {
      console.error('[AP] getVendorPayables grnsError:', grnsError);
      throw grnsError;
    }
    if (!grnsData || grnsData.length === 0) return [];

    console.log('[AP] total grns fetched:', grnsData.length);

    // Collect all unique PO IDs that have GRNs
    const poIds = [...new Set(grnsData.filter((g: any) => g.po_id).map((g: any) => g.po_id))];
    console.log('[AP] unique po_ids for advance lookup:', poIds.length);

    // Fetch all PO advance payments for these POs
    const poAdvanceMap = new Map<string, number>();
    if (poIds.length > 0) {
      const { data: advances } = await this.supabase
        .from('po_advance_payments')
        .select('po_id, amount')
        .eq('tenant_id', tenantId)
        .in('po_id', poIds);

      for (const adv of (advances || [])) {
        const current = poAdvanceMap.get(adv.po_id) || 0;
        poAdvanceMap.set(adv.po_id, current + parseFloat(adv.amount || 0));
      }
    }
    console.log('[AP] po advance totals:', Array.from(poAdvanceMap.entries()));

    // Calculate outstanding including PO advances
    const grnsWithOutstanding = grnsData.map((grn: any) => {
      const gross = parseFloat(grn.gross_amount || 0);
      const tax = parseFloat(grn.tax_amount || 0);
      const debit = parseFloat(grn.debit_note_amount || 0);
      const netPayable = grn.net_payable_amount != null
        ? parseFloat(grn.net_payable_amount)
        : gross + tax - debit;
      const paid = parseFloat(grn.paid_amount || 0);
      const poAdvance = grn.po_id ? (poAdvanceMap.get(grn.po_id) || 0) : 0;
      const totalPaid = paid + poAdvance;
      const outstanding = Math.max(0, netPayable - totalPaid);
      
      // Debug logging for SAIL issue
      if (grn.vendor_id && (String(grn.invoice_number).toLowerCase().includes('sail') || 
          grn.po_id?.includes('sail') || String(grn.id).includes('sail'))) {
        console.log(`[AP DEBUG] GRN ${grn.id} (SAIL?):`, {
          invoice_number: grn.invoice_number,
          po_id: grn.po_id,
          vendor_id: grn.vendor_id,
          netPayable,
          paid,
          poAdvance,
          totalPaid,
          outstanding,
          payment_status: grn.payment_status
        });
      }
      
      return { ...grn, _outstanding: outstanding, _totalPaid: totalPaid, _poAdvance: poAdvance };
    });

    // Keep only GRNs with an outstanding balance — invoice_approved filter is applied client-side
    const outstandingGrns = grnsWithOutstanding.filter((grn: any) => grn._outstanding > 0.009);
    console.log('[AP] outstandingGrns after balance filter:', outstandingGrns.length);
    console.log('[AP] GRNs kept:', outstandingGrns.map((g: any) => ({ id: g.id, vendor_id: g.vendor_id, invoice: g.invoice_number, outstanding: g._outstanding })));
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
      vendor.total_gross += gross;
      vendor.total_debit += debit;
      vendor.total_payable += netPayable;
      vendor.total_paid += grn._totalPaid;
      vendor.total_outstanding += grn._outstanding;
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
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.gst_percentage ?? debitNote.gst_percentage ?? 18}%</td>
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
                  GST (${debitNote.gst_percentage ?? 18}%):
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
      .select('id, po_id, gross_amount, tax_amount, debit_note_amount, net_payable_amount, paid_amount, tds_amount, short_payment_amount, payment_status')
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

    // Fetch PO advance for this GRN's PO
    let poAdvanceAmount = 0;
    if (grn.po_id) {
      const { data: advances } = await this.supabase
        .from('po_advance_payments')
        .select('amount')
        .eq('po_id', grn.po_id)
        .eq('tenant_id', tenantId);
      poAdvanceAmount = (advances || []).reduce((sum: number, a: any) => sum + parseFloat(a.amount || 0), 0);
    }

    // Total effective settlement = cash paid + TDS + short payment + PO advance
    const totalSettlement = currentPaid + entryAmount + tdsAmount + shortAmount + poAdvanceAmount;
    const outstanding = Math.max(0, netPayable - currentPaid - currentTds - currentShort - poAdvanceAmount);
    console.log('[recordPayment]', { grnId, netPayable, currentPaid, poAdvanceAmount, totalSettlement, outstanding });

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

  // Update an existing payment entry (for correcting mistakes)
  async updatePayment(
    tenantId: string,
    grnId: string,
    paymentEntryId: string,
    paymentData: {
      amount?: number;
      payment_method?: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
      tds_amount?: number;
      short_payment_amount?: number;
      short_payment_reason?: string;
    },
  ) {
    console.log('[updatePayment] START', { tenantId, grnId, paymentEntryId, paymentData });
    try {
      // Verify payment entry exists and belongs to this GRN/tenant
      const { data: existingEntry, error: fetchError } = await this.supabase
        .from('grn_payment_entries')
        .select('*')
        .eq('id', paymentEntryId)
        .eq('grn_id', grnId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      console.log('[updatePayment] fetch existing entry:', { existingEntry: !!existingEntry, fetchError });

      if (fetchError) throw new Error(`Database error: ${fetchError.message}`);
      if (!existingEntry) throw new NotFoundException(`Payment entry not found (id: ${paymentEntryId})`);

      // Update the payment entry
      const { error: updateError } = await this.supabase
        .from('grn_payment_entries')
        .update({
          amount: paymentData.amount !== undefined ? paymentData.amount : existingEntry.amount,
          payment_method: paymentData.payment_method || existingEntry.payment_method,
          payment_reference: paymentData.payment_reference !== undefined ? paymentData.payment_reference : existingEntry.payment_reference,
          payment_date: paymentData.payment_date || existingEntry.payment_date,
          payment_notes: paymentData.payment_notes !== undefined ? paymentData.payment_notes : existingEntry.payment_notes,
          tds_amount: paymentData.tds_amount !== undefined ? paymentData.tds_amount : existingEntry.tds_amount,
          short_payment_amount: paymentData.short_payment_amount !== undefined ? paymentData.short_payment_amount : existingEntry.short_payment_amount,
          short_payment_reason: paymentData.short_payment_reason !== undefined ? paymentData.short_payment_reason : existingEntry.short_payment_reason,
        })
        .eq('id', paymentEntryId)
        .eq('tenant_id', tenantId);

      console.log('[updatePayment] update payment entry:', { updateError });

      if (updateError) throw new Error(`Failed to update payment entry: ${updateError.message}`);

      // Recalculate all aggregates
      const { data: allEntries, error: entriesError } = await this.supabase
        .from('grn_payment_entries')
        .select('amount, tds_amount, short_payment_amount')
        .eq('grn_id', grnId)
        .eq('tenant_id', tenantId);

      console.log('[updatePayment] fetch all entries:', { count: allEntries?.length, entriesError });

      if (entriesError) throw new Error(`Failed to fetch entries: ${entriesError.message}`);

      const { data: grn } = await this.supabase
        .from('grns')
        .select('gross_amount, tax_amount, debit_note_amount, net_payable_amount')
        .eq('id', grnId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      console.log('[updatePayment] fetch GRN:', { grn, hasData: !!grn });

      const gross = parseFloat(grn?.gross_amount || 0);
      const tax = parseFloat(grn?.tax_amount || 0);
      const debit = parseFloat(grn?.debit_note_amount || 0);
      const netPayable = grn?.net_payable_amount != null
        ? parseFloat(grn.net_payable_amount)
        : gross + tax - debit;

      console.log('[updatePayment] calculated values:', { gross, tax, debit, netPayable });

      const totalPaid = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
      const totalTds = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.tds_amount || 0), 0);
      const totalShort = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.short_payment_amount || 0), 0);
      const totalSettled = totalPaid + totalTds + totalShort;

      console.log('[updatePayment] totals:', { totalPaid, totalTds, totalShort, totalSettled });

      let paymentStatus = 'UNPAID';
      if (totalSettled >= netPayable - 0.009) {
        paymentStatus = 'PAID';
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL';
      }

      // Update GRN aggregate columns
      const { error: grnUpdateError } = await this.supabase
        .from('grns')
        .update({
          paid_amount: totalPaid,
          tds_amount: totalTds,
          short_payment_amount: totalShort,
          payment_status: paymentStatus,
        })
        .eq('id', grnId)
        .eq('tenant_id', tenantId);

      console.log('[updatePayment] GRN update:', { grnUpdateError, paymentStatus });

      if (grnUpdateError) {
        console.error('[updatePayment] GRN update error:', grnUpdateError.message);
        throw new Error(`Failed to update GRN: ${grnUpdateError.message}`);
      }

      console.log('[updatePayment] SUCCESS');

      const remaining = Math.max(0, netPayable - totalSettled);
      return {
        message: 'Payment updated successfully',
        paid_amount: totalPaid,
        tds_amount: totalTds,
        short_payment_amount: totalShort,
        total_settled: totalSettled,
        remaining_amount: remaining,
        payment_status: paymentStatus,
      };
    } catch (error) {
      console.error('[updatePayment] ERROR DETAILS:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
  }

  // Delete a payment entry (for removing incorrect payments)
  async deletePayment(
    tenantId: string,
    grnId: string,
    paymentEntryId: string,
  ) {
    // Verify payment entry exists
    const { data: existingEntry, error: fetchError } = await this.supabase
      .from('grn_payment_entries')
      .select('*')
      .eq('id', paymentEntryId)
      .eq('grn_id', grnId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (fetchError) throw new Error(`Database error: ${fetchError.message}`);
    if (!existingEntry) throw new NotFoundException(`Payment entry not found (id: ${paymentEntryId})`);

    // Delete the payment entry
    const { error: deleteError } = await this.supabase
      .from('grn_payment_entries')
      .delete()
      .eq('id', paymentEntryId)
      .eq('tenant_id', tenantId);

    if (deleteError) throw new Error(`Failed to delete payment entry: ${deleteError.message}`);

    // Recalculate all aggregates from remaining entries
    const { data: allEntries, error: entriesError } = await this.supabase
      .from('grn_payment_entries')
      .select('amount, tds_amount, short_payment_amount')
      .eq('grn_id', grnId)
      .eq('tenant_id', tenantId);

    if (entriesError) throw new Error(`Failed to fetch entries: ${entriesError.message}`);

    const { data: grn } = await this.supabase
      .from('grns')
      .select('gross_amount, tax_amount, debit_note_amount, net_payable_amount')
      .eq('id', grnId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const gross = parseFloat(grn?.gross_amount || 0);
    const tax = parseFloat(grn?.tax_amount || 0);
    const debit = parseFloat(grn?.debit_note_amount || 0);
    const netPayable = grn?.net_payable_amount != null
      ? parseFloat(grn.net_payable_amount)
      : gross + tax - debit;

    const totalPaid = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
    const totalTds = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.tds_amount || 0), 0);
    const totalShort = (allEntries || []).reduce((s: number, e: any) => s + parseFloat(e.short_payment_amount || 0), 0);
    const totalSettled = totalPaid + totalTds + totalShort;

    let paymentStatus = 'UNPAID';
    if (totalSettled >= netPayable - 0.009) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // Update GRN aggregate columns
    const { error: grnUpdateError } = await this.supabase
      .from('grns')
      .update({
        paid_amount: totalPaid,
        tds_amount: totalTds,
        short_payment_amount: totalShort,
        payment_status: paymentStatus,
        // Clear last payment details if no payments remain
        payment_method: allEntries?.length ? undefined : null,
        payment_reference: allEntries?.length ? undefined : null,
        payment_date: allEntries?.length ? undefined : null,
        payment_notes: allEntries?.length ? undefined : null,
      })
      .eq('id', grnId)
      .eq('tenant_id', tenantId);

    if (grnUpdateError) {
      console.error('[deletePayment] GRN update error:', grnUpdateError.message);
      throw new Error(`Failed to update GRN: ${grnUpdateError.message}`);
    }

    const remaining = Math.max(0, netPayable - totalSettled);
    return {
      message: 'Payment deleted successfully',
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

    // Fetch vendor-level advance balance (not linked to any PO)
    const vendorId = grn.vendor_id || grn.vendor?.id;
    console.log('[getGrnPayableDetail] vendorId:', vendorId, 'grn.po_id:', poId);
    let vendorAdvanceAmount = 0;
    if (vendorId) {
      const { data: vendorAdvance, error: advanceError } = await this.supabase
        .from('vendor_advance_balances')
        .select('balance_amount, total_advance, vendor_id')
        .eq('vendor_id', vendorId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      console.log('[getGrnPayableDetail] vendorAdvance query result:', vendorAdvance, 'error:', advanceError);
      vendorAdvanceAmount = parseFloat(vendorAdvance?.balance_amount || 0);
      console.log('[getGrnPayableDetail] vendorAdvanceAmount:', vendorAdvanceAmount);
      if (vendorAdvanceAmount > 0) {
        advanceEntries.push({
          id: 'vendor-advance',
          entry_type: 'VENDOR_ADVANCE',
          amount: vendorAdvanceAmount,
          tds_amount: 0,
          short_payment_amount: 0,
          payment_date: new Date().toISOString(),
          payment_notes: 'Vendor-level advance balance',
        });
      }
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

    console.log('[getGrnPayableDetail] totals:', { netPayable, totalPaid, totalTds, totalShort, totalAdvance, outstanding, advanceEntriesCount: advanceEntries.length });

    const allEntries = [
      ...advanceEntries.map(e => ({ ...e, entry_type: e.entry_type || 'ADVANCE' })),
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
    paymentData: {
      advance_type: 'PO' | 'BLANKET';
      po_id?: string;
      vendor_id: string;
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

    const advanceType = paymentData.advance_type || 'BLANKET';
    
    let poNumber: string | null = null;
    let vendorId = paymentData.vendor_id;

    // If PO-specific advance, validate PO and get vendor from PO
    if (advanceType === 'PO' && paymentData.po_id) {
      const { data: po } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id, grand_total')
        .eq('id', paymentData.po_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!po) throw new Error('Purchase Order not found');
      
      poNumber = po.po_number;
      vendorId = po.vendor_id;
    } else if (advanceType === 'BLANKET') {
      // For blanket advance, validate vendor exists
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('id, name, code')
        .eq('id', vendorId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!vendor) throw new Error('Vendor not found');
    }

    // Insert advance payment record
    const { data: advanceRecord, error } = await this.supabase
      .from('po_advance_payments')
      .insert({
        tenant_id: tenantId,
        po_id: advanceType === 'PO' ? paymentData.po_id : null,
        vendor_id: vendorId,
        advance_type: advanceType,
        amount,
        balance_amount: amount,  // Initially full amount is available
        utilized_amount: 0,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference || null,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_notes: paymentData.payment_notes || null,
        created_by: paymentData.created_by || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record advance payment: ${error.message}`);

    // Update vendor advance balance summary
    await this.updateVendorAdvanceBalance(tenantId, vendorId, amount);

    return { 
      message: `${advanceType === 'PO' ? 'PO' : 'Blanket'} advance payment recorded successfully`, 
      po_number: poNumber,
      vendor_id: vendorId,
      amount,
      advance_id: advanceRecord.id
    };
  }

  // Helper to update vendor advance balance summary
  private async updateVendorAdvanceBalance(tenantId: string, vendorId: string, amount: number) {
    const { data: existing } = await this.supabase
      .from('vendor_advance_balances')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (existing) {
      await this.supabase
        .from('vendor_advance_balances')
        .update({
          total_advance: existing.total_advance + amount,
          balance_amount: existing.balance_amount + amount,
          last_advance_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await this.supabase
        .from('vendor_advance_balances')
        .insert({
          tenant_id: tenantId,
          vendor_id: vendorId,
          total_advance: amount,
          utilized_amount: 0,
          balance_amount: amount,
          last_advance_date: new Date().toISOString(),
        });
    }
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

  // Get vendor advance summary for Accounts Payable overview
  async getVendorAdvanceSummary(tenantId: string) {
    const { data, error } = await this.supabase
      .from('vendor_advance_balances')
      .select(`
        *,
        vendor:vendors(id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .gt('balance_amount', 0)
      .order('balance_amount', { ascending: false });

    if (error) {
      console.error('[getVendorAdvanceSummary] error:', error.message);
      return [];
    }
    return data || [];
  }

  // Get specific vendor's advance balance
  async getVendorAdvanceBalance(tenantId: string, vendorId: string) {
    const { data, error } = await this.supabase
      .from('vendor_advance_balances')
      .select(`
        *,
        vendor:vendors(id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (error) {
      console.error('[getVendorAdvanceBalance] error:', error.message);
      return null;
    }

    // If no record exists, return zero balance
    if (!data) {
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('id, name, code')
        .eq('id', vendorId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      return {
        vendor_id: vendorId,
        vendor: vendor || { id: vendorId, name: 'Unknown', code: '' },
        total_advance: 0,
        utilized_amount: 0,
        balance_amount: 0,
      };
    }

    return data;
  }

  // Add vendor-level advance (not linked to any PO)
  async addVendorAdvance(
    tenantId: string,
    vendorId: string,
    paymentData: {
      amount: number;
      payment_method?: string;
      payment_reference?: string;
      payment_date?: string;
      notes?: string;
      created_by?: string;
    },
  ) {
    const amount = parseFloat(String(paymentData.amount));
    if (!amount || amount <= 0) throw new Error('Advance amount must be greater than 0');

    // Verify vendor exists
    const { data: vendor, error: vendorError } = await this.supabase
      .from('vendors')
      .select('id, name, code')
      .eq('id', vendorId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (vendorError) throw new Error(`Vendor lookup error: ${vendorError.message}`);
    if (!vendor) throw new Error('Vendor not found');

    // Use RPC function to add advance
    const { data: advanceId, error: rpcError } = await this.supabase
      .rpc('add_vendor_advance', {
        p_tenant_id: tenantId,
        p_vendor_id: vendorId,
        p_amount: amount,
        p_notes: paymentData.notes || `Advance payment - ${paymentData.payment_method || 'NEFT'}`,
      });

    if (rpcError) {
      console.error('[addVendorAdvance] RPC error:', rpcError.message);
      // Fallback: manual upsert
      const { data: existing } = await this.supabase
        .from('vendor_advance_balances')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await this.supabase
          .from('vendor_advance_balances')
          .update({
            total_advance: (existing.total_advance || 0) + amount,
            balance_amount: (existing.balance_amount || 0) + amount,
            last_advance_date: new Date().toISOString(),
            notes: paymentData.notes || existing.notes,
          })
          .eq('id', existing.id);

        if (updateError) throw new Error(`Failed to update advance: ${updateError.message}`);
      } else {
        const { error: insertError } = await this.supabase
          .from('vendor_advance_balances')
          .insert({
            tenant_id: tenantId,
            vendor_id: vendorId,
            total_advance: amount,
            utilized_amount: 0,
            balance_amount: amount,
            last_advance_date: new Date().toISOString(),
            notes: paymentData.notes,
          });

        if (insertError) throw new Error(`Failed to insert advance: ${insertError.message}`);
      }
    }

    // Also record in po_advance_payments with po_id = NULL to track history
    const { error: historyError } = await this.supabase
      .from('po_advance_payments')
      .insert({
        tenant_id: tenantId,
        po_id: null, // Not linked to any PO - general vendor advance
        vendor_id: vendorId,
        amount: amount,
        payment_method: paymentData.payment_method || 'NEFT',
        payment_reference: paymentData.payment_reference || null,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_notes: paymentData.notes || 'Vendor-level advance payment',
        created_by: paymentData.created_by || null,
      });

    if (historyError) {
      console.error('[addVendorAdvance] History record error:', historyError.message);
      // Don't fail if history insert fails
    }

    return {
      message: 'Vendor advance added successfully',
      vendor_name: vendor.name,
      vendor_code: vendor.code,
      amount,
    };
  }

  // Utilize vendor advance against a GRN payment
  async utilizeVendorAdvance(
    tenantId: string,
    vendorId: string,
    amount: number,
    grnId?: string,
    notes?: string,
  ) {
    const { data: success, error: rpcError } = await this.supabase
      .rpc('utilize_vendor_advance', {
        p_tenant_id: tenantId,
        p_vendor_id: vendorId,
        p_amount: amount,
        p_grn_id: grnId || null,
        p_notes: notes || null,
      });

    if (rpcError) {
      console.error('[utilizeVendorAdvance] RPC error:', rpcError.message);
      throw new Error(`Failed to utilize advance: ${rpcError.message}`);
    }

    if (!success) {
      throw new Error('Insufficient advance balance');
    }

    return { success: true, amount, message: 'Advance utilized successfully' };
  }

  // NEW: Get available advances for a vendor (both blanket and PO-specific)
  async getVendorAvailableAdvances(
    tenantId: string,
    vendorId: string,
    poId?: string,
  ) {
    const { data, error } = await this.supabase
      .rpc('get_vendor_available_advances', {
        p_tenant_id: tenantId,
        p_vendor_id: vendorId,
        p_po_id: poId || null,
      });

    if (error) {
      console.error('[getVendorAvailableAdvances] error:', error.message);
      throw new Error(`Failed to get available advances: ${error.message}`);
    }

    return data || [];
  }

  // NEW: Suggest advance adjustment when GRN is created
  async suggestAdvanceAdjustment(
    tenantId: string,
    vendorId: string,
    poId: string,
    grnNetAmount: number,
  ) {
    const { data, error } = await this.supabase
      .rpc('suggest_advance_adjustment', {
        p_tenant_id: tenantId,
        p_vendor_id: vendorId,
        p_po_id: poId,
        p_grn_net_amount: grnNetAmount,
      });

    if (error) {
      console.error('[suggestAdvanceAdjustment] error:', error.message);
      return {
        has_blanket_advance: false,
        blanket_balance: 0,
        po_advance_balance: 0,
        suggested_adjustment: 0,
        message: 'Error checking advances',
      };
    }

    return data?.[0] || {
      has_blanket_advance: false,
      blanket_balance: 0,
      po_advance_balance: 0,
      suggested_adjustment: 0,
      message: 'No advances found',
    };
  }

  // NEW: Utilize a specific advance against a GRN
  async utilizeAdvanceAgainstGRN(
    tenantId: string,
    advanceId: string,
    grnId: string,
    utilizeAmount: number,
    notes?: string,
  ) {
    const { data: success, error } = await this.supabase
      .rpc('utilize_advance_against_grn', {
        p_tenant_id: tenantId,
        p_advance_id: advanceId,
        p_grn_id: grnId,
        p_utilize_amount: utilizeAmount,
        p_notes: notes || null,
      });

    if (error) {
      console.error('[utilizeAdvanceAgainstGRN] error:', error.message);
      throw new Error(`Failed to utilize advance: ${error.message}`);
    }

    if (!success) {
      throw new Error('Insufficient advance balance or advance not found');
    }

    return { success: true, amount: utilizeAmount, message: 'Advance utilized successfully' };
  }

  // NEW: Unified method to get all advances with filtering
  async getUnifiedAdvances(
    tenantId: string,
    filters?: {
      advance_type?: 'PO' | 'BLANKET' | 'ALL';
      vendor_id?: string;
      po_id?: string;
      has_balance?: boolean;
    },
  ) {
    let query = this.supabase
      .from('po_advance_payments')
      .select(`
        *,
        purchase_order:purchase_orders(id, po_number, grand_total),
        vendor:vendors(id, name, code),
        utilized_grn:grns(id, grn_number)
      `)
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false });

    // Apply filters
    if (filters?.advance_type && filters.advance_type !== 'ALL') {
      query = query.eq('advance_type', filters.advance_type);
    }

    if (filters?.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id);
    }

    if (filters?.po_id) {
      query = query.eq('po_id', filters.po_id);
    }

    if (filters?.has_balance === true) {
      query = query.gt('balance_amount', 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getUnifiedAdvances] error:', error.message);
      throw new Error(`Failed to get advances: ${error.message}`);
    }

    const advances = data || [];

    // Dynamically compute utilized_amount and balance_amount per PO
    // by summing up net payable of all invoice-approved GRNs for that PO
    const poIds = [...new Set(advances.filter((a: any) => a.po_id).map((a: any) => a.po_id as string))];
    const poGrnMap = new Map<string, number>();

    if (poIds.length > 0) {
      const { data: grns } = await this.supabase
        .from('grns')
        .select('po_id, net_payable_amount, paid_amount, tds_amount, short_payment_amount')
        .eq('tenant_id', tenantId)
        .in('po_id', poIds);

      for (const grn of grns || []) {
        if (!grn.po_id) continue;
        const net = parseFloat(grn.net_payable_amount || 0);
        const cashPaid = parseFloat(grn.paid_amount || 0) + parseFloat(grn.tds_amount || 0) + parseFloat(grn.short_payment_amount || 0);
        // Amount covered by advance = net - cash paid (floored at 0)
        const coveredByAdvance = Math.max(0, net - cashPaid);
        poGrnMap.set(grn.po_id, (poGrnMap.get(grn.po_id) || 0) + coveredByAdvance);
      }
    }

    return advances.map((adv: any) => {
      if (!adv.po_id) return adv;
      const totalAdvance = parseFloat(adv.amount || 0);
      const coveredByGRNs = poGrnMap.get(adv.po_id) || 0;
      const utilized = Math.min(totalAdvance, coveredByGRNs);
      const balance = Math.max(0, totalAdvance - utilized);
      return { ...adv, utilized_amount: utilized, balance_amount: balance };
    });
  }

  // Sync payment status for GRNs based on PO advance coverage
  // Marks GRNs as PAID if PO advance covers the full invoice amount
  async syncPaymentStatusForPoAdvances(tenantId: string) {
    // Get all GRNs with their PO advances
    const { data: grns, error: grnError } = await this.supabase
      .from('grns')
      .select('id, po_id, net_payable_amount, paid_amount, tds_amount, short_payment_amount, payment_status')
      .eq('tenant_id', tenantId)
      .not('po_id', 'is', null);

    if (grnError) throw new Error(`Failed to fetch GRNs: ${grnError.message}`);

    const updates: { id: string; payment_status: string; paid_amount: number }[] = [];

    for (const grn of grns || []) {
      if (!grn.po_id) continue;

      // Get total advance for this PO
      const { data: advances } = await this.supabase
        .from('po_advance_payments')
        .select('amount')
        .eq('po_id', grn.po_id)
        .eq('tenant_id', tenantId);

      const poAdvance = (advances || []).reduce((sum: number, a: any) => sum + parseFloat(a.amount || 0), 0);

      const netPayable = parseFloat(grn.net_payable_amount || 0);
      const paid = parseFloat(grn.paid_amount || 0);
      const tds = parseFloat(grn.tds_amount || 0);
      const short = parseFloat(grn.short_payment_amount || 0);

      // Total settlement including advance
      const totalSettled = paid + tds + short + poAdvance;

      // Check if advance covers the invoice
      if (totalSettled >= netPayable - 0.009 && grn.payment_status !== 'PAID') {
        // Set paid_amount = netPayable so outstanding shows as 0
        updates.push({ id: grn.id, payment_status: 'PAID', paid_amount: netPayable });
      }
    }

    // Batch update all GRNs that should be PAID
    for (const update of updates) {
      await this.supabase
        .from('grns')
        .update({
          payment_status: update.payment_status,
          paid_amount: update.paid_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
        .eq('tenant_id', tenantId);
    }

    console.log(`[syncPaymentStatus] Updated ${updates.length} GRNs to PAID based on PO advances`);
    return { updated: updates.length };
  }
}
