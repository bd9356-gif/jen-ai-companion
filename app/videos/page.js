'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import UnifiedVideoPlayer from '@/components/UnifiedVideoPlayer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Category dropdown grouped by type — cuisines, dishes, proteins, etc.
// The first entry ("All Categories") sits above the groups.
const CATEGORY_GROUPS = [
  { label: 'Cuisines', items: ['Italian', 'Mexican', 'French', 'Asian', 'American'] },
  { label: 'Dishes',   items: ['Pasta', 'Pizza', 'Bread', 'Sandwich', 'Soup', 'Salad', 'Sauce', 'Appetizer', 'Dessert'] },
  { label: 'Proteins', items: ['Chicken', 'Beef', 'Seafood', 'Pork', 'Vegetables'] },
  { label: 'Meals',    items: ['Breakfast', 'Comfort Food'] },
  { label: 'Style',    items: ['Quick', 'Baking', 'Technique'] },
]

const CHANNELS = [
  'All Channels',
  'Chef Jean-Pierre', 'Jamie Oliver', 'Binging with Babish', 'Joshua Weissman',
  'Gordon Ramsay', 'Ethan Chlebowski', 'Brian Lagerstrom', 'Adam Ragusea',
  'Pro Home Cooks', 'Internet Shaquille', 'Italia Squisita',
  "Natasha's Kitchen", 'Preppy Kitchen', 'Inspired Taste',
  'Tasty', "America's Test Kitchen", 'Serious Eats', 'Food Wishes',
]

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState(new Set())
  const [category, setCategory] = useState('All Categories')
  const [channel, setChannel] = useState('All Channels')
  const [search, setSearch] = useState('')
  const [playingId, setPlayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [showCount, setShowCount] = useState(12)
  const [filter, setFilter] = useState('all')       // all | recipe | summary
  const [sortBy, setSortBy] = useState('popular')   // popular | newest | saved
  const [showShorts, setShowShorts] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

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
    const { data } = await supabase
      .from('favorites')
      .select('ref_id')
      .eq('user_id', userId)
      .eq('is_in_vault', false)
      .in('type', ['video_recipe', 'video_education'])
    setSavedIds(new Set((data || []).map(s => s.ref_id)))
  }

  async function toggleSave(video) {
    if (!user) return
    const videoId = String(video.id)
    if (savedIds.has(videoId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('ref_id', videoId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(videoId); return n })
    } else {
      const meta = metadata[video.id]
      const hasRecipe = meta?.ingredients?.length > 0
      await supabase.from('favorites').insert({
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
      })
      setSavedIds(prev => new Set([...prev, videoId]))
    }
  }

  function toggleExpand(videoId) {
    setExpandedId(expandedId === videoId ? null : videoId)
  }

  function clearFilters() {
    setCategory('All Categories')
    setChannel('All Channels')
    setFilter('all')
    setSortBy('popular')
    setShowShorts(false)
    setShowCount(12)
  }

  // Filters stack: category + channel + search + recipe/summary + shorts all AND together.
  const filtered = videos
    .filter(v => {
      const meta = metadata[v.id]
      const hasRecipe = meta?.ingredients?.length > 0
      const tags = meta?.dish_tags || []
      const matchCategory = category === 'All Categories' || tags.some(t => t.toLowerCase() === category.toLowerCase())
      const matchChannel = channel === 'All Channels' || v.channel === channel
      const matchSearch = search === '' || v.title.toLowerCase().includes(search.toLowerCase()) || v.channel.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || (filter === 'recipe' && hasRecipe) || (filter === 'summary' && !hasRecipe)
      const matchShorts = showShorts || !isShort(v.duration)
      const matchSaved  = sortBy !== 'saved' || savedIds.has(String(v.id))
      return matchCategory && matchChannel && matchSearch && matchFilter && matchShorts && matchSaved
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
      // popular (default) and 'saved' fall back to view_count desc
      return (b.view_count || 0) - (a.view_count || 0)
    })

  const totalNonShort = videos.filter(v => !isShort(v.duration)).length
  const recipeCount = videos.filter(v => metadata[v.id]?.ingredients?.length > 0 && !isShort(v.duration)).length
  const summaryCount = totalNonShort - recipeCount
  const visible = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  // Count how many filters are active (excluding search, which is always visible).
  const activeFilterCount =
    (category !== 'All Categories' ? 1 : 0) +
    (channel !== 'All Channels' ? 1 : 0) +
    (filter !== 'all' ? 1 : 0) +
    (sortBy !== 'popular' ? 1 : 0) +
    (showShorts ? 1 : 0)

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🎬 Chef TV</h1>
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200'
              }`}
            >
              🎛 Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-3">Watch, learn, save the skills worth mastering.</p>

          <input type="text" placeholder="Search videos or channels..." value={search}
            onChange={e => { setSearch(e.target.value); setShowCount(12) }}
            style={{ fontSize: '16px' }}  // prevents iOS Safari auto-zoom
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />

          {/* Advanced filter panel — hidden by default */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              {/* Recipe / Video Only / All — tri-state pill row */}
              <div className="flex gap-2">
                {[['all',`All (${totalNonShort})`],['recipe',`🍳 Recipe (${recipeCount})`],['summary',`📝 Video only (${summaryCount})`]].map(([val, label]) => (
                  <button key={val} onClick={() => { setFilter(val); setShowCount(12) }}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      filter === val
                        ? val === 'recipe' ? 'bg-green-600 text-white' : val === 'summary' ? 'bg-gray-600 text-white' : 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Sort, category, channel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">Sort</span>
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setShowCount(12) }}
                    style={{ fontSize: '16px' }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="popular">Most popular</option>
                    <option value="newest">Newest first</option>
                    <option value="saved">Only saved by me</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">Category</span>
                  <select
                    value={category}
                    onChange={e => { setCategory(e.target.value); setShowCount(12) }}
                    style={{ fontSize: '16px' }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option>All Categories</option>
                    {CATEGORY_GROUPS.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.items.map(c => <option key={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">Channel</span>
                  <select
                    value={channel}
                    onChange={e => { setChannel(e.target.value); setShowCount(12) }}
                    style={{ fontSize: '16px' }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>

              {/* Shorts toggle + clear */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShorts}
                    onChange={e => { setShowShorts(e.target.checked); setShowCount(12) }}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-400"
                  />
                  Include shorts (under 3 min)
                </label>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs font-semibold text-orange-600 hover:text-orange-800">
                    Clear all
                  </button>
                )}
              </div>
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
            <p className="text-xs text-gray-500 mb-4">
              {filtered.length} video{filtered.length === 1 ? '' : 's'} · {totalNonShort} from top YouTube channels
            </p>

            {filtered.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm font-semibold text-gray-700">No videos match these filters.</p>
                <p className="text-xs text-gray-500 mt-1">Try adjusting or clearing your filters above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visible.map(video => {
                  const meta = metadata[video.id]
                  const isExpanded = expandedId === video.id
                  const hasRecipe = meta?.ingredients?.length > 0
                  const videoId = String(video.id)
                  const saved = savedIds.has(videoId)
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
                          {/* Floating save button (stopPropagation so the thumbnail doesn't play) */}
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={saved ? 'Remove from MyCooking' : 'Save to MyCooking'}
                            title={saved ? 'Saved — tap to remove' : 'Save to MyCooking'}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleSave(video) }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); toggleSave(video) } }}
                            className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 ${
                              saved ? 'bg-rose-500 text-white' : 'bg-white/95 text-gray-700 hover:text-rose-500'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </span>
                        </button>
                      )}
                      <div className="p-4">
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
