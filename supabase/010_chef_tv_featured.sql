-- Chef TV ⭐ Featured curator (April 2026).
--
-- Adds `is_featured` on `cooking_videos` so a human (Bill) can override
-- the automatic teachScore-based top-15 slice that powers the
-- ⭐ Featured chip on Chef TV's Teach tab. Mirrors the pattern Golf
-- already uses on its `videos` table for /admin/featured.
--
-- The Chef TV page reads `is_featured = true` rows first when the
-- ⭐ Featured chip is active, then falls back to the score-slice if the
-- featured set is too thin to fill 15 slots. Curation is additive — the
-- score keeps doing its job in the background, the curator just lifts
-- chosen rows above it.
--
-- Idempotent: safe to re-run.

alter table public.cooking_videos
  add column if not exists is_featured boolean not null default false;

create index if not exists cooking_videos_is_featured_idx
  on public.cooking_videos (is_featured)
  where is_featured = true;
