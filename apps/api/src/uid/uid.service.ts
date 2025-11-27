import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

interface UidConfig {
  tenantCode: string;
  plantCode: string;
  entityType: string;
  sequence?: number;
}

@Injectable()
export class UidService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a unique UID with format:
   * UID-{TENANT}-{PLANT}-{TYPE}-{SEQUENCE}-{CHECKSUM}
   * Example: UID-SAIF-KOL-RM-000001-A7
   */
  async generateUid(config: UidConfig): Promise<string> {
    const { tenantCode, plantCode, entityType, sequence } = config;

    // Get next sequence number if not provided
    const seq = sequence || (await this.getNextSequence(tenantCode, plantCode, entityType));

    // Format sequence with leading zeros (6 digits)
    const seqStr = seq.toString().padStart(6, '0');

    // Generate checksum (simple 2-char hash for validation)
    const checksum = this.generateChecksum(`${tenantCode}${plantCode}${entityType}${seqStr}`);

    const uid = `UID-${tenantCode}-${plantCode}-${entityType}-${seqStr}-${checksum}`;

    return uid;
  }

  /**
   * Get next sequence number for entity type
   */
  private async getNextSequence(tenantCode: string, plantCode: string, entityType: string): Promise<number> {
    // In production, use atomic counter in Redis
    // For now, count from database
    const count = await this.prisma.uidRegistry.count({
      where: {
        uid: {
          startsWith: `UID-${tenantCode}-${plantCode}-${entityType}`,
        },
      },
    });
    return count + 1;
  }

  /**
   * Generate 2-character checksum
   */
  private generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash = hash & hash;
    }
    const checksum = Math.abs(hash).toString(36).toUpperCase().substring(0, 2);
    return checksum.padEnd(2, '0');
  }

  /**
   * Validate UID format and checksum
   */
  validateUid(uid: string): boolean {
    const uidPattern = /^UID-([A-Z0-9]{2,4})-([A-Z0-9]{2,3})-([A-Z0-9]{2})-(\d{6})-([A-Z0-9]{2})$/;
    const match = uid.match(uidPattern);

    if (!match) return false;

    const [, tenant, plant, type, seq, checksum] = match;
    const expectedChecksum = this.generateChecksum(`${tenant}${plant}${type}${seq}`);

    return checksum === expectedChecksum;
  }

  /**
   * Track UID lifecycle event
   */
  async trackLifecycleEvent(
    uid: string,
    stage: string,
    reference: string,
    location: string,
    metadata?: any,
  ): Promise<void> {
    const uidRecord = await this.prisma.uidRegistry.findUnique({
      where: { uid },
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
      metadata,
    });

    await this.prisma.uidRegistry.update({
      where: { uid },
      data: {
        lifecycle,
        location,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get UID history/traceability
   */
  async getUidHistory(uid: string) {
    const uidRecord = await this.prisma.uidRegistry.findUnique({
      where: { uid },
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
      createdAt: uidRecord.createdAt,
    };
  }
}
