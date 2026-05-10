-- 019_stores_default.sql
-- Default store flag (May 2026, Bill's ask). When a user has a
-- default store set, new shopping_list rows land with that store_id
-- instead of NULL (which falls into 📦 Unsorted). Cleanup is one
-- swipe instead of "every item starts unassigned, then I assign each."
--
-- Constraint: at most one default per user. Enforced via a partial
-- unique index instead of a CHECK + trigger — simpler, atomically
-- enforced by the index itself. To set a new default, the app
-- clears any existing default for the user FIRST, then sets the new
-- one (the index is partial so it allows zero defaults).
--
-- Idempotent: safe to re-run.

alter table public.stores
  add column if not exists is_default boolean not null default false;

-- Partial unique index so each user can have at most one default
-- store. Stores rows where is_default = false are not constrained.
create unique index if not exists stores_user_default_unique
  on public.stores (user_id)
  where is_default = true;
