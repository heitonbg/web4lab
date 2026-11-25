import { configureStore } from '@reduxjs/toolkit';
import { api } from '../api/api.js';
import historyReducer from '../features/history/historySlice.js';
import uiReducer from '../features/notifications/uiSlice.js';

export function createStore(extraMiddleware = []) {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer, history: historyReducer, ui: uiReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware, ...extraMiddleware),
  });
}

export const store = createStore();
