"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DocumentCategoriesService", {
    enumerable: true,
    get: function() {
        return DocumentCategoriesService;
    }
});
const _common = require("@nestjs/common");
const _supabasejs = require("@supabase/supabase-js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let DocumentCategoriesService = class DocumentCategoriesService {
    getDefaultCategories() {
        return [
            {
                code: 'GENERAL',
                name: 'General Documents',
                description: 'General purpose documents'
            },
            {
                code: 'CONTRACT',
                name: 'Contracts',
                description: 'Customer/vendor contracts and agreements'
            },
            {
                code: 'QUOTATION',
                name: 'Quotations',
                description: 'Quotations and pricing documents'
            },
            {
                code: 'PURCHASE_ORDER',
                name: 'Purchase Orders',
                description: 'Purchase orders and procurement documents'
            },
            {
                code: 'INVOICE',
                name: 'Invoices',
                description: 'Invoices and billing documents'
            },
            {
                code: 'DRAWING',
                name: 'Drawings',
                description: 'Engineering drawings and CAD exports'
            },
            {
                code: 'SPECIFICATION',
                name: 'Specifications',
                description: 'Technical specifications and datasheets'
            },
            {
                code: 'REPORT',
                name: 'Reports',
                description: 'Inspection reports, technical reports, summaries'
            },
            {
                code: 'QUALITY',
                name: 'Quality',
                description: 'QC, QA, certificates, compliance'
            },
            {
                code: 'HR',
                name: 'HR',
                description: 'Employee and HR related documents'
            }
        ];
    }
    async seedDefaultsForTenant(tenantId) {
        const defaults = this.getDefaultCategories();
        const rows = defaults.map((c)=>({
                tenant_id: tenantId,
                code: c.code,
                name: c.name,
                description: c.description,
                is_active: true
            }));
        // Best-effort: if rows already exist, unique constraint will prevent duplicates.
        const { error } = await this.supabase.from('document_categories').upsert(rows, {
            onConflict: 'tenant_id,code',
            ignoreDuplicates: true
        });
        if (error) throw new Error(error.message);
    }
    async create(req, createDto) {
        const tenantId = req.user.tenantId;
        const { data, error } = await this.supabase.from('document_categories').insert([
            {
                ...createDto,
                tenant_id: tenantId
            }
        ]).select().single();
        if (error) throw new Error(error.message);
        return data;
    }
    async findAll(req) {
        const tenantId = req.user.tenantId;
        const { data, error } = await this.supabase.from('document_categories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name');
        if (error) throw new Error(error.message);
        // If a tenant has no categories (fresh setup or missing seed), create defaults.
        if (!data || data.length === 0) {
            await this.seedDefaultsForTenant(tenantId);
            const { data: seeded, error: seededError } = await this.supabase.from('document_categories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name');
            if (seededError) throw new Error(seededError.message);
            return seeded || [];
        }
        return data;
    }
    async findOne(req, id) {
        const tenantId = req.user.tenantId;
        const { data, error } = await this.supabase.from('document_categories').select('*').eq('tenant_id', tenantId).eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    }
    async update(req, id, updateDto) {
        const tenantId = req.user.tenantId;
        const { data, error } = await this.supabase.from('document_categories').update(updateDto).eq('tenant_id', tenantId).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    }
    async delete(req, id) {
        const tenantId = req.user.tenantId;
        const { error } = await this.supabase.from('document_categories').delete().eq('tenant_id', tenantId).eq('id', id);
        if (error) throw new Error(error.message);
        return {
            message: 'Category deleted successfully'
        };
    }
    constructor(){
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
};
DocumentCategoriesService = _ts_decorate([
    (0, _common.Injectable)()
], DocumentCategoriesService);

//# sourceMappingURL=document-categories.service.js.map