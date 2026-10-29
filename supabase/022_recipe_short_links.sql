-- Short recipe links: recipe.mycompanionapps.com/r/<first 8 characters of the recipe id>
-- Looks a recipe up by the start of its id. Runs with the caller's permissions
-- (same visibility as the public share page). Idempotent — safe to re-run.

create or replace function public.recipe_by_short_code(code text)
returns table (id uuid, web_slug text, published boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.web_slug, coalesce(r.published, false)
  from personal_recipes r
  where code ~ '^[0-9a-f]{8}$'
    and r.id::text like code || '%'
    and r.deleted_at is null
  order by r.created_at
  limit 1
$$;

grant execute on function public.recipe_by_short_code(text) to anon, authenticated;
