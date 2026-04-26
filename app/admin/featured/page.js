'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// Featured Curator for Chef TV (April 2026).
//
// Mirrors Golf's /admin/featured but pared down to the only knob Recipe has:
// flip `cooking_videos.is_featured` on/off. The ⭐ Featured chip on the
// Teach tab of /videos prefers `is_featured = true` rows first and falls
// back to the score-slice when the curator hasn't picked enough yet — so
// curation is additive over the automatic top-15.
//
// Recipe has no buckets, no editorial_status, and no pros, so:
//   • No bucket tabs (Golf has 4)
//   • No Hide button (Golf hides via editorial_status)
//   • No Rebucket select (Golf has primary_bucket)
//   • Just: search, ★-only filter, ★ Feature / ☆ Unfeature toggle.
//
// Auth is double-gated: client-side check redirects non-admin to /kitchen,
// and the API route also re-validates the Bearer token against ADMIN_EMAIL.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'bd9356@gmail.com'

function viewCount(n) {
  if (!n) return ''
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M views`
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K views`
  return `${n} views`
}

export default function AdminFeaturedPage() {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [videos, setVideos] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState({})
  const [err, setErr] = useState('')

  // filters
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  // 1. Auth gate — admin only.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      if (!session) {
        window.location.href = '/login'
        return
      }
      if (session.user?.email !== ADMIN_EMAIL) {
        window.location.href = '/kitchen'
        return
      }
      setToken(session.access_token)
      setReady(true)
    })()
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr('')
    const params = new URLSearchParams()
    if (featuredOnly) params.set('featured', 'true')
    if (q) params.set('q', q)
    params.set('limit', '200')
    try {
      const res = await fetch(`/api/admin/cooking-videos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || 'Failed to load list')
        setVideos([])
        setCount(0)
      } else {
        setVideos(body.videos || [])
        setCount(body.count || 0)
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setLoading(false)
  }, [token, featuredOnly, q])

  useEffect(() => {
    if (ready) load()
  }, [ready, load])

  // Debounce search input — 300ms matches Golf's curator.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300)
    return () => clearTimeout(t)
  }, [qInput])

  async function act(video, action) {
    if (!token) return
    setWorking(w => ({ ...w, [video.id]: action }))
    try {
      const res = await fetch('/api/admin/video-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId: video.id, action })
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || `Action "${action}" failed`)
      } else {
        if (action === 'feature') {
          setVideos(vs => vs.map(v => v.id === video.id ? { ...v, is_featured: true } : v))
        } else if (action === 'unfeature') {
          // When the ★-only filter is on, an unfeatured row no longer
          // belongs in the list — drop it instead of leaving a stale tile.
          if (featuredOnly) {
            setVideos(vs => vs.filter(v => v.id !== video.id))
            setCount(c => Math.max(0, c - 1))
          } else {
            setVideos(vs => vs.map(v => v.id === video.id ? { ...v, is_featured: false } : v))
          }
        }
        setErr('')
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setWorking(w => {
      const { [video.id]: _, ...rest } = w
      return rest
    })
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Checking access…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (window.location.href = '/kitchen')}
            className="text-gray-500 hover:text-gray-900"
            title="Back to MyKitchen"
            aria-label="Back to MyKitchen"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            ⭐ Featured Curator
          </h1>
          <span className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${count} ${count === 1 ? 'video' : 'videos'}`}
          </span>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search titles…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            style={{ fontSize: '16px' }}
          />
          <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="rounded"
            />
            ⭐ only
          </label>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <p className="mb-4 text-sm text-gray-600">
          Pick which Chef TV videos lead the <span className="font-semibold">⭐ Featured</span> chip on the Teach tab.
          Featured rows show first; the rest are filled from the automatic top-15 by teaching score.
        </p>

        {err && (
          <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}

        {!loading && videos.length === 0 && !err && (
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium">No matches.</p>
            <p className="text-gray-500 text-sm mt-1">
              {featuredOnly
                ? 'Nothing is featured yet — uncheck ⭐ only to find candidates.'
                : 'Try a different search.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {videos.map(v => {
            const meta = v._meta
            const hasRecipe = (meta?.ingredients?.length || 0) > 0
            const busy = working[v.id]

            return (
              <div
                key={v.id}
                className={`rounded-2xl border bg-white overflow-hidden ${v.is_featured ? 'border-amber-400 ring-1 ring-amber-200' : 'border-gray-200'}`}
              >
                <div className="flex gap-3 p-3">
                  {v.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="w-32 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtube_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block font-medium text-gray-900 hover:text-orange-600 line-clamp-2"
                    >
                      {v.is_featured && <span className="text-amber-500 mr-1">⭐</span>}
                      {v.title}
                    </a>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {v.channel || '—'}
                      {v.view_count ? <span className="ml-1">· {viewCount(v.view_count)}</span> : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                      {hasRecipe ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800">
                          🍳 Recipe
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800">
                          🎓 Teach
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap items-center gap-2 bg-gray-50">
                  {v.is_featured ? (
                    <button
                      onClick={() => act(v, 'unfeature')}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                    >
                      {busy === 'unfeature' ? '…' : '☆ Unfeature'}
                    </button>
                  ) : (
                    <button
                      onClick={() => act(v, 'feature')}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      {busy === 'feature' ? '…' : '⭐ Feature'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
