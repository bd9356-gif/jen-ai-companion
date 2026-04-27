-- Recipe Vault ❤️ Favorite toggle (April 2026).
--
-- Adds `is_favorite` on `personal_recipes` so a user can flag a recipe
-- as a favorite with one tap. Lighter commitment than Meal Plan
-- (which is a multi-bucket weekly planner) — favorites are the
-- "this one's a keeper" curation list. Orthogonal to tags (which
-- categorize) and Recipe Cards (a curated card box for muscle-memory
-- recipes). A recipe can be favorited and not in Meal Plan, in Meal
-- Plan but not favorited, or both.
--
-- Surfaced on Recipe Vault as:
--   • Detail view header — toggle button next to 📅 Meal Plan
--   • List + Grid view rows — heart icon on each tile
--   • Filter chip row — ❤️ Favorites (N) chip at the front
--
-- Mirrors the simple shape of `cooking_videos.is_featured` — single
-- boolean column, no join table.
--
-- Idempotent: safe to re-run.

alter table public.personal_recipes
  add column if not exists is_favorite boolean not null default false;

create index if not exists personal_recipes_is_favorite_idx
  on public.personal_recipes (user_id, is_favorite)
  where is_favorite = true;
