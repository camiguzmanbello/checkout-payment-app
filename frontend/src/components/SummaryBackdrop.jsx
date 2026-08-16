import { useDispatch, useSelector } from 'react-redux';
import { confirmPayment, backToProduct } from '../features/checkout/checkoutSlice';
import { detectCardBrand } from '../utils/cardValidation';
import CardBrandIcon from './CardBrandIcon';

function formatCOP(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Nombres en español y con una explicación corta: "fee base" no le dice nada a
// quien está comprando.
const LINE_ITEMS = [
  {
    key: 'productAmount',
    label: 'Subtotal del producto',
    hint: 'Precio por la cantidad que elegiste',
  },
  {
    key: 'baseFee',
    label: 'Costo de servicio',
    hint: 'Procesamiento seguro del pago',
  },
  {
    key: 'deliveryFee',
    label: 'Costo de envío',
    hint: 'Entrega a la dirección que registraste',
  },
];

export default function SummaryBackdrop() {
  const dispatch = useDispatch();
  const { transaction, selectedProduct, quantity, deliveryData, cardData, loading, error } =
    useSelector((s) => s.checkout);

  if (!transaction) return null;

  const lastFour = cardData?.number?.replace(/\s+/g, '').slice(-4);
  const brand = detectCardBrand(cardData?.number ?? '');

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) dispatch(backToProduct());
      }}
    >
      <div className="backdrop-sheet" role="dialog" aria-modal="true">
        <header className="sheet-header">
          <div>
            <h2>Resumen de tu compra</h2>
            <p className="modal-subtitle">Revisa antes de pagar</p>
          </div>
        </header>

        <div className="sheet-body">
          {selectedProduct && (
            <div className="summary-product">
              {selectedProduct.imageUrl && (
                <img
                  className="summary-product__image"
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                />
              )}
              <div className="summary-product__info">
                <h3>{selectedProduct.name}</h3>
                <p className="summary-product__meta">
                  {quantity} {quantity === 1 ? 'unidad' : 'unidades'} ·{' '}
                  {formatCOP(selectedProduct.price)} c/u
                </p>
              </div>
            </div>
          )}

          <div className="summary-rows">
            {LINE_ITEMS.map((item) => (
              <div className="summary-row" key={item.key}>
                <span className="summary-row__label">
                  {item.label}
                  <small>{item.hint}</small>
                </span>
                <span className="summary-row__value">{formatCOP(transaction[item.key])}</span>
              </div>
            ))}

            <div className="summary-row summary-row--total">
              <span className="summary-row__label">Total a pagar</span>
              <span className="summary-row__value">{formatCOP(transaction.totalAmount)}</span>
            </div>
          </div>

          <dl className="summary-meta">
            {lastFour && (
              <div>
                <dt>Pagas con</dt>
                <dd>
                  {/* Antes era una línea de texto y la marca no se veía por
                      ningún lado. Ahora se dibuja la tarjeta. */}
                  <span className={`payment-card${loading ? ' payment-card--busy' : ''}`}>
                    <span className="payment-card__chip" aria-hidden="true" />
                    <CardBrandIcon brand={brand} />
                    <span className="payment-card__number">
                      <span aria-hidden="true">•••• •••• ••••</span> {lastFour}
                    </span>
                    <span className="payment-card__foot">
                      <span className="payment-card__field">
                        <small>Titular</small>
                        {cardData?.cardHolder}
                      </span>
                      {cardData?.expMonth && cardData?.expYear && (
                        <span className="payment-card__field payment-card__field--end">
                          <small>Válida hasta</small>
                          {cardData.expMonth}/{cardData.expYear}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="visually-hidden">
                    Tarjeta terminada en {lastFour}
                  </span>
                </dd>
              </div>
            )}
            {deliveryData?.address && (
              <div>
                <dt>Enviamos a</dt>
                <dd>
                  {deliveryData.address}
                  {deliveryData.city ? `, ${deliveryData.city}` : ''}
                  {deliveryData.region ? `, ${deliveryData.region}` : ''}
                </dd>
              </div>
            )}
          </dl>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {loading && (
            <p className="summary-hint">
              Estamos confirmando el pago con el proveedor. Puede tardar unos segundos,
              no cierres esta pantalla.
            </p>
          )}
        </div>

        <div className="sheet-actions">
          <button
            className="btn-primary"
            onClick={() => dispatch(confirmPayment())}
            disabled={loading}
          >
            {loading ? 'Procesando pago...' : `Pagar ${formatCOP(transaction.totalAmount)}`}
          </button>
          <button
            className="btn-secondary"
            onClick={() => dispatch(backToProduct())}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
