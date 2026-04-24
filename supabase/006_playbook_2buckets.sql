-- My Playbook collapse from 3 buckets to 2 (April 2026).
-- Save was the "I haven't decided yet" middle ground between Love (want to
-- try) and Learn (practicing). In practice Save was redundant: every Chef
-- TV video is either a recipe (→ Love) or a technique/education (→ Learn),
-- and forcing a third choice didn't add signal. Dropped in favor of a
-- single contextual save button on each Chef TV card.
--
-- Migration:
-- 1. Move every existing bucket='save' row to love/learn based on the
--    underlying item type. Recipe-bearing items go to Love; the rest go
--    to Learn.
-- 2. Drop the old CHECK (which allowed 'save').
-- 3. Add a new CHECK restricted to ('love','learn').
-- 4. Set default bucket to 'learn' (most education-first content; recipes
--    get steered to 'love' explicitly at save time by the Chef TV strip).
--
-- Idempotent: safe to re-run. The UPDATEs are no-ops once all save rows
-- have been migrated. The CHECK swap uses DROP IF EXISTS + lookup-by-def
-- so constraint-name drift doesn't break reruns.

-- Step 1a: save rows pointing at recipe-bearing content → love.
-- Recipe-bearing = favorites.type='video_recipe' OR legacy 'cooking_video'.
update public.cooking_skill_items csi
set bucket = 'love', updated_at = now()
where csi.bucket = 'save'
  and (
    csi.item_type = 'cooking_video'
    or (
      csi.item_type = 'favorite'
      and exists (
        select 1 from public.favorites f
        where f.id = csi.item_id and f.type = 'video_recipe'
      )
    )
  );

-- Step 1b: remaining save rows → learn (education-oriented or unknown).
update public.cooking_skill_items
set bucket = 'learn', updated_at = now()
where bucket = 'save';

-- Step 2: drop any existing CHECK on the bucket column (name may vary).
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.cooking_skill_items'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%bucket%'
  loop
    execute format('alter table public.cooking_skill_items drop constraint %I', c.conname);
  end loop;
end
$$;

-- Step 3: install the 2-bucket CHECK.
alter table public.cooking_skill_items
  add constraint cooking_skill_items_bucket_check
  check (bucket in ('love','learn'));

-- Step 4: default to 'learn'. New Chef TV saves always specify love or
-- learn explicitly, so the default is only a belt-and-suspenders fallback.
alter table public.cooking_skill_items
  alter column bucket set default 'learn';
