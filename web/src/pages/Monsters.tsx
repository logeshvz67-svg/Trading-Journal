import { useState } from 'react';
import { MONSTER_ACTIVE_AT, MONSTER_DEFEAT_CLEAN_TRADES } from '@shared/constants';
import { useMonsters } from '../lib/monsters';
import { theme } from '../theme/config';
import { Card, Empty, Meter, PageTitle, Spinner } from '../components/ui';

export default function Monsters() {
  const data = useMonsters(1); // always fresh on this page
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return <Spinner />;
  const mine = new Map(data.mine.map((m: any) => [m.monster_id, m]));
  const trophies = data.monsters.filter((m) => (mine.get(m.id)?.times_defeated ?? 0) > 0);

  return (
    <div className="space-y-4">
      <PageTitle icon="👾" title={theme.labels.monsters} subtitle={`Every mistake has a face. ${MONSTER_ACTIVE_AT}+ encounters make a monster active; ${MONSTER_DEFEAT_CLEAN_TRADES} clean trades in a row defeat it.`} />

      <Card title="Trophy room" icon="🏆">
        {trophies.length ? (
          <div className="flex flex-wrap gap-3">
            {trophies.map((m) => (
              <div key={m.id} className="flex flex-col items-center rounded-xl bg-gold/10 px-3 py-2 text-center ring-1 ring-gold/40">
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs font-semibold">{m.name}</span>
                <span className="text-[10px] text-muted">defeated ×{mine.get(m.id).times_defeated}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="🏆" title="Empty shelves, for now" text="Defeat an active monster with 5 clean trades and its trophy lands here." />
        )}
      </Card>

      <ul className="space-y-2">
        {data.monsters.map((m) => {
          const u = mine.get(m.id);
          const status = u?.status ?? 'unmet';
          const badge = { active: 'bg-danger/20 text-danger', lurking: 'bg-warn/20 text-warn', defeated: 'bg-ok/20 text-ok', unmet: 'bg-surface2 text-muted' }[status as string];
          return (
            <li key={m.id} className="card">
              <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
                <span className={`text-3xl ${status === 'unmet' ? 'opacity-40 grayscale' : ''}`}>{m.emoji}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{m.name}</span>
                  <span className="text-xs text-muted">{u ? `${u.encounter_count} encounters` : 'Not encountered yet'}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${badge}`}>{status === 'unmet' ? 'unseen' : status}</span>
              </button>
              {status === 'active' && (
                <div className="mt-3">
                  <Meter label="Clean trades to defeat" color="xp" remainingPct={(u.clean_trade_streak / MONSTER_DEFEAT_CLEAN_TRADES) * 100} valueText={`${u.clean_trade_streak}/${MONSTER_DEFEAT_CLEAN_TRADES}`} />
                </div>
              )}
              {open === m.id && (
                <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                  <p className="italic text-muted">{m.backstory}</p>
                  <p><b>Signs:</b> {m.signs}</p>
                  <p><b>The fix:</b> {m.fix}</p>
                  <p><b>Corrective drill:</b> {m.drill}</p>
                  <p className="text-xs text-muted"><b>Defeat condition:</b> {m.defeat_condition}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
