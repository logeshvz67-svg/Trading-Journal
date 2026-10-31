-- Row Level Security.
-- Model: the browser only ever holds the public anon key + the user's own JWT.
--  * Users may READ their own rows (and the static game libraries).
--  * ALL writes go through the Express API, which validates input, recomputes
--    XP and armor checks, and writes with the service_role key (which bypasses RLS).
-- So even if someone pokes the Supabase REST API directly with their JWT,
-- they cannot edit XP, trades, cooldowns or lockouts.

alter table public.profiles enable row level security;
revoke insert, update, delete on public.profiles from anon, authenticated;
create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);

alter table public.accounts enable row level security;
revoke insert, update, delete on public.accounts from anon, authenticated;
create policy "accounts: read own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);

alter table public.oath_rules enable row level security;
revoke insert, update, delete on public.oath_rules from anon, authenticated;
create policy "oath_rules: read own" on public.oath_rules for select to authenticated using ((select auth.uid()) = user_id);

alter table public.sessions enable row level security;
revoke insert, update, delete on public.sessions from anon, authenticated;
create policy "sessions: read own" on public.sessions for select to authenticated using ((select auth.uid()) = user_id);

alter table public.trades enable row level security;
revoke insert, update, delete on public.trades from anon, authenticated;
create policy "trades: read own" on public.trades for select to authenticated using ((select auth.uid()) = user_id);

alter table public.user_monsters enable row level security;
revoke insert, update, delete on public.user_monsters from anon, authenticated;
create policy "user_monsters: read own" on public.user_monsters for select to authenticated using ((select auth.uid()) = user_id);

alter table public.trade_mistakes enable row level security;
revoke insert, update, delete on public.trade_mistakes from anon, authenticated;
create policy "trade_mistakes: read own" on public.trade_mistakes for select to authenticated using ((select auth.uid()) = user_id);

alter table public.lesson_progress enable row level security;
revoke insert, update, delete on public.lesson_progress from anon, authenticated;
create policy "lesson_progress: read own" on public.lesson_progress for select to authenticated using ((select auth.uid()) = user_id);

alter table public.flashcard_reviews enable row level security;
revoke insert, update, delete on public.flashcard_reviews from anon, authenticated;
create policy "flashcard_reviews: read own" on public.flashcard_reviews for select to authenticated using ((select auth.uid()) = user_id);

alter table public.drill_attempts enable row level security;
revoke insert, update, delete on public.drill_attempts from anon, authenticated;
create policy "drill_attempts: read own" on public.drill_attempts for select to authenticated using ((select auth.uid()) = user_id);

alter table public.user_quests enable row level security;
revoke insert, update, delete on public.user_quests from anon, authenticated;
create policy "user_quests: read own" on public.user_quests for select to authenticated using ((select auth.uid()) = user_id);

alter table public.user_achievements enable row level security;
revoke insert, update, delete on public.user_achievements from anon, authenticated;
create policy "user_achievements: read own" on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);

alter table public.xp_events enable row level security;
revoke insert, update, delete on public.xp_events from anon, authenticated;
create policy "xp_events: read own" on public.xp_events for select to authenticated using ((select auth.uid()) = user_id);

alter table public.journal_reflections enable row level security;
revoke insert, update, delete on public.journal_reflections from anon, authenticated;
create policy "journal_reflections: read own" on public.journal_reflections for select to authenticated using ((select auth.uid()) = user_id);

alter table public.codex_rules enable row level security;
revoke insert, update, delete on public.codex_rules from anon, authenticated;
create policy "codex_rules: read own" on public.codex_rules for select to authenticated using ((select auth.uid()) = user_id);

alter table public.cooldowns enable row level security;
revoke insert, update, delete on public.cooldowns from anon, authenticated;
create policy "cooldowns: read own" on public.cooldowns for select to authenticated using ((select auth.uid()) = user_id);

alter table public.ai_usage enable row level security;
revoke insert, update, delete on public.ai_usage from anon, authenticated;
create policy "ai_usage: read own" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

-- Built-in flashcards (user_id is null) are readable by everyone signed in.
alter table public.flashcards enable row level security;
revoke insert, update, delete on public.flashcards from anon, authenticated;
create policy "flashcards: read built-in and own" on public.flashcards for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

alter table public.monsters enable row level security;
revoke insert, update, delete on public.monsters from anon, authenticated;
create policy "monsters: read library" on public.monsters for select to authenticated using (true);

alter table public.lessons enable row level security;
revoke insert, update, delete on public.lessons from anon, authenticated;
create policy "lessons: read library" on public.lessons for select to authenticated using (true);

alter table public.drills enable row level security;
revoke insert, update, delete on public.drills from anon, authenticated;
create policy "drills: read library" on public.drills for select to authenticated using (true);

alter table public.quests enable row level security;
revoke insert, update, delete on public.quests from anon, authenticated;
create policy "quests: read library" on public.quests for select to authenticated using (true);

alter table public.achievements enable row level security;
revoke insert, update, delete on public.achievements from anon, authenticated;
create policy "achievements: read library" on public.achievements for select to authenticated using (true);
