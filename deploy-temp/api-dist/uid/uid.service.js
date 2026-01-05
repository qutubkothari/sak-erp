"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UidService", {
    enumerable: true,
    get: function() {
        return UidService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../prisma/prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UidService = class UidService {
    /**
   * Generate a unique UID with format:
   * UID-{TENANT}-{PLANT}-{TYPE}-{SEQUENCE}-{CHECKSUM}
   * Example: UID-SAIF-KOL-RM-000001-A7
   */ async generateUid(config) {
        const { tenantCode, plantCode, entityType, sequence } = config;
        // Get next sequence number if not provided
        const seq = sequence || await this.getNextSequence(tenantCode, plantCode, entityType);
        // Format sequence with leading zeros (6 digits)
        const seqStr = seq.toString().padStart(6, '0');
        // Generate checksum (simple 2-char hash for validation)
        const checksum = this.generateChecksum(`${tenantCode}${plantCode}${entityType}${seqStr}`);
        const uid = `UID-${tenantCode}-${plantCode}-${entityType}-${seqStr}-${checksum}`;
        return uid;
    }
    /**
   * Get next sequence number for entity type
   */ async getNextSequence(tenantCode, plantCode, entityType) {
        // In production, use atomic counter in Redis
        // For now, count from database
        const count = await this.prisma.uidRegistry.count({
            where: {
                uid: {
                    startsWith: `UID-${tenantCode}-${plantCode}-${entityType}`
                }
            }
        });
        return count + 1;
    }
    /**
   * Generate 2-character checksum
   */ generateChecksum(input) {
        let hash = 0;
        for(let i = 0; i < input.length; i++){
            hash = (hash << 5) - hash + input.charCodeAt(i);
            hash = hash & hash;
        }
        const checksum = Math.abs(hash).toString(36).toUpperCase().substring(0, 2);
        return checksum.padEnd(2, '0');
    }
    /**
   * Validate UID format and checksum
   */ validateUid(uid) {
        const uidPattern = /^UID-([A-Z0-9]{2,4})-([A-Z0-9]{2,3})-([A-Z0-9]{2})-(\d{6})-([A-Z0-9]{2})$/;
        const match = uid.match(uidPattern);
        if (!match) return false;
        const [, tenant, plant, type, seq, checksum] = match;
        const expectedChecksum = this.generateChecksum(`${tenant}${plant}${type}${seq}`);
        return checksum === expectedChecksum;
    }
    /**
   * Track UID lifecycle event
   */ async trackLifecycleEvent(uid, stage, reference, location, metadata) {
        const uidRecord = await this.prisma.uidRegistry.findUnique({
            where: {
                uid
            }
        });
        if (!uidRecord) {
            throw new Error(`UID ${uid} not found`);
        }
        const lifecycle = Array.isArray(uidRecord.lifecycle) ? uidRecord.lifecycle : [];
        lifecycle.push({
            stage,
            timestamp: new Date().toISOString(),
            reference,
            location,
            metadata
        });
        await this.prisma.uidRegistry.update({
            where: {
                uid
            },
            data: {
                lifecycle,
                location,
                updatedAt: new Date()
            }
        });
    }
    /**
   * Get all UIDs with filtering options
   */ async getAllUids(status, entityType, itemId) {
        const where = {};
        if (status) {
            where.status = status;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        if (itemId) {
            where.entityId = itemId;
        }
        const uids = await this.prisma.uidRegistry.findMany({
            where,
            select: {
                uid: true,
                entityType: true,
                entityId: true,
                status: true,
                location: true,
                batchNumber: true,
                qualityStatus: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 1000
        });
        return uids;
    }
    /**
   * Get UID details with vendor and item information for quality inspection
   */ async getUidDetails(uid) {
        const uidRecord = await this.prisma.uidRegistry.findUnique({
            where: {
                uid
            }
        });
        if (!uidRecord) {
            throw new Error(`UID ${uid} not found`);
        }
        // Fetch item details
        let itemDetails = null;
        if (uidRecord.entityId) {
            itemDetails = await this.prisma.item.findUnique({
                where: {
                    id: uidRecord.entityId
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    description: true
                }
            });
        }
        // Fetch vendor details
        let vendorDetails = null;
        if (uidRecord.supplierId) {
            vendorDetails = await this.prisma.vendor.findUnique({
                where: {
                    id: uidRecord.supplierId
                },
                select: {
                    id: true,
                    name: true,
                    code: true
                }
            });
        }
        // Return complete UID information for quality inspection
        return {
            uid: uidRecord.uid,
            grnId: uidRecord.grnId,
            itemId: uidRecord.entityId,
            itemName: itemDetails?.name || '',
            itemCode: itemDetails?.code || '',
            vendorId: uidRecord.supplierId,
            vendorName: vendorDetails?.name || '',
            vendorCode: vendorDetails?.code || '',
            batchNumber: uidRecord.batchNumber || '',
            lotNumber: '',
            entityType: uidRecord.entityType,
            status: uidRecord.status,
            location: uidRecord.location,
            assemblyLevel: uidRecord.assemblyLevel,
            parentUids: uidRecord.parentUids,
            childUids: uidRecord.childUids,
            qualityStatus: uidRecord.qualityStatus,
            createdAt: uidRecord.createdAt
        };
    }
    /**
   * Get UID history/traceability
   */ async getUidHistory(uid) {
        const uidRecord = await this.prisma.uidRegistry.findUnique({
            where: {
                uid
            }
        });
        if (!uidRecord) {
            throw new Error(`UID ${uid} not found`);
        }
        return {
            uid: uidRecord.uid,
            entityType: uidRecord.entityType,
            status: uidRecord.status,
            currentLocation: uidRecord.location,
            lifecycle: uidRecord.lifecycle,
            metadata: uidRecord.metadata,
            createdAt: uidRecord.createdAt
        };
    }
    /**
   * Update client part number for UID
   */ async updatePartNumber(uid, clientPartNumber, assignedBy) {
        const uidRecord = await this.prisma.uidRegistry.findUnique({
            where: {
                uid
            }
        });
        if (!uidRecord) {
            throw new Error(`UID ${uid} not found`);
        }
    // Note: Requires database migration to add client_part_number field
    // Temporarily commented out until schema is updated
    // await this.prisma.uidRegistry.update({
    //   where: { uid },
    //   data: {
    //     clientPartNumber,
    //     partNumberAssignedAt: new Date(),
    //     partNumberAssignedBy: assignedBy,
    //     updatedAt: new Date(),
    //   },
    // });
    }
    /**
   * Search UIDs by part number
   */ async searchByPartNumber(partNumber) {
        // Note: Requires database migration to add client_part_number field
        // Temporarily return empty array until schema is updated
        return [];
    // const uids = await this.prisma.uidRegistry.findMany({
    //   where: {
    //     clientPartNumber: {
    //       contains: partNumber,
    //       mode: 'insensitive',
    //     },
    //   },
    //   select: {
    //     uid: true,
    //     clientPartNumber: true,
    //     entityType: true,
    //     entityId: true,
    //     status: true,
    //     location: true,
    //     createdAt: true,
    //   },
    //   orderBy: {
    //     createdAt: 'desc',
    //   },
    // });
    // return uids;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
UidService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], UidService);

//# sourceMappingURL=uid.service.js.map