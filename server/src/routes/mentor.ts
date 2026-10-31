// Phase 4: AI Mentor. Optional (the app works without a key), server-side only,
// rate-limited per user per day in the DB, and capped in tokens per call.
import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { z } from 'zod';
import { localDateKey } from '@shared/time';
import { config } from '../config';
import { admin } from '../lib/supabase';
import { bad, HttpError, must, notFound, parse, wrap } from '../lib/http';
import { getProfile } from '../services/context';
import { getRiskState } from '../services/riskState';

export const mentorRouter = Router();

const client = config.aiApiKey ? new Anthropic({ apiKey: config.aiApiKey, maxRetries: 1, timeout: 60_000 }) : null;

const SYSTEM = `You are the Mentor in Market Quest, a game-themed trading discipline and journaling app for a BEGINNER trader.
The trader knows only: bullish/bearish candles, support/resistance, and trendlines. They trade a $5k prop firm account.

Hard rules, never break them:
- NEVER predict prices or direction, never give buy/sell/hold signals, entries, or targets for any real market, and never say a trade "will" work.
  If asked, say kindly that you don't give signals, then teach the trader how to evaluate it themselves with their own rules.
- Never promise or imply guaranteed profit. This is education, not financial advice.
- Judge trades by PROCESS (plan followed, risk, rules), never by profit. A loss with the plan followed is a good trade; a win with rules broken is a bad trade.

Style:
- Plain, beginner-level language. Short paragraphs or a few bullets. Under 220 words unless asked for more.
- Encouraging after losses where the plan was followed. Firm and direct (still respectful) when rules were broken.
- Use light fantasy flavour (warrior, monsters, armor) sparingly; clarity first.
- Refer to the app's tools when useful: Pre-Battle Prep, Battle Station armor check, Risk Forge, Campfire cooldown, Monster Den, Codex.`;

const MODE_GUIDE: Record<string, string> = {
  ask: 'Answer the question as a patient beginner tutor.',
  review:
    'The trader shared a chart screenshot. Describe what you can see in terms of trend structure (higher highs/lows or lower), visible support/resistance and trendlines, and whether their plan (if given) follows their rules. Do NOT say where price will go or whether to enter. End with 2 questions that help them review it themselves.',
  explain:
    "Help the trader understand a mistake on a specific trade. On your FIRST reply, do not explain yet: ask 2-3 short questions about what they saw, felt and decided. After they answer, explain the mistake, name the monster, and give one concrete fix they can apply next session.",
  briefing:
    "Give a short morning briefing based ONLY on the trader's own data below: today's limits, their active monster and its fix, one focus for today, and a reminder of their Oath. No market forecasts.",
  debrief:
    "Give a short end-of-day debrief based ONLY on today's trades below: what went well in process, what broke, one lesson, and whether to visit the Campfire. Don't celebrate profit amounts.",
  patterns:
    'Spot behavioural patterns in the trade statistics below (times, emotions, setups, mistakes, plan-following). List the 3 most important patterns with evidence, then ONE experiment to try next week. Process only, no market predictions.',
};

const bodySchema = z.object({
  mode: z.enum(['ask', 'review', 'explain', 'briefing', 'debrief', 'patterns']),
  message: z.string().trim().max(2000).default(''),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(12)
    .default([]),
  trade_id: z.string().uuid().optional(),
  screenshot_path: z.string().max(300).optional(),
});

mentorRouter.get(
  '/mentor/status',
  wrap(async (req, res) => {
    if (!client) return res.json({ enabled: false, used: 0, limit: config.aiDailyLimit });
    const profile = await getProfile(req.userId);
    const today = localDateKey(new Date(), profile.timezone || 'UTC');
    const row = must(await admin.from('ai_usage').select('count').eq('user_id', req.userId).eq('usage_date', today).maybeSingle()) as { count: number } | null;
    res.json({ enabled: true, used: row?.count ?? 0, limit: config.aiDailyLimit });
  }),
);

