import { PrismaService } from './prisma.service';

// The lifecycle hooks are the only logic in this class. Building a real
// PrismaClient would need a database, so the prototype is exercised directly.
describe('PrismaService', () => {
  const service = Object.create(PrismaService.prototype) as PrismaService;

  it('opens the connection when the module starts', async () => {
    const connect = jest.fn();
    (service as any).$connect = connect;

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('closes the connection when the module shuts down', async () => {
    const disconnect = jest.fn();
    (service as any).$disconnect = disconnect;

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
