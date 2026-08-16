export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export const BASE_FEE = 500000; // 5.000 COP fijo, en centavos
export const DELIVERY_FEE = 800000; // 8.000 COP fijo, en centavos

export class TransactionAmounts {
  public readonly productAmount: number;
  public readonly baseFee: number = BASE_FEE;
  public readonly deliveryFee: number = DELIVERY_FEE;
  public readonly totalAmount: number;

  constructor(unitPrice: number, quantity: number) {
    this.productAmount = unitPrice * quantity;
    this.totalAmount = this.productAmount + this.baseFee + this.deliveryFee;
  }
}

export function generateTransactionReference(): string {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
