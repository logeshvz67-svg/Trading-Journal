// Monster encounters: every mistake tag feeds a monster. 3+ encounters make it "active";
// 5 clean trades in a row (plan followed, no tags) while it is active defeat it.
import { MONSTER_ACTIVE_AT, MONSTER_DEFEAT_CLEAN_TRADES, type MonsterId } from '@shared/constants';
import { XP } from '@shared/xp';
import { admin } from '../lib/supabase';
import { must } from '../lib/http';
import { awardXp } from './xp';

interface UserMonster {
  id: string;
  monster_id: string;
  encounter_count: number;
  clean_trade_streak: number;
  status: 'lurking' | 'active' | 'defeated';
}

/** Record new mistake tags for a trade. Returns the monster ids that were newly tagged. */
export async function tagMistakes(userId: string, tradeId: string, monsterIds: MonsterId[], source: 'user' | 'auto'): Promise<MonsterId[]> {
  if (!monsterIds.length) return [];
  const inserted = must(
    await admin
      .from('trade_mistakes')
      .upsert(
        monsterIds.map((m) => ({ user_id: userId, trade_id: tradeId, monster_id: m, source })),
        { onConflict: 'trade_id,monster_id', ignoreDuplicates: true },
      )
      .select('monster_id'),
  ) as { monster_id: MonsterId }[];
  const fresh = inserted.map((r) => r.monster_id);
  for (const m of fresh) await recordEncounter(userId, m);
  return fresh;
}

async function recordEncounter(userId: string, monsterId: string) {
  const existing = must(await admin.from('user_monsters').select('*').eq('user_id', userId).eq('monster_id', monsterId).maybeSingle()) as UserMonster | null;
  const count = (existing?.encounter_count ?? 0) + 1;
  // A defeated monster that returns starts lurking again; repeat offenders become active.
  const status = count >= MONSTER_ACTIVE_AT || existing?.status === 'active' ? 'active' : 'lurking';
  must(
    await admin.from('user_monsters').upsert(
      { user_id: userId, monster_id: monsterId, encounter_count: count, clean_trade_streak: 0, status, last_encounter_at: new Date().toISOString() },
      { onConflict: 'user_id,monster_id' },
    ),
  );
}

/** A clean trade (plan followed, no tags) advances the defeat counter of every active monster. */
export async function recordCleanTrade(userId: string, tradeId: string): Promise<string[]> {
  const active = must(await admin.from('user_monsters').select('*').eq('user_id', userId).eq('status', 'active')) as UserMonster[];
  const defeated: string[] = [];
  for (const m of active) {
    const streak = m.clean_trade_streak + 1;
    if (streak >= MONSTER_DEFEAT_CLEAN_TRADES) {
      must(
        await admin
          .from('user_monsters')
          .update({ clean_trade_streak: streak, status: 'defeated', defeated_at: new Date().toISOString(), encounter_count: 0 })
          .eq('id', m.id),
      );
      await awardXp(userId, [{ reason: 'monster_defeated', amount: XP.monsterDefeated }], `${m.monster_id}:${tradeId}`);
      defeated.push(m.monster_id);
    } else {
      must(await admin.from('user_monsters').update({ clean_trade_streak: streak }).eq('id', m.id));
    }
  }
  return defeated;
}

/** The monster to show on the dashboard: the active one with the most encounters. */
export async function activeMonster(userId: string) {
  const rows = must(
    await admin
      .from('user_monsters')
      .select('monster_id, encounter_count, clean_trade_streak, status, monsters(name, emoji, fix, drill, defeat_condition)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('encounter_count', { ascending: false })
      .limit(1),
  ) as unknown[];
  return rows[0] ?? null;
}
