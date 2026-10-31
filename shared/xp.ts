// XP rules. XP rewards PROCESS and DISCIPLINE, never profit:
// nothing in this file ever looks at whether a trade won or lost.

export const XP = {
  prep: 10,
  armorCheck: 15,
  timelyLog: 20,
  followedPlan: 30,
  honestTag: 15,
  disciplinedRetreat: 10,
  lessonQuiz: 25,
  chartDrill: 20,
  reflection: 10,
  stopForToday: 25,
  monsterDefeated: 50,
  // penalties
  noArmorCheck: -30,
  movedStop: -40,
  tradeLimitBroken: -40,
  revengeTrade: -50,
} as const;

/** A trade where the plan was broken can never net more than this, wins included. */
export const BROKEN_PLAN_CAP = -10;

export type XpReason =
  | 'prep'
  | 'armor_check'
  | 'timely_log'
  | 'followed_plan'
  | 'honest_tag'
  | 'disciplined_retreat'
  | 'no_armor_check'
  | 'moved_stop'
  | 'trade_limit_broken'
  | 'revenge_trade'
  | 'broken_plan_cap'
  | 'lesson_quiz'
  | 'chart_drill'
  | 'reflection'
  | 'stop_for_today'
  | 'monster_defeated'
  | 'achievement'
  | 'quest'
  | 'flashcards';

export const XP_REASON_LABELS: Record<XpReason, string> = {
  prep: 'Pre-battle prep',
  armor_check: 'Armor check passed',
  timely_log: 'Logged within 10 min',
  followed_plan: 'Followed the plan',
  honest_tag: 'Honest mistake tag',
  disciplined_retreat: 'Disciplined Retreat',
  no_armor_check: 'Trade without armor check',
  moved_stop: 'Moved or removed stop',
  trade_limit_broken: 'Broke daily trade limit',
  revenge_trade: 'Revenge trade (within 15 min of a loss)',
  broken_plan_cap: 'Discipline debt (plan broken)',
  lesson_quiz: 'Lesson + quiz',
  chart_drill: 'Chart drill',
  reflection: 'Daily reflection',
  stop_for_today: 'Stopped for today',
  monster_defeated: 'Monster defeated',
  achievement: 'Achievement',
  quest: 'Quest complete',
  flashcards: 'Flashcard review',
};

export interface XpLine {
  reason: XpReason;
  amount: number;
  /** Override the default gold (1 per 5 XP), e.g. for quest rewards. */
  gold?: number;
}

/** Gold is earned only from positive XP (1 gold per 5 XP) and is never taken away. */
export function goldFor(amount: number): number {
  return amount > 0 ? Math.floor(amount / 5) : 0;
}

export interface TradeCloseFacts {
  followedPlan: boolean;
  stopMoved: boolean;
  userTaggedMistake: boolean;
  closedAt: Date;
  loggedAt: Date;
  /** XP already granted for this trade at open time (armor check / no-armor penalty / limit / revenge). */
  openXp: number;
}

/** XP lines awarded when a trade is closed. Outcome (win/loss) is intentionally not an input. */
export function closeXpLines(f: TradeCloseFacts): XpLine[] {
  const lines: XpLine[] = [];
  const minutes = (f.loggedAt.getTime() - f.closedAt.getTime()) / 60000;
  if (minutes >= -1 && minutes <= 10) lines.push({ reason: 'timely_log', amount: XP.timelyLog });
  if (f.followedPlan) lines.push({ reason: 'followed_plan', amount: XP.followedPlan });
  if (f.userTaggedMistake) lines.push({ reason: 'honest_tag', amount: XP.honestTag });
  if (f.stopMoved) lines.push({ reason: 'moved_stop', amount: XP.movedStop });

  if (!f.followedPlan) {
    const total = f.openXp + lines.reduce((s, l) => s + l.amount, 0);
    if (total > BROKEN_PLAN_CAP) lines.push({ reason: 'broken_plan_cap', amount: BROKEN_PLAN_CAP - total });
  }
  return lines;
}

export interface TradeOpenFacts {
  armorPassed: boolean;
  overTradeLimit: boolean;
  revenge: boolean;
}

export function openXpLines(f: TradeOpenFacts): XpLine[] {
  const lines: XpLine[] = [];
  lines.push(f.armorPassed ? { reason: 'armor_check', amount: XP.armorCheck } : { reason: 'no_armor_check', amount: XP.noArmorCheck });
  if (f.overTradeLimit) lines.push({ reason: 'trade_limit_broken', amount: XP.tradeLimitBroken });
  if (f.revenge) lines.push({ reason: 'revenge_trade', amount: XP.revengeTrade });
  return lines;
}

// ---------- Levels & ranks ----------
// Level n needs 25 * n * (n - 1) total XP: L2 = 50, L5 = 500, L10 = 2,250, L20 = 9,500.
// Must match public.level_for_xp() in the SQL migration.
export function xpForLevel(level: number): number {
  return 25 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  const x = Math.max(0, xp);
  return Math.floor((1 + Math.sqrt(1 + (4 * x) / 25)) / 2);
}

export const RANKS = [
  { name: 'Rookie', minLevel: 1 },
  { name: 'Apprentice', minLevel: 4 },
  { name: 'Scout', minLevel: 7 },
  { name: 'Strategist', minLevel: 10 },
  { name: 'Guardian', minLevel: 14 },
  { name: 'Veteran', minLevel: 18 },
  { name: 'Master Trader', minLevel: 23 },
] as const;

export function rankForLevel(level: number): string {
  let r: string = RANKS[0].name;
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank.name;
  return r;
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, rank: rankForLevel(level), into: xp - floor, needed: next - floor, nextAt: next };
}
