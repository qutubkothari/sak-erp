"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VendorsService", {
    enumerable: true,
    get: function() {
        return VendorsService;
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
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let VendorsService = class VendorsService {
    async create(tenantId, data) {
        // Generate vendor code if not provided
        const code = data.code || await this.generateVendorCode(tenantId);
        const { data: vendor, error } = await this.supabase.from('vendors').insert({
            tenant_id: tenantId,
            code,
            name: data.name,
            legal_name: data.legalName || data.name,
            tax_id: data.taxId,
            category: data.category,
            rating: data.rating,
            payment_terms: data.paymentTerms,
            credit_limit: data.creditLimit,
            contact_person: data.contactPerson,
            email: data.email,
            phone: data.phone,
            address: data.address,
            is_active: data.isActive !== undefined ? data.isActive : true,
            metadata: data.metadata || {}
        }).select().single();
        if (error) throw new _common.BadRequestException(error.message);
        return vendor;
    }
    async findAll(tenantId, filters) {
        let query = this.supabase.from('vendors').select('*').eq('tenant_id', tenantId).order('created_at', {
            ascending: false
        });
        if (filters?.category) {
            query = query.eq('category', filters.category);
        }
        if (filters?.isActive !== undefined) {
            query = query.eq('is_active', filters.isActive);
        }
        if (filters?.search) {
            query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }
        const { data, error } = await query;
        if (error) throw new _common.BadRequestException(error.message);
        return data;
    }
    async findOne(tenantId, id) {
        const { data, error } = await this.supabase.from('vendors').select('*').eq('tenant_id', tenantId).eq('id', id).single();
        if (error) throw new _common.NotFoundException('Vendor not found');
        return data;
    }
    async update(tenantId, id, data) {
        const { error } = await this.supabase.from('vendors').update({
            name: data.name,
            legal_name: data.legalName,
            tax_id: data.taxId,
            category: data.category,
            rating: data.rating,
            payment_terms: data.paymentTerms,
            credit_limit: data.creditLimit,
            contact_person: data.contactPerson,
            email: data.email,
            phone: data.phone,
            address: data.address,
            is_active: data.isActive,
            metadata: data.metadata,
            updated_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('id', id);
        if (error) throw new _common.BadRequestException(error.message);
        return this.findOne(tenantId, id);
    }
    async delete(tenantId, id) {
        const { error } = await this.supabase.from('vendors').delete().eq('tenant_id', tenantId).eq('id', id);
        if (error) throw new _common.BadRequestException(error.message);
        return {
            message: 'Vendor deleted successfully'
        };
    }
    async generateVendorCode(tenantId) {
        const prefix = 'VEN';
        // Get the count of all vendors to generate a unique code
        const { count, error } = await this.supabase.from('vendors').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId);
        if (error) {
            // Fallback to timestamp-based code if count fails
            return `${prefix}${Date.now().toString().slice(-6)}`;
        }
        const nextNumber = (count || 0) + 1;
        return `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }
    constructor(){
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
};
VendorsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [])
], VendorsService);

//# sourceMappingURL=vendors.service.js.map