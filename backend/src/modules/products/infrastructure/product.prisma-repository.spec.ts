import { ProductPrismaRepository } from './product.prisma-repository';
import { Product } from '../domain/product.entity';

describe('ProductPrismaRepository', () => {
  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new ProductPrismaRepository(mockPrisma as any);

  const row = {
    id: 'p1',
    name: 'Test',
    description: 'desc',
    price: 10000,
    stock: 5,
    imageUrl: 'https://example.test/p1.png',
  };

  beforeEach(() => jest.clearAllMocks());

  it('maps every row to a Product entity, in a stable order', async () => {
    mockPrisma.product.findMany.mockResolvedValue([row]);

    const products = await repository.findAll();

    expect(products).toHaveLength(1);
    expect(products[0]).toBeInstanceOf(Product);
    expect(products[0].hasStockFor(5)).toBe(true);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
  });

  it('maps a single row to a Product entity', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(row);

    const product = await repository.findById('p1');

    expect(product).toBeInstanceOf(Product);
    expect(product?.price).toBe(10000);
    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
    });
  });

  it('returns null when the product does not exist', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('decrements the stock by the given quantity', async () => {
    mockPrisma.product.update.mockResolvedValue({ ...row, stock: 3 });

    const product = await repository.decreaseStock('p1', 2);

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stock: { decrement: 2 } },
    });
    expect(product.stock).toBe(3);
  });
});
