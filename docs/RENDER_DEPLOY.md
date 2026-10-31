# Deploy to Render (free web service)

One web service runs the Express API **and** serves the built React app. No Render database is used; Render's free Postgres expires, so all data lives in Supabase.

## 0. Prerequisites

- Supabase is set up ([SUPABASE_SETUP.md](SUPABASE_SETUP.md)) and you have the 3 keys.
- This code is pushed to your GitHub repo (e.g. `logeshvz67-svg/Trading-Journal`).

## Option A: Blueprint (recommended, uses `render.yaml`)

1. Go to https://dashboard.render.com, then **New + → Blueprint**.
2. Connect GitHub and pick the repo. Render reads `render.yaml`.
3. It asks for the env vars marked `sync: false`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY`: optional. Leave blank to run without the AI Mentor; add one any time later (see below)
4. Click **Apply**. The first build takes about 3-5 minutes.

## Option B: Manual web service

**New + → Web Service** → pick the repo, then:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Instance type | **Free** |
| Health check path | `/health` (under Advanced) |

Environment variables: `NODE_VERSION=22`, `NODE_ENV=production`, plus the 3 Supabase vars above.

> `--include=dev` matters: Render sets `NODE_ENV=production`, which would otherwise skip the build tools (Vite, esbuild).

## After the first deploy

1. Copy your URL, e.g. `https://market-quest.onrender.com`.
2. In Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to that URL and add `https://market-quest.onrender.com/**` to the redirect URLs.
3. Open the URL. You'll see the **"Waking the server"** screen on a cold start, then the login page.
4. Sign up, confirm your email (if enabled), and complete onboarding.
5. Back in Supabase, **turn off new sign-ups** (see SUPABASE_SETUP step 3).

## Keep it awake with UptimeRobot (free)

Render free services sleep after about 15 minutes idle, and the next visit takes 30-60 seconds to wake. Supabase free projects pause after 7 days with no activity.

1. Sign up at https://uptimerobot.com (free plan).
2. **Add New Monitor** → type **HTTP(s)**.
3. URL: `https://market-quest.onrender.com/health/db`. This endpoint runs one tiny DB query, so it keeps **both** Render and Supabase active.
4. Interval: **5 minutes**. Save.

Render's free plan includes 750 instance-hours per month, enough to keep one service up 24/7 (~744 h). Don't keep a *second* free service awake on the same account.

## Updating

Push to `main` and Render auto-deploys (`autoDeploy: true`). Each deploy restarts the service. Nothing is lost, because all state lives in Supabase.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build fails at `vite: not found` | The build command must include `--include=dev` |
| Logs show `Missing required environment variable` | Add the env var in Render → Environment, then **Manual Deploy** |
| Login works but every API call says "session expired" | `SUPABASE_URL` or the keys belong to a different project. Re-copy all 3 |
| Email confirmation link opens localhost | Set the Site URL in Supabase to your Render URL |
| Screenshot upload fails | Run `0003_storage.sql` and check that the `screenshots` bucket exists |

## Turning on the AI Mentor (optional)

### With OpenRouter (recommended if you already use it)

1. At https://openrouter.ai, go to **Keys** and create a key. Add a few dollars of credit, and set a credit limit on the key.
2. In Render → your service → **Environment**, set `OPENROUTER_API_KEY` to that key.
3. `OPENROUTER_MODEL` defaults to the **free NVIDIA Nemotron** models: `nvidia/nemotron-nano-12b-v2-vl:free,nvidia/nemotron-nano-9b-v2:free`. A comma-separated list is a fallback chain; put a vision model first for chart reviews. If OpenRouter renames a model, copy the new id from https://openrouter.ai/models (search "nemotron", filter "free").
   Free models have daily request caps on OpenRouter (higher once you've added a little credit). If the Mentor says it's busy, wait a minute.
4. Save; Render redeploys. If both keys are set, OpenRouter is used.

### With Anthropic directly

1. Create an API key at https://console.anthropic.com (Settings → API Keys) and add a small monthly spend limit there.
2. In Render → your service → **Environment**, set `ANTHROPIC_API_KEY`. The defaults are already set: `AI_MODEL=claude-opus-5-5`, `AI_DAILY_LIMIT=20` calls per user per day, and `AI_MAX_TOKENS=1500` per reply.
3. Save; Render redeploys. The Mentor page now shows "x/20 questions used today".

Cost control: each call is capped by `AI_MAX_TOKENS`, runs at low effort, and the daily limit is enforced atomically in the database (table `ai_usage`), so it survives restarts. To spend less, lower `AI_DAILY_LIMIT` or switch `AI_MODEL` to a cheaper model such as `claude-sonnet-5-5` or `claude-haiku-5-5`. Requests use server-side fallback (`fallbacks: "default"`), so if a request is declined it is automatically retried on a fallback model.
