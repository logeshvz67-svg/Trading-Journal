// Phase 2: Campfire, reflections, quests/achievements, Hall of Records data, rewards, export, delete.
import { Router } from 'express';
import { z } from 'zod';
import { XP } from '@shared/xp';
import { admin } from '../lib/supabase';
import { bad, HttpError, must, notFound, parse, wrap } from '../lib/http';
import { getProfile, requireActiveAccount } from '../services/context';
import { getRiskState } from '../services/riskState';
import { evaluateProgress } from '../services/progress';
import { awardXp } from '../services/xp';

export const lifeRouter = Router();

// ---------- Campfire
lifeRouter.post(
  '/campfire/stop',
  wrap(async (req, res) => {
    const account = await requireActiveAccount(req.userId);
    const state = await getRiskState(req.userId);
    if (!state.cooldowns.some((c) => c.reason === 'stop_for_today')) {
      must(
        await admin
          .from('cooldowns')
          .insert({ user_id: req.userId, account_id: account.id, starts_at: new Date().toISOString(), ends_at: state.dayEnd, reason: 'stop_for_today' }),
      );
    }
    const xp = await awardXp(req.userId, [{ reason: 'stop_for_today', amount: XP.stopForToday }], `stop:${state.today}`);
    res.json({ xp, message: 'You called it a day. Knowing when to stop is a master skill. +25 XP' });
  }),
);

lifeRouter.post(
  '/reflections',
  wrap(async (req, res) => {
    const body = parse(z.object({ text: z.string().trim().min(10, 'write at least a sentence').max(5000) }), req.body);
    const state = await getRiskState(req.userId);
    const row = must(
      await admin
        .from('journal_reflections')
        .upsert({ user_id: req.userId, reflection_date: state.today, text: body.text }, { onConflict: 'user_id,reflection_date' })
        .select('*')
        .single(),
    );
    const xp = await awardXp(req.userId, [{ reason: 'reflection', amount: XP.reflection }], `reflection:${state.today}`);
    res.json({ reflection: row, xp });
  }),
);

lifeRouter.get(
  '/reflections',
  wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 200);
    const data = must(await admin.from('journal_reflections').select('*').eq('user_id', req.userId).order('reflection_date', { ascending: false }).limit(limit));
    res.json({ reflections: data });
  }),
);

// ---------- Quests, achievements, streaks
lifeRouter.get(
  '/progress',
  wrap(async (req, res) => {
    const profile = await getProfile(req.userId);
    res.json(await evaluateProgress(profile));
  }),
);

// ---------- Hall of Records: raw rows; the browser does the slicing (keeps the server idle).
lifeRouter.get(
  '/stats',
  wrap(async (req, res) => {
    const [trades, sessions, events] = await Promise.all([
      admin
        .from('trades')
        .select('id, status, pair, direction, htf_trend, level_type, planned_rr, risk_amount, pnl, r_multiple, opened_at, closed_at, emotion_before, emotion_after, followed_plan, armor_check_passed, entry_mode, trade_mistakes(monster_id)')
        .eq('user_id', req.userId)
        .neq('status', 'open')
        .order('closed_at', { ascending: true }),
      admin.from('sessions').select('session_date, mood, focus_score').eq('user_id', req.userId).order('session_date'),
      admin.from('xp_events').select('reason, amount, created_at').eq('user_id', req.userId).order('created_at'),
    ]);
    const account = await requireActiveAccount(req.userId);
    res.json({ trades: must(trades), sessions: must(sessions), xpEvents: must(events), startingBalance: account.starting_balance });
  }),
);

// ---------- Rewards: gold shop (cosmetics) and custom real-life rewards
lifeRouter.get(
  '/shop',
  wrap(async (req, res) => {
    const [items, inv, rewards, profile] = await Promise.all([
      admin.from('shop_items').select('*').order('sort_order'),
      admin.from('user_inventory').select('item_id').eq('user_id', req.userId),
      admin.from('custom_rewards').select('*').eq('user_id', req.userId).order('created_at', { ascending: false }),
      getProfile(req.userId),
    ]);
    res.json({ items: must(items), owned: (must(inv) as { item_id: string }[]).map((r) => r.item_id), rewards: must(rewards), gold: profile.gold, equipped: (profile as any).equipped ?? {} });
  }),
);

lifeRouter.post(
  '/shop/buy',
  wrap(async (req, res) => {
    const { item_id } = parse(z.object({ item_id: z.string().max(60) }), req.body);
    const item = must(await admin.from('shop_items').select('*').eq('id', item_id).maybeSingle()) as { id: string; price: number; name: string } | null;
    if (!item) throw notFound('Item not found.');
    const owned = must(await admin.from('user_inventory').select('id').eq('user_id', req.userId).eq('item_id', item_id).maybeSingle());
    if (owned) throw bad('You already own this.');
    const gold = must(await admin.rpc('spend_gold', { p_user: req.userId, p_amount: item.price })) as number | null;
    if (gold === null) throw bad('Not enough gold yet. Gold comes from discipline: prep, follow your plan, journal.');
    must(await admin.from('user_inventory').insert({ user_id: req.userId, item_id }));
    res.json({ gold, message: `${item.name} added to your inventory.` });
  }),
);

