import { Link } from 'react-router-dom';
import { focusVerdict } from '@shared/prep';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Banner, Card, Meter, Spinner } from '../components/ui';
import { usd } from '../lib/format';

const TIPS: Record<string, string[]> = {
  guardian: ['Your defense is strong. Today, practice letting one planned winner reach its target.', 'A skipped trade is still a decision. Log it as a Disciplined Retreat.'],
  balanced: ['Use the same checklist on every trade, even the obvious ones.', 'Write one thing that could make this trade fail before you enter.'],
  daredevil: ['Armor first, every time. No Battle Station, no trade.', 'After a loss, the next 15 minutes belong to the Campfire, not the chart.'],
};

export default function Dashboard() {
  const { me, state } = useStore();
  if (!me || !state) return <Spinner />;
  const name = me.profile.display_name;
  const avatar = theme.avatars.find((a) => a.id === me.profile.avatar)?.emoji ?? '🛡️';
  const session = state.session;
  const focus = session ? Number(session.focus_score) : null;
  const tips = TIPS[me.profile.risk_personality ?? 'balanced'] ?? TIPS.balanced;
  const tip = tips[new Date().getDate() % tips.length];
  const p = state.progress;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-3xl">{avatar}</div>
        <div>
          <h1 className="text-xl font-bold">Welcome back, {name}</h1>
          <p className="text-sm text-muted">
            {p.rank} · Level {p.level}
          </p>
        </div>
      </div>

      <Meter label={`Level ${p.level} → ${p.level + 1}`} color="xp" remainingPct={(p.into / p.needed) * 100} valueText={`${p.into} / ${p.needed} XP`} />

      {state.locked && (
        <Banner tone="danger">
          🔒 {state.lockMessage}{' '}
          <Link to="/campfire" className="font-semibold underline">
            Go to the Campfire
          </Link>
        </Banner>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Link to={session ? '/battle' : '/prep'} className="btn-primary flex-col py-3 text-sm">
          <span className="text-xl">⚔️</span>Start Battle
        </Link>
        <Link to="/battle?mode=logged" className="btn-ghost flex-col py-3 text-sm">
          <span className="text-xl">📝</span>Log Trade
        </Link>
        <Link to="/prep" className="btn-ghost flex-col py-3 text-sm">
          <span className="text-xl">🌅</span>Daily Quest
        </Link>
      </div>

      <Card title={theme.labels.prep} icon="🌅">
        {session ? (
          <div className="space-y-3">
            <Meter label={`🧠 ${theme.labels.focus}`} color="focus" remainingPct={focus ?? 0} valueText={`${focus}/100`} />
            <div className="text-sm text-muted">
              Mood: {theme.moods[session.mood as keyof typeof theme.moods]?.emoji} {session.mood} · Max {session.max_trades} trades · Max {session.max_risk}% risk
            </div>
            {focus !== null && focusVerdict(focus) === 'campfire' && (
              <Banner tone="warn">
                Focus is low today. The best trade might be no trade. <Link to="/campfire" className="underline">Visit the Campfire</Link>
              </Banner>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">The First Watch awaits. Prep before you trade: mood, sleep, news and today's limits.</p>
            <Link to="/prep" className="btn-primary w-full">
              Begin Pre-Battle Prep (+10 XP)
            </Link>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Today" icon="📅">
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Trades taken</span>
              <span>
                {state.tradesToday} / {state.maxTrades}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Open battles</span>
              <span>{state.openTrades}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">HP used</span>
              <span>
                {usd(state.daily.used)} of {usd(state.daily.limit)}
              </span>
            </li>
          </ul>
          {state.openTrades > 0 && (
            <Link to="/log?status=open" className="btn-ghost mt-3 w-full text-sm">
              Close & journal open trades
            </Link>
          )}
        </Card>

        <Card title="Active monster" icon="👾">
          {state.activeMonster ? (
            <div className="space-y-2 text-sm">
              <div className="font-semibold">
                {state.activeMonster.monsters?.emoji} {state.activeMonster.monsters?.name}{' '}
                <span className="text-muted">({state.activeMonster.encounter_count} encounters)</span>
              </div>
              <p className="text-muted">{state.activeMonster.monsters?.fix}</p>
              <p>
                <b>Drill:</b> {state.activeMonster.monsters?.drill}
              </p>
              <Meter label="Clean trades to defeat" color="xp" remainingPct={(state.activeMonster.clean_trade_streak / 5) * 100} valueText={`${state.activeMonster.clean_trade_streak}/5`} />
            </div>
          ) : (
            <p className="text-sm text-muted">No monster has a grip on you. Tag mistakes honestly and we'll spot patterns early.</p>
          )}
        </Card>
      </div>

      <Card title="Mentor tip" icon="🧙">
        <p className="text-sm">{tip}</p>
      </Card>

      <Card title="Your Oath" icon="📜" action={<Link to="/settings" className="text-xs text-muted underline">Edit</Link>}>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          {me.oath.map((o) => (
            <li key={o.id}>{o.text}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
