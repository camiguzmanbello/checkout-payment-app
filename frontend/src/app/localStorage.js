const STORAGE_KEY = 'checkout_state_v1';

export function loadState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    const parsed = JSON.parse(serialized);
    // nunca recuperamos datos de tarjeta desde localStorage
    const checkout = { ...parsed, cardData: null, loading: false, error: null };

    // El resumen es el único paso que necesita la tarjeta para avanzar, y la
    // tarjeta es justamente lo que no sobrevive al refresh. Recargar ahí dejaba
    // un botón "Pagar" que reventaba al leer cardData.number y terminaba en la
    // pantalla de "no pudimos confirmar tu pago" sin haber cobrado nada.
    // Volvemos al formulario, que es el único paso capaz de reponerla, y
    // soltamos la transacción vieja: quedó en PENDING y el submit crea una nueva.
    if (checkout.step === 'summary') {
      checkout.step = 'checkout';
      checkout.transaction = null;
      checkout.cardReentryNeeded = true;
    }

    return { checkout };
  } catch {
    return undefined;
  }
}

export function saveState(state) {
  try {
    // no persistimos cardData: es sensible y no debe sobrevivir un refresh
    const { cardData, loading, error, ...rest } = state.checkout;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // almacenamiento no disponible (modo privado, etc.) — no bloquea la app
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
