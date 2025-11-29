import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

// Core Modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';

// Business Modules
import { PurchaseModule } from './purchase/purchase.module';
import { InventoryModule } from './inventory/inventory.module';
import { ItemsModule } from './items/items.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductionModule } from './production/production.module';
import { QualityModule } from './quality/quality.module';
import { SalesModule } from './sales/sales.module';
import { ServiceModule } from './service/service.module';
import { BomModule } from './bom/bom.module';
import { DocumentsModule } from './documents/documents.module';
import { HrModule } from './hr/hr.module';
import { DashboardModule } from './dashboard/dashboard.module';

// Support Modules
import { WorkflowModule } from './workflow/workflow.module';
import { UidModule } from './uid/uid.module';
import { NotificationModule } from './notification/notification.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // GraphQL - Disabled for now (using REST API)
    // GraphQLModule.forRoot<ApolloDriverConfig>({
    //   driver: ApolloDriver,
    //   autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    //   sortSchema: true,
    //   playground: true,
    //   context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
    // }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Job Queue
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Core
    PrismaModule,
    AuthModule,
    TenantModule,
    UserModule,

    // Business
    PurchaseModule,
    InventoryModule,
    ItemsModule,
    CategoriesModule,
    ProductionModule,
    QualityModule,
    SalesModule,
    ServiceModule,
    BomModule,
    HrModule,
    DocumentsModule,
    DashboardModule,

    // Support
    WorkflowModule,
    UidModule,
    NotificationModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
