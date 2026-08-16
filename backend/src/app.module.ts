import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    // OWASP A04:2021 (Insecure Design) / API4: lack of resources & rate limiting.
    // 20 requests per 60s per IP as a sane default; tighten per-route if needed.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ProductsModule,
    CustomersModule,
    DeliveriesModule,
    TransactionsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
