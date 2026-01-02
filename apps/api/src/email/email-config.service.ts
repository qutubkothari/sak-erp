import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../common/database.service';

export interface EmailConfig {
  admin: string;
  sales: string;
  support: string;
  technical: string;
  purchase: string;
  hr: string;
  noreply: string;
}

export interface EmailConfigDetail {
  id?: number;
  email_type: string;
  email_address: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

@Injectable()
export class EmailConfigService {
  private emailCache: Map<string, string> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  /**
   * Get email by type from database (with caching) or fall back to env vars
   */
  private async getEmailByType(type: string, envVar: string, defaultEmail: string): Promise<string> {
    // Check cache first
    const now = Date.now();
    if (this.emailCache.has(type) && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.emailCache.get(type)!;
    }

    try {
      // Try to get from database
      const result = await this.databaseService.executeQuery(
        `SELECT email_address FROM email_config WHERE email_type = $1 AND is_active = true LIMIT 1`,
        [type]
      );

      if (result.rows.length > 0) {
        const email = result.rows[0].email_address;
        this.emailCache.set(type, email);
        this.cacheTimestamp = now;
        return email;
      }
    } catch (error) {
      // Database error, fall through to env vars
      console.warn(`Failed to fetch ${type} email from database, using env var:`, error);
    }

    // Fall back to environment variable
    const email = this.configService.get<string>(envVar, defaultEmail);
    this.emailCache.set(type, email);
    this.cacheTimestamp = now;
    return email;
  }

