"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DocumentApprovalsService", {
    enumerable: true,
    get: function() {
        return DocumentApprovalsService;
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
let DocumentApprovalsService = class DocumentApprovalsService {
    async findAllByDocument(req, documentId) {
        const tenantId = req.user.tenantId;
        const { data, error } = await this.supabase.from('document_approvals').select(`
        *,
        approver_user:users!document_approvals_approver_user_id_fkey(id, first_name, last_name, email),
        approver_role:roles(id, name)
      `).eq('tenant_id', tenantId).eq('document_id', documentId).order('approval_sequence');
        if (error) throw new Error(error.message);
        return data;
    }
    async findPendingForUser(req) {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const { data, error } = await this.supabase.from('document_approvals').select(`
        *,
        document:documents(id, document_number, title, document_type, current_revision, file_url)
      `).eq('tenant_id', tenantId).eq('approver_user_id', userId).eq('status', 'PENDING').order('due_date', {
            ascending: true
        });
        if (error) throw new Error(error.message);
        return data;
    }
    constructor(){
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
};
DocumentApprovalsService = _ts_decorate([
    (0, _common.Injectable)()
], DocumentApprovalsService);

//# sourceMappingURL=document-approvals.service.js.map