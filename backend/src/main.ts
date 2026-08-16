import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OWASP: secure HTTP headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
  app.use(helmet());

  // OWASP A05:2021 (Security Misconfiguration): restrict CORS to a known origin
  // instead of the wildcard default — never allow '*' with credentials.
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  // OWASP A03:2021 (Injection) / mass assignment: strip unknown fields,
  // reject requests that send fields not declared in the DTO.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // OWASP A09:2021: never leak stack traces to clients
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Checkout API')
    .setDescription('Product checkout with card payment onboarding')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
