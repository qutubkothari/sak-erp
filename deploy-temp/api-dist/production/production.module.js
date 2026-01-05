"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProductionModule", {
    enumerable: true,
    get: function() {
        return ProductionModule;
    }
});
const _common = require("@nestjs/common");
const _productionservice = require("./services/production.service");
const _workstationservice = require("./services/work-station.service");
const _routingservice = require("./services/routing.service");
const _stationcompletionservice = require("./services/station-completion.service");
const _joborderservice = require("./services/job-order.service");
const _productioncontroller = require("./controllers/production.controller");
const _jobordercontroller = require("./controllers/job-order.controller");
const _uidmodule = require("../uid/uid.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ProductionModule = class ProductionModule {
};
ProductionModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _uidmodule.UidModule
        ],
        controllers: [
            _productioncontroller.ProductionController,
            _jobordercontroller.JobOrderController
        ],
        providers: [
            _productionservice.ProductionService,
            _workstationservice.WorkStationService,
            _routingservice.RoutingService,
            _stationcompletionservice.StationCompletionService,
            _joborderservice.JobOrderService
        ],
        exports: [
            _productionservice.ProductionService,
            _workstationservice.WorkStationService,
            _routingservice.RoutingService,
            _stationcompletionservice.StationCompletionService,
            _joborderservice.JobOrderService
        ]
    })
], ProductionModule);

//# sourceMappingURL=production.module.js.map