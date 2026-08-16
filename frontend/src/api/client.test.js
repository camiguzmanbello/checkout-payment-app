import { api } from './client';

global.fetch = jest.fn();

const ok = (data) => ({ ok: true, json: async () => data });
const failing = (data) => ({ ok: false, json: async () => data });

const lastCall = () => fetch.mock.calls[fetch.mock.calls.length - 1];
const bodyOf = () => JSON.parse(lastCall()[1].body);

describe('api client', () => {
  beforeEach(() => fetch.mockReset());

  it('reads the catalogue', async () => {
    fetch.mockResolvedValueOnce(ok([{ id: 'p1' }]));

    await expect(api.getProducts()).resolves.toEqual([{ id: 'p1' }]);
    expect(lastCall()[0]).toBe('http://localhost:3000/products');
  });

  it('reads a single product', async () => {
    fetch.mockResolvedValueOnce(ok({ id: 'p1' }));

    await api.getProduct('p1');

    expect(lastCall()[0]).toBe('http://localhost:3000/products/p1');
  });

  it.each([
    ['createCustomer', 'customers', { fullName: 'Maria' }],
    ['createDelivery', 'deliveries', { address: 'Calle 100' }],
    ['createTransaction', 'transactions', { productId: 'p1' }],
  ])('%s posts to /%s', async (method, path, payload) => {
    fetch.mockResolvedValueOnce(ok({ id: 'x' }));

    await api[method](payload);

    expect(lastCall()[0]).toBe(`http://localhost:3000/${path}`);
    expect(lastCall()[1].method).toBe('POST');
    expect(lastCall()[1].headers['Content-Type']).toBe('application/json');
    expect(bodyOf()).toEqual(payload);
  });

  it('pays a transaction by id', async () => {
    fetch.mockResolvedValueOnce(ok({ status: 'APPROVED' }));

    await api.payTransaction('t1', { cardNumber: '4242424242424242' });

    expect(lastCall()[0]).toBe('http://localhost:3000/transactions/t1/pay');
    expect(bodyOf()).toEqual({ cardNumber: '4242424242424242' });
  });

  it('reads a transaction by id', async () => {
    fetch.mockResolvedValueOnce(ok({ id: 't1' }));

    await api.getTransaction('t1');

    expect(lastCall()[0]).toBe('http://localhost:3000/transactions/t1');
  });

  it('surfaces the message the backend sent', async () => {
    fetch.mockResolvedValueOnce(failing({ message: 'INSUFFICIENT_STOCK' }));

    await expect(api.getProducts()).rejects.toThrow('INSUFFICIENT_STOCK');
  });

  // La validación del backend responde una lista de mensajes.
  it('joins the list of validation messages into one line', async () => {
    fetch.mockResolvedValueOnce(
      failing({ message: ['cvc debe tener 3 dígitos', 'email inválido'] }),
    );

    await expect(api.getProducts()).rejects.toThrow(
      'cvc debe tener 3 dígitos, email inválido',
    );
  });

  it('falls back to a generic message when the body cannot be read', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(api.getProducts()).rejects.toThrow('Error de red');
  });
});
