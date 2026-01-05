"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GmailOAuth2Service", {
    enumerable: true,
    get: function() {
        return GmailOAuth2Service;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _googleapis = require("googleapis");
const _nodemailer = /*#__PURE__*/ _interop_require_wildcard(require("nodemailer"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
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
let GmailOAuth2Service = class GmailOAuth2Service {
    initializeOAuth2() {
        const clientId = this.configService.get('GMAIL_CLIENT_ID');
        const clientSecret = this.configService.get('GMAIL_CLIENT_SECRET');
        const refreshToken = this.configService.get('GMAIL_REFRESH_TOKEN');
        if (!clientId || !clientSecret) {
            this.logger.warn('Gmail OAuth2 not configured - missing client credentials');
            return;
        }
        try {
            this.oauth2Client = new _googleapis.google.auth.OAuth2(clientId, clientSecret, this.configService.get('GMAIL_REDIRECT_URI', 'http://localhost:4000/api/v1/auth/google/callback'));
            if (refreshToken) {
                this.oauth2Client.setCredentials({
                    refresh_token: refreshToken
                });
                // Initialize Gmail API
                this.gmail = _googleapis.google.gmail({
                    version: 'v1',
                    auth: this.oauth2Client
                });
                // Initialize Nodemailer with OAuth2
                this.initializeTransporter();
                this.logger.log('Gmail OAuth2 initialized successfully');
            } else {
                this.logger.warn('Gmail OAuth2 configured but missing refresh token');
            }
        } catch (error) {
            this.logger.error('Failed to initialize Gmail OAuth2:', error);
        }
    }
    async initializeTransporter() {
        try {
            const accessToken = await this.oauth2Client.getAccessToken();
            this.transporter = _nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    type: 'OAuth2',
                    user: this.configService.get('GMAIL_USER', 'erpsak53@gmail.com'),
                    clientId: this.configService.get('GMAIL_CLIENT_ID'),
                    clientSecret: this.configService.get('GMAIL_CLIENT_SECRET'),
                    refreshToken: this.configService.get('GMAIL_REFRESH_TOKEN'),
                    accessToken: accessToken.token
                }
            });
            this.logger.log('Gmail OAuth2 transporter initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Gmail transporter:', error);
        }
    }
    /**
   * Check if OAuth2 is properly configured and working
   */ isConfigured() {
        return !!this.oauth2Client && !!this.configService.get('GMAIL_REFRESH_TOKEN');
    }
    /**
   * Get OAuth2 authorization URL for initial setup
   */ getAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.send'
            ],
            prompt: 'consent'
        });
    }
    /**
   * Exchange authorization code for tokens
   */ async getTokensFromCode(code) {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        // Ensure Gmail API is available immediately after auth.
        this.gmail = _googleapis.google.gmail({
            version: 'v1',
            auth: this.oauth2Client
        });
        // Initialize transporter with new tokens
        await this.initializeTransporter();
        return tokens;
    }
    /**
   * List messages (used for fallback sync)
   */ async listMessages(maxResults = 10, labelIds = [
        'INBOX'
    ]) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            maxResults,
            labelIds
        });
        return response.data;
    }
    /**
   * Send email using OAuth2
   */ async sendEmail(mailOptions) {
        if (!this.transporter) {
            throw new Error('Gmail transporter not initialized');
        }
        try {
            // Refresh transporter if needed (access token might have expired)
            await this.initializeTransporter();
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error('Failed to send email:', error);
            throw error;
        }
    }
    /**
   * Start watching Gmail inbox for new messages
   */ async startWatch(labelIds = [
        'INBOX'
    ]) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            const topicName = this.configService.get('GMAIL_PUBSUB_TOPIC');
            if (!topicName) {
                throw new Error('GMAIL_PUBSUB_TOPIC not configured');
            }
            const response = await this.gmail.users.watch({
                userId: 'me',
                requestBody: {
                    labelIds,
                    topicName
                }
            });
            this.logger.log('Gmail watch started:', response.data);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to start Gmail watch:', error);
            throw error;
        }
    }
    /**
   * Stop watching Gmail inbox
   */ async stopWatch() {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            await this.gmail.users.stop({
                userId: 'me'
            });
            this.logger.log('Gmail watch stopped');
        } catch (error) {
            this.logger.error('Failed to stop Gmail watch:', error);
            throw error;
        }
    }
    /**
   * Get email history since a specific history ID
   */ async getHistory(startHistoryId) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            const response = await this.gmail.users.history.list({
                userId: 'me',
                startHistoryId,
                historyTypes: [
                    'messageAdded'
                ]
            });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to get Gmail history:', error);
            throw error;
        }
    }
    /**
   * Get full message by ID
   */ async getMessage(messageId) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get message ${messageId}:`, error);
            throw error;
        }
    }
    /**
   * Mark message as read
   */ async markAsRead(messageId) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            await this.gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: [
                        'UNREAD'
                    ]
                }
            });
            this.logger.log(`Message ${messageId} marked as read`);
        } catch (error) {
            this.logger.error(`Failed to mark message ${messageId} as read:`, error);
            throw error;
        }
    }
    /**
   * Send reply to a message
   */ async sendReply(messageId, replyText, originalMessage) {
        if (!this.gmail) {
            throw new Error('Gmail API not initialized');
        }
        try {
            // Extract headers from original message
            const headers = originalMessage.payload.headers;
            const subject = headers.find((h)=>h.name === 'Subject')?.value || '';
            const from = headers.find((h)=>h.name === 'From')?.value || '';
            const messageIdHeader = headers.find((h)=>h.name === 'Message-ID')?.value || '';
            const references = headers.find((h)=>h.name === 'References')?.value || '';
            // Build reply
            const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
            const replyHeaders = [
                `To: ${from}`,
                `Subject: ${replySubject}`,
                `In-Reply-To: ${messageIdHeader}`,
                `References: ${references} ${messageIdHeader}`.trim()
            ];
            const rawMessage = [
                ...replyHeaders,
                '',
                replyText
            ].join('\r\n');
            const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                    threadId: originalMessage.threadId
                }
            });
            this.logger.log(`Reply sent to message ${messageId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send reply to message ${messageId}:`, error);
            throw error;
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(GmailOAuth2Service.name);
        this.transporter = null;
        this.initializeOAuth2();
    }
};
GmailOAuth2Service = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], GmailOAuth2Service);

//# sourceMappingURL=gmail-oauth2.service.js.map