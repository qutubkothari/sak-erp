"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserService", {
    enumerable: true,
    get: function() {
        return UserService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _supabasejs = require("@supabase/supabase-js");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UserService = class UserService {
    async tryLoadUserRoles(tenantId, userIds) {
        if (userIds.length === 0) return new Map();
        try {
            const { data, error } = await this.supabase.from('user_roles').select(`user_id,
           role:roles (
             id,
             name,
             permissions
           )`).eq('tenant_id', tenantId).in('user_id', userIds);
            if (error) {
                throw error;
            }
            const map = new Map();
            for (const row of data || []){
                const uid = row.user_id;
                const role = row.role;
                if (!uid || !role) continue;
                const list = map.get(uid) ?? [];
                list.push(role);
                map.set(uid, list);
            }
            return map;
        } catch  {
            return new Map();
        }
    }
    async trySyncUserRoles(tenantId, userId, roleIds) {
        try {
            // Replace existing assignments
            await this.supabase.from('user_roles').delete().eq('tenant_id', tenantId).eq('user_id', userId);
            if (roleIds.length === 0) return;
            const rows = roleIds.map((roleId)=>({
                    tenant_id: tenantId,
                    user_id: userId,
                    role_id: roleId
                }));
            await this.supabase.from('user_roles').insert(rows);
        } catch  {
        // ignore if user_roles doesn't exist yet
        }
    }
    async findAll(tenantId) {
        const { data, error } = await this.supabase.from('users').select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        role:roles (
          id,
          name
        )
      `).eq('tenant_id', tenantId).order('created_at', {
            ascending: false
        });
        if (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
        const users = data || [];
        const rolesByUserId = await this.tryLoadUserRoles(tenantId, users.map((u)=>u.id));
        return users.map((u)=>{
            const multi = rolesByUserId.get(u.id) ?? [];
            const fallback = u.role ? [
                u.role
            ] : [];
            return {
                ...u,
                roles: (multi.length > 0 ? multi : fallback).map((role)=>({
                        role
                    }))
            };
        });
    }
    async findOne(id, tenantId) {
        const { data, error } = await this.supabase.from('users').select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        role:roles (
          id,
          name,
          permissions
        )
      `).eq('id', id).eq('tenant_id', tenantId).single();
        if (error || !data) {
            throw new _common.NotFoundException('User not found');
        }
        const rolesByUserId = await this.tryLoadUserRoles(tenantId, [
            data.id
        ]);
        const multi = rolesByUserId.get(data.id) ?? [];
        const fallback = data.role ? [
            data.role
        ] : [];
        return {
            ...data,
            roles: (multi.length > 0 ? multi : fallback).map((role)=>({
                    role
                }))
        };
    }
    async create(dto) {
        // Check if user already exists
        const { data: existing } = await this.supabase.from('users').select('id').eq('email', dto.email).eq('tenant_id', dto.tenantId).maybeSingle();
        if (existing) {
            throw new _common.ConflictException('User with this email already exists');
        }
        // Hash password
        const hashedPassword = await _bcrypt.hash(dto.password, 12);
        const roleIds = Array.isArray(dto.roleIds) ? dto.roleIds.filter(Boolean) : dto.roleId ? [
            dto.roleId
        ] : [];
        // Create user
        const { data, error } = await this.supabase.from('users').insert({
            email: dto.email,
            password: hashedPassword,
            first_name: dto.firstName,
            last_name: dto.lastName,
            role_id: roleIds[0] || null,
            tenant_id: dto.tenantId,
            is_active: true
        }).select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at
      `).single();
        if (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
        await this.trySyncUserRoles(dto.tenantId, data.id, roleIds);
        return data;
    }
    async update(id, dto, tenantId) {
        const roleIds = Array.isArray(dto.roleIds) ? dto.roleIds.filter(Boolean) : dto.role_id ? [
            dto.role_id
        ] : null;
        const updateDto = {
            ...dto
        };
        delete updateDto.roleIds;
        if (roleIds) {
            updateDto.role_id = roleIds[0] || null;
        }
        const { data, error } = await this.supabase.from('users').update(updateDto).eq('id', id).eq('tenant_id', tenantId).select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at
      `).single();
        if (error || !data) {
            throw new _common.NotFoundException('User not found');
        }
        if (roleIds) {
            await this.trySyncUserRoles(tenantId, id, roleIds);
        }
        return data;
    }
    async delete(id, tenantId) {
        const { error } = await this.supabase.from('users').delete().eq('id', id).eq('tenant_id', tenantId);
        if (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
        return {
            message: 'User deleted successfully'
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
UserService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], UserService);

//# sourceMappingURL=user.service.js.map