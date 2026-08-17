import { Product } from './product.entity';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

export interface ProductRepositoryPort {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;

  // Toma el stock sólo si alcanza, en una única operación: leer y después
  // descontar deja una ventana en la que dos compras simultáneas pasan la misma
  // verificación y el stock termina en negativo. Devuelve false si no alcanzaba,
  // y en ese caso no tocó nada.
  reserveStock(id: string, quantity: number): Promise<boolean>;

  // Devuelve lo reservado cuando el cobro no prospera.
  releaseStock(id: string, quantity: number): Promise<void>;
}
