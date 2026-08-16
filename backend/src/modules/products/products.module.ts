import { Module } from '@nestjs/common';
import { ProductsController } from './infrastructure/products.controller';
import { ProductPrismaRepository } from './infrastructure/product.prisma-repository';
import { PRODUCT_REPOSITORY } from './domain/product.repository.port';
import { ListProductsUseCase } from './application/list-products.usecase';
import { GetProductUseCase } from './application/get-product.usecase';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ProductsController],
  providers: [
    PrismaService,
    ListProductsUseCase,
    GetProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: ProductPrismaRepository },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
