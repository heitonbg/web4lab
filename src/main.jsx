import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './styles/tokens.css';
import './styles/global.css';
import { Provider } from 'react-redux';
import { store } from './app/store.js';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { router } from './router.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ThemeProvider>
  </StrictMode>,
);
