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

  // `updateMany` es lo que permite poner la condición en el WHERE: el motor
  // evalúa `stock >= quantity` y descuenta en la misma sentencia, bajo el mismo
  // lock de fila. `update` no acepta filtrar por otra columna, y hacerlo en dos
  // pasos reabre la carrera que esto viene a cerrar. Si no alcanzaba, no hay
  // fila afectada y el stock queda intacto.
  async reserveStock(id: string, quantity: number): Promise<boolean> {
    const { count } = await this.prisma.product.updateMany({
      where: { id, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    return count > 0;
  }

  async releaseStock(id: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { stock: { increment: quantity } },
    });
  }
}
