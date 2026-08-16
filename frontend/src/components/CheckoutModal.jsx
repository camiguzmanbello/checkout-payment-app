import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setCardData,
  setDeliveryData,
  setCustomerData,
  submitCheckoutInfo,
  backToProduct,
} from '../features/checkout/checkoutSlice';
import {
  detectCardBrand,
  formatCardNumber,
  cvcLengthFor,
  validateField,
  validateForm,
} from '../utils/cardValidation';
import CardBrandIcon from './CardBrandIcon';

const EMPTY_FORM = {
  cardNumber: '',
  cardHolder: '',
  expMonth: '',
  expYear: '',
  cvc: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  region: '',
};

// Cada campo se limpia mientras se escribe, para que no entre nada con formato
// inválido en primer lugar: sin letras en los números, sin dígitos en nombres.
const SANITIZERS = {
  cardNumber: (v) => formatCardNumber(v),
  cardHolder: (v) => v.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 100),
  expMonth: (v) => v.replace(/\D/g, '').slice(0, 2),
  expYear: (v) => v.replace(/\D/g, '').slice(0, 2),
  cvc: (v) => v.replace(/\D/g, '').slice(0, 4),
  fullName: (v) => v.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 100),
  email: (v) => v.replace(/\s/g, '').slice(0, 150),
  phone: (v) => v.replace(/[^\d+]/g, '').slice(0, 15),
  address: (v) => v.slice(0, 200),
  city: (v) => v.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 80),
  region: (v) => v.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 80),
};

export default function CheckoutModal() {
  const dispatch = useDispatch();
  const { selectedProduct, loading, error } = useSelector((s) => s.checkout);

  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const close = () => dispatch(backToProduct());

  // Cerrar con Escape: en móvil el botón ✕ puede quedar fuera de la pantalla
  // al hacer scroll, así que nunca debe ser la única salida.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const brand = detectCardBrand(form.cardNumber);
  const errors = validateForm(form);
  const formValid = Object.keys(errors).length === 0;

  // El error aparece apenas el campo pierde el foco o al intentar enviar, no
  // después de haber llenado todo el formulario.
  const errorFor = (field) =>
    (touched[field] || submitted) && errors[field] ? errors[field] : null;

  const update = (field) => (e) => {
    const sanitize = SANITIZERS[field] ?? ((v) => v);
    const value = sanitize(e.target.value);
    setForm((f) => ({ ...f, [field]: value }));

    // Si el campo ya estaba marcado en error, revalidarlo en vivo permite ver
    // el momento exacto en que queda correcto.
    if (touched[field]) {
      setTouched((t) => ({ ...t, [field]: true }));
    }
  };

  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!formValid) {
      const firstInvalid = Object.keys(errors)[0];
      document.querySelector(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    dispatch(
      setCardData({
        number: form.cardNumber,
        cvc: form.cvc,
        expMonth: form.expMonth.padStart(2, '0'),
        expYear: form.expYear,
        cardHolder: form.cardHolder,
      }),
    );
    dispatch(
      setCustomerData({ fullName: form.fullName, email: form.email, phone: form.phone }),
    );
    dispatch(
      setDeliveryData({
        address: form.address,
        city: form.city,
        region: form.region,
        phone: form.phone,
      }),
    );

    dispatch(
      submitCheckoutInfo({
        customer: { fullName: form.fullName, email: form.email, phone: form.phone },
        delivery: {
          address: form.address,
          city: form.city,
          region: form.region,
          phone: form.phone,
        },
      }),
    );
  };

  if (!selectedProduct) return null;

  const field = (name, label, inputProps = {}, extra = null) => {
    const fieldError = errorFor(name);
    const classes = [
      'field',
      fieldError ? 'field--invalid' : '',
      extra ? 'field--with-icon' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label className={classes}>
        <span className="field-label">{label}</span>
        <span className="input-wrap">
          <input
            name={name}
            value={form[name]}
            onChange={update(name)}
            onBlur={blur(name)}
            aria-invalid={Boolean(fieldError)}
            {...inputProps}
          />
          {extra}
        </span>
        {fieldError && (
          <span className="field-error" role="alert">
            {fieldError}
          </span>
        )}
      </label>
    );
  };

  const cvcDigits = cvcLengthFor(brand);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) close();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Pagar con tarjeta">
        <header className="modal-header">
          <div>
            <h2>Pagar con tarjeta</h2>
            <p className="modal-subtitle">{selectedProduct.name}</p>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={close}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="checkout-form" noValidate>
          <fieldset>
            <legend>Tarjeta de crédito</legend>

            {field(
              'cardNumber',
              'Número de tarjeta',
              {
                inputMode: 'numeric',
                autoComplete: 'cc-number',
                maxLength: 23, // 19 dígitos + 4 espacios de formato
                placeholder: '4242 4242 4242 4242',
              },
              <CardBrandIcon brand={brand} />,
            )}

            {field('cardHolder', 'Nombre en la tarjeta', {
              autoComplete: 'cc-name',
              placeholder: 'Como aparece en la tarjeta',
            })}

            <div className="inline-fields">
              {field('expMonth', 'Mes', {
                inputMode: 'numeric',
                autoComplete: 'cc-exp-month',
                maxLength: 2,
                placeholder: 'MM',
              })}
              {field('expYear', 'Año', {
                inputMode: 'numeric',
                autoComplete: 'cc-exp-year',
                maxLength: 2,
                placeholder: 'AA',
              })}
              {field('cvc', 'CVC', {
                inputMode: 'numeric',
                autoComplete: 'cc-csc',
                maxLength: cvcDigits ?? 4,
                placeholder: cvcDigits === 4 ? '1234' : '123',
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Datos de entrega</legend>

            {field('fullName', 'Nombre completo', { autoComplete: 'name' })}
            {field('email', 'Email', {
              type: 'email',
              autoComplete: 'email',
              placeholder: 'tucorreo@dominio.com',
            })}
            {field('phone', 'Teléfono', {
              inputMode: 'tel',
              autoComplete: 'tel',
              placeholder: '+57 300 000 0000',
            })}
            {field('address', 'Dirección', { autoComplete: 'street-address' })}

            <div className="inline-fields">
              {field('city', 'Ciudad', { autoComplete: 'address-level2' })}
              {field('region', 'Departamento', { autoComplete: 'address-level1' })}
            </div>
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {submitted && !formValid && (
            <p className="form-error" role="alert">
              Revisa los campos marcados en rojo.
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Procesando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
