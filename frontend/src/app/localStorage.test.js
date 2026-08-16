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
    saveState(fullState);

    const restored = loadState();

    expect(restored.checkout.step).toBe('summary');
    expect(restored.checkout.quantity).toBe(2);
    expect(restored.checkout.cardData).toBeNull();
    expect(restored.checkout.loading).toBe(false);
    expect(restored.checkout.error).toBeNull();
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