lifeRouter.post(
  '/shop/equip',
  wrap(async (req, res) => {
    const body = parse(z.object({ kind: z.enum(['title', 'frame']), item_id: z.string().max(60).nullable() }), req.body);
    const profile = (await getProfile(req.userId)) as any;
    const equipped = { ...(profile.equipped ?? {}) };
    if (body.item_id) {
      const own = must(await admin.from('user_inventory').select('item_id, shop_items(kind, value)').eq('user_id', req.userId).eq('item_id', body.item_id).maybeSingle()) as any;
      if (!own || own.shop_items?.kind !== body.kind) throw bad('You do not own that item.');
      equipped[body.kind] = own.shop_items.value;
    } else delete equipped[body.kind];
    must(await admin.from('profiles').update({ equipped }).eq('user_id', req.userId));
    res.json({ equipped });
  }),
);

lifeRouter.post(
  '/rewards',
  wrap(async (req, res) => {
    const body = parse(z.object({ title: z.string().trim().min(1).max(100), cost: z.coerce.number().int().min(1).max(100000) }), req.body);
    const row = must(await admin.from('custom_rewards').insert({ ...body, user_id: req.userId }).select('*').single());
    res.json({ reward: row });
  }),
);

lifeRouter.post(
  '/rewards/:id/redeem',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const r = must(await admin.from('custom_rewards').select('*').eq('id', id).eq('user_id', req.userId).maybeSingle()) as { cost: number; redeemed_at: string | null; title: string } | null;
    if (!r) throw notFound('Reward not found.');
    if (r.redeemed_at) throw bad('Already redeemed.');
    const gold = must(await admin.rpc('spend_gold', { p_user: req.userId, p_amount: r.cost })) as number | null;
    if (gold === null) throw bad('Not enough gold yet. Keep stacking disciplined days.');
    must(await admin.from('custom_rewards').update({ redeemed_at: new Date().toISOString() }).eq('id', id));
    res.json({ gold, message: `Enjoy it: "${r.title}". You earned it with process, not luck.` });
  }),
);

lifeRouter.delete(
  '/rewards/:id',
  wrap(async (req, res) => {
    must(await admin.from('custom_rewards').delete().eq('id', String(req.params.id)).eq('user_id', req.userId));
    res.json({ ok: true });
  }),
);

// ---------- CSV export
const EXPORTS: Record<string, { table: string; order: string }> = {
  trades: { table: 'trades', order: 'opened_at' },
  sessions: { table: 'sessions', order: 'session_date' },
  xp_events: { table: 'xp_events', order: 'created_at' },
  mistakes: { table: 'trade_mistakes', order: 'created_at' },
  reflections: { table: 'journal_reflections', order: 'reflection_date' },
  monsters: { table: 'user_monsters', order: 'created_at' },
  codex: { table: 'codex_rules', order: 'created_at' },
  oath: { table: 'oath_rules', order: 'sort_order' },
  lessons: { table: 'lesson_progress', order: 'created_at' },
  drills: { table: 'drill_attempts', order: 'created_at' },
  quests: { table: 'user_quests', order: 'created_at' },
  achievements: { table: 'user_achievements', order: 'unlocked_at' },
  accounts: { table: 'accounts', order: 'created_at' },
  rewards: { table: 'custom_rewards', order: 'created_at' },
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}

lifeRouter.get(
  '/export/:kind',
  wrap(async (req, res) => {
    const kind = String(req.params.kind).replace(/\.csv$/, '');
    const spec = EXPORTS[kind];
    if (!spec) throw notFound('Unknown export.');
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const page = must(await admin.from(spec.table).select('*').eq('user_id', req.userId).order(spec.order).range(from, from + 999)) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="market-quest-${kind}.csv"`);
    res.send('﻿' + toCsv(rows));
  }),
);

lifeRouter.get('/export', (_req, res) => {
  res.json({ kinds: Object.keys(EXPORTS) });
});

// ---------- Delete my data (irreversible)
lifeRouter.delete(
  '/me',
  wrap(async (req, res) => {
    parse(z.object({ confirm: z.literal('DELETE') }), req.body);
    // 1) screenshots
    for (;;) {
      const { data, error } = await admin.storage.from('screenshots').list(req.userId, { limit: 100 });
      if (error) throw new HttpError(500, error.message);
      if (!data?.length) break;
      await admin.storage.from('screenshots').remove(data.map((f) => `${req.userId}/${f.name}`));
      if (data.length < 100) break;
    }
    // 2) the auth user; every table cascades from auth.users
    const { error } = await admin.auth.admin.deleteUser(req.userId);
    if (error) throw new HttpError(500, error.message);
    res.json({ ok: true });
  }),
);
