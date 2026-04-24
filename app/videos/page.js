'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import UnifiedVideoPlayer from '@/components/UnifiedVideoPlayer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// My Playbook buckets — 3 intent-based placements for a Chef TV save.
// Tapping a bucket on an unsaved video inserts favorites + cooking_skill_items;
// tapping the same bucket again removes both; tapping a different bucket
// updates the bucket in place. Matches /playbook exactly. Full Tailwind
// class literals per bucket (JIT requirement).
//
// Framing: see → try → improve. Save = stash, Love = want to try, Learn =
// practicing. Love is the one that captures a recipe URL for ingestion
// (when the video has a recipe) — see setBucket() below.
const PLAYBOOK_BUCKETS = [
  { key: 'save',  emoji: '📥', label: 'Save',  activeCls: 'bg-slate-600 text-white border-slate-600' },
  { key: 'love',  emoji: '❤️', label: 'Love',  activeCls: 'bg-rose-500 text-white border-rose-500' },
  { key: 'learn', emoji: '🎓', label: 'Learn', activeCls: 'bg-sky-500 text-white border-sky-500' },
]

const CHANNELS = [
  'All Channels',
  'Chef Jean-Pierre', 'Jamie Oliver', 'Binging with Babish', 'Joshua Weissman',
  'Gordon Ramsay', 'Ethan Chlebowski', 'Brian Lagerstrom', 'Adam Ragusea',
  'Pro Home Cooks', 'Internet Shaquille', 'Italia Squisita',
  "Natasha's Kitchen", 'Preppy Kitchen', 'Inspired Taste',
  'Tasty', "America's Test Kitchen", 'Serious Eats', 'Food Wishes',
]

// Teaching-weighted channels — technique/method/craft heavy. Used by
// learnScore() below to float instructional content up the Learn tab.
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

// Sort score for the Learn tab (video-only). log10(views) compresses the
// long tail so a 10× view count is worth +1, not 10×; teaching channels
// get a 1.5× multiplier so craft beats clicks.
function learnScore(v) {
  const base = Math.log10((v.view_count || 0) + 1)
  const teachBoost = TEACHING_CHANNELS.has(v.channel) ? 1.5 : 1.0
  return base * teachBoost
}

