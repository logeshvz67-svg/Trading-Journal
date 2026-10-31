import { useEffect, useState, type ReactNode } from 'react';

export function Card({ title, icon, children, className = '', action }: { title?: ReactNode; icon?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`card animate-rise ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-base font-bold">
              {icon && <span className="mr-1.5">{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">
        <span className="mr-2">{icon}</span>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

/** Wrap a single input (renders a <label>), or pass `group` for button groups (renders a labelled group). */
export function Field({ label, hint, error, group, children }: { label: string; hint?: string; error?: string | null; group?: boolean; children: ReactNode }) {
  const body = (
    <>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </>
  );
  if (group) {
    return (
      <div className="block" role="group" aria-label={label}>
        {body}
      </div>
    );
  }
  return <label className="block">{body}</label>;
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[];
  value: T | '' | null | undefined;
  onChange: (v: T) => void;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o} key={o} onClick={() => onChange(o)} className={`chip capitalize ${value === o ? 'chip-on' : ''}`}>
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface2 px-3 py-2.5 text-left">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

/** A labelled progress bar. `remainingPct` = how full the bar is (100 = untouched). */
export function Meter({ label, color, remainingPct, valueText, sub }: { label: string; color: 'hp' | 'shield' | 'focus' | 'xp' | 'gold'; remainingPct: number; valueText: string; sub?: string }) {
  const pct = Math.max(0, Math.min(100, remainingPct));
  const bar = { hp: 'bg-hp', shield: 'bg-shield', focus: 'bg-focus', xp: 'bg-xp', gold: 'bg-gold' }[color];
  const danger = (color === 'hp' || color === 'shield') && pct <= 30;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className={danger ? 'font-semibold text-danger' : 'text-muted'}>{valueText}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'warn' | 'danger' | 'ok' | 'info'; children: ReactNode }) {
  const cls = { warn: 'border-warn/50 bg-warn/10', danger: 'border-danger/60 bg-danger/10', ok: 'border-ok/50 bg-ok/10', info: 'border-primary/50 bg-primary/10' }[tone];
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${cls}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label ?? 'Loading...'}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-display text-lg font-bold">{title}</div>
      <p className="max-w-xs text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

// ---------- toasts ----------
type ToastMsg = { id: number; text: string; tone: 'ok' | 'bad' | 'info' };
const listeners = new Set<(t: ToastMsg) => void>();
export function toast(text: string, tone: ToastMsg['tone'] = 'info') {
  const t = { id: Date.now() + Math.random(), text, tone };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const l = (t: ToastMsg) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4500);
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-pop pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-lg ${t.tone === 'ok' ? 'border-ok/60 bg-surface' : t.tone === 'bad' ? 'border-danger/60 bg-surface' : 'border-border bg-surface'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
