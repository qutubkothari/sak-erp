import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Soft delete helper
   */
  async softDelete(model: string, where: any) {
    return (this as any)[model].update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Tenant-aware query helper
   */
  withTenant(tenantId: string) {
    return {
      where: { tenantId },
    };
  }
}
