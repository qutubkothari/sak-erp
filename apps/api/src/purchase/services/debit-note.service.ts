import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';

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

    // Create debit note
    const { data: debitNote, error: dnError } = await this.supabase
      .from('debit_notes')
      .insert({
        tenant_id: tenantId,
        debit_note_number: dnNumber || `DN-${Date.now()}`,
        grn_id: data.grn_id,
        vendor_id: data.vendor_id,
        total_amount: data.total_amount,
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
      const items = data.items.map((item: any) => ({
        debit_note_id: debitNote.id,
        grn_item_id: item.grn_item_id,
        item_id: item.item_id,
        rejected_qty: item.rejected_qty,
        unit_price: item.unit_price,
        amount: item.amount,
        rejection_reason: item.rejection_reason,
        return_status: 'PENDING',
      }));

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

  // Get vendor-wise payables summary
  async getVendorPayables(tenantId: string) {
    const { data, error } = await this.supabase
      .from('grns')
      .select(`
        id,
        vendor_id,
        gross_amount,
        debit_note_amount,
        net_payable_amount,
        vendor:vendors(id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'COMPLETED')
      .gt('net_payable_amount', 0);

    if (error) throw error;

    // Group by vendor
    const vendorMap = new Map();
    data.forEach((grn: any) => {
      const vendorId = grn.vendor_id;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendor_id: vendorId,
          vendor_name: grn.vendor?.name,
          vendor_code: grn.vendor?.code,
          total_gross: 0,
          total_debit: 0,
          total_payable: 0,
          grn_count: 0,
        });
      }
      
      const vendor = vendorMap.get(vendorId);
      vendor.total_gross += parseFloat(grn.gross_amount || 0);
      vendor.total_debit += parseFloat(grn.debit_note_amount || 0);
      vendor.total_payable += parseFloat(grn.net_payable_amount || 0);
      vendor.grn_count += 1;
    });

    return Array.from(vendorMap.values());
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
    debitNote.debit_note_items?.forEach((item: any) => {
      itemsHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.item.name} (${item.item.code})</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.rejected_qty} ${item.item.unit}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">₹${item.amount.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.rejection_reason}</td>
        </tr>
      `;
    });

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
            Date: ${new Date(debitNote.debit_note_date).toLocaleDateString()}<br>
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
                <th>Rejection Reason</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">
                  Total Debit Amount:
                </td>
                <td colspan="2" class="total" style="border: 1px solid #ddd; padding: 8px;">
                  ₹${debitNote.total_amount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <strong>Action Required:</strong><br>
            This amount of <strong>₹${debitNote.total_amount.toFixed(2)}</strong> will be deducted from your next payment.
            Please arrange for the collection or replacement of rejected materials at your earliest convenience.
          </div>
          
          ${debitNote.notes ? `<p><strong>Additional Notes:</strong><br>${debitNote.notes}</p>` : ''}
          
          <p>If you have any questions regarding this debit note, please contact us immediately.</p>
          
          <p>Best regards,<br>
          <strong>Accounts Department</strong><br>
          SAK Manufacturing</p>
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
    });

    // Update debit note status to SENT
    await this.updateStatus(tenantId, id, 'SENT');

    console.log(`Debit note ${debitNote.debit_note_number} emailed to ${debitNote.vendor.email}`);

    return { message: 'Debit note sent successfully' };
  }

  // Record payment against a GRN
  async recordPayment(
    tenantId: string,
    grnId: string,
    paymentData: {
      amount: number;
      payment_method: string;
      payment_reference?: string;
      payment_date?: string;
      payment_notes?: string;
    },
  ) {
    // Get GRN with current payment info
    const { data: grn, error: grnError } = await this.supabase
      .from('grns')
      .select('id, net_payable_amount, paid_amount, payment_status')
      .eq('id', grnId)
      .eq('tenant_id', tenantId)
      .single();

    if (grnError || !grn) {
      throw new NotFoundException('GRN not found');
    }

    const currentPaid = grn.paid_amount || 0;
    const newPaidAmount = currentPaid + paymentData.amount;
    const netPayable = grn.net_payable_amount || 0;

    // Determine payment status
    let paymentStatus = 'UNPAID';
    if (newPaidAmount >= netPayable) {
      paymentStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'PARTIAL';
    }

    console.log('=== PAYMENT CALCULATION DEBUG ===');
    console.log('GRN ID:', grnId);
    console.log('Current Paid:', currentPaid);
    console.log('Payment Amount:', paymentData.amount);
    console.log('New Paid Amount:', newPaidAmount);
    console.log('Net Payable:', netPayable);
    console.log('Calculated Status:', paymentStatus);
    console.log('Status Logic: newPaidAmount >= netPayable?', newPaidAmount >= netPayable);

    // Update GRN
    const { error: updateError } = await this.supabase
      .from('grns')
      .update({
        paid_amount: newPaidAmount,
        payment_status: paymentStatus,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_notes: paymentData.payment_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', grnId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('UPDATE ERROR:', updateError);
      throw new Error(`Failed to record payment: ${updateError.message}`);
    }

    console.log(`✓ Payment of ${paymentData.amount} recorded for GRN ${grnId}`);
    console.log(`✓ Status updated to: ${paymentStatus}`);

    // Verify the update by fetching the record again
    const { data: verifyGrn } = await this.supabase
      .from('grns')
      .select('paid_amount, payment_status')
      .eq('id', grnId)
      .single();
    
    console.log('=== VERIFICATION ===');
    console.log('Database paid_amount:', verifyGrn?.paid_amount);
    console.log('Database payment_status:', verifyGrn?.payment_status);

    return {
      message: 'Payment recorded successfully',
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, netPayable - newPaidAmount),
      payment_status: paymentStatus,
    };
  }
}
