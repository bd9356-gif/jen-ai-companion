-- 015_personal_recipes_structured.sql
-- Capture timing + nutrition fields from JSON-LD Recipe schema (May 2026).
--
-- Most recipe sites embed schema.org/Recipe markup in their HTML with
-- structured fields like prepTime, cookTime, totalTime, recipeYield, and
-- a nested nutrition block (calories, proteinContent, etc.). Our existing
-- /api/import-recipe path strips JSON-LD into text and asks Claude to
-- pull title/ingredients/instructions out — but we throw away timing
-- and nutrition. These columns let us start keeping them.
--
-- All columns are nullable so existing recipes (and any imported recipe
-- where the source didn't ship JSON-LD) keep working. The Vault detail
-- view conditionally renders a "⏱ 15m prep · 30m cook · 320 cal · 5g
-- protein" pill row from whatever subset is populated.
--
-- Idempotent: safe to re-run.

alter table public.personal_recipes
  add column if not exists prep_time_minutes int,
  add column if not exists cook_time_minutes int,
  add column if not exists total_time_minutes int,
  add column if not exists calories int,
  add column if not exists protein_g numeric(6,2),
  add column if not exists carbs_g numeric(6,2),
  add column if not exists fat_g numeric(6,2);
