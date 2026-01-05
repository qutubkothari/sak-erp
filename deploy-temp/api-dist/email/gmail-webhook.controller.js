"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GmailWebhookController", {
    enumerable: true,
    get: function() {
        return GmailWebhookController;
    }
});
const _common = require("@nestjs/common");
const _gmailwebhookservice = require("./gmail-webhook.service");
const _publicdecorator = require("../auth/decorators/public.decorator");
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
let GmailWebhookController = class GmailWebhookController {
    async handleGmailWebhook(payload) {
        try {
            this.logger.log('Received Gmail webhook notification');
            // Acknowledge immediately (respond 200)
            // Do heavy processing in background
            setImmediate(async ()=>{
                try {
                    await this.gmailWebhookService.processNotification(payload);
                } catch (error) {
                    this.logger.error('Error processing Gmail notification:', error);
                }
            });
            return {
                success: true
            };
        } catch (error) {
            this.logger.error('Error handling Gmail webhook:', error);
            // Still return 200 to acknowledge receipt
            return {
                success: false,
                error: error.message
            };
        }
    }
    constructor(gmailWebhookService){
        this.gmailWebhookService = gmailWebhookService;
        this.logger = new _common.Logger(GmailWebhookController.name);
    }
};
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('gmail'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof PubSubMessage === "undefined" ? Object : PubSubMessage
    ]),
    _ts_metadata("design:returntype", Promise)
], GmailWebhookController.prototype, "handleGmailWebhook", null);
GmailWebhookController = _ts_decorate([
    (0, _common.Controller)('webhooks'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _gmailwebhookservice.GmailWebhookService === "undefined" ? Object : _gmailwebhookservice.GmailWebhookService
    ])
], GmailWebhookController);

//# sourceMappingURL=gmail-webhook.controller.js.map