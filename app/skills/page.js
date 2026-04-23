'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import VideoItem from '@/components/VideoItem'
import ExpandableItem from '@/components/ExpandableItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Skills I Learned — six fixed buckets (locked, like Golf's MyBag).
// Buckets are by course type, not technique — that matches how home cooks
// actually learn ("I learned the dishes first, then realized they were skills").
// New saves land in 📥 The Starter until the user moves them.
//
// Bucket assignments are stored in `cooking_skill_items` keyed by
// (user_id, item_type, item_id). Items without a row default to 'starter'.
// Source data lives in:
//   - saved_videos → cooking_videos (item_type='cooking_video')
//   - saved_education_videos → education_videos (item_type='education_video')
//   - favorites where type in ('ai_answer','video_recipe','video_education') (item_type='favorite')
const BUCKETS = [
  { key: 'starter',   emoji: '📥', label: 'The Starter',  hint: 'New saves wait here until you move them into a skill.' },
  { key: 'breakfast', emoji: '🍳', label: 'Breakfast',    hint: '' },
  { key: 'mains',     emoji: '🍽️', label: 'Mains',        hint: '' },
  { key: 'sides',     emoji: '🥕', label: 'Sides & Veg',  hint: '' },
  { key: 'baking',    emoji: '🥖', label: 'Baking',       hint: 'Breads and savory baking.' },
  { key: 'desserts',  emoji: '🍰', label: 'Desserts',     hint: 'Sweet endings.' },
]

// Full Tailwind class literals per bucket — v4 JIT requires complete strings.
const COLOR = {
  starter:   { border: 'border-2 border-yellow-400', header: 'bg-yellow-100', body: 'bg-yellow-50', title: 'text-yellow-800', pill: 'bg-yellow-200 text-yellow-900', btnCls: 'border-yellow-400 text-yellow-800' },
  breakfast: { border: 'border-2 border-orange-400', header: 'bg-orange-100', body: 'bg-orange-50', title: 'text-orange-800', pill: 'bg-orange-200 text-orange-900', btnCls: 'border-orange-400 text-orange-800' },
  mains:     { border: 'border-2 border-rose-400',   header: 'bg-rose-100',   body: 'bg-rose-50',   title: 'text-rose-800',   pill: 'bg-rose-200 text-rose-900',     btnCls: 'border-rose-400 text-rose-800' },
  sides:     { border: 'border-2 border-green-400',  header: 'bg-green-100',  body: 'bg-green-50',  title: 'text-green-800',  pill: 'bg-green-200 text-green-900',   btnCls: 'border-green-400 text-green-800' },
  baking:    { border: 'border-2 border-amber-400',  header: 'bg-amber-100',  body: 'bg-amber-50',  title: 'text-amber-800',  pill: 'bg-amber-200 text-amber-900',   btnCls: 'border-amber-400 text-amber-800' },
  desserts:  { border: 'border-2 border-pink-400',   header: 'bg-pink-100',   body: 'bg-pink-50',   title: 'text-pink-800',   pill: 'bg-pink-200 text-pink-900',     btnCls: 'border-pink-400 text-pink-800' },
}

