'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHANNELS = [
  'All',
  'Chef Jean-Pierre',
  'Binging with Babish',
  'Joshua Weissman',
  'Gordon Ramsay',
  'Ethan Chlebowski',
  'Brian Lagerstrom',
  'Adam Ragusea',
  'Pro Home Cooks',
  'Internet Shaquille',
  'Italia Squisita',
]

function isShort(duration) {
  if (!duration) return false
  const parts = duration.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0])
    return mins < 2
  }
  return false
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
      .from('cooking_videos')
      .select('*')
      .order('view_count', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  async function loadSaved(userId) {
    const { data } = await supabase
      .from('saved_videos')
      .select('video_id')
      .eq('user_id', userId)
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

  // ── PLAYER VIEW ──
  if (playing) {
    const video = videos.find(v => v.youtube_id === playing)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setPlaying(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            {video && (
              <button
                onClick={() => toggleSave(video.id)}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  savedIds.has(video.id)
                    ? 'text-orange-600 border-orange-200 bg-orange-50'
                    : 'text-gray-400 border-gray-200 hover:border-orange-200 hover:text-orange-600'
                }`}
              >
                {savedIds.has(video.id) ? '♥ Saved' : '♡ Save'}
              </button>
            )}
          </div>
        </header>
        <div className="w-full bg-black" style={{aspectRatio:'16/9'}}>
          <iframe
            src={`https://www.youtube.com/embed/${playing}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {video && (
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <h1 className="text-base font-bold text-gray-900 leading-snug mb-2">{video.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="text-orange-600 font-medium">{video.channel}</span>
              {video.duration && <span>· {video.duration}</span>}
              {video.view_count > 0 && (
                <span>· {video.view_count >= 1000000
                  ? `${(video.view_count / 1000000).toFixed(1)}M views`
                  : `${(video.view_count / 1000).toFixed(0)}K views`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🎬 Cooking Videos</h1>
          </div>
          <input
            type="text"
            placeholder="Search videos or channels..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHANNELS.map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  channel === ch ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                }`}
              >
                {ch === 'All' ? 'All Channels' : ch}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading videos...</div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4 px-4">{filtered.length} videos</p>
            <div className="space-y-4">
              {filtered.map(video => (
                <div key={video.id} className="bg-white">
                  {/* Large thumbnail */}
                  <button
                    onClick={() => setPlaying(video.youtube_id)}
                    className="relative w-full block"
                    style={{aspectRatio:'16/9'}}
                  >
                    <img
                      src={video.thumbnail_url
                        ? video.thumbnail_url.replace('hqdefault', 'maxresdefault')
                        : ''}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.src = video.thumbnail_url
                          ? video.thumbnail_url.replace('maxresdefault', 'mqdefault')
                          : ''
                      }}
                    />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 hover:bg-opacity-20 transition-colors">
                      <div className="w-14 h-14 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl ml-1">▶</span>
                      </div>
                    </div>
                    {/* Duration badge */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        {video.duration}
                      </div>
                    )}
                  </button>

                  {/* Info row */}
                  <div className="flex items-start justify-between px-4 pt-3 pb-4">
                    <button onClick={() => setPlaying(video.youtube_id)} className="flex-1 text-left min-w-0 mr-3">
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">{video.title}</p>
                      <p className="text-xs text-orange-600 font-medium">{video.channel}</p>
                      {video.view_count > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {video.view_count >= 1000000
                            ? `${(video.view_count / 1000000).toFixed(1)}M views`
                            : `${(video.view_count / 1000).toFixed(0)}K views`}
                        </p>
                      )}
                    </button>
                    <button
                      onClick={() => toggleSave(video.id)}
                      className={`shrink-0 text-xl mt-0.5 transition-colors ${
                        savedIds.has(video.id) ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'
                      }`}
                    >
                      {savedIds.has(video.id) ? '♥' : '♡'}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-gray-100" />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}