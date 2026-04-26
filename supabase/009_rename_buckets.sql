-- My Playbook bucket rename from love/learn → practice/teach (April 2026).
--
-- Vocabulary pivot driven by Bill: "Love is the wrong word — it means
-- favorites/saved/liked/emotion. Should be Practice. Also order should
-- be Learn - Practice and change Learn to Teach."
--
-- The rename is conceptual, not structural — same two buckets, new names:
--   love  → practice  (recipes you want to cook / practice making)
--   learn → teach     (videos that teach you a technique)
--
-- The two words now read as the teaching loop end-to-end: Chef Jennifer
-- teaches → user practices. Same vocabulary across Chef Jennifer's mode
-- pills, Chef TV's filter tabs, and Playbook's saved buckets.
--
-- Migration order matters — the existing CHECK only permits love/learn,
-- so it has to come off BEFORE the UPDATEs:
-- 1. Drop the old CHECK on bucket (name may vary across environments).
-- 2. UPDATE existing rows: 'love' → 'practice', 'learn' → 'teach'.
-- 3. Add a new CHECK restricted to ('practice','teach').
-- 4. Change default from 'learn' to 'teach'.
--
-- Idempotent: safe to re-run. The constraint-drop loop is name-agnostic
-- (matches any CHECK whose definition mentions "bucket"), and the
-- UPDATEs are no-ops after the first run.

-- Step 1: drop any existing CHECK on the bucket column (name may vary).
-- Has to happen before the UPDATEs — the old constraint rejects 'practice'
-- and 'teach' as values.
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

-- Step 2: rename the values on existing rows. Now safe — no CHECK in place.
update public.cooking_skill_items
set bucket = 'practice', updated_at = now()
where bucket = 'love';

update public.cooking_skill_items
set bucket = 'teach', updated_at = now()
where bucket = 'learn';

-- Step 3: install the new CHECK.
alter table public.cooking_skill_items
  add constraint cooking_skill_items_bucket_check
  check (bucket in ('practice','teach'));

-- Step 4: default to 'teach' (matches the new ordering — Teach first).
alter table public.cooking_skill_items
  alter column bucket set default 'teach';