export default function SkillsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])    // normalized items with _bucket field
  const [expanded, setExpanded] = useState({}) // { [bucketKey]: bool }
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }
  function toggleExpanded(key) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })) }

  // Load saves from all three sources + bucket assignments, merge into one
  // normalized list. Each item carries:
  //   _kind        : 'video' | 'answer'    (how to render)
  //   _item_type   : 'cooking_video' | 'education_video' | 'favorite' (for cooking_skill_items lookup)
  //   _item_id     : uuid used as cooking_skill_items.item_id
  //   _legacy_src  : 'cooking' | 'education' | null (for legacy remove routing)
  //   _favoriteId  : favorites.id (for favorite-source remove routing)
  //   _bucket      : resolved bucket key
  async function loadAll(userId) {
    const [{ data: sv1 }, { data: sv2 }, { data: favs }, { data: bucketRows }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['ai_answer','video_recipe','video_education']),
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
      _kind: 'video',
      _item_type: 'cooking_video',
      _item_id: v.id,
      _legacy_src: 'cooking',
      _favoriteId: null,
      _bucket: bucketMap.get(`cooking_video:${v.id}`) || 'starter',
      id: v.id,
      youtube_id: v.youtube_id,
      title: v.title,
      channel: v.channel,
    }))

    const legacyEducation = (ev || []).map(v => ({
      _kind: 'video',
      _item_type: 'education_video',
      _item_id: v.id,
      _legacy_src: 'education',
      _favoriteId: null,
      _bucket: bucketMap.get(`education_video:${v.id}`) || 'starter',
      id: v.id,
      youtube_id: v.youtube_id,
      title: v.title,
      channel: v.channel,
    }))

    // Dedupe favorites-sourced saves against legacy — if same underlying video
    // exists in both, prefer the legacy record (remove path is simpler).
    const legacyKey = new Set([...legacyCooking, ...legacyEducation].map(v => `${v._item_type}:${v._item_id}`))

    const favItems = (favs || []).map(f => {
      const meta = f.metadata || {}
      // Favorites items all use item_type='favorite' keyed on favorites.id
      const bucket = bucketMap.get(`favorite:${f.id}`) || 'starter'
      if (f.type === 'ai_answer') {
        return {
          _kind: 'answer',
          _item_type: 'favorite',
          _item_id: f.id,
          _legacy_src: null,
          _favoriteId: f.id,
          _bucket: bucket,
          id: f.id,
          title: f.title,
          metadata: meta,
        }
      }
      // video_recipe / video_education — render as a video row. If the same
      // video already came from legacy, skip (dedupe).
      const legacyType = f.type === 'video_education' ? 'education_video' : 'cooking_video'
      const refId = f.ref_id || null
      if (refId && legacyKey.has(`${legacyType}:${refId}`)) return null
      return {
        _kind: 'video',
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
    // Upsert the bucket assignment. RLS enforces user_id.
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
    // Delete from the source table first.
    if (item._legacy_src === 'cooking') {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._legacy_src === 'education') {
      await supabase.from('saved_education_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._favoriteId) {
      await supabase.from('favorites').delete().eq('id', item._favoriteId)
    }
    // And clean up the bucket assignment.
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
    const key = byBucket[it._bucket] ? it._bucket : 'starter'
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
            <h1 className="text-lg font-bold text-gray-900">🎓 Skills I Learned</h1>
            {totalCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{totalCount}</span>}
          </div>
          <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-3">
          <p className="text-sm text-gray-600 leading-snug">Your saved Chef TV videos and Chef Notes, organized by course.</p>
        </div>

        {/* Intro callout — sets up The Starter */}
        <div className="mb-4 rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-900 leading-snug">
            <span className="font-bold">📥 New saves land in The Starter.</span> Move each one into a course bucket as you go — Breakfast, Mains, Sides & Veg, Baking, or Desserts.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your skills...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">🎓</p>
            <p className="text-gray-500 font-medium">No saved skills yet</p>
            <p className="text-sm text-gray-400 mt-1">Save a Chef TV video or a Chef Jennifer answer to build your collection.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => window.location.href='/videos'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Chef TV →</button>
              <button onClick={() => window.location.href='/chef'} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold">Ask Chef Jennifer</button>
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
                          <SkillRow
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

// One saved item. Renders as a video (thumb + embed) or an AI answer (expandable)
// and shows a "Move ▾" menu below the row with the other five buckets as buttons.
function SkillRow({ item, onMove, onRemove, currentBucket }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const targets = BUCKETS.filter(b => b.key !== currentBucket)

  return (
    <div>
      {item._kind === 'video' ? (
        <VideoItem video={item} onRemove={onRemove} />
      ) : (
        <ExpandableItem item={item} emoji="💡" onRemove={onRemove} />
      )}
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
