import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsModule } from './transactions.module';
import { PrismaService } from '../../common/prisma.service';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { TransactionPrismaRepository } from './infrastructure/transaction.prisma-repository';
import { TransactionsController } from './infrastructure/transactions.controller';
import { CreateTransactionUseCase } from './application/create-transaction.usecase';
import { PayTransactionUseCase } from './application/pay-transaction.usecase';
import { PRODUCT_REPOSITORY } from '../products/domain/product.repository.port';
import { PAYMENT_GATEWAY } from '../payment-gateway/payment-gateway.port';

describe('TransactionsModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [TransactionsModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  afterAll(async () => moduleRef.close());

  it('resolves the controller with both use cases injected', () => {
    expect(moduleRef.get(TransactionsController)).toBeInstanceOf(
      TransactionsController,
    );
    expect(moduleRef.get(CreateTransactionUseCase)).toBeInstanceOf(
      CreateTransactionUseCase,
    );
    expect(moduleRef.get(PayTransactionUseCase)).toBeInstanceOf(
      PayTransactionUseCase,
    );
  });

  it('binds the repository port to the Prisma adapter', () => {
    expect(moduleRef.get(TRANSACTION_REPOSITORY)).toBeInstanceOf(
      TransactionPrismaRepository,
    );
  });

  // Paying needs stock and the gateway, both of them owned by other modules.
  it('imports the product repository and the payment gateway', () => {
    expect(moduleRef.get(PRODUCT_REPOSITORY, { strict: false })).toBeDefined();
    expect(moduleRef.get(PAYMENT_GATEWAY, { strict: false })).toBeDefined();
  });
});
