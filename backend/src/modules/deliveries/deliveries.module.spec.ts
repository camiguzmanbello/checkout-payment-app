import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateDeliveryDto,
  DeliveriesController,
  DeliveriesService,
} from './deliveries.module';

const delivery = {
  address: 'Calle 100 #15-20 Apto 401',
  city: 'Bogota',
  region: 'Cundinamarca',
  phone: '+573001234567',
};

describe('DeliveriesService', () => {
  const mockPrisma = {
    delivery: { create: jest.fn(), findUnique: jest.fn() },
  };
  const service = new DeliveriesService(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('persists the delivery details as received', async () => {
    mockPrisma.delivery.create.mockResolvedValue({ id: 'd1', ...delivery });

    await expect(service.create(delivery)).resolves.toEqual({
      id: 'd1',
      ...delivery,
    });
    expect(mockPrisma.delivery.create).toHaveBeenCalledWith({ data: delivery });
  });

  it('looks a delivery up by id', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd1' });

    await expect(service.findById('d1')).resolves.toEqual({ id: 'd1' });
    expect(mockPrisma.delivery.findUnique).toHaveBeenCalledWith({
      where: { id: 'd1' },
    });
  });

  it('returns null for an unknown delivery', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).resolves.toBeNull();
  });
});

describe('DeliveriesController', () => {
  const mockService = { create: jest.fn(), findById: jest.fn() };
  const controller = new DeliveriesController(mockService as any);

  beforeEach(() => jest.clearAllMocks());

  it('delegates creation to the service', async () => {
    mockService.create.mockResolvedValue({ id: 'd1' });

    await expect(controller.create(delivery)).resolves.toEqual({ id: 'd1' });
    expect(mockService.create).toHaveBeenCalledWith(delivery);
  });

  it('delegates the lookup to the service', async () => {
    mockService.findById.mockResolvedValue({ id: 'd1' });

    await expect(controller.findOne('d1')).resolves.toEqual({ id: 'd1' });
    expect(mockService.findById).toHaveBeenCalledWith('d1');
  });
});

describe('CreateDeliveryDto', () => {
  const errorsFor = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(CreateDeliveryDto, payload));
    return errors.map((e) => e.property);
  };

  it('accepts a well formed payload', async () => {
    await expect(errorsFor(delivery)).resolves.toEqual([]);
  });

  it.each(['Bogotá D.C.', 'San Andrés', "Villa d'Leyva", 'Santa Rosa de Cabal'])(
    'accepts %s, a real municipality name',
    async (city) => {
      await expect(errorsFor({ ...delivery, city })).resolves.toEqual([]);
    },
  );

  it.each([
    ['an address that is too short', { address: 'abc' }],
    ['a city with digits', { city: 'Bogota 2' }],
    ['a region that is too short', { region: 'C' }],
    ['a phone with letters', { phone: '30012abc' }],
  ])('rejects %s', async (_case, override) => {
    await expect(errorsFor({ ...delivery, ...override })).resolves.toEqual([
      Object.keys(override)[0],
    ]);
  });
});
