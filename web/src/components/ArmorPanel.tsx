import type { ArmorReport } from '@shared/armor';

export function ArmorPanel({ report, title = 'Armor check' }: { report: ArmorReport; title?: string }) {
  return (
    <div className={`rounded-card border-2 p-4 ${report.passed ? 'border-ok/60 bg-ok/5' : 'border-danger/50 bg-danger/5'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold">🛡️ {title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${report.passed ? 'bg-ok/20 text-ok' : 'bg-danger/20 text-danger'}`}>
          {report.passed ? 'Battle Approved' : 'Retreat'}
        </span>
      </div>
      <p className="mb-3 text-sm font-semibold">{report.headline}</p>
      <ul className="space-y-1.5">
        {report.items.map((i) => (
          <li key={i.key} className="flex gap-2 text-sm">
            <span aria-hidden>{i.pass ? '✅' : '❌'}</span>
            <span>
              <span className="font-medium">{i.label}</span>
              <span className="block text-xs text-muted">{i.message}</span>
            </span>
          </li>
        ))}
      </ul>
      {report.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-warn">
          {report.warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
