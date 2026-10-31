import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Markdown } from '../components/Markdown';
import { ScreenshotInput } from '../components/ScreenshotInput';
import { Banner, Card, PageTitle, Spinner, errMsg } from '../components/ui';

type Mode = 'ask' | 'review' | 'explain' | 'briefing' | 'debrief' | 'patterns';
const MODES: { id: Mode; icon: string; label: string; hint: string }[] = [
  { id: 'ask', icon: '💬', label: 'Ask', hint: 'Any beginner question about candles, levels, risk or mindset.' },
  { id: 'review', icon: '🖼️', label: 'Chart review', hint: 'Upload a chart; the Mentor describes structure and checks your plan against your rules.' },
  { id: 'explain', icon: '🔍', label: 'Explain a mistake', hint: 'Open from a trade in your Battle Log. The Mentor asks you questions first.' },
  { id: 'briefing', icon: '🌅', label: 'Daily briefing', hint: 'Your limits, active monster and one focus for today.' },
  { id: 'debrief', icon: '🌙', label: 'End-of-day debrief', hint: "Process review of today's trades." },
  { id: 'patterns', icon: '🧩', label: 'Pattern spotter', hint: 'Needs 20+ closed trades.' },
];

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export default function Mentor() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<{ enabled: boolean; used: number; limit: number } | null>(null);
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'ask');
  const tradeId = params.get('trade') ?? undefined;
  const [shot, setShot] = useState<string | null>(params.get('shot'));
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/mentor/status').then(setStatus).catch(() => setStatus({ enabled: false, used: 0, limit: 0 }));
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function send(text: string) {
    setBusy(true);
    setError(null);
    const history = msgs;
    if (text) setMsgs((m) => [...m, { role: 'user', content: text }]);
    try {
      const r = await api('/mentor', {
        method: 'POST',
        retries: 0,
        body: { mode, message: text, history, trade_id: tradeId, screenshot_path: mode === 'review' && !history.length ? shot ?? undefined : undefined },
      });
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply }]);
      setStatus((s) => (s ? { ...s, used: r.used } : s));
      setInput('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : errMsg(e));
      if (text) setMsgs((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <Spinner />;
  const m = MODES.find((x) => x.id === mode)!;
  const oneShot = mode === 'briefing' || mode === 'debrief' || mode === 'patterns';
  const limitReached = status.used >= status.limit;

  return (
    <div className="space-y-4">
      <PageTitle icon="🧙" title="The Mentor" subtitle="A patient tutor for beginners. Never gives signals or price predictions." />
      <Banner tone="info">The Mentor is an AI tutor for learning and journaling. It is not financial advice, can be wrong, and never tells you what to buy or sell.</Banner>

      {!status.enabled ? (
        <Card>
          <p className="text-sm">The Mentor is resting: no AI key is configured on this server. Every other part of Market Quest works without it.</p>
          <p className="mt-2 text-xs text-muted">To enable it, add ANTHROPIC_API_KEY in Render → Environment (see docs/RENDER_DEPLOY.md).</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MODES.map((x) => (
              <button key={x.id} className={`chip shrink-0 text-xs ${mode === x.id ? 'chip-on' : ''}`} onClick={() => { setMode(x.id); setMsgs([]); setError(null); }}>
                {x.icon} {x.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{m.hint} · {status.used}/{status.limit} questions used today</p>
          {mode === 'explain' && !tradeId && <Banner tone="warn">Open a closed trade in your Battle Log and tap "Ask the Mentor why" to start this mode.</Banner>}
          {mode === 'review' && msgs.length === 0 && <ScreenshotInput value={shot} onChange={setShot} />}

          <div className="space-y-3">
            {msgs.map((x, i) => (
              <div key={i} className={`rounded-card p-3 text-sm ${x.role === 'user' ? 'ml-8 bg-primary/15' : 'mr-4 border border-border bg-surface'}`}>
                {x.role === 'assistant' ? <Markdown text={x.content} /> : <p className="whitespace-pre-wrap">{x.content}</p>}
              </div>
            ))}
            {busy && <Spinner label="The Mentor is thinking..." />}
            <div ref={endRef} />
          </div>
          {error && <Banner tone="warn">{error}</Banner>}

          {limitReached ? (
            <Banner tone="warn">The Mentor has answered {status.limit} questions today and is resting by the fire. Come back tomorrow.</Banner>
          ) : oneShot && msgs.length === 0 ? (
            <button className="btn-primary w-full" disabled={busy} onClick={() => send('')}>
              {m.icon} Get my {m.label.toLowerCase()}
            </button>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim() || (mode === 'review' && shot && !msgs.length)) send(input.trim() || 'Please review my chart.');
              }}
            >
              <textarea className="input" rows={2} maxLength={2000} value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'explain' && !msgs.length ? 'What do you think went wrong?' : 'Ask the Mentor…'} />
              <button className="btn-primary shrink-0" disabled={busy || (mode === 'explain' && !tradeId)}>Send</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
