import {
  cardLengthFor,
  cardInputLengthFor,
  isValidCardNumber,
  detectCardBrand,
  isValidExpiry,
  isValidCVC,
  cvcLengthFor,
  isValidEmail,
  formatCardNumber,
  validateField,
  validateForm,
} from './cardValidation';

const now = new Date();
const currentYear = String(now.getFullYear() % 100).padStart(2, '0');
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const nextYear = String((now.getFullYear() % 100) + 1).padStart(2, '0');

describe('isValidCardNumber', () => {
  it('accepts a valid Visa number (Luhn)', () => {
    expect(isValidCardNumber('4242424242424242')).toBe(true);
  });

  it('accepts a number that still carries its formatting spaces', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
  });

  it('rejects a number with an invalid check digit', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
  });

  it('rejects strings with letters', () => {
    expect(isValidCardNumber('4242abcd4242abcd')).toBe(false);
  });
});

describe('detectCardBrand', () => {
  it('detects Visa by the leading 4', () => {
    expect(detectCardBrand('4111111111111111')).toBe('visa');
  });

  it('detects MasterCard by the 51-55 range', () => {
    expect(detectCardBrand('5500000000000004')).toBe('mastercard');
  });

  it('detects Amex by the 34/37 prefix', () => {
    expect(detectCardBrand('378282246310005')).toBe('amex');
  });

  it('returns unknown for unsupported prefixes', () => {
    expect(detectCardBrand('6011000000000004')).toBe('unknown');
  });
});

describe('isValidExpiry', () => {
  it('rejects a date already in the past', () => {
    expect(isValidExpiry('01', '20')).toBe(false);
  });

  it('accepts a date in the future', () => {
    expect(isValidExpiry('12', nextYear)).toBe(true);
  });

  it('accepts the month currently running', () => {
    expect(isValidExpiry(currentMonth, currentYear)).toBe(true);
  });

  it('rejects a month out of range', () => {
    expect(isValidExpiry('13', nextYear)).toBe(false);
  });

  it('rejects a year that is obviously a typo', () => {
    expect(isValidExpiry('12', '99')).toBe(false);
  });
});

describe('CVC length per brand', () => {
  it('expects 3 digits for Visa and MasterCard', () => {
    expect(cvcLengthFor('visa')).toBe(3);
    expect(isValidCVC('123', 'visa')).toBe(true);
    expect(isValidCVC('1234', 'visa')).toBe(false);
  });

  it('expects 4 digits for Amex', () => {
    expect(cvcLengthFor('amex')).toBe(4);
    expect(isValidCVC('1234', 'amex')).toBe(true);
    expect(isValidCVC('123', 'amex')).toBe(false);
  });

  it('accepts 3 or 4 digits while the brand is still unknown', () => {
    expect(isValidCVC('123')).toBe(true);
    expect(isValidCVC('1234')).toBe(true);
  });

  it('rejects letters', () => {
    expect(isValidCVC('12a')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it.each([
    'mcamiguzman@gmail.com',
    'maria.camila+tienda@empresa.com.co',
    'a_b-c@sub.dominio.org',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ['no arroba', 'mcamiguzmangmail.com'],
    ['sin dominio', 'maria@'],
    ['sin TLD', 'maria@gmail'],
    ['TLD de una letra', 'maria@gmail.c'],
    ['puntos dobles', 'maria..camila@gmail.com'],
    ['con espacios', 'maria camila@gmail.com'],
  ])('rejects %s', (_case, email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('formatCardNumber', () => {
  it('groups digits in blocks of four', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('groups Amex as 4-6-5, the way it is printed', () => {
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
  });

  it('drops anything that is not a digit', () => {
    expect(formatCardNumber('4242-abc-4242')).toBe('4242 4242');
  });

  // El campo daba cabida a 19 dígitos, y ninguna marca que aceptamos los usa.
  it('stops at the length of the brand', () => {
    expect(formatCardNumber('4242424242424242999')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('378282246310005999')).toBe('3782 822463 10005');
  });

  it('reports the length each brand needs', () => {
    expect(cardLengthFor('visa')).toBe(16);
    expect(cardLengthFor('mastercard')).toBe(16);
    expect(cardLengthFor('amex')).toBe(15);
    expect(cardInputLengthFor('visa')).toBe(19); // 16 dígitos + 3 espacios
    expect(cardInputLengthFor('amex')).toBe(17); // 15 dígitos + 2 espacios
  });
});

describe('validateField', () => {
  const validForm = {
    cardNumber: '4242 4242 4242 4242',
    cardHolder: 'Maria Camila Guzman',
    expMonth: '12',
    expYear: nextYear,
    cvc: '123',
    fullName: 'Maria Camila Guzman',
    email: 'mcamiguzman@gmail.com',
    phone: '+573001234567',
    address: 'Calle 100 #15-20',
    city: 'Bogotá D.C.',
    region: 'Cundinamarca',
  };

  it('returns null for every field of a valid form', () => {
    expect(validateForm(validForm)).toEqual({});
  });

  it('rejects a number shorter than its brand needs', () => {
    const form = { ...validForm, cardNumber: '4242 4242 4242' };
    expect(validateField('cardNumber', form.cardNumber, form)).toMatch(/16 dígitos/);
  });

  it('states the 15 digits of Amex', () => {
    const form = { ...validForm, cardNumber: '3782 822463 1000' };
    expect(validateField('cardNumber', form.cardNumber, form)).toMatch(/15 dígitos/);
  });

  it('accepts a well formed Amex number', () => {
    const form = { ...validForm, cardNumber: '3782 822463 10005', cvc: '1234' };
    expect(validateField('cardNumber', form.cardNumber, form)).toBeNull();
  });

  it('asks for the card number when it is empty', () => {
    expect(validateField('cardNumber', '', { ...validForm, cardNumber: '' })).toMatch(
      /ingresa el número/i,
    );
  });

  it('reports an expired card', () => {
    const form = { ...validForm, expMonth: '01', expYear: '20' };
    expect(validateField('expYear', '20', form)).toMatch(/vencida/i);
  });

  it('reports the CVC length expected by the detected brand', () => {
    const form = { ...validForm, cvc: '1234' };
    expect(validateField('cvc', '1234', form)).toMatch(/3 dígitos/);
  });

  it('reports a malformed email', () => {
    const form = { ...validForm, email: 'maria@gmail' };
    expect(validateField('email', 'maria@gmail', form)).toMatch(/correo inválido/i);
  });

  it('rejects a city that does not belong to the chosen department', () => {
    const form = { ...validForm, region: 'Antioquia', city: 'Bogotá D.C.' };
    expect(validateField('city', form.city, form)).toMatch(/no pertenece a Antioquia/);
  });

  it('asks for the department before the city', () => {
    const form = { ...validForm, region: '', city: '' };
    expect(validateField('city', '', form)).toMatch(/primero el departamento/i);
  });

  it('rejects a department that is not on the list', () => {
    const form = { ...validForm, region: 'Cundinamarka' };
    expect(validateField('region', form.region, form)).toMatch(/no válido/i);
  });

  it('collects one error per invalid field', () => {
    const errors = validateForm({
      ...validForm,
      email: 'nope',
      phone: '12',
      city: '',
    });

    expect(Object.keys(errors).sort()).toEqual(['city', 'email', 'phone']);
  });
});