mentorRouter.post(
  '/mentor',
  wrap(async (req, res) => {
    if (!client) throw new HttpError(503, 'The Mentor is not configured on this server. Everything else works without it.', 'ai_disabled');
    const body = parse(bodySchema, req.body);
    if ((body.mode === 'ask' || body.mode === 'explain') && !body.message && !body.history.length) throw bad('Ask the Mentor something first.');

    const profile = await getProfile(req.userId);
    const today = localDateKey(new Date(), profile.timezone || 'UTC');

    // Build the trader's own context first (fails fast before spending a call).
    const context = await buildContext(req.userId, body);
    let image: Anthropic.Beta.BetaImageBlockParam | null = null;
    if (body.screenshot_path) {
      if (!body.screenshot_path.startsWith(`${req.userId}/`) || body.screenshot_path.includes('..')) throw bad('Invalid screenshot.');
      const { data, error } = await admin.storage.from('screenshots').download(body.screenshot_path);
      if (error || !data) throw notFound('Screenshot not found.');
      if (data.size > 1_500_000) throw bad('Screenshot too large.');
      image = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(await data.arrayBuffer()).toString('base64') } };
    }

    // Atomic per-user daily limit, stored in the DB so it survives restarts and sleep.
    const count = must(await admin.rpc('ai_consume', { p_user: req.userId, p_date: today, p_limit: config.aiDailyLimit })) as number | null;
    if (count === null) {
      throw new HttpError(429, `The Mentor has answered ${config.aiDailyLimit} questions today and is resting by the fire. Come back tomorrow, or review your Codex meanwhile.`, 'ai_limit');
    }

    const firstText = [`Mode: ${body.mode}. ${MODE_GUIDE[body.mode]}`, context ? `\n<trader_data>\n${context}\n</trader_data>` : '', body.message ? `\n\nTrader: ${body.message}` : '']
      .join('')
      .trim();
    const messages: Anthropic.Beta.BetaMessageParam[] = body.history.length
      ? [
          { role: 'user', content: `Mode: ${body.mode}. ${MODE_GUIDE[body.mode]}${context ? `\n<trader_data>\n${context}\n</trader_data>` : ''}` },
          ...body.history,
          ...(body.message ? [{ role: 'user' as const, content: body.message }] : []),
        ]
      : [{ role: 'user', content: image ? [image, { type: 'text', text: firstText }] : firstText }];

    try {
      const response = await client.beta.messages.create({
        model: config.aiModel,
        max_tokens: config.aiMaxTokens,
        system: SYSTEM,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages,
      });
      await admin.rpc('ai_add_tokens', { p_user: req.userId, p_date: today, p_tokens: response.usage.input_tokens + response.usage.output_tokens });

      if (response.stop_reason === 'refusal') {
        return res.json({ reply: "I can't help with that one. Let's keep to your process: your rules, your journal, your risk.", used: count, limit: config.aiDailyLimit });
      }
      let reply = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (response.stop_reason === 'max_tokens') reply += '\n\n(The Mentor ran out of breath. Ask a follow-up to continue.)';
      res.json({ reply: reply || '…', used: count, limit: config.aiDailyLimit });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new HttpError(503, 'The Mentor is busy right now. Try again in a minute.', 'ai_busy');
      if (e instanceof Anthropic.AuthenticationError) throw new HttpError(503, 'The Mentor key on the server is invalid. Check ANTHROPIC_API_KEY on Render.', 'ai_auth');
      if (e instanceof Anthropic.APIError) throw new HttpError(502, 'The Mentor could not answer. Please try again.', 'ai_error');
      throw e;
    }
  }),
);

