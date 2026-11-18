import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import './index.css';
import { applyTheme } from './theme/config';
import { wakeServer } from './lib/api';
import { initSupabase } from './lib/supabase';
import { WakeScreen } from './components/WakeScreen';
import { App } from './App';
import { StoreProvider } from './store';

applyTheme('dark');

// Installable PWA (production only, so dev hot-reload isn't cached).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
// Keep the browser's install prompt so Settings can offer an "Install app" button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__mqInstall = e;
});

function Boot() {
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
  const [dbPaused, setDbPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    (async () => {
      const ok = await wakeServer((a) => alive && setAttempt(a));
      if (!alive) return;
      if (!ok) return setFailed(true);
      // The API is awake; check the database too (free Supabase projects pause after 7 idle days).
      try {
        const db = await fetch('/health/db', { cache: 'no-store' });
        if (!alive) return;
        setDbPaused(db.status === 503);
        if (db.status === 503) return;
      } catch {
        /* ignore: the login screen reports connection problems */
      }
      try {
        setSb(await initSupabase());
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [run]);

  if (!sb) return <WakeScreen attempt={attempt} failed={failed} dbPaused={dbPaused} onRetry={() => setRun((r) => r + 1)} />;
  return (
    <StoreProvider sb={sb}>
      <App />
    </StoreProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
);
