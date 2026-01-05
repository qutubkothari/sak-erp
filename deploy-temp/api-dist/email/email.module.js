"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailModule", {
    enumerable: true,
    get: function() {
        return EmailModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _schedule = require("@nestjs/schedule");
const _emailservice = require("./email.service");
const _emailconfigservice = require("./email-config.service");
const _emailfetchservice = require("./email-fetch.service");
const _emailparserservice = require("./email-parser.service");
const _emailattachmentservice = require("./email-attachment.service");
const _emailschedulerservice = require("./email-scheduler.service");
const _emailcontroller = require("./email.controller");
const _gmailoauth2service = require("./gmail-oauth2.service");
const _gmailauthcontroller = require("./gmail-auth.controller");
const _gmailwebhookcontroller = require("./gmail-webhook.controller");
const _gmailadmincontroller = require("./gmail-admin.controller");
const _gmailwebhookservice = require("./gmail-webhook.service");
const _databasemodule = require("../common/database.module");
const _storagemodule = require("../common/storage.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let EmailModule = class EmailModule {
};
EmailModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _config.ConfigModule,
            _schedule.ScheduleModule.forRoot(),
            _databasemodule.DatabaseModule,
            _storagemodule.StorageModule
        ],
        controllers: [
            _emailcontroller.EmailController,
            _gmailauthcontroller.GmailAuthController,
            _gmailwebhookcontroller.GmailWebhookController,
            _gmailadmincontroller.GmailAdminController
        ],
        providers: [
            _emailservice.EmailService,
            _emailconfigservice.EmailConfigService,
            _emailfetchservice.EmailFetchService,
            _emailparserservice.EmailParserService,
            _emailattachmentservice.EmailAttachmentService,
            _emailschedulerservice.EmailSchedulerService,
            _gmailoauth2service.GmailOAuth2Service,
            _gmailwebhookservice.GmailWebhookService
        ],
        exports: [
            _emailservice.EmailService,
            _emailconfigservice.EmailConfigService,
            _emailfetchservice.EmailFetchService,
            _emailparserservice.EmailParserService,
            _emailattachmentservice.EmailAttachmentService,
            _gmailoauth2service.GmailOAuth2Service,
            _gmailwebhookservice.GmailWebhookService
        ]
    })
], EmailModule);

//# sourceMappingURL=email.module.js.map