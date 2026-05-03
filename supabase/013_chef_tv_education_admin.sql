-- 013_chef_tv_education_admin.sql
-- Mirrors the admin curator columns (is_featured, is_hidden) onto
-- education_videos so the /admin/library curator can manage every
-- video that surfaces on Chef TV — not just the cooking_videos rows.
-- Bill's framing: the videos are like books in a school library,
-- quality matters; can't have a curator that only sees half the
-- shelves.
--
-- Idempotent: safe to re-run.

ALTER TABLE education_videos
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE education_videos
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Partial indexes on the rarer state — most rows will be unfeatured
-- and visible, so a partial index on the rare = true case is the
-- right shape for the public Chef TV listing query.
CREATE INDEX IF NOT EXISTS education_videos_is_featured_idx
  ON education_videos (is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS education_videos_is_hidden_idx
  ON education_videos (is_hidden)
  WHERE is_hidden = true;
