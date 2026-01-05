"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailFetchService", {
    enumerable: true,
    get: function() {
        return EmailFetchService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _imap = /*#__PURE__*/ _interop_require_default(require("imap"));
const _mailparser = require("mailparser");
const _databaseservice = require("../common/database.service");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let EmailFetchService = class EmailFetchService {
    initializeImap() {
        const smtpUser = this.configService.get('SMTP_USER', '');
        const smtpPass = this.configService.get('SMTP_PASS', '');
        const imapConfig = {
            user: this.configService.get('IMAP_USER', smtpUser),
            password: this.configService.get('IMAP_PASS', smtpPass),
            host: this.configService.get('IMAP_HOST', 'imap.gmail.com'),
            port: parseInt(this.configService.get('IMAP_PORT', '993'), 10),
            tls: this.configService.get('IMAP_TLS', 'true') === 'true',
            tlsOptions: {
                rejectUnauthorized: false
            },
            connTimeout: 10000,
            authTimeout: 5000
        };
        this.imap = new _imap.default(imapConfig);
        this.imap.on('error', (err)=>{
            this.logger.error('IMAP connection error:', err);
            this.isConnected = false;
        });
        this.imap.on('end', ()=>{
            this.logger.log('IMAP connection ended');
            this.isConnected = false;
        });
    }
    /**
   * Connect to IMAP server
   */ async connect() {
        if (this.isConnected) {
            return;
        }
        return new Promise((resolve, reject)=>{
            this.imap.once('ready', ()=>{
                this.logger.log('IMAP connection ready');
                this.isConnected = true;
                resolve();
            });
            this.imap.once('error', (err)=>{
                this.logger.error('IMAP connection failed:', err);
                reject(err);
            });
            this.imap.connect();
        });
    }
    /**
   * Disconnect from IMAP server
   */ async disconnect() {
        if (!this.isConnected) {
            return;
        }
        return new Promise((resolve)=>{
            this.imap.once('end', ()=>{
                this.isConnected = false;
                resolve();
            });
            this.imap.end();
        });
    }
    /**
   * Open mailbox folder
   */ async openMailbox(folder = 'INBOX') {
        return new Promise((resolve, reject)=>{
            this.imap.openBox(folder, false, (err, box)=>{
                if (err) {
                    this.logger.error(`Failed to open mailbox ${folder}:`, err);
                    reject(err);
                } else {
                    this.logger.log(`Opened mailbox: ${folder}, Messages: ${box.messages.total}`);
                    resolve();
                }
            });
        });
    }
    /**
   * Fetch emails from IMAP server
   */ async fetchEmails(options = {}) {
        const { folder = 'INBOX', limit = 50, since, unseen = false } = options;
        try {
            await this.connect();
            await this.openMailbox(folder);
            // Build search criteria
            const searchCriteria = [
                'ALL'
            ];
            if (since) {
                searchCriteria.push([
                    'SINCE',
                    since
                ]);
            }
            if (unseen) {
                searchCriteria.push('UNSEEN');
            }
            const messages = await this.searchMessages(searchCriteria, limit);
            this.logger.log(`Fetched ${messages.length} emails from ${folder}`);
            return messages;
        } catch (error) {
            this.logger.error('Error fetching emails:', error);
            throw error;
        } finally{
            await this.disconnect();
        }
    }
    /**
   * Search and parse messages
   */ async searchMessages(criteria, limit) {
        return new Promise((resolve, reject)=>{
            this.imap.search(criteria, (err, results)=>{
                if (err) {
                    reject(err);
                    return;
                }
                if (!results || results.length === 0) {
                    resolve([]);
                    return;
                }
                // Limit results
                const messageIds = results.slice(-limit);
                const messages = [];
                const fetch = this.imap.fetch(messageIds, {
                    bodies: '',
                    struct: true
                });
                fetch.on('message', (msg, seqno)=>{
                    let buffer = '';
                    msg.on('body', (stream)=>{
                        stream.on('data', (chunk)=>{
                            buffer += chunk.toString('utf8');
                        });
                    });
                    msg.once('end', async ()=>{
                        try {
                            const parsed = await (0, _mailparser.simpleParser)(buffer);
                            const fetchedEmail = this.parseMail(parsed);
                            messages.push(fetchedEmail);
                        } catch (error) {
                            this.logger.error(`Error parsing message ${seqno}:`, error);
                        }
                    });
                });
                fetch.once('error', (err)=>{
                    this.logger.error('Fetch error:', err);
                    reject(err);
                });
                fetch.once('end', ()=>{
                    resolve(messages);
                });
            });
        });
    }
    /**
   * Parse mail using mailparser
   */ parseMail(parsed) {
        const attachments = (parsed.attachments || []).map((att)=>({
                filename: att.filename || 'unnamed',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0,
                content: att.content
            }));
        // Handle address parsing
        const toAddresses = Array.isArray(parsed.to) ? parsed.to : parsed.to?.value || [];
        const ccAddresses = Array.isArray(parsed.cc) ? parsed.cc : parsed.cc?.value || [];
        return {
            messageId: parsed.messageId || `unknown-${Date.now()}`,
            from: {
                address: parsed.from?.value?.[0]?.address || '',
                name: parsed.from?.value?.[0]?.name || ''
            },
            to: toAddresses.map((addr)=>({
                    address: addr.address || '',
                    name: addr.name || ''
                })),
            cc: ccAddresses.map((addr)=>({
                    address: addr.address || '',
                    name: addr.name || ''
                })),
            subject: parsed.subject || '(No Subject)',
            bodyText: parsed.text || '',
            bodyHtml: parsed.html || '',
            receivedDate: parsed.date || new Date(),
            attachments,
            headers: parsed.headers,
            threadId: parsed.references?.[0] || parsed.inReplyTo || undefined
        };
    }
    /**
   * Save fetched email to database
   */ async saveEmailToDatabase(email) {
        try {
            // Check if email already exists
            const existing = await this.databaseService.executeQuery('SELECT id FROM email_inbox WHERE message_id = $1', [
                email.messageId
            ]);
            if (existing.rows.length > 0) {
                this.logger.log(`Email ${email.messageId} already exists, skipping`);
                return existing.rows[0].id;
            }
            // Insert email
            const result = await this.databaseService.executeQuery(`INSERT INTO email_inbox (
          message_id, thread_id, from_address, from_name, 
          to_addresses, cc_addresses, subject, 
          body_text, body_html, received_date, 
          has_attachments, attachment_count, raw_headers, 
          size_bytes, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`, [
                email.messageId,
                email.threadId,
                email.from.address,
                email.from.name,
                JSON.stringify(email.to),
                JSON.stringify(email.cc || []),
                email.subject,
                email.bodyText,
                email.bodyHtml,
                email.receivedDate,
                email.attachments.length > 0,
                email.attachments.length,
                JSON.stringify(email.headers),
                email.bodyText.length + email.bodyHtml.length,
                'pending'
            ]);
            const emailId = result.rows[0].id;
            this.logger.log(`Saved email ${email.messageId} with ID ${emailId}`);
            return emailId;
        } catch (error) {
            this.logger.error('Error saving email to database:', error);
            throw error;
        }
    }
    /**
   * Fetch and save new emails
   */ async fetchAndSaveEmails(options = {}) {
        try {
            // Get last sync date
            const smtpUser = this.configService.get('SMTP_USER', '');
            const imapUser = this.configService.get('IMAP_USER', smtpUser);
            const syncStatus = await this.databaseService.executeQuery('SELECT last_sync_date FROM email_sync_status WHERE email_account = $1', [
                imapUser
            ]);
            const lastSyncDate = syncStatus.rows[0]?.last_sync_date;
            if (lastSyncDate) {
                options.since = new Date(lastSyncDate);
            }
            // Update sync status to 'syncing'
            await this.updateSyncStatus('syncing', null);
            // Fetch emails
            const emails = await this.fetchEmails(options);
            let savedCount = 0;
            // Save each email
            for (const email of emails){
                try {
                    await this.saveEmailToDatabase(email);
                    savedCount++;
                } catch (error) {
                    this.logger.error(`Failed to save email ${email.messageId}:`, error);
                }
            }
            // Update sync status to 'idle'
            await this.updateSyncStatus('idle', null, savedCount);
            this.logger.log(`Fetched and saved ${savedCount} new emails`);
            return savedCount;
        } catch (error) {
            this.logger.error('Error in fetchAndSaveEmails:', error);
            await this.updateSyncStatus('error', error.message);
            throw error;
        }
    }
    /**
   * Update sync status
   */ async updateSyncStatus(status, errorMessage, messageCount = 0) {
        const smtpUser = this.configService.get('SMTP_USER', '');
        const emailAccount = this.configService.get('IMAP_USER', smtpUser);
        await this.databaseService.executeQuery(`UPDATE email_sync_status 
       SET sync_status = $1, 
           last_sync_date = CURRENT_TIMESTAMP, 
           error_message = $2,
           total_messages_synced = total_messages_synced + $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE email_account = $4`, [
            status,
            errorMessage,
            messageCount,
            emailAccount
        ]);
    }
    /**
   * Test IMAP connection
   */ async testConnection() {
        try {
            await this.connect();
            await this.openMailbox('INBOX');
            await this.disconnect();
            return {
                success: true,
                message: 'IMAP connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    constructor(configService, databaseService){
        this.configService = configService;
        this.databaseService = databaseService;
        this.logger = new _common.Logger(EmailFetchService.name);
        this.isConnected = false;
        this.initializeImap();
    }
};
EmailFetchService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _databaseservice.DatabaseService === "undefined" ? Object : _databaseservice.DatabaseService
    ])
], EmailFetchService);

//# sourceMappingURL=email-fetch.service.js.map