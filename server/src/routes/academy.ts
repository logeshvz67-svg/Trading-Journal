// Phase 3: Training Academy (lessons + quiz gate, flashcards, chart drills) and the Codex.
import { Router } from 'express';
import { z } from 'zod';
import type { DrillPayload } from '@shared/candles';
import { localDateKey } from '@shared/time';
import { XP } from '@shared/xp';
import { admin } from '../lib/supabase';
import { bad, HttpError, must, notFound, parse, wrap } from '../lib/http';
import { getProfile } from '../services/context';
import { awardXp } from '../services/xp';

export const academyRouter = Router();

interface Lesson {
  id: string;
  zone: number;
  sort_order: number;
  title: string;
  content: string;
  quiz: { q: string; options: string[]; answer: number; why: string }[];
  pass_mark: number;
  est_minutes: number;
  is_stub: boolean;
}

const BOX_DAYS = [1, 3, 7, 14]; // spaced repetition ladder
const NEW_CARDS_PER_DAY = 10;

/** Lessons in path order with lock status: each real lesson unlocks when the previous one is passed. */
async function lessonPath(userId: string) {
  const [lessonsRes, progRes] = await Promise.all([
    admin.from('lessons').select('id, zone, sort_order, title, est_minutes, is_stub, pass_mark').order('zone').order('sort_order'),
    admin.from('lesson_progress').select('lesson_id, status, score, attempts, completed_at').eq('user_id', userId),
  ]);
  const lessons = must(lessonsRes) as Omit<Lesson, 'content' | 'quiz'>[];
  const prog = new Map((must(progRes) as { lesson_id: string; status: string; score: number | null; attempts: number }[]).map((p) => [p.lesson_id, p]));
  let previousPassed = true;
  return lessons.map((l) => {
    const p = prog.get(l.id);
    const passed = p?.status === 'passed';
    const locked = l.is_stub ? true : !previousPassed;
    if (!l.is_stub) previousPassed = passed;
    return { ...l, status: passed ? 'passed' : p ? 'started' : 'new', score: p?.score ?? null, attempts: p?.attempts ?? 0, locked };
  });
}

academyRouter.get(
  '/academy',
  wrap(async (req, res) => {
    res.json({ lessons: await lessonPath(req.userId) });
  }),
);

academyRouter.get(
  '/lessons/:id',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const path = await lessonPath(req.userId);
    const node = path.find((l) => l.id === id);
    if (!node) throw notFound('Lesson not found.');
    if (node.locked && !node.is_stub) throw new HttpError(403, 'Pass the previous quiz with 80% to unlock this lesson.', 'locked');
    const lesson = must(await admin.from('lessons').select('*').eq('id', id).single()) as Lesson;
    const notes = must(await admin.from('lesson_progress').select('notes').eq('user_id', req.userId).eq('lesson_id', id).maybeSingle()) as { notes: string | null } | null;
    // Answers never leave the server; grading happens in POST /quiz.
    res.json({ lesson: { ...lesson, quiz: lesson.quiz.map(({ q, options }) => ({ q, options })) }, progress: node, notes: notes?.notes ?? '' });
  }),
);

academyRouter.post(
  '/lessons/:id/quiz',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { answers } = parse(z.object({ answers: z.array(z.number().int().min(0).max(10)) }), req.body);
    const path = await lessonPath(req.userId);
    const node = path.find((l) => l.id === id);
    if (!node) throw notFound('Lesson not found.');
    if (node.locked) throw new HttpError(403, 'This lesson is locked.', 'locked');
    const lesson = must(await admin.from('lessons').select('quiz, pass_mark').eq('id', id).single()) as Pick<Lesson, 'quiz' | 'pass_mark'>;
    if (!lesson.quiz.length) throw bad('This lesson has no quiz yet.');
    if (answers.length !== lesson.quiz.length) throw bad('Answer every question.');

    const results = lesson.quiz.map((item, i) => ({ correct: answers[i] === item.answer, answer: item.answer, why: item.why }));
    const score = Math.round((results.filter((r) => r.correct).length / lesson.quiz.length) * 100);
    const passed = score >= lesson.pass_mark;
    const existing = must(await admin.from('lesson_progress').select('*').eq('user_id', req.userId).eq('lesson_id', id).maybeSingle()) as any;
    const wasPassed = existing?.status === 'passed';
    must(
      await admin.from('lesson_progress').upsert(
        {
          user_id: req.userId,
          lesson_id: id,
          status: passed || wasPassed ? 'passed' : 'started',
          score: Math.max(score, existing?.score ?? 0),
          attempts: (existing?.attempts ?? 0) + 1,
          completed_at: passed && !wasPassed ? new Date().toISOString() : existing?.completed_at ?? null,
        },
        { onConflict: 'user_id,lesson_id' },
      ),
    );
    const xp = passed ? await awardXp(req.userId, [{ reason: 'lesson_quiz', amount: XP.lessonQuiz }], `lesson:${id}`) : null;
    res.json({ score, passed, passMark: lesson.pass_mark, results, xp });
  }),
);

