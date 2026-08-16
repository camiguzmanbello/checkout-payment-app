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
    .setDescription(
      [
        'API of a card checkout: a catalogue, a transaction and a charge against',
        'the payment provider.',
        '',
        '**The flow, end to end**',
        '1. `GET /products` — the catalogue with its stock.',
        '2. `POST /customers` and `POST /deliveries` — who buys and where it ships.',
        '3. `POST /transactions` — checks stock, computes the fees and leaves the',
        '   transaction as `PENDING`.',
        '4. `POST /transactions/:id/pay` — tokenizes the card, signs the charge,',
        '   waits for the provider to settle it and decrements stock only once it',
        '   is approved. It answers in seconds, not milliseconds, because of that',
        '   wait.',
        '5. `GET /transactions/:id` — the resulting status.',
        '',
        '**Statuses**: `PENDING` while it has not been charged, `APPROVED` once it',
        'is (the only one that touches stock), `DECLINED` if the provider rejects',
        'the card, and `ERROR` if the charge could not be completed or was still',
        'settling when the wait ran out. The provider transaction id is stored even',
        'then, so the charge can always be reconciled.',
        '',
        '**Card data** never reaches a log, the database or a response body: it',
        'only travels through memory towards the tokenization call.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .setContact(
      'María Camila Guzmán Bello',
      'https://github.com/camiguzmanbello/checkout-payment-app',
      '',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('products', 'Catalogue and stock')
    .addTag('customers', 'Who is buying')
    .addTag('deliveries', 'Where the order ships')
    .addTag('transactions', 'Creating the transaction and charging the card')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Checkout API — María Camila Guzmán Bello',
    swaggerOptions: { docExpansion: 'list', defaultModelsExpandDepth: 0 },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
