export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface CardData {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface ChargeResult {
  gatewayTransactionId: string;
  status: 'APPROVED' | 'DECLINED' | 'ERROR';
  raw: unknown;
}

export interface PaymentGatewayPort {
  tokenizeCard(card: CardData): Promise<string>;
  createTransaction(params: {
    amountInCents: number;
    reference: string;
    cardToken: string;
    customerEmail: string;
    installments?: number;
  }): Promise<ChargeResult>;
}
