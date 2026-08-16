// El store lee localStorage al importarse, así que cada caso lo recarga con el
// almacenamiento ya preparado.
const loadStore = async () => {
  jest.resetModules();
  const module = await import('./store');
  return module.store;
};

const KEY = 'checkout_state_v1';

describe('store', () => {
  beforeEach(() => localStorage.clear());

  it('starts from the initial state when there is nothing saved', async () => {
    const store = await loadStore();

    expect(store.getState().checkout.step).toBe('product');
    expect(store.getState().checkout.products).toEqual([]);
  });

  it('rehydrates the progress saved by a previous session', async () => {
    localStorage.setItem(KEY, JSON.stringify({ step: 'summary', quantity: 3 }));

    const store = await loadStore();

    expect(store.getState().checkout.step).toBe('summary');
    expect(store.getState().checkout.quantity).toBe(3);
  });

  it('saves on every change, without ever writing the card', async () => {
    const store = await loadStore();

    store.dispatch({ type: 'checkout/setQuantity', payload: 4 });
    store.dispatch({
      type: 'checkout/setCardData',
      payload: { number: '4242 4242 4242 4242', cvc: '123' },
    });

    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored.quantity).toBe(4);
    expect(stored).not.toHaveProperty('cardData');
    expect(localStorage.getItem(KEY)).not.toContain('123');
  });
});
