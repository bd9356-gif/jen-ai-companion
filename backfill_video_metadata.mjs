// Backfill Chef TV video_metadata.ingredients for videos that came in
// without a recipe. Runs the same transcript-aware extraction the
// /api/import-recipe route uses (title + channel + description + full
// transcript via youtube-transcript), so the AI has way more raw
// material than the bulk-ingestion description-only pass had.
//
// ESM module (`.mjs`) because youtube-transcript@1.x ships as ESM-only
// and its `.common.js` bundle has packaging quirks that crash from CJS.
// dotenv has a clean ESM entry point so the conversion is straightforward.
//
// Usage:
//   node backfill_video_metadata.mjs [--limit N] [--dry-run] [--video-id ID]
//
// Env vars (loaded from .env.local automatically):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ANTHROPIC_API_KEY
//   YOUTUBE_API_KEY

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// youtube-transcript@1.3.0's package.json is busted — it sets
// `"type": "module"` AND points "main" at a CommonJS file, so Node tries
// to load that .common.js as ESM and crashes. The "module" field
// correctly points at the ESM build, but Node 24 doesn't honor it for
// bare specifiers (only bundlers do). Import the ESM build path
// directly to sidestep the broken main entry.
import * as YT_NS from 'youtube-transcript/dist/youtube-transcript.esm.js'
const YoutubeTranscript =
  YT_NS.YoutubeTranscript ||
  YT_NS.default?.YoutubeTranscript ||
  YT_NS.default ||
  YT_NS

// ── ENV ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const YT_KEY = process.env.YOUTUBE_API_KEY
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_KEY, YT_KEY })) {
  if (!v) { console.error(`❌ Missing env var: ${k}`); process.exit(1) }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

// ── ARGS ─────────────────────────────────────────────────────
const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const next = args[i + 1]
  if (next === undefined || next.startsWith('--')) return true
  return next
}
const DRY_RUN = arg('--dry-run', false) === true
const LIMIT = parseInt(arg('--limit', '0')) || 0
const VIDEO_ID = arg('--video-id', null)

console.log(`🎬 Chef TV metadata backfill ${DRY_RUN ? '(DRY RUN)' : ''}`)
console.log(`   Model: ${MODEL}`)
if (LIMIT) console.log(`   Limit: ${LIMIT} videos`)
if (VIDEO_ID && VIDEO_ID !== true) console.log(`   Single video: ${VIDEO_ID}`)
console.log('')

