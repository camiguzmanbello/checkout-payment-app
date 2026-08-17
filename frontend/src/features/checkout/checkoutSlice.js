import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/client';

// step: 'product' | 'checkout' | 'summary' | 'result'
const initialState = {
  step: 'product',
  products: [],
  selectedProduct: null,
  quantity: 1,
  cardData: null, // { number, cvc, expMonth, expYear, cardHolder } — nunca se persiste en localStorage
  deliveryData: null, // { address, city, region, phone }
  customerData: null, // { fullName, email, phone }
  transaction: null, // { id, reference, totalAmount, status, ... }
  cardReentryNeeded: false, // true cuando un refresh en el resumen se llevó la tarjeta
  loading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk('checkout/fetchProducts', async () => {
  return api.getProducts();
});

export const submitCheckoutInfo = createAsyncThunk(
  'checkout/submitCheckoutInfo',
  async ({ customer, delivery }, { getState }) => {
    const { checkout } = getState();
    const customerRecord = await api.createCustomer(customer);
    const deliveryRecord = await api.createDelivery(delivery);
    const transaction = await api.createTransaction({
      productId: checkout.selectedProduct.id,
      quantity: checkout.quantity,
      customerId: customerRecord.id,
      deliveryId: deliveryRecord.id,
    });
    return { customerRecord, deliveryRecord, transaction };
  },
);

export const confirmPayment = createAsyncThunk(
  'checkout/confirmPayment',
  async (_, { getState }) => {
    const { checkout } = getState();
    const { cardData, customerData, transaction } = checkout;
    return api.payTransaction(transaction.id, {
      cardNumber: cardData.number.replace(/\s+/g, ''),
      cvc: cardData.cvc,
      expMonth: cardData.expMonth,
      expYear: cardData.expYear,
      cardHolder: cardData.cardHolder,
      customerEmail: customerData.email,
    });
  },
  {
    // Sin tarjeta no hay nada que cobrar. Sin esta guarda el thunk explotaba al
    // leer cardData.number y el fallo se dibujaba como un pago fallido, que es
    // lo contrario de lo que pasó: al proveedor nunca le llegó nada.
    condition: (_, { getState }) => {
      const { checkout } = getState();
      return Boolean(checkout.cardData && checkout.transaction);
    },
  },
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    selectProduct(state, action) {
      state.selectedProduct = action.payload;
      state.step = 'checkout';
    },
    setQuantity(state, action) {
      state.quantity = action.payload;
    },
    setCardData(state, action) {
      state.cardData = action.payload;
    },
    setDeliveryData(state, action) {
      state.deliveryData = action.payload;
    },
    setCustomerData(state, action) {
      state.customerData = action.payload;
    },
    goToSummary(state) {
      state.step = 'summary';
    },
    acknowledgeCardReentry(state) {
      state.cardReentryNeeded = false;
    },
    backToProduct(state) {
      return { ...initialState, products: state.products };
    },
    resetError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(submitCheckoutInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.cardReentryNeeded = false;
      })
      .addCase(submitCheckoutInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.customerData = { ...state.customerData, id: action.payload.customerRecord.id };
        state.deliveryData = { ...state.deliveryData, id: action.payload.deliveryRecord.id };
        state.transaction = action.payload.transaction;
        state.step = 'summary';
      })
      .addCase(submitCheckoutInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(confirmPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.transaction = action.payload;
        state.step = 'result';
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.step = 'result';
      });
  },
});

export const {
  selectProduct,
  setQuantity,
  setCardData,
  setDeliveryData,
  setCustomerData,
  goToSummary,
  acknowledgeCardReentry,
  backToProduct,
  resetError,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
