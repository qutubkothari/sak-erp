"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GmailAuthController", {
    enumerable: true,
    get: function() {
        return GmailAuthController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _gmailoauth2service = require("./gmail-oauth2.service");
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
let GmailAuthController = class GmailAuthController {
    async googleAuth(res) {
        try {
            const authUrl = this.gmailOAuth2Service.getAuthUrl();
            res.redirect(authUrl);
        } catch (error) {
            this.logger.error('Error generating auth URL:', error);
            res.status(500).json({
                error: 'Failed to generate authorization URL'
            });
        }
    }
    async googleAuthCallback(code, error, res) {
        if (error) {
            this.logger.error('OAuth error:', error);
            return res.status(400).json({
                error
            });
        }
        if (!code) {
            return res.status(400).json({
                error: 'No authorization code provided'
            });
        }
        try {
            const tokens = await this.gmailOAuth2Service.getTokensFromCode(code);
            this.logger.log('OAuth tokens obtained successfully');
            // Return tokens to be saved in .env
            res.json({
                success: true,
                message: 'Authorization successful! Add these to your .env file:',
                tokens: {
                    refresh_token: tokens.refresh_token,
                    access_token: tokens.access_token,
                    expiry_date: tokens.expiry_date
                },
                envVars: {
                    GMAIL_REFRESH_TOKEN: tokens.refresh_token
                }
            });
        } catch (error) {
            this.logger.error('Error exchanging code for tokens:', error);
            res.status(500).json({
                error: 'Failed to exchange authorization code'
            });
        }
    }
    constructor(gmailOAuth2Service){
        this.gmailOAuth2Service = gmailOAuth2Service;
        this.logger = new _common.Logger(GmailAuthController.name);
    }
};
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Get)('google'),
    _ts_param(0, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], GmailAuthController.prototype, "googleAuth", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Get)('google/callback'),
    _ts_param(0, (0, _common.Query)('code')),
    _ts_param(1, (0, _common.Query)('error')),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], GmailAuthController.prototype, "googleAuthCallback", null);
GmailAuthController = _ts_decorate([
    (0, _common.Controller)('auth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _gmailoauth2service.GmailOAuth2Service === "undefined" ? Object : _gmailoauth2service.GmailOAuth2Service
    ])
], GmailAuthController);

//# sourceMappingURL=gmail-auth.controller.js.map