async function buildContext(userId: string, body: z.infer<typeof bodySchema>): Promise<string> {
  const lines: string[] = [];
  const tradeLine = (t: any, tags: string[]) =>
    `${t.pair} ${t.direction} | HTF ${t.htf_trend ?? '?'} | level ${t.level_type ?? '?'} | planned RR ${t.planned_rr ?? '?'} | risk ${t.risk_percent ?? '?'}% | result ${t.r_multiple ?? '?'}R | plan followed: ${t.followed_plan ?? 'open'} | armor: ${t.armor_check_passed} | emotion ${t.emotion_before ?? '?'}→${t.emotion_after ?? '?'} | mistakes: ${tags.join(', ') || 'none'}${t.notes_improve ? ` | note: ${String(t.notes_improve).slice(0, 200)}` : ''}`;

  if (body.trade_id) {
    const t = must(await admin.from('trades').select('*, trade_mistakes(monster_id)').eq('id', body.trade_id).eq('user_id', userId).maybeSingle()) as any;
    if (!t) throw notFound('Trade not found.');
    lines.push(`Trade: ${tradeLine(t, (t.trade_mistakes ?? []).map((m: any) => m.monster_id))}`);
  }

  if (body.mode === 'briefing' || body.mode === 'debrief') {
    const state = await getRiskState(userId);
    const oath = must(await admin.from('oath_rules').select('text').eq('user_id', userId).order('sort_order')) as { text: string }[];
    const monster = must(await admin.from('user_monsters').select('monster_id, encounter_count, clean_trade_streak').eq('user_id', userId).eq('status', 'active').order('encounter_count', { ascending: false }).limit(1)) as any[];
    lines.push(`Today: ${state.today}. HP left $${state.daily.remaining} of $${state.daily.limit}. Shield left $${state.drawdown.remaining}. Trades ${state.tradesToday}/${state.maxTrades}. Max risk ${state.maxRisk}%. Locked: ${state.locked}.`);
    if (state.session) lines.push(`Prep: mood ${state.session.mood}, focus ${state.session.focus_score}/100, key levels: ${String(state.session.key_levels ?? '').slice(0, 300)}`);
    if (monster[0]) lines.push(`Active monster: ${monster[0].monster_id} (${monster[0].encounter_count} encounters, ${monster[0].clean_trade_streak}/5 clean trades).`);
    lines.push(`Oath: ${oath.map((o) => o.text).join(' / ')}`);
    if (body.mode === 'debrief') {
      const trades = must(await admin.from('trades').select('*, trade_mistakes(monster_id)').eq('user_id', userId).gte('opened_at', state.dayStart).order('opened_at')) as any[];
      lines.push(trades.length ? `Today's trades:\n${trades.map((t) => `- [${t.status}] ${tradeLine(t, (t.trade_mistakes ?? []).map((m: any) => m.monster_id))}`).join('\n')}` : 'No trades today.');
      const refl = must(await admin.from('journal_reflections').select('text').eq('user_id', userId).eq('reflection_date', state.today).maybeSingle()) as { text: string } | null;
      if (refl) lines.push(`Reflection: ${refl.text.slice(0, 600)}`);
    }
  }

  if (body.mode === 'patterns') {
    const trades = must(
      await admin.from('trades').select('pair, direction, htf_trend, level_type, r_multiple, followed_plan, emotion_before, opened_at, trade_mistakes(monster_id)').eq('user_id', userId).eq('status', 'closed').order('closed_at', { ascending: false }).limit(150),
    ) as any[];
    if (trades.length < 20) throw bad(`The pattern spotter needs at least 20 closed trades. You have ${trades.length}. Keep journaling!`);
    const profile = await getProfile(userId);
    const tz = profile.timezone || 'UTC';
    const group = (key: (t: any) => string) => {
      const m = new Map<string, { n: number; plan: number; r: number }>();
      for (const t of trades) {
        const k = key(t);
        const v = m.get(k) ?? { n: 0, plan: 0, r: 0 };
        v.n++;
        if (t.followed_plan) v.plan++;
        v.r += Number(t.r_multiple ?? 0);
        m.set(k, v);
      }
      return [...m.entries()].map(([k, v]) => `${k}: ${v.n} trades, plan ${Math.round((v.plan / v.n) * 100)}%, avg ${(v.r / v.n).toFixed(2)}R`).join('; ');
    };
    const hour = (t: any) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date(t.opened_at));
    const weekday = (t: any) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(t.opened_at));
    const mistakes = new Map<string, number>();
    for (const t of trades) for (const m of t.trade_mistakes ?? []) mistakes.set(m.monster_id, (mistakes.get(m.monster_id) ?? 0) + 1);
    lines.push(`Closed trades analysed: ${trades.length} (most recent first).`);
    lines.push(`By hour: ${group((t) => `${hour(t)}h`)}`);
    lines.push(`By weekday: ${group(weekday)}`);
    lines.push(`By pair: ${group((t) => t.pair)}`);
    lines.push(`By setup: ${group((t) => `${t.htf_trend}/${t.level_type}/${t.direction}`)}`);
    lines.push(`By emotion before: ${group((t) => t.emotion_before ?? 'unknown')}`);
    lines.push(`Mistake tags: ${[...mistakes.entries()].map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`);
  }
  return lines.join('\n');
}
