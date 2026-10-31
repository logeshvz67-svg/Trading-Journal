// Hall of Records: analytics computed in the browser from raw journal rows.
// Lazy-loaded route, so Recharts never weighs down the first page load.
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isoWeekKey, localDateKey } from '@shared/time';
import { api } from '../lib/api';
import { usd } from '../lib/format';
import { useMonsters } from '../lib/monsters';
import { useStore } from '../store';
import { Card, Empty, PageTitle, Spinner, errMsg } from '../components/ui';

interface T {
  status: string;
  pair: string;
  direction: string;
  htf_trend: string | null;
  level_type: string | null;
  pnl: number | null;
  r_multiple: number | null;
  opened_at: string;
  closed_at: string | null;
  emotion_before: string | null;
  followed_plan: boolean | null;
  trade_mistakes: { monster_id: string }[];
}

const c = (name: string) => `rgb(var(--c-${name}))`;
const AXIS = { stroke: c('muted'), fontSize: 11, tickLine: false, axisLine: false } as const;
const TIP = { contentStyle: { background: c('surface'), border: `1px solid ${c('border')}`, borderRadius: 10, fontSize: 12, color: c('text') }, labelStyle: { color: c('muted') }, cursor: { stroke: c('border') } };

function summarize(rows: T[]) {
  const closed = rows.filter((t) => t.status === 'closed');
  const n = closed.length;
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const gross = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const lossSum = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const rs = closed.filter((t) => t.r_multiple !== null).map((t) => Number(t.r_multiple));
  return {
    n,
    retreats: rows.filter((t) => t.status === 'skipped').length,
    winRate: n ? (wins.length / n) * 100 : null,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    profitFactor: lossSum > 0 ? gross / lossSum : wins.length ? Infinity : null,
    planRate: n ? (closed.filter((t) => t.followed_plan).length / n) * 100 : null,
    mistakes: closed.reduce((s, t) => s + t.trade_mistakes.length, 0),
  };
}

function groupBy(rows: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const t of rows) m.set(key(t), [...(m.get(key(t)) ?? []), t]);
  return [...m.entries()].map(([k, v]) => ({ key: k, ...summarize(v) })).sort((a, b) => b.n - a.n);
}

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(0)}%`);
const r = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}R`);
const pf = (v: number | null) => (v === null ? '—' : v === Infinity ? '∞' : v.toFixed(2));

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card px-3 py-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
      {hint && <div className="text-[10px] text-muted">{hint}</div>}
    </div>
  );
}

function Delta({ now, before, unit = '', better = 'up' }: { now: number | null; before: number | null; unit?: string; better?: 'up' | 'down' }) {
  if (now === null || before === null) return <span className="text-muted">—</span>;
  const d = now - before;
  if (Math.abs(d) < 0.005) return <span className="text-muted">±0</span>;
  const good = better === 'up' ? d > 0 : d < 0;
  return (
    <span className={good ? 'text-ok' : 'text-danger'}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(unit === 'R' ? 2 : 0)}
      {unit}
    </span>
  );
}

