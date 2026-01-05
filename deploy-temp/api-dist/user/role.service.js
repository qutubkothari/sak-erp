"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RoleService", {
    enumerable: true,
    get: function() {
        return RoleService;
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
let RoleService = class RoleService {
    async findAll(tenantId) {
        const { data, error } = await this.supabase.from('roles').select('*').eq('tenant_id', tenantId).order('created_at', {
            ascending: false
        });
        if (error) {
            throw new Error(`Failed to fetch roles: ${error.message}`);
        }
        return data;
    }
    async findOne(id, tenantId) {
        const { data, error } = await this.supabase.from('roles').select('*').eq('id', id).eq('tenant_id', tenantId).single();
        if (error || !data) {
            throw new _common.NotFoundException('Role not found');
        }
        return data;
    }
    async create(dto) {
        const { data, error } = await this.supabase.from('roles').insert({
            name: dto.name,
            description: dto.description,
            permissions: dto.permissions,
            tenant_id: dto.tenantId
        }).select().single();
        if (error) {
            throw new Error(`Failed to create role: ${error.message}`);
        }
        return data;
    }
    async update(id, dto, tenantId) {
        const { data, error } = await this.supabase.from('roles').update(dto).eq('id', id).eq('tenant_id', tenantId).select().single();
        if (error || !data) {
            throw new _common.NotFoundException('Role not found');
        }
        return data;
    }
    async delete(id, tenantId) {
        const { error } = await this.supabase.from('roles').delete().eq('id', id).eq('tenant_id', tenantId);
        if (error) {
            throw new Error(`Failed to delete role: ${error.message}`);
        }
        return {
            message: 'Role deleted successfully'
        };
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
RoleService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], RoleService);

//# sourceMappingURL=role.service.js.map