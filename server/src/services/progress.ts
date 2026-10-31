// Quests, achievements and streaks are DERIVED from what's already in the DB
// (xp_events, trades, sessions...). They are re-evaluated lazily whenever the
// dashboard state is fetched, so there are no background jobs and nothing to drift.
import { dayStreak, isoWeekKey, localDateKey } from '@shared/time';
import { admin } from '../lib/supabase';
import { must } from '../lib/http';
import type { Profile } from './context';
import { awardXp } from './xp';

interface Quest {
  id: string;
  type: 'daily' | 'weekly' | 'story' | 'challenge';
  title: string;
  description: string;
  metric: string;
  target: number;
  xp_reward: number;
  gold_reward: number;
  sort_order: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
}

export interface QuestView extends Quest {
  period_key: string;
  progress: number;
  completed: boolean;
}

export interface Notice {
  kind: 'quest' | 'achievement' | 'streak_lost';
  text: string;
}

export const STREAK_LOST_COPY: Record<string, string> = {
  journal: 'Your journal streak faded. The scroll is patient: write one entry today to relight it.',
  plan: 'Your plan streak was broken. One trade by the book starts it again.',
  learning: 'Your learning streak went quiet. Ten minutes in the Academy brings it back.',
};

export async function evaluateProgress(profile: Profile & { created_at?: string }, now = new Date()) {
  const userId = profile.user_id;
  const tz = profile.timezone || 'UTC';
  const today = localDateKey(now, tz);
  const week = isoWeekKey(now, tz);
  const since = new Date(now.getTime() - 120 * 86400000).toISOString();

  const [questsRes, achRes, mineRes, uqRes, eventsRes, tradesRes, sessionsRes, lessonsRes, defeatedRes, drillsRes, cardsRes] = await Promise.all([
    admin.from('quests').select('*').order('sort_order'),
    admin.from('achievements').select('*').order('sort_order'),
    admin.from('user_achievements').select('achievement_id').eq('user_id', userId),
    admin.from('user_quests').select('quest_id, period_key, completed').eq('user_id', userId).eq('completed', true),
    admin.from('xp_events').select('reason, created_at').eq('user_id', userId).gte('created_at', since),
    admin.from('trades').select('status, followed_plan, closed_at, logged_at, opened_at, pnl, account_id').eq('user_id', userId).neq('status', 'open').order('closed_at', { ascending: true }),
    admin.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'passed'),
    admin.from('user_monsters').select('id', { count: 'exact', head: true }).eq('user_id', userId).gt('times_defeated', 0),
    admin.from('drill_attempts').select('created_at').eq('user_id', userId).gte('created_at', since),
    admin.from('flashcard_reviews').select('last_reviewed_at').eq('user_id', userId).gte('last_reviewed_at', since),
  ]);
  const quests = must(questsRes) as Quest[];
  const achievements = must(achRes) as Achievement[];
  const unlocked = new Set((must(mineRes) as { achievement_id: string }[]).map((r) => r.achievement_id));
  const doneQuests = new Set((must(uqRes) as { quest_id: string; period_key: string }[]).map((r) => `${r.quest_id}|${r.period_key}`));
  const events = must(eventsRes) as { reason: string; created_at: string }[];
  const trades = must(tradesRes) as { status: string; followed_plan: boolean | null; closed_at: string | null; logged_at: string | null; opened_at: string | null; pnl: number | null }[];
  const sessionsCount = sessionsRes.count ?? 0;
  const lessonsPassed = lessonsRes.count ?? 0;
  const monstersDefeated = defeatedRes.count ?? 0;

  const dayOf = (iso: string) => localDateKey(new Date(iso), tz);
  const weekOf = (iso: string) => isoWeekKey(new Date(iso), tz);
  const closed = trades.filter((t) => t.status === 'closed');

  // ---------- streaks
  const journalDays = new Set<string>();
  for (const e of events) if (e.reason === 'reflection') journalDays.add(dayOf(e.created_at));
  for (const t of closed) if (t.logged_at) journalDays.add(dayOf(t.logged_at));
  const learningDays = new Set<string>();
  for (const e of events) if (e.reason === 'lesson_quiz' || e.reason === 'chart_drill' || e.reason === 'flashcards') learningDays.add(dayOf(e.created_at));
  for (const d of must(drillsRes) as { created_at: string }[]) learningDays.add(dayOf(d.created_at));
  for (const c of must(cardsRes) as { last_reviewed_at: string }[]) if (c.last_reviewed_at) learningDays.add(dayOf(c.last_reviewed_at));
  let plan = 0;
  for (let i = closed.length - 1; i >= 0 && closed[i].followed_plan; i--) plan++;

  const prev = (profile.current_streaks ?? {}) as Record<string, number>;
  const streaks = {
    journal: dayStreak(journalDays, today),
    plan,
    learning: dayStreak(learningDays, today),
  };
  const best = {
    best_journal: Math.max(prev.best_journal ?? 0, streaks.journal),
    best_plan: Math.max(prev.best_plan ?? 0, streaks.plan),
    best_learning: Math.max(prev.best_learning ?? 0, streaks.learning),
  };
  const notices: Notice[] = [];
  for (const k of ['journal', 'plan', 'learning'] as const) {
    if ((prev[k] ?? 0) >= 2 && streaks[k] === 0) notices.push({ kind: 'streak_lost', text: STREAK_LOST_COPY[k] });
  }
  const nextStreaks = { ...streaks, ...best };
  if (JSON.stringify(nextStreaks) !== JSON.stringify({ ...prev })) {
    must(await admin.from('profiles').update({ current_streaks: nextStreaks }).eq('user_id', userId));
  }

  // ---------- quests
  const countIn = (reason: string, period: (iso: string) => boolean) => events.filter((e) => e.reason === reason && period(e.created_at)).length;
  const lastRevenge = events.filter((e) => e.reason === 'revenge_trade').map((e) => e.created_at).sort().pop();
  const cleanSince = lastRevenge ?? profile.created_at ?? now.toISOString();
  const noRevengeDays = Math.floor((now.getTime() - new Date(cleanSince).getTime()) / 86400000);

  const views: QuestView[] = [];
  let storyShown = false;
  for (const q of quests) {
    const period_key = q.type === 'daily' ? today : q.type === 'weekly' ? week : 'once';
    const inPeriod = (iso: string) => (q.type === 'daily' ? dayOf(iso) === today : q.type === 'weekly' ? weekOf(iso) === week : true);
    let progress = 0;
    switch (q.metric) {
      case 'prep': progress = countIn('prep', inPeriod); break;
      case 'armor_pass': progress = countIn('armor_check', inPeriod); break;
      case 'retreat': progress = countIn('disciplined_retreat', inPeriod); break;
      case 'timely_log': progress = countIn('timely_log', inPeriod); break;
      case 'reflection': progress = countIn('reflection', inPeriod); break;
      case 'followed_plan': progress = countIn('followed_plan', inPeriod); break;
      case 'lesson_quiz': progress = countIn('lesson_quiz', inPeriod); break;
      case 'trade_closed': progress = closed.filter((t) => t.closed_at && inPeriod(t.closed_at)).length; break;
      case 'no_revenge_days': progress = noRevengeDays; break;
    }
    const key = `${q.id}|${period_key}`;
    const already = doneQuests.has(key);
    const completed = already || progress >= q.target;
    if (completed && !already) {
      must(
        await admin
          .from('user_quests')
          .upsert({ user_id: userId, quest_id: q.id, period_key, progress: Math.min(progress, q.target), completed: true, completed_at: now.toISOString() }, { onConflict: 'user_id,quest_id,period_key' }),
      );
      await awardXp(userId, [{ reason: 'quest', amount: q.xp_reward, gold: q.gold_reward }], `quest:${q.id}:${period_key}`);
      notices.push({ kind: 'quest', text: `Quest complete: ${q.title}${q.xp_reward ? ` (+${q.xp_reward} XP)` : ''}${q.gold_reward ? ` +${q.gold_reward} gold` : ''}` });
    }
    // Story quests unfold one at a time.
    if (q.type === 'story') {
      if (completed) views.push({ ...q, period_key, progress: Math.min(progress, q.target), completed });
      else if (!storyShown) {
        storyShown = true;
        views.push({ ...q, period_key, progress: Math.min(progress, q.target), completed });
      }
      continue;
    }
    views.push({ ...q, period_key, progress: Math.min(progress, q.target), completed });
  }

  // ---------- achievements
  const followed = closed.filter((t) => t.followed_plan).length;
  const stoppedOnce = events.some((e) => e.reason === 'stop_for_today');
  const skipped = trades.some((t) => t.status === 'skipped');
  const shieldDays = (() => {
    // Trading days that ended without breaking the daily loss limit (net P/L for the day above -limit).
    const pnlByDay = new Map<string, number>();
    for (const t of closed) if (t.closed_at) pnlByDay.set(dayOf(t.closed_at), (pnlByDay.get(dayOf(t.closed_at)) ?? 0) + Number(t.pnl ?? 0));
    return pnlByDay;
  })();
  const account = must(await admin.from('accounts').select('daily_loss_limit').eq('user_id', userId).eq('is_active', true).limit(1)) as { daily_loss_limit: number }[];
  const limit = account[0] ? Number(account[0].daily_loss_limit) : Infinity;
  const shieldCount = [...shieldDays.entries()].filter(([d, v]) => d !== today && v > -limit).length;

  // Consistency Crown: 4 consecutive weeks (with trades) at 80%+ plan-following.
  const byWeek = new Map<string, { n: number; ok: number }>();
  for (const t of closed) if (t.closed_at) {
    const w = weekOf(t.closed_at);
    const v = byWeek.get(w) ?? { n: 0, ok: 0 };
    v.n++;
    if (t.followed_plan) v.ok++;
    byWeek.set(w, v);
  }
  let run = 0;
  let crown = false;
  for (const w of [...byWeek.keys()].sort()) {
    const v = byWeek.get(w)!;
    run = v.ok / v.n >= 0.8 ? run + 1 : 0;
    if (run >= 4) crown = true;
  }

  const earned: Record<string, boolean> = {
    'first-blood': closed.length >= 1,
    scribe: closed.length >= 10,
    'shield-bearer': shieldCount >= 5,
    'calm-warrior': sessionsCount >= 10,
    'streak-keeper': best.best_journal >= 7,
    student: lessonsPassed >= 5,
    'monster-slayer': monstersDefeated >= 1,
    'disciplined-retreat': skipped,
    'boss-challenger': account.length > 0,
    'process-master': followed >= 20,
    'know-when-to-stop': stoppedOnce,
    'consistency-crown': crown,
  };
  for (const a of achievements) {
    if (!earned[a.id] || unlocked.has(a.id)) continue;
    const ins = must(
      await admin.from('user_achievements').upsert({ user_id: userId, achievement_id: a.id }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }).select('id'),
    ) as unknown[];
    if (ins.length) {
      await awardXp(userId, [{ reason: 'achievement', amount: a.xp_reward }], `achievement:${a.id}`);
      notices.push({ kind: 'achievement', text: `${a.icon} Achievement unlocked: ${a.name}!` });
      unlocked.add(a.id);
    }
  }

  return {
    streaks: nextStreaks,
    quests: views,
    achievements: achievements.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })),
    notices,
  };
}
