import { ListProductsUseCase } from './list-products.usecase';
import { Product } from '../domain/product.entity';

describe('ListProductsUseCase', () => {
  const mockProductRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    decreaseStock: jest.fn(),
  };
  const useCase = new ListProductsUseCase(mockProductRepo as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns every product from the repository', async () => {
    const products = [new Product('p1', 'Test', 'desc', 10000, 5, null)];
    mockProductRepo.findAll.mockResolvedValue(products);

    await expect(useCase.execute()).resolves.toBe(products);
    expect(mockProductRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when there is no product', async () => {
    mockProductRepo.findAll.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
