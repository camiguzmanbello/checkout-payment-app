// Algoritmo de Luhn para validar el número de tarjeta
export function isValidCardNumber(rawNumber) {
  const digits = rawNumber.replace(/\s+/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// Detección de marca por prefijo (suficiente para Visa/MasterCard/Amex)
export function detectCardBrand(rawNumber) {
  const digits = rawNumber.replace(/\s+/g, '');

  if (/^4/.test(digits)) return 'visa';

  if (
    /^5[1-5]/.test(digits) ||
    /^2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[0-1]\d|720)/.test(digits)
  ) {
    return 'mastercard';
  }

  if (/^3[47]/.test(digits)) return 'amex';

  return 'unknown';
}

// Amex usa 4 dígitos; el resto de marcas, 3. Sin marca todavía aceptamos ambos
// para no marcar error mientras la persona apenas empieza a escribir.
export function cvcLengthFor(brand) {
  if (brand === 'amex') return 4;
  if (brand === 'unknown') return null;
  return 3;
}

export function isValidCVC(cvc, brand = 'unknown') {
  const expected = cvcLengthFor(brand);
  if (expected === null) return /^\d{3,4}$/.test(cvc);
  return new RegExp(`^\\d{${expected}}$`).test(cvc);
}

export function isValidExpiry(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!m || !y || m < 1 || m > 12) return false;
  if (!/^\d{1,2}$/.test(String(month)) || !/^\d{2}$/.test(String(year))) return false;

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  // Solo futuro: el mes en curso todavía cuenta como vigente.
  if (y < currentYear) return false;
  if (y === currentYear && m < currentMonth) return false;

  // Más de 20 años adelante es casi seguro un tecleo equivocado.
  if (y > currentYear + 20) return false;

  return true;
}

export function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

// Formato de correo: parte local, dominio con al menos un punto y TLD de 2+
// letras. Rechaza los errores típicos (sin @, sin dominio, .c, puntos dobles).
const EMAIL_RE =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email) {
  const value = String(email).trim();
  if (value.length > 150 || value.includes('..')) return false;
  return EMAIL_RE.test(value);
}

// Errores por campo. Devuelve null cuando el campo está bien, para que la UI
// pueda mostrarlos uno a uno a medida que la persona escribe.
export function validateField(field, value, form = {}) {
  const text = String(value ?? '').trim();
  const brand = detectCardBrand(form.cardNumber ?? '');

  switch (field) {
    case 'cardNumber':
      if (!text) return 'Ingresa el número de tu tarjeta';
      if (!isValidCardNumber(text)) return 'Número de tarjeta inválido';
      if (brand === 'unknown') return 'Solo aceptamos Visa, MasterCard y Amex';
      return null;

    case 'cardHolder':
      if (!text) return 'Ingresa el nombre que aparece en la tarjeta';
      if (text.length < 3) return 'Nombre demasiado corto';
      return null;

    case 'expMonth':
    case 'expYear': {
      if (!form.expMonth || !form.expYear) return 'Completa mes y año';
      const month = parseInt(form.expMonth, 10);
      if (!month || month < 1 || month > 12) return 'El mes debe estar entre 01 y 12';
      if (!isValidExpiry(form.expMonth, form.expYear)) return 'La tarjeta está vencida';
      return null;
    }

    case 'cvc': {
      const expected = cvcLengthFor(brand);
      if (!text) return 'Ingresa el CVC';
      if (!isValidCVC(text, brand)) {
        return expected
          ? `El CVC debe tener ${expected} dígitos`
          : 'El CVC debe tener 3 o 4 dígitos';
      }
      return null;
    }

    case 'fullName':
      if (!text) return 'Ingresa tu nombre completo';
      if (text.length < 3) return 'Nombre demasiado corto';
      return null;

    case 'email':
      if (!text) return 'Ingresa tu correo';
      if (!isValidEmail(text)) return 'Correo inválido, revisa el formato';
      return null;

    case 'phone':
      if (!text) return 'Ingresa tu teléfono';
      if (!/^\+?\d{7,15}$/.test(text)) return 'El teléfono debe tener entre 7 y 15 dígitos';
      return null;

    case 'address':
      if (!text) return 'Ingresa tu dirección';
      if (text.length < 5) return 'Dirección demasiado corta';
      return null;

    case 'city':
      if (!text) return 'Ingresa tu ciudad';
      if (text.length < 2) return 'Ciudad demasiado corta';
      return null;

    case 'region':
      if (!text) return 'Ingresa tu departamento';
      if (text.length < 2) return 'Departamento demasiado corto';
      return null;

    default:
      return null;
  }
}

export const FORM_FIELDS = [
  'cardNumber',
  'cardHolder',
  'expMonth',
  'expYear',
  'cvc',
  'fullName',
  'email',
  'phone',
  'address',
  'city',
  'region',
];

export function validateForm(form) {
  return FORM_FIELDS.reduce((errors, field) => {
    const error = validateField(field, form[field], form);
    if (error) errors[field] = error;
    return errors;
  }, {});
}
