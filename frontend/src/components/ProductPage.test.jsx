import { render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../features/checkout/checkoutSlice';
import ProductPage, { pickFeatured } from './ProductPage';

global.fetch = jest.fn();

const product = (over = {}) => ({
  id: 'p1',
  name: 'Auriculares',
  description: 'desc',
  price: 25000000,
  stock: 5,
  imageUrl: '/products/headphones.jpg',
  ...over,
});

function renderPage() {
  const store = configureStore({ reducer: { checkout: checkoutReducer } });
  return { store, ...render(<Provider store={store}><ProductPage /></Provider>) };
}

const grid = () => document.querySelector('.catalogue .product-grid');

describe('pickFeatured', () => {
  it('takes the most expensive products that can actually be bought', () => {
    const featured = pickFeatured([
      product({ id: 'a', name: 'Barato', price: 1000 }),
      product({ id: 'b', name: 'Caro', price: 90000 }),
      product({ id: 'c', name: 'Medio', price: 50000 }),
    ]);

    expect(featured.map((p) => p.name)).toEqual(['Caro', 'Medio', 'Barato']);
  });

  it('leaves out whatever is sold out', () => {
    const featured = pickFeatured([
      product({ id: 'a', name: 'Agotado', price: 90000, stock: 0 }),
      product({ id: 'b', name: 'Disponible', price: 1000 }),
    ]);

    expect(featured.map((p) => p.name)).toEqual(['Disponible']);
  });

  it('never shows more than four', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      product({ id: `p${i}`, name: `P${i}`, price: 1000 * i + 1000 }),
    );

    expect(pickFeatured(many)).toHaveLength(4);
  });
});

describe('ProductPage', () => {
  beforeEach(() => fetch.mockReset());

  const load = (products) =>
    fetch.mockResolvedValueOnce({ ok: true, json: async () => products });

  it('opens with the hero above everything else', async () => {
    load([product()]);
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /en tres pasos/i,
    );
  });

  it('renders the products returned by the API in the catalogue', async () => {
    load([product()]);
    renderPage();

    await waitFor(() => expect(grid()).not.toBeNull());
    expect(within(grid()).getByText('Auriculares')).toBeInTheDocument();
    expect(screen.getByText('Todo el catálogo')).toBeInTheDocument();
  });

  it('promotes the best products into the carousel', async () => {
    load([
      product({ id: 'a', name: 'Caro', price: 90000000 }),
      product({ id: 'b', name: 'Barato', price: 1000000 }),
    ]);
    renderPage();

    await waitFor(() => expect(document.querySelector('.carousel')).not.toBeNull());
    const slides = [...document.querySelectorAll('.carousel__slide h2')];
    expect(slides.map((s) => s.textContent)).toEqual(['Caro', 'Barato']);
  });

  it('counts how many products are available', async () => {
    load([product(), product({ id: 'p2', name: 'Agotado', stock: 0 })]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('1 de 2 productos disponibles')).toBeInTheDocument(),
    );
  });

  it('disables the buy button when there is no stock', async () => {
    load([product({ name: 'Sin stock', stock: 0 })]);
    renderPage();

    await waitFor(() => expect(grid()).not.toBeNull());
    expect(within(grid()).getByRole('button', { name: /comprar/i })).toBeDisabled();
  });

  it('offers a retry when the catalogue cannot be loaded', async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'caído' }) });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('caído')).toBeInTheDocument();
  });

  it('signs the page with the author and links the repository', async () => {
    load([product()]);
    renderPage();

    expect(screen.getByText('María Camila Guzmán Bello')).toBeInTheDocument();
    expect(screen.getByText('Sobre esta app')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /código en github/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/camiguzmanbello/checkout-payment-app',
    );
    // Abre fuera sin dejar acceso al opener.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
