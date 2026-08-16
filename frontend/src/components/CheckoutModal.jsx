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
  EXPIRY_MONTHS,
  expiryYears,
  isMonthUnavailable,
} from '../utils/cardValidation';
import { DEPARTMENT_NAMES, citiesOf } from '../utils/colombia';
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
  cvc: (v) => v.replace(/\D/g, '').slice(0, 4),
  fullName: (v) => v.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 100),
  email: (v) => v.replace(/\s/g, '').slice(0, 150),
  phone: (v) => v.replace(/[^\d+]/g, '').slice(0, 15),
  address: (v) => v.slice(0, 200),
};

const YEARS = expiryYears();

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

  const setValue = (fieldName, value) => {
    setForm((f) => {
      const next = { ...f, [fieldName]: value };
      // Cambiar de departamento invalida la ciudad elegida antes.
      if (fieldName === 'region') next.city = '';
      // Si el año pasa a ser el actual, un mes ya vencido deja de ser válido.
      if (fieldName === 'expYear' && isMonthUnavailable(f.expMonth, value)) {
        next.expMonth = '';
      }
      return next;
    });
  };

  const update = (fieldName) => (e) => {
    const sanitize = SANITIZERS[fieldName] ?? ((v) => v);
    setValue(fieldName, sanitize(e.target.value));
  };

  const blur = (fieldName) => () =>
    setTouched((t) => ({ ...t, [fieldName]: true }));

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
        expMonth: form.expMonth,
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

  const wrap = (name, label, control, extra = null) => {
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
          {control}
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

  const input = (name, label, inputProps = {}, extra = null) =>
    wrap(
      name,
      label,
      <input
        name={name}
        value={form[name]}
        onChange={update(name)}
        onBlur={blur(name)}
        aria-invalid={Boolean(errorFor(name))}
        {...inputProps}
      />,
      extra,
    );

  const select = (name, label, options, { placeholder, disabled } = {}) =>
    wrap(
      name,
      label,
      <span className="select-wrap">
        <select
          name={name}
          className={form[name] ? '' : 'is-placeholder'}
          value={form[name]}
          onChange={update(name)}
          onBlur={blur(name)}
          aria-invalid={Boolean(errorFor(name))}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </span>,
    );

  const cvcDigits = cvcLengthFor(brand);
  const cities = citiesOf(form.region);

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
          <button type="button" className="close-btn" onClick={close} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="checkout-form" noValidate>
          <fieldset>
            <legend>Tarjeta de crédito</legend>

            {input(
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

            {input('cardHolder', 'Nombre en la tarjeta', {
              autoComplete: 'cc-name',
              placeholder: 'Como aparece en la tarjeta',
            })}

            <div className="inline-fields">
              {select(
                'expMonth',
                'Mes',
                EXPIRY_MONTHS.map((month) => ({
                  ...month,
                  disabled: isMonthUnavailable(month.value, form.expYear),
                })),
                { placeholder: 'MM' },
              )}
              {select(
                'expYear',
                'Año',
                YEARS.map((year) => ({ value: year, label: `20${year}` })),
                { placeholder: 'AA' },
              )}
              {input('cvc', 'CVC', {
                inputMode: 'numeric',
                autoComplete: 'cc-csc',
                maxLength: cvcDigits ?? 4,
                placeholder: cvcDigits === 4 ? '1234' : '123',
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Datos de entrega</legend>

            {input('fullName', 'Nombre completo', { autoComplete: 'name' })}
            {input('email', 'Email', {
              type: 'email',
              autoComplete: 'email',
              placeholder: 'tucorreo@dominio.com',
            })}
            {input('phone', 'Teléfono', {
              inputMode: 'tel',
              autoComplete: 'tel',
              placeholder: '+57 300 000 0000',
            })}
            {input('address', 'Dirección', {
              autoComplete: 'street-address',
              placeholder: 'Calle 100 #15-20 Apto 401',
            })}

            <div className="inline-fields inline-fields--halves">
              {select(
                'region',
                'Departamento',
                DEPARTMENT_NAMES.map((name) => ({ value: name, label: name })),
                { placeholder: 'Elige tu departamento' },
              )}
              {select(
                'city',
                'Ciudad',
                cities.map((name) => ({ value: name, label: name })),
                {
                  placeholder: form.region ? 'Elige tu ciudad' : 'Elige antes el departamento',
                  disabled: !form.region,
                },
              )}
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
