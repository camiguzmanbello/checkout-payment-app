import { loadState, saveState, clearState } from './localStorage';

const KEY = 'checkout_state_v1';

const fullState = {
  checkout: {
    step: 'summary',
    products: [{ id: 'p1' }],
    selectedProduct: { id: 'p1' },
    quantity: 2,
    cardData: { number: '4242 4242 4242 4242', cvc: '123' },
    deliveryData: { address: 'Calle 100' },
    customerData: { email: 'a@b.com' },
    transaction: { id: 't1' },
    loading: true,
    error: 'boom',
  },
};

describe('localStorage persistence', () => {
  beforeEach(() => localStorage.clear());

  it('returns undefined when nothing was saved', () => {
    expect(loadState()).toBeUndefined();
  });

  it('never writes card data to disk', () => {
    saveState(fullState);

    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored).not.toHaveProperty('cardData');
    expect(localStorage.getItem(KEY)).not.toContain('4242');
    expect(stored.transaction).toEqual({ id: 't1' });
  });

  it('does not persist transient flags', () => {
    saveState(fullState);

    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored).not.toHaveProperty('loading');
    expect(stored).not.toHaveProperty('error');
  });

  it('restores the progress with the card slot emptied', () => {
    saveState({ checkout: { ...fullState.checkout, step: 'checkout' } });

    const restored = loadState();

    expect(restored.checkout.step).toBe('checkout');
    expect(restored.checkout.quantity).toBe(2);
    expect(restored.checkout.cardData).toBeNull();
    expect(restored.checkout.loading).toBe(false);
    expect(restored.checkout.error).toBeNull();
  });

  // El resumen no se puede reanudar: pagar desde ahí necesita la tarjeta, que
  // es justo lo que no se persiste. Reanudarlo dejaba un botón "Pagar" que
  // reventaba y se mostraba como un pago fallido sin haber cobrado nada.
  it('sends a reloaded summary back to the form, since the card is gone', () => {
    saveState(fullState);

    const restored = loadState();

    expect(restored.checkout.step).toBe('checkout');
    expect(restored.checkout.cardReentryNeeded).toBe(true);
    // La transacción vieja quedó en PENDING: el formulario crea una nueva.
    expect(restored.checkout.transaction).toBeNull();
    // Lo que sí se puede reponer se conserva.
    expect(restored.checkout.selectedProduct).toEqual({ id: 'p1' });
    expect(restored.checkout.deliveryData).toEqual({ address: 'Calle 100' });
  });

  it('leaves the result step alone: it needs no card to be shown again', () => {
    saveState({ checkout: { ...fullState.checkout, step: 'result' } });

    const restored = loadState();

    expect(restored.checkout.step).toBe('result');
    expect(restored.checkout.transaction).toEqual({ id: 't1' });
  });

  it('ignores a corrupted payload instead of breaking the app', () => {
    localStorage.setItem(KEY, '{ not json');
    expect(loadState()).toBeUndefined();
  });

  it('survives storage being unavailable, as in private mode', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    expect(() => saveState(fullState)).not.toThrow();

    setItem.mockRestore();
  });

  it('clears what was saved', () => {
    saveState(fullState);
    clearState();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
