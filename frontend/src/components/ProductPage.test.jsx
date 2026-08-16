import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../features/checkout/checkoutSlice';
import ProductPage from './ProductPage';

global.fetch = jest.fn();

function renderWithStore() {
  const store = configureStore({ reducer: { checkout: checkoutReducer } });
  return render(
    <Provider store={store}>
      <ProductPage />
    </Provider>,
  );
}

describe('ProductPage', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it('renders the products returned by the API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'p1', name: 'Auriculares', description: 'desc', price: 25000000, stock: 5 },
      ],
    });

    renderWithStore();

    await waitFor(() => {
      expect(screen.getByText('Auriculares')).toBeInTheDocument();
    });
  });

  it('disables the buy button when there is no stock', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'p1', name: 'Sin stock', description: 'desc', price: 10000, stock: 0 },
      ],
    });

    renderWithStore();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /comprar/i })).toBeDisabled();
    });
  });
});
