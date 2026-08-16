import { API_BASE_URL as BASE_URL } from './apiBaseUrl';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || 'Error de red';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data;
}

export const api = {
  getProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createCustomer: (payload) =>
    request('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  createDelivery: (payload) =>
    request('/deliveries', { method: 'POST', body: JSON.stringify(payload) }),
  createTransaction: (payload) =>
    request('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  payTransaction: (transactionId, payload) =>
    request(`/transactions/${transactionId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTransaction: (id) => request(`/transactions/${id}`),
};
