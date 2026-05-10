-- 018_my_picks_is_side.sql
-- Mark a Meal Plan pick as a "side" so it renders visually nested
-- under the main dish above it (May 2026, Bill's KISS workflow:
-- decide dinner mains → figure out sides → see them grouped).
--
-- A side keeps full functionality (drag, move buttons, remove, recipe
-- link) — the flag is purely visual: indented, softer styling, smaller
-- thumb. Default false so every existing pick keeps reading as a main
-- until the user explicitly demotes it.
--
-- Idempotent: safe to re-run.

alter table public.my_picks
  add column if not exists is_side boolean not null default false;
