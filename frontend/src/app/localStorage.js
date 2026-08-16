const STORAGE_KEY = 'checkout_state_v1';

export function loadState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    const parsed = JSON.parse(serialized);
    // nunca recuperamos datos de tarjeta desde localStorage
    return { checkout: { ...parsed, cardData: null, loading: false, error: null } };
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
