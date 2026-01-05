"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailAttachmentService", {
    enumerable: true,
    get: function() {
        return EmailAttachmentService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _databaseservice = require("../common/database.service");
const _storageservice = require("../common/storage.service");
const _pdfparse = /*#__PURE__*/ _interop_require_default(require("pdf-parse"));
const _xlsx = /*#__PURE__*/ _interop_require_wildcard(require("xlsx"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
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
let EmailAttachmentService = class EmailAttachmentService {
    /**
   * Save email attachment to storage and database
   */ async saveAttachment(emailId, filename, contentType, buffer) {
        try {
            // Generate unique storage path
            const timestamp = Date.now();
            const sanitizedFilename = this.sanitizeFilename(filename);
            const storagePath = `email-attachments/${emailId}/${timestamp}-${sanitizedFilename}`;
            // Upload to Supabase storage
            const storageUrl = await this.storageService.uploadFile('email-attachments', storagePath, buffer, contentType);
            // Save to database
            const result = await this.databaseService.executeQuery(`INSERT INTO email_attachments (
          email_id, filename, content_type, size_bytes, 
          storage_path, storage_url
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`, [
                emailId,
                filename,
                contentType,
                buffer.length,
                storagePath,
                storageUrl
            ]);
            const attachmentId = result.rows[0].id;
            this.logger.log(`Saved attachment ${filename} for email ${emailId}, ID: ${attachmentId}`);
            // Parse attachment if applicable
            await this.parseAttachment(attachmentId, buffer, contentType);
            return attachmentId;
        } catch (error) {
            this.logger.error(`Error saving attachment ${filename}:`, error);
            throw error;
        }
    }
    /**
   * Parse attachment content (PDF, Excel, images, etc.)
   */ async parseAttachment(attachmentId, buffer, contentType) {
        try {
            let extractedText = '';
            let extractedData = null;
            let parsedType = 'unknown';
            // Parse based on content type
            if (contentType.includes('pdf') || contentType === 'application/pdf') {
                const parsed = await this.parsePDF(buffer);
                extractedText = parsed.text;
                parsedType = 'pdf';
            } else if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('vnd.ms-excel') || contentType.includes('vnd.openxmlformats-officedocument.spreadsheetml')) {
                const parsed = await this.parseExcel(buffer);
                extractedData = parsed;
                parsedType = 'excel';
            } else if (contentType.includes('image')) {
                parsedType = 'image';
                // TODO: Implement OCR for images using Tesseract or similar
                this.logger.log('Image OCR not yet implemented');
            } else if (contentType.includes('text')) {
                extractedText = buffer.toString('utf-8');
                parsedType = 'text';
            }
            // Update database with parsed data
            if (extractedText || extractedData) {
                await this.databaseService.executeQuery(`UPDATE email_attachments 
           SET is_parsed = true, 
               parsed_type = $1, 
               extracted_text = $2, 
               extracted_data = $3
           WHERE id = $4`, [
                    parsedType,
                    extractedText || null,
                    extractedData ? JSON.stringify(extractedData) : null,
                    attachmentId
                ]);
                this.logger.log(`Parsed attachment ${attachmentId} as ${parsedType}`);
            }
        } catch (error) {
            this.logger.error(`Error parsing attachment ${attachmentId}:`, error);
        // Don't throw - parsing failure shouldn't prevent attachment save
        }
    }
    /**
   * Parse PDF file
   */ async parsePDF(buffer) {
        try {
            const data = await (0, _pdfparse.default)(buffer);
            return {
                text: data.text,
                pages: data.numpages,
                info: data.info
            };
        } catch (error) {
            this.logger.error('Error parsing PDF:', error);
            throw error;
        }
    }
    /**
   * Parse Excel file
   */ async parseExcel(buffer) {
        try {
            const workbook = _xlsx.read(buffer, {
                type: 'buffer'
            });
            const result = {};
            workbook.SheetNames.forEach((sheetName)=>{
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = _xlsx.utils.sheet_to_json(worksheet);
                result[sheetName] = jsonData;
            });
            return result;
        } catch (error) {
            this.logger.error('Error parsing Excel:', error);
            throw error;
        }
    }
    /**
   * Sanitize filename for storage
   */ sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_').toLowerCase();
    }
    /**
   * Get attachment by ID
   */ async getAttachment(attachmentId) {
        try {
            const result = await this.databaseService.executeQuery(`SELECT id, email_id, filename, content_type, size_bytes, 
                storage_path, storage_url, is_parsed, parsed_type,
                extracted_text, extracted_data
         FROM email_attachments 
         WHERE id = $1`, [
                attachmentId
            ]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                emailId: row.email_id,
                filename: row.filename,
                contentType: row.content_type,
                sizeBytes: row.size_bytes,
                storagePath: row.storage_path,
                storageUrl: row.storage_url,
                isParsed: row.is_parsed,
                extractedText: row.extracted_text,
                extractedData: row.extracted_data
            };
        } catch (error) {
            this.logger.error(`Error getting attachment ${attachmentId}:`, error);
            throw error;
        }
    }
    /**
   * Get all attachments for an email
   */ async getEmailAttachments(emailId) {
        try {
            const result = await this.databaseService.executeQuery(`SELECT id, email_id, filename, content_type, size_bytes, 
                storage_path, storage_url, is_parsed, parsed_type,
                extracted_text, extracted_data
         FROM email_attachments 
         WHERE email_id = $1
         ORDER BY id`, [
                emailId
            ]);
            return result.rows.map((row)=>({
                    id: row.id,
                    emailId: row.email_id,
                    filename: row.filename,
                    contentType: row.content_type,
                    sizeBytes: row.size_bytes,
                    storagePath: row.storage_path,
                    storageUrl: row.storage_url,
                    isParsed: row.is_parsed,
                    extractedText: row.extracted_text,
                    extractedData: row.extracted_data
                }));
        } catch (error) {
            this.logger.error(`Error getting attachments for email ${emailId}:`, error);
            throw error;
        }
    }
    /**
   * Download attachment from storage
   */ async downloadAttachment(attachmentId) {
        try {
            const attachment = await this.getAttachment(attachmentId);
            if (!attachment) {
                throw new Error(`Attachment ${attachmentId} not found`);
            }
            // Download from Supabase storage
            const buffer = await this.storageService.downloadFile('email-attachments', attachment.storagePath);
            return buffer;
        } catch (error) {
            this.logger.error(`Error downloading attachment ${attachmentId}:`, error);
            throw error;
        }
    }
    /**
   * Search attachments by content (extracted text)
   */ async searchAttachments(searchTerm, limit = 50) {
        try {
            const result = await this.databaseService.executeQuery(`SELECT id, email_id, filename, content_type, size_bytes, 
                storage_path, storage_url, is_parsed, parsed_type,
                extracted_text, extracted_data
         FROM email_attachments 
         WHERE is_parsed = true 
           AND (extracted_text ILIKE $1 OR filename ILIKE $1)
         ORDER BY id DESC
         LIMIT $2`, [
                `%${searchTerm}%`,
                limit
            ]);
            return result.rows.map((row)=>({
                    id: row.id,
                    emailId: row.email_id,
                    filename: row.filename,
                    contentType: row.content_type,
                    sizeBytes: row.size_bytes,
                    storagePath: row.storage_path,
                    storageUrl: row.storage_url,
                    isParsed: row.is_parsed,
                    extractedText: row.extracted_text,
                    extractedData: row.extracted_data
                }));
        } catch (error) {
            this.logger.error('Error searching attachments:', error);
            throw error;
        }
    }
    /**
   * Extract invoice data from PDF attachment
   */ async extractInvoiceData(attachmentId) {
        try {
            const attachment = await this.getAttachment(attachmentId);
            if (!attachment || !attachment.extractedText) {
                throw new Error('Attachment not found or not parsed');
            }
            const text = attachment.extractedText;
            // Extract common invoice fields using regex
            const invoiceData = {
                invoiceNumber: this.extractPattern(text, /(invoice|inv)[#:\s]*([A-Z0-9-]+)/i),
                date: this.extractPattern(text, /date[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i),
                amount: this.extractPattern(text, /total[:\s]*\$?(\d+[,.]?\d*)/i),
                poNumber: this.extractPattern(text, /p\.?o\.?[#:\s]*([A-Z0-9-]+)/i),
                vendor: this.extractPattern(text, /from[:\s]*([^\n]+)/i)
            };
            return invoiceData;
        } catch (error) {
            this.logger.error(`Error extracting invoice data from ${attachmentId}:`, error);
            throw error;
        }
    }
    /**
   * Helper to extract pattern from text
   */ extractPattern(text, pattern) {
        const match = text.match(pattern);
        return match ? match[match.length - 1].trim() : null;
    }
    /**
   * Delete attachment
   */ async deleteAttachment(attachmentId) {
        try {
            const attachment = await this.getAttachment(attachmentId);
            if (!attachment) {
                throw new Error(`Attachment ${attachmentId} not found`);
            }
            // Delete from storage
            await this.storageService.deleteFile('email-attachments', attachment.storagePath);
            // Delete from database
            await this.databaseService.executeQuery('DELETE FROM email_attachments WHERE id = $1', [
                attachmentId
            ]);
            this.logger.log(`Deleted attachment ${attachmentId}`);
        } catch (error) {
            this.logger.error(`Error deleting attachment ${attachmentId}:`, error);
            throw error;
        }
    }
    constructor(configService, databaseService, storageService){
        this.configService = configService;
        this.databaseService = databaseService;
        this.storageService = storageService;
        this.logger = new _common.Logger(EmailAttachmentService.name);
    }
};
EmailAttachmentService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _databaseservice.DatabaseService === "undefined" ? Object : _databaseservice.DatabaseService,
        typeof _storageservice.StorageService === "undefined" ? Object : _storageservice.StorageService
    ])
], EmailAttachmentService);

//# sourceMappingURL=email-attachment.service.js.map