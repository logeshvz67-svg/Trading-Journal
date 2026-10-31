import { Card } from './ui';

export interface XpOutcome {
  title: string;
  message: string;
  note?: string;
  lines: { reason: string; amount: number; label: string }[];
  total: number;
  leveledUp?: boolean;
  rank?: string;
  tradeId?: string;
  autoTags?: string[];
  defeated?: string[];
}

/** Itemized XP summary. Shows process points only; never the profit amount. */
export function XpResult({ outcome }: { outcome: XpOutcome }) {
  return (
    <Card className="animate-pop">
      <h2 className="mb-2 text-xl font-bold">{outcome.title}</h2>
      <p className="mb-4">{outcome.message}</p>
      {outcome.note && outcome.note !== outcome.message && <p className="mb-4 text-sm text-muted">{outcome.note}</p>}
      {outcome.leveledUp && (
        <div className="mb-4 rounded-xl border border-gold/60 bg-gold/10 p-3 text-center">
          <div className="text-3xl">🎉</div>
          <div className="font-display font-bold">Level up! You are now a {outcome.rank}.</div>
          <div className="text-xs text-muted">Earned through discipline, not luck.</div>
        </div>
      )}
      {outcome.defeated?.length ? <div className="mb-4 rounded-xl bg-ok/10 p-3 text-sm">⚔️ Monster defeated: {outcome.defeated.join(', ')}. +50 XP</div> : null}
      {outcome.autoTags?.length ? <div className="mb-4 text-sm text-warn">Auto-detected: {outcome.autoTags.join(', ')}</div> : null}
      <ul className="space-y-1 text-sm">
        {outcome.lines.map((l, i) => (
          <li key={i} className="flex justify-between">
            <span className="text-muted">{l.label}</span>
            <span className={l.amount >= 0 ? 'text-xp' : 'text-danger'}>
              {l.amount > 0 ? '+' : ''}
              {l.amount} XP
            </span>
          </li>
        ))}
        <li className="flex justify-between border-t border-border pt-1 font-bold">
          <span>Total</span>
          <span className={outcome.total >= 0 ? 'text-xp' : 'text-danger'}>
            {outcome.total > 0 ? '+' : ''}
            {outcome.total} XP
          </span>
        </li>
      </ul>
    </Card>
  );
}
