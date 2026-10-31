// In-app reminders, computed from the current state. No server timers: the browser
// evaluates these when the app is open and, if allowed, shows a system notification.
import type { Me, RiskState } from '../store';

export interface Reminder {
  id: string; // stable per day, so each reminder fires once
  icon: string;
  text: string;
  to: string;
}

export function computeReminders(state: RiskState | null, me: Me | null, now = new Date()): Reminder[] {
  if (!state?.account || !me) return [];
  const out: Reminder[] = [];
  const prepTime = (me.profile.settings?.notifications?.prep_time as string | undefined) ?? '08:00';
  const [hh, mm] = prepTime.split(':').map(Number);
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: me.profile.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const [lh, lm] = local.split(':').map(Number);
  if (!state.session && lh * 60 + lm >= hh * 60 + mm) out.push({ id: `prep-${state.today}`, icon: '🌅', text: 'Your Pre-Battle Prep is waiting. Prep before you trade.', to: '/prep' });
  if (state.openTrades > 0) out.push({ id: `open-${state.today}-${state.openTrades}`, icon: '📜', text: `${state.openTrades} open battle${state.openTrades > 1 ? 's' : ''} to close and journal.`, to: '/log?status=open' });
  if (state.alert === 'warn' && !state.locked) out.push({ id: `hp-${state.today}`, icon: '❤️', text: 'Your HP is low. Trade smaller or step away.', to: '/campfire' });
  const daily = state.quests?.filter((q) => q.type === 'daily' && !q.completed) ?? [];
  if (daily.length && lh >= 18) out.push({ id: `quests-${state.today}`, icon: '📜', text: `${daily.length} daily quest${daily.length > 1 ? 's' : ''} still open. A short reflection counts.`, to: '/quests' });
  if ((state.streaks?.journal ?? 0) >= 2 && lh >= 19) out.push({ id: `streak-${state.today}`, icon: '🔥', text: `Keep your ${state.streaks.journal}-day journal streak alive tonight.`, to: '/campfire' });
  return out;
}

const FIRED_KEY = 'mq-fired-reminders';

function fired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markFired(id: string) {
  try {
    const s = [...fired(), id].slice(-60);
    localStorage.setItem(FIRED_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export async function showSystemNotification(title: string, body: string, tag: string, url = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url } });
    else new Notification(title, { body, tag });
  } catch {
    /* ignore */
  }
}

/** Fire each reminder once as a system notification (if the user enabled them). */
export function fireNewReminders(reminders: Reminder[], enabled: boolean) {
  if (!enabled) return;
  const done = fired();
  for (const r of reminders) {
    if (done.has(r.id)) continue;
    markFired(r.id);
    showSystemNotification('Market Quest', r.text, r.id, r.to);
  }
}
