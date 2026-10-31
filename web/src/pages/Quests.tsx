import { useStore } from '../store';
import { Card, Meter, PageTitle, Spinner } from '../components/ui';

const SECTIONS = [
  { type: 'story', title: 'Story', icon: '📖', hint: 'Your path, one chapter at a time.' },
  { type: 'daily', title: 'Daily', icon: '☀️', hint: 'Resets at your local midnight.' },
  { type: 'weekly', title: 'Weekly', icon: '📅', hint: 'Resets every Monday.' },
  { type: 'challenge', title: 'Challenges', icon: '⚔️', hint: 'Long fights against old habits.' },
];

export default function Quests() {
  const { state } = useStore();
  if (!state) return <Spinner />;
  return (
    <div className="space-y-4">
      <PageTitle icon="📜" title="Quest Board" subtitle="Quests track themselves from your journal. No quest ever rewards profit." />
      {SECTIONS.map((s) => {
        const qs = state.quests.filter((q) => q.type === s.type);
        if (!qs.length) return null;
        return (
          <Card key={s.type} title={s.title} icon={s.icon} action={<span className="text-xs text-muted">{s.hint}</span>}>
            <ul className="space-y-4">
              {qs.map((q) => (
                <li key={q.id} className={q.completed ? 'opacity-70' : ''}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {q.completed ? '✅ ' : ''}
                        {q.title}
                      </div>
                      <div className="text-xs text-muted">{q.description}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      {q.xp_reward > 0 && <div className="text-xp">+{q.xp_reward} XP</div>}
                      {q.gold_reward > 0 && <div className="text-gold">+{q.gold_reward} gold</div>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Meter label="" color="xp" remainingPct={(q.progress / q.target) * 100} valueText={`${q.progress}/${q.target}`} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
