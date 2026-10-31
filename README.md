# 🏰 Market Quest

A game-themed trading **discipline**, journal and learning app for beginner traders.

> The market is not a casino. It's a kingdom, and you're about to learn how to rule yourself before you rule your trades.

**Core rule:** XP, gold and levels reward discipline and process, **never profit**. A losing trade where you followed your plan earns XP. A winning trade where you broke your rules loses XP.

> Market Quest is a learning and journaling tool. It is not financial advice. Trading involves risk of loss.

---

## Stack (and why)

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + Vite + Tailwind 3 + TypeScript | Fast builds, small code-split bundle, mobile-first styling |
| API | Node + Express 5 (bundled with esbuild) | One Render free service serves the API **and** the built frontend |
| Data | Supabase Postgres + Auth + Storage | Free tier that does not expire (unlike Render's free Postgres) |
| Money math | big.js (decimal) | No float drift in lot sizes or P/L |
| Validation | zod (server) + shared TS rules (client + server) | The armor check and XP are recomputed on the server; the client only previews |

Charts (Recharts) are lazy-loaded with the Hall of Records page only, so the first load stays light (~140 KB gzipped).
The AI Mentor runs on the server only and is fully optional: set `OPENROUTER_API_KEY` (any OpenRouter model) or `ANTHROPIC_API_KEY` (official `@anthropic-ai/sdk`).

## Project layout

```
shared/            Domain rules used by BOTH browser and server
  risk.ts          position size, RR, P/L, R multiple (decimal math)
  armor.ts         the pre-trade armor check
  xp.ts            XP table, level curve, ranks
  time.ts          timezone-aware "today"
  prep.ts          focus score
server/src/        Express API (writes go through here only)
  services/        risk state (HP/Shield/lockout), XP awarding, monsters
  routes/          /me, /onboarding, /account, /oath, /state, /sessions, /trades, /monsters
web/src/           React app
  theme/config.ts  ALL colors, fonts and game labels: restyle here
supabase/
  migrations/      0001 schema, 0002 RLS, 0003 storage bucket, 0004 rewards/codex/AI limiter
  seed.sql         monsters, quests, achievements, shop items
  seed_academy.sql lessons, flashcards, drills (generated)
docs/              setup, deploy, limits, test checklists
tests/             unit tests for the shared rules
```

## Security model

- The browser only ever has the **anon key** and your own login token.
- Row Level Security lets you **read** only your own rows. **All writes** go through the Express API, which validates input, re-runs the armor check, and calculates XP. It then writes using the service-role key, which stays on the server.
- XP is granted only by the `award_xp()` SQL function. Only the server can call it, and it is idempotent, so retries never double-pay.
- Screenshots go straight from the browser to a **private** Storage bucket, inside a folder named after your user ID.
- Lockouts and cooldowns are rows in the database. They survive refreshes, redeploys and server sleep.

## Local development

```bash
npm install
cp .env.example .env      # fill in your Supabase URL + keys (see docs/SUPABASE_SETUP.md)
npm run dev               # API on :3000, web on :5173 (proxying /api)
```

Open http://localhost:5173.

Other scripts:

```bash
npm test                  # unit tests for risk math, armor check, XP, timezones
npm run typecheck
npm run build && npm start   # production build, served on :3000
```

## Docs

- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Deploy to Render](docs/RENDER_DEPLOY.md)
- [Free-tier limits and what to do when they hit](docs/FREE_TIER_LIMITS.md)
- [Phase 1 test checklist](docs/TESTING_PHASE1.md)
- [Phases 2-4 test checklist](docs/TESTING_PHASE2-4.md)

## XP rules

| Earn | XP | Penalty | XP |
| --- | --- | --- | --- |
| Pre-battle prep | +10 | Trade without armor check | -30 |
| Armor check passed | +15 | Moved/removed stop | -40 |
| Logged within 10 min of close | +20 | Broke daily trade limit | -40 |
| Followed plan (win **or** loss) | +30 | Revenge trade (within 15 min of a loss) | -50 |
| Honest mistake tag | +15 | **Plan broken: the trade's total is capped at -10 XP** | |
| Disciplined Retreat (skipped setup, max 3/day) | +10 | | |
| 5 clean trades vs an active monster | +50 | | |

Level *n* needs `25·n·(n−1)` XP (L2 = 50, L5 = 500, L10 = 2,250, L20 = 9,500).
Ranks: Rookie (L1), Apprentice (L4), Scout (L7), Strategist (L10), Guardian (L14), Veteran (L18), Master Trader (L23).
Gold = 1 per 5 XP earned. Penalties never take gold away.

## Build phases

- [x] **Phase 1:** auth, schema + RLS, onboarding, account rules, Risk Forge, Battle Station, Battle Log + screenshots, Boss Arena meters + 90% lockout, monster tags, XP engine, Render deploy
- [x] **Phase 2:** dashboard polish, Campfire (30-min loss cooldown, 2-loss streak lock, breathing, reflections, Stop for today), Monster Den + trophy room, Quest Board, streaks, achievements, gold shop + real-life rewards, Hall of Records analytics + weekly/monthly reports, CSV export, delete-my-data
- [x] **Phase 3:** Training Academy (7-zone map; Zones 1-2 fully written with quiz gates, Zones 3-7 outlined), chart drills, flashcards with 1/3/7/14-day spaced repetition, glossary, lesson notes, Codex (Oath, rules earned from mistakes, playbook)
- [x] **Phase 4:** AI Mentor (ask, chart review, mistake explainer, daily briefing, debrief, pattern spotter), installable PWA, in-app + browser notifications

## Content

Academy lessons, flashcards and drills live in `scripts/academy-content.mjs`. After editing, run `npm run seed:academy` and paste the regenerated `supabase/seed_academy.sql` into the Supabase SQL editor (it is re-runnable and keeps your progress).
