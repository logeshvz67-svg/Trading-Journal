// The pre-trade Armor Check. The SAME function runs in the browser (live feedback)
// and on the server (the only result that counts). Never trust the client's verdict.
import Big from 'big.js';
import type { Direction, Emotion, HtfTrend, LevelType } from './constants';
import { DIRECTIONS, EMOTIONS, HTF_TRENDS, LEVEL_TYPES, MIN_RR } from './constants';
import { big, levelsValid, money, rewardRisk, riskForLots } from './risk';

export interface ArmorInput {
  direction?: Direction | '' | null;
  htfTrend?: HtfTrend | '' | null;
  levelType?: LevelType | '' | null;
  entry?: string | number | null;
  stopLoss?: string | number | null;
  takeProfit?: string | number | null;
  riskPercent?: string | number | null;
  lotSize?: string | number | null;
  pipSize?: string | number | null;
  pipValue?: string | number | null;
  emotionBefore?: Emotion | '' | null;
}

export interface ArmorContext {
  balance: string | number; // current account balance
  maxRiskPercent: string | number; // per-trade limit from rules / today's prep
  maxTrades: number; // daily trade limit
  tradesToday: number; // trades already taken today (not counting this one)
  hpRemaining: string | number; // remaining daily loss buffer in $
  openRisk: string | number; // $ still at risk in open trades
  locked: boolean; // lockout or cooldown active
  lockMessage?: string;
}

export type ArmorKey =
  | 'notLocked'
  | 'htfTrend'
  | 'levelType'
  | 'levels'
  | 'rr'
  | 'risk'
  | 'size'
  | 'hp'
  | 'tradeLimit'
  | 'emotion';

export interface ArmorItem {
  key: ArmorKey;
  label: string;
  pass: boolean;
  message: string;
}

export interface ArmorReport {
  passed: boolean;
  items: ArmorItem[];
  warnings: string[];
  rr: string | null;
  riskAmount: string | null; // $ at risk (from lot size if given, else from risk %)
  riskPercent: string | null; // effective % of balance at risk
  hpCostPercent: string | null; // how much of today's HP this trade could burn
  headline: string;
}

export const ARMOR_COPY = {
  approved: 'Armor secured. Enter the battle, warrior.',
  rejected: 'Your armor has holes. Retreat and wait for a better setup.',
  lowRr: "This battle isn't worth the risk. Look for a 1:2 or better.",
};

const has = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

