import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, selectProduct, setQuantity } from '../features/checkout/checkoutSlice';

function formatCOP(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
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
        <h2>{product.name}</h2>
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

  return (
    <div className="screen">
      <header className="page-header">
        <p className="eyebrow">Tienda</p>
        <h1>Nuestro catálogo</h1>
        <p className="page-subtitle">
          {loading && products.length === 0
            ? 'Cargando productos...'
            : `${available} de ${products.length} productos disponibles`}
        </p>
      </header>

      {error && (
        <div className="state-msg state-msg--error" role="alert">
          <p>No pudimos cargar el catálogo.</p>
          <p className="state-detail">{error}</p>
          <button className="btn-secondary" onClick={() => dispatch(fetchProducts())}>
            Reintentar
          </button>
        </div>
      )}

      {loading && products.length === 0 && !error && (
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
      )}

      {products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onBuy={handleBuy} />
          ))}
        </div>
      )}
    </div>
  );
}
