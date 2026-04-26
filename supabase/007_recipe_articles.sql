-- Recipe Guides — the "library" surface inside Cooking School (April 2026).
--
-- Mirrors Golf's `articles` table but with a Recipe-specific topic taxonomy.
-- Articles are global content (read by all authenticated users) and are
-- written by an admin via the service role, similar to how Golf's
-- /api/generate-article populates `articles`.
--
-- The 6 topics correspond to the 6 colored sections on the /guides page:
--   knife_skills    🔪  red
--   techniques      🥘  orange
--   cooking_times   ⏱️  amber
--   pantry          🥫  emerald
--   safety          🛡️  blue
--   equipment       🧰  stone
--
-- Adding a 7th topic later requires bumping the CHECK below.
--
-- Idempotent: safe to re-run.

create table if not exists public.recipe_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  content text not null default '',
  topic text not null,
  read_time_minutes int not null default 3,
  created_at timestamptz not null default now()
);

-- Restrict topic to the 6 curated keys.
alter table public.recipe_articles
  drop constraint if exists recipe_articles_topic_check;
alter table public.recipe_articles
  add constraint recipe_articles_topic_check
  check (topic in (
    'knife_skills',
    'techniques',
    'cooking_times',
    'pantry',
    'safety',
    'equipment'
  ));

create index if not exists recipe_articles_topic_idx
  on public.recipe_articles (topic);
create index if not exists recipe_articles_created_idx
  on public.recipe_articles (created_at desc);

-- RLS: any authenticated user can read; writes go through the service role
-- (which bypasses RLS) — the app never inserts directly.
alter table public.recipe_articles enable row level security;

drop policy if exists "recipe_articles read" on public.recipe_articles;
create policy "recipe_articles read"
  on public.recipe_articles
  for select
  to authenticated
  using (true);
