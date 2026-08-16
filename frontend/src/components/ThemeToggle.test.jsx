import { render, screen, fireEvent, act } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

// jsdom no trae matchMedia: se simula para poder cambiar la preferencia del
// sistema a mitad del test.
function mockSystemTheme(dark) {
  const listeners = new Set();
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }));
  return (nowDark) => act(() => listeners.forEach((fn) => fn({ matches: nowDark })));
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockSystemTheme(false);
  });

  it('follows the system preference until someone chooses', () => {
    mockSystemTheme(true);
    render(<ThemeToggle />);

    // Sin elección propia no se fija ningún atributo: manda el CSS del sistema.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('reacts to the system flipping to dark', () => {
    const flip = mockSystemTheme(false);
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /modo oscuro/i })).toBeInTheDocument();

    flip(true);

    expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
  });

  it('pins dark mode when chosen and remembers it', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('checkout_theme')).toBe('dark');
  });

  it('goes back to light on a second press', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('checkout_theme')).toBe('light');
  });

  it('restores the saved choice over the system preference', () => {
    localStorage.setItem('checkout_theme', 'light');
    mockSystemTheme(true);

    render(<ThemeToggle />);

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('still works when storage is unavailable', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    render(<ThemeToggle />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');

    setItem.mockRestore();
  });
});
