"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailSchedulerService", {
    enumerable: true,
    get: function() {
        return EmailSchedulerService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _schedule = require("@nestjs/schedule");
const _emailfetchservice = require("./email-fetch.service");
const _emailparserservice = require("./email-parser.service");
const _emailattachmentservice = require("./email-attachment.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let EmailSchedulerService = class EmailSchedulerService {
    onModuleInit() {
        // Enable scheduler if configured
        this.isEnabled = this.configService.get('EMAIL_FETCH_ENABLED', 'false') === 'true';
        if (this.isEnabled) {
            this.logger.log('Email scheduler enabled');
        } else {
            this.logger.log('Email scheduler disabled (set EMAIL_FETCH_ENABLED=true to enable)');
        }
    }
    /**
   * Fetch emails every 5 minutes
   */ async fetchEmailsJob() {
        if (!this.isEnabled) {
            return;
        }
        this.logger.log('Starting scheduled email fetch...');
        try {
            // Fetch new emails
            const emails = await this.fetchService.fetchEmails({
                limit: 50,
                unseen: true
            });
            this.logger.log(`Fetched ${emails.length} new emails`);
            // Process each email
            for (const email of emails){
                await this.processEmail(email);
            }
            this.logger.log('Scheduled email fetch completed');
        } catch (error) {
            this.logger.error('Error in scheduled email fetch:', error);
        }
    }
    /**
   * Parse pending emails every 10 minutes
   */ async parseEmailsJob() {
        if (!this.isEnabled) {
            return;
        }
        this.logger.log('Starting scheduled email parsing...');
        try {
            const parsedCount = await this.parserService.batchParsePendingEmails(50);
            this.logger.log(`Parsed ${parsedCount} emails`);
        } catch (error) {
            this.logger.error('Error in scheduled email parsing:', error);
        }
    }
    /**
   * Process a single fetched email
   */ async processEmail(email) {
        try {
            // Save email to database
            const emailId = await this.fetchService.saveEmailToDatabase(email);
            // Save attachments if any
            if (email.attachments && email.attachments.length > 0) {
                this.logger.log(`Processing ${email.attachments.length} attachments for email ${emailId}`);
                for (const attachment of email.attachments){
                    try {
                        await this.attachmentService.saveAttachment(emailId, attachment.filename, attachment.contentType, attachment.content);
                    } catch (error) {
                        this.logger.error(`Failed to save attachment ${attachment.filename}:`, error);
                    }
                }
            }
            // Parse email (will be picked up by batch parser)
            // Or parse immediately if high priority
            if (this.isHighPriority(email)) {
                const parsed = await this.parserService.parseEmail(emailId);
                // Execute auto actions if confidence is high
                if (parsed.confidenceScore > 0.7) {
                    await this.parserService.executeAutoActions(emailId, parsed.suggestedActions);
                }
            }
        } catch (error) {
            this.logger.error(`Error processing email ${email.messageId}:`, error);
        }
    }
    /**
   * Check if email is high priority (requires immediate parsing)
   */ isHighPriority(email) {
        const subject = email.subject.toLowerCase();
        const highPriorityKeywords = [
            'urgent',
            'asap',
            'immediate',
            'critical',
            'po',
            'order'
        ];
        return highPriorityKeywords.some((keyword)=>subject.includes(keyword));
    }
    /**
   * Manual trigger for email fetch (for testing/admin use)
   */ async triggerManualFetch() {
        this.logger.log('Manual email fetch triggered');
        try {
            const count = await this.fetchService.fetchAndSaveEmails({
                limit: 100
            });
            const parsedCount = await this.parserService.batchParsePendingEmails(100);
            return {
                fetched: count,
                parsed: parsedCount
            };
        } catch (error) {
            this.logger.error('Error in manual fetch:', error);
            throw error;
        }
    }
    /**
   * Get scheduler status
   */ getStatus() {
        return {
            enabled: this.isEnabled
        };
    }
    constructor(configService, fetchService, parserService, attachmentService){
        this.configService = configService;
        this.fetchService = fetchService;
        this.parserService = parserService;
        this.attachmentService = attachmentService;
        this.logger = new _common.Logger(EmailSchedulerService.name);
        this.isEnabled = false;
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_5_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailSchedulerService.prototype, "fetchEmailsJob", null);
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_10_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailSchedulerService.prototype, "parseEmailsJob", null);
EmailSchedulerService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _emailfetchservice.EmailFetchService === "undefined" ? Object : _emailfetchservice.EmailFetchService,
        typeof _emailparserservice.EmailParserService === "undefined" ? Object : _emailparserservice.EmailParserService,
        typeof _emailattachmentservice.EmailAttachmentService === "undefined" ? Object : _emailattachmentservice.EmailAttachmentService
    ])
], EmailSchedulerService);

//# sourceMappingURL=email-scheduler.service.js.map