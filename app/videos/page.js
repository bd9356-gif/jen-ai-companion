'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import UnifiedVideoPlayer from '@/components/UnifiedVideoPlayer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// My Playbook buckets — 2 intent-based placements for a Chef TV save.
// Framing: Teach = technique you want to learn; Practice = recipe you
// want to cook. Every Chef TV video is one or the other — video-only
// items are Teach-eligible, recipe videos are Practice-eligible.
//
// The Chef TV card only shows ONE of these buttons, picked by whether the
// video has a recipe. No "Save for later" middle ground — the old third
// bucket (Save) was dropped April 2026 (see migration 006) because forcing
// a non-committal choice didn't add any real signal. The vocabulary pivot
// from Love/Learn to Practice/Teach landed in migration 009 (April 2026):
// Love was the wrong word — it implied favorites/saved/liked/emotion. The
// new words name the *action* the user takes with each save.
//
// Practice is also the bucket that triggers the loved_recipe_urls
// ingestion capture when the underlying video has ingredients — see
// setBucket(). The table name is kept (internal-only signal capture, no
// user-visible reference).
const PLAYBOOK_BUCKETS = {
  teach:    { key: 'teach',    emoji: '🎓', label: 'Teach',    activeCls: 'bg-sky-500 text-white border-sky-500' },
  practice: { key: 'practice', emoji: '🍳', label: 'Practice', activeCls: 'bg-orange-500 text-white border-orange-500' },
}

// Topic chips for the Practice tab — dish-type thinking, keyword-matched
// against the video title. One chip active at a time; "All" = no filter.
// Keywords are hand-tuned; refine as we learn what titles look like.
const PRACTICE_CHIPS = [
  { key: 'featured', label: '⭐ Featured', feature: true },
  { key: 'all',    label: 'All' },
  { key: 'pasta',  label: '🍝 Pasta',  match: /pasta|spaghetti|linguine|fettuccine|ravioli|lasagna|macaroni|noodle|carbonara|bolognese|risotto|gnocchi/i },
  { key: 'pizza',  label: '🍕 Pizza',  match: /pizza|calzone/i },
  { key: 'salad',  label: '🥗 Salad',  match: /salad|slaw/i },
  { key: 'soup',   label: '🍲 Soup',   match: /soup|stew|chili|chowder|ramen|pho|broth/i },
  { key: 'meat',    label: '🥩 Meat',    match: /\b(steak|beef|burger|brisket|pork|lamb|meatball|ribs|bbq|smoked|short rib|chuck|sirloin|tenderloin|veal)\b/i },
  { key: 'chicken', label: '🍗 Chicken', match: /\b(chicken|turkey|duck|poultry|wings?|drumsticks?|thighs?)\b/i },
  { key: 'fish',    label: '🐟 Fish',    match: /\b(fish|salmon|tuna|shrimp|prawn|scallop|seafood|crab|lobster|cod|halibut|tilapia|sardine|mussel|clam|oyster)\b/i },
  { key: 'bread',  label: '🍞 Bread',  match: /bread|focaccia|sourdough|baguette|brioche|rolls?|buns?|loaf/i },
  { key: 'sweet',  label: '🍰 Sweet',  match: /cake|cookie|pie|tart|brownie|dessert|cheesecake|chocolate|ice cream|pudding|mousse|muffin|scone|cinnamon roll|donut/i },
]

// Topic chips for the Teach tab — technique-first thinking. 'featured'
// is a special bucket (not a keyword) that shows the top 15 by teachScore
// so a newcomer lands on "what's good" instead of "what's next." Default
// chip on the Teach tab.
const TEACH_CHIPS = [
  { key: 'featured', label: '⭐ Featured', feature: true },
  { key: 'all',      label: 'All' },
  { key: 'knife',    label: '🔪 Knife',   match: /knife|cut|chop|dice|slice|mince|julienne/i },
  { key: 'eggs',     label: '🥚 Eggs',    match: /\begg\b|eggs|omelet|omelette|scramble|frittata|quiche|poach/i },
  { key: 'meat',     label: '🥩 Meat',    match: /\b(steak|beef|pork|lamb|butcher|brine|sear|roast|braise|smoke)\b/i },
  { key: 'chicken',  label: '🍗 Chicken', match: /\b(chicken|turkey|duck|poultry|wings?|drumsticks?|thighs?)\b/i },
  { key: 'baking',   label: '🍞 Baking',  match: /bak(e|ed|ing)|bread|cake|cookie|pie|dough|flour|yeast|sourdough|pastry/i },
  { key: 'season',   label: '🧂 Season',  match: /salt|season|spice|herb|marinade|flavor|umami|sauce/i },
  { key: 'basics',   label: '📚 Basics',  match: /how to|basics|beginner|fundamentals|essential|must know|mistake|tip/i },
]

