import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { COPY } from '@shared/copy';
import { useStore } from '../store';
import { Banner, Field } from '../components/ui';

export default function Login() {
  const { sb } = useStore();
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'up') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setInfo('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/settings` });
        if (error) throw error;
        setInfo('If that email has an account, a reset link is on its way. It signs you in; then set a new password in Settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="text-6xl">🏰</div>
        <h1 className="mt-3 font-display text-3xl font-bold">Market Quest</h1>
        <p className="mt-3 text-sm text-muted">{COPY.welcome}</p>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode !== 'reset' && (
          <Field label="Password">
            <input
              className="input"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'up' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
        {info && <Banner tone="info">{info}</Banner>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? '...' : mode === 'in' ? 'Enter the kingdom' : mode === 'up' ? 'Create my character' : 'Send reset link'}
        </button>
        <div className="flex justify-between text-sm text-muted">
          {mode === 'in' ? (
            <>
              <button type="button" className="underline" onClick={() => setMode('up')}>
                New here? Sign up
              </button>
              <button type="button" className="underline" onClick={() => setMode('reset')}>
                Forgot password
              </button>
            </>
          ) : (
            <button type="button" className="underline" onClick={() => setMode('in')}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        {COPY.disclaimer}{' '}
        <Link to="/disclaimer" className="underline">
          Details
        </Link>
      </p>
    </div>
  );
}
