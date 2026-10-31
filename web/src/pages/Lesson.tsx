import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { Markdown } from '../components/Markdown';
import { QuizRunner, type QuizResult } from '../components/QuizRunner';
import { Banner, Card, Spinner, errMsg, toast } from '../components/ui';

export default function Lesson() {
  const { id } = useParams();
  const { refreshState, refreshMe } = useStore();
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [notes, setNotes] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setData(null);
    setResult(null);
    api(`/lessons/${id}`)
      .then((r) => {
        setData(r);
        setNotes(r.notes);
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <Banner tone="warn">{error} <Link to="/academy" className="underline">Back to the map</Link></Banner>;
  if (!data) return <Spinner />;
  const l = data.lesson;

  return (
    <div className="space-y-4">
      <Link to="/academy" className="text-sm text-muted">← Academy</Link>
      <h1 className="text-2xl font-bold">{l.title}</h1>
      <p className="text-xs text-muted">Zone {l.zone} · about {l.est_minutes} minutes{data.progress.status === 'passed' ? ' · ✅ passed' : ''}</p>
      <Card>
        <Markdown text={l.content} />
      </Card>

      {l.quiz.length > 0 && (
        <Card title={`Quiz gate (${l.pass_mark}% to pass)`} icon="🗝️" action={result && <button className="text-xs text-muted underline" onClick={() => { setResult(null); setAttempt((a) => a + 1); }}>Try again</button>}>
          <QuizRunner
            key={attempt}
            questions={l.quiz}
            passMark={l.pass_mark}
            result={result}
            onSubmit={async (answers) => {
              try {
                const r = await api(`/lessons/${id}/quiz`, { method: 'POST', body: { answers } });
                setResult(r);
                if (r.passed) {
                  playSound('level');
                  if (r.xp?.delta) toast(`Lesson passed! +${r.xp.delta} XP`, 'ok');
                  await Promise.all([refreshState(), refreshMe()]);
                } else playSound('bad');
              } catch (e) {
                toast(errMsg(e), 'bad');
              }
            }}
          />
        </Card>
      )}

      <Card title="My notes" icon="📝">
        <textarea className="input" rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write the lesson in your own words. It sticks better." />
        <button className="btn-ghost mt-2 w-full" onClick={() => api(`/lessons/${id}/notes`, { method: 'PUT', body: { notes } }).then(() => toast('Notes saved.', 'ok')).catch((e) => toast(errMsg(e), 'bad'))}>
          Save notes
        </button>
      </Card>
    </div>
  );
}
