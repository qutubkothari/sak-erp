import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendRFQ(to: string, rfqData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Request for Quotation - ${rfqData.rfq_number}`,
      html: this.generateRFQTemplate(rfqData),
      attachments: rfqData.attachments || [],
    };

    return this.sendMail(mailOptions);
  }

  async sendPO(to: string, poData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Purchase Order - ${poData.po_number}`,
      html: this.generatePOTemplate(poData),
      attachments: poData.attachments || [],
    };

    return this.sendMail(mailOptions);
  }

  async sendPOTrackingReminder(to: string, poData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Tracking Information Request - PO ${poData.po_number}`,
      html: this.generateTrackingReminderTemplate(poData),
    };

    return this.sendMail(mailOptions);
  }

  async sendSO(to: string, soData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Sales Order Confirmation - ${soData.so_number}`,
      html: this.generateSOTemplate(soData),
      attachments: soData.attachments || [],
    };

    return this.sendMail(mailOptions);
  }

  async sendDispatchNote(to: string, dispatchData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Dispatch Note - ${dispatchData.dispatch_number}`,
      html: this.generateDispatchTemplate(dispatchData),
      attachments: dispatchData.attachments || [],
    };

    return this.sendMail(mailOptions);
  }

  async sendIssueCertificate(to: string, certificateData: any) {
    const mailOptions = {
      from: `"${this.configService.get('COMPANY_NAME', 'SAK Solutions')}" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Issue Certificate - ${certificateData.certificate_number}`,
      html: this.generateCertificateTemplate(certificateData),
      attachments: certificateData.attachments || [],
    };

    return this.sendMail(mailOptions);
  }

  private async sendMail(mailOptions: nodemailer.SendMailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
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
                ${rfqData.items.map(item => `
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
                ${poData.items.map((item, idx) => `
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
                ${soData.items.map((item, idx) => `
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
                ${dispatchData.items.map((item, idx) => `
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
                ${certificateData.items.map((item, idx) => `
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
}
