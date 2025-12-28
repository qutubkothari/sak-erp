import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 4000);

  // Security
  app.use(helmet());
  
  // Parse CORS origins - support comma-separated values
  const corsOriginConfig = configService.get('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigins = corsOriginConfig.split(',').map((o: string) => o.trim());
  
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Compression
  app.use(compression());

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
