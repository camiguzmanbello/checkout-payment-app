import { PayTransactionUseCase } from './pay-transaction.usecase';
import { TransactionRecord } from '../domain/transaction.repository.port';
import { CardData } from '../../payment-gateway/payment-gateway.port';

describe('PayTransactionUseCase', () => {
  const mockTransactionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    updateResult: jest.fn(),
  };
  const mockProductRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    decreaseStock: jest.fn(),
  };
  const mockGateway = {
    tokenizeCard: jest.fn(),
    createTransaction: jest.fn(),
  };

  const useCase = new PayTransactionUseCase(
    mockTransactionRepo as any,
    mockProductRepo as any,
    mockGateway as any,
  );

  const pendingTransaction: TransactionRecord = {
    id: 't1',
    reference: 'TXN-1',
    status: 'PENDING',
    productId: 'p1',
    customerId: 'c1',
    deliveryId: 'd1',
    quantity: 2,
    productAmount: 20000,
    baseFee: 500000,
    deliveryFee: 800000,
    totalAmount: 1320000,
    gatewayTransactionId: null,
    gatewayStatus: null,
  };

  const card: CardData = {
    number: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '29',
    cardHolder: 'Maria Camila Guzman',
  };

  const input = {
    transactionId: 't1',
    card,
    customerEmail: 'buyer@example.com',
  };

  // Every path that reaches the gateway ends with the repository being updated,
  // so the updated record is what the use case gives back.
  const updatedWith = (status: TransactionRecord['status']) => ({
    ...pendingTransaction,
    status,
  });

  beforeEach(() => jest.clearAllMocks());

  it('fails when the transaction does not exist', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('TRANSACTION_NOT_FOUND');
    expect(mockGateway.tokenizeCard).not.toHaveBeenCalled();
    expect(mockTransactionRepo.updateResult).not.toHaveBeenCalled();
  });

  it('tokenizes the card and charges the stored total', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-1',
      status: 'APPROVED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('APPROVED'));

    await useCase.execute(input);

    expect(mockGateway.tokenizeCard).toHaveBeenCalledWith(card);
    expect(mockGateway.createTransaction).toHaveBeenCalledWith({
      amountInCents: 1320000,
      reference: 'TXN-1',
      cardToken: 'tok_123',
      customerEmail: 'buyer@example.com',
    });
  });

  it('marks the transaction APPROVED and decreases stock', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-1',
      status: 'APPROVED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('APPROVED'));

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value.status).toBe('APPROVED');
    expect(mockTransactionRepo.updateResult).toHaveBeenCalledWith(
      't1',
      'APPROVED',
      'gw-1',
      'APPROVED',
    );
    expect(mockProductRepo.decreaseStock).toHaveBeenCalledWith('p1', 2);
  });

  it('marks the transaction DECLINED and leaves stock untouched', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-2',
      status: 'DECLINED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('DECLINED'));

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value.status).toBe('DECLINED');
    expect(mockTransactionRepo.updateResult).toHaveBeenCalledWith(
      't1',
      'DECLINED',
      'gw-2',
      'DECLINED',
    );
    expect(mockProductRepo.decreaseStock).not.toHaveBeenCalled();
  });

  it('stores the ERROR reported by the gateway without decreasing stock', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: '',
      status: 'ERROR',
      raw: { error: 'boom' },
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('ERROR'));

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    expect(mockTransactionRepo.updateResult).toHaveBeenCalledWith(
      't1',
      'ERROR',
      '',
      'ERROR',
    );
    expect(mockProductRepo.decreaseStock).not.toHaveBeenCalled();
  });

  it('turns a tokenization failure into ERROR instead of throwing', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockRejectedValue(new Error('tokenize failed'));
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('ERROR'));

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value.status).toBe('ERROR');
    expect(mockGateway.createTransaction).not.toHaveBeenCalled();
    expect(mockTransactionRepo.updateResult).toHaveBeenCalledWith(
      't1',
      'ERROR',
      '',
      'ERROR',
    );
    expect(mockProductRepo.decreaseStock).not.toHaveBeenCalled();
  });

  it('turns a network failure while charging into ERROR', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockRejectedValue(new Error('ECONNRESET'));
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('ERROR'));

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    expect(mockTransactionRepo.updateResult).toHaveBeenCalledWith(
      't1',
      'ERROR',
      '',
      'ERROR',
    );
    expect(mockProductRepo.decreaseStock).not.toHaveBeenCalled();
  });
});
