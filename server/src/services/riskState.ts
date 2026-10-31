// Live HP / Shield / lockout state, computed from DB rows on every request.
// No timers, no in-memory state: if the server sleeps, nothing is lost.
import Big from 'big.js';
import { ALERT_PCT, LOCKOUT_PCT } from '@shared/constants';
import { big, money } from '@shared/risk';
import { localDateKey, startOfLocalDay, startOfNextLocalDay } from '@shared/time';
import { admin } from '../lib/supabase';
import { must } from '../lib/http';
import { getActiveAccount, getProfile, type Account, type Profile } from './context';

export const LOCK_COPY = {
  warn: 'Your HP is low. Trade smaller or step away.',
  danger: 'Danger zone. The Boss Arena is locked for today. Visit the Campfire.',
  drawdown: 'Your Shield is cracking. Trading is locked for today to protect the account. Visit the Campfire.',
  cooldown: 'Take 30 minutes. The market will still be here.',
  stopped: 'You called it a day. Rest, warrior. The arena reopens tomorrow.',
};

export interface Cooldown {
  id: string;
  reason: string;
  starts_at: string;
  ends_at: string;
}

export interface RiskState {
  profile: Profile;
  account: Account | null;
  today: string;
  dayStart: string;
  dayEnd: string;
  balance: string;
  daily: { limit: string; used: string; remaining: string; pct: number };
  drawdown: { limit: string; floor: string; used: string; remaining: string; pct: number; mode: string };
  alert: 'ok' | 'warn' | 'danger';
  alertMessage: string | null;
  locked: boolean;
  lockMessage: string | null;
  lockEndsAt: string | null;
  cooldowns: Cooldown[];
  tradesToday: number;
  maxTrades: number;
  maxRisk: string;
  openRisk: string;
  openTrades: number;
  session: Record<string, unknown> | null;
  lastLossClosedAt: string | null;
  profit: { amount: string; target: string | null; pct: number | null };
  tradingDays: { done: number; required: number };
  consistency: { bestDayShare: number | null; limitPct: number | null; ok: boolean | null };
}

const pct = (used: Big, limit: Big) => (limit.gt(0) ? Math.min(100, Math.max(0, Number(used.div(limit).times(100).toFixed(1)))) : 0);

