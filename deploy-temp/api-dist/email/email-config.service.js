"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailConfigService", {
    enumerable: true,
    get: function() {
        return EmailConfigService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _databaseservice = require("../common/database.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let EmailConfigService = class EmailConfigService {
    /**
   * Get email by type from database (with caching) or fall back to env vars
   */ async getEmailByType(type, envVar, defaultEmail) {
        // Check cache first
        const now = Date.now();
        if (this.emailCache.has(type) && now - this.cacheTimestamp < this.CACHE_TTL) {
            return this.emailCache.get(type);
        }
        try {
            // Try to get from database
            const result = await this.databaseService.executeQuery(`SELECT email_address FROM email_config WHERE email_type = $1 AND is_active = true LIMIT 1`, [
                type
            ]);
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
        const email = this.configService.get(envVar, defaultEmail);
        this.emailCache.set(type, email);
        this.cacheTimestamp = now;
        return email;
    }
    /**
   * Clear the email cache (call after updating email config)
   */ clearCache() {
        this.emailCache.clear();
        this.cacheTimestamp = 0;
    }
    /**
   * Get all configured email addresses (async version for database)
   */ async getEmailConfigAsync() {
        const defaultEmail = this.configService.get('DEFAULT_EMAIL', 'erpsak53@gmail.com');
        return {
            admin: await this.getEmailByType('admin', 'EMAIL_ADMIN', defaultEmail),
            sales: await this.getEmailByType('sales', 'EMAIL_SALES', defaultEmail),
            support: await this.getEmailByType('support', 'EMAIL_SUPPORT', defaultEmail),
            technical: await this.getEmailByType('technical', 'EMAIL_TECHNICAL', defaultEmail),
            purchase: await this.getEmailByType('purchase', 'EMAIL_PURCHASE', defaultEmail),
            hr: await this.getEmailByType('hr', 'EMAIL_HR', defaultEmail),
            noreply: await this.getEmailByType('noreply', 'EMAIL_NOREPLY', defaultEmail)
        };
    }
    /**
   * Get all configured email addresses (sync version for backward compatibility)
   */ getEmailConfig() {
        const defaultEmail = this.configService.get('DEFAULT_EMAIL', 'erpsak53@gmail.com');
        return {
            admin: this.configService.get('EMAIL_ADMIN', defaultEmail),
            sales: this.configService.get('EMAIL_SALES', defaultEmail),
            support: this.configService.get('EMAIL_SUPPORT', defaultEmail),
            technical: this.configService.get('EMAIL_TECHNICAL', defaultEmail),
            purchase: this.configService.get('EMAIL_PURCHASE', defaultEmail),
            hr: this.configService.get('EMAIL_HR', defaultEmail),
            noreply: this.configService.get('EMAIL_NOREPLY', defaultEmail)
        };
    }
    /**
   * Get specific email by type
   */ getEmail(type) {
        return this.getEmailConfig()[type];
    }
    /**
   * Get specific email by type (async, database-backed)
   */ async getEmailAsync(type) {
        const defaultEmail = this.configService.get('DEFAULT_EMAIL', 'erpsak53@gmail.com');
        const envVar = this.emailTypeToEnvVar[type];
        return this.getEmailByType(type, envVar, defaultEmail);
    }
    /**
   * Get admin email
   */ getAdminEmail() {
        return this.getEmail('admin');
    }
    /**
   * Get sales email
   */ getSalesEmail() {
        return this.getEmail('sales');
    }
    /**
   * Get support email
   */ getSupportEmail() {
        return this.getEmail('support');
    }
    /**
   * Get technical email
   */ getTechnicalEmail() {
        return this.getEmail('technical');
    }
    /**
   * Get purchase email
   */ getPurchaseEmail() {
        return this.getEmail('purchase');
    }
    /**
   * Get HR email
   */ getHREmail() {
        return this.getEmail('hr');
    }
    /**
   * Get no-reply email
   */ getNoReplyEmail() {
        return this.getEmail('noreply');
    }
    /**
   * Get all email configurations with details from database
   */ async getAllEmailConfigDetails() {
        try {
            const result = await this.databaseService.executeQuery(`SELECT id, email_type, email_address, display_name, description, is_active 
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
           END`, []);
            return result.rows;
        } catch (error) {
            console.error('Failed to fetch email config details:', error);
            // Return default config based on env vars
            const config = this.getEmailConfig();
            return [
                {
                    email_type: 'admin',
                    email_address: config.admin,
                    display_name: 'System Administrator',
                    description: 'System notifications, critical alerts, and administrative messages'
                },
                {
                    email_type: 'sales',
                    email_address: config.sales,
                    display_name: 'Sales Department',
                    description: 'Quotations, sales orders, and customer communications'
                },
                {
                    email_type: 'support',
                    email_address: config.support,
                    display_name: 'Customer Support',
                    description: 'Customer support requests, service tickets, and inquiries'
                },
                {
                    email_type: 'technical',
                    email_address: config.technical,
                    display_name: 'Technical Team',
                    description: 'Technical inquiries, engineering questions, and product specifications'
                },
                {
                    email_type: 'purchase',
                    email_address: config.purchase,
                    display_name: 'Purchase Department',
                    description: 'Purchase orders, vendor communications, and procurement'
                },
                {
                    email_type: 'hr',
                    email_address: config.hr,
                    display_name: 'Human Resources',
                    description: 'Employee matters, payroll, leaves, and HR communications'
                },
                {
                    email_type: 'noreply',
                    email_address: config.noreply,
                    display_name: 'No Reply',
                    description: 'Automated system notifications (do not reply)'
                }
            ];
        }
    }
    /**
   * Update email configuration
   */ async updateEmailConfig(emailType, emailAddress, userId) {
        try {
            const result = await this.databaseService.executeQuery(`UPDATE email_config 
         SET email_address = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE email_type = $3
         RETURNING id`, [
                emailAddress,
                userId || null,
                emailType
            ]);
            if (result.rows.length === 0) {
                // Insert if not exists
                await this.databaseService.executeQuery(`INSERT INTO email_config (email_type, email_address, updated_by) 
           VALUES ($1, $2, $3)`, [
                    emailType,
                    emailAddress,
                    userId || null
                ]);
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
   */ async bulkUpdateEmailConfig(configs, userId) {
        for (const config of configs){
            await this.updateEmailConfig(config.email_type, config.email_address, userId);
        }
    }
    /**
   * Get company name
   */ getCompanyName() {
        return this.configService.get('COMPANY_NAME', 'SAK Solutions');
    }
    /**
   * Get company address
   */ getCompanyAddress() {
        return this.configService.get('COMPANY_ADDRESS', '');
    }
    /**
   * Get company phone
   */ getCompanyPhone() {
        return this.configService.get('COMPANY_PHONE', '');
    }
    /**
   * Get formatted sender address for emails
   */ getFromAddress(type = 'noreply') {
        const email = this.getEmail(type);
        const companyName = this.getCompanyName();
        return `"${companyName}" <${email}>`;
    }
    /**
   * Get formatted sender address for emails (async, database-backed)
   */ async getFromAddressAsync(type = 'noreply') {
        const email = await this.getEmailAsync(type);
        const companyName = this.getCompanyName();
        return `"${companyName}" <${email}>`;
    }
    /**
   * Get email signature HTML
   */ getEmailSignature() {
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
    constructor(configService, databaseService){
        this.configService = configService;
        this.databaseService = databaseService;
        this.emailCache = new Map();
        this.cacheTimestamp = 0;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.emailTypeToEnvVar = {
            admin: 'EMAIL_ADMIN',
            sales: 'EMAIL_SALES',
            support: 'EMAIL_SUPPORT',
            technical: 'EMAIL_TECHNICAL',
            purchase: 'EMAIL_PURCHASE',
            hr: 'EMAIL_HR',
            noreply: 'EMAIL_NOREPLY'
        };
    }
};
EmailConfigService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _databaseservice.DatabaseService === "undefined" ? Object : _databaseservice.DatabaseService
    ])
], EmailConfigService);

//# sourceMappingURL=email-config.service.js.map