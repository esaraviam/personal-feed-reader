import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import './index.css';
import App from './App.tsx';

/*
 * Register service worker.
 * When a new version is available, show a toast so the user can reload.
 * The `onNeedRefresh` callback fires when Workbox detects an updated SW
 * waiting to activate. Calling `updateSW()` skips the waiting phase and
 * reloads the page with the new version.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast('Update available', {
      description: 'A new version of Daily Brief is ready.',
      action: {
        label: 'Reload',
        onClick: () => void updateSW(true),
      },
      duration: Infinity,
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
