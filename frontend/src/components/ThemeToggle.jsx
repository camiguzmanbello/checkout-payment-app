import { useEffect, useState } from 'react';

const STORAGE_KEY = 'checkout_theme';

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const savedTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // almacenamiento no disponible: manda el sistema
  }
};

// Por defecto se sigue la preferencia del sistema; el botón solo entra a mandar
// cuando la persona elige, y esa elección sí se recuerda.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => savedTheme() ?? (systemPrefersDark() ? 'dark' : 'light'));
  const [pinned, setPinned] = useState(() => savedTheme() !== null);

  useEffect(() => {
    if (pinned) {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme, pinned]);

  // Mientras no se haya elegido nada, se sigue al sistema en vivo.
  useEffect(() => {
    if (pinned || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [pinned]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setPinned(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento el cambio dura lo que la sesión */
    }
  };

  const goingDark = theme !== 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      aria-label={goingDark ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={goingDark ? 'Modo oscuro' : 'Modo claro'}
    >
      <span aria-hidden="true">{goingDark ? '☾' : '☀'}</span>
    </button>
  );
}
