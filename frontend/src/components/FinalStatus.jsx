import { useDispatch, useSelector } from 'react-redux';
import { backToProduct, fetchProducts } from '../features/checkout/checkoutSlice';

// ERROR no es lo mismo que DECLINED: puede haberse cobrado y no haber alcanzado
// a confirmarse. Decirle "rechazado" a alguien a quien sí le cobraron sería lo
// peor que puede hacer esta pantalla.
const OUTCOMES = {
  APPROVED: {
    tone: 'success',
    icon: '✓',
    title: '¡Pago aprobado!',
    detail: 'Tu compra quedó confirmada y el stock ya fue actualizado.',
  },
  DECLINED: {
    tone: 'failure',
    icon: '✕',
    title: 'Pago rechazado',
    detail: 'Tu banco no autorizó la transacción. Puedes intentar con otra tarjeta.',
  },
  ERROR: {
    tone: 'warning',
    icon: '!',
    title: 'No pudimos confirmar tu pago',
    detail:
      'No recibimos una respuesta definitiva del proveedor. Guarda la referencia y revisa tu estado de cuenta antes de volver a intentar.',
  },
};

export default function FinalStatus() {
  const dispatch = useDispatch();
  const { transaction, error } = useSelector((s) => s.checkout);

  const status = transaction?.status ?? 'ERROR';
  const outcome = OUTCOMES[status] ?? OUTCOMES.ERROR;

  const handleContinue = () => {
    dispatch(backToProduct());
    dispatch(fetchProducts()); // refresca stock actualizado
  };

  return (
    <div className="screen result-screen">
      <div className={`result-icon result-icon--${outcome.tone}`} aria-hidden="true">
        {outcome.icon}
      </div>
      <h1>{outcome.title}</h1>
      <p className="result-detail">{outcome.detail}</p>

      {transaction?.reference && (
        <p className="reference">
          Referencia: <strong>{transaction.reference}</strong>
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button className="btn-primary" onClick={handleContinue}>
        Volver al catálogo
      </button>
    </div>
  );
}
