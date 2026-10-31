import type { Num } from '@shared/risk';
import { admin } from '../lib/supabase';
import { must, HttpError } from '../lib/http';

export interface Profile {
  user_id: string;
  display_name: string;
  avatar: string;
  goal: string | null;
  risk_personality: string | null;
  xp: number;
  level: number;
  gold: number;
  current_streaks: Record<string, unknown>;
  timezone: string;
  settings: Record<string, unknown>;
  onboarded: boolean;
}

export interface Account {
  id: string;
  user_id: string;
  firm_name: string;
  starting_balance: Num;
  current_balance: Num;
  daily_loss_limit: Num;
  max_drawdown: Num;
  drawdown_mode: 'static' | 'trailing';
  profit_target: Num | null;
  min_trading_days: number;
  consistency_rule: string | null;
  consistency_pct: Num | null;
  news_rule: string | null;
  phase: string;
  max_risk_percent: Num;
  max_trades_per_day: number;
  is_active: boolean;
  created_at: string;
}

export async function getProfile(userId: string): Promise<Profile> {
  const data = must(await admin.from('profiles').select('*').eq('user_id', userId).maybeSingle());
  if (data) return data as Profile;
  // The signup trigger normally creates this; self-heal if it was missed.
  return must(await admin.from('profiles').insert({ user_id: userId }).select('*').single()) as Profile;
}

export async function getActiveAccount(userId: string): Promise<Account | null> {
  const data = must(
    await admin.from('accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
  );
  return (data?.[0] as Account) ?? null;
}

export async function requireActiveAccount(userId: string): Promise<Account> {
  const a = await getActiveAccount(userId);
  if (!a) throw new HttpError(409, 'Set up your account rules first.', 'no_account');
  return a;
}
