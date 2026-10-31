import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { api } from './lib/api';
import { applyTheme, type ThemeMode } from './theme/config';
import { setSoundEnabled } from './lib/sound';

export interface Me {
  profile: any;
  account: any | null;
  oath: { id: string; text: string; sort_order: number; signed_at: string | null }[];
  progress: { level: number; rank: string; into: number; needed: number; nextAt: number };
}

export interface RiskState {
  account: any | null;
  today: string;
  balance: string;
  daily: { limit: string; used: string; remaining: string; pct: number };
  drawdown: { limit: string; floor: string; used: string; remaining: string; pct: number; mode: string };
  alert: 'ok' | 'warn' | 'danger';
  alertMessage: string | null;
  locked: boolean;
  lockMessage: string | null;
  lockEndsAt: string | null;
  tradesToday: number;
  maxTrades: number;
  maxRisk: string;
  openRisk: string;
  openTrades: number;
  session: any | null;
  profit: { amount: string; target: string | null; pct: number | null };
  tradingDays: { done: number; required: number };
  consistency: { bestDayShare: number | null; limitPct: number | null; ok: boolean | null };
  profile: any;
  progress: Me['progress'];
  activeMonster: any | null;
}

interface Store {
  sb: SupabaseClient;
  session: Session | null;
  me: Me | null;
  state: RiskState | null;
  tz: string;
  refreshMe: () => Promise<void>;
  refreshState: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ sb, children }: { sb: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<RiskState | null>(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const refreshMe = useCallback(async () => {
    const m = await api<Me>('/me');
    setMe(m);
    applyTheme(((m.profile.settings?.theme as ThemeMode) ?? 'dark'));
    setSoundEnabled(!!m.profile.settings?.sound);
  }, []);

  const refreshState = useCallback(async () => {
    setState(await api<RiskState>('/state'));
  }, []);

  useEffect(() => {
    if (!session) {
      setMe(null);
      setState(null);
      return;
    }
    refreshMe().catch(() => {});
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (me?.profile.onboarded) refreshState().catch(() => {});
  }, [me?.profile.onboarded, me?.account?.id, refreshState]);

  // Refresh the risk meters whenever the tab regains focus (no server timers needed).
  useEffect(() => {
    const onFocus = () => me?.profile.onboarded && refreshState().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [me?.profile.onboarded, refreshState]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
  }, [sb]);

  const tz = me?.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const value = useMemo(() => ({ sb, session, me, state, tz, refreshMe, refreshState, signOut }), [sb, session, me, state, tz, refreshMe, refreshState, signOut]);
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
