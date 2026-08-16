import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  selectProduct,
  setQuantity,
  setCardData,
  setCustomerData,
  setDeliveryData,
  resetError,
  backToProduct,
  fetchProducts,
  submitCheckoutInfo,
  confirmPayment,
} from './checkoutSlice';

global.fetch = jest.fn();

const ok = (data) => ({ ok: true, json: async () => data });
const failing = (message) => ({ ok: false, json: async () => ({ message }) });

const makeStore = (preloaded) =>
  configureStore({
    reducer: { checkout: reducer },
    preloadedState: preloaded ? { checkout: preloaded } : undefined,
  });

const product = { id: 'p1', name: 'Auriculares', price: 25000000, stock: 5 };

describe('checkoutSlice reducers', () => {
  const initialState = reducer(undefined, { type: '@@INIT' });

  it('selectProduct moves to the checkout step', () => {
    const state = reducer(initialState, selectProduct(product));
    expect(state.selectedProduct).toEqual(product);
    expect(state.step).toBe('checkout');
  });

  it('setQuantity updates the quantity', () => {
    expect(reducer(initialState, setQuantity(3)).quantity).toBe(3);
  });

  it('keeps the card, customer and delivery data entered in the form', () => {
    let state = reducer(initialState, setCardData({ number: '4242' }));
    state = reducer(state, setCustomerData({ email: 'a@b.com' }));
    state = reducer(state, setDeliveryData({ city: 'Armenia' }));

    expect(state.cardData).toEqual({ number: '4242' });
    expect(state.customerData).toEqual({ email: 'a@b.com' });
    expect(state.deliveryData).toEqual({ city: 'Armenia' });
  });

  it('resetError clears the message without touching the rest', () => {
    const withError = { ...initialState, error: 'boom', quantity: 2 };
    const state = reducer(withError, resetError());

    expect(state.error).toBeNull();
    expect(state.quantity).toBe(2);
  });

  it('backToProduct resets the flow but keeps the loaded products', () => {
    const withProducts = { ...initialState, products: [{ id: 'p1' }], step: 'result' };
    const state = reducer(withProducts, backToProduct());

    expect(state.step).toBe('product');
    expect(state.products).toEqual([{ id: 'p1' }]);
    expect(state.transaction).toBeNull();
  });

  it('backToProduct drops the card data', () => {
    const withCard = { ...initialState, cardData: { number: '4242 4242 4242 4242' } };
    expect(reducer(withCard, backToProduct()).cardData).toBeNull();
  });
});

describe('fetchProducts', () => {
  beforeEach(() => fetch.mockReset());

  it('stores the catalogue and lowers the loading flag', async () => {
    fetch.mockResolvedValueOnce(ok([product]));
    const store = makeStore();

    const promise = store.dispatch(fetchProducts());
    expect(store.getState().checkout.loading).toBe(true);
    await promise;

    expect(store.getState().checkout.products).toEqual([product]);
    expect(store.getState().checkout.loading).toBe(false);
  });

  it('keeps the failure message when the API is down', async () => {
    fetch.mockResolvedValueOnce(failing('Servicio no disponible'));
    const store = makeStore();

    await store.dispatch(fetchProducts());

    expect(store.getState().checkout.error).toBe('Servicio no disponible');
    expect(store.getState().checkout.loading).toBe(false);
  });
});

describe('submitCheckoutInfo', () => {
  const customer = { fullName: 'Maria', email: 'a@b.com', phone: '+573001234567' };
  const delivery = { address: 'Calle 100', city: 'Armenia', region: 'Quindío', phone: '+573001234567' };

  beforeEach(() => fetch.mockReset());

  it('creates customer, delivery and transaction, then moves to the summary', async () => {
    fetch
      .mockResolvedValueOnce(ok({ id: 'c1' }))
      .mockResolvedValueOnce(ok({ id: 'd1' }))
      .mockResolvedValueOnce(ok({ id: 't1', status: 'PENDING', totalAmount: 26300000 }));

    const store = makeStore({
      ...reducer(undefined, { type: '@@INIT' }),
      selectedProduct: product,
      quantity: 2,
    });

    await store.dispatch(submitCheckoutInfo({ customer, delivery }));
    const state = store.getState().checkout;

    expect(state.step).toBe('summary');
    expect(state.transaction).toEqual({ id: 't1', status: 'PENDING', totalAmount: 26300000 });
    expect(state.customerData.id).toBe('c1');
    expect(state.deliveryData.id).toBe('d1');

    // La transacción se arma con el producto y la cantidad del propio store.
    const transactionBody = JSON.parse(fetch.mock.calls[2][1].body);
    expect(transactionBody).toEqual({
      productId: 'p1',
      quantity: 2,
      customerId: 'c1',
      deliveryId: 'd1',
    });
  });

  it('stays on the form and reports why it failed', async () => {
    fetch
      .mockResolvedValueOnce(ok({ id: 'c1' }))
      .mockResolvedValueOnce(ok({ id: 'd1' }))
      .mockResolvedValueOnce(failing('INSUFFICIENT_STOCK'));

    const store = makeStore({
      ...reducer(undefined, { type: '@@INIT' }),
      selectedProduct: product,
      step: 'checkout',
    });

    await store.dispatch(submitCheckoutInfo({ customer, delivery }));
    const state = store.getState().checkout;

    expect(state.step).toBe('checkout');
    expect(state.error).toBe('INSUFFICIENT_STOCK');
    expect(state.loading).toBe(false);
  });
});

describe('confirmPayment', () => {
  const paying = {
    ...reducer(undefined, { type: '@@INIT' }),
    step: 'summary',
    selectedProduct: product,
    cardData: {
      number: '4242 4242 4242 4242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Maria Camila Guzman',
    },
    customerData: { email: 'a@b.com' },
    transaction: { id: 't1', status: 'PENDING' },
  };

  beforeEach(() => fetch.mockReset());

  it('sends the card number without the formatting spaces', async () => {
    fetch.mockResolvedValueOnce(ok({ id: 't1', status: 'APPROVED' }));
    const store = makeStore(paying);

    await store.dispatch(confirmPayment());

    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/transactions/t1/pay');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      cardNumber: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Maria Camila Guzman',
      customerEmail: 'a@b.com',
    });
  });

  it('lands on the result screen with the final status', async () => {
    fetch.mockResolvedValueOnce(ok({ id: 't1', status: 'APPROVED' }));
    const store = makeStore(paying);

    await store.dispatch(confirmPayment());
    const state = store.getState().checkout;

    expect(state.step).toBe('result');
    expect(state.transaction.status).toBe('APPROVED');
    expect(state.loading).toBe(false);
  });

  // Si la petición falla igual hay que salir del resumen: el cobro pudo haberse
  // hecho y la persona necesita ver la referencia.
  it('still reaches the result screen when the request fails', async () => {
    fetch.mockResolvedValueOnce(failing('Gateway timeout'));
    const store = makeStore(paying);

    await store.dispatch(confirmPayment());
    const state = store.getState().checkout;

    expect(state.step).toBe('result');
    expect(state.error).toBe('Gateway timeout');
  });
});
