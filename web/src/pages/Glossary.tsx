import { useState } from 'react';
import { GLOSSARY } from '@shared/glossary';
import { AcademyTabs } from './Academy';
import { PageTitle } from '../components/ui';

export default function Glossary() {
  const [q, setQ] = useState('');
  const items = GLOSSARY.filter((g) => (g.term + g.def).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term));
  return (
    <div className="space-y-4">
      <PageTitle icon="📚" title="Glossary" subtitle="Plain-language definitions for every word you'll meet." />
      <AcademyTabs />
      <input className="input" placeholder="Search a word…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search glossary" />
      <dl className="space-y-2">
        {items.map((g) => (
          <div key={g.term} className="card py-3">
            <dt className="font-semibold">{g.term}</dt>
            <dd className="text-sm text-muted">{g.def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
