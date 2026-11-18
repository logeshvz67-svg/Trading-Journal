import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Catches render errors so a bug shows a friendly message instead of a blank/black screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Market Quest crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl">🛠️</div>
        <h1 className="font-display text-xl font-bold">Something went wrong on this screen</h1>
        <p className="text-sm text-muted">Your saved data is safe. Reload to continue. If it keeps happening, send a screenshot of this message.</p>
        <p className="max-w-full break-words rounded-lg bg-surface2 px-3 py-2 font-mono text-xs text-muted">{this.state.error.message}</p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
