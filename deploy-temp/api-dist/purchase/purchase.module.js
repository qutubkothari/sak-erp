"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PurchaseModule", {
    enumerable: true,
    get: function() {
        return PurchaseModule;
    }
});
const _common = require("@nestjs/common");
const _purchaserequisitionscontroller = require("./controllers/purchase-requisitions.controller");
const _purchaseorderscontroller = require("./controllers/purchase-orders.controller");
const _vendorscontroller = require("./controllers/vendors.controller");
const _grncontroller = require("./controllers/grn.controller");
const _debitnotecontroller = require("./controllers/debit-note.controller");
const _purchaserequisitionsservice = require("./services/purchase-requisitions.service");
const _purchaseordersservice = require("./services/purchase-orders.service");
const _vendorsservice = require("./services/vendors.service");
const _grnservice = require("./services/grn.service");
const _debitnoteservice = require("./services/debit-note.service");
const _uidmodule = require("../uid/uid.module");
const _emailmodule = require("../email/email.module");
const _potrackingreminderjob = require("./jobs/po-tracking-reminder.job");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let PurchaseModule = class PurchaseModule {
};
PurchaseModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _uidmodule.UidModule,
            _emailmodule.EmailModule
        ],
        controllers: [
            _purchaserequisitionscontroller.PurchaseRequisitionsController,
            _purchaseorderscontroller.PurchaseOrdersController,
            _vendorscontroller.VendorsController,
            _grncontroller.GrnController,
            _debitnotecontroller.DebitNoteController
        ],
        providers: [
            _purchaserequisitionsservice.PurchaseRequisitionsService,
            _purchaseordersservice.PurchaseOrdersService,
            _vendorsservice.VendorsService,
            _grnservice.GrnService,
            _debitnoteservice.DebitNoteService,
            _potrackingreminderjob.PoTrackingReminderJob
        ],
        exports: [
            _purchaserequisitionsservice.PurchaseRequisitionsService,
            _purchaseordersservice.PurchaseOrdersService,
            _vendorsservice.VendorsService,
            _grnservice.GrnService,
            _debitnoteservice.DebitNoteService
        ]
    })
], PurchaseModule);

//# sourceMappingURL=purchase.module.js.map