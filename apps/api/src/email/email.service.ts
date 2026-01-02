import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailConfigService } from './email-config.service';
import { GmailOAuth2Service } from './gmail-oauth2.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private emailConfig: EmailConfigService,
    private gmailOAuth2Service: GmailOAuth2Service,
  ) {
    // Initialize email transporter
    const portRaw = this.configService.get('SMTP_PORT', 587);
    const port = typeof portRaw === 'string' ? parseInt(portRaw, 10) : portRaw;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private getTransportUser(): string | undefined {
    if (this.gmailOAuth2Service?.isConfigured()) {
      return this.configService.get('GMAIL_USER', this.configService.get('SMTP_USER'));
    }
    return this.configService.get('SMTP_USER');
  }

  private normalizeEmailAddress(value?: string): string {
    return (value || '').trim().toLowerCase();
  }

  private async applyFromAndReplyTo(
    mailOptions: nodemailer.SendMailOptions,
    fromType: 'admin' | 'sales' | 'support' | 'technical' | 'purchase' | 'hr' | 'noreply' = 'noreply',
  ): Promise<nodemailer.SendMailOptions> {
    const transportUser = this.getTransportUser();

    const configuredFromEmail = await this.emailConfig.getEmailAsync(fromType);
    const configuredFrom = await this.emailConfig.getFromAddressAsync(fromType);

    if (!transportUser) {
      // Keep configured sender; the underlying transport will throw a clear error.
      return { ...mailOptions, from: configuredFrom };
    }

    const transportFrom = `"${this.emailConfig.getCompanyName()}" <${transportUser}>`;

    // If the configured From isn't the same as the authenticated user, many SMTP providers reject it.
    // In that case, send from the authenticated user and set Reply-To to the configured department inbox.
    const sameAddress =
      this.normalizeEmailAddress(configuredFromEmail) === this.normalizeEmailAddress(transportUser);

    if (sameAddress) {
      return { ...mailOptions, from: configuredFrom };
    }

    return {
      ...mailOptions,
      from: transportFrom,
      replyTo: configuredFromEmail,
    };
  }

  async sendRFQ(to: string, rfqData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Request for Quotation - ${rfqData.rfq_number}`,
      html: this.generateRFQTemplate(rfqData) + this.emailConfig.getEmailSignature(),
      attachments: rfqData.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'purchase');
    return this.sendMail(mailOptions);
  }

  async sendPO(to: string, poData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Purchase Order - ${poData.po_number}`,
      html: this.generatePOTemplate(poData) + this.emailConfig.getEmailSignature(),
      attachments: poData.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'purchase');
    return this.sendMail(mailOptions);
  }

  async sendPOTrackingReminder(to: string, poData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Tracking Information Request - PO ${poData.po_number}`,
      html: this.generateTrackingReminderTemplate(poData) + this.emailConfig.getEmailSignature(),
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'purchase');
    return this.sendMail(mailOptions);
  }

  async sendSO(to: string, soData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Sales Order Confirmation - ${soData.so_number}`,
      html: this.generateSOTemplate(soData) + this.emailConfig.getEmailSignature(),
      attachments: soData.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'sales');
    return this.sendMail(mailOptions);
  }

  async sendDispatchNote(to: string, dispatchData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Dispatch Note - ${dispatchData.dispatch_number}`,
      html: this.generateDispatchTemplate(dispatchData) + this.emailConfig.getEmailSignature(),
      attachments: dispatchData.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'sales');
    return this.sendMail(mailOptions);
  }

  async sendIssueCertificate(to: string, certificateData: any) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `Issue Certificate - ${certificateData.certificate_number}`,
      html: this.generateCertificateTemplate(certificateData) + this.emailConfig.getEmailSignature(),
      attachments: certificateData.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'sales');
    return this.sendMail(mailOptions);
  }

  private async sendMail(mailOptions: nodemailer.SendMailOptions) {
    try {
      if (this.gmailOAuth2Service?.isConfigured()) {
        const info = await this.gmailOAuth2Service.sendEmail(mailOptions);
        console.log('Email sent (OAuth2):', info.messageId);
        return { success: true, messageId: info.messageId };
      }

      const smtpUser = this.configService.get('SMTP_USER');
      const smtpPass = this.configService.get('SMTP_PASS');
      if (!smtpUser || !smtpPass) {
        throw new Error('SMTP not configured (set SMTP_USER and SMTP_PASS)');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent (SMTP):', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private generateRFQTemplate(rfqData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #8B6F47; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Request for Quotation</h1>
            <p>${rfqData.rfq_number}</p>
          </div>
          <div class="content">
            <p>Dear ${rfqData.vendor_name},</p>
            <p>We would like to request a quotation for the following items:</p>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Required Date</th>
                </tr>
              </thead>
              <tbody>
                ${rfqData.items.map((item: any) => `
                  <tr>
                    <td>${item.item_name}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>${item.required_date || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p><strong>Expected Response Date:</strong> ${rfqData.response_date || 'As soon as possible'}</p>
            <p><strong>Remarks:</strong> ${rfqData.remarks || '-'}</p>
            
            <p>Please provide your best quotation including:</p>
            <ul>
              <li>Unit prices</li>
              <li>Lead time</li>
              <li>Payment terms</li>
              <li>Delivery terms</li>
            </ul>
            
            <p>Thank you for your cooperation.</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply directly to this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generatePOTemplate(poData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #8B6F47; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .info-box { background: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #8B6F47; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .total { text-align: right; font-size: 18px; font-weight: bold; color: #8B6F47; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase Order</h1>
            <p>${poData.po_number}</p>
          </div>
          <div class="content">
            <p>Dear ${poData.vendor_name},</p>
            <p>Please supply the following items as per the details below:</p>
            
            <div class="info-box">
              <strong>PO Date:</strong> ${poData.po_date}<br>
              <strong>Expected Delivery:</strong> ${poData.delivery_date || '-'}<br>
              <strong>Payment Terms:</strong> ${poData.payment_terms || '-'}
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Tax %</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${poData.items.map((item: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toFixed(2)}</td>
                    <td>${item.tax_percent}%</td>
                    <td>₹${item.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${poData.customs_duty ? `<p><strong>Customs Duty:</strong> ₹${poData.customs_duty.toFixed(2)}</p>` : ''}
            ${poData.other_charges ? `<p><strong>Other Charges:</strong> ₹${poData.other_charges.toFixed(2)}</p>` : ''}
            <p class="total">Total Amount: ₹${poData.total_amount.toFixed(2)}</p>
            
            ${poData.delivery_address ? `
              <div class="info-box">
                <strong>Delivery Address:</strong><br>
                ${poData.delivery_address}
              </div>
            ` : ''}
            
            ${poData.remarks ? `<p><strong>Remarks:</strong> ${poData.remarks}</p>` : ''}
            
            <p>Please acknowledge receipt of this PO and confirm the delivery schedule.</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>This is an automated email. For queries, please contact our purchase department.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateTrackingReminderTemplate(poData: any): string {
    const daysOverdue = Math.floor((new Date().getTime() - new Date(poData.delivery_date).getTime()) / (1000 * 60 * 60 * 24));
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #FFA500; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .alert-box { background: #FFF3CD; padding: 15px; margin: 15px 0; border-left: 4px solid #FFA500; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tracking Information Request</h1>
            <p>PO: ${poData.po_number}</p>
          </div>
          <div class="content">
            <p>Dear ${poData.vendor_name},</p>
            
            <div class="alert-box">
              ${daysOverdue > 0 
                ? `<strong>⚠️ URGENT:</strong> This order is ${daysOverdue} days overdue.` 
                : '<strong>📦 Reminder:</strong> Please provide tracking information for this order.'}
            </div>
            
            <p>We request you to provide the following tracking details:</p>
            <ul>
              <li>Tracking Number</li>
              <li>Carrier/Courier Name</li>
              <li>Shipped Date</li>
              <li>Expected Delivery Date</li>
              <li>Tracking URL (if available)</li>
            </ul>
            
            <p><strong>PO Details:</strong></p>
            <ul>
              <li>PO Number: ${poData.po_number}</li>
              <li>PO Date: ${poData.po_date}</li>
              <li>Expected Delivery: ${poData.delivery_date}</li>
              <li>Total Items: ${poData.items?.length || 0}</li>
            </ul>
            
            <p>Please update us at your earliest convenience.</p>
            <p>Thank you for your cooperation.</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder. Please provide tracking information to avoid delays.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateSOTemplate(soData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .info-box { background: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .total { text-align: right; font-size: 18px; font-weight: bold; color: #28a745; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sales Order Confirmation</h1>
            <p>${soData.so_number}</p>
          </div>
          <div class="content">
            <p>Dear ${soData.customer_name},</p>
            <p>Thank you for your order! We are pleased to confirm the following:</p>
            
            <div class="info-box">
              <strong>Order Date:</strong> ${soData.order_date}<br>
              <strong>Expected Delivery:</strong> ${soData.delivery_date || 'To be confirmed'}<br>
              <strong>Payment Terms:</strong> ${soData.payment_terms || '-'}
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${soData.items.map((item: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toFixed(2)}</td>
                    <td>₹${item.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p class="total">Total Amount: ₹${soData.total_amount.toFixed(2)}</p>
            
            ${soData.shipping_address ? `
              <div class="info-box">
                <strong>Shipping Address:</strong><br>
                ${soData.shipping_address}
              </div>
            ` : ''}
            
            <p>We will notify you once your order is dispatched.</p>
            <p>Thank you for your business!</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>For any queries, please contact our sales team.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateDispatchTemplate(dispatchData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .info-box { background: #e7f3ff; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dispatch Note</h1>
            <p>${dispatchData.dispatch_number}</p>
          </div>
          <div class="content">
            <p>Dear ${dispatchData.customer_name},</p>
            <p>Your order has been dispatched!</p>
            
            <div class="info-box">
              <strong>Dispatch Date:</strong> ${dispatchData.dispatch_date}<br>
              <strong>Expected Delivery:</strong> ${dispatchData.expected_delivery}<br>
              ${dispatchData.tracking_number ? `<strong>Tracking Number:</strong> ${dispatchData.tracking_number}<br>` : ''}
              ${dispatchData.carrier_name ? `<strong>Carrier:</strong> ${dispatchData.carrier_name}<br>` : ''}
              ${dispatchData.tracking_url ? `<strong>Track Shipment:</strong> <a href="${dispatchData.tracking_url}">Click here</a>` : ''}
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>UID Numbers</th>
                </tr>
              </thead>
              <tbody>
                ${dispatchData.items.map((item: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.uid_numbers?.join(', ') || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${dispatchData.remarks ? `<p><strong>Remarks:</strong> ${dispatchData.remarks}</p>` : ''}
            
            <p>Please inspect the goods upon delivery and report any discrepancies immediately.</p>
            <p>Thank you for your business!</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>For support, please contact our customer service team.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateCertificateTemplate(certificateData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #6f4e37; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .certificate-box { border: 3px solid #6f4e37; padding: 20px; margin: 20px 0; background: #fafafa; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Issue Certificate</h1>
            <p>${certificateData.certificate_number}</p>
          </div>
          <div class="content">
            <p>Dear ${certificateData.customer_name},</p>
            <p>This certifies that the following products have been issued and delivered:</p>
            
            <div class="certificate-box">
              <p><strong>Issue Date:</strong> ${certificateData.issue_date}</p>
              <p><strong>Sales Order:</strong> ${certificateData.so_number}</p>
              <p><strong>Dispatch Number:</strong> ${certificateData.dispatch_number}</p>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Product</th>
                  <th>UID Number</th>
                  <th>Serial Number</th>
                  <th>Warranty Period</th>
                </tr>
              </thead>
              <tbody>
                ${certificateData.items.map((item: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.product_name}</td>
                    <td>${item.uid_number}</td>
                    <td>${item.serial_number || '-'}</td>
                    <td>${item.warranty_period || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p><strong>Quality Assurance:</strong> All products have undergone quality inspection and meet our quality standards.</p>
            <p><strong>Warranty Information:</strong> ${certificateData.warranty_info || 'Standard warranty terms apply as per sales agreement.'}</p>
            
            <p>Please retain this certificate for warranty claims and service requests.</p>
            <p>Best regards,<br>${this.configService.get('COMPANY_NAME', 'SAK Solutions')}</p>
          </div>
          <div class="footer">
            <p>This is an official certificate. Please keep it safe for future reference.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Generic email sending method
  async sendEmail(options: { 
    to: string; 
    subject: string; 
    html: string; 
    attachments?: any[];
    from?: 'admin' | 'sales' | 'support' | 'technical' | 'purchase' | 'hr' | 'noreply';
  }) {
    let mailOptions: nodemailer.SendMailOptions = {
      to: options.to,
      subject: options.subject,
      html: options.html + this.emailConfig.getEmailSignature(),
      attachments: options.attachments || [],
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, options.from || 'noreply');

    return this.sendMail(mailOptions);
  }

  async sendLowStockAlert(to: string, lowStockItems: any[]) {
    let mailOptions: nodemailer.SendMailOptions = {
      to,
      subject: `⚠️ Low Stock Alert - ${lowStockItems.length} Items Need Attention`,
      html: this.generateLowStockTemplate(lowStockItems) + this.emailConfig.getEmailSignature(),
    };

    mailOptions = await this.applyFromAndReplyTo(mailOptions, 'noreply');
    return this.sendMail(mailOptions);
  }

  private generateLowStockTemplate(lowStockItems: any[]): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .alert-box { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 15px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background: #f4f4f4; font-weight: bold; }
            .critical { background: #FEE2E2; color: #991B1B; font-weight: bold; }
            .high { background: #FED7AA; color: #9A3412; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
            <p>${lowStockItems.length} items require immediate attention</p>
          </div>
          <div class="content">
            <div class="alert-box">
              <strong>Action Required:</strong> The following items have reached or fallen below their reorder levels. Please take immediate action to replenish stock.
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Warehouse</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockItems.map((item: any) => `
                  <tr class="${item.severity === 'CRITICAL' ? 'critical' : item.severity === 'HIGH' ? 'high' : ''}">
                    <td>${item.items?.item_code || '-'}</td>
                    <td>${item.items?.item_name || '-'}</td>
                    <td>${item.warehouses?.warehouse_name || '-'}</td>
                    <td>${item.current_quantity || 0}</td>
                    <td>${item.threshold_quantity || 0}</td>
                    <td>${item.severity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Review Purchase Requisitions for these items</li>
              <li>Check pending Purchase Orders</li>
              <li>Contact vendors for urgent requirements</li>
              <li>Consider alternative suppliers if needed</li>
            </ul>
            
            <p>Access the ERP system to view detailed information and take action.</p>
          </div>
          <div class="footer">
            <p>This is an automated alert from ${this.configService.get('COMPANY_NAME', 'SAK Solutions')} ERP System</p>
            <p>Generated at ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  }
}
