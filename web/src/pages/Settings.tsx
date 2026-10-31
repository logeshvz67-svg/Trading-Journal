import { useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { AccountForm, accountFromApi, accountPayload, DEFAULT_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Card, Chips, Field, PageTitle, Toggle, errMsg, toast } from '../components/ui';

const ZONES: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? ['UTC'];

export default function Settings() {
  const { me, sb, refreshMe, refreshState, signOut } = useStore();
  const p = me!.profile;
  const [name, setName] = useState<string>(p.display_name);
  const [avatar, setAvatar] = useState<string>(p.avatar);
  const [goal, setGoal] = useState<string>(p.goal ?? '');
  const [tz, setTz] = useState<string>(p.timezone);
  const [account, setAccount] = useState<AccountDraft>(me!.account ? accountFromApi(me!.account) : DEFAULT_ACCOUNT);
  const [oath, setOath] = useState<string[]>(me!.oath.map((o) => o.text));
  const [pw, setPw] = useState('');

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      await refreshMe();
      await refreshState();
      toast(ok, 'ok');
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  const saveSettings = (s: Record<string, unknown>) => run(() => api('/profile', { method: 'PATCH', body: { settings: s } }), 'Saved.');

  return (
    <div className="space-y-4">
      <PageTitle icon="⚙️" title={theme.labels.settings} />

      <Card title="Character" icon="🧙">
        <div className="space-y-3">
          <Field label="Hero name">
            <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {theme.avatars.map((a) => (
              <button key={a.id} type="button" className={`chip text-2xl ${avatar === a.id ? 'chip-on' : ''}`} onClick={() => setAvatar(a.id)} title={a.name}>
                {a.emoji}
              </button>
            ))}
          </div>
          <Field label="Goal">
            <textarea className="input" rows={2} maxLength={300} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <Field label="Timezone" hint="Your trading day (HP reset, daily limits) follows this timezone.">
            <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
              {ZONES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </Field>
          <button className="btn-primary w-full" onClick={() => run(() => api('/profile', { method: 'PATCH', body: { display_name: name, avatar, goal, timezone: tz } }), 'Character saved.')}>
            Save character
          </button>
        </div>
      </Card>

      <Card title="Look & sound" icon="🎨">
        <div className="space-y-3">
          <Field group label="Theme">
            <Chips options={['dark', 'light', 'system'] as const} value={(p.settings?.theme as 'dark') ?? 'dark'} onChange={(t) => saveSettings({ theme: t })} />
          </Field>
          <Toggle checked={!!p.settings?.sound} onChange={(v) => saveSettings({ sound: v })} label="Sound effects" />
        </div>
      </Card>

      <Card title="Account & firm rules" icon="🏰">
        <AccountForm value={account} onChange={setAccount} />
        <p className="mt-3 text-xs text-muted">Changing limits never unlocks a lockout that is already active today.</p>
        <button className="btn-primary mt-3 w-full" onClick={() => run(() => api('/account', { method: 'PUT', body: accountPayload(account) }), 'Rules saved.')}>
          Save rules
        </button>
      </Card>

      <Card title="Trader's Oath" icon="📜">
        <div className="space-y-2">
          {oath.map((r, i) => (
            <div key={i} className="flex gap-2">
              <textarea className="input" rows={2} maxLength={200} value={r} onChange={(e) => setOath((o) => o.map((x, j) => (j === i ? e.target.value : x)))} />
              <button className="btn-ghost px-3" onClick={() => setOath((o) => o.filter((_, j) => j !== i))} aria-label="Remove rule" disabled={oath.length <= 1}>
                ✕
              </button>
            </div>
          ))}
          {oath.length < 10 && (
            <button className="btn-ghost w-full text-sm" onClick={() => setOath((o) => [...o, ''])}>
              + Add rule
            </button>
          )}
          <button className="btn-primary w-full" onClick={() => run(() => api('/oath', { method: 'PUT', body: { rules: oath.map((o) => o.trim()).filter(Boolean) } }), 'Oath re-signed.')}>
            Re-sign the Oath
          </button>
        </div>
      </Card>

      <Card title="Security" icon="🔐">
        <div className="space-y-3">
          <Field label="New password" hint="At least 8 characters.">
            <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <button
            className="btn-ghost w-full"
            disabled={pw.length < 8}
            onClick={async () => {
              const { error } = await sb.auth.updateUser({ password: pw });
              if (error) toast(error.message, 'bad');
              else {
                setPw('');
                toast('Password updated.', 'ok');
              }
            }}
          >
            Change password
          </button>
          <button className="btn-ghost w-full" onClick={signOut}>
            Sign out
          </button>
        </div>
      </Card>
      <p className="text-center text-xs text-muted">CSV export, notifications and delete-my-data arrive in Phase 2.</p>
    </div>
  );
}
