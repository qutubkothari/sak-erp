"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CategoriesService", {
    enumerable: true,
    get: function() {
        return CategoriesService;
    }
});
const _common = require("@nestjs/common");
const _supabasejs = require("@supabase/supabase-js");
const _config = require("@nestjs/config");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CategoriesService = class CategoriesService {
    async findAll(tenantId) {
        const { data, error } = await this.supabase.from('item_category_options').select('*').eq('tenant_id', tenantId).order('name', {
            ascending: true
        });
        if (error) throw error;
        return data;
    }
    async create(tenantId, name) {
        const { data, error } = await this.supabase.from('item_category_options').insert({
            tenant_id: tenantId,
            name: name.trim().toUpperCase().replace(/\s+/g, '_')
        }).select().single();
        if (error) throw error;
        return data;
    }
    async update(tenantId, id, name) {
        const { data, error } = await this.supabase.from('item_category_options').update({
            name: name.trim().toUpperCase().replace(/\s+/g, '_')
        }).eq('tenant_id', tenantId).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    async delete(tenantId, id) {
        const { error } = await this.supabase.from('item_category_options').delete().eq('tenant_id', tenantId).eq('id', id);
        if (error) throw error;
        return {
            success: true
        };
    }
    async seed(tenantId) {
        const defaultCategories = [
            'RAW_MATERIAL',
            'COMPONENT',
            'SUBASSEMBLY',
            'FINISHED_GOODS',
            'CONSUMABLE',
            'PACKING_MATERIAL',
            'SPARE_PART'
        ];
        const { data: existing } = await this.supabase.from('item_category_options').select('name').eq('tenant_id', tenantId);
        const existingNames = existing?.map((c)=>c.name) || [];
        const toInsert = defaultCategories.filter((cat)=>!existingNames.includes(cat));
        if (toInsert.length > 0) {
            const { data, error } = await this.supabase.from('item_category_options').insert(toInsert.map((name)=>({
                    tenant_id: tenantId,
                    name
                }))).select();
            if (error) throw error;
            return data;
        }
        return [];
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
CategoriesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], CategoriesService);

//# sourceMappingURL=categories.service.js.map