'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import VideoItem from '@/components/VideoItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// My Playbook — four intent-based buckets (locked).
// Retired the course-type buckets from Skills I Learned (April 2026): home
// cooks couldn't sort cooking videos by course cleanly. Save/Love/Cooked/
// Learn asks "what do I want to do with this?" instead of "what kind of
// food is it?" — a question the user can actually answer at save time.
//
// Only videos land here. Saved AI answers (favorites.type='ai_answer') live
// in Chef Notes (/chef-notes), which is driven by Ask Chef Jennifer.
//
// Bucket assignments live in `cooking_skill_items` keyed by
// (user_id, item_type, item_id). Items without a row default to 'save'.
// Source data:
//   - saved_videos → cooking_videos (item_type='cooking_video')            (legacy)
//   - saved_education_videos → education_videos (item_type='education_video') (legacy)
//   - favorites where type in ('video_recipe','video_education') (item_type='favorite')
const BUCKETS = [
  { key: 'save',   emoji: '📥', label: 'Save',   hint: 'Quick stash, no thinking.' },
  { key: 'love',   emoji: '❤️', label: 'Love',   hint: 'Meals you want to make.' },
  { key: 'cooked', emoji: '👩‍🍳', label: 'Cooked', hint: "What you've made." },
  { key: 'learn',  emoji: '🎓', label: 'Learn',  hint: "What you're working on." },
]

// Full Tailwind class literals per bucket — v4 JIT requires complete strings.
const COLOR = {
  save:   { border: 'border-2 border-slate-400',   header: 'bg-slate-100',   body: 'bg-slate-50',   title: 'text-slate-800',   pill: 'bg-slate-200 text-slate-900',     btnCls: 'border-slate-400 text-slate-800' },
  love:   { border: 'border-2 border-rose-400',    header: 'bg-rose-100',    body: 'bg-rose-50',    title: 'text-rose-800',    pill: 'bg-rose-200 text-rose-900',       btnCls: 'border-rose-400 text-rose-800' },
  cooked: { border: 'border-2 border-emerald-400', header: 'bg-emerald-100', body: 'bg-emerald-50', title: 'text-emerald-800', pill: 'bg-emerald-200 text-emerald-900', btnCls: 'border-emerald-400 text-emerald-800' },
  learn:  { border: 'border-2 border-sky-400',     header: 'bg-sky-100',     body: 'bg-sky-50',     title: 'text-sky-800',     pill: 'bg-sky-200 text-sky-900',         btnCls: 'border-sky-400 text-sky-800' },
}

