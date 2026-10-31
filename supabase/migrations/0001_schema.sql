-- Market Quest: core schema.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.
-- Conventions: every user-owned table has user_id + created_at, timestamps are timestamptz (UTC).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Must match levelForXp() in shared/xp.ts: level n needs 25*n*(n-1) XP.
create or replace function public.level_for_xp(p_xp integer) returns integer
language sql immutable as $$
  select floor((1 + sqrt(1 + 4.0 * greatest(p_xp, 0) / 25)) / 2)::integer
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Warrior' check (char_length(display_name) between 1 and 40),
  avatar text not null default 'knight' check (char_length(avatar) <= 40),
  goal text check (char_length(goal) <= 300),
  risk_personality text check (risk_personality in ('guardian', 'balanced', 'daredevil')),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1,
  gold integer not null default 0 check (gold >= 0),
  current_streaks jsonb not null default '{}'::jsonb,
  timezone text not null default 'UTC',
  settings jsonb not null default '{}'::jsonb,
  self_assessment jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create a profile row when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- accounts (prop firm / practice)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firm_name text not null check (char_length(firm_name) between 1 and 60),
  starting_balance numeric(14,2) not null check (starting_balance > 0),
  current_balance numeric(14,2) not null,
  daily_loss_limit numeric(14,2) not null check (daily_loss_limit > 0),
  max_drawdown numeric(14,2) not null check (max_drawdown > 0),
  drawdown_mode text not null default 'static' check (drawdown_mode in ('static', 'trailing')),
  profit_target numeric(14,2) check (profit_target >= 0),
  min_trading_days integer not null default 0 check (min_trading_days >= 0),
  consistency_rule text check (char_length(consistency_rule) <= 300),
  consistency_pct numeric(5,2) check (consistency_pct > 0 and consistency_pct <= 100),
  news_rule text check (char_length(news_rule) <= 300),
  phase text not null default 'evaluation' check (phase in ('practice', 'evaluation', 'verification', 'funded')),
  max_risk_percent numeric(5,2) not null default 1 check (max_risk_percent > 0 and max_risk_percent <= 5),
  max_trades_per_day integer not null default 3 check (max_trades_per_day between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts(user_id);
create trigger accounts_updated before update on public.accounts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- Trader's Oath
create table public.oath_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  sort_order integer not null default 0,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);
create index oath_rules_user_idx on public.oath_rules(user_id, sort_order);

-- ---------------------------------------------------------------- Pre-battle prep sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  session_date date not null,
  mood text not null check (mood in ('calm', 'anxious', 'angry', 'bored', 'overconfident')),
  sleep_ok boolean not null,
  distractions boolean not null,
  news_checked boolean not null default false,
  news_notes text check (char_length(news_notes) <= 500),
  plan_pairs text[] not null default '{}',
  key_levels text check (char_length(key_levels) <= 1000),
  max_trades integer not null check (max_trades between 0 and 20),
  max_risk numeric(5,2) not null check (max_risk > 0 and max_risk <= 5),
  focus_score integer not null check (focus_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, account_id, session_date)
);

-- ---------------------------------------------------------------- trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  status text not null check (status in ('open', 'closed', 'skipped')),
  entry_mode text not null check (entry_mode in ('battle', 'logged', 'skipped')),
  pair text not null check (char_length(pair) between 1 and 20),
  instrument_type text not null default 'forex',
  direction text not null check (direction in ('long', 'short')),
  htf_trend text check (htf_trend in ('up', 'down', 'range')),
  level_type text check (level_type in ('support', 'resistance', 'trendline')),
  entry numeric(18,6) not null,
  stop_loss numeric(18,6),
  take_profit numeric(18,6),
  pip_size numeric(18,8),
  pip_value numeric(14,4),
  planned_rr numeric(8,2),
  risk_percent numeric(6,3),
  risk_amount numeric(14,2),
  lot_size numeric(10,2),
  exit_price numeric(18,6),
  pnl numeric(14,2),
  r_multiple numeric(8,2),
  opened_at timestamptz,
  closed_at timestamptz,
  logged_at timestamptz,
  emotion_before text check (emotion_before in ('calm', 'anxious', 'angry', 'bored', 'overconfident')),
  emotion_after text check (emotion_after in ('calm', 'anxious', 'angry', 'bored', 'overconfident')),
  followed_plan boolean,
  stop_moved boolean not null default false,
  armor_check_passed boolean not null default false,
  armor_report jsonb,
  screenshot_url text check (char_length(screenshot_url) <= 300),
  notes_good text check (char_length(notes_good) <= 2000),
  notes_improve text check (char_length(notes_improve) <= 2000),
  skip_reason text check (char_length(skip_reason) <= 500),
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_opened_idx on public.trades(user_id, opened_at desc);
create index trades_account_closed_idx on public.trades(account_id, closed_at);
create trigger trades_updated before update on public.trades for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- monsters (static library)
create table public.monsters (
  id text primary key,
  name text not null,
  emoji text not null default '👾',
  backstory text not null,
  signs text not null,
  fix text not null,
  drill text not null,
  defeat_condition text not null,
  sort_order integer not null default 0
);