academyRouter.put(
  '/lessons/:id/notes',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { notes } = parse(z.object({ notes: z.string().max(5000) }), req.body);
    const existing = must(await admin.from('lesson_progress').select('id').eq('user_id', req.userId).eq('lesson_id', id).maybeSingle());
    if (existing) must(await admin.from('lesson_progress').update({ notes }).eq('user_id', req.userId).eq('lesson_id', id));
    else must(await admin.from('lesson_progress').insert({ user_id: req.userId, lesson_id: id, notes }));
    res.json({ ok: true });
  }),
);

// ---------- Flashcards (spaced repetition: 1 / 3 / 7 / 14 days)
academyRouter.get(
  '/flashcards/due',
  wrap(async (req, res) => {
    const now = new Date().toISOString();
    const [cardsRes, reviewsRes] = await Promise.all([
      admin.from('flashcards').select('*').or(`user_id.is.null,user_id.eq.${req.userId}`).order('zone').order('created_at'),
      admin.from('flashcard_reviews').select('flashcard_id, box, next_review_at').eq('user_id', req.userId),
    ]);
    const cards = must(cardsRes) as { id: string; user_id: string | null; zone: number | null; front: string; back: string }[];
    const reviews = new Map((must(reviewsRes) as { flashcard_id: string; box: number; next_review_at: string }[]).map((r) => [r.flashcard_id, r]));
    const due = cards.filter((c) => reviews.has(c.id) && reviews.get(c.id)!.next_review_at <= now);
    const fresh = cards.filter((c) => !reviews.has(c.id)).slice(0, NEW_CARDS_PER_DAY);
    res.json({
      due: [...due, ...fresh].map((c) => ({ ...c, box: reviews.get(c.id)?.box ?? null, own: c.user_id !== null })),
      total: cards.length,
      learned: [...reviews.values()].filter((r) => r.box >= 3).length,
      own: cards.filter((c) => c.user_id !== null),
    });
  }),
);

academyRouter.post(
  '/flashcards/:id/review',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { knew } = parse(z.object({ knew: z.boolean() }), req.body);
    const card = must(await admin.from('flashcards').select('id, user_id').eq('id', id).maybeSingle()) as { user_id: string | null } | null;
    if (!card || (card.user_id && card.user_id !== req.userId)) throw notFound('Card not found.');
    const prev = must(await admin.from('flashcard_reviews').select('box').eq('user_id', req.userId).eq('flashcard_id', id).maybeSingle()) as { box: number } | null;
    const box = knew ? Math.min((prev ? prev.box + 1 : 0), BOX_DAYS.length - 1) : 0;
    const days = BOX_DAYS[box];
    const now = new Date();
    must(
      await admin.from('flashcard_reviews').upsert(
        { user_id: req.userId, flashcard_id: id, box, interval_days: days, next_review_at: new Date(now.getTime() + days * 86400000).toISOString(), last_reviewed_at: now.toISOString() },
        { onConflict: 'user_id,flashcard_id' },
      ),
    );
    res.json({ box, nextInDays: days });
  }),
);

academyRouter.post(
  '/flashcards',
  wrap(async (req, res) => {
    const body = parse(z.object({ front: z.string().trim().min(1).max(300), back: z.string().trim().min(1).max(1000) }), req.body);
    res.json({ card: must(await admin.from('flashcards').insert({ ...body, user_id: req.userId }).select('*').single()) });
  }),
);

academyRouter.delete(
  '/flashcards/:id',
  wrap(async (req, res) => {
    must(await admin.from('flashcards').delete().eq('id', String(req.params.id)).eq('user_id', req.userId));
    res.json({ ok: true });
  }),
);

