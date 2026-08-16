export const TRANSACTION_REPOSITORY = 'TRANSACTION_REPOSITORY';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export interface CreateTransactionData {
  reference: string;
  productId: string;
  customerId: string;
  deliveryId: string;
  quantity: number;
  productAmount: number;
  baseFee: number;
  deliveryFee: number;
  totalAmount: number;
}

export interface TransactionRecord {
  id: string;
  reference: string;
  status: TransactionStatus;
  productId: string;
  customerId: string;
  deliveryId: string;
  quantity: number;
  productAmount: number;
  baseFee: number;
  deliveryFee: number;
  totalAmount: number;
  gatewayTransactionId: string | null;
  gatewayStatus: string | null;
}

export interface TransactionRepositoryPort {
  create(data: CreateTransactionData): Promise<TransactionRecord>;
  findById(id: string): Promise<TransactionRecord | null>;
  updateResult(
    id: string,
    status: 'APPROVED' | 'DECLINED' | 'ERROR',
    gatewayTransactionId: string,
    gatewayStatus: string,
  ): Promise<TransactionRecord>;
}
