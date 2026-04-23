-- My Playbook retirement of Skills I Learned (April 2026).
--
-- The old Skills I Learned used six course-type buckets (starter, breakfast,
-- mains, sides, baking, desserts). Home cooks couldn't sort videos that way
-- cleanly — a single video often spanned several categories or was a
-- technique that didn't fit any. We're replacing the course-type buckets
-- with four intent-based buckets that match how users actually think about
-- what they save:
--
--   save    📥  Quick stash, no thinking.
--   love    ❤️  Meals you want to make.
--   cooked  👩‍🍳 What you've made.
--   learn   🎓  What you're working on.
--
-- Migration: drop the old CHECK constraint on bucket, collapse every
-- existing row to 'save' (the new "I haven't decided yet" bucket), change
-- the default from 'starter' to 'save', and install the new CHECK.
--
-- The shape of the table is otherwise unchanged — same PK, same FK, same
-- unique (user_id, item_type, item_id), same RLS. Source items still live
-- in favorites / saved_videos / saved_education_videos — this table still
-- just records the user's intent bucket.
--
-- Safe to re-run.

do $$
declare
  r record;
begin
  -- Drop any existing CHECK constraint referencing the bucket column.
  -- The original migration didn't name it explicitly, so Postgres named it
  -- cooking_skill_items_bucket_check — but we look it up by definition to
  -- be robust against future renames.
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.cooking_skill_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%bucket%'
  loop
    execute format('alter table public.cooking_skill_items drop constraint %I', r.conname);
  end loop;
end $$;

-- Collapse every old-style bucket into 'save'. Anything already on a new
-- key (rerun) is left alone.
update public.cooking_skill_items
  set bucket = 'save'
  where bucket in ('starter','breakfast','mains','sides','baking','desserts');

-- New default: 'save' (was 'starter').
alter table public.cooking_skill_items
  alter column bucket set default 'save';

-- Install the new CHECK with the four intent-based buckets.
alter table public.cooking_skill_items
  add constraint cooking_skill_items_bucket_check
  check (bucket in ('save','love','cooked','learn'));
