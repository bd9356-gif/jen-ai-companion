-- Loved recipe URL capture (April 2026).
--
-- When a user drops a Chef TV video into the ❤️ Love bucket AND that video
-- has a recipe (video_metadata.ingredients not empty), we log the YouTube
-- URL here as a signal to the ingestion pipeline. The intent is
-- curation-facing, not user-facing: lets us see which recipes are
-- resonating with home cooks and feed that back into the curated pool
-- (better metadata, featured picks, etc.).
--
-- The table is idempotent per (user_id, favorite_id): loving the same
-- video twice yields one row; unloving deletes it; re-loving re-inserts.
-- favorite_id points at favorites.id so we can correlate with the user's
-- save and clean up on delete cascade.
--
-- Safe to re-run.

create table if not exists public.loved_recipe_urls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_id uuid not null references public.favorites(id) on delete cascade,
  video_id text not null,
  youtube_id text not null,
  youtube_url text not null,
  title text,
  channel text,
  created_at timestamptz not null default now(),
  unique (user_id, favorite_id)
);

create index if not exists loved_recipe_urls_user_idx
  on public.loved_recipe_urls(user_id);

create index if not exists loved_recipe_urls_created_idx
  on public.loved_recipe_urls(created_at desc);

alter table public.loved_recipe_urls enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'loved_recipe_urls'
      and policyname = 'loved_recipe_urls_owner_all'
  ) then
    create policy loved_recipe_urls_owner_all
      on public.loved_recipe_urls
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
