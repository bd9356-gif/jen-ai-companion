'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHANNELS = [
  'All','Chef Jean-Pierre','Jamie Oliver','Binging with Babish','Joshua Weissman',
  'Gordon Ramsay','Ethan Chlebowski','Brian Lagerstrom','Adam Ragusea',
  'Pro Home Cooks','Internet Shaquille','Italia Squisita',
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
  const [user, setUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState(new Set())
  const [channel, setChannel] = useState('All')
  const [search, setSearch] = useState('')
  const [playingId, setPlayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [showCount, setShowCount] = useState(10)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadVideos()
      loadSaved(session.user.id)
    })
  }, [])

  async function loadVideos() {
    const { data } = await supabase
      .from('cooking_videos').select('*').order('view_count', { ascending: false })
    setVideos(data || [])
    setLoading(false)
    // Pre-load all metadata so badges show immediately
    if (data && data.length > 0) {
      const ids = data.map(v => v.id)
      const { data: metas } = await supabase
        .from('video_metadata')
        .select('*')
        .in('video_id', ids)
      if (metas) {
        const map = {}
        metas.forEach(m => { map[m.video_id] = m })
        // Fill nulls for videos with no metadata
        ids.forEach(id => { if (!map[id]) map[id] = null })
        setMetadata(map)
      }
    }
  }

  async function loadSaved(userId) {
    const { data } = await supabase.from('saved_videos').select('video_id').eq('user_id', userId)
    setSavedIds(new Set((data || []).map(s => s.video_id)))
  }

  async function loadMetadata(videoId) {
    if (metadata[videoId]) return
    const { data } = await supabase
      .from('video_metadata')
      .select('*')
      .eq('video_id', videoId)
      .maybeSingle()
    if (data) setMetadata(prev => ({ ...prev, [videoId]: data }))
    else setMetadata(prev => ({ ...prev, [videoId]: null }))
  }

  async function toggleSave(videoId) {
    if (!user) return
    if (savedIds.has(videoId)) {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(videoId); return n })
    } else {
      await supabase.from('saved_videos').insert({ user_id: user.id, video_id: videoId })
      setSavedIds(prev => new Set([...prev, videoId]))
    }
  }

  function toggleExpand(videoId) {
    if (expandedId === videoId) {
      setExpandedId(null)
    } else {
      setExpandedId(videoId)
      loadMetadata(videoId)
    }
  }

  const filtered = videos.filter(v => {
    const matchChannel = channel === 'All' || v.channel === channel
    const matchSearch = search === '' ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.channel.toLowerCase().includes(search.toLowerCase())
    return matchChannel && matchSearch && !isShort(v.duration)
  })

  const visible = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🎬 Cooking Videos</h1>
          </div>
          <input type="text" placeholder="Search videos or channels..."
            value={search} onChange={e => { setSearch(e.target.value); setShowCount(10) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHANNELS.map(ch => (
              <button key={ch} onClick={() => { setChannel(ch); setShowCount(10) }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  channel === ch ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                {ch === 'All' ? 'All Channels' : ch}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading videos...</div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{filtered.length} videos</p>
            <div className="space-y-4">
              {visible.map(video => {
                const meta = metadata[video.id]
                const isExpanded = expandedId === video.id
                const hasRecipe = meta?.ingredients?.length > 0
                const hasSummary = meta?.ai_summary

                return (
                  <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">

                    {/* Thumbnail / Player */}
                    {playingId === video.id ? (
                      <div className="relative w-full bg-black" style={{aspectRatio:'16/9'}}>
                        <iframe
                          src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <button onClick={() => setPlayingId(null)}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setPlayingId(video.id)} className="w-full relative block group">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                          alt={video.title}
                          className="w-full object-cover"
                          style={{height:'192px'}}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5" fill="#dc2626">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            {video.duration}
                          </div>
                        )}
                      </button>
                    )}

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{video.title}</h3>
                      <p className="text-xs text-orange-600 font-medium">{video.channel}</p>
                      <p className="text-xs text-gray-400 mt-0.5 mb-3">{viewCount(video.view_count)}</p>

                      {/* Action buttons */}
                      <div className="flex items-center flex-wrap gap-3">
                        <button onClick={() => toggleExpand(video.id)}
                          className="text-sm text-orange-600 font-semibold hover:text-orange-800">
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>
                        {meta && hasRecipe && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                            🍳 Recipe included
                          </span>
                        )}
                        {meta && !hasRecipe && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full border border-gray-200">
                            📝 Summary only
                          </span>
                        )}
                        <button onClick={() => toggleSave(video.id)}
                          className={`text-sm font-semibold transition-colors ml-auto ${
                            savedIds.has(video.id) ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}>
                          {savedIds.has(video.id) ? '♥ Saved' : '♡ Save'}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          {meta === undefined ? (
                            <p className="text-sm text-gray-400">Loading...</p>
                          ) : !meta ? (
                            <p className="text-sm text-gray-400 italic">No details available for this video.</p>
                          ) : (
                            <>
                              {hasSummary && (
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
                              {!hasRecipe && !hasSummary && (
                                <p className="text-sm text-gray-400 italic">No recipe details available for this video.</p>
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