// (FEATURED_CAP retired April 2026 — Featured chip now shows ONLY
// is_featured rows with no auto-fill cap.)

// Teaching-weighted channels — technique/method/craft heavy. Used by
// teachScore() below to float instructional content up the Teach tab.
// This is a reorder signal, not exclusion — every channel still shows up,
// teaching-heavy ones just lead.
const TEACHING_CHANNELS = new Set([
  'Ethan Chlebowski',
  'Brian Lagerstrom',
  "America's Test Kitchen",
  'Serious Eats',
  'Food Wishes',
  'Adam Ragusea',
  'Pro Home Cooks',
  'Internet Shaquille',
])

// Sort score for the Teach tab (video-only). log10(views) compresses the
// long tail so a 10× view count is worth +1, not 10×; teaching channels
// get a 1.5× multiplier so craft beats clicks.
function teachScore(v) {
  const base = Math.log10((v.view_count || 0) + 1)
  const teachBoost = TEACHING_CHANNELS.has(v.channel) ? 1.5 : 1.0
  return base * teachBoost
}

// Sort score for the Practice tab (recipe-bearing). Same log-compressed
// view base, but multipliers favor recipe completeness — full ingredients
// + instructions + AI summary floats to the top; bare-bones recipes sink.
function practiceScore(v, meta) {
  const base = Math.log10((v.view_count || 0) + 1)
  const hasFullRecipe = (meta?.ingredients?.length > 0) && !!meta?.instructions
  const hasSummary = !!meta?.ai_summary
  const completeness = (hasFullRecipe ? 1.3 : 1.0) * (hasSummary ? 1.15 : 1.0)
  return base * completeness
}

function isShort(duration) {
  if (!duration) return true
  const parts = duration.split(':')
  if (parts.length === 2) return parseInt(parts[0]) < 3
  return false
}

function viewCount(n) {
  if (!n) return ''
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M views`
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K views`
  return `${n} views`
}

// Tolerant parser for recipe instructions — handles arrays, newline-separated
// strings, and legacy single-line "1. foo 2. bar" blobs. Mirrors the Chef
// Jennifer fix.
function parseInstructions(raw) {
  if (!raw) return []
  let parts = []
  if (Array.isArray(raw)) {
    parts = raw.map(String)
  } else if (typeof raw === 'string') {
    const s = raw.trim()
    if (s.includes('\n')) {
      parts = s.split('\n')
    } else if (/\s\d+[\.\)]\s/.test(s)) {
      parts = s.split(/\s(?=\d+[\.\)]\s)/)
    } else {
      parts = [s]
    }
  }
  return parts
    .map(p => String(p).trim().replace(/^\s*\d+[\.\)]\s*/, ''))
    .filter(Boolean)
}

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="w-full bg-gray-200" style={{height:'192px'}} />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  )
}

