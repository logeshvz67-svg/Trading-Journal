const MESSAGES = [
  'Waking the server...',
  'The castle gates are creaking open...',
  'Free servers nap when idle. This takes up to a minute.',
  'Lighting the torches...',
  'Almost there. Use the wait: breathe in for 4, out for 6.',
];

export function WakeScreen({ attempt, failed, dbPaused, onRetry }: { attempt: number; failed?: boolean; dbPaused?: boolean; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl animate-pulse">🏰</div>
      <h1 className="font-display text-2xl font-bold">Market Quest</h1>
      {dbPaused ? (
        <>
          <p className="max-w-sm text-sm text-muted">
            The app is awake, but its database is <b>paused</b>. Free Supabase projects pause after 7 days without use. Your data is safe.
          </p>
          <ol className="max-w-sm list-decimal space-y-1 pl-5 text-left text-sm text-muted">
            <li>Open supabase.com and your project</li>
            <li>Click <b>Restore project</b> and wait 2-3 minutes</li>
            <li>Come back and press Try again</li>
          </ol>
          <button className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : failed ? (
        <>
          <p className="max-w-xs text-sm text-muted">The server didn't wake up. Check your connection, then try again.</p>
          <button className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="max-w-xs text-sm text-muted">{MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(attempt / 2))]}</p>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface2">
            <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(95, attempt * 9)}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
