"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _throttler = require("@nestjs/throttler");
const _bull = require("@nestjs/bull");
const _schedule = require("@nestjs/schedule");
const _core = require("@nestjs/core");
const _prismamodule = require("./prisma/prisma.module");
const _migrationcontroller = require("./migration.controller");
const _migrationservice = require("./migration.service");
const _authmodule = require("./auth/auth.module");
const _jwtauthguard = require("./auth/guards/jwt-auth.guard");
const _rolesguard = require("./auth/guards/roles.guard");
const _tenantmodule = require("./tenant/tenant.module");
const _usermodule = require("./user/user.module");
const _purchasemodule = require("./purchase/purchase.module");
const _inventorymodule = require("./inventory/inventory.module");
const _itemsmodule = require("./items/items.module");
const _categoriesmodule = require("./categories/categories.module");
const _productionmodule = require("./production/production.module");
const _qualitymodule = require("./quality/quality.module");
const _salesmodule = require("./sales/sales.module");
const _servicemodule = require("./service/service.module");
const _bommodule = require("./bom/bom.module");
const _documentsmodule = require("./documents/documents.module");
const _hrmodule = require("./hr/hr.module");
const _dashboardmodule = require("./dashboard/dashboard.module");
const _workflowmodule = require("./workflow/workflow.module");
const _uidmodule = require("./uid/uid.module");
const _notificationmodule = require("./notification/notification.module");
const _auditmodule = require("./audit/audit.module");
const _emailmodule = require("./email/email.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            // Configuration
            _config.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    '.env.local',
                    '.env'
                ]
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
            _throttler.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100
                }
            ]),
            // Job Queue
            _bull.BullModule.forRoot({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD
                }
            }),
            // Scheduled Jobs
            _schedule.ScheduleModule.forRoot(),
            // Core
            _prismamodule.PrismaModule,
            _authmodule.AuthModule,
            _tenantmodule.TenantModule,
            _usermodule.UserModule,
            // Business
            _purchasemodule.PurchaseModule,
            _inventorymodule.InventoryModule,
            _itemsmodule.ItemsModule,
            _categoriesmodule.CategoriesModule,
            _productionmodule.ProductionModule,
            _qualitymodule.QualityModule,
            _salesmodule.SalesModule,
            _servicemodule.ServiceModule,
            _bommodule.BomModule,
            _hrmodule.HrModule,
            _documentsmodule.DocumentsModule,
            _dashboardmodule.DashboardModule,
            // Support
            _workflowmodule.WorkflowModule,
            _uidmodule.UidModule,
            _notificationmodule.NotificationModule,
            _auditmodule.AuditModule,
            _emailmodule.EmailModule
        ],
        controllers: [
            _migrationcontroller.MigrationController
        ],
        providers: [
            _migrationservice.MigrationService,
            {
                provide: _core.APP_GUARD,
                useClass: _jwtauthguard.JwtAuthGuard
            },
            {
                provide: _core.APP_GUARD,
                useClass: _rolesguard.RolesGuard
            }
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map