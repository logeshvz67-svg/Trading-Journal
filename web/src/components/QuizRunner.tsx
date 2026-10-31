import { useState } from 'react';
import { Banner } from './ui';

export interface QuizResult {
  score: number;
  passed?: boolean;
  results: { correct: boolean; answer: number; why: string }[];
}

/** Multiple-choice runner. Grading happens on the server; this only collects answers and shows feedback. */
export function QuizRunner({ questions, onSubmit, result, passMark }: { questions: { q: string; options: string[] }[]; onSubmit: (answers: number[]) => Promise<void>; result: QuizResult | null; passMark?: number }) {
  const [answers, setAnswers] = useState<number[]>(questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const ready = answers.every((a) => a >= 0);

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const r = result?.results[qi];
        return (
          <fieldset key={qi}>
            <legend className="mb-2 text-sm font-semibold">
              {qi + 1}. {q.q}
            </legend>
            <div className="space-y-1.5">
              {q.options.map((o, oi) => {
                const chosen = answers[qi] === oi;
                const tone = r ? (oi === r.answer ? 'border-ok bg-ok/15' : chosen ? 'border-danger bg-danger/15' : '') : chosen ? 'chip-on' : '';
                return (
                  <button key={oi} type="button" disabled={!!result} onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))} className={`chip block w-full rounded-xl text-left disabled:opacity-100 ${tone}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            {r && <p className={`mt-1.5 text-xs ${r.correct ? 'text-ok' : 'text-danger'}`}>{r.correct ? '✓ ' : '✗ '}{r.why}</p>}
          </fieldset>
        );
      })}
      {result ? (
        <Banner tone={result.passed === false ? 'warn' : 'ok'}>
          Score: <b>{result.score}%</b>
          {passMark !== undefined && (result.passed ? ' · Passed! The next path is open.' : ` · You need ${passMark}%. Re-read the lesson and try again.`)}
        </Banner>
      ) : (
        <button
          className="btn-primary w-full"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(answers);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Grading...' : 'Submit answers'}
        </button>
      )}
    </div>
  );
}
