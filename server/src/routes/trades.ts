import { Router } from 'express';
import { z } from 'zod';
import { armorCheck, type ArmorInput, type ArmorReport } from '@shared/armor';
import {
  DIRECTIONS,
  EMOTIONS,
  HTF_TRENDS,
  INSTRUMENT_TYPES,
  LEVEL_TYPES,
  MAX_SKIP_REWARDS_PER_DAY,
  MONSTER_IDS,
  REVENGE_WINDOW_MIN,
  LOSS_COOLDOWN_MIN,
  type MonsterId,
} from '@shared/constants';
import { closeMessage, COPY } from '@shared/copy';
import { big, estimatePnl, rMultiple } from '@shared/risk';
import { closeXpLines, openXpLines, XP, BROKEN_PLAN_CAP, type XpLine } from '@shared/xp';
import { admin } from '../lib/supabase';
import { bad, HttpError, must, notFound, parse, wrap } from '../lib/http';
import { requireActiveAccount } from '../services/context';
import { getRiskState, type RiskState } from '../services/riskState';
import { recordCleanTrade, tagMistakes } from '../services/monsters';
import { awardXp, type AwardResult } from '../services/xp';

export const tradesRouter = Router();

// ---------- validation ----------
const price = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => {
    const b = big(v);
    return !!b && b.gt(0) && b.lt('10000000');
  }, 'must be a positive price');
const signedMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => {
    const b = big(v);
    return !!b && b.abs().lt('10000000');
  }, 'must be a valid amount');
const opt = <T extends z.ZodType>(s: T) => s.nullable().optional();
const isoDate = z.string().datetime({ offset: true });
const mistakes = z.array(z.enum(MONSTER_IDS)).max(12).default([]);

const plannedSchema = z.object({
  pair: z.string().trim().toUpperCase().min(1).max(20),
  instrument_type: z.enum(INSTRUMENT_TYPES).default('forex'),
  direction: z.enum(DIRECTIONS),
  htf_trend: opt(z.enum(HTF_TRENDS)),
  level_type: opt(z.enum(LEVEL_TYPES)),
  entry: price,
  stop_loss: opt(price),
  take_profit: opt(price),
  pip_size: opt(price),
  pip_value: opt(price),
  risk_percent: opt(z.coerce.number().gt(0).max(100)),
  lot_size: opt(price),
  emotion_before: opt(z.enum(EMOTIONS)),
});

const closeSchema = z.object({
  exit_price: price,
  pnl: opt(signedMoney),
  closed_at: opt(isoDate),
  emotion_after: z.enum(EMOTIONS),
  followed_plan: z.boolean(),
  stop_moved: z.boolean().default(false),
  mistakes,
  notes_good: opt(z.string().trim().max(2000)),
  notes_improve: opt(z.string().trim().max(2000)),
  screenshot_url: opt(z.string().max(300)),
});

const createSchema = z.discriminatedUnion('mode', [
  plannedSchema.extend({ mode: z.literal('battle') }),
  plannedSchema.extend({ mode: z.literal('logged'), opened_at: isoDate, close: closeSchema.optional() }),
  plannedSchema.extend({ mode: z.literal('skipped'), skip_reason: z.string().trim().min(1).max(500) }),
]);

type Planned = z.infer<typeof plannedSchema>;

function armorFor(p: Planned, state: RiskState): ArmorReport {
  const input: ArmorInput = {
    direction: p.direction,
    htfTrend: p.htf_trend ?? null,
    levelType: p.level_type ?? null,
    entry: p.entry,
    stopLoss: p.stop_loss ?? null,
    takeProfit: p.take_profit ?? null,
    riskPercent: p.risk_percent ?? null,
    lotSize: p.lot_size ?? null,
    pipSize: p.pip_size ?? null,
    pipValue: p.pip_value ?? null,
    emotionBefore: p.emotion_before ?? null,
  };
  return armorCheck(input, {
    balance: state.balance,
    maxRiskPercent: state.maxRisk,
    maxTrades: state.maxTrades,
    tradesToday: state.tradesToday,
    hpRemaining: state.daily.remaining,
    openRisk: state.openRisk,
    locked: state.locked,
    lockMessage: state.lockMessage ?? undefined,
  });
}

function screenshotPathOk(userId: string, path: string | null | undefined) {
  return !path || (path.startsWith(`${userId}/`) && !path.includes('..') && /^[\w\-./]+$/.test(path));
}

// ---------- routes ----------

/** Dry run: the authoritative armor check, without saving anything. */
tradesRouter.post(
  '/trades/armor-check',
  wrap(async (req, res) => {
    const body = parse(plannedSchema, req.body);
    const state = await getRiskState(req.userId);
    if (!state.account) throw new HttpError(409, 'Set up your account rules first.', 'no_account');
    res.json({ report: armorFor(body, state) });
  }),
);

