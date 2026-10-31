import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, PageTitle, Spinner, errMsg } from '../components/ui';

export const ZONES = [
  { zone: 1, name: 'Candle Village', icon: '🕯️' },
  { zone: 2, name: 'Structure Forest', icon: '🌲' },
  { zone: 3, name: 'Entry Canyon', icon: '🏜️' },
  { zone: 4, name: 'Risk Fortress', icon: '🏯' },
  { zone: 5, name: 'Mind Temple', icon: '🛕' },
  { zone: 6, name: 'Boss Castle', icon: '🏰' },
  { zone: 7, name: "Master's Tower", icon: '🗼' },
];

export function AcademyTabs() {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface2 p-1 text-center text-xs">
      {[
        ['/academy', '🗺️ Map'],
        ['/academy/cards', '🃏 Cards'],
        ['/academy/drills', '📈 Drills'],
        ['/academy/glossary', '📚 Words'],
      ].map(([to, label]) => (
        <Link key={to} to={to} className="rounded-lg py-2 font-semibold hover:bg-surface">
          {label}
        </Link>
      ))}
    </div>
  );
}

export default function Academy() {
  const [lessons, setLessons] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api('/academy').then((r) => setLessons(r.lessons)).catch((e) => setError(errMsg(e)));
  }, []);

  return (
    <div className="space-y-4">
      <PageTitle icon="🎓" title="Training Academy" subtitle="Ten-minute lessons. Pass each quiz with 80% to unlock the next path." />
      <AcademyTabs />
      {error && <p className="text-danger">{error}</p>}
      {!lessons && !error && <Spinner />}
      {lessons &&
        ZONES.map((z) => {
          const ls = lessons.filter((l) => l.zone === z.zone);
          const real = ls.filter((l) => !l.is_stub);
          const done = real.filter((l) => l.status === 'passed').length;
          const zoneLocked = ls.every((l) => l.locked);
          return (
            <Card key={z.zone} title={`${z.name}`} icon={z.icon} action={<span className="text-xs text-muted">{real.length ? `${done}/${real.length} passed` : 'coming soon'}</span>}>
              <ol className={`space-y-1.5 ${zoneLocked && !real.length ? 'opacity-60' : ''}`}>
                {ls.map((l) => {
                  const icon = l.status === 'passed' ? '✅' : l.is_stub ? '🛠️' : l.locked ? '🔒' : '📘';
                  const body = (
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="flex-1">{l.title}</span>
                      <span className="text-xs text-muted">{l.is_stub ? 'soon' : l.score !== null ? `${l.score}%` : `${l.est_minutes} min`}</span>
                    </span>
                  );
                  return (
                    <li key={l.id}>
                      {l.locked && !l.is_stub ? (
                        <div className="rounded-xl bg-surface2 px-3 py-2.5 text-sm text-muted">{body}</div>
                      ) : (
                        <Link to={`/academy/lesson/${l.id}`} className="block rounded-xl bg-surface2 px-3 py-2.5 text-sm hover:bg-border">
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })}
    </div>
  );
}
