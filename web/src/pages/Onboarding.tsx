import { useState } from 'react';
import { COPY } from '@shared/copy';
import { ASSESSMENT, DEFAULT_OATH, PERSONALITY_COPY, scoreAssessment } from '@shared/onboarding';
import { api } from '../lib/api';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { AccountForm, accountPayload, DEFAULT_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Banner, Field, errMsg } from '../components/ui';

const STEPS = ['Welcome', 'Character', 'Self-check', 'Your rules', 'Oath', 'First quest'];

export default function Onboarding() {
  const { refreshMe, signOut } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(theme.avatars[0].id);
  const [goal, setGoal] = useState('Pass my $5k evaluation by following my rules, not by chasing profit.');
  const [answers, setAnswers] = useState<number[]>(Array(ASSESSMENT.length).fill(-1));
  const [account, setAccount] = useState<AccountDraft>(DEFAULT_ACCOUNT);
  const [oath, setOath] = useState<string[]>(DEFAULT_OATH);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const scored = answers.every((a) => a >= 0) ? scoreAssessment(answers) : null;

  const canNext = [true, name.trim().length > 0, !!scored, true, signed && oath.every((o) => o.trim()), true][step];

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api('/onboarding', {
        method: 'POST',
        body: {
          profile: { display_name: name.trim(), avatar, goal: goal.trim() || null, timezone: tz },
          assessment: answers,
          account: accountPayload(account),
          oath: oath.map((o) => o.trim()).filter(Boolean),
        },
      });
      await refreshMe();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface2'}`} title={s} />
        ))}
      </div>
      <p className="mb-1 text-xs uppercase tracking-widest text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      <div className="card animate-rise space-y-4">
        {step === 0 && (
          <div className="space-y-4 py-4 text-center">
            <div className="text-6xl">🏰</div>
            <h1 className="text-2xl font-bold">Welcome, traveler</h1>
            <p className="text-muted">{COPY.welcome}</p>
            <Banner tone="info">
              In this kingdom, <b>XP rewards discipline, never profit.</b> A loss where you followed your plan earns XP. A win where you broke your rules costs XP.
            </Banner>
          </div>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold">Create your character</h2>
            <Field label="Hero name">
              <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steady Hand" />
            </Field>
            <div>
              <span className="label">Avatar</span>
              <div className="grid grid-cols-3 gap-2">
                {theme.avatars.map((a) => (
                  <button key={a.id} type="button" onClick={() => setAvatar(a.id)} className={`chip flex flex-col items-center py-3 ${avatar === a.id ? 'chip-on' : ''}`}>
                    <span className="text-3xl">{a.emoji}</span>
                    <span className="text-xs">{a.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Your goal" hint="A process goal works best.">
              <textarea className="input" rows={2} maxLength={300} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold">Self-check</h2>
            <p className="text-sm text-muted">No wrong answers. This only tunes your tips.</p>
            {ASSESSMENT.map((q, qi) => (
              <div key={qi}>
                <div className="mb-2 text-sm font-semibold">{q.q}</div>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={`chip block w-full rounded-xl text-left ${answers[qi] === oi ? 'chip-on' : ''}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {scored && (
              <Banner tone="info">
                <b>{PERSONALITY_COPY[scored.personality].title}.</b> {PERSONALITY_COPY[scored.personality].text}
              </Banner>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold">Your account rules</h2>
            <p className="text-sm text-muted">Copy these from your prop firm's rules page. They power your HP and Shield bars and the lockout.</p>
            <AccountForm value={account} onChange={setAccount} />
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-xl font-bold">The Trader's Oath</h2>
            <p className="text-sm text-muted">Seven rules you promise to follow. Edit them so they're truly yours.</p>
            {oath.map((rule, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2.5 w-5 text-right text-sm text-muted">{i + 1}.</span>
                <textarea className="input" rows={2} maxLength={200} value={rule} onChange={(e) => setOath((o) => o.map((r, j) => (j === i ? e.target.value : r)))} />
              </div>
            ))}
            <label className="flex items-center gap-3 rounded-xl bg-surface2 p-3">
              <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--c-primary))]" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
              <span className="text-sm">
                I, <b>{name || 'warrior'}</b>, swear to follow this Oath. When I break it, I will log it honestly.
              </span>
            </label>
          </>
        )}

        {step === 5 && (
          <div className="space-y-4 py-2 text-center">
            <div className="text-5xl">📜</div>
            <h2 className="text-xl font-bold">Your first quest: The First Watch</h2>
            <p className="text-muted">
              Before any battle, a warrior prepares. Complete your first <b>Pre-Battle Prep</b>: check your mood, sleep and the news, and set today's limits.
            </p>
            <Banner tone="ok">Reward: +10 XP and the path to the Battle Station.</Banner>
            {error && <Banner tone="danger">{error}</Banner>}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between gap-3">
        {step > 0 ? (
          <button className="btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
            Back
          </button>
        ) : (
          <button className="btn-ghost" onClick={signOut}>
            Sign out
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            {step === 4 ? 'Sign the Oath' : 'Continue'}
          </button>
        ) : (
          <button className="btn-primary" disabled={busy} onClick={finish}>
            {busy ? 'Entering...' : 'Accept quest'}
          </button>
        )}
      </div>
    </div>
  );
}
