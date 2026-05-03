-- 012_chef_tv_hidden.sql
-- Adds an `is_hidden` flag to `cooking_videos` so the admin library
-- curator at /admin/library can soft-hide videos that aren't quite
-- trash but shouldn't surface on Chef TV. Reversible — flip back to
-- false to restore. Different from `is_featured` (which surfaces
-- prominently on the Teach tab); is_hidden suppresses the row from
-- the public list entirely.
--
-- Idempotent: safe to re-run.

ALTER TABLE cooking_videos
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Partial index so the public Chef TV listing query (which filters
-- `is_hidden = false`) doesn't have to scan hidden rows. Most rows
-- will be visible, so the partial index on the rarer state is the
-- right shape.
CREATE INDEX IF NOT EXISTS cooking_videos_is_hidden_idx
  ON cooking_videos (is_hidden)
  WHERE is_hidden = true;
