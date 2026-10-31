import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs content module
import { LESSONS, DRILLS, FLASHCARDS } from '../scripts/academy-content.mjs';
import { genCandles, linePrice } from '@shared/candles';

describe('academy content', () => {
  it('every real lesson has 5 valid quiz questions', () => {
    const real = LESSONS.filter((l: any) => !l.is_stub);
    expect(real.length).toBe(15);
    for (const l of real) {
      expect(l.quiz.length).toBe(5);
      for (const q of l.quiz) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(q.why.length).toBeGreaterThan(5);
      }
    }
  });
  it('lesson ids are unique and zones 1-7 exist', () => {
    const ids = LESSONS.map((l: any) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(LESSONS.map((l: any) => l.zone))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  });
  it('drill answers are valid', () => {
    for (const d of DRILLS) for (const q of d.payload.questions) expect(q.options[q.answer]).toBeDefined();
    expect(FLASHCARDS.length).toBeGreaterThanOrEqual(30);
  });
  it('practice charts are deterministic and shaped', () => {
    expect(genCandles(11, 'up')).toEqual(genCandles(11, 'up'));
    const up = genCandles(11, 'up');
    const down = genCandles(23, 'down');
    expect(up[up.length - 1].c).toBeGreaterThan(up[0].o);
    expect(down[down.length - 1].c).toBeLessThan(down[0].o);
    for (const c of up) expect(c.h).toBeGreaterThanOrEqual(Math.max(c.o, c.c));
    const b = genCandles(97, 'breakout');
    expect(b.length).toBe(48);
    expect(b[b.length - 1].c).toBeGreaterThan(linePrice(b, 'range_high'));
  });
});
