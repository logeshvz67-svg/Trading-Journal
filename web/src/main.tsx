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

function Boot() {
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    (async () => {
      const ok = await wakeServer((a) => alive && setAttempt(a));
      if (!alive) return;
      if (!ok) return setFailed(true);
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

  if (!sb) return <WakeScreen attempt={attempt} failed={failed} onRetry={() => setRun((r) => r + 1)} />;
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