// ── HELPERS ──────────────────────────────────────────────────
async function fetchYouTubeContent(youtubeId) {
  const metaRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${youtubeId}&key=${YT_KEY}`
  )
  if (!metaRes.ok) throw new Error(`YouTube API ${metaRes.status}`)
  const metaJson = await metaRes.json()
  const snippet = metaJson.items?.[0]?.snippet
  if (!snippet) throw new Error('Video not found or private')

  const { title, channelTitle, description } = snippet

  let transcript = ''
  try {
    const chunks = await YoutubeTranscript.fetchTranscript(youtubeId)
    transcript = chunks.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    // No captions — description-only is fine, that's what bulk ingestion had.
  }

  return {
    title, channelTitle, description: description || '',
    transcript,
    hasTranscript: transcript.length > 0,
  }
}

function buildPrompt({ title, channelTitle, description, transcript }) {
  const content = [
    `Video title: ${title}`,
    `Channel: ${channelTitle}`,
    '',
    'Video description:',
    description || '(none)',
    '',
    'Transcript:',
    transcript || '(no transcript available)',
  ].join('\n').substring(0, 12000)

  return `Extract the recipe from this YouTube cooking video. Use everything you can see — the description AND the transcript. The host is talking through the recipe; pull what they actually cook, not the intro/outro/sponsor reads.

Content:
${content}

Rules:
- "ingredients" entries: "measure" is the quantity and unit (e.g. "2 cups", "1 large", "to taste"); "name" is just the ingredient name. If a quantity is only spoken vaguely ("a couple cloves"), reflect that in "measure".
- "instructions" MUST use a real newline (\\n) between every step. If the host runs steps together, split them so each step is on its own line.
- "ai_summary" is one short sentence (max ~25 words) describing the dish.
- If the video is not a recipe (vlog, restaurant tour, equipment review, gear video), return: {"no_recipe": true}

Respond with ONLY a valid JSON object, no markdown, no backticks:
{
  "ingredients": [{"name": "ingredient name", "measure": "amount and unit"}],
  "instructions": "Step 1\\nStep 2\\nStep 3",
  "ai_summary": "One short sentence describing the dish."
}

If you cannot identify a clear recipe, return exactly: {"no_recipe": true}`
}

function extractFirstJsonObject(src) {
  const start = src.indexOf('{')
  if (start === -1) return null
  let depth = 0, inString = false, escape = false
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (inString) {
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  return null
}

async function extractRecipeWithAI(youtubeContent) {
  const prompt = buildPrompt(youtubeContent)
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = message.content[0].text.trim().replace(/```json|```/g, '').trim()
  const jsonStr = extractFirstJsonObject(text)
  if (!jsonStr) throw new Error('No JSON in AI response')
  return JSON.parse(jsonStr)
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  let videosQuery = supabase
    .from('cooking_videos')
    .select('id, youtube_id, title, channel')
    .order('view_count', { ascending: false })

  if (VIDEO_ID && VIDEO_ID !== true) {
    videosQuery = videosQuery.eq('id', VIDEO_ID)
  }

  const [{ data: videos, error: vErr }, { data: existing, error: mErr }] = await Promise.all([
    videosQuery,
    supabase.from('video_metadata').select('video_id, ingredients'),
  ])

  if (vErr) { console.error('❌ cooking_videos query failed:', vErr.message); process.exit(1) }
  if (mErr) { console.error('❌ video_metadata query failed:', mErr.message); process.exit(1) }

  const metaMap = new Map()
  for (const m of (existing || [])) metaMap.set(m.video_id, m)

  const candidates = (videos || []).filter(v => {
    const m = metaMap.get(v.id)
    if (!m) return true
    if (!m.ingredients) return true
    if (Array.isArray(m.ingredients) && m.ingredients.length === 0) return true
    return false
  })

  console.log(`📊 Total cooking videos: ${(videos || []).length}`)
  console.log(`📊 Already have ingredients: ${(videos || []).length - candidates.length}`)
  console.log(`📊 Candidates to backfill: ${candidates.length}`)
  console.log('')

  const toProcess = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates
  let okWithRecipe = 0, okNoRecipe = 0, errored = 0

  for (let i = 0; i < toProcess.length; i++) {
    const v = toProcess[i]
    const prefix = `[${i + 1}/${toProcess.length}]`
    process.stdout.write(`${prefix} ${v.title.substring(0, 60).padEnd(62)} `)

    try {
      const yt = await fetchYouTubeContent(v.youtube_id)
      if (!yt.hasTranscript && (yt.description || '').length < 200) {
        console.log('⏭  skip (no transcript, thin description)')
        continue
      }
      const recipe = await extractRecipeWithAI(yt)

      if (recipe.no_recipe) {
        console.log('⏭  no recipe (vlog/equipment/etc)')
        okNoRecipe++
        continue
      }

      const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
      if (!hasIngredients) {
        console.log('⏭  no ingredients in AI output')
        continue
      }

      if (!DRY_RUN) {
        const { error: upErr } = await supabase.from('video_metadata').upsert({
          video_id: v.id,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions || '',
          ai_summary: recipe.ai_summary || '',
        }, { onConflict: 'video_id' })
        if (upErr) throw new Error(`upsert: ${upErr.message}`)
      }

      console.log(`✓ ${recipe.ingredients.length} ingredients ${DRY_RUN ? '(dry)' : ''}`)
      okWithRecipe++
    } catch (err) {
      console.log(`✗ ${err.message}`)
      errored++
    }

    await new Promise(r => setTimeout(r, 250))
  }

  console.log('')
  console.log('🏁 Done.')
  console.log(`   ✓ Recipe extracted: ${okWithRecipe}`)
  console.log(`   ⏭  No recipe (skipped): ${okNoRecipe}`)
  console.log(`   ✗ Errored: ${errored}`)
  if (DRY_RUN) console.log('   (Dry run — nothing was written.)')
}

main().catch(err => {
  console.error('❌ Fatal:', err.message)
  process.exit(1)
})
