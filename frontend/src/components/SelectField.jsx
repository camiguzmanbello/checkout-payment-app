import { useEffect, useId, useRef, useState } from 'react';

// El desplegable nativo lo dibuja el sistema operativo y el CSS no lo alcanza,
// así que la lista se implementa a mano para que tenga el tamaño y el aire del
// resto del diseño. A cambio hay que sostener el teclado y ARIA nosotros.
export default function SelectField({
  name,
  labelId,
  value,
  options,
  placeholder,
  disabled = false,
  invalid = false,
  onChange,
  onBlur,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();

  const selected = options.find((option) => option.value === value);
  const selectable = (index) => options[index] && !options[index].disabled;

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
    onBlur?.();
  };

  const choose = (option) => {
    if (option.disabled) return;
    onChange?.(option.value);
    close();
  };

  const move = (delta) => {
    const start = activeIndex === -1 ? options.findIndex((o) => o.value === value) : activeIndex;
    let next = start;
    for (let i = 0; i < options.length; i += 1) {
      next = (next + delta + options.length) % options.length;
      if (selectable(next)) break;
    }
    setActiveIndex(next);
  };

  // Búsqueda al teclear, como hacía el select nativo: escribir "c" salta a
  // Caldas y seguir con "au" afina a Cauca. La secuencia se reinicia al segundo.
  const TYPEAHEAD_MS = 1000;

  const normalize = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // "Quindío" debe encontrarse con "qui"

  const typeahead = (char) => {
    const now = Date.now();
    const query =
      now - typed.current.at > TYPEAHEAD_MS ? char : typed.current.text + char;
    typed.current = { text: query, at: now };

    const needle = normalize(query);
    let index = options.findIndex(
      (option, i) => selectable(i) && normalize(String(option.label)).startsWith(needle),
    );

    // Repetir la misma letra recorre las opciones que empiezan por ella.
    if (index === -1 && query.length > 1 && new Set(query).size === 1) {
      typed.current = { text: char, at: now };
      index = options.findIndex(
        (option, i) =>
          selectable(i) && normalize(String(option.label)).startsWith(normalize(char)),
      );
    }

    if (index === -1) return;

    setActiveIndex(index);
    if (!open) setOpen(true);
  };

  // Cerrar al tocar fuera: sin esto la lista se queda abierta encima del resto
  // del formulario.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  });

  const onKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        // Sin esto el Escape sigue subiendo y el modal entero se cierra: la
        // primera pulsación debe cerrar solo la lista.
        e.stopPropagation();
        close();
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (activeIndex >= 0) choose(options[activeIndex]);
      return;
    }

    if (e.key === 'Tab' && open) {
      close();
      return;
    }

    // Cualquier carácter imprimible alimenta la búsqueda.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      typeahead(e.key);
    }
  };

  // La opción activa siempre visible: sin esto la búsqueda encuentra el
  // departamento pero se queda fuera del área con scroll.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.children[activeIndex];
    node?.scrollIntoView?.({ block: 'nearest' }); // jsdom no lo implementa
  }, [open, activeIndex]);

  return (
    <span className="select" ref={rootRef}>
      <button
        type="button"
        className={`select__control${selected ? '' : ' is-placeholder'}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-invalid={invalid}
        aria-labelledby={labelId}
        disabled={disabled}
        data-name={name}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
      >
        <span className="select__value">{selected ? selected.label : placeholder}</span>
        <span className="select__arrow" aria-hidden="true" />
      </button>

      {open && (
        <ul className="select__list" role="listbox" id={listId} ref={listRef}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              className={[
                'select__option',
                option.value === value ? 'is-selected' : '',
                index === activeIndex ? 'is-active' : '',
                option.disabled ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {/* Conserva el valor bajo el nombre del campo, como haría un select. */}
      <input type="hidden" name={name} value={value} readOnly />
    </span>
  );
}