export async function getRiskState(userId: string, now = new Date()): Promise<RiskState> {
  const [profile, account] = await Promise.all([getProfile(userId), getActiveAccount(userId)]);
  const tz = profile.timezone || 'UTC';
  const dayStart = startOfLocalDay(now, tz);
  const dayEnd = startOfNextLocalDay(now, tz);
  const today = localDateKey(now, tz);

  const empty: RiskState = {
    profile,
    account,
    today,
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
    balance: '0.00',
    daily: { limit: '0.00', used: '0.00', remaining: '0.00', pct: 0 },
    drawdown: { limit: '0.00', floor: '0.00', used: '0.00', remaining: '0.00', pct: 0, mode: 'static' },
    alert: 'ok',
    alertMessage: null,
    locked: false,
    lockMessage: null,
    lockEndsAt: null,
    cooldowns: [],
    tradesToday: 0,
    maxTrades: 0,
    maxRisk: '0',
    openRisk: '0.00',
    openTrades: 0,
    session: null,
    lastLossClosedAt: null,
    profit: { amount: '0.00', target: null, pct: null },
    tradingDays: { done: 0, required: 0 },
    consistency: { bestDayShare: null, limitPct: null, ok: null },
  };
  if (!account) return empty;

  const [tradesRes, sessionRes, cooldownRes] = await Promise.all([
    admin
      .from('trades')
      .select('status, pnl, risk_amount, opened_at, closed_at')
      .eq('user_id', userId)
      .eq('account_id', account.id)
      .neq('status', 'skipped')
      .order('closed_at', { ascending: true, nullsFirst: false }),
    admin.from('sessions').select('*').eq('user_id', userId).eq('account_id', account.id).eq('session_date', today).maybeSingle(),
    admin.from('cooldowns').select('id, reason, starts_at, ends_at').eq('user_id', userId).gt('ends_at', now.toISOString()).lte('starts_at', now.toISOString()),
  ]);
  const trades = must(tradesRes) as { status: string; pnl: number | null; risk_amount: number | null; opened_at: string | null; closed_at: string | null }[];
  const session = must(sessionRes) as Record<string, unknown> | null;
  let cooldowns = must(cooldownRes) as Cooldown[];

  const starting = big(account.starting_balance)!;
  const dailyLimit = big(account.daily_loss_limit)!;
  const maxDd = big(account.max_drawdown)!;

  let balance = starting;
  let hwm = starting;
  let todayPnl = new Big(0);
  let openRisk = new Big(0);
  let openTrades = 0;
  let tradesToday = 0;
  let lastLossClosedAt: string | null = null;
  const dayPnl = new Map<string, Big>();
  const tradedDays = new Set<string>();

  for (const t of trades) {
    if (t.opened_at) {
      tradedDays.add(localDateKey(new Date(t.opened_at), tz));
      if (new Date(t.opened_at) >= dayStart) tradesToday++;
    }
    if (t.status === 'open') {
      openTrades++;
      openRisk = openRisk.plus(big(t.risk_amount) ?? 0);
      continue;
    }
    const p = big(t.pnl) ?? new Big(0);
    balance = balance.plus(p);
    if (balance.gt(hwm)) hwm = balance;
    if (t.closed_at) {
      const closed = new Date(t.closed_at);
      if (closed >= dayStart) todayPnl = todayPnl.plus(p);
      const k = localDateKey(closed, tz);
      dayPnl.set(k, (dayPnl.get(k) ?? new Big(0)).plus(p));
      if (p.lt(0)) lastLossClosedAt = t.closed_at;
    }
  }

  const dailyUsed = todayPnl.lt(0) ? todayPnl.abs() : new Big(0);
  const dailyRemaining = dailyLimit.minus(dailyUsed);
  const dailyPct = pct(dailyUsed, dailyLimit);

  // Static: floor = start - maxDD. Trailing: floor follows the high-water mark but stops at the start balance.
  const trailingFloor = hwm.minus(maxDd);
  const floor = account.drawdown_mode === 'trailing' ? (trailingFloor.gt(starting) ? starting : trailingFloor) : starting.minus(maxDd);
  const ddRemaining = balance.minus(floor);
  const ddUsed = maxDd.minus(ddRemaining).lt(0) ? new Big(0) : maxDd.minus(ddRemaining);
  const ddPct = pct(ddUsed, maxDd);

  // Persist lockouts in the DB the moment a limit hits 90%. Lazy evaluation, no timers.
  const hasReason = (r: string) => cooldowns.some((c) => c.reason === r);
  const toCreate: { reason: string; meta: Record<string, unknown> }[] = [];
  if (dailyPct >= LOCKOUT_PCT && !hasReason('daily_limit_lockout')) toCreate.push({ reason: 'daily_limit_lockout', meta: { pct: dailyPct } });
  if (ddPct >= LOCKOUT_PCT && !hasReason('drawdown_lockout')) toCreate.push({ reason: 'drawdown_lockout', meta: { pct: ddPct } });
  if (toCreate.length) {
    const rows = must(
      await admin
        .from('cooldowns')
        .insert(toCreate.map((c) => ({ user_id: userId, account_id: account.id, starts_at: now.toISOString(), ends_at: dayEnd.toISOString(), reason: c.reason, meta: c.meta })))
        .select('id, reason, starts_at, ends_at'),
    ) as Cooldown[];
    cooldowns = [...cooldowns, ...rows];
  }

  const worst = Math.max(dailyPct, ddPct);
  const alert = worst >= LOCKOUT_PCT ? 'danger' : worst >= ALERT_PCT ? 'warn' : 'ok';

  const lock = pickLock(cooldowns);

  const sessionMaxTrades = typeof session?.max_trades === 'number' ? session.max_trades : null;
  const maxTrades = sessionMaxTrades !== null ? Math.min(sessionMaxTrades, account.max_trades_per_day) : account.max_trades_per_day;
  const accountRisk = big(account.max_risk_percent)!;
  const sessionRisk = big(session?.max_risk as number | undefined);
  const maxRisk = sessionRisk && sessionRisk.lt(accountRisk) ? sessionRisk : accountRisk;

  const profitAmt = balance.minus(starting);
  const target = big(account.profit_target);
  let bestDayShare: number | null = null;
  if (profitAmt.gt(0) && dayPnl.size) {
    const best = [...dayPnl.values()].reduce((m, v) => (v.gt(m) ? v : m), new Big(0));
    bestDayShare = Number(best.div(profitAmt).times(100).toFixed(1));
  }
  const limitPct = account.consistency_pct !== null ? Number(account.consistency_pct) : null;

  return {
    ...empty,
    balance: money(balance),
    daily: { limit: money(dailyLimit), used: money(dailyUsed), remaining: money(dailyRemaining.lt(0) ? new Big(0) : dailyRemaining), pct: dailyPct },
    drawdown: { limit: money(maxDd), floor: money(floor), used: money(ddUsed), remaining: money(ddRemaining.lt(0) ? new Big(0) : ddRemaining), pct: ddPct, mode: account.drawdown_mode },
    alert,
    alertMessage: alert === 'danger' ? LOCK_COPY.danger : alert === 'warn' ? LOCK_COPY.warn : null,
    locked: !!lock,
    lockMessage: lock ? lock.message : null,
    lockEndsAt: lock ? lock.endsAt : null,
    cooldowns,
    tradesToday,
    maxTrades,
    maxRisk: maxRisk.toString(),
    openRisk: money(openRisk),
    openTrades,
    session,
    lastLossClosedAt,
    profit: { amount: money(profitAmt), target: target ? money(target) : null, pct: target && target.gt(0) ? Number(profitAmt.div(target).times(100).toFixed(1)) : null },
    tradingDays: { done: tradedDays.size, required: account.min_trading_days },
    consistency: { bestDayShare, limitPct, ok: bestDayShare === null || limitPct === null ? null : bestDayShare <= limitPct },
  };
}

function pickLock(cooldowns: Cooldown[]): { message: string; endsAt: string } | null {
  if (!cooldowns.length) return null;
  const order = ['drawdown_lockout', 'daily_limit_lockout', 'stop_for_today', 'loss_streak', 'loss_cooldown'];
  const sorted = [...cooldowns].sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason));
  const c = sorted[0];
  const message =
    c.reason === 'drawdown_lockout' ? LOCK_COPY.drawdown : c.reason === 'daily_limit_lockout' ? LOCK_COPY.danger : c.reason === 'stop_for_today' ? LOCK_COPY.stopped : LOCK_COPY.cooldown;
  const endsAt = cooldowns.reduce((m, x) => (x.ends_at > m ? x.ends_at : m), c.ends_at);
  return { message, endsAt };
}
