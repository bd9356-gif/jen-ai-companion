-- Stores feature (Phase 1): per-user store list + shopping_list.store_id link.
-- Run this in the Supabase SQL editor. Safe to re-run.

-- 1) stores: user-scoped list of physical grocery stores the user shops at.
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  emoji text default '🛒',
  website_url text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.stores enable row level security;

-- Only the owner can read / write their own stores.
drop policy if exists "Users manage their own stores" on public.stores;
create policy "Users manage their own stores"
  on public.stores
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists stores_user_id_idx on public.stores (user_id);

-- 2) shopping_list.store_id: optional link. NULL means "Unsorted".
alter table public.shopping_list
  add column if not exists store_id uuid references public.stores(id) on delete set null;

create index if not exists shopping_list_store_id_idx on public.shopping_list (store_id);
