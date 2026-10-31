import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { AcademyTabs } from './Academy';
import { CandleChart } from '../components/CandleChart';
import { QuizRunner, type QuizResult } from '../components/QuizRunner';
import { Card, PageTitle, Spinner, errMsg, toast } from '../components/ui';

export default function Drills() {
  const { id } = useParams();
  return id ? <DrillRun id={id} /> : <DrillList />;
}

function DrillList() {
  const [drills, setDrills] = useState<any[] | null>(null);
  useEffect(() => {
    api('/drills').then((r) => setDrills(r.drills)).catch((e) => toast(errMsg(e), 'bad'));
  }, []);
  return (
    <div className="space-y-4">
      <PageTitle icon="📈" title="Chart Drills" subtitle="Practice reading structure and doing risk math on training charts. Score 80%+ for +20 XP (once per drill per day)." />
      <AcademyTabs />
      {!drills ? <Spinner /> : (
        <ul className="space-y-2">
          {drills.map((d) => (
            <li key={d.id}>
              <Link to={`/academy/drills/${d.id}`} className="card flex items-center justify-between">
                <span>
                  <span className="block font-semibold">{d.title}</span>
                  <span className="text-xs capitalize text-muted">Zone {d.zone} · {d.kind}</span>
                </span>
                <span className={`text-sm ${d.best >= 80 ? 'text-ok' : 'text-muted'}`}>{d.best === null ? 'new' : `best ${d.best}%`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DrillRun({ id }: { id: string }) {
  const { refreshState, refreshMe } = useStore();
  const [drill, setDrill] = useState<any | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    api(`/drills/${id}`).then((r) => setDrill(r.drill)).catch((e) => toast(errMsg(e), 'bad'));
  }, [id]);
  if (!drill) return <Spinner />;
  return (
    <div className="space-y-4">
      <Link to="/academy/drills" className="text-sm text-muted">← Drills</Link>
      <h1 className="text-2xl font-bold">{drill.title}</h1>
      <Card>
        <CandleChart payload={drill.payload} />
        <p className="mt-2 text-[11px] text-muted">Training chart generated for practice. Not real market data.</p>
      </Card>
      <Card title="Questions" icon="❓" action={result && <button className="text-xs text-muted underline" onClick={() => { setResult(null); setAttempt((a) => a + 1); }}>Try again</button>}>
        <QuizRunner
          key={attempt}
          questions={drill.payload.questions}
          result={result}
          onSubmit={async (answers) => {
            try {
              const r = await api(`/drills/${id}`, { method: 'POST', body: { answers } });
              setResult({ ...r, passed: r.score >= 80 });
              playSound(r.score >= 80 ? 'good' : 'bad');
              if (r.xp?.delta) {
                toast(`Drill cleared! +${r.xp.delta} XP`, 'ok');
                await Promise.all([refreshState(), refreshMe()]);
              }
            } catch (e) {
              toast(errMsg(e), 'bad');
            }
          }}
        />
      </Card>
    </div>
  );
}
