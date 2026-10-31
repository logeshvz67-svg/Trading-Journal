import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { dateTime } from '../lib/format';
import { useStore } from '../store';
import { Card, Empty, Field, PageTitle, Spinner, errMsg, toast } from '../components/ui';

const PLAYBOOK_FIELDS: [string, string, string][] = [
  ['name', 'Strategy name', 'e.g. HTF Trend Pullback'],
  ['markets', 'Markets', 'EURUSD, XAUUSD'],
  ['timeframes', 'Timeframes', 'Daily map, 1H entries'],
  ['session', 'Session', 'London open, 08:00–11:00'],
  ['setup', 'The setup', 'Daily uptrend (HH/HL). Price pulls back to a marked support or rising trendline.'],
  ['entry', 'Entry trigger', 'Rejection wick or bullish engulfing at the level, after the candle closes.'],
  ['stop', 'Stop loss', 'Below the support zone / swing low, plus spread buffer.'],
  ['target', 'Target', 'Next resistance, minimum 1:2.'],
  ['management', 'Trade management', 'No moving the stop away. Optional break-even at +1R.'],
  ['avoid', 'When NOT to trade', 'Red-folder news within 30 min, focus < 60, after 2 losses.'],
];

export default function Codex() {
  const { me } = useStore();
  const [data, setData] = useState<any | null>(null);
  const [rule, setRule] = useState('');
  const [pb, setPb] = useState<Record<string, string>>({});
  const load = () => api('/codex').then((r) => { setData(r); setPb(r.playbook ?? {}); }).catch((e) => toast(errMsg(e), 'bad'));
  useEffect(() => {
    load();
  }, []);
  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageTitle icon="📖" title="The Codex" subtitle="Your laws: the Oath you swore, the rules your mistakes taught you, and your one strategy." />

      <Card title="Trader's Oath" icon="📜" action={<Link to="/settings" className="text-xs text-muted underline">Edit</Link>}>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {data.oath.map((o: any) => <li key={o.id}>{o.text}</li>)}
        </ol>
        {data.oath[0]?.signed_at && <p className="mt-2 text-xs text-muted">Signed by {me?.profile.display_name} on {dateTime(data.oath[0].signed_at)}</p>}
      </Card>

      <Card title="Rules I earned from my mistakes" icon="🩹">
        {data.rules.length ? (
          <ul className="space-y-2">
            {data.rules.map((r: any) => (
              <li key={r.id} className="flex gap-2 rounded-xl bg-surface2 p-3 text-sm">
                <span>{r.source === 'auto' ? r.monsters?.emoji ?? '👾' : '✍️'}</span>
                <span className="flex-1">{r.text}</span>
                <button className="text-xs text-muted" aria-label="Remove rule" onClick={() => api(`/codex/rules/${r.id}`, { method: 'DELETE' }).then(load)}>✕</button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="🩹" title="No scars yet" text="When a monster becomes active (3 encounters), its fix is written here automatically. You can add your own rules too." />
        )}
        <div className="mt-3 flex gap-2">
          <input className="input" maxLength={300} value={rule} onChange={(e) => setRule(e.target.value)} placeholder="A rule you learned the hard way" />
          <button className="btn-ghost shrink-0" disabled={rule.trim().length < 3} onClick={() => api('/codex/rules', { method: 'POST', body: { text: rule } }).then(() => { setRule(''); load(); })}>Add</button>
        </div>
      </Card>

      <Card title="My one-strategy playbook" icon="🗡️">
        <p className="mb-3 text-xs text-muted">One setup, written so clearly you could follow it half asleep. Master one before adding another.</p>
        <div className="space-y-3">
          {PLAYBOOK_FIELDS.map(([k, label, ph]) => (
            <Field key={k} label={label}>
              {['setup', 'entry', 'avoid', 'management'].includes(k) ? (
                <textarea className="input" rows={2} value={pb[k] ?? ''} placeholder={ph} onChange={(e) => setPb({ ...pb, [k]: e.target.value })} />
              ) : (
                <input className="input" value={pb[k] ?? ''} placeholder={ph} onChange={(e) => setPb({ ...pb, [k]: e.target.value })} />
              )}
            </Field>
          ))}
          <button className="btn-primary w-full" onClick={() => api('/codex/playbook', { method: 'PUT', body: pb }).then(() => toast('Playbook saved.', 'ok')).catch((e) => toast(errMsg(e), 'bad'))}>
            Save playbook
          </button>
        </div>
      </Card>
    </div>
  );
}
