import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { dateTime } from '../lib/format';
import { useMonsters } from '../lib/monsters';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Empty, PageTitle, Spinner, errMsg } from '../components/ui';

const FILTERS = [
  ['', 'All'],
  ['open', 'Open'],
  ['closed', 'Closed'],
  ['skipped', 'Retreats'],
] as const;
const PAGE = 30;

export default function Log() {
  const { tz } = useStore();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const [trades, setTrades] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const monsters = useMonsters();
  const emojiOf = (id: string) => monsters?.monsters.find((m) => m.id === id)?.emoji ?? '👾';

  useEffect(() => {
    setTrades(null);
    api(`/trades?limit=${PAGE}&status=${status}`)
      .then((r) => {
        setTrades(r.trades);
        setTotal(r.total);
      })
      .catch((e) => setError(errMsg(e)));
  }, [status]);

  async function more() {
    const r = await api(`/trades?limit=${PAGE}&offset=${trades?.length ?? 0}&status=${status}`);
    setTrades((t) => [...(t ?? []), ...r.trades]);
  }

  return (
    <div className="space-y-4">
      <PageTitle icon="📜" title={theme.labels.log} subtitle="Every battle, honestly recorded. This is where you learn." />
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map(([v, label]) => (
          <button key={v} className={`chip ${status === v ? 'chip-on' : ''}`} onClick={() => setParams(v ? { status: v } : {})}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-danger">{error}</p>}
      {!trades && !error && <Spinner />}
      {trades && trades.length === 0 && (
        <Empty
          icon="🪶"
          title="The scroll is blank"
          text="No battles recorded yet. Your first entry is the hardest. Every master's log started empty."
          action={
            <Link to="/battle" className="btn-primary mt-2">
              Go to the Battle Station
            </Link>
          }
        />
      )}
      <ul className="space-y-2">
        {trades?.map((t) => {
          const isOpen = t.status === 'open';
          const tone = t.status === 'skipped' ? 'border-l-muted' : isOpen ? 'border-l-accent' : t.followed_plan ? 'border-l-ok' : 'border-l-danger';
          return (
            <li key={t.id}>
              <Link to={`/log/${t.id}`} className={`card flex items-center justify-between gap-3 border-l-4 py-3 ${tone}`}>
                <div className="min-w-0">
                  <div className="font-semibold">
                    {t.direction === 'long' ? '▲' : '▼'} {t.pair}{' '}
                    <span className="text-xs font-normal text-muted">
                      {t.status === 'skipped' ? 'Retreat' : isOpen ? 'Open' : t.followed_plan ? 'Plan followed' : 'Plan broken'}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {dateTime(t.opened_at, tz)}
                    {t.planned_rr ? ` · 1:${Number(t.planned_rr).toFixed(1)}` : ''}
                    {t.r_multiple !== null && t.r_multiple !== undefined ? ` · ${Number(t.r_multiple) > 0 ? '+' : ''}${Number(t.r_multiple).toFixed(2)}R` : ''}
                    {t.trade_mistakes?.length ? ` · ${t.trade_mistakes.map((m: any) => emojiOf(m.monster_id)).join('')}` : ''}
                  </div>
                </div>
                <div className={`shrink-0 text-sm font-bold ${t.xp_awarded >= 0 ? 'text-xp' : 'text-danger'}`}>
                  {t.xp_awarded > 0 ? '+' : ''}
                  {t.xp_awarded} XP
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {trades && trades.length < total && (
        <button className="btn-ghost w-full" onClick={more}>
          Load more
        </button>
      )}
    </div>
  );
}
