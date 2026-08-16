import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../products/domain/product.repository.port';
import { Product } from '../../products/domain/product.entity';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepositoryPort,
  TransactionRecord,
} from '../domain/transaction.repository.port';
import {
  TransactionAmounts,
  generateTransactionReference,
} from '../domain/transaction.entity';
import { Result, ok, fail } from '../../../common/result';

export interface CreateTransactionInput {
  productId: string;
  quantity: number;
  customerId: string;
  deliveryId: string;
}

export type CreateTransactionError = 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  async execute(
    input: CreateTransactionInput,
  ): Promise<Result<TransactionRecord, CreateTransactionError>> {
    const productResult = await this.findProduct(input.productId);

    return productResult
      .andThen((product) => this.ensureStock(product, input.quantity))
      .then((stockResult) => stockResult.andThen((product) => this.persist(product, input)));
  }

  private async findProduct(
    productId: string,
  ): Promise<Result<Product, CreateTransactionError>> {
    const product = await this.productRepository.findById(productId);
    return product ? ok(product) : fail('PRODUCT_NOT_FOUND');
  }

  private ensureStock(
    product: Product,
    quantity: number,
  ): Result<Product, CreateTransactionError> {
    return product.hasStockFor(quantity) ? ok(product) : fail('INSUFFICIENT_STOCK');
  }

  private async persist(
    product: Product,
    input: CreateTransactionInput,
  ): Promise<Result<TransactionRecord, CreateTransactionError>> {
    const amounts = new TransactionAmounts(product.price, input.quantity);
    const reference = generateTransactionReference();

    const transaction = await this.transactionRepository.create({
      reference,
      productId: input.productId,
      customerId: input.customerId,
      deliveryId: input.deliveryId,
      quantity: input.quantity,
      productAmount: amounts.productAmount,
      baseFee: amounts.baseFee,
      deliveryFee: amounts.deliveryFee,
      totalAmount: amounts.totalAmount,
    });

    return ok(transaction);
  }
}
