"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UidModule", {
    enumerable: true,
    get: function() {
        return UidModule;
    }
});
const _common = require("@nestjs/common");
const _uidservice = require("./uid.service");
const _uidsupabaseservice = require("./services/uid-supabase.service");
const _uidsupabasecontroller = require("./controllers/uid-supabase.controller");
const _uidcontroller = require("./uid.controller");
const _deploymentservice = require("./deployment.service");
const _deploymentcontroller = require("./deployment.controller");
const _publicwarrantycontroller = require("./public-warranty.controller");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let UidModule = class UidModule {
};
UidModule = _ts_decorate([
    (0, _common.Module)({
        providers: [
            _uidservice.UidService,
            _uidsupabaseservice.UidSupabaseService,
            _deploymentservice.DeploymentService
        ],
        controllers: [
            _uidsupabasecontroller.UidSupabaseController,
            _uidcontroller.UidController,
            _deploymentcontroller.DeploymentController,
            _publicwarrantycontroller.PublicWarrantyController
        ],
        exports: [
            _uidservice.UidService,
            _uidsupabaseservice.UidSupabaseService,
            _deploymentservice.DeploymentService
        ]
    })
], UidModule);

//# sourceMappingURL=uid.module.js.map