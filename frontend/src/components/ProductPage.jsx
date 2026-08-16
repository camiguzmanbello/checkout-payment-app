import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, selectProduct, setQuantity } from '../features/checkout/checkoutSlice';
import FeaturedCarousel from './FeaturedCarousel';
import SiteFooter from './SiteFooter';

function formatCOP(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Destacados: lo más caro que sí se puede comprar. Es una regla explicable y
// estable, sin necesidad de una bandera "featured" en la base de datos.
const FEATURED_COUNT = 4;

export function pickFeatured(products) {
  return [...products]
    .filter((product) => product.stock > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, FEATURED_COUNT);
}

function ProductCard({ product, onBuy }) {
  const soldOut = product.stock === 0;
  const lastUnits = !soldOut && product.stock <= 5;

  return (
    <article className={`product-card${soldOut ? ' product-card--sold-out' : ''}`}>
      <div className="product-media">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        )}
        {soldOut && <span className="badge badge--muted">Agotado</span>}
        {lastUnits && <span className="badge badge--accent">Últimas {product.stock}</span>}
      </div>

      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>

        <div className="product-footer">
          <div>
            <p className="product-price">{formatCOP(product.price)}</p>
            <p className="product-stock">
              {soldOut ? 'Sin unidades' : `${product.stock} disponibles`}
            </p>
          </div>
          <button
            className="btn-primary btn-compact"
            disabled={soldOut}
            onClick={() => onBuy(product)}
          >
            Comprar
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ProductPage() {
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector((s) => s.checkout);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleBuy = (product) => {
    dispatch(setQuantity(1));
    dispatch(selectProduct(product));
  };

  const available = products.filter((p) => p.stock > 0).length;
  const featured = pickFeatured(products);
  const firstLoad = loading && products.length === 0;

  const intro = (
    <>
      <p className="eyebrow">Tienda en línea</p>
      <h1>
        Lo que necesitas para tu escritorio,
        <span className="hero__accent"> en tres pasos</span>
      </h1>
      <p className="hero__lead">
        Elige, paga con tu tarjeta y listo. Sin cuentas ni pasos de más.
      </p>
    </>
  );

  return (
    <div className="page">
      {/* El titular vive sobre el carrusel a sangre: no hay bloque de texto
          suelto que deje media pantalla vacía al costado. Si todavía no hay
          destacados, cae a un encabezado normal para no quedarse sin h1. */}
      {featured.length > 0 ? (
        <section className="showcase">
          <FeaturedCarousel products={featured} onBuy={handleBuy} />
          <div className="showcase__intro">
            <header className="showcase__copy">{intro}</header>
          </div>
        </section>
      ) : (
        <header className="hero">{intro}</header>
      )}

      <div className="landing">
      {error && (
        <div className="state-msg state-msg--error" role="alert">
          <p>No pudimos cargar el catálogo.</p>
          <p className="state-detail">{error}</p>
          <button className="btn-secondary" onClick={() => dispatch(fetchProducts())}>
            Reintentar
          </button>
        </div>
      )}

      {firstLoad && !error && (
        <>
          <div className="carousel carousel--skeleton" />
          <div className="product-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="product-card product-card--skeleton" key={i}>
                <div className="product-media" />
                <div className="product-body">
                  <span className="skeleton-line" />
                  <span className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {products.length > 0 && (
        <section className="catalogue">
          <div className="section-head">
            <h2>Todo el catálogo</h2>
            <p className="page-subtitle">
              {available} de {products.length} productos disponibles
            </p>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onBuy={handleBuy} />
            ))}
          </div>
        </section>
      )}

        <SiteFooter />
      </div>
    </div>
  );
}
