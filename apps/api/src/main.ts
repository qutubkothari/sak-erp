import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
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
  const corsOriginEnv = configService.get<string>('CORS_ORIGIN');
  const corsOrigins = (corsOriginEnv || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // If CORS_ORIGIN is not configured, reflect the request origin.
  // This avoids production breakage when deploying to a new host/IP.
  // For tighter security in production, set CORS_ORIGIN explicitly.
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Increase request payload limits (default is too small for base64 PDFs/images)
  app.use(json({ limit: bodySizeLimit }));
  app.use(urlencoded({ extended: true, limit: bodySizeLimit }));

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

  await app.listen(port);
  console.log(`🚀 API Server running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🎯 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
