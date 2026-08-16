import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import {
  CreateTransactionData,
  TransactionRepositoryPort,
} from '../domain/transaction.repository.port';

@Injectable()
export class TransactionPrismaRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTransactionData) {
    return this.prisma.transaction.create({
      data: {
        reference: data.reference,
        productId: data.productId,
        customerId: data.customerId,
        deliveryId: data.deliveryId,
        quantity: data.quantity,
        productAmount: data.productAmount,
        baseFee: data.baseFee,
        deliveryFee: data.deliveryFee,
        totalAmount: data.totalAmount,
        status: 'PENDING',
      },
    });
  }

  findById(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { product: true, customer: true, delivery: true },
    });
  }

  updateResult(
    id: string,
    status: 'APPROVED' | 'DECLINED' | 'ERROR',
    gatewayTransactionId: string,
    gatewayStatus: string,
  ) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status, gatewayTransactionId, gatewayStatus },
    });
  }
}
