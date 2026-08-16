export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number,
    public readonly imageUrl: string | null,
  ) {}

  hasStockFor(quantity: number): boolean {
    return this.stock >= quantity;
  }
}