create table public.user_monsters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monster_id text not null references public.monsters(id),
  encounter_count integer not null default 0,
  clean_trade_streak integer not null default 0,
  status text not null default 'lurking' check (status in ('lurking', 'active', 'defeated')),
  last_encounter_at timestamptz,
  defeated_at timestamptz,
  times_defeated integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, monster_id)
);

create table public.trade_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  monster_id text not null references public.monsters(id),
  source text not null default 'user' check (source in ('user', 'auto')),
  created_at timestamptz not null default now(),
  unique (trade_id, monster_id)
);
create index trade_mistakes_user_idx on public.trade_mistakes(user_id, monster_id);

-- ---------------------------------------------------------------- Training Academy
create table public.lessons (
  id text primary key,
  zone integer not null check (zone between 1 and 7),
  sort_order integer not null default 0,
  title text not null,
  content text not null,
  quiz jsonb not null default '[]'::jsonb,
  pass_mark integer not null default 80,
  est_minutes integer not null default 10,
  is_stub boolean not null default false
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'passed')),
  score integer,
  attempts integer not null default 0,
  notes text check (char_length(notes) <= 5000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- user_id null = built-in card; otherwise a personal card.
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  zone integer,
  front text not null check (char_length(front) <= 300),
  back text not null check (char_length(back) <= 1000),
  created_at timestamptz not null default now()
);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  box integer not null default 0,             -- 0..4 => intervals 1/3/7/14 days
  interval_days integer not null default 1,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, flashcard_id)
);

create table public.drills (
  id text primary key,
  zone integer not null,
  title text not null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb
);

create table public.drill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drill_id text not null references public.drills(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  answers jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Quests & achievements
create table public.quests (
  id text primary key,
  type text not null check (type in ('daily', 'weekly', 'story', 'challenge')),
  title text not null,
  description text not null,
  metric text not null,
  target integer not null default 1,
  xp_reward integer not null default 0,
  gold_reward integer not null default 0,
  sort_order integer not null default 0
);

create table public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.quests(id) on delete cascade,
  period_key text not null default 'once',   -- '2026-10-31' (daily), '2026-W44' (weekly), 'once'
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, quest_id, period_key)
);

create table public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null default '🏅',
  xp_reward integer not null default 0,
  sort_order integer not null default 0
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ---------------------------------------------------------------- XP history (audit log)
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  amount integer not null,
  gold integer not null default 0,
  ref_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events(user_id, created_at desc);
-- One award per (reason, reference): retries and double-clicks can never double-pay.
create unique index xp_events_dedupe on public.xp_events(user_id, reason, ref_id) where ref_id is not null;

-- ---------------------------------------------------------------- Reflection, Codex, cooldowns, AI usage
create table public.journal_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reflection_date date not null,
  text text not null check (char_length(text) between 1 and 5000),
  created_at timestamptz not null default now(),
  unique (user_id, reflection_date)
);

create table public.codex_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) <= 300),
  source_monster_id text references public.monsters(id),
  source_trade_id uuid references public.trades(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Lockouts and cooldowns live here so they survive page refresh and server sleep.
create table public.cooldowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reason text not null check (reason in ('daily_limit_lockout', 'drawdown_lockout', 'loss_cooldown', 'stop_for_today', 'loss_streak')),
  meta jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index cooldowns_user_active_idx on public.cooldowns(user_id, ends_at desc);

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0,
  tokens integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

-- ---------------------------------------------------------------- XP award function
-- Inserts XP events and updates the profile in ONE transaction. Only the server
-- (service_role) can call it, so the browser can never grant itself XP.
-- p_events: [{ "reason": "...", "amount": 15, "gold": 3, "ref_id": "...", "meta": {...} }]
create or replace function public.award_xp(p_user uuid, p_events jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev jsonb;
  inserted_count integer;
  applied jsonb := '[]'::jsonb;
  delta integer := 0;
  gold_delta integer := 0;
  new_xp integer;
begin
  for ev in select * from jsonb_array_elements(p_events) loop
    insert into xp_events (user_id, reason, amount, gold, ref_id, meta)
    values (p_user, ev->>'reason', (ev->>'amount')::integer, coalesce((ev->>'gold')::integer, 0), ev->>'ref_id', ev->'meta')
    on conflict (user_id, reason, ref_id) where ref_id is not null do nothing;
    get diagnostics inserted_count = row_count;
    if inserted_count > 0 then
      delta := delta + (ev->>'amount')::integer;
      gold_delta := gold_delta + greatest(coalesce((ev->>'gold')::integer, 0), 0);
      applied := applied || jsonb_build_array(ev);
    end if;
  end loop;

  update profiles
     set xp = greatest(0, xp + delta),
         gold = gold + gold_delta,
         level = level_for_xp(greatest(0, xp + delta))
   where user_id = p_user
   returning xp into new_xp;

  return jsonb_build_object('applied', applied, 'delta', delta, 'gold', gold_delta, 'xp', new_xp);
end $$;

revoke all on function public.award_xp(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, jsonb) to service_role;
