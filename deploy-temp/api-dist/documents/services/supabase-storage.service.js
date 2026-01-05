"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SupabaseStorageService", {
    enumerable: true,
    get: function() {
        return SupabaseStorageService;
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
let SupabaseStorageService = class SupabaseStorageService {
    /**
   * Upload a file to Supabase Storage
   */ async uploadFile(file, entityType, entityId) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${entityType}/${entityId}/${timestamp}_${sanitizedFileName}`;
            // Upload to Supabase Storage
            const { data, error } = await this.supabase.storage.from(this.bucketName).upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });
            if (error) {
                this.logger.error(`Upload failed: ${error.message}`);
                throw new Error(`Failed to upload file: ${error.message}`);
            }
            this.logger.log(`File uploaded: ${filePath}`);
            return {
                path: filePath,
                // When the bucket is private, callers should use getSignedUrl() on-demand.
                url: ''
            };
        } catch (error) {
            this.logger.error(`Upload error: ${error.message}`);
            throw error;
        }
    }
    /**
   * Download a file from Supabase Storage
   */ async downloadFile(filePath) {
        try {
            const { data, error } = await this.supabase.storage.from(this.bucketName).download(filePath);
            if (error) {
                throw new Error(`Failed to download file: ${error.message}`);
            }
            // Convert Blob to Buffer
            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            this.logger.error(`Download error: ${error.message}`);
            throw error;
        }
    }
    /**
   * Get signed URL for temporary access
   */ async getSignedUrl(filePath, expiresIn = 3600) {
        try {
            const { data, error } = await this.supabase.storage.from(this.bucketName).createSignedUrl(filePath, expiresIn);
            if (error) {
                throw new Error(`Failed to create signed URL: ${error.message}`);
            }
            return data.signedUrl;
        } catch (error) {
            this.logger.error(`Signed URL error: ${error.message}`);
            throw error;
        }
    }
    /**
   * Delete a file from Supabase Storage
   */ async deleteFile(filePath) {
        try {
            const { error } = await this.supabase.storage.from(this.bucketName).remove([
                filePath
            ]);
            if (error) {
                throw new Error(`Failed to delete file: ${error.message}`);
            }
            this.logger.log(`File deleted: ${filePath}`);
        } catch (error) {
            this.logger.error(`Delete error: ${error.message}`);
            throw error;
        }
    }
    /**
   * List files for an entity
   */ async listFiles(entityType, entityId) {
        try {
            const prefix = `${entityType}/${entityId}/`;
            const { data, error } = await this.supabase.storage.from(this.bucketName).list(prefix);
            if (error) {
                throw new Error(`Failed to list files: ${error.message}`);
            }
            return data || [];
        } catch (error) {
            this.logger.error(`List files error: ${error.message}`);
            throw error;
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(SupabaseStorageService.name);
        this.bucketName = 'erp-documents';
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_SERVICE_KEY') || this.configService.get('SUPABASE_KEY');
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing (SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_KEY required)');
        }
        this.supabase = (0, _supabasejs.createClient)(supabaseUrl, supabaseKey);
    }
};
SupabaseStorageService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], SupabaseStorageService);

//# sourceMappingURL=supabase-storage.service.js.map