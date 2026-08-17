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
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    // There is stock unless a test says otherwise.
    mockProductRepo.reserveStock.mockResolvedValue(true);
  });

  it('fails when the transaction does not exist', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('TRANSACTION_NOT_FOUND');
    expect(mockProductRepo.reserveStock).not.toHaveBeenCalled();
    expect(mockGateway.tokenizeCard).not.toHaveBeenCalled();
    expect(mockTransactionRepo.updateResult).not.toHaveBeenCalled();
  });

  // Reserving up front is what turns a sold-out product into a rejection
  // instead of a charge for something that is no longer there.
  describe('when the stock ran out before paying', () => {
    beforeEach(() => {
      mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
      mockProductRepo.reserveStock.mockResolvedValue(false);
    });

    it('rejects with INSUFFICIENT_STOCK', async () => {
      const result = await useCase.execute(input);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toBe('INSUFFICIENT_STOCK');
    });

    it('never reaches the gateway, so the buyer is not charged', async () => {
      await useCase.execute(input);

      expect(mockGateway.tokenizeCard).not.toHaveBeenCalled();
      expect(mockGateway.createTransaction).not.toHaveBeenCalled();
      expect(mockTransactionRepo.updateResult).not.toHaveBeenCalled();
    });

    // Nothing was taken, so there is nothing to give back. Releasing here would
    // invent stock that never existed.
    it('does not release anything, since nothing was reserved', async () => {
      await useCase.execute(input);

      expect(mockProductRepo.releaseStock).not.toHaveBeenCalled();
    });
  });

  it('reserves the stock before touching the gateway', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-1',
      status: 'APPROVED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('APPROVED'));

    await useCase.execute(input);

    expect(mockProductRepo.reserveStock).toHaveBeenCalledWith('p1', 2);
    expect(mockProductRepo.reserveStock.mock.invocationCallOrder[0]).toBeLessThan(
      mockGateway.tokenizeCard.mock.invocationCallOrder[0],
    );
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

  it('marks the transaction APPROVED and keeps the reserved stock', async () => {
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
    expect(mockProductRepo.releaseStock).not.toHaveBeenCalled();
  });

  it('marks the transaction DECLINED and gives the stock back', async () => {
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
    expect(mockProductRepo.releaseStock).toHaveBeenCalledWith('p1', 2);
  });

  it('stores the ERROR reported by the gateway and gives the stock back', async () => {
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
    expect(mockProductRepo.releaseStock).toHaveBeenCalledWith('p1', 2);
  });

  it('turns a tokenization failure into ERROR and gives the stock back', async () => {
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
    expect(mockProductRepo.releaseStock).toHaveBeenCalledWith('p1', 2);
  });

  it('turns a network failure while charging into ERROR and gives the stock back', async () => {
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
    expect(mockProductRepo.releaseStock).toHaveBeenCalledWith('p1', 2);
  });

  // The gateway is not the only thing that can fail after the reservation. If
  // the write to the database blows up, the units stay held by a transaction
  // that will never be charged, and nobody is left to hand them back.
  it('gives the stock back when the update after charging throws', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-1',
      status: 'APPROVED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockRejectedValue(new Error('db is down'));

    await expect(useCase.execute(input)).rejects.toThrow('db is down');

    expect(mockProductRepo.releaseStock).toHaveBeenCalledWith('p1', 2);
  });

  it('releases the stock exactly once', async () => {
    mockTransactionRepo.findById.mockResolvedValue(pendingTransaction);
    mockGateway.tokenizeCard.mockResolvedValue('tok_123');
    mockGateway.createTransaction.mockResolvedValue({
      gatewayTransactionId: 'gw-2',
      status: 'DECLINED',
      raw: {},
    });
    mockTransactionRepo.updateResult.mockResolvedValue(updatedWith('DECLINED'));

    await useCase.execute(input);

    expect(mockProductRepo.releaseStock).toHaveBeenCalledTimes(1);
  });
});