  /**
   * Clear the email cache (call after updating email config)
   */
  clearCache(): void {
    this.emailCache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Get all configured email addresses (async version for database)
   */
  async getEmailConfigAsync(): Promise<EmailConfig> {
    const defaultEmail = this.configService.get<string>('DEFAULT_EMAIL', 'erpsak53@gmail.com');
    
    return {
      admin: await this.getEmailByType('admin', 'EMAIL_ADMIN', defaultEmail),
      sales: await this.getEmailByType('sales', 'EMAIL_SALES', defaultEmail),
      support: await this.getEmailByType('support', 'EMAIL_SUPPORT', defaultEmail),
      technical: await this.getEmailByType('technical', 'EMAIL_TECHNICAL', defaultEmail),
      purchase: await this.getEmailByType('purchase', 'EMAIL_PURCHASE', defaultEmail),
      hr: await this.getEmailByType('hr', 'EMAIL_HR', defaultEmail),
      noreply: await this.getEmailByType('noreply', 'EMAIL_NOREPLY', defaultEmail),
    };
  }

  /**
   * Get all configured email addresses (sync version for backward compatibility)
   */
  getEmailConfig(): EmailConfig {
    const defaultEmail = this.configService.get<string>('DEFAULT_EMAIL', 'erpsak53@gmail.com');
    
    return {
      admin: this.configService.get<string>('EMAIL_ADMIN', defaultEmail),
      sales: this.configService.get<string>('EMAIL_SALES', defaultEmail),
      support: this.configService.get<string>('EMAIL_SUPPORT', defaultEmail),
      technical: this.configService.get<string>('EMAIL_TECHNICAL', defaultEmail),
      purchase: this.configService.get<string>('EMAIL_PURCHASE', defaultEmail),
      hr: this.configService.get<string>('EMAIL_HR', defaultEmail),
      noreply: this.configService.get<string>('EMAIL_NOREPLY', defaultEmail),
    };
  }

  /**
   * Get specific email by type
   */
  getEmail(type: keyof EmailConfig): string {
    return this.getEmailConfig()[type];
  }

  /**
   * Get admin email
   */
  getAdminEmail(): string {
    return this.getEmail('admin');
  }

  /**
   * Get sales email
   */
  getSalesEmail(): string {
    return this.getEmail('sales');
  }

  /**
   * Get support email
   */
  getSupportEmail(): string {
    return this.getEmail('support');
  }

  /**
   * Get technical email
   */
  getTechnicalEmail(): string {
    return this.getEmail('technical');
  }

  /**
   * Get purchase email
   */
  getPurchaseEmail(): string {
    return this.getEmail('purchase');
  }

  /**
   * Get HR email
   */
  getHREmail(): string {
    return this.getEmail('hr');
  }

  /**
   * Get no-reply email
   */
  getNoReplyEmail(): string {
    return this.getEmail('noreply');
  }

  /**
   * Get all email configurations with details from database
   */
  async getAllEmailConfigDetails(): Promise<EmailConfigDetail[]> {
    try {
      const result = await this.databaseService.executeQuery(
        `SELECT id, email_type, email_address, display_name, description, is_active 
         FROM email_config 
         ORDER BY 
           CASE email_type 
             WHEN 'admin' THEN 1 
             WHEN 'sales' THEN 2 
             WHEN 'support' THEN 3 
             WHEN 'technical' THEN 4 
             WHEN 'purchase' THEN 5 
             WHEN 'hr' THEN 6 
             WHEN 'noreply' THEN 7 
             ELSE 8 
           END`,
        []
      );
      return result.rows as EmailConfigDetail[];
    } catch (error) {
      console.error('Failed to fetch email config details:', error);
      // Return default config based on env vars
      const config = this.getEmailConfig();
      return [
        { email_type: 'admin', email_address: config.admin, display_name: 'System Administrator', description: 'System notifications, critical alerts, and administrative messages' },
        { email_type: 'sales', email_address: config.sales, display_name: 'Sales Department', description: 'Quotations, sales orders, and customer communications' },
        { email_type: 'support', email_address: config.support, display_name: 'Customer Support', description: 'Customer support requests, service tickets, and inquiries' },
        { email_type: 'technical', email_address: config.technical, display_name: 'Technical Team', description: 'Technical inquiries, engineering questions, and product specifications' },
        { email_type: 'purchase', email_address: config.purchase, display_name: 'Purchase Department', description: 'Purchase orders, vendor communications, and procurement' },
        { email_type: 'hr', email_address: config.hr, display_name: 'Human Resources', description: 'Employee matters, payroll, leaves, and HR communications' },
        { email_type: 'noreply', email_address: config.noreply, display_name: 'No Reply', description: 'Automated system notifications (do not reply)' },
      ];
    }
  }

  /**
   * Update email configuration
   */
  async updateEmailConfig(emailType: string, emailAddress: string, userId?: string): Promise<void> {
    try {
      const result = await this.databaseService.executeQuery(
        `UPDATE email_config 
         SET email_address = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE email_type = $3
         RETURNING id`,
        [emailAddress, userId || null, emailType]
      );

      if (result.rows.length === 0) {
        // Insert if not exists
        await this.databaseService.executeQuery(
          `INSERT INTO email_config (email_type, email_address, updated_by) 
           VALUES ($1, $2, $3)`,
          [emailType, emailAddress, userId || null]
        );
      }

      // Clear cache after update
      this.clearCache();
    } catch (error) {
      console.error(`Failed to update ${emailType} email:`, error);
      throw new Error(`Failed to update email configuration`);
    }
  }

  /**
   * Bulk update email configurations
   */
  async bulkUpdateEmailConfig(configs: { email_type: string; email_address: string }[], userId?: string): Promise<void> {
    for (const config of configs) {
      await this.updateEmailConfig(config.email_type, config.email_address, userId);
    }
  }

  /**
   * Get company name
   */
  getCompanyName(): string {
    return this.configService.get('COMPANY_NAME', 'SAK Solutions');
  }

  /**
   * Get company address
   */
  getCompanyAddress(): string {
    return this.configService.get('COMPANY_ADDRESS', '');
  }

  /**
   * Get company phone
   */
  getCompanyPhone(): string {
    return this.configService.get('COMPANY_PHONE', '');
  }

  /**
   * Get formatted sender address for emails
   */
  getFromAddress(type: keyof EmailConfig = 'noreply'): string {
    const email = this.getEmail(type);
    const companyName = this.getCompanyName();
    return `"${companyName}" <${email}>`;
  }

  /**
   * Get email signature HTML
   */
  getEmailSignature(): string {
    const companyName = this.getCompanyName();
    const companyAddress = this.getCompanyAddress();
    const companyPhone = this.getCompanyPhone();
    const supportEmail = this.getSupportEmail();

    let signature = `
      <br><br>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f59e0b; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #1f2937; font-size: 16px;">${companyName}</p>
    `;

    if (companyAddress) {
      signature += `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${companyAddress}</p>`;
    }

    if (companyPhone) {
      signature += `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Tel: ${companyPhone}</p>`;
    }

    signature += `
        <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Email: <a href="mailto:${supportEmail}" style="color: #f59e0b; text-decoration: none;">${supportEmail}</a></p>
      </div>
    `;

    return signature;
  }
}
