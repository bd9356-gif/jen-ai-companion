'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHANNELS = [
  'All','Jamie Oliver','Binging with Babish','Joshua Weissman',
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
  }

  async function loadSaved(userId) {
    const { data } = await supabase.from('saved_videos').select('video_id').eq('user_id', userId)
    setSavedIds(new Set((data || []).map(s => s.video_id)))
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
              {visible.map(video => (
                <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">
                  {/* Thumbnail - full width like Golf app */}
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
                    <p className="text-xs text-orange-600 font-medium mb-1">{video.channel}</p>
                    <p className="text-xs text-gray-400 mb-3">{viewCount(video.view_count)}</p>
                    <button onClick={() => toggleSave(video.id)}
                      className={`text-sm font-semibold transition-colors ${
                        savedIds.has(video.id) ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}>
                      {savedIds.has(video.id) ? '♥ Saved' : '♡ Save'}
                    </button>
                  </div>
                </div>
              ))}
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