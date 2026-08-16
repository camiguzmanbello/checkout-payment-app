import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../features/checkout/checkoutSlice';
import { loadState, saveState } from './localStorage';

const preloadedState = loadState();

export const store = configureStore({
  reducer: { checkout: checkoutReducer },
  preloadedState,
});

// Requisito de resiliencia: guardar el progreso en cada cambio de estado
store.subscribe(() => {
  saveState(store.getState());
});
