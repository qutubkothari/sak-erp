"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GmailAdminController", {
    enumerable: true,
    get: function() {
        return GmailAdminController;
    }
});
const _common = require("@nestjs/common");
const _publicdecorator = require("../auth/decorators/public.decorator");
const _gmailoauth2service = require("./gmail-oauth2.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let GmailAdminController = class GmailAdminController {
    /**
   * Start Gmail push notifications watch
   * Call this once after OAuth setup to enable real-time email notifications
   */ async startWatch() {
        try {
            this.logger.log('Starting Gmail watch for push notifications');
            const result = await this.gmailOAuth2Service.startWatch();
            this.logger.log(`Gmail watch started successfully. History ID: ${result.historyId}`);
            return {
                success: true,
                message: 'Gmail push notifications enabled successfully',
                data: result
            };
        } catch (error) {
            this.logger.error('Failed to start Gmail watch:', error);
            throw new _common.HttpException({
                success: false,
                message: 'Failed to start Gmail watch',
                error: error.message
            }, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Stop Gmail push notifications watch
   */ async stopWatch() {
        try {
            this.logger.log('Stopping Gmail watch');
            await this.gmailOAuth2Service.stopWatch();
            this.logger.log('Gmail watch stopped successfully');
            return {
                success: true,
                message: 'Gmail push notifications disabled'
            };
        } catch (error) {
            this.logger.error('Failed to stop Gmail watch:', error);
            throw new _common.HttpException({
                success: false,
                message: 'Failed to stop Gmail watch',
                error: error.message
            }, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
   * Test Gmail API connectivity
   */ async testConnection() {
        try {
            this.logger.log('Testing Gmail API connection');
            const messages = await this.gmailOAuth2Service.listMessages(1);
            return {
                success: true,
                message: 'Gmail API connection successful',
                data: {
                    canAccessMailbox: true,
                    messageCount: messages.length,
                    sampleMessage: messages[0] || null
                }
            };
        } catch (error) {
            this.logger.error('Gmail API connection test failed:', error);
            throw new _common.HttpException({
                success: false,
                message: 'Gmail API connection failed',
                error: error.message
            }, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    constructor(gmailOAuth2Service){
        this.gmailOAuth2Service = gmailOAuth2Service;
        this.logger = new _common.Logger(GmailAdminController.name);
    }
};
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('start-watch'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], GmailAdminController.prototype, "startWatch", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('stop-watch'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], GmailAdminController.prototype, "stopWatch", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Get)('test-connection'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], GmailAdminController.prototype, "testConnection", null);
GmailAdminController = _ts_decorate([
    (0, _common.Controller)('admin/gmail'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _gmailoauth2service.GmailOAuth2Service === "undefined" ? Object : _gmailoauth2service.GmailOAuth2Service
    ])
], GmailAdminController);

//# sourceMappingURL=gmail-admin.controller.js.map