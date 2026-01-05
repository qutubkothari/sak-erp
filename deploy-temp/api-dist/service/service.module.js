"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ServiceModule", {
    enumerable: true,
    get: function() {
        return ServiceModule;
    }
});
const _common = require("@nestjs/common");
const _serviceservice = require("./services/service.service");
const _servicecontroller = require("./controllers/service.controller");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ServiceModule = class ServiceModule {
};
ServiceModule = _ts_decorate([
    (0, _common.Module)({
        imports: [],
        controllers: [
            _servicecontroller.ServiceController
        ],
        providers: [
            _serviceservice.ServiceService
        ],
        exports: [
            _serviceservice.ServiceService
        ]
    })
], ServiceModule);

//# sourceMappingURL=service.module.js.map