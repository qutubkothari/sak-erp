"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryModule", {
    enumerable: true,
    get: function() {
        return InventoryModule;
    }
});
const _common = require("@nestjs/common");
const _inventoryservice = require("./services/inventory.service");
const _inventorycontroller = require("./controllers/inventory.controller");
const _itemsmodule = require("../items/items.module");
const _emailmodule = require("../email/email.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let InventoryModule = class InventoryModule {
};
InventoryModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _itemsmodule.ItemsModule,
            _emailmodule.EmailModule
        ],
        providers: [
            _inventoryservice.InventoryService
        ],
        controllers: [
            _inventorycontroller.InventoryController
        ],
        exports: [
            _inventoryservice.InventoryService
        ]
    })
], InventoryModule);

//# sourceMappingURL=inventory.module.js.map