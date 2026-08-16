import { useDispatch, useSelector } from 'react-redux';
import { confirmPayment, backToProduct } from '../features/checkout/checkoutSlice';

function formatCOP(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function SummaryBackdrop() {
  const dispatch = useDispatch();
  const { transaction, selectedProduct, cardData, loading, error } = useSelector(
    (s) => s.checkout,
  );

  if (!transaction) return null;

  const lastFour = cardData?.number?.replace(/\s+/g, '').slice(-4);

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) dispatch(backToProduct());
      }}
    >
      <div className="backdrop-sheet" role="dialog" aria-modal="true">
        <header className="sheet-header">
          <h2>Resumen de tu compra</h2>
          {selectedProduct && <p className="modal-subtitle">{selectedProduct.name}</p>}
        </header>

        <div className="summary-rows">
          <div className="summary-row">
            <span>Producto</span>
            <span>{formatCOP(transaction.productAmount)}</span>
          </div>
          <div className="summary-row">
            <span>Fee base</span>
            <span>{formatCOP(transaction.baseFee)}</span>
          </div>
          <div className="summary-row">
            <span>Fee de entrega</span>
            <span>{formatCOP(transaction.deliveryFee)}</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatCOP(transaction.totalAmount)}</span>
          </div>
        </div>

        {lastFour && (
          <p className="summary-card-note">
            Se cobrará a la tarjeta terminada en <strong>{lastFour}</strong>
          </p>
        )}

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

        <div className="sheet-actions">
          <button
            className="btn-primary"
            onClick={() => dispatch(confirmPayment())}
            disabled={loading}
          >
            {loading ? 'Procesando pago...' : 'Pagar ahora'}
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
