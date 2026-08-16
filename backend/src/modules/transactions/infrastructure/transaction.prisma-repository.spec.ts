import { TransactionPrismaRepository } from './transaction.prisma-repository';

describe('TransactionPrismaRepository', () => {
  const mockPrisma = {
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new TransactionPrismaRepository(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('always persists a new transaction as PENDING', async () => {
    mockPrisma.transaction.create.mockResolvedValue({ id: 't1' });

    await repository.create({
      reference: 'TXN-1',
      productId: 'p1',
      customerId: 'c1',
      deliveryId: 'd1',
      quantity: 2,
      productAmount: 20000,
      baseFee: 500000,
      deliveryFee: 800000,
      totalAmount: 1320000,
    });

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: 'TXN-1',
        totalAmount: 1320000,
        status: 'PENDING',
      }),
    });
  });

  it('reads a transaction with its related entities', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 't1' });

    await expect(repository.findById('t1')).resolves.toEqual({ id: 't1' });
    expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      include: { product: true, customer: true, delivery: true },
    });
  });

  it('stores the gateway outcome on the transaction', async () => {
    mockPrisma.transaction.update.mockResolvedValue({ id: 't1' });

    await repository.updateResult('t1', 'APPROVED', 'gw-1', 'APPROVED');

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'APPROVED',
        gatewayTransactionId: 'gw-1',
        gatewayStatus: 'APPROVED',
      },
    });
  });
});
