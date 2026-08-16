import { Test, TestingModule } from '@nestjs/testing';
import { ProductsModule } from './products.module';
import { PrismaService } from '../../common/prisma.service';
import { PRODUCT_REPOSITORY } from './domain/product.repository.port';
import { ProductPrismaRepository } from './infrastructure/product.prisma-repository';
import { ProductsController } from './infrastructure/products.controller';
import { ListProductsUseCase } from './application/list-products.usecase';
import { GetProductUseCase } from './application/get-product.usecase';

describe('ProductsModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [ProductsModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  afterAll(async () => moduleRef.close());

  it('resolves the controller with both use cases injected', () => {
    expect(moduleRef.get(ProductsController)).toBeInstanceOf(ProductsController);
    expect(moduleRef.get(ListProductsUseCase)).toBeInstanceOf(ListProductsUseCase);
    expect(moduleRef.get(GetProductUseCase)).toBeInstanceOf(GetProductUseCase);
  });

  it('binds the repository port to the Prisma adapter', () => {
    expect(moduleRef.get(PRODUCT_REPOSITORY)).toBeInstanceOf(
      ProductPrismaRepository,
    );
  });
});
