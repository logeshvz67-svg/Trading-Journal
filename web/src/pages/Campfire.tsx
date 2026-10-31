import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { countdown } from '../lib/format';
import { Card, PageTitle } from '../components/ui';

// Phase 1: lockout status + breathing. Phase 2 adds loss cooldowns, the reflection journal and "Stop for today".
export default function Campfire() {
  const { state } = useStore();
  const [now, setNow] = useState(Date.now());
  const [breath, setBreath] = useState<'in' | 'hold' | 'out'>('in');
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const seq: ('in' | 'hold' | 'out')[] = ['in', 'hold', 'out'];
    const dur = { in: 4000, hold: 4000, out: 6000 };
    const t = setTimeout(() => setBreath(seq[(seq.indexOf(breath) + 1) % 3]), dur[breath]);
    return () => clearTimeout(t);
  }, [breath]);

  return (
    <div className="space-y-4">
      <PageTitle icon="🔥" title={theme.labels.campfire} subtitle="Take 30 minutes. The market will still be here." />
      {state?.locked && state.lockEndsAt && (
        <Card>
          <p className="font-semibold">🔒 {state.lockMessage}</p>
          <p className="mt-1 text-sm text-muted">The arena reopens in {countdown(new Date(state.lockEndsAt).getTime() - now)}.</p>
        </Card>
      )}
      <Card title="Breathe with the fire" icon="🌬️">
        <div className="flex flex-col items-center gap-4 py-6">
          <div
            className="flex items-center justify-center rounded-full bg-gold/20 text-sm font-semibold transition-all ease-in-out"
            style={{ width: breath === 'out' ? 90 : 170, height: breath === 'out' ? 90 : 170, transitionDuration: breath === 'out' ? '6s' : '4s' }}
          >
            {breath === 'in' ? 'Breathe in' : breath === 'hold' ? 'Hold' : 'Breathe out'}
          </div>
          <p className="text-center text-sm text-muted">4 in, 4 hold, 6 out. Five rounds calms the Revenge Goblin.</p>
        </div>
      </Card>
      <Card title="Loss-streak protocol" icon="🧭">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Close the charts. Not minimize. Close.</li>
          <li>Write what happened in one sentence, in R, not dollars.</li>
          <li>Ask: did I follow my plan? If yes, this was the cost of doing business.</li>
          <li>Two losses in a row = done for today. Tomorrow is a new battle.</li>
        </ol>
      </Card>
      <Link to="/" className="btn-ghost w-full">
        Back to the Command Center
      </Link>
    </div>
  );
}
