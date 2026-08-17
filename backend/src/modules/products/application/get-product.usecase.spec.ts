import { NotFoundException } from '@nestjs/common';
import { GetProductUseCase } from './get-product.usecase';
import { Product } from '../domain/product.entity';

describe('GetProductUseCase', () => {
  const mockProductRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
  };
  const useCase = new GetProductUseCase(mockProductRepo as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns the product when it exists', async () => {
    const product = new Product('p1', 'Test', 'desc', 10000, 5, null);
    mockProductRepo.findById.mockResolvedValue(product);

    await expect(useCase.execute('p1')).resolves.toBe(product);
    expect(mockProductRepo.findById).toHaveBeenCalledWith('p1');
  });

  it('throws NotFound when the product does not exist', async () => {
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    await expect(useCase.execute('missing')).rejects.toThrow(
      'Product missing not found',
    );
  });
});
