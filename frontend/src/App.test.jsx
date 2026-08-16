import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from './features/checkout/checkoutSlice';
import App from './App';

global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => [] }));

const product = { id: 'p1', name: 'Auriculares', description: 'desc', price: 25000000, stock: 5 };

const transaction = {
  id: 't1',
  reference: 'TXN-1',
  status: 'APPROVED',
  productAmount: 25000000,
  baseFee: 500000,
  deliveryFee: 800000,
  totalAmount: 26300000,
};

function renderApp(step) {
  const store = configureStore({
    reducer: { checkout: checkoutReducer },
    preloadedState: {
      checkout: {
        step,
        products: [product],
        selectedProduct: product,
        quantity: 1,
        cardData: null,
        deliveryData: null,
        customerData: null,
        transaction,
        loading: false,
        error: null,
      },
    },
  });
  return render(<Provider store={store}><App /></Provider>);
}

const catalogue = () => screen.queryByText('Nuestro catálogo');

describe('App', () => {
  it('shows only the catalogue on the first step', () => {
    const { container } = renderApp('product');

    expect(catalogue()).toBeInTheDocument();
    expect(container.querySelector('.modal-overlay')).toBeNull();
    expect(container.querySelector('.result-screen')).toBeNull();
  });

  it('layers the payment modal over the catalogue', () => {
    const { container } = renderApp('checkout');

    expect(catalogue()).toBeInTheDocument();
    expect(container.querySelector('.modal-overlay')).not.toBeNull();
  });

  it('layers the summary over the catalogue', () => {
    const { container } = renderApp('summary');

    expect(catalogue()).toBeInTheDocument();
    expect(container.querySelector('.backdrop-sheet')).not.toBeNull();
  });

  // El resultado solía apilarse debajo del catálogo y se veían las dos a la vez.
  it('replaces the view with the result, leaving no catalogue behind it', () => {
    const { container } = renderApp('result');

    expect(catalogue()).not.toBeInTheDocument();
    expect(container.querySelector('.result-screen')).not.toBeNull();
  });
});
