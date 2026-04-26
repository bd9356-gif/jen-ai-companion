/* ─────────────────────────────────────────────────────────────
   lib/library_search.js — Phase 2B library awareness for Chef
   Jennifer's 🎓 Learn mode.

   Runs a keyword search across three content sources every time
   the user asks something in Learn mode, and returns the top
   matches from each so /api/chef can pass them to Claude as
   citation candidates.

     1. recipe_articles   — global Guides Library (📚)
     2. cooking_videos    — Chef TV (🎬), with video_metadata
                            joined for the ai_summary blurb
     3. personal_recipes  — the user's own Recipe Vault (🔐),
                            scoped by user_id

   v1 uses Postgres `ilike` matching — no extension, no FTS,
   no migration. We oversample (8 candidates per source) and
   then rank in JS by counting keyword hits, weighting title
   matches more than body matches. Top 3 of each source are
   returned. FTS (`to_tsvector` + GIN) is the upgrade path
   when the v1 ranking starts to feel coarse.

   Citations themselves live in /api/chef + /chef/page.js — the
   route turns these results into a "LIBRARY CONTEXT" block for
   Claude with stable {cite:type:id} tokens, and the page parses
   those tokens out of the reply and renders them as clickable
   📚 / 🎬 / 🔐 chips inline with the answer.
   ─────────────────────────────────────────────────────────── */
import { supabase } from './supabase'

// Common stopwords + a few cooking-noise words that don't help
// narrow a search ("recipe", "cook", "make"). Kept short on
// purpose — too aggressive a filter strips real terms like
// "rice" or "soup". Lowercase, length >= 3.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'should', 'would', 'will',
  'what', 'how', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those',
  'and', 'or', 'but', 'not', 'than', 'then', 'also', 'some', 'any',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'their',
  'to', 'of', 'for', 'in', 'on', 'at', 'with', 'by', 'from', 'as', 'about', 'if',
  'recipe', 'recipes', 'cook', 'cooking', 'make', 'made', 'use', 'using',
])

function extractKeywords(query) {
  if (!query || typeof query !== 'string') return []
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
  // Dedupe + cap. 6 keywords keeps the OR pattern tight without
  // exploding the SQL into dozens of clauses.
  return Array.from(new Set(tokens)).slice(0, 6)
}

// Build a Supabase `.or(...)` filter string of "field.ilike.%kw%"
// pairs across all (field, keyword) combos.
function orPattern(fields, keywords) {
  const parts = []
  fields.forEach(f => {
    keywords.forEach(k => {
      // Escape commas + parens in keywords so we don't break the
      // PostgREST OR grammar. Stopword/length filters already
      // dropped most punctuation; this is belt-and-suspenders.
      const safe = k.replace(/[,()]/g, '')
      if (safe) parts.push(`${f}.ilike.%${safe}%`)
    })
  })
  return parts.join(',')
}

// Score an item by counting keyword hits across weighted fields.
// Title hits weigh 3x body hits — a "Knife Skills" article should
// beat a recipe that mentions "knife" once in its description.
function scoreItem(item, keywords, weighted) {
  let s = 0
  weighted.forEach(({ name, weight }) => {
    const val = (item[name] || '').toString().toLowerCase()
    if (!val) return
    keywords.forEach(k => {
      if (val.includes(k)) s += weight
    })
  })
  return s
}

export async function searchLibrary(query, userId) {
  const keywords = extractKeywords(query)
  if (keywords.length === 0) {
    return { articles: [], videos: [], recipes: [] }
  }

  // Articles — search title + summary; small enough to index both.
  const articlesP = supabase
    .from('recipe_articles')
    .select('id, title, summary, topic')
    .or(orPattern(['title', 'summary'], keywords))
    .limit(8)

  // Cooking videos — search title only (channel is too noisy as a
  // keyword target). Pull video_metadata.ai_summary via implicit
  // join so we can show the model a snippet to ground its citation.
  const videosP = supabase
    .from('cooking_videos')
    .select('id, title, channel, youtube_id, video_metadata(ai_summary)')
    .or(orPattern(['title'], keywords))
    .limit(8)

  // Personal recipes — title + description, scoped to this user
  // (RLS would scope it anyway, but the explicit filter keeps the
  // query plan tight). Skip ingredients/instructions/family_notes
  // for v1: jsonb fan-out is awkward, and notes are long-form.
  const recipesP = userId
    ? supabase
        .from('personal_recipes')
        .select('id, title, description')
        .eq('user_id', userId)
        .or(orPattern(['title', 'description'], keywords))
        .limit(8)
    : Promise.resolve({ data: [] })

  const [articlesR, videosR, recipesR] = await Promise.all([articlesP, videosP, recipesP])

  // Articles
  const articles = (articlesR.data || [])
    .map(it => ({
      ...it,
      _score: scoreItem(it, keywords, [
        { name: 'title', weight: 3 },
        { name: 'summary', weight: 1 },
      ]),
    }))
    .filter(it => it._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)

  // Videos — flatten ai_summary off the joined record. Supabase
  // returns the joined row as either an object or a single-element
  // array depending on the cardinality; handle both.
  const videos = (videosR.data || [])
    .map(it => ({
      id: it.id,
      title: it.title,
      channel: it.channel,
      youtube_id: it.youtube_id,
      ai_summary:
        (Array.isArray(it.video_metadata)
          ? it.video_metadata[0]?.ai_summary
          : it.video_metadata?.ai_summary) || null,
    }))
    .map(it => ({
      ...it,
      _score: scoreItem(it, keywords, [
        { name: 'title', weight: 3 },
        { name: 'channel', weight: 1 },
        { name: 'ai_summary', weight: 1 },
      ]),
    }))
    .filter(it => it._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)

  // Recipes
  const recipes = (recipesR.data || [])
    .map(it => ({
      ...it,
      _score: scoreItem(it, keywords, [
        { name: 'title', weight: 3 },
        { name: 'description', weight: 1 },
      ]),
    }))
    .filter(it => it._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)

  return { articles, videos, recipes }
}