export default function PlaybookPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])         // normalized video items with _bucket
  const [expanded, setExpanded] = useState({})   // { [bucketKey]: bool }
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }
  function toggleExpanded(key) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })) }

  // Load saves from all three sources + bucket assignments, merge into one
  // normalized list. AI answers (favorites.type='ai_answer') are intentionally
  // excluded — they belong to Chef Notes, not the Playbook.
  //
  // Each item carries:
  //   _item_type   : 'cooking_video' | 'education_video' | 'favorite'
  //   _item_id     : uuid used as cooking_skill_items.item_id
  //   _legacy_src  : 'cooking' | 'education' | null (for legacy remove routing)
  //   _favoriteId  : favorites.id (for favorite-source remove routing)
  //   _bucket      : resolved bucket key (defaults to 'save' when no row)
  async function loadAll(userId) {
    const [{ data: sv1 }, { data: sv2 }, { data: favs }, { data: bucketRows }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['video_recipe','video_education']),
      supabase.from('cooking_skill_items').select('*').eq('user_id', userId),
    ])

    const cookingIds = (sv1 || []).map(s => s.video_id)
    const educationIds = (sv2 || []).map(s => s.video_id)
    const [{ data: cv }, { data: ev }] = await Promise.all([
      cookingIds.length ? supabase.from('cooking_videos').select('*').in('id', cookingIds) : { data: [] },
      educationIds.length ? supabase.from('education_videos').select('*').in('id', educationIds) : { data: [] },
    ])

    // Bucket lookup map keyed on `${item_type}:${item_id}`
    const bucketMap = new Map()
    for (const row of (bucketRows || [])) {
      bucketMap.set(`${row.item_type}:${row.item_id}`, row.bucket)
    }

    const legacyCooking = (cv || []).map(v => ({
      _item_type: 'cooking_video',
      _item_id: v.id,
      _legacy_src: 'cooking',
      _favoriteId: null,
      _bucket: bucketMap.get(`cooking_video:${v.id}`) || 'save',
      id: v.id,
      youtube_id: v.youtube_id,
      title: v.title,
      channel: v.channel,
    }))

    const legacyEducation = (ev || []).map(v => ({
      _item_type: 'education_video',
      _item_id: v.id,
      _legacy_src: 'education',
      _favoriteId: null,
      _bucket: bucketMap.get(`education_video:${v.id}`) || 'save',
      id: v.id,
      youtube_id: v.youtube_id,
      title: v.title,
      channel: v.channel,
    }))

    // Dedupe favorites-sourced saves against legacy — if the same underlying
    // video exists in both, prefer the legacy record (simpler remove path).
    const legacyKey = new Set([...legacyCooking, ...legacyEducation].map(v => `${v._item_type}:${v._item_id}`))

    const favItems = (favs || []).map(f => {
      const meta = f.metadata || {}
      const bucket = bucketMap.get(`favorite:${f.id}`) || 'save'
      const legacyType = f.type === 'video_education' ? 'education_video' : 'cooking_video'
      const refId = f.ref_id || null
      if (refId && legacyKey.has(`${legacyType}:${refId}`)) return null
      return {
        _item_type: 'favorite',
        _item_id: f.id,
        _legacy_src: null,
        _favoriteId: f.id,
        _bucket: bucket,
        id: refId || f.id,
        youtube_id: meta.youtube_id || '',
        title: f.title || '',
        channel: meta.channel || '',
      }
    }).filter(Boolean)

    setItems([...legacyCooking, ...legacyEducation, ...favItems])
  }

  async function moveToBucket(item, bucket) {
    if (!user) return
    const { error } = await supabase.from('cooking_skill_items').upsert({
      user_id: user.id,
      item_type: item._item_type,
      item_id: item._item_id,
      bucket,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,item_type,item_id' })
    if (error) { showToast('Could not move item'); return }
    setItems(prev => prev.map(i =>
      (i._item_type === item._item_type && i._item_id === item._item_id) ? { ...i, _bucket: bucket } : i
    ))
    // Auto-expand the destination so the user sees where it went.
    setExpanded(prev => ({ ...prev, [bucket]: true }))
    showToast(`Moved to ${BUCKETS.find(b => b.key === bucket)?.label} ✓`)
  }

  async function removeItem(item) {
    if (!user) return
    if (item._legacy_src === 'cooking') {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._legacy_src === 'education') {
      await supabase.from('saved_education_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._favoriteId) {
      await supabase.from('favorites').delete().eq('id', item._favoriteId)
    }
    await supabase.from('cooking_skill_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', item._item_type)
      .eq('item_id', item._item_id)
    setItems(prev => prev.filter(i => !(i._item_type === item._item_type && i._item_id === item._item_id)))
    showToast('Removed')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadAll(session.user.id).finally(() => setLoading(false))
    })
  }, [])

  const byBucket = Object.fromEntries(BUCKETS.map(b => [b.key, []]))
  for (const it of items) {
    const key = byBucket[it._bucket] ? it._bucket : 'save'
    byBucket[key].push(it)
  }
  const totalCount = items.length

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📘 My Playbook</h1>
            {totalCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{totalCount}</span>}
          </div>
          <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-3">
          <p className="text-sm text-gray-600 leading-snug">What you save, make, and improve — one place for videos you don't want to lose.</p>
        </div>

        {/* Intro callout — explains how to use the 4 buckets */}
        <div className="mb-4 rounded-2xl border-2 border-slate-400 bg-slate-50 p-3">
          <p className="text-sm text-slate-900 leading-snug">
            <span className="font-bold">Tap a bucket on any Chef TV video.</span>{' '}
            📥 Save if you're not sure yet, ❤️ Love if you want to make it, 👩‍🍳 Cooked once you've made it, 🎓 Learn while you're working on it.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your playbook...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">📘</p>
            <p className="text-gray-500 font-medium">Your playbook is empty</p>
            <p className="text-sm text-gray-400 mt-1">Tap a bucket on any Chef TV video to start saving.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => window.location.href='/videos'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Chef TV →</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {BUCKETS.map(b => {
              const list = byBucket[b.key]
              const c = COLOR[b.key]
              const open = expanded[b.key] || false
              return (
                <div key={b.key} className={`rounded-2xl ${c.border} ${open ? c.body : 'bg-white'} overflow-hidden shadow-sm`}>
                  <button
                    onClick={() => toggleExpanded(b.key)}
                    className={`w-full ${c.header} px-3 py-2.5 flex items-center gap-2 text-left`}
                  >
                    <span className="text-lg">{b.emoji}</span>
                    <span className={`text-sm font-bold ${c.title}`}>{b.label}</span>
                    <span className={`text-xs font-semibold ${c.pill} px-2 py-0.5 rounded-full`}>{list.length}</span>
                    {b.hint && <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">{b.hint}</span>}
                    <span className={`ml-auto text-sm ${c.title}`}>{open ? '▾' : '▸'}</span>
                  </button>
                  {open && (
                    <div className="divide-y divide-gray-100">
                      {list.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-6 px-3">Nothing here yet.</p>
                      ) : (
                        list.map(item => (
                          <PlaybookRow
                            key={`${item._item_type}:${item._item_id}`}
                            item={item}
                            onMove={(bucket) => moveToBucket(item, bucket)}
                            onRemove={() => removeItem(item)}
                            currentBucket={b.key}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

// One saved video. Shows the video thumb + embed via <VideoItem>, plus a
// Move ▾ menu with the other three buckets as buttons.
function PlaybookRow({ item, onMove, onRemove, currentBucket }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const targets = BUCKETS.filter(b => b.key !== currentBucket)

  return (
    <div>
      <VideoItem video={item} onRemove={onRemove} />
      <div className="px-3 pb-2 pt-1 bg-white">
        <button
          onClick={() => setMenuOpen(v => !v)}
          title="Move to another bucket"
          className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
        >
          Move {menuOpen ? '▴' : '▾'}
        </button>
        {menuOpen && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {targets.map(t => {
              const c = COLOR[t.key]
              return (
                <button
                  key={t.key}
                  onClick={() => { setMenuOpen(false); onMove(t.key) }}
                  title={`Move to ${t.label}`}
                  className={`text-xs font-semibold border-2 ${c.btnCls} rounded-lg px-2 py-1 hover:opacity-80`}
                >
                  {t.emoji} {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
