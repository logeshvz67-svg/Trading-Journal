// Deterministic practice charts for drills. Same seed => same candles on every device.
// These are synthetic training charts, NOT real market data and NOT predictions.

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

export type ChartShape = 'up' | 'down' | 'range' | 'breakout';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function genCandles(seed: number, shape: ChartShape, n = 48, base = 100): Candle[] {
  // A breakout chart is a range for the first 60%, then a push up out of it.
  if (shape === 'breakout') {
    const split = Math.floor(n * 0.6);
    const range = genCandles(seed, 'range', split, base);
    const last = range[range.length - 1].c;
    const top = Math.max(...range.map((c) => c.h));
    const trend = genCandles(seed + 1, 'up', n - split, top);
    const shift = last - trend[0].o;
    return [...range, ...trend.map((c) => ({ o: c.o + shift, h: c.h + shift, l: c.l + shift, c: c.c + shift }))];
  }
  const rnd = mulberry32(seed);
  const out: Candle[] = [];
  let price = base;
  const lo = base * 0.985;
  const hi = base * 1.015;
  for (let i = 0; i < n; i++) {
    const vol = base * 0.0035;
    // Trends move in waves (impulse + pullback) so higher highs / lower lows are visible.
    const wave = Math.sin(i / 3.2) * 0.6;
    let drift = 0;
    if (shape === 'up') drift = base * 0.0011 + wave * vol * 0.5;
    if (shape === 'down') drift = -base * 0.0011 + wave * vol * 0.5;
    if (shape === 'range') drift = ((lo + hi) / 2 - price) * 0.12 + wave * vol * 0.8;
    const o = price;
    let c = o + drift + (rnd() - 0.5) * vol * 1.6;
    if (shape === 'range') c = Math.min(hi, Math.max(lo, c));
    const h = Math.max(o, c) + rnd() * vol * 0.8;
    const l = Math.min(o, c) - rnd() * vol * 0.8;
    out.push({ o, h: shape === 'range' ? Math.min(h, hi + vol * 0.3) : h, l: shape === 'range' ? Math.max(l, lo - vol * 0.3) : l, c });
    price = c;
  }
  return out;
}

export interface DrillQuestion {
  q: string;
  options: string[];
  answer?: number; // stripped before sending to the browser
  why?: string; // shown after grading
}

export type LineAt = 'low' | 'high' | 'mid' | 'range_low' | 'range_high';

/** Price of a drill line on a generated chart. */
export function linePrice(candles: Candle[], at: LineAt): number {
  const part = at.startsWith('range_') ? candles.slice(0, Math.floor(candles.length * 0.6)) : candles;
  const lo = Math.min(...part.map((c) => c.l));
  const hi = Math.max(...part.map((c) => c.h));
  return at.endsWith('low') ? lo : at.endsWith('high') ? hi : (lo + hi) / 2;
}

export interface DrillPayload {
  seed: number;
  shape: ChartShape;
  /** Optional horizontal lines: 'low'/'high'/'mid' of the whole chart, or 'range_low'/'range_high' of a breakout chart's range part. */
  lines?: { label: string; at: LineAt }[];
  questions: DrillQuestion[];
}