// Sort score for the Love tab (recipe-bearing). Same log-compressed view
// base, but multipliers favor recipe completeness — full ingredients +
// instructions + AI summary floats to the top; bare-bones recipes sink.
function loveScore(v, meta) {
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
  // bucket is the current Playbook bucket (save/love/learn).
  // Absence from this map = video is not saved at all.
  const [savedMap, setSavedMap] = useState(new Map())
  // Set of video.id strings that have been copied into Recipe Vault this
  // session (via "Save to My Kitchen"). Resets on refresh — re-saving is
  // harmless, just creates another Vault row.
  const [vaultIds, setVaultIds] = useState(new Set())
  const [channel, setChannel] = useState('All Channels')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [showCount, setShowCount] = useState(12)
  // Default to 'love' — surface the ~158 recipes first so the actionable
  // set isn't drowned out by the ~400 video-only items. User can flip to
  // 'learn' for technique or 'all' for the full firehose.
  const [filter, setFilter] = useState('love')  // love | learn | all
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
    const [{ data: cooking }, { data: education }] = await Promise.all([
      supabase.from('cooking_videos').select('*').order('view_count', { ascending: false }),
      supabase.from('education_videos').select('*').order('view_count', { ascending: false }),
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
    // Videos not in cooking_skill_items default to 'save'.
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
      next.set(f.ref_id, { favId: f.id, bucket: bucketByFavId.get(f.id) || 'save' })
    }
    setSavedMap(next)
  }

  // Tap a bucket on a video. Three cases:
  //   1. Video not saved       → insert favorites + cooking_skill_items(bucket)
  //   2. Video in same bucket  → remove (delete favorites + cooking_skill_items)
  //   3. Video in other bucket → upsert cooking_skill_items to new bucket
  //
  // Love + recipe side-effect: when the target bucket is 'love' AND the
  // video has a recipe, we also log the YouTube URL into loved_recipe_urls
  // (ingestion signal). Moving away from love cleans that row up. Pure
  // backend capture — no user-facing surface for this table.
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
      if (current.bucket === 'love') {
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
      // Love queue sync
      if (bucket === 'love' && hasRecipe) {
        await supabase.from('loved_recipe_urls').upsert({
          user_id: user.id,
          favorite_id: current.favId,
          video_id: videoId,
          youtube_id: video.youtube_id,
          youtube_url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
          title: video.title,
          channel: video.channel,
        }, { onConflict: 'user_id,favorite_id' })
      } else if (current.bucket === 'love') {
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
    if (bucket === 'love' && hasRecipe) {
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

  // Idempotent: make sure this video sits in ❤️ Love, regardless of where
  // (or whether) it was saved before. Used as a side-effect of Save to My
  // Kitchen — saving a recipe to the Vault means the user wants to try it,
  // and Love is the "meals I want to try" bucket. No-op if already in Love.
  // Unlike setBucket(), this never toggles off — it only ensures the Love
  // placement. Writes the loved_recipe_urls capture row when the video has
  // a recipe (same semantics as setBucket's Love path).
  async function ensureInLove(video) {
    if (!user) return
    const videoId = String(video.id)
    const current = savedMap.get(videoId)
    const meta = metadata[video.id]
    const hasRecipe = meta?.ingredients?.length > 0
    if (current?.bucket === 'love') return

    async function writeLovedUrl(favId) {
      if (!hasRecipe) return
      await supabase.from('loved_recipe_urls').upsert({
        user_id: user.id,
        favorite_id: favId,
        video_id: videoId,
        youtube_id: video.youtube_id,
        youtube_url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
        title: video.title,
        channel: video.channel,
      }, { onConflict: 'user_id,favorite_id' })
    }

    if (current) {
      // Move to Love
      const { error } = await supabase.from('cooking_skill_items').upsert({
        user_id: user.id,
        item_type: 'favorite',
        item_id: current.favId,
        bucket: 'love',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,item_type,item_id' })
      if (error) return
      await writeLovedUrl(current.favId)
      setSavedMap(prev => {
        const n = new Map(prev)
        n.set(videoId, { ...current, bucket: 'love' })
        return n
      })
      return
    }

    // First save — insert favorites + cooking_skill_items in Love
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
      bucket: 'love',
    })
    await writeLovedUrl(inserted.id)
    setSavedMap(prev => {
      const n = new Map(prev)
      n.set(videoId, { favId: inserted.id, bucket: 'love' })
      return n
    })
  }

  // "Save to My Kitchen" — copy this Chef TV recipe into the user's
  // personal Recipe Vault AND place the underlying video in ❤️ Love in My
  // Playbook. Saving a recipe to the Vault implies the user wants to try
  // it, and Love is "meals I want to try" — keeping the placement
  // automatic reinforces the education loop (see → try → improve) without
  // asking the user to tap twice. Only shown in the expanded Recipe view
  // when the video has ingredients.
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
      tags: [],
      family_notes: `Saved from Chef TV — ${video.channel}.`,
      photo_url: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
      difficulty: '',
      servings: null,
    })
    if (error) { showToast('Could not save to Kitchen'); return }
    setVaultIds(prev => new Set(prev).add(String(video.id)))
    // Auto-place the video in Love — best-effort; don't block the Vault
    // save on a Playbook write failure.
    ensureInLove(video).catch(() => {})
    showToast('Saved to Recipe Vault + ❤️ Love ✓')
  }

  function toggleExpand(videoId) {
    setExpandedId(expandedId === videoId ? null : videoId)
  }

  function toggleSearch() {
    if (showSearch) {
      setSearch('')
      setShowSearch(false)
    } else {
      setShowSearch(true)
    }
  }

  // Filters stack: channel + search + love/learn/all all AND together.
  // Shorts (under 3 min) are always excluded — no toggle.
  //
  // Sort strategy varies by tab so each view highlights its best content:
  //   love   → loveScore (recipe completeness × popularity)
  //   learn  → learnScore (teaching-channel boost × popularity)
  //   all    → raw view_count desc (neutral firehose)
  const filtered = videos
    .filter(v => {
      const meta = metadata[v.id]
      const hasRecipe = meta?.ingredients?.length > 0
      const matchChannel = channel === 'All Channels' || v.channel === channel
      const matchSearch = search === '' || v.title.toLowerCase().includes(search.toLowerCase()) || v.channel.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || (filter === 'love' && hasRecipe) || (filter === 'learn' && !hasRecipe)
      const matchShorts = !isShort(v.duration)
      return matchChannel && matchSearch && matchFilter && matchShorts
    })
    .sort((a, b) => {
      if (filter === 'love')  return loveScore(b, metadata[b.id]) - loveScore(a, metadata[a.id])
      if (filter === 'learn') return learnScore(b) - learnScore(a)
      return (b.view_count || 0) - (a.view_count || 0)
    })

  const totalNonShort = videos.filter(v => !isShort(v.duration)).length
  const recipeCount = videos.filter(v => metadata[v.id]?.ingredients?.length > 0 && !isShort(v.duration)).length
  const summaryCount = totalNonShort - recipeCount
  // Total videos from the currently-selected channel (ignoring the
  // Love/Learn/All filter). Used by the "widen the filter" rescue callout
  // below — tells the user what they'd see if they hit "See all". Null
  // when no specific channel is selected.
  const channelTotal = channel === 'All Channels'
    ? null
    : videos.filter(v => v.channel === channel && !isShort(v.duration)).length
  const visible = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🎬 Chef TV</h1>
            </div>
            <button
              onClick={toggleSearch}
              aria-label={showSearch ? 'Close search' : 'Open search'}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                showSearch || search
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700'
              }`}
            >
              {showSearch || search ? '✕' : '🔍'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-3">Watch, learn, save the skills worth mastering.</p>

          {(showSearch || search) && (
            <input
              type="text"
              placeholder="Search videos or channels..."
              value={search}
              autoFocus
              onChange={e => { setSearch(e.target.value); setShowCount(12) }}
              style={{ fontSize: '16px' }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
            />
          )}

          {/* Love / Learn / All — tri-state pill row. The tab vocabulary
              matches the Playbook save buckets (❤️ Love / 🎓 Learn) so a
              user browsing Love sees the bucket they'd save to on the card
              below. Love leads because the ~158 recipes are the scarcer,
              higher-signal set; the ~400 video-only items live under
              Learn. All is the escape hatch for browsing everything. */}
          <div className="flex gap-2 mb-3">
            {[
              ['love',  `❤️ Love (${recipeCount})`,   'bg-rose-500 text-white'],
              ['learn', `🎓 Learn (${summaryCount})`, 'bg-sky-500 text-white'],
              ['all',   `All (${totalNonShort})`,     'bg-orange-600 text-white'],
            ].map(([val, label, activeCls]) => (
              <button
                key={val}
                onClick={() => { setFilter(val); setShowCount(12) }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === val ? activeCls : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Channel — single dropdown, full width */}
          <select
            value={channel}
            onChange={e => { setChannel(e.target.value); setShowCount(12) }}
            style={{ fontSize: '16px' }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              {filtered.length} video{filtered.length === 1 ? '' : 's'} · {totalNonShort} from top YouTube channels
            </p>

            {/* Channel + tab rescue callout. When a specific channel is
                selected AND the current tab is filtering most of their
                content out (Love/Learn tabs exclude the opposite content
                type), we show a friendly "only X from this channel — see
                all Y" widen-link. Prevents the "feels weak" moment when a
                great channel happens to have 1 recipe. */}
            {channelTotal !== null && filter !== 'all' && filtered.length < channelTotal && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-orange-800 leading-snug">
                  Only {filtered.length} {filter === 'love' ? 'recipe' : 'video'}{filtered.length === 1 ? '' : 's'} from <span className="font-semibold">{channel}</span> — they have {channelTotal} total.
                </p>
                <button
                  onClick={() => { setFilter('all'); setShowCount(12) }}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-full hover:bg-orange-100"
                >
                  See all {channelTotal} →
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm font-semibold text-gray-700">No videos match these filters.</p>
                {channelTotal !== null && channelTotal > 0 && filter !== 'all' ? (
                  <>
                    <p className="text-xs text-gray-500 mt-1">
                      {channel} has {channelTotal} video{channelTotal === 1 ? '' : 's'}, just none in {filter === 'love' ? '❤️ Love' : '🎓 Learn'}.
                    </p>
                    <button
                      onClick={() => { setFilter('all'); setShowCount(12) }}
                      className="mt-3 text-xs font-semibold px-4 py-2 bg-orange-600 text-white rounded-full hover:bg-orange-700"
                    >
                      See all {channelTotal} from {channel} →
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Try a different channel or clear your search.</p>
                )}
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
                          <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.title} className="w-full object-cover" style={{height:'192px'}} />
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
                        {/* Playbook save strip — tap a bucket to save this video there.
                            Tap the same bucket again to remove. Tap a different bucket
                            to move. No separate save button — the strip IS the save UX. */}
                        <div className="flex gap-1 mb-3">
                          {PLAYBOOK_BUCKETS.map(b => {
                            const isActive = savedEntry?.bucket === b.key
                            return (
                              <button
                                key={b.key}
                                onClick={() => setBucket(video, b.key)}
                                title={isActive ? `Remove from ${b.label}` : `Save to ${b.label}`}
                                aria-label={isActive ? `Remove from ${b.label}` : `Save to ${b.label}`}
                                className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg border transition-colors ${
                                  isActive
                                    ? b.activeCls
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-700'
                                }`}
                              >
                                <span className="text-sm leading-none">{b.emoji}</span>
                                <span className="hidden sm:inline">{b.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">{video.title}</h3>
                        <p className="text-xs text-orange-600 font-medium">{video.channel}</p>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">{viewCount(video.view_count)}</p>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.channel)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-orange-700 mb-3"
                        >
                          ↗ Search “{video.channel}” on YouTube
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
                                      <p className="text-[11px] text-gray-500 text-center mt-2">
                                        Adds to your Recipe Vault and drops the video in ❤️ Love.
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

            {hasMore && (
              <div className="mt-6 text-center">
                <button onClick={() => setShowCount(c => c + 12)}
                  className="px-8 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                  Show more ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
