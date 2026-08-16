import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { Product } from '../domain/product.entity';
import { ProductRepositoryPort } from '../domain/product.repository.port';

@Injectable()
export class ProductPrismaRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    // Stable order so the catalogue does not shuffle between reloads. Products
    // seeded in the same batch share a timestamp, hence the name tiebreaker.
    const rows = await this.prisma.product.findMany({
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
    return rows.map(
      (r) =>
        new Product(r.id, r.name, r.description, r.price, r.stock, r.imageUrl),
    );
  }

  async findById(id: string): Promise<Product | null> {
    const r = await this.prisma.product.findUnique({ where: { id } });
    if (!r) return null;
    return new Product(r.id, r.name, r.description, r.price, r.stock, r.imageUrl);
  }

  async decreaseStock(id: string, quantity: number): Promise<Product> {
    const r = await this.prisma.product.update({
      where: { id },
      data: { stock: { decrement: quantity } },
    });
    return new Product(r.id, r.name, r.description, r.price, r.stock, r.imageUrl);
  }
}
