import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepositoryPort,
  TransactionRecord,
} from '../domain/transaction.repository.port';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../products/domain/product.repository.port';
import {
  PAYMENT_GATEWAY,
  PaymentGatewayPort,
  CardData,
  ChargeResult,
} from '../../payment-gateway/payment-gateway.port';
import { Result, ok, fail } from '../../../common/result';

export interface PayTransactionInput {
  transactionId: string;
  card: CardData;
  customerEmail: string;
}

export type PayTransactionError = 'TRANSACTION_NOT_FOUND';

@Injectable()
export class PayTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(
    input: PayTransactionInput,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const transactionResult = await this.findTransaction(input.transactionId);

    return transactionResult.andThen((transaction) =>
      this.chargeAndUpdate(transaction, input),
    );
  }

  private async findTransaction(
    id: string,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const transaction = await this.transactionRepository.findById(id);
    return transaction ? ok(transaction) : fail('TRANSACTION_NOT_FOUND');
  }

  private async chargeAndUpdate(
    transaction: TransactionRecord,
    input: PayTransactionInput,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const chargeResult = await this.charge(transaction, input.card, input.customerEmail);

    const updated = await this.transactionRepository.updateResult(
      transaction.id,
      chargeResult.status,
      chargeResult.gatewayTransactionId,
      chargeResult.status,
    );

    if (chargeResult.status === 'APPROVED') {
      await this.productRepository.decreaseStock(transaction.productId, transaction.quantity);
    }

    return ok(updated);
  }

  private async charge(
    transaction: TransactionRecord,
    card: CardData,
    customerEmail: string,
  ): Promise<ChargeResult> {
    try {
      const cardToken = await this.paymentGateway.tokenizeCard(card);
      return await this.paymentGateway.createTransaction({
        amountInCents: transaction.totalAmount,
        reference: transaction.reference,
        cardToken,
        customerEmail,
      });
    } catch (error) {
      return { gatewayTransactionId: '', status: 'ERROR', raw: error };
    }
  }
}
