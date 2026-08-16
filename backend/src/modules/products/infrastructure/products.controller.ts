import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListProductsUseCase } from '../application/list-products.usecase';
import { GetProductUseCase } from '../application/get-product.usecase';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  findAll() {
    return this.listProducts.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProduct.execute(id);
  }
}
