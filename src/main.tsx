import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { isRunningInElectron } from './services/desktopBridge.ts';
import './index.css';

// Prevent cached browser service workers from interfering inside Electron custom protocol
if (isRunningInElectron() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => registrations.forEach((reg) => reg.unregister()))
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
