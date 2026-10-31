import { useMemo } from 'react';
import { genCandles, linePrice, type DrillPayload } from '@shared/candles';

/** SVG candlestick chart for drills (synthetic training data, not real prices). */
export function CandleChart({ payload, height = 220 }: { payload: Pick<DrillPayload, 'seed' | 'shape' | 'lines'>; height?: number }) {
  const candles = useMemo(() => genCandles(payload.seed, payload.shape), [payload.seed, payload.shape]);
  const W = 360;
  const H = height;
  const pad = 10;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const y = (v: number) => pad + ((hi - v) / (hi - lo)) * (H - pad * 2);
  const step = (W - pad * 2) / candles.length;
  const bw = Math.max(2, step * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-surface2" role="img" aria-label={`Practice chart: ${candles.length} candles`}>
      {candles.map((c, i) => {
        const x = pad + i * step + step / 2;
        const up = c.c >= c.o;
        const color = up ? 'rgb(var(--c-ok))' : 'rgb(var(--c-danger))';
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
            <rect x={x - bw / 2} y={y(Math.max(c.o, c.c))} width={bw} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={color} rx={1} />
          </g>
        );
      })}
      {payload.lines?.map((l) => {
        const v = linePrice(candles, l.at);
        return (
          <g key={l.label}>
            <line x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="rgb(var(--c-gold))" strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={W - pad - 22} y={y(v) - 9} width={20} height={16} rx={4} fill="rgb(var(--c-surface))" />
            <text x={W - pad - 12} y={y(v) + 3.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="rgb(var(--c-text))">
              {l.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
