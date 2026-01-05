"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProductionController", {
    enumerable: true,
    get: function() {
        return ProductionController;
    }
});
const _common = require("@nestjs/common");
const _productionservice = require("../services/production.service");
const _workstationservice = require("../services/work-station.service");
const _routingservice = require("../services/routing.service");
const _stationcompletionservice = require("../services/station-completion.service");
const _jwtauthguard = require("../../auth/guards/jwt-auth.guard");
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
let ProductionController = class ProductionController {
    // Work Stations - Must come BEFORE wildcard routes like :id
    createWorkStation(req, createDto) {
        return this.workStationService.create(req.user.tenantId, createDto);
    }
    findAllWorkStations(req, filters) {
        return this.workStationService.findAll(req.user.tenantId, filters);
    }
    findOneWorkStation(req, id) {
        return this.workStationService.findOne(req.user.tenantId, id);
    }
    getWorkStationQueue(req, id) {
        return this.workStationService.getQueue(req.user.tenantId, id);
    }
    updateWorkStation(req, id, updateDto) {
        return this.workStationService.update(req.user.tenantId, id, updateDto);
    }
    deleteWorkStation(req, id) {
        return this.workStationService.delete(req.user.tenantId, id);
    }
    // Routing - Must come BEFORE wildcard routes
    createRouting(req, createDto) {
        return this.routingService.create(req.user.tenantId, createDto);
    }
    findRoutingByBom(req, bomId, withStations) {
        if (withStations === 'true') {
            return this.routingService.findByBomWithStations(req.user.tenantId, bomId);
        }
        return this.routingService.findByBom(req.user.tenantId, bomId);
    }
    updateRouting(req, id, updateDto) {
        return this.routingService.update(req.user.tenantId, id, updateDto);
    }
    deleteRouting(req, id) {
        return this.routingService.delete(req.user.tenantId, id);
    }
    copyRouting(req, data) {
        return this.routingService.copyRouting(req.user.tenantId, data.sourceBomId, data.targetBomId);
    }
    resequenceRouting(req, bomId, data) {
        return this.routingService.resequence(req.user.tenantId, bomId, data.routingIds);
    }
    // Station Completions - Must come BEFORE wildcard routes
    startOperation(req, startDto) {
        return this.stationCompletionService.startOperation(req.user.tenantId, {
            ...startDto,
            operator_id: req.user.userId
        });
    }
    getMyActiveOperation(req) {
        return this.stationCompletionService.getActiveOperation(req.user.tenantId, req.user.userId);
    }
    getCompletionsByOrder(req, orderId) {
        return this.stationCompletionService.findByProductionOrder(req.user.tenantId, orderId);
    }
    getCompletionsByStation(req, stationId, filters) {
        return this.stationCompletionService.findByWorkStation(req.user.tenantId, stationId, filters);
    }
    getOperatorProductivity(req, operatorId, startDate, endDate) {
        return this.stationCompletionService.getOperatorProductivity(req.user.tenantId, operatorId, startDate, endDate);
    }
    completeOperation(req, id, completeDto) {
        return this.stationCompletionService.completeOperation(req.user.tenantId, id, completeDto);
    }
    pauseOperation(req, id, pauseDto) {
        return this.stationCompletionService.pauseOperation(req.user.tenantId, id, pauseDto);
    }
    resumeOperation(req, id) {
        return this.stationCompletionService.resumeOperation(req.user.tenantId, id);
    }
    // Production Orders - Wildcard routes MUST come last
    create(req, createDto) {
        return this.productionService.create(req.user.tenantId, req.user.userId, createDto);
    }
    findAll(req, filters) {
        return this.productionService.findAll(req.user.tenantId, filters);
    }
    getAvailableUIDs(req, bomId) {
        return this.productionService.getAvailableUIDs(req.user.tenantId, bomId);
    }
    completeAssembly(req, data) {
        return this.productionService.completeAssembly(req.user.tenantId, {
            ...data,
            assembledBy: req.user.userId
        });
    }
    approveQC(req, id, data) {
        return this.productionService.approveQC(req.user.tenantId, id, {
            ...data,
            qcBy: req.user.userId
        });
    }
    startProduction(req, id) {
        return this.productionService.startProduction(req.user.tenantId, id, req.user.userId);
    }
    complete(req, id) {
        return this.productionService.complete(req.user.tenantId, id, req.user.userId);
    }
    findOne(req, id) {
        return this.productionService.findOne(req.user.tenantId, id);
    }
    constructor(productionService, workStationService, routingService, stationCompletionService){
        this.productionService = productionService;
        this.workStationService = workStationService;
        this.routingService = routingService;
        this.stationCompletionService = stationCompletionService;
    }
};
_ts_decorate([
    (0, _common.Post)('work-stations'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "createWorkStation", null);
_ts_decorate([
    (0, _common.Get)('work-stations'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "findAllWorkStations", null);
_ts_decorate([
    (0, _common.Get)('work-stations/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "findOneWorkStation", null);
_ts_decorate([
    (0, _common.Get)('work-stations/:id/queue'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getWorkStationQueue", null);
_ts_decorate([
    (0, _common.Put)('work-stations/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "updateWorkStation", null);
_ts_decorate([
    (0, _common.Delete)('work-stations/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "deleteWorkStation", null);
_ts_decorate([
    (0, _common.Post)('routing'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "createRouting", null);
_ts_decorate([
    (0, _common.Get)('routing/bom/:bomId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('bomId')),
    _ts_param(2, (0, _common.Query)('withStations')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "findRoutingByBom", null);
_ts_decorate([
    (0, _common.Put)('routing/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "updateRouting", null);
_ts_decorate([
    (0, _common.Delete)('routing/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "deleteRouting", null);
_ts_decorate([
    (0, _common.Post)('routing/copy'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "copyRouting", null);
_ts_decorate([
    (0, _common.Put)('routing/bom/:bomId/resequence'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('bomId')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "resequenceRouting", null);
_ts_decorate([
    (0, _common.Post)('completions/start'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "startOperation", null);
_ts_decorate([
    (0, _common.Get)('completions/my-active'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getMyActiveOperation", null);
_ts_decorate([
    (0, _common.Get)('completions/order/:orderId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('orderId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getCompletionsByOrder", null);
_ts_decorate([
    (0, _common.Get)('completions/station/:stationId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('stationId')),
    _ts_param(2, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getCompletionsByStation", null);
_ts_decorate([
    (0, _common.Get)('completions/productivity/:operatorId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('operatorId')),
    _ts_param(2, (0, _common.Query)('startDate')),
    _ts_param(3, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getOperatorProductivity", null);
_ts_decorate([
    (0, _common.Put)('completions/:id/complete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "completeOperation", null);
_ts_decorate([
    (0, _common.Put)('completions/:id/pause'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "pauseOperation", null);
_ts_decorate([
    (0, _common.Put)('completions/:id/resume'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "resumeOperation", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('available-uids/:bomId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('bomId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "getAvailableUIDs", null);
_ts_decorate([
    (0, _common.Post)('assembly/complete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "completeAssembly", null);
_ts_decorate([
    (0, _common.Put)('assembly/:id/qc'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "approveQC", null);
_ts_decorate([
    (0, _common.Put)(':id/start'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "startProduction", null);
_ts_decorate([
    (0, _common.Put)(':id/complete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "complete", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ProductionController.prototype, "findOne", null);
ProductionController = _ts_decorate([
    (0, _common.Controller)('production'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _productionservice.ProductionService === "undefined" ? Object : _productionservice.ProductionService,
        typeof _workstationservice.WorkStationService === "undefined" ? Object : _workstationservice.WorkStationService,
        typeof _routingservice.RoutingService === "undefined" ? Object : _routingservice.RoutingService,
        typeof _stationcompletionservice.StationCompletionService === "undefined" ? Object : _stationcompletionservice.StationCompletionService
    ])
], ProductionController);

//# sourceMappingURL=production.controller.js.map