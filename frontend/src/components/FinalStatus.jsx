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
  // El backend reserva el stock antes de cobrar, así que acá se sabe con
  // certeza que no hubo cobro. No hay nada que reconciliar y la referencia
  // sobraría: mostrarla invitaría a buscar un movimiento que no existe.
  OUT_OF_STOCK: {
    tone: 'failure',
    icon: '✕',
    title: 'Se agotó mientras pagabas',
    detail:
      'Este producto se agotó mientras completabas tu compra. No se realizó ningún cobro.',
    hideReference: true,
  },
};

export default function FinalStatus() {
  const dispatch = useDispatch();
  const { transaction, error, outOfStock } = useSelector((s) => s.checkout);

  // El rechazo por stock no deja rastro en la transacción — sigue PENDING,
  // porque nunca se cobró — así que el desenlace no se puede leer de ahí.
  const status = outOfStock ? 'OUT_OF_STOCK' : transaction?.status ?? 'ERROR';
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

      {transaction?.reference && !outcome.hideReference && (
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
