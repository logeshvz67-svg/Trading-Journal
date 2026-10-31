import { Link } from 'react-router-dom';
import { ALERT_PCT, LOCKOUT_PCT } from '@shared/constants';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { usd } from '../lib/format';
import { Banner, Card, Meter, PageTitle, Spinner } from '../components/ui';

const PHASES = [
  { id: 'practice', name: 'Training Grounds', icon: '🎯' },
  { id: 'evaluation', name: 'Phase 1: The Gatekeeper', icon: '🚪' },
  { id: 'verification', name: 'Phase 2: The Warden', icon: '⚖️' },
  { id: 'funded', name: 'Funded: Guardian of the Realm', icon: '👑' },
];

export default function Boss() {
  const { state, me } = useStore();
  if (!state || !me?.account) return <Spinner />;
  const a = me.account;
  const phaseIdx = PHASES.findIndex((p) => p.id === a.phase);

  const check = (ok: boolean | null, label: string, detail: string) => (
    <li className="flex gap-2 py-1 text-sm">
      <span>{ok === null ? '⬜' : ok ? '✅' : '⚠️'}</span>
      <span>
        {label}
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </li>
  );

  return (
    <div className="space-y-4">
      <PageTitle icon="👑" title={theme.labels.boss} subtitle={`${a.firm_name}: the boss is your firm's rulebook. Defeat it with patience.`} />

      <div className="flex gap-1.5">
        {PHASES.map((p, i) => (
          <div key={p.id} className={`flex-1 rounded-xl p-2 text-center text-[11px] ${i === phaseIdx ? 'bg-primary/20 ring-1 ring-primary' : i < phaseIdx ? 'bg-ok/10 text-muted' : 'bg-surface2 text-muted'}`}>
            <div className="text-lg">{p.icon}</div>
            {p.name}
          </div>
        ))}
      </div>

      {state.locked ? (
        <Banner tone="danger">
          🔒 {state.lockMessage} <Link to="/campfire" className="underline">Go to the Campfire</Link>
        </Banner>
      ) : state.alert === 'warn' ? (
        <Banner tone="warn">⚠️ {state.alertMessage}</Banner>
      ) : null}

      <Card title="Boss damage meters" icon="⚔️">
        <div className="space-y-4">
          <Meter
            label={`❤️ ${theme.labels.hp}: ${theme.labels.hpLong}`}
            color="hp"
            remainingPct={100 - state.daily.pct}
            valueText={`${usd(state.daily.used)} / ${usd(state.daily.limit)} used (${state.daily.pct}%)`}
            sub={`Warning at ${ALERT_PCT}%. Trade form locks at ${LOCKOUT_PCT}%. Resets at midnight (${me.profile.timezone}).`}
          />
          <Meter
            label={`🛡️ ${theme.labels.shield}: ${theme.labels.shieldLong}`}
            color="shield"
            remainingPct={100 - state.drawdown.pct}
            valueText={`${usd(state.drawdown.used)} / ${usd(state.drawdown.limit)} used (${state.drawdown.pct}%)`}
            sub={`${state.drawdown.mode === 'trailing' ? 'Trailing' : 'Static'} floor: ${usd(state.drawdown.floor)}. Balance: ${usd(state.balance)}.`}
          />
          {state.profit.target && (
            <Meter
              label="🏁 Profit target progress"
              color="gold"
              remainingPct={Math.max(0, state.profit.pct ?? 0)}
              valueText={`${Math.max(0, state.profit.pct ?? 0)}%`}
              sub="Progress comes from repeating good process. Chasing this bar is how accounts are lost."
            />
          )}
        </div>
      </Card>

      <Card title="Rule checklist" icon="📋">
        <ul>
          {check(state.daily.pct < ALERT_PCT, 'Daily loss limit respected', `${state.daily.pct}% used today`)}
          {check(state.drawdown.pct < ALERT_PCT, 'Max drawdown respected', `${state.drawdown.pct}% used`)}
          {check(state.tradingDays.required ? state.tradingDays.done >= state.tradingDays.required : null, 'Minimum trading days', `${state.tradingDays.done} of ${state.tradingDays.required || 'n/a'} days`)}
          {check(state.consistency.ok, 'Consistency rule', a.consistency_rule ? `${a.consistency_rule}${state.consistency.bestDayShare !== null ? ` · best day = ${state.consistency.bestDayShare}% of profit` : ''}` : 'Not set')}
          {check(null, 'News rule', a.news_rule || 'Not set')}
          {check(state.tradesToday <= state.maxTrades, 'Daily trade limit', `${state.tradesToday} of ${state.maxTrades} today`)}
        </ul>
        <Link to="/settings" className="btn-ghost mt-3 w-full text-sm">
          Edit firm rules
        </Link>
      </Card>
    </div>
  );
}
