"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BomModule", {
    enumerable: true,
    get: function() {
        return BomModule;
    }
});
const _common = require("@nestjs/common");
const _bomcontroller = require("./controllers/bom.controller");
const _bomservice = require("./services/bom.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let BomModule = class BomModule {
};
BomModule = _ts_decorate([
    (0, _common.Module)({
        controllers: [
            _bomcontroller.BomController
        ],
        providers: [
            _bomservice.BomService
        ],
        exports: [
            _bomservice.BomService
        ]
    })
], BomModule);

//# sourceMappingURL=bom.module.js.map