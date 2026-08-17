import { CreateTransactionUseCase } from './create-transaction.usecase';
import { Product } from '../../products/domain/product.entity';

describe('CreateTransactionUseCase', () => {
  const mockProductRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
  };
  const mockTransactionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    updateResult: jest.fn(),
  };

  const useCase = new CreateTransactionUseCase(
    mockProductRepo as any,
    mockTransactionRepo as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('fails when the product does not exist', async () => {
    mockProductRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      productId: 'x',
      quantity: 1,
      customerId: 'c1',
      deliveryId: 'd1',
    });

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('fails when there is not enough stock', async () => {
    mockProductRepo.findById.mockResolvedValue(
      new Product('p1', 'Test', 'desc', 10000, 1, null),
    );

    const result = await useCase.execute({
      productId: 'p1',
      quantity: 5,
      customerId: 'c1',
      deliveryId: 'd1',
    });

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('INSUFFICIENT_STOCK');
  });

  it('creates the PENDING transaction with the right amounts', async () => {
    mockProductRepo.findById.mockResolvedValue(
      new Product('p1', 'Test', 'desc', 10000, 5, null),
    );
    mockTransactionRepo.create.mockResolvedValue({ id: 't1', status: 'PENDING' });

    const result = await useCase.execute({
      productId: 'p1',
      quantity: 2,
      customerId: 'c1',
      deliveryId: 'd1',
    });

    expect(result.isSuccess).toBe(true);
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productAmount: 20000,
        baseFee: 500000,
        deliveryFee: 800000,
        totalAmount: 1320000,
      }),
    );
  });
});
