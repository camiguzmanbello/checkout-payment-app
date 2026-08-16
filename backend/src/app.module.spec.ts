import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma.service';
import { ProductsController } from './modules/products/infrastructure/products.controller';
import { CustomersController } from './modules/customers/customers.module';
import { DeliveriesController } from './modules/deliveries/deliveries.module';
import { TransactionsController } from './modules/transactions/infrastructure/transactions.controller';

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  afterAll(async () => moduleRef.close());

  it('wires the four feature modules', () => {
    expect(moduleRef.get(ProductsController, { strict: false })).toBeDefined();
    expect(moduleRef.get(CustomersController, { strict: false })).toBeDefined();
    expect(moduleRef.get(DeliveriesController, { strict: false })).toBeDefined();
    expect(
      moduleRef.get(TransactionsController, { strict: false }),
    ).toBeDefined();
  });

  // Rate limiting is a security control, so it must be global and not something
  // each controller has to remember to opt into. APP_GUARD is consumed by the
  // Nest runtime and never exposed in the injector, so the binding is read from
  // the module metadata instead.
  it('registers the throttler as a global guard', () => {
    const providers = Reflect.getMetadata('providers', AppModule);

    expect(providers).toContainEqual({
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    });
  });
});
