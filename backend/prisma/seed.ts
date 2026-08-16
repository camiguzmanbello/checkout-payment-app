import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      {
        name: 'Auriculares Inalámbricos Pro',
        description: 'Cancelación de ruido activa, 30h de batería.',
        price: 25000000, // 250.000 COP en centavos
        stock: 15,
        imageUrl: 'https://picsum.photos/seed/headphones/400/300',
      },
      {
        name: 'Smartwatch Series X',
        description: 'GPS, monitor cardíaco, resistente al agua.',
        price: 45000000,
        stock: 8,
        imageUrl: 'https://picsum.photos/seed/watch/400/300',
      },
      {
        name: 'Teclado Mecánico RGB',
        description: 'Switches rojos, retroiluminación RGB personalizable.',
        price: 18000000,
        stock: 20,
        imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
      },
    ],
  });
  console.log('Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
