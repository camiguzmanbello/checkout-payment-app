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

export type PayTransactionError = 'TRANSACTION_NOT_FOUND' | 'INSUFFICIENT_STOCK';

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

  // El stock se reserva antes de tocar la pasarela. Descontarlo al final, sólo
  // si el cobro salía aprobado, dejaba cobrar una unidad que otra compra ya se
  // había llevado mientras tanto: se le sacaba la plata a alguien por algo que
  // no había. Reservar primero convierte eso en un rechazo sin cobro.
  async execute(
    input: PayTransactionInput,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const transactionResult = await this.findTransaction(input.transactionId);

    return transactionResult
      .andThen((transaction) => this.reserveStock(transaction))
      .then((reserved) =>
        reserved.andThen((transaction) => this.chargeReserved(transaction, input)),
      );
  }

  private async findTransaction(
    id: string,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const transaction = await this.transactionRepository.findById(id);
    return transaction ? ok(transaction) : fail('TRANSACTION_NOT_FOUND');
  }

  private async reserveStock(
    transaction: TransactionRecord,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    const reserved = await this.productRepository.reserveStock(
      transaction.productId,
      transaction.quantity,
    );
    return reserved ? ok(transaction) : fail('INSUFFICIENT_STOCK');
  }

  private async chargeReserved(
    transaction: TransactionRecord,
    input: PayTransactionInput,
  ): Promise<Result<TransactionRecord, PayTransactionError>> {
    // Desde acá el stock ya está retenido, así que cualquier salida que no sea
    // un cobro aprobado tiene que devolverlo — incluida una excepción que se
    // escape de la actualización en base. El `finally` es lo que garantiza que
    // no quede una unidad retenida por una transacción que nunca se cobró, y
    // que la devolución ocurra una sola vez.
    let charged = false;

    try {
      const chargeResult = await this.charge(transaction, input.card, input.customerEmail);

      const updated = await this.transactionRepository.updateResult(
        transaction.id,
        chargeResult.status,
        chargeResult.gatewayTransactionId,
        chargeResult.status,
      );

      charged = chargeResult.status === 'APPROVED';

      return ok(updated);
    } finally {
      if (!charged) {
        await this.productRepository.releaseStock(
          transaction.productId,
          transaction.quantity,
        );
      }
    }
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
