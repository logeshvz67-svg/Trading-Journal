import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AcademyTabs } from './Academy';
import { Card, Empty, Field, PageTitle, Spinner, errMsg, toast } from '../components/ui';

export default function Flashcards() {
  const [data, setData] = useState<any | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const load = () => api('/flashcards/due').then((r) => { setData(r); setI(0); setFlipped(false); }).catch((e) => toast(errMsg(e), 'bad'));
  useEffect(() => {
    load();
  }, []);

  async function review(knew: boolean) {
    const card = data.due[i];
    try {
      const r = await api(`/flashcards/${card.id}/review`, { method: 'POST', body: { knew } });
      toast(knew ? `Next review in ${r.nextInDays} day${r.nextInDays > 1 ? 's' : ''}.` : 'Back to tomorrow’s pile. Repetition is how it sticks.', 'info');
      setFlipped(false);
      setI((x) => x + 1);
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  if (!data) return <Spinner />;
  const card = data.due[i];

  return (
    <div className="space-y-4">
      <PageTitle icon="🃏" title="Flashcards" subtitle="Spaced repetition: cards you know come back after 1, 3, 7, then 14 days." />
      <AcademyTabs />
      <div className="text-xs text-muted">{data.learned} of {data.total} cards well learned · {Math.max(0, data.due.length - i)} due now</div>
      {card ? (
        <div className="space-y-3">
          <button className="card flex min-h-[180px] w-full flex-col items-center justify-center p-6 text-center animate-pop" onClick={() => setFlipped((f) => !f)} aria-label="Flip card">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted">{flipped ? 'Answer' : 'Question'}</div>
            <div className="text-lg font-semibold">{flipped ? card.back : card.front}</div>
            {!flipped && <div className="mt-3 text-xs text-muted">Tap to reveal</div>}
          </button>
          {flipped && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => review(false)}>Still learning</button>
              <button className="btn-primary" onClick={() => review(true)}>I knew it</button>
            </div>
          )}
        </div>
      ) : (
        <Empty icon="🌙" title="All caught up" text="No cards due. Come back tomorrow: a little every day beats a lot once." />
      )}
      <Card title="Make your own card" icon="✍️">
        <div className="space-y-2">
          <Field label="Front"><input className="input" maxLength={300} value={front} onChange={(e) => setFront(e.target.value)} /></Field>
          <Field label="Back"><textarea className="input" rows={2} maxLength={1000} value={back} onChange={(e) => setBack(e.target.value)} /></Field>
          <button className="btn-ghost w-full" disabled={!front.trim() || !back.trim()} onClick={() => api('/flashcards', { method: 'POST', body: { front, back } }).then(() => { setFront(''); setBack(''); toast('Card added.', 'ok'); load(); }).catch((e) => toast(errMsg(e), 'bad'))}>
            Add card
          </button>
        </div>
        {data.own.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {data.own.map((c: any) => (
              <li key={c.id} className="flex justify-between gap-2 rounded-lg bg-surface2 px-3 py-2">
                <span className="truncate">{c.front}</span>
                <button className="text-xs text-muted" aria-label="Delete card" onClick={() => api(`/flashcards/${c.id}`, { method: 'DELETE' }).then(load)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
