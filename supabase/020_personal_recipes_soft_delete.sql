-- Recipe Vault soft-delete (May 2026).
--
-- WHY: Vault recipes accumulate the user's personal modifications over
-- time (adjusted ingredients, tweaked instructions, family notes, photos,
-- cook-log entries). A hard delete loses real work — an accidental tap
-- or a regretted decision later has no recovery path. iOS Notes / Gmail
-- pattern: deleted items go to a "Recently Deleted" recovery window for
-- 30 days, then auto-purge.
--
-- WHAT:
--   - Add `deleted_at timestamptz` to personal_recipes.
--   - Delete-from-Vault becomes `UPDATE ... SET deleted_at = now()`
--     instead of `DELETE`.
--   - All Vault reads filter `deleted_at IS NULL`.
--   - Settings → 🗑 Recently Deleted shows rows where deleted_at IS NOT
--     NULL, with Restore (clear deleted_at) and Delete Forever (real
--     DELETE) actions.
--   - Auto-purge: on Vault load, hard-delete rows where deleted_at is
--     older than 30 days. Best-effort cleanup, no UI.
--
-- Idempotent — safe to re-run.

ALTER TABLE personal_recipes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial index over the rare state. The main Vault list query is
-- `deleted_at IS NULL` which Postgres can satisfy from the table scan
-- without an index; the partial index here only speeds up the Settings
-- → Recently Deleted query (which lists rows where the column is set).
CREATE INDEX IF NOT EXISTS idx_personal_recipes_deleted_at
  ON personal_recipes (user_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