export function armorCheck(input: ArmorInput, ctx: ArmorContext): ArmorReport {
  const items: ArmorItem[] = [];
  const warnings: string[] = [];
  const add = (key: ArmorKey, label: string, pass: boolean, message: string) => items.push({ key, label, pass, message });

  add('notLocked', 'Arena open', !ctx.locked, ctx.locked ? ctx.lockMessage || 'The arena is locked. Visit the Campfire.' : 'No lockout or cooldown active.');

  const dir = has(DIRECTIONS, input.direction) ? input.direction : null;
  add('htfTrend', 'Higher-timeframe trend chosen', has(HTF_TRENDS, input.htfTrend), has(HTF_TRENDS, input.htfTrend) ? 'Trend identified.' : 'Pick the higher-timeframe trend first.');
  add('levelType', 'Level type chosen', has(LEVEL_TYPES, input.levelType), has(LEVEL_TYPES, input.levelType) ? 'You know which level you are trading.' : 'Is this support, resistance or a trendline?');

  const filled = !!dir && !!big(input.entry) && !!big(input.stopLoss) && !!big(input.takeProfit);
  const placed = filled && levelsValid(dir!, input.entry!, input.stopLoss!, input.takeProfit!);
  add(
    'levels',
    'Entry, stop loss and take profit set',
    placed,
    !filled ? 'Fill in direction, entry, stop loss and take profit.' : placed ? 'Levels are on the correct sides.' : dir === 'long' ? 'For a long: stop below entry, target above.' : 'For a short: stop above entry, target below.',
  );

  const rr = placed ? rewardRisk(dir!, input.entry!, input.stopLoss!, input.takeProfit!) : null;
  const rrOk = !!rr && rr.gte(MIN_RR);
  add('rr', `Reward:risk at least 1:${MIN_RR}`, rrOk, rr ? (rrOk ? `1:${rr.toFixed(2)}. Worth the fight.` : `1:${rr.toFixed(2)}. ${ARMOR_COPY.lowRr}`) : 'Needs valid levels to measure.');

  // Effective risk: prefer the real lot size (what you'll actually click), fall back to the declared %.
  const balance = big(ctx.balance) ?? new Big(0);
  const maxRisk = big(ctx.maxRiskPercent) ?? new Big(0);
  const declaredPct = big(input.riskPercent);
  let riskAmount: Big | null = null;
  const fromLots = placed && big(input.lotSize) ? riskForLots(input.lotSize!, input.entry!, input.stopLoss!, input.pipSize ?? '', input.pipValue ?? '') : null;
  if (fromLots) riskAmount = fromLots;
  else if (declaredPct && balance.gt(0)) riskAmount = balance.times(declaredPct).div(100);
  const effectivePct = riskAmount && balance.gt(0) ? riskAmount.div(balance).times(100) : null;

  const riskOk = !!effectivePct && effectivePct.gt(0) && effectivePct.lte(maxRisk.plus('0.005'));
  add(
    'risk',
    `Risk within ${maxRisk.toString()}% limit`,
    riskOk,
    !effectivePct ? 'Enter your risk % (use the Risk Forge).' : riskOk ? `Risking ${effectivePct.toFixed(2)}% of the account.` : `Risking ${effectivePct.toFixed(2)}%. Your limit is ${maxRisk.toString()}%. Shrink the position.`,
  );

  // Lot size must be present, positive, and the pip settings must be usable.
  const sizeOk = !!fromLots && fromLots.gt(0);
  add('size', 'Position size calculated', sizeOk, sizeOk ? `Stop hit = -$${money(fromLots!)}.` : 'Enter lot size and pip value (the Risk Forge does this for you).');

  const hp = big(ctx.hpRemaining) ?? new Big(0);
  const openRisk = big(ctx.openRisk) ?? new Big(0);
  const hpLeft = hp.minus(openRisk);
  const hpOk = !!riskAmount && riskAmount.lte(hpLeft);
  add('hp', 'Fits inside remaining HP', hpOk, !riskAmount ? 'Needs a risk amount.' : hpOk ? `Leaves $${money(hpLeft.minus(riskAmount))} of today's buffer.` : `A loss would break your daily limit (only $${money(hpLeft.gt(0) ? hpLeft : new Big(0))} left).`);

  const limitOk = ctx.tradesToday < ctx.maxTrades;
  add('tradeLimit', 'Under daily trade limit', limitOk, limitOk ? `Trade ${ctx.tradesToday + 1} of ${ctx.maxTrades} today.` : `You've used all ${ctx.maxTrades} trades today. The Overtrade Hydra is watching.`);

  const emo = has(EMOTIONS, input.emotionBefore) ? input.emotionBefore : null;
  const emoOk = !!emo && emo !== 'angry';
  add('emotion', 'Emotion check done', emoOk, !emo ? 'How do you feel right now? Be honest.' : emo === 'angry' ? 'Anger is not a strategy. The Revenge Goblin feeds on it.' : 'Emotion logged.');

  if (emo === 'overconfident') warnings.push('Overconfidence Dragon nearby: stick to your normal size.');
  if (emo === 'anxious') warnings.push('Feeling anxious? Consider half your normal risk, or skip.');
  if (emo === 'bored') warnings.push('Boredom Bat alert: is this a real setup or just something to do?');
  if (dir && input.htfTrend === 'up' && dir === 'short') warnings.push('Trend Defier: you are shorting against an uptrend.');
  if (dir && input.htfTrend === 'down' && dir === 'long') warnings.push('Trend Defier: you are buying against a downtrend.');

  const passed = items.every((i) => i.pass);
  const hpCost = riskAmount && hp.gt(0) ? riskAmount.div(hp).times(100) : null;
  return {
    passed,
    items,
    warnings,
    rr: rr ? rr.toFixed(2) : null,
    riskAmount: riskAmount ? money(riskAmount) : null,
    riskPercent: effectivePct ? effectivePct.toFixed(2) : null,
    hpCostPercent: hpCost ? hpCost.round(1, 1).toFixed(1) : null,
    headline: passed ? ARMOR_COPY.approved : items.find((i) => i.key === 'rr' && !i.pass && rr) ? ARMOR_COPY.lowRr : ARMOR_COPY.rejected,
  };
}
