'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// Library Curator for Chef TV (April 2026).
//
// Bill's framing: "the videos are like books in a school's library — quality
// is key." The Featured curator at /admin/featured promotes the best of the
// best. This page is the inverse — soft-hide videos that shouldn't surface
// (sponsored junk, clickbait, off-topic pieces) and clean up titles/channels
// that came in mangled from the YouTube ingestion.
//
// What this page does NOT do (intentionally cut from v1):
//   • Hard delete — Bill picked Hide-only. Hidden rows stay in the DB so
//     they can be restored.
//   • Bulk select — per-video actions, one tap at a time.
//   • Re-extract metadata — that's the standalone backfill_video_metadata.mjs
//     script. Keeping the API route surface tight.

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

const STATUS_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'visible',   label: '✅ Visible' },
  { key: 'hidden',    label: '🚫 Hidden' },
]

const RECIPE_FILTERS = [
  { key: 'any',         label: 'Any' },
  { key: 'has_recipe',  label: '🍳 Has recipe' },
  { key: 'no_recipe',   label: '🎓 No recipe' },
]

export default function AdminLibraryPage() {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [videos, setVideos] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState({})
  const [err, setErr] = useState('')

  // Filters
  const [status, setStatus] = useState('visible')
  const [recipeFilter, setRecipeFilter] = useState('any')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  // Inline edit state — only one row at a time.
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editChannel, setEditChannel] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      if (!session) {
        // Preserve the URL so /login → /auth/confirm returns the admin
        // here after sign-in instead of dumping them on /kitchen.
        const next = encodeURIComponent('/admin/library')
        window.location.href = `/login?next=${next}`
        return
      }
      if (session.user?.email !== ADMIN_EMAIL) { window.location.href = '/kitchen'; return }
      setToken(session.access_token)
      setReady(true)
    })()
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr('')
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (q) params.set('q', q)
    params.set('limit', '500')
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
        // Recipe filter is client-side because it depends on _meta.ingredients
        // which the listing API joins in. Keeping it client-side avoids a
        // chattier API surface.
        let rows = body.videos || []
        if (recipeFilter === 'has_recipe') {
          rows = rows.filter(v => (v._meta?.ingredients?.length || 0) > 0)
        } else if (recipeFilter === 'no_recipe') {
          rows = rows.filter(v => !(v._meta?.ingredients?.length || 0))
        }
        setVideos(rows)
        setCount(rows.length)
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setLoading(false)
  }, [token, status, recipeFilter, q])

  useEffect(() => { if (ready) load() }, [ready, load])

  // 300ms debounce on the search input (matches /admin/featured).
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300)
    return () => clearTimeout(t)
  }, [qInput])

  async function act(video, action, extra = {}) {
    if (!token) return
    setWorking(w => ({ ...w, [video.id]: action }))
    try {
      const res = await fetch('/api/admin/video-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId: video.id, action, ...extra })
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || `Action "${action}" failed`)
      } else {
        setErr('')
        const updated = body.video || {}
        if (action === 'hide' && status === 'visible') {
          // Drop the row from the list — it no longer matches the filter.
          setVideos(vs => vs.filter(v => v.id !== video.id))
          setCount(c => Math.max(0, c - 1))
        } else if (action === 'unhide' && status === 'hidden') {
          setVideos(vs => vs.filter(v => v.id !== video.id))
          setCount(c => Math.max(0, c - 1))
        } else {
          setVideos(vs => vs.map(v => v.id === video.id ? { ...v, ...updated } : v))
        }
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setWorking(w => {
      const { [video.id]: _, ...rest } = w
      return rest
    })
  }

  function startEdit(v) {
    setEditingId(v.id)
    setEditTitle(v.title || '')
    setEditChannel(v.channel || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditChannel('')
  }

  async function saveEdit(v) {
    const t = editTitle.trim()
    const c = editChannel.trim()
    if (!t) { setErr('Title cannot be empty'); return }
    await act(v, 'update_meta', { title: t, channel: c })
    cancelEdit()
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
          <h1 className="text-lg font-semibold text-gray-900">📚 Library Curator</h1>
          <span className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${count} ${count === 1 ? 'video' : 'videos'}`}
          </span>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 space-y-2">
          <input
            type="text"
            placeholder="Search title or channel…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            style={{ fontSize: '16px' }}
          />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                  status === f.key
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="mx-1 text-gray-300">|</span>
            {RECIPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setRecipeFilter(f.key)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                  recipeFilter === f.key
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <p className="mb-4 text-sm text-gray-600">
          Hide videos that aren&rsquo;t great library material, fix typos in titles, or feature the keepers.
          Hidden rows stay in the DB — flip back to <span className="font-semibold">🚫 Hidden</span> + <span className="font-semibold">↩️ Unhide</span> to restore.
        </p>

        {err && (
          <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}

        {!loading && videos.length === 0 && !err && (
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium">No matches.</p>
            <p className="text-gray-500 text-sm mt-1">Try a different filter or search.</p>
          </div>
        )}

        <div className="space-y-3">
          {videos.map(v => {
            const meta = v._meta
            const hasRecipe = (meta?.ingredients?.length || 0) > 0
            const busy = working[v.id]
            const isEditing = editingId === v.id

            return (
              <div
                key={v.id}
                className={`rounded-2xl border bg-white overflow-hidden ${
                  v.is_hidden ? 'border-gray-300 opacity-70' :
                  v.is_featured ? 'border-amber-400 ring-1 ring-amber-200' :
                  'border-gray-200'
                }`}
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
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full rounded-lg border-2 border-orange-300 px-2 py-1 text-sm font-medium"
                          style={{ fontSize: '16px' }}
                        />
                        <input
                          type="text"
                          value={editChannel}
                          onChange={(e) => setEditChannel(e.target.value)}
                          placeholder="Channel"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    ) : (
                      <>
                        <a
                          href={`https://www.youtube.com/watch?v=${v.youtube_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block font-medium text-gray-900 hover:text-orange-600 line-clamp-2"
                        >
                          {v.is_hidden && <span className="text-gray-400 mr-1">🚫</span>}
                          {v.is_featured && !v.is_hidden && <span className="text-amber-500 mr-1">⭐</span>}
                          {v.title}
                        </a>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {v.channel || '—'}
                          {v.view_count ? <span className="ml-1">· {viewCount(v.view_count)}</span> : null}
                        </div>
                      </>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                      {hasRecipe ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800">🍳 Recipe</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800">🎓 Teach</span>
                      )}
                      {v.is_featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">⭐ Featured</span>
                      )}
                      {v.is_hidden && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">🚫 Hidden</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap items-center gap-2 bg-gray-50">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(v)}
                        disabled={busy === 'update_meta'}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                      >
                        {busy === 'update_meta' ? '…' : '💾 Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {v.is_featured ? (
                        <button
                          onClick={() => act(v, 'unfeature')}
                          disabled={!!busy}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                        >
                          {busy === 'unfeature' ? '…' : '☆ Unfeature'}
                        </button>
                      ) : !v.is_hidden && (
                        <button
                          onClick={() => act(v, 'feature')}
                          disabled={!!busy}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                        >
                          {busy === 'feature' ? '…' : '⭐ Feature'}
                        </button>
                      )}
                      {v.is_hidden ? (
                        <button
                          onClick={() => act(v, 'unhide')}
                          disabled={!!busy}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy === 'unhide' ? '…' : '↩️ Unhide'}
                        </button>
                      ) : (
                        <button
                          onClick={() => act(v, 'hide')}
                          disabled={!!busy}
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                        >
                          {busy === 'hide' ? '…' : '🚫 Hide'}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(v)}
                        disabled={!!busy}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                      >
                        ✏️ Edit
                      </button>
                    </>
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
