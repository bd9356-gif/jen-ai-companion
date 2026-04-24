-- My Playbook collapse from 4 buckets to 3 (April 2026).
--
-- After shipping save/love/cooked/learn we realized Cooked overlapped too
-- much with Love and Learn — "I cooked this" could mean "I loved it" or
-- "I'm still working on it." Bill's framing: *see → try → improve* maps
-- cleanly to Save → Love → Learn. Three buckets, three steps, three taps.
--
--   save   📥  Quick stash, no thinking.  (see)
--   love   ❤️  Meals you want to make.    (try)
--   learn  🎓  What you're working on.    (improve)
--
-- Migration: drop the existing CHECK, collapse every 'cooked' row into
-- 'save' (new users won't have any; the bucket was only live for a few
-- hours), install the new CHECK.
--
-- Safe to re-run.

do $$
declare
  r record;
begin
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

-- Collapse 'cooked' rows into 'save'. Anything already on a valid key
-- (rerun) is untouched.
update public.cooking_skill_items
  set bucket = 'save'
  where bucket = 'cooked';

alter table public.cooking_skill_items
  alter column bucket set default 'save';

alter table public.cooking_skill_items
  add constraint cooking_skill_items_bucket_check
  check (bucket in ('save','love','learn'));
