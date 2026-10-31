import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { COPY } from '@shared/copy';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { countdown, usd } from '../lib/format';
import { Meter } from './ui';

/** Always-visible risk meters. Game visuals never cover these. */
export function RiskBar() {
  const { state, me } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!state?.lockEndsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state?.lockEndsAt]);
  if (!state?.account) return null;

  const hpPct = 100 - state.daily.pct;
  const shPct = 100 - state.drawdown.pct;
  const avatar = theme.avatars.find((a) => a.id === me?.profile.avatar)?.emoji ?? '🛡️';
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 pb-2.5 pt-[max(.6rem,env(safe-area-inset-top))]">
        <div className="mb-2 flex items-center justify-between text-xs">
          <Link to="/" className="flex items-center gap-1.5 font-semibold">
            <span className="text-base">{avatar}</span>
            <span>
              Lv {state.progress.level} · {state.progress.rank}
            </span>
          </Link>
          <div className="flex items-center gap-3 text-muted">
            <span>
              <span className="text-xp">✦</span> {state.profile.xp} {theme.labels.xp}
            </span>
            <span>
              <span className="text-gold">●</span> {state.profile.gold}
            </span>
            <span>
              ⚔️ {state.tradesToday}/{state.maxTrades}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Meter label={`❤️ ${theme.labels.hp}`} color="hp" remainingPct={hpPct} valueText={`${usd(state.daily.remaining)} left`} />
          <Meter label={`🛡️ ${theme.labels.shield}`} color="shield" remainingPct={shPct} valueText={`${usd(state.drawdown.remaining)} left`} />
        </div>
        {state.locked ? (
          <Link to="/campfire" className="mt-2 block rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger">
            🔒 {state.lockMessage} {state.lockEndsAt && <span className="font-normal">({countdown(new Date(state.lockEndsAt).getTime() - now)})</span>}
          </Link>
        ) : state.alert === 'warn' ? (
          <div className="mt-2 rounded-lg bg-warn/15 px-3 py-1.5 text-xs font-semibold text-warn">⚠️ {state.alertMessage}</div>
        ) : null}
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', icon: '🏰', label: 'Home', end: true },
  { to: '/battle', icon: '⚔️', label: 'Battle' },
  { to: '/log', icon: '📜', label: 'Log' },
  { to: '/boss', icon: '👑', label: 'Boss' },
  { to: '/more', icon: '☰', label: 'More' },
];

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <RiskBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        <Outlet />
        <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted">
          {COPY.disclaimer}{' '}
          <Link to="/disclaimer" className="underline">
            Read more
          </Link>
        </footer>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-primary' : 'text-muted'}`}>
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
