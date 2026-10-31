import { goldFor, levelProgress, XP_REASON_LABELS, type XpLine, type XpReason } from '@shared/xp';
import { admin } from '../lib/supabase';
import { must } from '../lib/http';

export interface AwardResult {
  applied: { reason: XpReason; amount: number; label: string }[];
  delta: number;
  gold: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  rank: string;
  leveledUp: boolean;
}

/**
 * Award XP lines atomically via the award_xp() SQL function.
 * refId makes each (reason, ref) pair pay out at most once, so retries are safe.
 */
export async function awardXp(userId: string, lines: XpLine[], refId: string | null, meta?: Record<string, unknown>): Promise<AwardResult> {
  const events = lines
    .filter((l) => l.amount !== 0)
    .map((l) => ({ reason: l.reason, amount: l.amount, gold: goldFor(l.amount), ref_id: refId, meta: meta ?? null }));
  const before = must(await admin.from('profiles').select('xp').eq('user_id', userId).single()) as { xp: number };
  const levelBefore = levelProgress(before.xp).level;
  if (!events.length) {
    return { applied: [], delta: 0, gold: 0, xp: before.xp, levelBefore, levelAfter: levelBefore, rank: levelProgress(before.xp).rank, leveledUp: false };
  }
  const res = must(await admin.rpc('award_xp', { p_user: userId, p_events: events })) as {
    applied: { reason: XpReason; amount: number }[];
    delta: number;
    gold: number;
    xp: number;
  };
  const after = levelProgress(res.xp);
  return {
    applied: res.applied.map((a) => ({ reason: a.reason, amount: a.amount, label: XP_REASON_LABELS[a.reason] ?? a.reason })),
    delta: res.delta,
    gold: res.gold,
    xp: res.xp,
    levelBefore,
    levelAfter: after.level,
    rank: after.rank,
    leveledUp: after.level > levelBefore,
  };
}
