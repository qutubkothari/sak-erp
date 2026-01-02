import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded, static as serveStatic } from 'express';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 4000);

  // Body size limits (needed for base64 document uploads)
  const bodySizeLimit = configService.get<string>('BODY_SIZE_LIMIT', '50mb');

  // Security
  app.use(helmet());
  
  // CORS - allow both localhost and production frontend
  const corsOrigins = configService.get('CORS_ORIGIN', 'http://localhost:3000').split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Increase request payload limits (default is too small for base64 PDFs/images)
  app.use(json({ limit: bodySizeLimit }));
  app.use(urlencoded({ extended: true, limit: bodySizeLimit }));

  // Serve uploaded files (local EC2 storage)
  const uploadsRoot =
    configService.get<string>('UPLOAD_ROOT_DIR') ||
    resolve(process.cwd(), '..', '..', 'uploads');
  mkdirSync(uploadsRoot, { recursive: true });
  app.use('/uploads', serveStatic(uploadsRoot));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Saif Automations Manufacturing ERP API')
    .setDescription(
      'Comprehensive API for multi-tenant, multi-plant manufacturing ERP system',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Tenants')
    .addTag('Users')
    .addTag('Purchase')
    .addTag('Inventory')
    .addTag('Production')
    .addTag('Sales')
    .addTag('Service')
    .addTag('Workflow')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Bind to 0.0.0.0 for EC2 compatibility
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Server running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🎯 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
