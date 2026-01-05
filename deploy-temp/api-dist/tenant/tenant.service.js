"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TenantService", {
    enumerable: true,
    get: function() {
        return TenantService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _supabasejs = require("@supabase/supabase-js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let TenantService = class TenantService {
    async findOne(id) {
        const { data, error } = await this.supabase.from('tenants').select('*').eq('id', id).single();
        if (error || !data) {
            throw new _common.NotFoundException('Tenant not found');
        }
        return data;
    }
    async update(id, dto) {
        const { data, error } = await this.supabase.from('tenants').update(dto).eq('id', id).select().single();
        if (error || !data) {
            throw new _common.NotFoundException('Tenant not found');
        }
        return data;
    }
    constructor(configService){
        this.configService = configService;
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_KEY');
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
        }
        this.supabase = (0, _supabasejs.createClient)(supabaseUrl, supabaseKey);
    }
};
TenantService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], TenantService);

//# sourceMappingURL=tenant.service.js.map