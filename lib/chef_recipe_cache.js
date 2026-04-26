/* ─────────────────────────────────────────────────────────────
   lib/chef_recipe_cache.js — DB-first recipe lookup for /chef
   Practice mode (Stage 2 of the chef_recipes corpus mining).

   Every Practice tap already INSERTs into chef_recipes, so the
   table is a free corpus of proven recipes that grows on its
   own. Before generating a new recipe from scratch, we try to
   find an existing row that matches the user's request and pass
   it to the model as a base to adapt. The model riffs on the
   structure instead of inventing one — output is more consistent
   and the recipe space gets richer over time as the corpus fills.

   Stage 1 added times_served / last_served_at counters.
   Stage 2 (this file) wires the lookup + adapt path.
   Stage 3 (later) will add a "hot row" threshold so highly-served
   rows are returned with no AI call at all — the real cost win.
   ─────────────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js'

// Stopword list mirrors lib/library_search.js (keep in sync if
// either drifts) plus a few recipe-prompt noise words. We keep
// "dinner", "weeknight", "cozy", etc. — they're real signal.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'should', 'would', 'will',
  'what', 'how', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those',
  'and', 'or', 'but', 'not', 'than', 'then', 'also', 'some', 'any',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'their',
  'to', 'of', 'for', 'in', 'on', 'at', 'with', 'by', 'from', 'as', 'about', 'if',
  'recipe', 'recipes', 'cook', 'cooking', 'make', 'made', 'use', 'using',
  'create', 'something', 'level', 'home', 'cooks', 'cook',
])

function extractKeywords(query) {
  if (!query || typeof query !== 'string') return []
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
  return Array.from(new Set(tokens)).slice(0, 6)
}

// Find the best-matching existing recipe in chef_recipes, or null.
// Matching: keyword OR over title + description + ai_prompt, scored
// title 3× / ai_prompt 2× / description 1×. Cuisine is filtered
// only when the caller specified a non-generic value. Top 5 by
// score are picked from at random, so the same prompt twice
// doesn't always hand back the identical row.
export async function findCachedRecipe(prompt, cuisine) {
  const keywords = extractKeywords(prompt)
  if (keywords.length === 0) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // PostgREST OR pattern over the searchable fields. Escape commas
  // and parens defensively even though the keyword filter strips
  // most punctuation.
  const fields = ['title', 'description', 'ai_prompt']
  const orParts = []
  fields.forEach(f => {
    keywords.forEach(k => {
      const safe = k.replace(/[,()]/g, '')
      if (safe) orParts.push(`${f}.ilike.%${safe}%`)
    })
  })
  if (orParts.length === 0) return null

  let q = supabase
    .from('chef_recipes')
    .select('*')
    .or(orParts.join(','))
    .order('times_served', { ascending: true, nullsFirst: true })
    .limit(20)

  // Filter by cuisine when the caller specified a real one.
  // "International" is the route's default fallback — treat it
  // as "no cuisine filter" so cache lookups still hit on prompts
  // that didn't specify a cuisine.
  if (cuisine && cuisine.trim() && cuisine !== 'International') {
    q = q.eq('cuisine', cuisine)
  }

  const { data, error } = await q
  if (error || !data || data.length === 0) return null

  // JS-side scoring. ai_prompt is weighted between title and
  // description because it's literally "what was asked", and a
  // new prompt's keywords overlap most cleanly with the old one.
  const scored = data
    .map(r => {
      const t = (r.title || '').toLowerCase()
      const d = (r.description || '').toLowerCase()
      const p = (r.ai_prompt || '').toLowerCase()
      let s = 0
      keywords.forEach(k => {
        if (t.includes(k)) s += 3
        if (p.includes(k)) s += 2
        if (d.includes(k)) s += 1
      })
      return { ...r, _score: s }
    })
    .filter(r => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)

  if (scored.length === 0) return null

  // Random pick from top 5 — Stage 3 will replace this with
  // per-user "seen" filtering once we add a saved-impressions
  // column.
  return scored[Math.floor(Math.random() * scored.length)]
}

// Bump the times_served counter and last_served_at timestamp.
// Best-effort — a bookkeeping failure shouldn't surface to the
// user. Stage 1's migration set both columns with sensible
// defaults so this update is always valid.
export async function bumpServeCount(supabase, recipeId, currentCount) {
  try {
    await supabase
      .from('chef_recipes')
      .update({
        times_served: (currentCount || 1) + 1,
        last_served_at: new Date().toISOString(),
      })
      .eq('id', recipeId)
  } catch (e) {
    // swallow — bookkeeping, not critical path
  }
}
