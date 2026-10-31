-- Phase 2-4 additions: gold shop, custom real-life rewards, playbook, AI usage limiter.

-- ---------------------------------------------------------------- profile extras
alter table public.profiles add column if not exists playbook jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists equipped jsonb not null default '{}'::jsonb; -- { "title": "...", "frame": "..." }

-- ---------------------------------------------------------------- gold shop (cosmetics only)
create table if not exists public.shop_items (
  id text primary key,
  kind text not null check (kind in ('title', 'frame', 'avatar')),
  name text not null,
  description text not null,
  value text not null,          -- the title text, frame color token, or avatar emoji
  price integer not null check (price >= 0),
  sort_order integer not null default 0
);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.shop_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

-- Real-life rewards you define yourself and buy with gold (earned only by discipline).
create table if not exists public.custom_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  cost integer not null check (cost between 1 and 100000),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.shop_items enable row level security;
revoke insert, update, delete on public.shop_items from anon, authenticated;
create policy "shop_items: read library" on public.shop_items for select to authenticated using (true);

alter table public.user_inventory enable row level security;
revoke insert, update, delete on public.user_inventory from anon, authenticated;
create policy "user_inventory: read own" on public.user_inventory for select to authenticated using ((select auth.uid()) = user_id);

alter table public.custom_rewards enable row level security;
revoke insert, update, delete on public.custom_rewards from anon, authenticated;
create policy "custom_rewards: read own" on public.custom_rewards for select to authenticated using ((select auth.uid()) = user_id);

-- Atomically spend gold. Returns the new balance, or null when there isn't enough.
create or replace function public.spend_gold(p_user uuid, p_amount integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_gold integer;
begin
  if p_amount < 0 then raise exception 'negative amount'; end if;
  update profiles set gold = gold - p_amount
   where user_id = p_user and gold >= p_amount
   returning gold into new_gold;
  return new_gold;
end $$;
revoke all on function public.spend_gold(uuid, integer) from public, anon, authenticated;
grant execute on function public.spend_gold(uuid, integer) to service_role;

-- ---------------------------------------------------------------- AI Mentor rate limit
-- Atomically consume one AI call for the day. Returns the new count, or null if the limit is reached.
create or replace function public.ai_consume(p_user uuid, p_date date, p_limit integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  insert into ai_usage (user_id, usage_date, count) values (p_user, p_date, 0)
  on conflict (user_id, usage_date) do nothing;
  update ai_usage set count = count + 1
   where user_id = p_user and usage_date = p_date and count < p_limit
   returning count into new_count;
  return new_count;
end $$;
revoke all on function public.ai_consume(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, date, integer) to service_role;

create or replace function public.ai_add_tokens(p_user uuid, p_date date, p_tokens integer)
returns void
language sql security definer set search_path = public as $$
  update ai_usage set tokens = tokens + greatest(p_tokens, 0) where user_id = p_user and usage_date = p_date;
$$;
revoke all on function public.ai_add_tokens(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.ai_add_tokens(uuid, date, integer) to service_role;

-- Codex: distinguish auto-earned rules from ones you write yourself.
alter table public.codex_rules add column if not exists source text not null default 'auto' check (source in ('auto', 'manual'));
create unique index if not exists codex_rules_monster_once on public.codex_rules(user_id, source_monster_id) where source_monster_id is not null;
