# Supabase setup (free tier)

Takes about 10 minutes. Supabase's dashboard changes now and then, so menu names may differ slightly.

## 1. Create the project

1. Go to https://supabase.com and sign in. Click **New project**.
2. Name: `market-quest`. Set a strong **database password** and save it in a password manager.
3. Region: pick the one closest to your Render region. The default Render blueprint uses **Oregon (US West)**, so choose a US West region if you're unsure.
4. Plan: **Free**. Click **Create new project** and wait about 2 minutes.

## 2. Run the migrations

1. Open **SQL Editor**, then **New query**.
2. Paste the full contents of each file below, in this order, and click **Run** after each one:
   1. `supabase/migrations/0001_schema.sql`: tables, triggers, XP function
   2. `supabase/migrations/0002_rls.sql`: Row Level Security
   3. `supabase/migrations/0003_storage.sql`: private `screenshots` bucket and its policies
   4. `supabase/migrations/0004_rewards_codex_ai.sql`: gold shop, rewards, playbook, AI usage limiter
   5. `supabase/seed.sql`: 12 monsters, quests, achievements, shop items (safe to re-run)
   6. `supabase/seed_academy.sql`: Academy lessons, flashcards, drills (safe to re-run)
3. Each one should say **Success. No rows returned**.

Check that it worked:

- **Table Editor**: you should see `profiles`, `accounts`, `trades`, `monsters` (12 rows) and so on. Every table shows **RLS enabled**.
- **Storage**: a bucket named `screenshots` with **Public = off**.

> Using the Supabase CLI instead? Run `supabase link --project-ref <ref>` and then `supabase db push`. Run `seed.sql` separately in the SQL editor.

## 3. Configure Auth

1. **Authentication → Sign In / Providers → Email**: make sure it's enabled.
   - *Confirm email*: leave it on for safety. Since you are the only user, you can turn it off to skip the confirmation email.
2. **Authentication → URL Configuration**:
   - **Site URL**: your Render URL, e.g. `https://market-quest.onrender.com`. Use `http://localhost:5173` until you deploy.
   - **Redirect URLs**: add both `https://market-quest.onrender.com/**` and `http://localhost:5173/**`.
3. **After you've created your own account in the app**: go to **Authentication → Sign In / Providers** and turn **off "Allow new users to sign up"**. Now nobody else can register on your deployment.

## 4. Copy your keys

Go to **Project Settings → API Keys** (on older projects: **Settings → API**).

| Env var | Where to find it | Secret? |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` | No |
| `SUPABASE_ANON_KEY` | the `anon` **public** key (legacy) or the **publishable** key (`sb_publishable_...`) | No. It's meant for browsers, and RLS protects your data |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key (legacy) or a **secret** key (`sb_secret_...`) | **YES. Server only.** Never commit it or paste it into frontend code |

Put them in `.env` for local development (copy `.env.example`) and in Render's **Environment** settings for production.

## 5. How the security works (for peace of mind)

- RLS **read** policies: you can only read rows where `user_id = auth.uid()`.
- There are **no write policies** on any table. Even with your login token, the browser cannot change XP, trades, cooldowns or lockouts directly. Every change goes through the API, which validates it and calculates XP on the server.
- `award_xp()` can only be executed by `service_role`.
- Storage: you can only upload, read and delete files inside a folder named after your own user ID.
