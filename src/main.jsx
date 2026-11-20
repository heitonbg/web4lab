import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './styles/tokens.css';
import './styles/global.css';
import { TodoProvider } from './state/TodoContext.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { router } from './router.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><ThemeProvider><TodoProvider><RouterProvider router={router} /></TodoProvider></ThemeProvider></StrictMode>);