export default function Records() {
  const { tz } = useStore();
  const monsters = useMonsters();
  const [data, setData] = useState<{ trades: T[]; sessions: any[]; startingBalance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dim, setDim] = useState<'hour' | 'weekday' | 'pair' | 'setup' | 'emotion'>('setup');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    api('/stats').then(setData).catch((e) => setError(errMsg(e)));
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const closed = data.trades.filter((t) => t.status === 'closed' && t.closed_at);
    let eq = Number(data.startingBalance);
    let cumR = 0;
    const curve = closed.map((t, i) => {
      eq += Number(t.pnl ?? 0);
      cumR += Number(t.r_multiple ?? 0);
      return { i: i + 1, date: localDateKey(new Date(t.closed_at!), tz), equity: Number(eq.toFixed(2)), r: Number(cumR.toFixed(2)) };
    });
    const weeks = new Map<string, number>();
    for (const t of closed) weeks.set(isoWeekKey(new Date(t.closed_at!), tz), (weeks.get(isoWeekKey(new Date(t.closed_at!), tz)) ?? 0) + t.trade_mistakes.length);
    const mistakeTrend = [...weeks.entries()].sort().slice(-12).map(([week, count]) => ({ week: week.slice(5), count }));
    const monsterCount = new Map<string, number>();
    for (const t of closed) for (const m of t.trade_mistakes) monsterCount.set(m.monster_id, (monsterCount.get(m.monster_id) ?? 0) + 1);
    return { closed, curve, mistakeTrend, monsterCount, all: summarize(data.trades) };
  }, [data, tz]);

  const breakdown = useMemo(() => {
    if (!view) return [];
    const fmtHour = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' });
    const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
    const key = {
      hour: (t: T) => `${fmtHour.format(new Date(t.opened_at)).padStart(2, '0')}:00`,
      weekday: (t: T) => fmtDay.format(new Date(t.opened_at)),
      pair: (t: T) => t.pair,
      setup: (t: T) => `${t.htf_trend ?? '?'} trend · ${t.level_type ?? '?'} · ${t.direction}`,
      emotion: (t: T) => t.emotion_before ?? 'not logged',
    }[dim];
    return groupBy(view.closed, key);
  }, [view, dim, tz]);

  const report = useMemo(() => {
    if (!data) return null;
    const keyOf = (iso: string) => (period === 'week' ? isoWeekKey(new Date(iso), tz) : localDateKey(new Date(iso), tz).slice(0, 7));
    const nowKey = keyOf(new Date().toISOString());
    const keys = [...new Set(data.trades.map((t) => keyOf(t.closed_at ?? t.opened_at)))].sort();
    const prevKey = keys.filter((k) => k < nowKey).pop() ?? null;
    const slice = (k: string | null) => (k ? data.trades.filter((t) => keyOf(t.closed_at ?? t.opened_at) === k) : []);
    const preps = (k: string | null) => (k ? data.sessions.filter((s) => keyOf(`${s.session_date}T12:00:00Z`) === k).length : 0);
    return { nowKey, prevKey, now: summarize(slice(nowKey)), prev: prevKey ? summarize(slice(prevKey)) : null, prepsNow: preps(nowKey), prepsPrev: preps(prevKey) };
  }, [data, period, tz]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data || !view) return <Spinner />;
  if (!view.closed.length)
    return (
      <div>
        <PageTitle icon="📊" title="Hall of Records" />
        <Empty icon="📊" title="No records yet" text="The Hall fills as you journal closed trades. Your first record is one battle away." />
      </div>
    );

  const a = view.all;
  const name = (id: string) => monsters?.monsters.find((m) => m.id === id)?.name ?? id;
  const topMonster = [...view.monsterCount.entries()].sort((x, y) => y[1] - x[1])[0];

  return (
    <div className="space-y-4">
      <PageTitle icon="📊" title="Hall of Records" subtitle="Compare yourself only with your past self. Process first; the numbers follow." />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Plan followed" value={pct(a.planRate)} hint={`${a.n} closed trades`} />
        <Tile label="Win rate" value={pct(a.winRate)} />
        <Tile label="Average R" value={r(a.avgR)} hint="per closed trade" />
        <Tile label="Profit factor" value={pf(a.profitFactor)} hint="gains ÷ losses" />
      </div>

      <Card title={period === 'week' ? 'Weekly report' : 'Monthly report'} icon="🗞️" action={
        <div className="flex gap-1 text-xs">
          {(['week', 'month'] as const).map((p) => (
            <button key={p} className={`chip px-2 py-1 ${period === p ? 'chip-on' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      }>
        {report && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 font-medium">{report.nowKey}</th>
                <th className="py-1 font-medium">This {period}</th>
                <th className="py-1 font-medium">vs {report.prevKey ?? 'previous'}</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-1">
              <tr><td className="text-muted">Plan followed</td><td>{pct(report.now.planRate)}</td><td><Delta now={report.now.planRate} before={report.prev?.planRate ?? null} unit="%" /></td></tr>
              <tr><td className="text-muted">Trades</td><td>{report.now.n}</td><td><Delta now={report.now.n} before={report.prev?.n ?? null} better="down" /></td></tr>
              <tr><td className="text-muted">Mistake tags</td><td>{report.now.mistakes}</td><td><Delta now={report.now.mistakes} before={report.prev?.mistakes ?? null} better="down" /></td></tr>
              <tr><td className="text-muted">Disciplined retreats</td><td>{report.now.retreats}</td><td><Delta now={report.now.retreats} before={report.prev?.retreats ?? null} /></td></tr>
              <tr><td className="text-muted">Prep days</td><td>{report.prepsNow}</td><td><Delta now={report.prepsNow} before={report.prev ? report.prepsPrev : null} /></td></tr>
              <tr><td className="text-muted">Average R</td><td>{r(report.now.avgR)}</td><td><Delta now={report.now.avgR} before={report.prev?.avgR ?? null} unit="R" /></td></tr>
            </tbody>
          </table>
        )}
        {topMonster && <p className="mt-3 text-xs text-muted">Most frequent monster overall: <b>{name(topMonster[0])}</b> ({topMonster[1]}×). Fewer trades with a higher plan rate is progress.</p>}
      </Card>

      <Card title="Equity curve" icon="📈" action={<button className="text-xs text-muted underline" onClick={() => setShowTable((v) => !v)}>{showTable ? 'Hide table' : 'Table view'}</button>}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={view.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c('primary')} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={c('primary')} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c('border')} strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="i" {...AXIS} />
              <YAxis {...AXIS} width={56} domain={['auto', 'auto']} tickFormatter={(v) => `$${Math.round(v)}`} />
              <ReferenceLine y={Number(data.startingBalance)} stroke={c('muted')} strokeDasharray="4 4" />
              <Tooltip {...TIP} formatter={(v) => [usd(Number(v)), 'Balance']} labelFormatter={(i) => `Trade #${i} · ${view.curve[Number(i) - 1]?.date ?? ''}`} />
              <Area type="monotone" dataKey="equity" stroke={c('primary')} strokeWidth={2} fill="url(#eqFill)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-muted">Dashed line: starting balance. X-axis: closed trade number.</p>
        {showTable && (
          <div className="mt-3 max-h-60 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted"><tr><th>#</th><th>Date</th><th>Balance</th><th>Cumulative R</th></tr></thead>
              <tbody>{view.curve.map((p) => <tr key={p.i}><td>{p.i}</td><td>{p.date}</td><td>{usd(p.equity)}</td><td>{p.r.toFixed(2)}R</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Cumulative R" icon="📐">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={view.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={c('border')} strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="i" {...AXIS} />
              <YAxis {...AXIS} width={40} tickFormatter={(v) => `${v}R`} />
              <ReferenceLine y={0} stroke={c('muted')} />
              <Tooltip {...TIP} formatter={(v) => [`${Number(v).toFixed(2)}R`, 'Cumulative']} labelFormatter={(i) => `Trade #${i}`} />
              <Line type="monotone" dataKey="r" stroke={c('accent')} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-muted">R removes position size from the picture: it shows the quality of your decisions.</p>
      </Card>

      <Card title="Mistake tags per week" icon="👾">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={view.mistakeTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={c('border')} strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="week" {...AXIS} />
              <YAxis {...AXIS} width={28} allowDecimals={false} />
              <Tooltip {...TIP} cursor={{ fill: c('surface2') }} formatter={(v) => [v, 'Mistake tags']} />
              <Bar dataKey="count" fill={c('hp')} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-muted">Shrinking bars mean the monsters are losing.</p>
      </Card>

      <Card title="Performance by…" icon="🔎">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['setup', 'pair', 'hour', 'weekday', 'emotion'] as const).map((d) => (
            <button key={d} className={`chip px-2.5 py-1 text-xs capitalize ${dim === d ? 'chip-on' : ''}`} onClick={() => setDim(d)}>
              {d}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 pr-2 font-medium capitalize">{dim}</th>
                <th className="py-1 pr-2 text-right font-medium">Trades</th>
                <th className="py-1 pr-2 text-right font-medium">Plan</th>
                <th className="py-1 pr-2 text-right font-medium">Win</th>
                <th className="py-1 text-right font-medium">Avg R</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.key} className="border-t border-border/60">
                  <td className="py-1.5 pr-2 capitalize">{b.key}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{b.n}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{pct(b.planRate)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{pct(b.winRate)}</td>
                  <td className="py-1.5 text-right tabular-nums">{r(b.avgR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">Small samples lie. Treat anything under ~20 trades as a hint, not a rule.</p>
      </Card>
    </div>
  );
}