// ---------- Chart drills
const stripDrill = (p: DrillPayload): DrillPayload => ({ ...p, questions: p.questions.map(({ q, options }) => ({ q, options })) });

academyRouter.get(
  '/drills',
  wrap(async (req, res) => {
    const [drills, attempts] = await Promise.all([
      admin.from('drills').select('id, zone, title, kind').order('zone').order('id'),
      admin.from('drill_attempts').select('drill_id, score').eq('user_id', req.userId),
    ]);
    const best = new Map<string, number>();
    for (const a of must(attempts) as { drill_id: string; score: number }[]) best.set(a.drill_id, Math.max(best.get(a.drill_id) ?? 0, a.score));
    res.json({ drills: (must(drills) as { id: string }[]).map((d) => ({ ...d, best: best.get(d.id) ?? null })) });
  }),
);

academyRouter.get(
  '/drills/:id',
  wrap(async (req, res) => {
    const d = must(await admin.from('drills').select('*').eq('id', String(req.params.id)).maybeSingle()) as { payload: DrillPayload } | null;
    if (!d) throw notFound('Drill not found.');
    res.json({ drill: { ...d, payload: stripDrill(d.payload) } });
  }),
);

academyRouter.post(
  '/drills/:id',
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { answers } = parse(z.object({ answers: z.array(z.number().int().min(0).max(10)) }), req.body);
    const d = must(await admin.from('drills').select('payload').eq('id', id).maybeSingle()) as { payload: DrillPayload } | null;
    if (!d) throw notFound('Drill not found.');
    const qs = d.payload.questions;
    if (answers.length !== qs.length) throw bad('Answer every question.');
    const results = qs.map((item, i) => ({ correct: answers[i] === item.answer, answer: item.answer, why: item.why }));
    const score = Math.round((results.filter((r) => r.correct).length / qs.length) * 100);
    must(await admin.from('drill_attempts').insert({ user_id: req.userId, drill_id: id, score, answers }));
    const profile = await getProfile(req.userId);
    const today = localDateKey(new Date(), profile.timezone || 'UTC');
    const xp = score >= 80 ? await awardXp(req.userId, [{ reason: 'chart_drill', amount: XP.chartDrill }], `drill:${id}:${today}`) : null;
    res.json({ score, results, xp });
  }),
);

// ---------- Codex: Oath, earned rules, playbook
academyRouter.get(
  '/codex',
  wrap(async (req, res) => {
    const [oath, rules, profile] = await Promise.all([
      admin.from('oath_rules').select('id, text, sort_order, signed_at').eq('user_id', req.userId).order('sort_order'),
      admin.from('codex_rules').select('*, monsters(name, emoji)').eq('user_id', req.userId).order('created_at', { ascending: false }),
      getProfile(req.userId),
    ]);
    res.json({ oath: must(oath), rules: must(rules), playbook: (profile as any).playbook ?? {} });
  }),
);

academyRouter.post(
  '/codex/rules',
  wrap(async (req, res) => {
    const { text } = parse(z.object({ text: z.string().trim().min(3).max(300) }), req.body);
    res.json({ rule: must(await admin.from('codex_rules').insert({ user_id: req.userId, text, source: 'manual' }).select('*').single()) });
  }),
);

academyRouter.delete(
  '/codex/rules/:id',
  wrap(async (req, res) => {
    must(await admin.from('codex_rules').delete().eq('id', String(req.params.id)).eq('user_id', req.userId));
    res.json({ ok: true });
  }),
);

const playbookSchema = z.object({
  name: z.string().trim().max(80).default(''),
  markets: z.string().trim().max(200).default(''),
  timeframes: z.string().trim().max(200).default(''),
  session: z.string().trim().max(200).default(''),
  setup: z.string().trim().max(2000).default(''),
  entry: z.string().trim().max(2000).default(''),
  stop: z.string().trim().max(1000).default(''),
  target: z.string().trim().max(1000).default(''),
  management: z.string().trim().max(1000).default(''),
  avoid: z.string().trim().max(1000).default(''),
});

academyRouter.put(
  '/codex/playbook',
  wrap(async (req, res) => {
    const playbook = parse(playbookSchema, req.body);
    must(await admin.from('profiles').update({ playbook }).eq('user_id', req.userId));
    res.json({ playbook });
  }),
);
