-- 014_recipe_cook_log.sql
-- Per-user, per-recipe dated cook log entries (April 2026).
--
-- Each row is one time the user cooked a recipe — what they did, who
-- liked it, what to change next time. The "card box" heritage feature:
-- a card that accumulates over time, each entry stamped with a date.
-- Real recipe boxes were never single-write surfaces; they were
-- generational — every cook added a line. This table is the database
-- shape of that ritual.
--
-- Distinct from `personal_recipes.family_notes` (the long-form "story"
-- of where a recipe came from / who in the family makes it best). The
-- family_notes block stays as-is and is NOT deprecated by this — they
-- play different roles:
--   * family_notes = the introduction (one-time write, "the story")
--   * recipe_cook_log = the running history (many writes, dated, "every time")
--
-- Idempotent: safe to re-run.

create table if not exists public.recipe_cook_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.personal_recipes(id) on delete cascade,
  entry_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- The list query reads entries for a single (user, recipe) ordered by
-- date desc — the partial composite index is the natural shape.
create index if not exists recipe_cook_log_user_recipe_idx
  on public.recipe_cook_log (user_id, recipe_id, entry_date desc, created_at desc);

alter table public.recipe_cook_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'recipe_cook_log'
      and policyname = 'recipe_cook_log_owner_all'
  ) then
    create policy recipe_cook_log_owner_all
      on public.recipe_cook_log
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
