-- Skills I Learned bucket assignments (Phase 2B).
-- One row per (user, item) placing that saved item into one of six fixed buckets.
-- Source items live in saved_videos / saved_education_videos / favorites — this
-- table does NOT own the save, it just records which bucket the user has moved
-- the item into. Items without a row here render under 📥 The Starter by default.
--
-- Buckets (locked — no rename / reorder / delete, mirroring Golf's MyBag):
--   starter    (📥 The Starter)
--   breakfast  (🍳)
--   mains      (🍽️)
--   sides      (🥕 Sides & Veg)
--   baking     (🥖)
--   desserts   (🍰)
--
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.cooking_skill_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  item_type text not null check (item_type in ('cooking_video','education_video','favorite')),
  item_id uuid not null,
  bucket text not null default 'starter'
    check (bucket in ('starter','breakfast','mains','sides','baking','desserts')),
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, item_type, item_id)
);

alter table public.cooking_skill_items enable row level security;

drop policy if exists "Users manage their own cooking_skill_items" on public.cooking_skill_items;
create policy "Users manage their own cooking_skill_items"
  on public.cooking_skill_items
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists cooking_skill_items_user_bucket_idx
  on public.cooking_skill_items (user_id, bucket);
