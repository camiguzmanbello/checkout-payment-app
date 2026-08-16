import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCustomerDto,
  CustomersController,
  CustomersService,
} from './customers.module';

describe('CustomersService', () => {
  const mockPrisma = {
    customer: { create: jest.fn(), findUnique: jest.fn() },
  };
  const service = new CustomersService(mockPrisma as any);

  const customer = {
    fullName: 'Maria Camila Guzman',
    email: 'buyer@example.com',
    phone: '+573001234567',
  };

  beforeEach(() => jest.clearAllMocks());

  it('persists the customer as received', async () => {
    mockPrisma.customer.create.mockResolvedValue({ id: 'c1', ...customer });

    await expect(service.create(customer)).resolves.toEqual({
      id: 'c1',
      ...customer,
    });
    expect(mockPrisma.customer.create).toHaveBeenCalledWith({ data: customer });
  });

  it('looks a customer up by id', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: 'c1' });

    await expect(service.findById('c1')).resolves.toEqual({ id: 'c1' });
    expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });

  it('returns null for an unknown customer', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).resolves.toBeNull();
  });
});

describe('CustomersController', () => {
  const mockService = { create: jest.fn(), findById: jest.fn() };
  const controller = new CustomersController(mockService as any);

  beforeEach(() => jest.clearAllMocks());

  it('delegates creation to the service', async () => {
    const dto = {
      fullName: 'Maria Camila Guzman',
      email: 'buyer@example.com',
      phone: '+573001234567',
    };
    mockService.create.mockResolvedValue({ id: 'c1' });

    await expect(controller.create(dto)).resolves.toEqual({ id: 'c1' });
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates the lookup to the service', async () => {
    mockService.findById.mockResolvedValue({ id: 'c1' });

    await expect(controller.findOne('c1')).resolves.toEqual({ id: 'c1' });
    expect(mockService.findById).toHaveBeenCalledWith('c1');
  });
});

describe('CreateCustomerDto', () => {
  const valid = {
    fullName: 'Maria Camila Guzman',
    email: 'buyer@example.com',
    phone: '+573001234567',
  };

  const errorsFor = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(CreateCustomerDto, payload));
    return errors.map((e) => e.property);
  };

  it('accepts a well formed payload', async () => {
    await expect(errorsFor(valid)).resolves.toEqual([]);
  });

  it.each([
    ['a name with digits', { fullName: 'Maria 2' }],
    ['a name that is too short', { fullName: 'Ma' }],
    ['a malformed email', { email: 'not-an-email' }],
    ['a phone with letters', { phone: '30012abc' }],
  ])('rejects %s', async (_case, override) => {
    await expect(errorsFor({ ...valid, ...override })).resolves.toEqual([
      Object.keys(override)[0],
    ]);
  });
});
