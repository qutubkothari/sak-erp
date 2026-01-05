"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RolesGuard", {
    enumerable: true,
    get: function() {
        return RolesGuard;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let RolesGuard = class RolesGuard {
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride('roles', [
            context.getHandler(),
            context.getClass()
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!user) {
            return false;
        }
        const normalize = (value)=>String(value ?? '').trim().toUpperCase();
        const userRoleNames = Array.isArray(user.roles) ? user.roles.map((entry)=>entry?.role?.name ?? entry?.name ?? entry).map(normalize).filter(Boolean) : user.role?.name ? [
            normalize(user.role.name)
        ] : [];
        const required = requiredRoles.map(normalize);
        return required.some((role)=>userRoleNames.includes(role));
    }
    constructor(reflector){
        this.reflector = reflector;
    }
};
RolesGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _core.Reflector === "undefined" ? Object : _core.Reflector
    ])
], RolesGuard);

//# sourceMappingURL=roles.guard.js.map