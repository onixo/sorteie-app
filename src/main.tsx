import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado no HTML.');

// Service worker só em produção: em desenvolvimento o cache atrapalharia o hot reload
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker não registrado.', err);
    });
  });
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
