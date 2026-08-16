import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../features/checkout/checkoutSlice';
import FinalStatus from './FinalStatus';

global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => [] }));

function renderStatus(checkout = {}) {
  const store = configureStore({
    reducer: { checkout: checkoutReducer },
    preloadedState: {
      checkout: {
        step: 'result',
        products: [],
        selectedProduct: null,
        quantity: 1,
        cardData: null,
        deliveryData: null,
        customerData: null,
        transaction: { id: 't1', reference: 'TXN-1', status: 'APPROVED' },
        loading: false,
        error: null,
        ...checkout,
      },
    },
  });
  return { store, ...render(<Provider store={store}><FinalStatus /></Provider>) };
}

describe('FinalStatus', () => {
  beforeEach(() => fetch.mockClear());

  it('celebrates an approved payment', () => {
    renderStatus();

    expect(screen.getByText('¡Pago aprobado!')).toBeInTheDocument();
    expect(screen.getByText(/stock ya fue actualizado/i)).toBeInTheDocument();
  });

  it('explains a declined payment without blaming the buyer', () => {
    renderStatus({ transaction: { reference: 'TXN-1', status: 'DECLINED' } });

    expect(screen.getByText('Pago rechazado')).toBeInTheDocument();
    expect(screen.getByText(/no autorizó la transacción/i)).toBeInTheDocument();
  });

  // Un ERROR puede significar que sí cobraron: llamarlo "rechazado" sería lo
  // peor que puede hacer esta pantalla.
  it('tells an unconfirmed payment apart from a declined one', () => {
    renderStatus({ transaction: { reference: 'TXN-1', status: 'ERROR' } });

    expect(screen.getByText('No pudimos confirmar tu pago')).toBeInTheDocument();
    expect(screen.getByText(/revisa tu estado de cuenta/i)).toBeInTheDocument();
    expect(screen.queryByText('Pago rechazado')).not.toBeInTheDocument();
  });

  it('falls back to the unconfirmed state when there is no transaction', () => {
    renderStatus({ transaction: null });
    expect(screen.getByText('No pudimos confirmar tu pago')).toBeInTheDocument();
  });

  it('shows the reference, which is what allows reconciling the charge', () => {
    renderStatus();
    expect(screen.getByText('TXN-1')).toBeInTheDocument();
  });

  it('shows the error message when there is one', () => {
    renderStatus({ error: 'Gateway timeout' });
    expect(screen.getByText('Gateway timeout')).toBeInTheDocument();
  });

  it('returns to the catalogue and refreshes the stock', () => {
    const { store } = renderStatus();

    fireEvent.click(screen.getByRole('button', { name: /volver al catálogo/i }));

    expect(store.getState().checkout.step).toBe('product');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/products',
      expect.anything(),
    );
  });
});
