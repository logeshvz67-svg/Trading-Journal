import { EMOTIONS, type Emotion } from '@shared/constants';
import { estimatePnl } from '@shared/risk';
import { theme } from '../theme/config';
import { Chips, Field, Toggle } from './ui';
import { MistakePicker } from './MistakePicker';
import { ScreenshotInput } from './ScreenshotInput';

export interface CloseDraft {
  exit_price: string;
  pnl: string;
  closed_at: string; // datetime-local in the user's timezone
  emotion_after: Emotion | '';
  followed_plan: boolean | null;
  stop_moved: boolean;
  mistakes: string[];
  notes_good: string;
  notes_improve: string;
  screenshot_url: string | null;
}

export const emptyClose = (closedAtLocal: string): CloseDraft => ({
  exit_price: '',
  pnl: '',
  closed_at: closedAtLocal,
  emotion_after: '',
  followed_plan: null,
  stop_moved: false,
  mistakes: [],
  notes_good: '',
  notes_improve: '',
  screenshot_url: null,
});

export function CloseForm({
  value,
  onChange,
  trade,
  lockedTags = [],
}: {
  value: CloseDraft;
  onChange: (v: CloseDraft) => void;
  trade: { direction: 'long' | 'short'; entry: string; lot_size?: string; pip_size?: string; pip_value?: string };
  lockedTags?: string[];
}) {
  const set = <K extends keyof CloseDraft>(k: K, v: CloseDraft[K]) => onChange({ ...value, [k]: v });
  const est = trade.lot_size && trade.pip_size && trade.pip_value && value.exit_price ? estimatePnl(trade.direction, trade.entry, value.exit_price, trade.lot_size, trade.pip_size, trade.pip_value) : null;
  const hasTags = value.mistakes.length > 0 || value.stop_moved || lockedTags.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Exit price">
          <input className="input" inputMode="decimal" value={value.exit_price} onChange={(e) => set('exit_price', e.target.value)} />
        </Field>
        <Field label="P/L from broker ($)" hint={est ? `Estimate: $${est} (before fees). Leave blank to use it.` : 'Include fees. Negative for a loss.'}>
          <input className="input" inputMode="decimal" value={value.pnl} onChange={(e) => set('pnl', e.target.value)} placeholder={est ?? '-50.00'} />
        </Field>
      </div>
      <Field label="Closed at">
        <input className="input" type="datetime-local" value={value.closed_at} onChange={(e) => set('closed_at', e.target.value)} />
      </Field>
      <Field group label="How do you feel now?">
        <Chips options={EMOTIONS} value={value.emotion_after} onChange={(v) => set('emotion_after', v)} render={(m) => `${theme.moods[m].emoji} ${theme.moods[m].label}`} />
      </Field>

      <div className="space-y-2">
        <span className="label">Did you follow your plan? (The only question XP cares about.)</span>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`chip rounded-xl py-3 ${value.followed_plan === true ? 'border-ok bg-ok/20' : ''}`} onClick={() => set('followed_plan', true)}>
            ✅ Yes, by the book
          </button>
          <button type="button" className={`chip rounded-xl py-3 ${value.followed_plan === false ? 'border-danger bg-danger/20' : ''}`} onClick={() => set('followed_plan', false)}>
            ❌ No, I broke it
          </button>
        </div>
        <Toggle checked={value.stop_moved} onChange={(v) => set('stop_moved', v)} label="I moved my stop further away or removed it" />
      </div>

      <Field group label="Mistake monsters (honest tags earn +15 XP)" hint="Any tag means the plan wasn't fully followed.">
        <MistakePicker value={value.mistakes} onChange={(v) => set('mistakes', v)} locked={lockedTags} />
      </Field>
      {value.followed_plan === true && hasTags && <p className="text-xs text-warn">You tagged a mistake, so this trade will count as plan broken. Honesty still earns its bonus.</p>}

      <Field label="What went well?">
        <textarea className="input" rows={2} maxLength={2000} value={value.notes_good} onChange={(e) => set('notes_good', e.target.value)} />
      </Field>
      <Field label="What will you improve?">
        <textarea className="input" rows={2} maxLength={2000} value={value.notes_improve} onChange={(e) => set('notes_improve', e.target.value)} />
      </Field>
      <ScreenshotInput value={value.screenshot_url} onChange={(p) => set('screenshot_url', p)} />
    </div>
  );
}

export function closePayload(d: CloseDraft, closedAtIso: string) {
  return {
    exit_price: d.exit_price,
    pnl: d.pnl.trim() === '' ? null : d.pnl,
    closed_at: closedAtIso,
    emotion_after: d.emotion_after,
    followed_plan: d.followed_plan === true,
    stop_moved: d.stop_moved,
    mistakes: d.mistakes,
    notes_good: d.notes_good || null,
    notes_improve: d.notes_improve || null,
    screenshot_url: d.screenshot_url,
  };
}

export function closeReady(d: CloseDraft) {
  return !!d.exit_price && !!d.emotion_after && d.followed_plan !== null && !!d.closed_at;
}
