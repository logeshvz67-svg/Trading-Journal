import { Router } from 'express';
import { z } from 'zod';
import { ACCOUNT_PHASES, DRAWDOWN_MODES } from '@shared/constants';
import { scoreAssessment } from '@shared/onboarding';
import { BASE_AVATAR_IDS } from '@shared/avatars';
import { big } from '@shared/risk';
import { isValidTimeZone } from '@shared/time';
import { levelProgress } from '@shared/xp';
import { admin } from '../lib/supabase';
import { bad, must, parse, wrap } from '../lib/http';
import { getActiveAccount, getProfile } from '../services/context';

export const meRouter = Router();

const money = (min = 0) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => {
      const b = big(v);
      return !!b && b.gte(min) && b.lt('100000000');
    }, 'must be a valid amount');
const optMoney = money().nullable().optional();

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  avatar: z.string().trim().min(1).max(40),
  goal: z.string().trim().max(300).nullable().optional(),
  timezone: z.string().refine(isValidTimeZone, 'unknown timezone'),
});

const accountSchema = z
  .object({
    firm_name: z.string().trim().min(1).max(60),
    starting_balance: money(1),
    daily_loss_limit: money(1),
    max_drawdown: money(1),
    drawdown_mode: z.enum(DRAWDOWN_MODES),
    profit_target: optMoney,
    min_trading_days: z.coerce.number().int().min(0).max(365),
    consistency_rule: z.string().trim().max(300).nullable().optional(),
    consistency_pct: z.union([z.coerce.number().gt(0).max(100), z.null()]).optional(),
    news_rule: z.string().trim().max(300).nullable().optional(),
    phase: z.enum(ACCOUNT_PHASES),
    max_risk_percent: z.coerce.number().gt(0).max(5),
    max_trades_per_day: z.coerce.number().int().min(1).max(20),
  })
  .superRefine((a, ctx) => {
    const start = big(a.starting_balance)!;
    if (big(a.daily_loss_limit)!.gt(start)) ctx.addIssue({ code: 'custom', path: ['daily_loss_limit'], message: 'cannot exceed starting balance' });
    if (big(a.max_drawdown)!.gt(start)) ctx.addIssue({ code: 'custom', path: ['max_drawdown'], message: 'cannot exceed starting balance' });
    if (big(a.daily_loss_limit)!.gt(big(a.max_drawdown)!)) ctx.addIssue({ code: 'custom', path: ['daily_loss_limit'], message: 'should not be bigger than max drawdown' });
  });

const oathSchema = z.array(z.string().trim().min(1).max(200)).min(1).max(10);

meRouter.get(
  '/me',
  wrap(async (req, res) => {
    const [profile, account, oath] = await Promise.all([
      getProfile(req.userId),
      getActiveAccount(req.userId),
      admin.from('oath_rules').select('id, text, sort_order, signed_at').eq('user_id', req.userId).order('sort_order'),
    ]);
    res.json({ profile, account, oath: must(oath), progress: levelProgress(profile.xp) });
  }),
);

meRouter.post(
  '/onboarding',
  wrap(async (req, res) => {
    const body = parse(
      z.object({ profile: profileSchema, assessment: z.array(z.number().int().min(0).max(5)), account: accountSchema, oath: oathSchema }),
      req.body,
    );
    const scored = scoreAssessment(body.assessment);
    if (!scored) throw bad('Please answer every self-assessment question.');
    const profile = await getProfile(req.userId);
    if (profile.onboarded) throw bad('You have already completed onboarding. Edit things in Settings.');

    const existing = await getActiveAccount(req.userId);
    if (!existing) {
      must(await admin.from('accounts').insert({ ...body.account, user_id: req.userId, current_balance: body.account.starting_balance }));
    }
    await replaceOath(req.userId, body.oath, true);
    must(
      await admin
        .from('profiles')
        .update({
          ...body.profile,
          risk_personality: scored.personality,
          self_assessment: { answers: body.assessment, score: scored.score },
          onboarded: true,
        })
        .eq('user_id', req.userId),
    );
    res.json({ ok: true, personality: scored.personality });
  }),
);

meRouter.patch(
  '/profile',
  wrap(async (req, res) => {
    const body = parse(
      profileSchema.partial().extend({
        settings: z
          .object({
            sound: z.boolean().optional(),
            theme: z.enum(['dark', 'light', 'system']).optional(),
            notifications: z.object({ enabled: z.boolean(), prep_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict().optional(),
          })
          .strict()
          .optional(),
      }),
      req.body,
    );
    if (body.avatar && !(BASE_AVATAR_IDS as readonly string[]).includes(body.avatar)) {
      const owned = must(await admin.from('user_inventory').select('item_id, shop_items!inner(kind, value)').eq('user_id', req.userId).eq('shop_items.kind', 'avatar').eq('shop_items.value', body.avatar).limit(1)) as unknown[];
      if (!owned.length) throw bad('Unlock that avatar in the gold shop first.');
    }
    const update: Record<string, unknown> = { ...body };
    if (body.settings) {
      const current = await getProfile(req.userId);
      update.settings = { ...current.settings, ...body.settings };
    }
    const data = must(await admin.from('profiles').update(update).eq('user_id', req.userId).select('*').single());
    res.json({ profile: data });
  }),
);

meRouter.put(
  '/account',
  wrap(async (req, res) => {
    const body = parse(accountSchema, req.body);
    const existing = await getActiveAccount(req.userId);
    if (!existing) {
      const created = must(await admin.from('accounts').insert({ ...body, user_id: req.userId, current_balance: body.starting_balance }).select('*').single());
      return res.json({ account: created });
    }
    const updated = must(await admin.from('accounts').update(body).eq('id', existing.id).eq('user_id', req.userId).select('*').single());
    res.json({ account: updated });
  }),
);

meRouter.put(
  '/oath',
  wrap(async (req, res) => {
    const body = parse(z.object({ rules: oathSchema }), req.body);
    const rules = await replaceOath(req.userId, body.rules, true);
    res.json({ oath: rules });
  }),
);

async function replaceOath(userId: string, rules: string[], signed: boolean) {
  must(await admin.from('oath_rules').delete().eq('user_id', userId));
  const now = new Date().toISOString();
  return must(
    await admin
      .from('oath_rules')
      .insert(rules.map((text, i) => ({ user_id: userId, text, sort_order: i, signed_at: signed ? now : null })))
      .select('id, text, sort_order, signed_at'),
  );
}
