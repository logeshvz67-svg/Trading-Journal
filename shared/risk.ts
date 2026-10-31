// Risk math. Every money/price calculation goes through big.js (decimal arithmetic)
// so lot sizes and P/L never suffer from binary float drift (0.1 + 0.2 !== 0.3).
import Big from 'big.js';
import type { Direction } from './constants';
import { LOT_STEP } from './constants';

export type Num = string | number;

/** Parse a user/DB value into Big. Returns null for empty or invalid input. */
export function big(v: Num | null | undefined): Big | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : v.trim().replace(/,/g, '');
  if (s === '' || !/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
  try {
    return new Big(s);
  } catch {
    return null;
  }
}

const ROUND_DOWN = 0; // Big.roundDown
const ROUND_HALF_UP = 1; // Big.roundHalfUp

/** Money rounded to cents, as a string (e.g. "50.00"). */
export function money(v: Big): string {
  return v.round(2, ROUND_HALF_UP).toFixed(2);
}

/** Planned reward:risk ratio. Null when the levels are on the wrong side of entry. */
export function rewardRisk(direction: Direction, entry: Num, stopLoss: Num, takeProfit: Num): Big | null {
  const e = big(entry);
  const sl = big(stopLoss);
  const tp = big(takeProfit);
  if (!e || !sl || !tp) return null;
  const risk = direction === 'long' ? e.minus(sl) : sl.minus(e);
  const reward = direction === 'long' ? tp.minus(e) : e.minus(tp);
  if (risk.lte(0) || reward.lte(0)) return null;
  return reward.div(risk);
}

/** Are SL and TP on the correct sides of entry for this direction? */
export function levelsValid(direction: Direction, entry: Num, stopLoss: Num, takeProfit: Num): boolean {
  return rewardRisk(direction, entry, stopLoss, takeProfit) !== null;
}

/** Distance between two prices measured in pips/points. */
export function distanceInPips(a: Num, b: Num, pipSize: Num): Big | null {
  const x = big(a);
  const y = big(b);
  const p = big(pipSize);
  if (!x || !y || !p || p.lte(0)) return null;
  return x.minus(y).abs().div(p);
}

/** Dollar amount for a risk percentage of the balance (rounded down to the cent). */
export function riskAmountFor(balance: Num, riskPercent: Num): Big | null {
  const b = big(balance);
  const r = big(riskPercent);
  if (!b || !r || b.lte(0) || r.lt(0)) return null;
  return b.times(r).div(100).round(2, ROUND_DOWN);
}

/** Dollar risk if the stop is hit for a given lot size. */
export function riskForLots(lots: Num, entry: Num, stopLoss: Num, pipSize: Num, pipValue: Num): Big | null {
  const l = big(lots);
  const pv = big(pipValue);
  const pips = distanceInPips(entry, stopLoss, pipSize);
  if (!l || !pv || !pips || l.lte(0) || pv.lte(0)) return null;
  return l.times(pips).times(pv).round(2, ROUND_HALF_UP);
}

export interface PositionSizeInput {
  balance: Num;
  riskPercent: Num;
  entry: Num;
  stopLoss: Num;
  pipSize: Num;
  pipValue: Num;
  lotStep?: Num;
}

export interface PositionSizeResult {
  lots: string;
  slPips: string;
  targetRisk: string; // $ you intended to risk
  actualRisk: string; // $ you actually risk after rounding lots DOWN
  actualRiskPercent: string;
  tooSmall: boolean; // the minimum lot would exceed your risk
}

/**
 * Position size = risk $ / (SL distance in pips x $ per pip per lot).
 * Lots are always rounded DOWN to the broker step so you never risk more than planned.
 */
export function positionSize(input: PositionSizeInput): PositionSizeResult | null {
  const balance = big(input.balance);
  const target = riskAmountFor(input.balance, input.riskPercent);
  const pips = distanceInPips(input.entry, input.stopLoss, input.pipSize);
  const pv = big(input.pipValue);
  const step = big(input.lotStep ?? LOT_STEP);
  if (!balance || !target || !pips || !pv || !step || pips.lte(0) || pv.lte(0) || step.lte(0)) return null;

  const rawLots = target.div(pips.times(pv));
  const lots = rawLots.div(step).round(0, ROUND_DOWN).times(step);
  const actual = lots.times(pips).times(pv);
  return {
    lots: lots.toFixed(decimalsOf(step)),
    slPips: pips.round(1, ROUND_HALF_UP).toFixed(1),
    targetRisk: money(target),
    actualRisk: money(actual),
    actualRiskPercent: actual.div(balance).times(100).round(2, ROUND_HALF_UP).toFixed(2),
    tooSmall: lots.eq(0),
  };
}

/** Estimated gross P/L (before commission/swap) from prices and lot size. */
export function estimatePnl(
  direction: Direction,
  entry: Num,
  exit: Num,
  lots: Num,
  pipSize: Num,
  pipValue: Num,
): string | null {
  const e = big(entry);
  const x = big(exit);
  const l = big(lots);
  const p = big(pipSize);
  const pv = big(pipValue);
  if (!e || !x || !l || !p || !pv || p.lte(0)) return null;
  const move = direction === 'long' ? x.minus(e) : e.minus(x);
  return money(move.div(p).times(pv).times(l));
}

/** R multiple = P/L divided by the dollar amount that was at risk. */
export function rMultiple(pnl: Num, riskAmount: Num): string | null {
  const p = big(pnl);
  const r = big(riskAmount);
  if (!p || !r || r.lte(0)) return null;
  return p.div(r).round(2, ROUND_HALF_UP).toFixed(2);
}

function decimalsOf(step: Big): number {
  const s = step.toString();
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}
