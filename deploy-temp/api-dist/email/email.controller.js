"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailController", {
    enumerable: true,
    get: function() {
        return EmailController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _databaseservice = require("../common/database.service");
const _emailfetchservice = require("./email-fetch.service");
const _emailparserservice = require("./email-parser.service");
const _emailattachmentservice = require("./email-attachment.service");
const _emailschedulerservice = require("./email-scheduler.service");
const _emailconfigservice = require("./email-config.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let EmailController = class EmailController {
    /**
   * Get inbox emails with pagination and filters
   */ async getInbox(page = 1, limit = 50, folder, isRead, parsedType, search) {
        const offset = (page - 1) * limit;
        // Build query dynamically
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;
        if (folder) {
            whereConditions.push(`folder = $${paramIndex++}`);
            params.push(folder);
        }
        if (isRead !== undefined) {
            whereConditions.push(`is_read = $${paramIndex++}`);
            params.push(isRead === 'true');
        }
        if (parsedType) {
            whereConditions.push(`parsed_type = $${paramIndex++}`);
            params.push(parsedType);
        }
        if (search) {
            whereConditions.push(`(subject ILIKE $${paramIndex} OR body_text ILIKE $${paramIndex} OR from_address ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Get total count
        const countResult = await this.databaseService.executeQuery(`SELECT COUNT(*) FROM email_inbox ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count);
        // Get emails
        params.push(limit, offset);
        const result = await this.databaseService.executeQuery(`SELECT id, message_id, from_address, from_name, subject, 
              body_text, received_date, is_read, is_starred, 
              has_attachments, attachment_count, parsed_type, 
              related_entity, related_entity_id, confidence_score,
              processing_status, created_at
       FROM email_inbox 
       ${whereClause}
       ORDER BY received_date DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`, params);
        return {
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    /**
   * Get single email by ID
   */ async getEmail(id) {
        const result = await this.databaseService.executeQuery(`SELECT * FROM email_inbox WHERE id = $1`, [
            id
        ]);
        if (result.rows.length === 0) {
            throw new _common.HttpException('Email not found', _common.HttpStatus.NOT_FOUND);
        }
        // Get attachments
        const attachments = await this.attachmentService.getEmailAttachments(id);
        return {
            ...result.rows[0],
            attachments
        };
    }
    /**
   * Mark email as read/unread
   */ async markAsRead(id, isRead) {
        await this.databaseService.executeQuery('UPDATE email_inbox SET is_read = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
            isRead,
            id
        ]);
        return {
            success: true
        };
    }
    /**
   * Star/unstar email
   */ async toggleStar(id, isStarred) {
        await this.databaseService.executeQuery('UPDATE email_inbox SET is_starred = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
            isStarred,
            id
        ]);
        return {
            success: true
        };
    }
    /**
   * Manually trigger email fetch
   */ async fetchEmails() {
        try {
            const result = await this.schedulerService.triggerManualFetch();
            return {
                success: true,
                message: `Fetched ${result.fetched} emails, parsed ${result.parsed}`,
                ...result
            };
        } catch (error) {
            throw new _common.HttpException(`Email fetch failed: ${error.message}`, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Re-parse email
   */ async parseEmail(id) {
        try {
            const parsed = await this.parserService.parseEmail(id);
            return {
                success: true,
                parsed
            };
        } catch (error) {
            throw new _common.HttpException(`Parse failed: ${error.message}`, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Get email statistics
   */ async getStats() {
        const [total, unread, pending, types] = await Promise.all([
            this.databaseService.executeQuery('SELECT COUNT(*) FROM email_inbox'),
            this.databaseService.executeQuery('SELECT COUNT(*) FROM email_inbox WHERE is_read = false'),
            this.databaseService.executeQuery("SELECT COUNT(*) FROM email_inbox WHERE processing_status = 'pending'"),
            this.databaseService.executeQuery(`SELECT parsed_type, COUNT(*) as count 
         FROM email_inbox 
         WHERE parsed_type IS NOT NULL 
         GROUP BY parsed_type 
         ORDER BY count DESC`)
        ]);
        return {
            total: parseInt(total.rows[0].count),
            unread: parseInt(unread.rows[0].count),
            pending_parse: parseInt(pending.rows[0].count),
            by_type: types.rows
        };
    }
    /**
   * Get email attachments
   */ async getAttachments(id) {
        const attachments = await this.attachmentService.getEmailAttachments(id);
        return {
            data: attachments
        };
    }
    /**
   * Download attachment
   */ async downloadAttachment(attachmentId, res) {
        try {
            const attachment = await this.attachmentService.getAttachment(attachmentId);
            if (!attachment) {
                throw new _common.HttpException('Attachment not found', _common.HttpStatus.NOT_FOUND);
            }
            const buffer = await this.attachmentService.downloadAttachment(attachmentId);
            res.setHeader('Content-Type', attachment.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
            res.send(buffer);
        } catch (error) {
            throw new _common.HttpException(`Download failed: ${error.message}`, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Search attachments
   */ async searchAttachments(searchTerm, limit = 50) {
        if (!searchTerm) {
            throw new _common.HttpException('Search term required', _common.HttpStatus.BAD_REQUEST);
        }
        const results = await this.attachmentService.searchAttachments(searchTerm, limit);
        return {
            data: results
        };
    }
    /**
   * Test IMAP connection
   */ async testConnection() {
        const result = await this.fetchService.testConnection();
        return result;
    }
    /**
   * Get scheduler status
   */ async getSchedulerStatus() {
        return this.schedulerService.getStatus();
    }
    /**
   * Update email processing status
   */ async updateStatus(id, status, notes) {
        await this.databaseService.executeQuery(`UPDATE email_inbox 
       SET processing_status = $1, 
           processing_notes = $2, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`, [
            status,
            notes,
            id
        ]);
        return {
            success: true
        };
    }
    /**
   * Link email to entity (manual association)
   */ async linkToEntity(id, entityType, entityId) {
        await this.databaseService.executeQuery(`UPDATE email_inbox 
       SET related_entity = $1, 
           related_entity_id = $2, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`, [
            entityType,
            entityId,
            id
        ]);
        return {
            success: true
        };
    }
    /**
   * Get email configuration
   */ async getEmailConfig() {
        return this.emailConfigService.getAllEmailConfigDetails();
    }
    /**
   * Update email configuration
   */ async updateEmailConfig(configs, req) {
        const userId = req.user?.userId;
        try {
            await this.emailConfigService.bulkUpdateEmailConfig(configs, userId);
            return {
                success: true,
                message: 'Email configuration updated successfully'
            };
        } catch (error) {
            throw new _common.HttpException('Failed to update email configuration', _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Update single email configuration
   */ async updateSingleEmailConfig(emailType, emailAddress, req) {
        const userId = req.user?.userId;
        try {
            await this.emailConfigService.updateEmailConfig(emailType, emailAddress, userId);
            return {
                success: true,
                message: `${emailType} email updated successfully`
            };
        } catch (error) {
            throw new _common.HttpException(`Failed to update ${emailType} email`, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    constructor(databaseService, fetchService, parserService, attachmentService, schedulerService, emailConfigService){
        this.databaseService = databaseService;
        this.fetchService = fetchService;
        this.parserService = parserService;
        this.attachmentService = attachmentService;
        this.schedulerService = schedulerService;
        this.emailConfigService = emailConfigService;
    }
};
_ts_decorate([
    (0, _common.Get)('inbox'),
    _ts_param(0, (0, _common.Query)('page')),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_param(2, (0, _common.Query)('folder')),
    _ts_param(3, (0, _common.Query)('is_read')),
    _ts_param(4, (0, _common.Query)('parsed_type')),
    _ts_param(5, (0, _common.Query)('search')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        void 0,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getInbox", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getEmail", null);
_ts_decorate([
    (0, _common.Post)(':id/read'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('is_read')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Boolean
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "markAsRead", null);
_ts_decorate([
    (0, _common.Post)(':id/star'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('is_starred')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Boolean
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "toggleStar", null);
_ts_decorate([
    (0, _common.Post)('fetch'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "fetchEmails", null);
_ts_decorate([
    (0, _common.Post)(':id/parse'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "parseEmail", null);
_ts_decorate([
    (0, _common.Get)('stats/dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Get)(':id/attachments'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getAttachments", null);
_ts_decorate([
    (0, _common.Get)('attachments/:attachmentId/download'),
    _ts_param(0, (0, _common.Param)('attachmentId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "downloadAttachment", null);
_ts_decorate([
    (0, _common.Get)('attachments/search'),
    _ts_param(0, (0, _common.Query)('q')),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        void 0
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "searchAttachments", null);
_ts_decorate([
    (0, _common.Get)('test/connection'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "testConnection", null);
_ts_decorate([
    (0, _common.Get)('scheduler/status'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getSchedulerStatus", null);
_ts_decorate([
    (0, _common.Post)(':id/status'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_param(2, (0, _common.Body)('notes')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Post)(':id/link'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('entity_type')),
    _ts_param(2, (0, _common.Body)('entity_id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "linkToEntity", null);
_ts_decorate([
    (0, _common.Get)('config'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "getEmailConfig", null);
_ts_decorate([
    (0, _common.Put)('config'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "updateEmailConfig", null);
_ts_decorate([
    (0, _common.Put)('config/:type'),
    _ts_param(0, (0, _common.Param)('type')),
    _ts_param(1, (0, _common.Body)('email_address')),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], EmailController.prototype, "updateSingleEmailConfig", null);
EmailController = _ts_decorate([
    (0, _common.Controller)('emails'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _databaseservice.DatabaseService === "undefined" ? Object : _databaseservice.DatabaseService,
        typeof _emailfetchservice.EmailFetchService === "undefined" ? Object : _emailfetchservice.EmailFetchService,
        typeof _emailparserservice.EmailParserService === "undefined" ? Object : _emailparserservice.EmailParserService,
        typeof _emailattachmentservice.EmailAttachmentService === "undefined" ? Object : _emailattachmentservice.EmailAttachmentService,
        typeof _emailschedulerservice.EmailSchedulerService === "undefined" ? Object : _emailschedulerservice.EmailSchedulerService,
        typeof _emailconfigservice.EmailConfigService === "undefined" ? Object : _emailconfigservice.EmailConfigService
    ])
], EmailController);

//# sourceMappingURL=email.controller.js.map