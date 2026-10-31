import type { ReactNode } from 'react';

// Minimal, safe markdown: "## heading", "- bullet", "1. item", "**bold**", paragraphs.
// Builds React elements (no innerHTML), so lesson text can never inject HTML.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (b.startsWith('## ')) return <h3 key={i} className="pt-2 font-display text-lg font-bold">{b.slice(3)}</h3>;
        if (lines.every((l) => l.startsWith('- '))) return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i} className="list-decimal space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>)}</ol>;
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}
