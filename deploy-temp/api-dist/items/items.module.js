"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ItemsModule", {
    enumerable: true,
    get: function() {
        return ItemsModule;
    }
});
const _common = require("@nestjs/common");
const _itemscontroller = require("./controllers/items.controller");
const _itemsservice = require("./services/items.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ItemsModule = class ItemsModule {
};
ItemsModule = _ts_decorate([
    (0, _common.Module)({
        controllers: [
            _itemscontroller.ItemsController
        ],
        providers: [
            _itemsservice.ItemsService
        ],
        exports: [
            _itemsservice.ItemsService
        ]
    })
], ItemsModule);

//# sourceMappingURL=items.module.js.map