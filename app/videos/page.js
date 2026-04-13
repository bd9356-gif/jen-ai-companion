'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import SafeYouTube from '@/components/SafeYouTube'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = [
  'All Categories',
  'Pasta','Chicken','Beef','Pizza','Seafood','Pork',
  'Vegetables','Bread','Dessert','Breakfast','Sandwich',
  'Soup','Salad','Appetizer','Sauce','Baking',
  'Mexican','Italian','French','Asian','American',
  'Comfort Food','Quick','Technique',
]

const CHANNELS = [
  'All Channels',
  'Chef Jean-Pierre','Jamie Oliver','Binging with Babish','Joshua Weissman',
  'Gordon Ramsay','Ethan Chlebowski','Brian Lagerstrom','Adam Ragusea',
  'Pro Home Cooks','Internet Shaquille','Italia Squisita',
  "Natasha's Kitchen",'Preppy Kitchen','Inspired Taste',
  'Tasty',"America's Test Kitchen",'Serious Eats','Food Wishes',
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
  if (n >= 1000) return `${(n/1000).toFixed(0)}K views`
  return `${n} views`
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
  const [showCount, setShowCount] = useState(10)
  const [filter, setFilter] = useState('all')

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

  const filtered = videos.filter(v => {
    const meta = metadata[v.id]
    const hasRecipe = meta?.ingredients?.length > 0
    const tags = meta?.dish_tags || []
    const matchCategory = category === 'All Categories' || tags.some(t => t.toLowerCase() === category.toLowerCase())
    const matchChannel = channel === 'All Channels' || v.channel === channel
    const matchSearch = search === '' || v.title.toLowerCase().includes(search.toLowerCase()) || v.channel.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'recipe' && hasRecipe) || (filter === 'summary' && !hasRecipe)
    return matchCategory && matchChannel && matchSearch && matchFilter && !isShort(v.duration)
  })

  const totalNonShort = videos.filter(v => !isShort(v.duration)).length
  const recipeCount = videos.filter(v => metadata[v.id]?.ingredients?.length > 0 && !isShort(v.duration)).length
  const summaryCount = totalNonShort - recipeCount
  const visible = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🎬 TopChef Videos</h1>
          </div>
          <p className="text-xs text-gray-500 mb-3">{totalNonShort} videos from top YouTube channels</p>
          <input type="text" placeholder="Search videos..." value={search}
            onChange={e => { setSearch(e.target.value); setShowCount(10) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3" />
          <div className="flex gap-2 mb-3">
            {[['all',`All (${totalNonShort})`],['recipe',`🍳 Recipe Video (${recipeCount})`],['summary',`📝 Video Only (${summaryCount})`]].map(([val, label]) => (
              <button key={val} onClick={() => { setFilter(val); setShowCount(10) }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === val
                    ? val === 'recipe' ? 'bg-green-600 text-white' : val === 'summary' ? 'bg-gray-600 text-white' : 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={category} onChange={e => { setCategory(e.target.value); setChannel('All Channels'); setShowCount(10) }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={channel} onChange={e => { setChannel(e.target.value); setCategory('All Categories'); setShowCount(10) }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700">
              {CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading videos...</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{filtered.length} videos</p>
            <div className="space-y-4">
              {visible.map(video => {
                const meta = metadata[video.id]
                const isExpanded = expandedId === video.id
                const hasRecipe = meta?.ingredients?.length > 0
                const videoId = String(video.id)
                return (
                  <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">
                    {playingId === video.id ? (
                      <SafeYouTube videoId={video.youtube_id} onClose={() => setPlayingId(null)} />
                    ) : (
                      <button onClick={() => setPlayingId(video.id)} className="w-full relative block group">
                        <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.title} className="w-full object-cover" style={{height:'192px'}} />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5" fill="#dc2626"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">{video.duration}</div>
                        )}
                      </button>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{video.title}</h3>
                      <p className="text-xs text-orange-600 font-medium">{video.channel}</p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">{viewCount(video.view_count)}</p>
                      <div className="flex items-center flex-wrap gap-3">
                        <button onClick={() => toggleExpand(video.id)} className="text-sm text-orange-600 font-semibold hover:text-orange-800">
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>
                        {hasRecipe && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">🍳 Recipe Video</span>
                        )}
                        {!hasRecipe && meta !== undefined && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-200">📝 Video Only</span>
                        )}
                        <button onClick={() => toggleSave(video)}
                          className={`text-sm font-semibold transition-colors ml-auto ${savedIds.has(videoId) ? 'text-orange-600' : 'text-gray-500 hover:text-orange-600'}`}>
                          {savedIds.has(videoId) ? '♥ Saved' : '♡ Save'}
                        </button>
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
                                    <div className="bg-gray-50 rounded-xl p-3">
                                      <ul className="space-y-1">
                                        {meta.ingredients.map((ing, i) => (
                                          <li key={i} className="flex gap-2 text-sm">
                                            <span className="text-orange-400 shrink-0">•</span>
                                            <span className="text-gray-700">
                                              {ing.measure && <span className="font-semibold text-gray-900">{ing.measure} </span>}
                                              {ing.name}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  {meta.instructions && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Instructions</p>
                                      <div className="space-y-2">
                                        {meta.instructions.split('\n').filter(Boolean).map((step, i) => (
                                          <div key={i} className="flex gap-3">
                                            <div className="shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
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
            {hasMore && (
              <div className="mt-6 text-center">
                <button onClick={() => setShowCount(c => c + 10)}
                  className="px-8 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                  Show More ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}