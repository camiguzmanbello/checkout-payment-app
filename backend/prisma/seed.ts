import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: 'Auriculares Inalámbricos Pro',
    description: 'Cancelación de ruido activa, 30h de batería.',
    price: 25000000, // 250.000 COP en centavos
    stock: 15,
    imageUrl: 'https://picsum.photos/seed/headphones/800/600',
  },
  {
    name: 'Smartwatch Series X',
    description: 'GPS, monitor cardíaco, resistente al agua.',
    price: 45000000,
    stock: 8,
    imageUrl: 'https://picsum.photos/seed/watch/800/600',
  },
  {
    name: 'Teclado Mecánico RGB',
    description: 'Switches rojos, retroiluminación RGB personalizable.',
    price: 18000000,
    stock: 20,
    imageUrl: 'https://picsum.photos/seed/keyboard/800/600',
  },
  {
    name: 'Mouse Ergonómico Vertical',
    description: 'Sensor de 16.000 DPI, silencioso, batería de 60 días.',
    price: 12000000,
    stock: 25,
    imageUrl: 'https://picsum.photos/seed/mouse/800/600',
  },
  {
    name: 'Parlante Bluetooth Compacto',
    description: 'Sonido 360°, resistente al agua IPX7, 12h de reproducción.',
    price: 21000000,
    stock: 12,
    imageUrl: 'https://picsum.photos/seed/speaker/800/600',
  },
  {
    name: 'Cámara Web 4K',
    description: 'Autoenfoque, corrección de luz y micrófono dual.',
    price: 32000000,
    stock: 6,
    imageUrl: 'https://picsum.photos/seed/webcam/800/600',
  },
  {
    name: 'Monitor Curvo 27"',
    description: 'QHD 165Hz, 1ms, altura ajustable.',
    price: 98000000,
    stock: 4,
    imageUrl: 'https://picsum.photos/seed/monitor/800/600',
  },
  {
    name: 'Base Cargadora Inalámbrica',
    description: 'Carga tres dispositivos a la vez, 15W por posición.',
    price: 9500000,
    stock: 30,
    imageUrl: 'https://picsum.photos/seed/charger/800/600',
  },
  {
    name: 'Silla Ergonómica Mesh',
    description: 'Soporte lumbar ajustable, reposabrazos 4D.',
    price: 135000000,
    stock: 0, // agotado a propósito: ejercita el estado "sin stock" de la UI
    imageUrl: 'https://picsum.photos/seed/chair/800/600',
  },
];

async function main() {
  // Idempotente: solo inserta lo que falta, para poder correrlo otra vez sin
  // duplicar el catálogo ni tocar los productos que ya tienen transacciones.
  const existing = await prisma.product.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((p) => p.name));
  const missing = PRODUCTS.filter((p) => !existingNames.has(p.name));

  if (missing.length > 0) {
    await prisma.product.createMany({ data: missing });
  }

  console.log(
    `Seed completado: ${missing.length} productos nuevos, ${existingNames.size} ya existían`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
