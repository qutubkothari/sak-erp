"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesModule", {
    enumerable: true,
    get: function() {
        return SalesModule;
    }
});
const _common = require("@nestjs/common");
const _salesservice = require("./services/sales.service");
const _salescontroller = require("./controllers/sales.controller");
const _emailmodule = require("../email/email.module");
const _uidmodule = require("../uid/uid.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SalesModule = class SalesModule {
};
SalesModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _emailmodule.EmailModule,
            _uidmodule.UidModule
        ],
        providers: [
            _salesservice.SalesService
        ],
        controllers: [
            _salescontroller.SalesController
        ],
        exports: [
            _salesservice.SalesService
        ]
    })
], SalesModule);

//# sourceMappingURL=sales.module.js.map