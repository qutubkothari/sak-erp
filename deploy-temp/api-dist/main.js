"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _config = require("@nestjs/config");
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
const _compression = /*#__PURE__*/ _interop_require_default(require("compression"));
const _express = require("express");
const _fs = require("fs");
const _path = require("path");
const _appmodule = require("./app.module");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule, {
        logger: [
            'error',
            'warn',
            'log',
            'debug',
            'verbose'
        ]
    });
    const configService = app.get(_config.ConfigService);
    const port = configService.get('APP_PORT', 4000);
    // Body size limits (needed for base64 document uploads)
    const bodySizeLimit = configService.get('BODY_SIZE_LIMIT', '50mb');
    // Security
    app.use((0, _helmet.default)());
    // CORS - allow both localhost and production frontend
    const corsOrigins = configService.get('CORS_ORIGIN', 'http://localhost:3000').split(',');
    app.enableCors({
        origin: corsOrigins,
        credentials: true
    });
    // Compression
    app.use((0, _compression.default)());
    // Increase request payload limits (default is too small for base64 PDFs/images)
    app.use((0, _express.json)({
        limit: bodySizeLimit
    }));
    app.use((0, _express.urlencoded)({
        extended: true,
        limit: bodySizeLimit
    }));
    // Serve uploaded files (local EC2 storage)
    const uploadsRoot = configService.get('UPLOAD_ROOT_DIR') || (0, _path.resolve)(process.cwd(), '..', '..', 'uploads');
    (0, _fs.mkdirSync)(uploadsRoot, {
        recursive: true
    });
    app.use('/uploads', (0, _express.static)(uploadsRoot));
    // Global validation pipe
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true
        }
    }));
    // API prefix
    app.setGlobalPrefix('api/v1');
    // Swagger documentation
    const config = new _swagger.DocumentBuilder().setTitle('Saif Automations Manufacturing ERP API').setDescription('Comprehensive API for multi-tenant, multi-plant manufacturing ERP system').setVersion('1.0').addBearerAuth().addTag('Authentication').addTag('Tenants').addTag('Users').addTag('Purchase').addTag('Inventory').addTag('Production').addTag('Sales').addTag('Service').addTag('Workflow').build();
    const document = _swagger.SwaggerModule.createDocument(app, config);
    _swagger.SwaggerModule.setup('api/docs', app, document);
    // Bind to 0.0.0.0 for EC2 compatibility
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 API Server running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    console.log(`🎯 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();

//# sourceMappingURL=main.js.map