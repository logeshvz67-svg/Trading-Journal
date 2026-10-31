import { Router } from 'express';
import { z } from 'zod';
import { MOODS } from '@shared/constants';
import { focusScore, focusVerdict } from '@shared/prep';
import { big } from '@shared/risk';
import { levelProgress, XP } from '@shared/xp';
import { admin } from '../lib/supabase';
import { bad, must, parse, wrap } from '../lib/http';
import { requireActiveAccount } from '../services/context';
import { getRiskState } from '../services/riskState';
import { activeMonster } from '../services/monsters';
import { awardXp } from '../services/xp';

export const stateRouter = Router();

/** Everything the always-visible risk bar and the Command Center need, in one call. */
stateRouter.get(
  '/state',
  wrap(async (req, res) => {
    const [state, monster] = await Promise.all([getRiskState(req.userId), activeMonster(req.userId)]);
    const { profile, ...rest } = state;
    res.json({ ...rest, profile, progress: levelProgress(profile.xp), activeMonster: monster });
  }),
);

const prepSchema = z.object({
  mood: z.enum(MOODS),
  sleep_ok: z.boolean(),
  distractions: z.boolean(),
  news_checked: z.boolean(),
  news_notes: z.string().trim().max(500).optional().default(''),
  plan_pairs: z.array(z.string().trim().toUpperCase().min(1).max(20)).max(10).default([]),
  key_levels: z.string().trim().max(1000).optional().default(''),
  max_trades: z.coerce.number().int().min(0).max(20),
  max_risk: z.coerce.number().gt(0).max(5),
});

stateRouter.post(
  '/sessions',
  wrap(async (req, res) => {
    const body = parse(prepSchema, req.body);
    const account = await requireActiveAccount(req.userId);
    // Prep can tighten your rules for the day, never loosen them.
    if (body.max_trades > account.max_trades_per_day) throw bad(`Max trades can't be above your account rule (${account.max_trades_per_day}).`);
    if (big(body.max_risk)!.gt(big(account.max_risk_percent)!)) throw bad(`Max risk can't be above your account rule (${account.max_risk_percent}%).`);

    const state = await getRiskState(req.userId);
    const score = focusScore({ mood: body.mood, sleepOk: body.sleep_ok, distractions: body.distractions, newsChecked: body.news_checked });
    const session = must(
      await admin
        .from('sessions')
        .upsert(
          { ...body, user_id: req.userId, account_id: account.id, session_date: state.today, focus_score: score },
          { onConflict: 'user_id,account_id,session_date' },
        )
        .select('*')
        .single(),
    );
    const xp = await awardXp(req.userId, [{ reason: 'prep', amount: XP.prep }], `prep:${state.today}`);
    res.json({ session, focus: score, verdict: focusVerdict(score), xp });
  }),
);

stateRouter.get(
  '/xp/events',
  wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const data = must(await admin.from('xp_events').select('*').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(limit));
    res.json({ events: data });
  }),
);

stateRouter.get(
  '/monsters',
  wrap(async (req, res) => {
    const [lib, mine] = await Promise.all([
      admin.from('monsters').select('*').order('sort_order'),
      admin.from('user_monsters').select('*').eq('user_id', req.userId),
    ]);
    res.json({ monsters: must(lib), mine: must(mine) });
  }),
);
