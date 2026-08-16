import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer, { selectProduct } from '../features/checkout/checkoutSlice';
import CheckoutModal from './CheckoutModal';

const product = { id: 'p1', name: 'Auriculares', description: 'desc', price: 25000000, stock: 5 };

function renderModal() {
  const store = configureStore({ reducer: { checkout: checkoutReducer } });
  store.dispatch(selectProduct(product));
  const utils = render(
    <Provider store={store}>
      <CheckoutModal />
    </Provider>,
  );
  return { store, ...utils };
}

const typeIn = (name, value) => {
  const input = document.querySelector(`[name="${name}"]`);
  fireEvent.change(input, { target: { value } });
  return input;
};

// La lista ya no es un <select> nativo: se abre el control y se elige la opción.
const controlOf = (name) => document.querySelector(`[data-name="${name}"]`);
const openSelect = (name) => {
  fireEvent.click(controlOf(name));
  return [...document.querySelectorAll('[role="option"]')];
};
const chooseIn = (name, label) => {
  const option = openSelect(name).find((o) => o.textContent === label);
  fireEvent.click(option);
  return option;
};
const valueOf = (name) => document.querySelector(`input[name="${name}"]`).value;

describe('CheckoutModal', () => {
  it('shows the error for a field as soon as it loses focus', () => {
    renderModal();

    const email = typeIn('email', 'maria@gmail');
    expect(screen.queryByText(/correo inválido/i)).not.toBeInTheDocument();

    fireEvent.blur(email);
    expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();
  });

  it('clears the error as soon as the value becomes valid', () => {
    renderModal();

    const email = typeIn('email', 'maria@gmail');
    fireEvent.blur(email);
    expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'maria@gmail.com' } });
    expect(screen.queryByText(/correo inválido/i)).not.toBeInTheDocument();
  });

  it('keeps the rest of the card locked until the number is complete', () => {
    renderModal();

    const locked = () => [
      document.querySelector('[name="cardHolder"]').disabled,
      controlOf('expMonth').disabled,
      controlOf('expYear').disabled,
      document.querySelector('[name="cvc"]').disabled,
    ];

    expect(locked()).toEqual([true, true, true, true]);
    expect(screen.getByText(/escribe el número completo/i)).toBeInTheDocument();

    // Un número a medias tampoco alcanza: todavía no se sabe la marca.
    typeIn('cardNumber', '424242');
    expect(locked()).toEqual([true, true, true, true]);

    typeIn('cardNumber', '4242424242424242');
    expect(locked()).toEqual([false, false, false, false]);
    expect(screen.queryByText(/escribe el número completo/i)).not.toBeInTheDocument();
  });

  it('announces how many CVC digits the detected brand needs', () => {
    renderModal();

    typeIn('cardNumber', '4242424242424242');
    expect(screen.getByText(/CVC \(3 dígitos\)/)).toBeInTheDocument();

    typeIn('cardNumber', '378282246310005');
    expect(screen.getByText(/CVC \(4 dígitos\)/)).toBeInTheDocument();
  });

  it('only offers valid months and future years for the expiry date', () => {
    renderModal();
    typeIn('cardNumber', '4242424242424242');

    const months = openSelect('expMonth').map((o) => o.textContent.slice(0, 2));
    fireEvent.keyDown(controlOf('expMonth'), { key: 'Escape' });
    const years = openSelect('expYear').map((o) => o.textContent);
    const currentYear = String(new Date().getFullYear());

    // Ya no es un campo de texto: no hay forma de escribir un mes 20.
    expect(controlOf('expMonth').tagName).toBe('BUTTON');
    expect(months).toEqual([
      '01', '02', '03', '04', '05', '06',
      '07', '08', '09', '10', '11', '12',
    ]);
    expect(years[0]).toBe(currentYear);
    expect(years.every((y) => y >= currentYear)).toBe(true);
  });

  it('disables the months already gone when the current year is chosen', () => {
    renderModal();

    const now = new Date();
    const currentYear = String(now.getFullYear() % 100).padStart(2, '0');
    const currentMonth = now.getMonth() + 1;

    typeIn('cardNumber', '4242424242424242');
    chooseIn('expYear', String(now.getFullYear()));

    const disabled = openSelect('expMonth')
      .filter((o) => o.getAttribute('aria-disabled') === 'true')
      .map((o) => Number(o.textContent.slice(0, 2)));

    expect(disabled).toEqual(
      Array.from({ length: currentMonth - 1 }, (_, i) => i + 1),
    );
  });

  it('shows the brand logo inside the card field', () => {
    renderModal();

    expect(screen.queryByRole('img', { name: /visa/i })).not.toBeInTheDocument();

    typeIn('cardNumber', '4242424242424242');

    const logo = screen.getByRole('img', { name: /visa/i });
    expect(logo).toBeInTheDocument();
    // El icono vive dentro del contenedor del input, no en una línea aparte.
    expect(logo.closest('.input-wrap')).not.toBeNull();
  });

  it('limits the CVC to the length of the detected brand', () => {
    renderModal();

    typeIn('cardNumber', '4242424242424242');
    const cvc = typeIn('cvc', '1234');
    fireEvent.blur(cvc);

    expect(screen.getByText('El CVC debe tener 3 dígitos')).toBeInTheDocument();
  });

  it('formats the card number in blocks of four while typing', () => {
    renderModal();

    const card = typeIn('cardNumber', '4242424242424242');
    expect(card.value).toBe('4242 4242 4242 4242');
  });

  it('reveals every pending error when submitting an incomplete form', () => {
    renderModal();

    fireEvent.submit(document.querySelector('form'));

    expect(screen.getByText(/revisa los campos marcados/i)).toBeInTheDocument();
    expect(screen.getByText(/ingresa el número de tu tarjeta/i)).toBeInTheDocument();
    expect(screen.getByText(/ingresa tu correo/i)).toBeInTheDocument();
  });

  it('only lists the cities of the chosen department', () => {
    renderModal();

    expect(controlOf('city').disabled).toBe(true);

    chooseIn('region', 'Quindío');

    expect(controlOf('city').disabled).toBe(false);
    const options = openSelect('city').map((o) => o.textContent);
    expect(options).toContain('Armenia');
    expect(options).not.toContain('Medellín');
  });

  it('clears the chosen city when the department changes', () => {
    renderModal();

    chooseIn('region', 'Quindío');
    chooseIn('city', 'Armenia');
    expect(valueOf('city')).toBe('Armenia');

    chooseIn('region', 'Antioquia');
    expect(valueOf('city')).toBe('');
  });

  it('closes the list right after picking an option', () => {
    renderModal();

    chooseIn('region', 'Quindío');

    // El campo iba envuelto en un <label>, que reenviaba el clic de la opción
    // al botón del select y lo volvía a abrir.
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(controlOf('region').getAttribute('aria-expanded')).toBe('false');
    expect(valueOf('region')).toBe('Quindío');
  });

  it('closes the open list with Escape without closing the modal', () => {
    const { store } = renderModal();
    typeIn('cardNumber', '4242424242424242');

    openSelect('expMonth');
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);

    fireEvent.keyDown(controlOf('expMonth'), { key: 'Escape' });

    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(store.getState().checkout.step).toBe('checkout');
  });

  it('walks the list with the arrow keys and picks with Enter', () => {
    renderModal();

    const control = controlOf('region');
    fireEvent.keyDown(control, { key: 'ArrowDown' });
    fireEvent.keyDown(control, { key: 'ArrowDown' });
    fireEvent.keyDown(control, { key: 'Enter' });

    expect(valueOf('region')).toBe('Amazonas');
  });

  it('closes when clicking the backdrop', () => {
    const { store, container } = renderModal();

    fireEvent.mouseDown(container.querySelector('.modal-overlay'));

    expect(store.getState().checkout.step).toBe('product');
  });

  it('closes with the Escape key, which the sheet needs on mobile', () => {
    const { store } = renderModal();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(store.getState().checkout.step).toBe('product');
  });
});
