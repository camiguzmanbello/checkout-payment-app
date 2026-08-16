import { Module } from '@nestjs/common';
import { TransactionsController } from './infrastructure/transactions.controller';
import { TransactionPrismaRepository } from './infrastructure/transaction.prisma-repository';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { CreateTransactionUseCase } from './application/create-transaction.usecase';
import { PayTransactionUseCase } from './application/pay-transaction.usecase';
import { PrismaService } from '../../common/prisma.service';
import { ProductsModule } from '../products/products.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';

@Module({
  imports: [ProductsModule, PaymentGatewayModule],
  controllers: [TransactionsController],
  providers: [
    PrismaService,
    CreateTransactionUseCase,
    PayTransactionUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionPrismaRepository },
  ],
})
export class TransactionsModule {}
