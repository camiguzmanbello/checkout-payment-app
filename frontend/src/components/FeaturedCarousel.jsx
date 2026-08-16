import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 6000;

function formatCOP(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El carrusel es scroll con scroll-snap, no una pila de transforms: en el
// teléfono se desliza con el dedo como cualquier scroll nativo, y los botones
// y los puntos solo mueven ese mismo scroll. Sin librerías.
export default function FeaturedCarousel({ products, onBuy }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = products.length;

  const goTo = useCallback((next) => {
    const track = trackRef.current;
    if (!track) return;
    const target = ((next % total) + total) % total;
    const slide = track.children[target];
    // scrollTo no existe en jsdom; el índice igual queda actualizado.
    track.scrollTo?.({ left: slide?.offsetLeft ?? 0, behavior: 'smooth' });
    setIndex(target);
  }, [total]);

  // El scroll manda: si se desliza con el dedo, el punto activo lo sigue.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth || 1;
    setIndex(Math.round(track.scrollLeft / width));
  };

  useEffect(() => {
    if (paused || total < 2 || prefersReducedMotion()) return undefined;
    const timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, paused, total, goTo]);

  if (total === 0) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <section
      className="carousel"
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div className="carousel__track" ref={trackRef} onScroll={onScroll} tabIndex={0}>
        {products.map((product, i) => (
          <article
            className="carousel__slide"
            key={product.id}
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}: ${product.name}`}
            aria-hidden={i !== index}
          >
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} loading={i === 0 ? 'eager' : 'lazy'} />
            )}
            <div className="carousel__copy">
              <p className="carousel__eyebrow">Destacado</p>
              <h2>{product.name}</h2>
              <p className="carousel__description">{product.description}</p>
              <div className="carousel__actions">
                <span className="carousel__price">{formatCOP(product.price)}</span>
                <button
                  className="btn-primary btn-compact"
                  onClick={() => onBuy(product)}
                  tabIndex={i === index ? 0 : -1}
                >
                  Comprar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="carousel__arrow carousel__arrow--prev"
        onClick={() => goTo(index - 1)}
        aria-label="Anterior"
      >
        ‹
      </button>
      <button
        type="button"
        className="carousel__arrow carousel__arrow--next"
        onClick={() => goTo(index + 1)}
        aria-label="Siguiente"
      >
        ›
      </button>

      <div className="carousel__dots" role="tablist" aria-label="Elegir destacado">
        {products.map((product, i) => (
          <button
            type="button"
            key={product.id}
            role="tab"
            aria-selected={i === index}
            aria-label={product.name}
            className={`carousel__dot${i === index ? ' is-active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