export default function VideosPage() {
  const [user, setUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  // savedMap: video.id (string ref_id) → { favId, bucket }.
  // favId is the favorites row UUID (for deletes + bucket upserts).
  // bucket is the current Playbook bucket ('teach' | 'practice').
  // Absence from this map = video is not saved at all.
  const [savedMap, setSavedMap] = useState(new Map())
  // Set of video.id strings that have been copied into Recipe Vault this
  // session (via "Save to My Kitchen"). Resets on refresh — re-saving is
  // harmless, just creates another Vault row.
  const [vaultIds, setVaultIds] = useState(new Set())
  // Active topic chip. Meaning depends on the current tab:
  //   teach    → one of TEACH_CHIPS keys (default 'featured')
  //   practice → one of PRACTICE_CHIPS keys (default 'all')
  // When the tab flips, we reset topic to the tab's sensible default.
  const [topic, setTopic] = useState('featured')
  // (Search retired April 2026 — Bill found the magnifying-glass toggle
  // on Chef TV unnecessary; the Teach/Practice tabs + topic chips
  // already narrow the list enough.)
  // About toggle — matches the 🔍 search pattern. When open, reveals the
  // teaching card at the top of main (Teach / Practice / save
  // destinations). Default hidden so the page isn't cluttered for
  // returning users; discoverable via the ℹ️ button in the header.
  const [showAbout, setShowAbout] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [metadata, setMetadata] = useState({})
  // Pagination — 20 per page with Previous / Next controls. Page is
  // 0-indexed in state; the render shows "Page N of M" 1-indexed.
  // Resets to 0 whenever the user changes tab / topic chip so they
  // never end up on an empty page.
  const PAGE_SIZE = 20
  const [page, setPage] = useState(0)
  // Default to 'teach' — Teach leads in the new Teach → Practice ordering
  // (matches the Cooking School framing: techniques teach you, recipes
  // are where you practice them). User can flip to 'practice' for
  // recipes. No "All" tab; the two tabs together cover every video (a
  // video either has a recipe or it doesn't).
  const [filter, setFilter] = useState('teach')  // teach | practice
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadVideos()
      loadSaved(session.user.id)
    })
  }, [])

  async function loadVideos() {
    // is_hidden=false on both tables — admin curator at /admin/library
    // soft-hides videos in either source; they stay in the DB but
    // disappear from the public list. is_hidden was added to
    // education_videos in migration 013 (April 2026).
    const [{ data: cooking }, { data: education }] = await Promise.all([
      supabase.from('cooking_videos').select('*').eq('is_hidden', false).order('view_count', { ascending: false }),
      supabase.from('education_videos').select('*').eq('is_hidden', false).order('view_count', { ascending: false }),
    ])
    const allVideos = [
      ...(cooking || []).map(v => ({ ...v, _source: 'cooking' })),
      ...(education || []).map(v => ({ ...v, _source: 'education' })),
    ].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    setVideos(allVideos)
    setLoading(false)
    const cookingIds = (cooking || []).map(v => v.id)
    const educationIds = (education || []).map(v => v.id)
    const [{ data: cookingMeta }, { data: educationMeta }] = await Promise.all([
      supabase.from('video_metadata').select('*').in('video_id', cookingIds.length ? cookingIds : ['none']),
      supabase.from('education_video_metadata').select('*').in('video_id', educationIds.length ? educationIds : ['none']),
    ])
    const map = {}
    ;(cookingMeta || []).forEach(m => { map[m.video_id] = m })
    ;(educationMeta || []).forEach(m => { map[m.video_id] = m })
    allVideos.forEach(v => { if (map[v.id] === undefined) map[v.id] = null })
    setMetadata(map)
  }

  async function loadSaved(userId) {
    // Load favorites first (video-only types), then join cooking_skill_items
    // via the favorites UUID to find each save's current Playbook bucket.
    // Videos not in cooking_skill_items default to 'teach' (matches the
    // 'teach' default on the column itself per migration 009).
    const { data: favs } = await supabase
      .from('favorites')
      .select('id, ref_id')
      .eq('user_id', userId)
      .eq('is_in_vault', false)
      .in('type', ['video_recipe', 'video_education'])
    const favIds = (favs || []).map(f => f.id)
    const { data: bucketRows } = favIds.length
      ? await supabase
          .from('cooking_skill_items')
          .select('item_id, bucket')
          .eq('user_id', userId)
          .eq('item_type', 'favorite')
          .in('item_id', favIds)
      : { data: [] }
    const bucketByFavId = new Map((bucketRows || []).map(r => [r.item_id, r.bucket]))
    const next = new Map()
    for (const f of (favs || [])) {
      next.set(f.ref_id, { favId: f.id, bucket: bucketByFavId.get(f.id) || 'teach' })
    }
    setSavedMap(next)
  }

  // Tap a bucket on a video. Three cases:
  //   1. Video not saved       → insert favorites + cooking_skill_items(bucket)
  //   2. Video in same bucket  → remove (delete favorites + cooking_skill_items)
  //   3. Video in other bucket → upsert cooking_skill_items to new bucket
  //
  // Practice + recipe side-effect: when the target bucket is 'practice'
  // AND the video has a recipe, we also log the YouTube URL into
  // loved_recipe_urls (ingestion signal). Moving away from practice cleans
  // that row up. Pure backend capture — no user-facing surface for this
  // table. The table name is legacy from the Love/Learn era; the meaning
  // is the same (which recipes are resonating).
  async function setBucket(video, bucket) {
    if (!user) return
    const videoId = String(video.id)
    const current = savedMap.get(videoId)
    const meta = metadata[video.id]
    const hasRecipe = meta?.ingredients?.length > 0

    if (current && current.bucket === bucket) {
      // Case 2: toggle off
      await supabase.from('favorites').delete().eq('id', current.favId)
      await supabase.from('cooking_skill_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', 'favorite')
        .eq('item_id', current.favId)
      // favorites delete cascades to loved_recipe_urls via FK, but be
      // explicit for clarity.
      if (current.bucket === 'practice') {
        await supabase.from('loved_recipe_urls')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_id', current.favId)
      }
      setSavedMap(prev => { const n = new Map(prev); n.delete(videoId); return n })
      return
    }

    if (current) {
      // Case 3: move between buckets
      const { error } = await supabase.from('cooking_skill_items').upsert({
        user_id: user.id,
        item_type: 'favorite',
        item_id: current.favId,
        bucket,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,item_type,item_id' })
      if (error) return
      // Practice queue sync
      if (bucket === 'practice' && hasRecipe) {
        await supabase.from('loved_recipe_urls').upsert({
          user_id: user.id,
          favorite_id: current.favId,
          video_id: videoId,
          youtube_id: video.youtube_id,
          youtube_url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
          title: video.title,
          channel: video.channel,
        }, { onConflict: 'user_id,favorite_id' })
      } else if (current.bucket === 'practice') {
        await supabase.from('loved_recipe_urls')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_id', current.favId)
      }
      setSavedMap(prev => {
        const n = new Map(prev)
        n.set(videoId, { ...current, bucket })
        return n
      })
      return
    }

    // Case 1: first save — insert both rows
    const { data: inserted, error: favErr } = await supabase.from('favorites').insert({
      user_id: user.id,
      type: hasRecipe ? 'video_recipe' : 'video_education',
      ref_id: videoId,
      title: video.title,
      thumbnail_url: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
      source: hasRecipe ? 'chef' : 'education',
      metadata: {
        channel: video.channel,
        duration: video.duration,
        youtube_id: video.youtube_id,
        ingredients: meta?.ingredients || [],
        instructions: meta?.instructions || '',
        ai_summary: meta?.ai_summary || '',
      }
    }).select('id').single()
    if (favErr || !inserted) return
    await supabase.from('cooking_skill_items').insert({
      user_id: user.id,
      item_type: 'favorite',
      item_id: inserted.id,
      bucket,
    })
    if (bucket === 'practice' && hasRecipe) {
      await supabase.from('loved_recipe_urls').insert({
        user_id: user.id,
        favorite_id: inserted.id,
        video_id: videoId,
        youtube_id: video.youtube_id,
        youtube_url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
        title: video.title,
        channel: video.channel,
      })
    }
    setSavedMap(prev => {
      const n = new Map(prev)
      n.set(videoId, { favId: inserted.id, bucket })
      return n
    })
  }

  // "Save to My Kitchen" — copy this Chef TV recipe into the user's
  // personal Recipe Vault. Under MOVE semantics (May 2026), the Vault is
  // the home — if the video was sitting in My Playbook (Teach or Practice)
  // before this save, it leaves the notebook on save. The user's notebook
  // stays an inbox of "still to deal with" items, not a parallel archive.
  // Vault delete is permanent — see AGENTS.md "Notebook delete semantics".
  async function saveToKitchen(video) {
    if (!user) return
    const meta = metadata[video.id]
    if (!meta?.ingredients?.length) return
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: video.title,
      description: meta.ai_summary || '',
      ingredients: meta.ingredients,
      instructions: meta.instructions || '',
      category: '',
      // Source-stamping tag so the user can one-tap filter their Vault
      // (and Cards) down to "show me everything I pulled from Chef TV".
      // Mirrors the family_notes attribution but in a structured field
      // so the filter pulldown can group it under "Source".
      tags: ['chef-tv'],
      family_notes: `Saved from Chef TV — ${video.channel}.`,
      photo_url: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
      difficulty: '',
      servings: null,
    })
    if (error) { showToast('Could not save to Kitchen'); return }
    setVaultIds(prev => new Set(prev).add(String(video.id)))
    // MOVE: clean up Playbook placement so this video leaves the
    // notebook entirely. Best-effort — a Playbook cleanup failure
    // shouldn't undo the Vault save the user just made. The cleanup
    // covers: cooking_skill_items (bucket placement) + saved_videos
    // (legacy save row), so the video stops appearing in Teach/Practice.
    removeFromPlaybook(video).catch(() => {})
    showToast('Saved to Recipe Vault ✓')
  }

  // Helper: drop a video out of Playbook entirely. Used by saveToKitchen
  // under MOVE semantics — the Vault is the new home, so the notebook
  // doesn't keep a copy. Two save paths exist on this page:
  //
  //   1. MODERN (Teach/Practice button) — INSERTs into favorites with
  //      ref_id=video.id and a cooking_skill_items row keyed on
  //      item_type='favorite' AND item_id=favorites.id.
  //   2. LEGACY (pre-favorites era) — INSERTs into saved_videos, with
  //      cooking_skill_items.item_type='cooking_video' AND item_id=video.id.
  //
  // Earlier version of this helper only cleaned LEGACY rows, so MODERN
  // saves leaked orphan favorites + cooking_skill_items rows when the
  // user tapped Save to My Kitchen — the Practice button on subsequent
  // visits then saw the orphans and got stuck in a stale toggled state.
  // This handles both paths (May 2026 fix).
  async function removeFromPlaybook(video) {
    if (!user) return
    const videoId = String(video.id)
    const current = savedMap.get(videoId)
    // MODERN path — delete by favorites.id. FK cascade on
    // loved_recipe_urls clears the ingestion-signal row automatically.
    if (current?.favId) {
      await supabase.from('cooking_skill_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', 'favorite')
        .eq('item_id', current.favId)
      await supabase.from('favorites').delete().eq('id', current.favId)
    }
    // LEGACY path — separate save table + cooking_video item_type.
    // Safe to run unconditionally; deletes 0 rows if not legacy.
    await supabase.from('cooking_skill_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', 'cooking_video')
      .eq('item_id', video.id)
    await supabase.from('saved_videos')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', video.id)
    // Clear the in-memory state so the Practice button on this page
    // reflects the new "not saved" state immediately — without this,
    // the button would still read "Saved to Practice" until the user
    // refreshed the page even though the DB row is gone.
    setSavedMap(prev => {
      const n = new Map(prev)
      n.delete(videoId)
      return n
    })
  }

  function toggleExpand(videoId) {
    setExpandedId(expandedId === videoId ? null : videoId)
  }


  // Figure out the active chip set for the current tab. Teach and
  // Practice each have their own shortlist.
  const chipSet = filter === 'practice' ? PRACTICE_CHIPS : TEACH_CHIPS
  const activeChip = chipSet?.find(c => c.key === topic) || null

  // Filters stack: search + teach/practice + topic chip keyword match,
  // all AND together. Shorts (under 3 min) are always excluded — no
  // toggle.
  //
  // Sort strategy varies by tab so each view highlights its best content:
  //   teach    → teachScore (teaching-channel boost × popularity)
  //   practice → practiceScore (recipe completeness × popularity)
  //
  // Featured chip (both tabs): strictly is_featured only — the curator's
  // picks, no fillers. Curator rows go to /admin/featured (or
  // /admin/library) → flips cooking_videos.is_featured.
  const afterFilter = videos
    .filter(v => {
      const meta = metadata[v.id]
      const hasRecipe = meta?.ingredients?.length > 0
      const matchFilter = (filter === 'practice' && hasRecipe) || (filter === 'teach' && !hasRecipe)
      const matchShorts = !isShort(v.duration)
      // Topic chip filter — matches against the title first, and on
      // Practice videos ALSO scans the recipe's ingredients list. Title
      // can be vague ("Crispy Wings 3 Ways") but the ingredients almost
      // always name the protein ("chicken wings, paprika, ..."), so the
      // ingredients pass catches videos the title alone misses.
      const matchTopic = !activeChip?.match || (() => {
        if (activeChip.match.test(v.title)) return true
        if (filter === 'practice' && Array.isArray(meta?.ingredients) && meta.ingredients.length > 0) {
          const ingredientText = meta.ingredients
            .map(i => `${i?.name || ''} ${i?.measure || ''}`)
            .join(' ')
          if (activeChip.match.test(ingredientText)) return true
        }
        return false
      })()
      return matchFilter && matchShorts && matchTopic
    })
    .sort((a, b) => {
      // Featured videos always lead, regardless of tab or topic chip.
      // Within featured (and within not-featured), the tab-specific
      // score takes over so the rest of the list stays meaningful.
      if (!!a.is_featured !== !!b.is_featured) return a.is_featured ? -1 : 1
      if (filter === 'practice') return practiceScore(b, metadata[b.id]) - practiceScore(a, metadata[a.id])
      return teachScore(b) - teachScore(a)
    })
  let filtered = afterFilter
  // Featured chip — strictly is_featured only. Earlier the chip used a
  // featured-first-then-fill pattern that padded with the auto top-by-score
  // slice when there weren't yet enough curator picks; that turned the chip
  // into a "best of" view instead of a curator-only view, so users couldn't
  // see at a glance what had actually been featured. Now Featured = exactly
  // the videos the curator picked, nothing more.
  if (activeChip?.feature) {
    filtered = afterFilter.filter(v => v.is_featured)
  }

  // Used by the ℹ️ About panel — total real (non-Shorts) videos in the
  // library so visitors can see the catalog size at a glance.
  const totalNonShort = videos.filter(v => !isShort(v.duration)).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  function goToPage(p) {
    const next = Math.max(0, Math.min(p, totalPages - 1))
    setPage(next)
    // Scroll the user back to the top of the list so they can see the
    // first row of the new page instead of staying parked mid-list.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
          {/* Header row — back + title on the left, the Teach/Practice
              "classroom" toggle inline on the right (mirrors Chef
              Jennifer's mode pill exactly), and the ℹ️/🔍 utility
              buttons on the far right. The toggle's segmented-control
              styling reads as switching from one classroom room to the
              other (Teach ↔ Practice), not as a filter on a list.
              Back button is just "←" (no "Back" word) and utility
              buttons are smaller w-8 — the full-word back + larger
              buttons clipped the title on iPhone (the toggle pushes
              content left, leaving only ~40px for the title cluster
              before things slid off the left edge). Same compact
              pattern Chef Jennifer's header uses. */}
          {/* Two-row header (May 2026, Bill's ask — single row was
              too crowded on phone). Row 1: ← back / 📘 Playbook /
              👨‍🍳 cross-link / title-with-subtitle / ℹ️ About.
              Row 2: full-width mode pill row centered (Teach /
              Practice). Same pattern Chef Jennifer's header uses. */}
          {/* Two-row header (May 2026, Bill's ask).
              Row 1: centered title with subtitle — alone so it has
                     full breathing room and never truncates.
              Row 2: nav buttons left / mode pill row + ℹ️ About right. */}
          {/* Row 1 — title alone, centered, full width */}
          <div className="text-center leading-none pb-1">
            <h1 className="text-base font-bold text-gray-900 leading-tight">🎬 Chef TV&rsquo;s</h1>
            <p className="text-xs font-semibold italic text-orange-600 leading-tight mt-0.5">Classroom</p>
          </div>
          {/* Row 2 — nav left, mode pills + About right */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => window.location.href='/kitchen'}
                aria-label="Back to MyKitchen"
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 shrink-0 px-1"
              >
                ← Back
              </button>
              <button
                onClick={() => window.location.href='/playbook'}
                title="Open My Playbook"
                aria-label="Open My Playbook"
                className="shrink-0 text-base font-semibold text-gray-600 border border-gray-200 rounded-lg px-2 py-0.5 hover:border-orange-300 hover:text-orange-700"
              >
                📘
              </button>
              <button
                onClick={() => window.location.href='/chef'}
                title="Open Chef Jennifer's Classroom"
                aria-label="Open Chef Jennifer's Classroom"
                className="shrink-0 text-base font-semibold text-gray-600 border border-gray-200 rounded-lg px-2 py-0.5 hover:border-orange-300 hover:text-orange-700"
              >
                👨‍🍳
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
                <button
                  onClick={() => { setFilter('teach'); setPage(0); setTopic('featured') }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filter === 'teach' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎓 Teach
                </button>
                <button
                  onClick={() => { setFilter('practice'); setPage(0); setTopic('featured') }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filter === 'practice' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🍳 Practice
                </button>
              </div>
              <button
                onClick={() => setShowAbout(s => !s)}
                aria-label={showAbout ? 'Close about' : 'About Chef TV'}
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  showAbout
                    ? 'bg-orange-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700'
                }`}
              >
                {showAbout ? '✕' : 'ℹ️'}
              </button>
            </div>
          </div>

          {/* Mode-aware lede — reinforces the "two rooms" framing of the
              header toggle. The question changes based on which room
              the user is in (Teach = video room, Practice = recipe
              room) and the subline tells them what to do here and
              where their saves end up. Replaces the old generic lede
              ("Watch the latest cooking videos…") which didn't reflect
              the room context. */}
          {/* Centered headline + subline — the "room you're in" framing.
              Question changes with the tab (Teach asks what to learn,
              Practice asks what to cook); color matches the tab so the
              eye reads the room from across the page. Matches the
              Vault / Cards hero rhythm — title-as-question on its own
              centered line with a quieter subtitle below. */}
          <div className="text-center mb-4">
            <h2 className={`text-xl sm:text-2xl font-bold leading-tight ${filter === 'teach' ? 'text-sky-700' : 'text-orange-700'}`}>
              {filter === 'teach' ? 'What are you ready to learn today?' : 'What should we cook today?'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-snug mt-1.5">
              {filter === 'teach'
                ? 'Your Chef learning videos are here — watch and choose what helps you, then head to 🍳 Practice for your homework.'
                : 'Your Chef recipes and cooking videos go here — watch, choose, and save what helps you.'}
            </p>
          </div>


          {/* Topic chips — techniques for Teach, dish-types for Practice.
              Horizontally scrollable on narrow viewports. Active chip uses
              the tab's color (sky for Teach, orange for Practice);
              inactive chips are white with a gray border.
              Channel dropdown was removed in favor of this; the search
              input already matches channel text, so chef-specific queries
              still work via 🔍. */}
          {chipSet && (
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {chipSet.map(c => {
                const isActive = topic === c.key
                const activeCls = filter === 'practice'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-sky-500 text-white border-sky-500'
                return (
                  <button
                    key={c.key}
                    onClick={() => { setTopic(c.key); setPage(0) }}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      isActive ? activeCls : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-700'
                    }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* Teaching card — names the two lanes and what saving does.
                Gated on the ℹ️ About toggle in the header so the page is
                clean by default for returning users; new users tap ℹ️ for
                orientation. Mirrors the explainer callout pattern at the
                top of /playbook but on-demand. */}
            {showAbout && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 space-y-1.5">
                <p className="text-sm text-amber-900 leading-relaxed">
                  🎓 <span className="font-semibold">Teach</span> highlights techniques to master.
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  🍳 <span className="font-semibold">Practice</span> highlights recipes to cook.
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  Save videos to <span className="font-semibold">My Playbook</span>, or 👉See Detail to save a recipe.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-4">
              {filtered.length} video{filtered.length === 1 ? '' : 's'} · {totalNonShort} from top YouTube channels
            </p>

            {filtered.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm font-semibold text-gray-700">No videos match these filters.</p>
                <p className="text-xs text-gray-500 mt-1">Try a different topic or clear your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visible.map(video => {
                  const meta = metadata[video.id]
                  const isExpanded = expandedId === video.id
                  const hasRecipe = meta?.ingredients?.length > 0
                  const videoId = String(video.id)
                  const savedEntry = savedMap.get(videoId)  // { favId, bucket } | undefined
                  const isInVault = vaultIds.has(videoId)
                  const steps = parseInstructions(meta?.instructions)
                  return (
                    <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 hover:shadow-sm transition-all">
                      {playingId === video.id ? (
                        <UnifiedVideoPlayer key={video.youtube_id} url={`https://www.youtube.com/watch?v=${video.youtube_id}`} onClose={() => setPlayingId(null)} />
                      ) : (
                        <button onClick={() => setPlayingId(video.id)} className="w-full relative block group">
                          <img loading="lazy" decoding="async" src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.title} className="w-full object-cover" style={{height:'192px'}} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/55 transition-colors flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5" fill="#dc2626"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                          {video.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[11px] px-2 py-0.5 rounded-md font-semibold">{video.duration}</div>
                          )}
                        </button>
                      )}
                      <div className="p-4">
                        {/* Single contextual save button — Practice for
                            recipe-bearing videos, Teach for video-only items.
                            Tap once to save, tap again to remove. No third
                            "Save for later" bucket (dropped April 2026) — the
                            choice is binary because the content is binary. */}
                        {(() => {
                          const b = hasRecipe ? PLAYBOOK_BUCKETS.practice : PLAYBOOK_BUCKETS.teach
                          const isActive = savedEntry?.bucket === b.key
                          return (
                            <div className="mb-3">
                              <button
                                onClick={() => setBucket(video, b.key)}
                                title={isActive ? `Remove from Playbook (${b.label})` : `Save to Playbook (${b.label})`}
                                aria-label={isActive ? `Remove from Playbook` : `Save to Playbook`}
                                className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border transition-colors ${
                                  isActive
                                    ? b.activeCls
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-700'
                                }`}
                              >
                                <span className="text-sm leading-none">{b.emoji}</span>
                                <span>{isActive ? 'Saved to Playbook' : 'Save to Playbook'}</span>
                              </button>
                            </div>
                          )
                        })()}
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
                          {video.is_featured && (
                            <span className="text-amber-500 mr-1" title="Featured by curator">⭐</span>
                          )}
                          {video.title}
                        </h3>
                        <p className="text-xs text-orange-600 font-medium">{video.channel}</p>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">{viewCount(video.view_count)}</p>
                        {/* Credit link → drives the user back to the creator's
                            YouTube channel. This is part of the "we're helping
                            them" positioning: every save-to-vault also keeps
                            the creator one tap away. */}
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.channel)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-orange-700 mb-3"
                          title={`Visit ${video.channel}'s channel on YouTube`}
                        >
                          ↗ More from {video.channel} on YouTube
                        </a>
                        <div className="flex items-center flex-wrap gap-2">
                          <button onClick={() => toggleExpand(video.id)} className="text-xs text-orange-600 font-semibold hover:text-orange-800">
                            {isExpanded ? 'Hide details ▲' : 'See details ▼'}
                          </button>
                          {hasRecipe && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">🍳 Recipe</span>
                          )}
                          {!hasRecipe && meta !== undefined && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-200">📝 Video only</span>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            {!meta ? (
                              <p className="text-sm text-gray-500 italic">No details available.</p>
                            ) : (
                              <>
                                {meta.ai_summary && (
                                  <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About this video</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{meta.ai_summary}</p>
                                  </div>
                                )}
                                {hasRecipe && (
                                  <>
                                    <div className="mb-4">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredients</p>
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <ul className="space-y-1">
                                          {meta.ingredients.map((ing, i) => (
                                            <li key={i} className="flex gap-2 text-sm">
                                              <span className="text-amber-700 shrink-0">•</span>
                                              <span className="text-gray-800">
                                                {ing.measure && <span className="font-semibold text-gray-900">{ing.measure} </span>}
                                                {ing.name}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                    {steps.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Instructions</p>
                                        <div className="space-y-2">
                                          {steps.map((step, i) => (
                                            <div key={i} className="flex gap-3">
                                              <div className="shrink-0 w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                                              <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Save to My Kitchen — only inside the Recipe view,
                                        only on recipe-bearing videos. Education-first:
                                        user has to look at the recipe before being
                                        offered to pull it into their Vault. */}
                                    <div className="mt-5 pt-4 border-t border-gray-100">
                                      <button
                                        onClick={() => saveToKitchen(video)}
                                        disabled={isInVault}
                                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                          isInVault
                                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                            : 'bg-orange-600 text-white hover:bg-orange-700'
                                        }`}
                                      >
                                        {isInVault ? '✓ Saved to My Kitchen' : '💾 Save to My Kitchen'}
                                      </button>
                                      <p className="text-xs text-gray-500 text-center mt-2">
                                        Adds to your Recipe Vault.
                                      </p>
                                    </div>
                                  </>
                                )}
                                {!hasRecipe && !meta.ai_summary && (
                                  <p className="text-sm text-gray-500 italic">No details available.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination — Previous / Page X of Y / Next. Hidden when
                everything fits on one page. Buttons disable at the
                edges. Page change scrolls the list to the top so the
                user always sees row #1 of the new page. */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 0}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages - 1}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
