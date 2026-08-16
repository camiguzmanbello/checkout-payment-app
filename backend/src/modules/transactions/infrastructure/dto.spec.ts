import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDto, PayTransactionDto } from './dto';

const uuid = '3f4d9f8a-1b2c-4d5e-8f90-a1b2c3d4e5f6';

const errorsFor = async (cls: any, payload: Record<string, unknown>) => {
  const errors = await validate(plainToInstance(cls, payload));
  return errors.map((e) => e.property);
};

describe('CreateTransactionDto', () => {
  const valid = {
    productId: uuid,
    quantity: 1,
    customerId: uuid,
    deliveryId: uuid,
  };

  it('accepts a well formed payload', async () => {
    await expect(errorsFor(CreateTransactionDto, valid)).resolves.toEqual([]);
  });

  it('rejects ids that are not UUIDs', async () => {
    await expect(
      errorsFor(CreateTransactionDto, { ...valid, productId: 'not-a-uuid' }),
    ).resolves.toContain('productId');
  });

  it('rejects a quantity below 1', async () => {
    await expect(
      errorsFor(CreateTransactionDto, { ...valid, quantity: 0 }),
    ).resolves.toContain('quantity');
  });

  it('rejects an absurd quantity', async () => {
    await expect(
      errorsFor(CreateTransactionDto, { ...valid, quantity: 21 }),
    ).resolves.toContain('quantity');
  });
});

describe('PayTransactionDto', () => {
  const valid = {
    cardNumber: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '29',
    cardHolder: 'Maria Camila Guzman',
    customerEmail: 'buyer@example.com',
  };

  it('accepts a well formed payload', async () => {
    await expect(errorsFor(PayTransactionDto, valid)).resolves.toEqual([]);
  });

  it.each([
    ['a card number with letters', { cardNumber: '4242abcd4242efgh' }],
    ['a card number that is too short', { cardNumber: '424242' }],
    ['a cvc of five digits', { cvc: '12345' }],
    ['a month out of range', { expMonth: '13' }],
    ['a four digit year', { expYear: '2029' }],
    ['a card holder with digits', { cardHolder: 'Maria 2' }],
    ['a malformed email', { customerEmail: 'not-an-email' }],
  ])('rejects %s', async (_case, override) => {
    const properties = await errorsFor(PayTransactionDto, {
      ...valid,
      ...override,
    });

    expect(properties).toEqual([Object.keys(override)[0]]);
  });

  it('accepts accented names, since the buyers are Colombian', async () => {
    await expect(
      errorsFor(PayTransactionDto, { ...valid, cardHolder: 'María Camila Guzmán' }),
    ).resolves.toEqual([]);
  });
});
