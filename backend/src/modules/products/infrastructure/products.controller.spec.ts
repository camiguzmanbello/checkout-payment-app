import { ProductsController } from './products.controller';
import { Product } from '../domain/product.entity';

describe('ProductsController', () => {
  const mockListProducts = { execute: jest.fn() };
  const mockGetProduct = { execute: jest.fn() };

  const controller = new ProductsController(
    mockListProducts as any,
    mockGetProduct as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates the listing to the use case', async () => {
    const products = [new Product('p1', 'Test', 'desc', 10000, 5, null)];
    mockListProducts.execute.mockResolvedValue(products);

    await expect(controller.findAll()).resolves.toBe(products);
    expect(mockListProducts.execute).toHaveBeenCalledTimes(1);
  });

  it('passes the id through to the get use case', async () => {
    const product = new Product('p1', 'Test', 'desc', 10000, 5, null);
    mockGetProduct.execute.mockResolvedValue(product);

    await expect(controller.findOne('p1')).resolves.toBe(product);
    expect(mockGetProduct.execute).toHaveBeenCalledWith('p1');
  });
});