tradesRouter.post(
  '/trades',
  wrap(async (req, res) => {
    const body = parse(createSchema, req.body);
    const account = await requireActiveAccount(req.userId);
    const state = await getRiskState(req.userId);
    const report = armorFor(body, state);
    const now = new Date();

    const base = {
      user_id: req.userId,
      account_id: account.id,
      session_id: (state.session?.id as string | undefined) ?? null,
      pair: body.pair,
      instrument_type: body.instrument_type,
      direction: body.direction,
      htf_trend: body.htf_trend ?? null,
      level_type: body.level_type ?? null,
      entry: body.entry,
      stop_loss: body.stop_loss ?? null,
      take_profit: body.take_profit ?? null,
      pip_size: body.pip_size ?? null,
      pip_value: body.pip_value ?? null,
      planned_rr: report.rr,
      risk_percent: report.riskPercent ?? body.risk_percent ?? null,
      risk_amount: report.riskAmount,
      lot_size: body.lot_size ?? null,
      emotion_before: body.emotion_before ?? null,
      armor_report: report,
    };

    // --- Disciplined Retreat: a setup you chose NOT to take.
    if (body.mode === 'skipped') {
      const trade = must(
        await admin
          .from('trades')
          .insert({ ...base, status: 'skipped', entry_mode: 'skipped', skip_reason: body.skip_reason, opened_at: now.toISOString(), armor_check_passed: report.passed })
          .select('*')
          .single(),
      ) as { id: string };
      const { count } = await admin.from('xp_events').select('id', { count: 'exact', head: true }).eq('user_id', req.userId).eq('reason', 'disciplined_retreat').gte('created_at', state.dayStart);
      const capped = (count ?? 0) >= MAX_SKIP_REWARDS_PER_DAY;
      const xp = capped ? await awardXp(req.userId, [], trade.id) : await awardXp(req.userId, [{ reason: 'disciplined_retreat', amount: XP.disciplinedRetreat }], trade.id);
      if (xp.delta) must(await admin.from('trades').update({ xp_awarded: xp.delta }).eq('id', trade.id));
      return res.json({ trade, xp, message: capped ? COPY.retreatCapped : COPY.retreat });
    }

    // --- Battle Station: the armor check is a hard gate.
    if (body.mode === 'battle' && !report.passed) {
      return res.status(422).json({ error: report.headline, code: 'armor_failed', report });
    }

    const openedAt = body.mode === 'logged' ? new Date(body.opened_at) : now;
    if (openedAt.getTime() > now.getTime() + 60_000) throw bad('Open time cannot be in the future.');

    const revenge = !!state.lastLossClosedAt && openedAt.getTime() >= new Date(state.lastLossClosedAt).getTime() && openedAt.getTime() - new Date(state.lastLossClosedAt).getTime() <= REVENGE_WINDOW_MIN * 60_000;
    const isToday = openedAt.getTime() >= new Date(state.dayStart).getTime();
    const overLimit = isToday && state.tradesToday >= state.maxTrades;
    const armorPassed = body.mode === 'battle'; // a logged-after-the-fact trade skipped the pre-trade check

    const trade = must(
      await admin
        .from('trades')
        .insert({ ...base, status: 'open', entry_mode: body.mode, opened_at: openedAt.toISOString(), armor_check_passed: armorPassed })
        .select('*')
        .single(),
    ) as { id: string };

    const auto: MonsterId[] = [];
    if (revenge) auto.push('revenge-goblin');
    if (overLimit) auto.push('overtrade-hydra');
    if (!armorPassed && report.items.some((i) => i.key === 'risk' && !i.pass) && report.riskPercent) auto.push('overlord-oversize');
    await tagMistakes(req.userId, trade.id, auto, 'auto');

    const openXp = await awardXp(req.userId, openXpLines({ armorPassed, overTradeLimit: overLimit, revenge }), trade.id);
    must(await admin.from('trades').update({ xp_awarded: openXp.delta }).eq('id', trade.id));

    if (body.mode === 'logged' && body.close) {
      const closed = await closeTrade(req.userId, trade.id, body.close);
      return res.json({ ...closed, openXp, autoTags: auto, note: COPY.noArmor });
    }
    res.json({ trade: { ...trade, xp_awarded: openXp.delta }, report, xp: openXp, autoTags: auto, note: armorPassed ? report.headline : COPY.noArmor });
  }),
);

tradesRouter.post(
  '/trades/:id/close',
  wrap(async (req, res) => {
    const body = parse(closeSchema, req.body);
    res.json(await closeTrade(req.userId, String(req.params.id), body));
  }),
);

