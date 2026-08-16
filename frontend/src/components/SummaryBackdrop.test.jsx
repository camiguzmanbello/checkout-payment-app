import { render, screen, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../features/checkout/checkoutSlice';
import SummaryBackdrop from './SummaryBackdrop';

const product = {
  id: 'p1',
  name: 'Auriculares Inalámbricos Pro',
  description: 'desc',
  price: 25000000,
  stock: 5,
  imageUrl: 'https://example.test/p1.png',
};

const transaction = {
  id: 't1',
  reference: 'TXN-1',
  status: 'PENDING',
  productAmount: 25000000,
  baseFee: 500000,
  deliveryFee: 800000,
  totalAmount: 26300000,
};

function renderSummary(overrides = {}) {
  const store = configureStore({
    reducer: { checkout: checkoutReducer },
    preloadedState: {
      checkout: {
        step: 'summary',
        products: [],
        selectedProduct: product,
        quantity: 1,
        cardData: {
          number: '4242 4242 4242 4242',
          cardHolder: 'Maria Camila Guzman',
          expMonth: '12',
          expYear: '29',
        },
        deliveryData: { address: 'Calle 100 #15-20', city: 'Armenia', region: 'Quindío' },
        customerData: null,
        transaction,
        loading: false,
        error: null,
        ...overrides,
      },
    },
  });
  return { store, ...render(<Provider store={store}><SummaryBackdrop /></Provider>) };
}

describe('SummaryBackdrop', () => {
  it('renders nothing until there is a transaction', () => {
    const { container } = renderSummary({ transaction: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the product being bought', () => {
    renderSummary();

    expect(screen.getByText('Auriculares Inalámbricos Pro')).toBeInTheDocument();
    expect(screen.getByAltText('Auriculares Inalámbricos Pro')).toBeInTheDocument();
    expect(screen.getByText(/1 unidad · \$ 250\.000 c\/u/)).toBeInTheDocument();
  });

  it('pluralises the quantity', () => {
    renderSummary({ quantity: 3 });
    expect(screen.getByText(/3 unidades/)).toBeInTheDocument();
  });

  it('names every line item in plain Spanish, not as a fee', () => {
    renderSummary();

    expect(screen.getByText('Subtotal del producto')).toBeInTheDocument();
    expect(screen.getByText('Costo de servicio')).toBeInTheDocument();
    expect(screen.getByText('Costo de envío')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();
    expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
  });

  it('formats every amount as Colombian pesos', () => {
    renderSummary();

    expect(screen.getAllByText('$ 250.000').length).toBeGreaterThan(0);
    expect(screen.getByText('$ 5.000')).toBeInTheDocument();
    expect(screen.getByText('$ 8.000')).toBeInTheDocument();
    expect(screen.getByText('$ 263.000')).toBeInTheDocument();
  });

  it('draws the card being charged, with its brand and only the last four', () => {
    const { container } = renderSummary();

    const card = container.querySelector('.payment-card');
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent('4242');
    // La marca se ve, que era lo que se perdía cuando esto era una línea suelta.
    expect(within(card).getByRole('img', { name: /visa/i })).toBeInTheDocument();
    // El número completo nunca aparece.
    expect(screen.queryByText(/4242 4242 4242 4242/)).not.toBeInTheDocument();
    expect(card.textContent).not.toContain('4242424242424242');
  });

  it('completes the card with the holder and the expiry it was given', () => {
    const { container } = renderSummary();
    const card = container.querySelector('.payment-card');

    expect(card).toHaveTextContent('Maria Camila Guzman');
    expect(card).toHaveTextContent('12/29');
    // El CVC no se dibuja en ninguna parte: no está impreso al frente.
    expect(card.textContent).not.toContain('123');
  });

  it('keeps the card readable for a screen reader', () => {
    renderSummary();
    expect(screen.getByText('Tarjeta terminada en 4242')).toBeInTheDocument();
  });

  it('pulses the card while the charge is being processed', () => {
    const { container } = renderSummary({ loading: true });
    expect(container.querySelector('.payment-card--busy')).not.toBeNull();
  });

  it('states where the order ships to', () => {
    renderSummary();
    expect(
      screen.getByText('Calle 100 #15-20, Armenia, Quindío'),
    ).toBeInTheDocument();
  });

  it('carries the amount on the pay button', () => {
    renderSummary();
    expect(
      screen.getByRole('button', { name: /Pagar\s+\$\s*263\.000/ }),
    ).toBeInTheDocument();
  });

  it('locks both buttons and explains the wait while the charge settles', () => {
    renderSummary({ loading: true });

    expect(screen.getByRole('button', { name: /procesando pago/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByText(/no cierres esta pantalla/i)).toBeInTheDocument();
  });

  it('shows the error reported by the gateway', () => {
    renderSummary({ error: 'Tarjeta rechazada' });
    expect(screen.getByText('Tarjeta rechazada')).toBeInTheDocument();
  });

  it('goes back to the catalogue when cancelling', () => {
    const { store } = renderSummary();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(store.getState().checkout.step).toBe('product');
  });

  it('dismisses when clicking the backdrop, but not while paying', () => {
    const { store, container } = renderSummary({ loading: true });
    fireEvent.mouseDown(container.querySelector('.backdrop'));
    expect(store.getState().checkout.step).toBe('summary');
  });
});
