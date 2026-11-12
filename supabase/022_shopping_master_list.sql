-- 022_shopping_master_list.sql
-- Shopping List redesign (Nov 2026): one reusable master grocery list.
--
-- Before: `checked` meant DONE (bought). Done items moved to a Done section and were
-- cleared away. After: every item stays on the list; `needed` says whether to buy it
-- this trip (checked in the iOS app = Need to Buy). `checked` is left exactly as it was
-- (the website's shopping list still reads it) — the iOS app now uses `needed` instead.
--
-- Existing data is kept:
--   - every row stays (nothing is deleted or merged — duplicates are offered for merging
--     later through AI Tidy, with the customer reviewing each one);
--   - an item that was still to buy (checked = false) starts as Need to Buy;
--   - an item that was already Done (checked = true) starts as not needed — an old Done
--     never turns into a new Need to Buy.
-- Store assignments (store_id = preferred store), recipe_title and stores.is_default are
-- untouched.
--
-- Safe to re-run: the one-time fill only happens when the `needed` column is first added,
-- so running this again never resets anyone's selections.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_list' and column_name = 'needed'
  ) then
    alter table public.shopping_list add column needed boolean not null default true;
    update public.shopping_list set needed = not coalesce(checked, false);
  end if;
end $$;

-- Optional note on an item ("the big bag", "Kerrygold", "2 packs").
alter table public.shopping_list
  add column if not exists notes text;
