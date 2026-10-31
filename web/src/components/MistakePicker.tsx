import { useMonsters } from '../lib/monsters';

export function MistakePicker({ value, onChange, locked = [] }: { value: string[]; onChange: (v: string[]) => void; locked?: string[] }) {
  const data = useMonsters();
  if (!data) return <div className="text-sm text-muted">Loading monsters...</div>;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="flex flex-wrap gap-2">
      {data.monsters.map((m) => {
        const isLocked = locked.includes(m.id);
        const on = isLocked || value.includes(m.id);
        return (
          <button key={m.id} type="button" disabled={isLocked} title={m.signs} onClick={() => toggle(m.id)} className={`chip text-xs ${on ? 'border-danger bg-danger/15' : ''}`}>
            {m.emoji} {m.name}
          </button>
        );
      })}
    </div>
  );
}
