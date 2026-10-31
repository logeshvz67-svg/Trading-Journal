import { useState } from 'react';
import { api } from '../lib/api';
import { showSystemNotification } from '../lib/reminders';
import { useStore } from '../store';
import { Card, Field, Toggle, errMsg, toast } from './ui';

export function NotificationSettings() {
  const { me, refreshMe } = useStore();
  const n = (me?.profile.settings?.notifications ?? {}) as { enabled?: boolean; prep_time?: string };
  const [time, setTime] = useState(n.prep_time ?? '08:00');
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  async function save(patch: { enabled?: boolean; prep_time?: string }) {
    try {
      await api('/profile', { method: 'PATCH', body: { settings: { notifications: { enabled: !!n.enabled, prep_time: n.prep_time ?? '08:00', ...patch } } } });
      await refreshMe();
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  async function toggle(v: boolean) {
    if (v && supported) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return toast('Notifications are blocked in your browser settings.', 'bad');
      await showSystemNotification('Market Quest', 'Notifications are on. The Mentor will nudge you, never nag you.', 'mq-test');
    }
    await save({ enabled: v });
  }

  return (
    <Card title="Notifications" icon="🔔">
      <div className="space-y-3">
        <p className="text-xs text-muted">In-app reminders always show on your Command Center. Browser notifications fire while the app (or its installed PWA) is open or in the background: prep reminder, cooldown over, open trades to journal, streak at risk.</p>
        {supported ? <Toggle checked={!!n.enabled} onChange={toggle} label="Browser notifications" /> : <p className="text-xs text-warn">This browser doesn't support notifications. Install the app to your home screen first (iPhone: Share → Add to Home Screen).</p>}
        <InstallButton />
        <Field label="Pre-Battle Prep reminder time" hint="Uses your profile timezone.">
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} onBlur={() => save({ prep_time: time })} />
        </Field>
      </div>
    </Card>
  );
}

function InstallButton() {
  const [can, setCan] = useState(!!(window as any).__mqInstall);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  if (standalone) return <p className="text-xs text-ok">✓ Running as an installed app.</p>;
  if (!can) return <p className="text-xs text-muted">Install: in Chrome/Android use the menu → "Install app". On iPhone: Share → "Add to Home Screen".</p>;
  return (
    <button
      className="btn-ghost w-full"
      onClick={async () => {
        const e = (window as any).__mqInstall;
        e?.prompt();
        await e?.userChoice;
        (window as any).__mqInstall = null;
        setCan(false);
      }}
    >
      📲 Install Market Quest on this device
    </button>
  );
}
