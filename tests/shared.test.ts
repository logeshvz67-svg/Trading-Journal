import { describe, expect, it } from 'vitest';
import { positionSize, rewardRisk, riskForLots, estimatePnl, rMultiple } from '@shared/risk';
import { armorCheck, type ArmorContext } from '@shared/armor';
import { closeXpLines, openXpLines, levelForXp, xpForLevel, rankForLevel, BROKEN_PLAN_CAP } from '@shared/xp';
import { startOfLocalDay, localDateKey, startOfNextLocalDay } from '@shared/time';
import { focusScore } from '@shared/prep';

describe('risk math', () => {
  it('sizes EURUSD without float drift and rounds lots down', () => {
    // $5000, 1% = $50, 20 pip stop, $10/pip/lot => 0.25 lots
    const r = positionSize({ balance: '5000', riskPercent: '1', entry: '1.10000', stopLoss: '1.09800', pipSize: '0.0001', pipValue: '10' })!;
    expect(r.lots).toBe('0.25');
    expect(r.slPips).toBe('20.0');
    expect(r.actualRisk).toBe('50.00');
  });
  it('never rounds risk up', () => {
    // 33 pip stop => 50/330 = 0.1515 lots => 0.15
    const r = positionSize({ balance: '5000', riskPercent: '1', entry: '1.1033', stopLoss: '1.1000', pipSize: '0.0001', pipValue: '10' })!;
    expect(r.lots).toBe('0.15');
    expect(Number(r.actualRisk)).toBeLessThanOrEqual(50);
  });
  it('handles gold', () => {
    // 5 dollar stop on gold = 50 "pips" of 0.1; $10 per pip per lot => $500/lot; $50 => 0.10 lots
    const r = positionSize({ balance: '5000', riskPercent: '1', entry: '2400.0', stopLoss: '2395.0', pipSize: '0.1', pipValue: '10' })!;
    expect(r.lots).toBe('0.10');
  });
  it('computes RR and rejects wrong-side levels', () => {
    expect(rewardRisk('long', '1.1000', '1.0980', '1.1040')!.toString()).toBe('2');
    expect(rewardRisk('long', '1.1000', '1.1020', '1.1040')).toBeNull();
    expect(rewardRisk('short', '1.1000', '1.1020', '1.0940')!.toString()).toBe('3');
  });
  it('pnl and R', () => {
    expect(estimatePnl('short', '1.1000', '1.0960', '0.25', '0.0001', '10')).toBe('100.00');
    expect(riskForLots('0.25', '1.1', '1.098', '0.0001', '10')!.toString()).toBe('50');
    expect(rMultiple('-50', '50')).toBe('-1.00');
  });
});

const ctx: ArmorContext = { balance: '5000', maxRiskPercent: '1', maxTrades: 3, tradesToday: 0, hpRemaining: '250', openRisk: '0', locked: false };
const good = { direction: 'long' as const, htfTrend: 'up' as const, levelType: 'support' as const, entry: '1.1000', stopLoss: '1.0980', takeProfit: '1.1040', riskPercent: '1', lotSize: '0.25', pipSize: '0.0001', pipValue: '10', emotionBefore: 'calm' as const };

describe('armor check', () => {
  it('approves a clean setup', () => {
    const r = armorCheck(good, ctx);
    expect(r.passed).toBe(true);
    expect(r.riskAmount).toBe('50.00');
  });
  it('rejects low RR', () => {
    const r = armorCheck({ ...good, takeProfit: '1.1030' }, ctx);
    expect(r.passed).toBe(false);
    expect(r.items.find((i) => i.key === 'rr')!.pass).toBe(false);
  });
  it('rejects oversize lots even if declared risk is fine', () => {
    const r = armorCheck({ ...good, lotSize: '1.00' }, ctx);
    expect(r.items.find((i) => i.key === 'risk')!.pass).toBe(false);
  });
  it('rejects over trade limit, lockout, anger, and HP overflow', () => {
    expect(armorCheck(good, { ...ctx, tradesToday: 3 }).passed).toBe(false);
    expect(armorCheck(good, { ...ctx, locked: true }).passed).toBe(false);
    expect(armorCheck({ ...good, emotionBefore: 'angry' }, ctx).passed).toBe(false);
    expect(armorCheck(good, { ...ctx, hpRemaining: '40' }).passed).toBe(false);
  });
});

describe('xp', () => {
  const base = { stopMoved: false, userTaggedMistake: false, closedAt: new Date('2026-01-01T10:00:00Z'), loggedAt: new Date('2026-01-01T10:05:00Z') };
  it('rewards following the plan regardless of outcome', () => {
    const lines = closeXpLines({ ...base, followedPlan: true, openXp: 15 });
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(50);
  });
  it('a broken-plan trade always nets negative XP', () => {
    const lines = closeXpLines({ ...base, followedPlan: false, userTaggedMistake: true, openXp: 15 });
    expect(15 + lines.reduce((s, l) => s + l.amount, 0)).toBe(BROKEN_PLAN_CAP);
  });
  it('penalties at open', () => {
    expect(openXpLines({ armorPassed: false, overTradeLimit: true, revenge: true }).reduce((s, l) => s + l.amount, 0)).toBe(-120);
  });
  it('levels', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    for (let l = 1; l < 40; l++) expect(levelForXp(xpForLevel(l))).toBe(l);
    expect(rankForLevel(23)).toBe('Master Trader');
  });
});

describe('time', () => {
  it('finds local midnight across zones', () => {
    const t = new Date('2026-03-08T12:00:00Z');
    expect(startOfLocalDay(t, 'America/New_York').toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(startOfLocalDay(t, 'Asia/Kolkata').toISOString()).toBe('2026-03-07T18:30:00.000Z');
    expect(localDateKey(new Date('2026-03-07T19:00:00Z'), 'Asia/Kolkata')).toBe('2026-03-08');
    expect(startOfNextLocalDay(t, 'America/New_York').toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});

describe('focus', () => {
  it('scores prep', () => {
    expect(focusScore({ mood: 'calm', sleepOk: true, distractions: false, newsChecked: true })).toBe(100);
    expect(focusScore({ mood: 'angry', sleepOk: false, distractions: true, newsChecked: false })).toBe(10);
  });
});

import { isoWeekKey, dayStreak } from '@shared/time';
describe('streak helpers', () => {
  it('iso weeks', () => {
    expect(isoWeekKey(new Date('2026-01-01T12:00:00Z'), 'UTC')).toBe('2026-W01');
    expect(isoWeekKey(new Date('2026-10-31T12:00:00Z'), 'UTC')).toBe('2026-W44');
  });
  it('day streaks tolerate today not done yet', () => {
    expect(dayStreak(new Set(['2026-10-29', '2026-10-30']), '2026-10-31')).toBe(2);
    expect(dayStreak(new Set(['2026-10-29', '2026-10-30', '2026-10-31']), '2026-10-31')).toBe(3);
    expect(dayStreak(new Set(['2026-10-28']), '2026-10-31')).toBe(0);
  });
});
