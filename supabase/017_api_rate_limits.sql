-- 017_api_rate_limits.sql
-- Per-IP-per-minute rate limiting for AI-cost endpoints (May 2026).
--
-- Protects against runaway loops, misbehaving clients, and cheap abuse
-- of the Anthropic-backed endpoints (/api/chef, /api/topchef,
-- /api/import-recipe, /api/enhance-recipe, /api/cleanup-list). Each
-- request increments a (ip, endpoint, minute-window) counter; if the
-- counter exceeds the configured limit, the route returns 429.
--
-- Why IP-based and not user-based: auth-gating those endpoints is a
-- larger refactor. IP-based catches the common case (a stuck client
-- or a curl-spammer) without requiring every fetch call to send a
-- bearer token. Per-user limiting can be added later as a second key.
--
-- Cleanup: rows older than 1 hour are dead weight — old minute windows
-- never get accessed again. Run a daily cron via pg_cron, or just
-- ignore (the table stays small even after months: ~100 rows per
-- active user per day).
--
-- Idempotent: safe to re-run.

create table if not exists public.api_rate_limits (
  ip text not null,
  endpoint text not null,
  window_start timestamptz not null,
  request_count int not null default 0,
  primary key (ip, endpoint, window_start)
);

-- Index on window_start so periodic cleanup (delete rows where
-- window_start < now() - interval '1 hour') is fast.
create index if not exists api_rate_limits_window_idx
  on public.api_rate_limits (window_start);

-- Atomic increment-and-return RPC. Insert if (ip, endpoint, window)
-- doesn't exist; otherwise add 1. Returns the post-increment count
-- so callers can decide block-or-allow in one round-trip.
create or replace function public.increment_rate_limit(
  p_ip text,
  p_endpoint text,
  p_window timestamptz
) returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into public.api_rate_limits (ip, endpoint, window_start, request_count)
  values (p_ip, p_endpoint, p_window, 1)
  on conflict (ip, endpoint, window_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into new_count;
  return new_count;
end;
$$;

-- Service role only — the table is internal infrastructure, never
-- queried by the app's user-facing code.
alter table public.api_rate_limits enable row level security;