async function closeTrade(userId: string, tradeId: string, body: z.infer<typeof closeSchema>) {
  const trade = must(await admin.from('trades').select('*').eq('id', tradeId).eq('user_id', userId).maybeSingle()) as Record<string, any> | null;
  if (!trade) throw notFound('Trade not found.');
  if (trade.status !== 'open') throw bad('This trade is already closed.');
  if (!screenshotPathOk(userId, body.screenshot_url)) throw bad('Invalid screenshot path.');

  const now = new Date();
  const closedAt = body.closed_at ? new Date(body.closed_at) : now;
  if (closedAt.getTime() > now.getTime() + 60_000) throw bad('Close time cannot be in the future.');
  if (trade.opened_at && closedAt.getTime() < new Date(trade.opened_at).getTime()) throw bad('Close time is before the open time.');

  // P/L: the broker's number is the truth (fees, swaps). If not given, estimate from prices.
  const pnl =
    body.pnl ??
    (trade.lot_size && trade.pip_size && trade.pip_value ? estimatePnl(trade.direction, trade.entry, body.exit_price, trade.lot_size, trade.pip_size, trade.pip_value) : null);
  if (pnl === null) throw bad('Enter the P/L from your broker (we could not estimate it without lot size and pip value).');
  const r = trade.risk_amount ? rMultiple(pnl, trade.risk_amount) : null;

  // Honesty rules: a stop moved away is a Stop-Loss Thief encounter; any tag means the plan was broken.
  const userTags = new Set<MonsterId>(body.mistakes);
  if (body.stop_moved) userTags.add('stop-loss-thief');
  const existingTags = must(await admin.from('trade_mistakes').select('monster_id, source').eq('trade_id', tradeId)) as { monster_id: MonsterId; source: string }[];
  const allTags = new Set<MonsterId>([...existingTags.map((t) => t.monster_id), ...userTags]);
  const followedPlan = body.followed_plan && allTags.size === 0 && !body.stop_moved;
  const userTagged = userTags.size > 0 || existingTags.some((t) => t.source === 'user');

  const updated = must(
    await admin
      .from('trades')
      .update({
        status: 'closed',
        exit_price: body.exit_price,
        pnl,
        r_multiple: r,
        closed_at: closedAt.toISOString(),
        logged_at: now.toISOString(),
        emotion_after: body.emotion_after,
        followed_plan: followedPlan,
        stop_moved: body.stop_moved,
        notes_good: body.notes_good ?? null,
        notes_improve: body.notes_improve ?? null,
        screenshot_url: body.screenshot_url ?? null,
      })
      .eq('id', tradeId)
      .eq('user_id', userId)
      .eq('status', 'open') // guards against a double submit closing twice
      .select('*')
      .maybeSingle(),
  ) as Record<string, any> | null;
  if (!updated) throw bad('This trade is already closed.');

  await tagMistakes(userId, tradeId, [...userTags], 'user');

  const lines = closeXpLines({
    followedPlan,
    stopMoved: body.stop_moved,
    userTaggedMistake: userTagged,
    closedAt,
    loggedAt: now,
    openXp: trade.xp_awarded ?? 0,
  });
  const xp = await awardXp(userId, lines, tradeId);
  const totalXp = (trade.xp_awarded ?? 0) + xp.delta;
  must(await admin.from('trades').update({ xp_awarded: totalXp }).eq('id', tradeId));

  const defeated = followedPlan ? await recordCleanTrade(userId, tradeId) : [];

  // Campfire cooldowns: 30 minutes after a loss; two losses in a row today ends the day.
  if (big(pnl)!.lt(0)) await applyLossCooldowns(userId, trade.account_id, closedAt, now);

  const state = await getRiskState(userId); // recomputes HP/Shield and persists a lockout if needed
  must(await admin.from('accounts').update({ current_balance: state.balance }).eq('id', trade.account_id).eq('user_id', userId));

  let monsterName: string | null = null;
  const firstTag = [...allTags][0];
  if (firstTag) {
    const m = must(await admin.from('monsters').select('name').eq('id', firstTag).maybeSingle()) as { name: string } | null;
    monsterName = m?.name ?? null;
  }
  const isLoss = big(pnl)!.lt(0);
  return {
    trade: { ...updated, xp_awarded: totalXp },
    xp,
    tradeXp: totalXp,
    defeatedMonsters: defeated,
    message: closeMessage({ followedPlan, isLoss, monsterName }),
    state: { daily: state.daily, drawdown: state.drawdown, alert: state.alert, alertMessage: state.alertMessage, locked: state.locked, lockMessage: state.lockMessage },
  };
}

