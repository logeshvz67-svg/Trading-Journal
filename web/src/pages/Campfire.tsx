import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { countdown, dateTime } from '../lib/format';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Banner, Card, PageTitle, errMsg, toast } from '../components/ui';

const PROMPTS = [
  'What happened today, in one sentence, measured in R (not dollars)?',
  'Did I follow my Oath? Where exactly did I bend it?',
  'What did my body feel before my best and worst decision?',
  'What is ONE thing I will do differently tomorrow?',
];

export default function Campfire() {
  const { state, tz, refreshState, refreshMe } = useStore();
  const [now, setNow] = useState(Date.now());
  const [breath, setBreath] = useState<'in' | 'hold' | 'out'>('in');
  const [rounds, setRounds] = useState(0);
  const [text, setText] = useState('');
  const [past, setPast] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const seq: ('in' | 'hold' | 'out')[] = ['in', 'hold', 'out'];
    const dur = { in: 4000, hold: 4000, out: 6000 };
    const t = setTimeout(() => {
      const next = seq[(seq.indexOf(breath) + 1) % 3];
      if (next === 'in') setRounds((r) => r + 1);
      setBreath(next);
    }, dur[breath]);
    return () => clearTimeout(t);
  }, [breath]);

  const loadPast = () =>
    api('/reflections?limit=10')
      .then((r) => {
        setPast(r.reflections);
        const today = r.reflections.find((x: any) => x.reflection_date === state?.today);
        if (today && !text) setText(today.text);
      })
      .catch(() => {});
  useEffect(() => {
    loadPast();
  }, [state?.today]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a cooldown ends on the client clock, refresh the server state (no server timers involved).
  const remaining = state?.lockEndsAt ? new Date(state.lockEndsAt).getTime() - now : 0;
  useEffect(() => {
    if (state?.locked && remaining <= 0) refreshState().catch(() => {});
  }, [state?.locked, remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveReflection() {
    setBusy(true);
    try {
      const r = await api('/reflections', { method: 'POST', body: { text } });
      await Promise.all([refreshState(), refreshMe(), loadPast()]);
      toast(r.xp.delta ? `Reflection saved. +${r.xp.delta} XP` : 'Reflection updated.', 'ok');
      if (r.xp.delta) playSound('good');
    } catch (e) {
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function stopForToday() {
    if (!confirm('Stop trading for the rest of today? The Battle Station will lock until midnight.')) return;
    try {
      const r = await api('/campfire/stop', { method: 'POST' });
      await Promise.all([refreshState(), refreshMe()]);
      toast(r.xp.delta ? r.message : 'Already resting for today.', 'ok');
      playSound('level');
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  const stopped = state?.lockReason === 'stop_for_today';

  return (
    <div className="space-y-4">
      <PageTitle icon="🔥" title={theme.labels.campfire} subtitle="Take 30 minutes. The market will still be here." />

      {state?.locked && state.lockEndsAt ? (
        <Card>
          <div className="text-center">
            <div className="text-4xl">🔥</div>
            <p className="mt-2 font-semibold">{state.lockMessage}</p>
            <div className="mt-3 font-display text-4xl font-bold tabular-nums">{countdown(remaining)}</div>
            <p className="mt-1 text-xs text-muted">until the arena reopens · the timer lives in the database, so refreshing won't skip it</p>
          </div>
        </Card>
      ) : (
        <Banner tone="ok">No cooldown active. Rest here anytime; resting is part of the craft.</Banner>
      )}

      <Card title="Breathe with the fire" icon="🌬️">
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className="flex items-center justify-center rounded-full bg-gold/20 text-sm font-semibold ring-4 ring-gold/20 transition-all ease-in-out"
            style={{ width: breath === 'out' ? 90 : 170, height: breath === 'out' ? 90 : 170, transitionDuration: breath === 'out' ? '6s' : '4s' }}
          >
            {breath === 'in' ? 'Breathe in' : breath === 'hold' ? 'Hold' : 'Breathe out'}
          </div>
          <p className="text-center text-sm text-muted">4 in · 4 hold · 6 out · rounds: {rounds}/5</p>
        </div>
      </Card>

      <Card title="Loss-streak protocol" icon="🧭">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>After any loss: 30-minute cooldown (automatic).</li>
          <li>Close the charts. Not minimize. Close.</li>
          <li>Write what happened in one sentence, in R, not dollars.</li>
          <li>Ask: did I follow my plan? If yes, this was the cost of doing business.</li>
          <li>Two losses in a row = done for today (automatic lock until midnight).</li>
        </ol>
      </Card>

      <Card title="Reflection journal (+10 XP once a day)" icon="🪶">
        <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
          {PROMPTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <textarea className="input" rows={5} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write freely. Nobody else reads this." />
        <button className="btn-primary mt-3 w-full" disabled={busy || text.trim().length < 10} onClick={saveReflection}>
          Save today's reflection
        </button>
        {past.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">Past reflections</summary>
            <ul className="mt-2 space-y-2">
              {past.map((r) => (
                <li key={r.id} className="rounded-xl bg-surface2 p-3 text-sm">
                  <div className="mb-1 text-xs text-muted">{dateTime(r.created_at, tz)}</div>
                  <p className="whitespace-pre-wrap">{r.text}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title="Know when to stop" icon="🌙">
        <p className="mb-3 text-sm text-muted">Ending the day on purpose is a master's move. It locks the Battle Station until midnight and earns +25 XP once a day.</p>
        <button className="btn-ghost w-full" disabled={stopped} onClick={stopForToday}>
          {stopped ? '🌙 Resting until tomorrow' : '🌙 Stop for today (+25 XP)'}
        </button>
      </Card>

      <Link to="/" className="btn-ghost w-full">
        Back to the Command Center
      </Link>
    </div>
  );
}
