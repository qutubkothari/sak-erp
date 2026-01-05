"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "StorageService", {
    enumerable: true,
    get: function() {
        return StorageService;
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
let StorageService = class StorageService {
    async uploadFile(bucket, path, buffer, contentType) {
        if (!this.isConfigured || !this.supabase) {
            throw new Error('Supabase storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
        }
        const { data, error } = await this.supabase.storage.from(bucket).upload(path, buffer, {
            contentType,
            upsert: true
        });
        if (error) throw error;
        const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
        return urlData.publicUrl;
    }
    async downloadFile(bucket, path) {
        if (!this.isConfigured || !this.supabase) {
            throw new Error('Supabase storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
        }
        const { data, error } = await this.supabase.storage.from(bucket).download(path);
        if (error) throw error;
        return Buffer.from(await data.arrayBuffer());
    }
    async deleteFile(bucket, path) {
        if (!this.isConfigured || !this.supabase) {
            throw new Error('Supabase storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
        }
        const { error } = await this.supabase.storage.from(bucket).remove([
            path
        ]);
        if (error) throw error;
    }
    constructor(configService){
        this.configService = configService;
        this.supabase = null;
        this.isConfigured = false;
        const supabaseUrl = this.configService.get('SUPABASE_URL', '');
        const supabaseKey = this.configService.get('SUPABASE_SERVICE_KEY', '');
        if (supabaseUrl && supabaseKey) {
            this.supabase = (0, _supabasejs.createClient)(supabaseUrl, supabaseKey);
            this.isConfigured = true;
        }
    }
};
StorageService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], StorageService);

//# sourceMappingURL=storage.service.js.map