async function applyLossCooldowns(userId: string, accountId: string, closedAt: Date, now: Date) {
  const ends = new Date(closedAt.getTime() + LOSS_COOLDOWN_MIN * 60_000);
  const rows: Record<string, unknown>[] = [];
  if (ends > now) rows.push({ user_id: userId, account_id: accountId, starts_at: now.toISOString(), ends_at: ends.toISOString(), reason: 'loss_cooldown' });
  const state = await getRiskState(userId, now);
  const lastTwo = must(
    await admin.from('trades').select('pnl, closed_at').eq('user_id', userId).eq('status', 'closed').gte('closed_at', state.dayStart).order('closed_at', { ascending: false }).limit(2),
  ) as { pnl: number }[];
  if (lastTwo.length === 2 && lastTwo.every((t) => Number(t.pnl) < 0) && !state.cooldowns.some((c) => c.reason === 'loss_streak')) {
    rows.push({ user_id: userId, account_id: accountId, starts_at: now.toISOString(), ends_at: state.dayEnd, reason: 'loss_streak' });
  }
  if (rows.length) must(await admin.from('cooldowns').insert(rows));
}

/** Journal edits after the fact: notes, screenshot, and honest late mistake tags. */
tradesRouter.patch(
  '/trades/:id',
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        notes_good: opt(z.string().trim().max(2000)),
        notes_improve: opt(z.string().trim().max(2000)),
        screenshot_url: opt(z.string().max(300)),
        add_mistakes: mistakes,
      }),
      req.body,
    );
    const id = String(req.params.id);
    const trade = must(await admin.from('trades').select('*').eq('id', id).eq('user_id', req.userId).maybeSingle()) as Record<string, any> | null;
    if (!trade) throw notFound('Trade not found.');
    if (!screenshotPathOk(req.userId, body.screenshot_url)) throw bad('Invalid screenshot path.');

    const patch: Record<string, unknown> = {};
    if (body.notes_good !== undefined) patch.notes_good = body.notes_good;
    if (body.notes_improve !== undefined) patch.notes_improve = body.notes_improve;
    if (body.screenshot_url !== undefined) patch.screenshot_url = body.screenshot_url;

    let xp: AwardResult | null = null;
    const fresh = await tagMistakes(req.userId, id, body.add_mistakes, 'user');
    if (fresh.length && trade.status === 'closed') {
      // Admitting a mistake later: honesty bonus, but the trade now counts as plan-broken (capped at -10 total).
      const lines: XpLine[] = [{ reason: 'honest_tag', amount: XP.honestTag }];
      const after = (trade.xp_awarded ?? 0) + XP.honestTag;
      if (after > BROKEN_PLAN_CAP) lines.push({ reason: 'broken_plan_cap' as const, amount: BROKEN_PLAN_CAP - after });
      xp = await awardXp(req.userId, lines, id);
      patch.followed_plan = false;
      patch.xp_awarded = (trade.xp_awarded ?? 0) + xp.delta;
    }
    const updated = Object.keys(patch).length ? must(await admin.from('trades').update(patch).eq('id', id).eq('user_id', req.userId).select('*').single()) : trade;
    res.json({ trade: updated, xp });
  }),
);

tradesRouter.get(
  '/trades',
  wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    let q = admin
      .from('trades')
      .select('*, trade_mistakes(monster_id, source)', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('opened_at', { ascending: false })
      .range(offset, offset + limit - 1);
    const status = String(req.query.status || '');
    if (['open', 'closed', 'skipped'].includes(status)) q = q.eq('status', status);
    const { data, error, count } = await q;
    if (error) throw new HttpError(500, error.message);
    res.json({ trades: data, total: count ?? 0 });
  }),
);

tradesRouter.get(
  '/trades/:id',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const [trade, events] = await Promise.all([
      admin.from('trades').select('*, trade_mistakes(monster_id, source)').eq('id', id).eq('user_id', req.userId).maybeSingle(),
      admin.from('xp_events').select('reason, amount, created_at').eq('user_id', req.userId).eq('ref_id', id).order('created_at'),
    ]);
    const t = must(trade);
    if (!t) throw notFound('Trade not found.');
    res.json({ trade: t, xpEvents: must(events) });
  }),
);

// Deleting a trade removes it from the journal, but its XP history stays (penalties can't be erased).
tradesRouter.delete(
  '/trades/:id',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const t = must(await admin.from('trades').select('screenshot_url').eq('id', id).eq('user_id', req.userId).maybeSingle()) as { screenshot_url: string | null } | null;
    if (!t) throw notFound('Trade not found.');
    if (t.screenshot_url) await admin.storage.from('screenshots').remove([t.screenshot_url]);
    must(await admin.from('trades').delete().eq('id', id).eq('user_id', req.userId));
    res.json({ ok: true });
  }),
);
