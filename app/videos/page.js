'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHANNELS = [
  'All','Chef Jean-Pierre','Binging with Babish','Joshua Weissman',
  'Gordon Ramsay','Ethan Chlebowski','Brian Lagerstrom','Adam Ragusea',
  'Pro Home Cooks','Internet Shaquille','Italia Squisita',
]

function isShort(duration) {
  if (!duration) return true
  const parts = duration.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0])
    const secs = parseInt(parts[1])
    // Filter under 3 mins to catch vertical shorts stored as longer videos
    return mins < 3
  }
  return false
}

function thumbUrl(url) {
  if (!url) return ''
  return url
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
  const [playing, setPlaying] = useState(null)

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

  async function toggleSave(videoId, e) {
    e.stopPropagation()
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

  // ── PLAYER ──
  if (playing) {
    const video = videos.find(v => v.youtube_id === playing)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setPlaying(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            {video && (
              <button onClick={e => toggleSave(video.id, e)}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  savedIds.has(video.id) ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-gray-400 border-gray-200'}`}>
                {savedIds.has(video.id) ? '♥ Saved' : '♡ Save'}
              </button>
            )}
          </div>
        </header>
        <div className="w-full bg-gray-100" style={{aspectRatio:'16/9'}}>
          <iframe src={`https://www.youtube.com/embed/${playing}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
        {video && (
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <h1 className="text-base font-bold text-gray-900 leading-snug mb-1">{video.title}</h1>
            <p className="text-sm text-orange-600 font-medium">{video.channel}</p>
            <p className="text-xs text-gray-400 mt-0.5">{video.duration} · {viewCount(video.view_count)}</p>
          </div>
        )}
      </div>
    )
  }

  // ── GRID ──
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🎬 Cooking Videos</h1>
          </div>
          <input type="text" placeholder="Search videos or channels..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHANNELS.map(ch => (
              <button key={ch} onClick={() => setChannel(ch)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  channel === ch ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                {ch === 'All' ? 'All Channels' : ch}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading videos...</div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">{filtered.length} videos</p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(video => (
                <div key={video.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors cursor-pointer"
                  onClick={() => setPlaying(video.youtube_id)}>
                  {/* Thumbnail */}
                  <div className="relative bg-gray-100" style={{aspectRatio:'16/9'}}>
                    <img
                      src={thumbUrl(video.thumbnail_url)}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = video.thumbnail_url || '' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 hover:bg-opacity-20 transition-colors">
                      <div className="w-9 h-9 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm ml-0.5">▶</span>
                      </div>
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white rounded px-1" style={{fontSize:'10px'}}>
                        {video.duration}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">{video.title}</p>
                    <p className="text-orange-500 font-medium" style={{fontSize:'10px'}}>{video.channel}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-gray-400" style={{fontSize:'10px'}}>{viewCount(video.view_count)}</p>
                      <button onClick={e => toggleSave(video.id, e)}
                        className={`text-base leading-none ${savedIds.has(video.id) ? 'text-orange-500' : 'text-gray-300'}`}>
                        {savedIds.has(video.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}