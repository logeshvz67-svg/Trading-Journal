import { Link } from 'react-router-dom';
import { focusVerdict } from '@shared/prep';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Banner, Card, Meter, Spinner } from '../components/ui';
import { usd } from '../lib/format';
import { computeReminders } from '../lib/reminders';
import { avatarEmoji, equippedTitle, frameRing } from '../lib/avatar';

const TIPS: Record<string, string[]> = {
  guardian: ['Your defense is strong. Today, practice letting one planned winner reach its target.', 'A skipped trade is still a decision. Log it as a Disciplined Retreat.'],
  balanced: ['Use the same checklist on every trade, even the obvious ones.', 'Write one thing that could make this trade fail before you enter.'],
  daredevil: ['Armor first, every time. No Battle Station, no trade.', 'After a loss, the next 15 minutes belong to the Campfire, not the chart.'],
};

export default function Dashboard() {
  const { me, state } = useStore();
  if (!me || !state) return <Spinner />;
  const name = me.profile.display_name;
  const session = state.session;
  const focus = session ? Number(session.focus_score) : null;
  const tips = TIPS[me.profile.risk_personality ?? 'balanced'] ?? TIPS.balanced;
  const tip = tips[new Date().getDate() % tips.length];
  const p = state.progress;
  const reminders = computeReminders(state, me);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-3xl ${frameRing(state.profile)}`}>{avatarEmoji(state.profile)}</div>
        <div>
          <h1 className="text-xl font-bold">Welcome back, {name}</h1>
          <p className="text-sm text-muted">
            {equippedTitle(state.profile) ? `${equippedTitle(state.profile)} · ` : ''}
            {p.rank} · Level {p.level}
          </p>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="space-y-1.5">
          {reminders.map((r) => (
            <Link key={r.id} to={r.to} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <span>{r.icon}</span>
              <span className="flex-1">{r.text}</span>
              <span className="text-muted">›</span>
            </Link>
          ))}
        </div>
      )}

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

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['📜', 'Journal', state.streaks?.journal ?? 0, 'days'],
          ['🧭', 'Plan', state.streaks?.plan ?? 0, 'trades'],
          ['🎓', 'Learning', state.streaks?.learning ?? 0, 'days'],
        ].map(([icon, label, n, unit]) => (
          <div key={label as string} className="card px-2 py-3">
            <div className="text-xl">
              {icon}
              {Number(n) > 0 && <span className="ml-0.5 text-sm">🔥</span>}
            </div>
            <div className="font-display text-xl font-bold">{n}</div>
            <div className="text-[11px] text-muted">
              {label} streak ({unit})
            </div>
          </div>
        ))}
      </div>

      <Card title="Today's quests" icon="📜" action={<Link to="/quests" className="text-xs text-muted underline">Quest Board</Link>}>
        <ul className="space-y-3">
          {state.quests
            .filter((q) => q.type === 'daily' || (q.type === 'story' && !q.completed))
            .map((q) => (
              <li key={q.id}>
                <div className="flex justify-between text-sm">
                  <span className={q.completed ? 'text-muted line-through' : ''}>
                    {q.type === 'story' ? '📖 ' : ''}
                    {q.title}
                  </span>
                  <span className="text-xs text-muted">
                    {q.progress}/{q.target}
                  </span>
                </div>
                <div className="text-xs text-muted">{q.description}</div>
              </li>
            ))}
        </ul>
      </Card>

      <Link to="/boss" className="card block">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">👑 Boss progress</h2>
          <span className="text-xs text-muted capitalize">{me.account?.phase}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-display text-lg font-bold">{state.tradingDays.done}/{state.tradingDays.required || '–'}</div>
            <div className="text-muted">trading days</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold">{Math.max(0, state.profit.pct ?? 0)}%</div>
            <div className="text-muted">of target</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold">{state.achievementsUnlocked}/12</div>
            <div className="text-muted">achievements</div>
          </div>
        </div>
      </Link>

      <Card title="Mentor tip" icon="🧙" action={<Link to="/mentor" className="text-xs text-muted underline">Ask the Mentor</Link>}>
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
