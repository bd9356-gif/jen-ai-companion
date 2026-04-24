'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import VideoItem from '@/components/VideoItem'
import ExpandableItem from '@/components/ExpandableItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// My Playbook — two intent-based buckets for saved videos plus a Chef
// Notes section for saved AI answers. Everything you've saved, in one
// place.
//
//   love        ❤️  Meals you want to make.     (recipe-bearing videos)
//   learn       🎓  What you're working on.      (technique / video-only)
//   chef_notes  📝  Saved answers from Chef Jennifer.
//
// Pivot history (April 2026):
//   - Skills I Learned had 6 course-type buckets (mig 002).
//   - Collapsed to 4 intent buckets Save/Love/Cooked/Learn (mig 003).
//   - Collapsed to 3 buckets Save/Love/Learn (mig 004).
//   - Collapsed to 2 buckets Love/Learn (mig 006) — Save was the
//     "undecided" middle and didn't add signal. Chef Notes (AI answers)
//     merged in at the same time so the Playbook is the single home for
//     everything the user has saved from Chef TV and Ask Chef Jennifer.
//
// Bucket assignments for videos live in `cooking_skill_items` keyed by
// (user_id, item_type, item_id). Source data:
//   - saved_videos → cooking_videos (item_type='cooking_video')            (legacy)
//   - saved_education_videos → education_videos (item_type='education_video') (legacy)
//   - favorites where type in ('video_recipe','video_education') (item_type='favorite')
// AI answers are favorites.type='ai_answer' — they render in the Chef
// Notes section, not a bucket, so they don't live in cooking_skill_items.
const BUCKETS = [
  { key: 'love',  emoji: '❤️', label: 'Love',  hint: 'Meals you want to try.' },
  { key: 'learn', emoji: '🎓', label: 'Learn', hint: "What you're working on." },
]

// Full Tailwind class literals per bucket — v4 JIT requires complete strings.
const COLOR = {
  love:  { border: 'border-2 border-rose-400', header: 'bg-rose-100', body: 'bg-rose-50', title: 'text-rose-800', pill: 'bg-rose-200 text-rose-900', btnCls: 'border-rose-400 text-rose-800' },
  learn: { border: 'border-2 border-sky-400',  header: 'bg-sky-100',  body: 'bg-sky-50',  title: 'text-sky-800',  pill: 'bg-sky-200 text-sky-900',   btnCls: 'border-sky-400 text-sky-800' },
}

// Chef Notes section uses its own color family (amber/indigo) so users
// see at a glance that it's a different kind of save (AI answers, not
// videos) and there's no bucket/move UX to worry about.
const NOTES_COLOR = {
  border: 'border-2 border-amber-400',
  header: 'bg-amber-100',
  body: 'bg-amber-50',
  title: 'text-amber-900',
  pill: 'bg-amber-200 text-amber-900',
}

// Given a video-item record (has _item_type, metadata on favorites, etc.),
// pick a sensible default bucket for rows that don't have an explicit
// cooking_skill_items placement yet. Recipe-bearing content → love; all
// else → learn. Mirrors the server-side default from migration 006 so
// the UI reads consistently even before a user ever taps a bucket.
function defaultBucketFor(item) {
  if (item._item_type === 'cooking_video') return 'love'
  if (item._item_type === 'education_video') return 'learn'
  if (item._item_type === 'favorite') return item._favType === 'video_recipe' ? 'love' : 'learn'
  return 'learn'
}

export default function PlaybookPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])          // normalized video items with _bucket
  const [notes, setNotes] = useState([])          // ai_answer favorites
  // Active tab: 'love' | 'learn' | 'chef_notes'. Default to Love so the
  // scarcer/higher-intent "meals I want to try" set is what users see first
  // — matches the Chef TV page's tab default.
  const [tab, setTab] = useState('love')
  // Collapsed "what's on this page" tip. Folded into a tiny ℹ️ button next to
  // Chef TV in the header — keeps the body focused on tabs + content, but
  // the explainer is one tap away when needed.
  const [showAbout, setShowAbout] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Load video saves from all three sources + bucket assignments + the
  // Chef Notes (ai_answer favorites). Merge into: items (videos) and
  // notes (answers). Items land in love or learn; Chef Notes renders in
  // its own section below.
  //
  // Each video item carries:
  //   _item_type   : 'cooking_video' | 'education_video' | 'favorite'
  //   _item_id     : uuid used as cooking_skill_items.item_id
  //   _legacy_src  : 'cooking' | 'education' | null (for legacy remove routing)
  //   _favoriteId  : favorites.id (for favorite-source remove routing)
  //   _favType     : favorites.type for 'favorite' items, else null
  //   _bucket      : resolved bucket key (default chosen by defaultBucketFor)
  async function loadAll(userId) {
    const [{ data: sv1 }, { data: sv2 }, { data: vidFavs }, { data: bucketRows }, { data: answerFavs }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['video_recipe','video_education']),
      supabase.from('cooking_skill_items').select('*').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_answer').order('created_at', { ascending: false }),
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

    const legacyCooking = (cv || []).map(v => {
      const base = {
        _item_type: 'cooking_video',
        _item_id: v.id,
        _legacy_src: 'cooking',
        _favoriteId: null,
        _favType: null,
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        channel: v.channel,
      }
      base._bucket = bucketMap.get(`cooking_video:${v.id}`) || defaultBucketFor(base)
      return base
    })

    const legacyEducation = (ev || []).map(v => {
      const base = {
        _item_type: 'education_video',
        _item_id: v.id,
        _legacy_src: 'education',
        _favoriteId: null,
        _favType: null,
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        channel: v.channel,
      }
      base._bucket = bucketMap.get(`education_video:${v.id}`) || defaultBucketFor(base)
      return base
    })

    // Dedupe favorites-sourced saves against legacy — if the same underlying
    // video exists in both, prefer the legacy record (simpler remove path).
    const legacyKey = new Set([...legacyCooking, ...legacyEducation].map(v => `${v._item_type}:${v._item_id}`))

    const favItems = (vidFavs || []).map(f => {
      const meta = f.metadata || {}
      const legacyType = f.type === 'video_education' ? 'education_video' : 'cooking_video'
      const refId = f.ref_id || null
      if (refId && legacyKey.has(`${legacyType}:${refId}`)) return null
      const base = {
        _item_type: 'favorite',
        _item_id: f.id,
        _legacy_src: null,
        _favoriteId: f.id,
        _favType: f.type,
        id: refId || f.id,
        youtube_id: meta.youtube_id || '',
        title: f.title || '',
        channel: meta.channel || '',
      }
      base._bucket = bucketMap.get(`favorite:${f.id}`) || defaultBucketFor(base)
      return base
    }).filter(Boolean)

    setItems([...legacyCooking, ...legacyEducation, ...favItems])
    setNotes(answerFavs || [])
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
    // Jump to the destination tab so the user sees where it went.
    setTab(bucket)
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

  async function removeNote(note) {
    if (!user) return
    await supabase.from('favorites').delete().eq('id', note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    showToast('Note removed')
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
    const key = byBucket[it._bucket] ? it._bucket : 'learn'
    byBucket[key].push(it)
  }
  const totalCount = items.length + notes.length

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
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
            {/* About toggle — opens the per-surface explainer without
                cluttering the body. Stays small (icon-only) so it doesn't
                compete with the Chef TV action next to it. */}
            <button
              onClick={() => setShowAbout(v => !v)}
              title={showAbout ? 'Hide about' : 'What is each tab?'}
              aria-label={showAbout ? 'Hide about' : 'About this page'}
              aria-expanded={showAbout}
              className={`w-7 h-7 rounded-full border text-xs font-bold flex items-center justify-center transition-colors ${
                showAbout
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-700'
              }`}
            >
              {showAbout ? '✕' : 'ℹ'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Heading tagline — joinery arrows ("Love it → Learn it → Note it")
            signal that the three pieces are connected stages of the same
            save habit, not three unrelated tabs. Bigger type than before so
            it reads as a page title, not a caption. */}
        <div className="text-center px-2 mb-6">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            Love it <span className="text-gray-400">→</span> Learn it <span className="text-gray-400">→</span> Note it
          </p>
          <p className="text-sm text-gray-500 mt-2">All your saved content &mdash; from videos to chef guidance.</p>
        </div>

        {/* Intro callout — full sentences per surface, Bill's exact wording.
            Keeps the three saves conceptually separate so users know where
            each kind of thing lives. Collapsed by default and opened via
            the ℹ️ toggle next to Chef TV in the header so the body stays
            focused on tabs + content; the explainer is one tap away. */}
        {showAbout && (
          <div className="mb-6 rounded-2xl border-2 border-slate-400 bg-slate-50 p-4 space-y-2">
            <p className="text-sm text-slate-900 leading-relaxed">
              ❤️ <span className="font-bold">Love</span> is where you keep the meals you want to try.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              🎓 <span className="font-bold">Learn</span> is where you practice and build your skills.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              📝 <span className="font-bold">Chef Notes</span> is where you save the answers and guidance you get from Chef Jennifer.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your playbook...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">📘</p>
            <p className="text-gray-500 font-medium">Your playbook is empty</p>
            <p className="text-sm text-gray-400 mt-1">Save a video from Chef TV or an answer from Chef Jennifer.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => window.location.href='/videos'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Chef TV →</button>
              <button onClick={() => window.location.href='/chef'} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Ask Chef Jennifer →</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Three-way tab pill row — mirrors the Chef TV Love/Learn
                binary pattern so the two pages speak the same tab
                vocabulary. Only one tab is active at a time; the active
                tab shows a filled color (rose / sky / amber) while the
                others are muted gray. Count pills live on each tab so
                users see "how much do I have here" at a glance. */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'love',       label: `❤️ Love (${byBucket.love.length})`,    activeCls: 'bg-rose-500 text-white'  },
                { key: 'learn',      label: `🎓 Learn (${byBucket.learn.length})`,  activeCls: 'bg-sky-500 text-white'   },
                { key: 'chef_notes', label: `📝 Notes (${notes.length})`,           activeCls: 'bg-amber-500 text-white' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                    tab === t.key ? t.activeCls : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active tab body. Each tab frames its content with its own
                soft-tint border so a user who scrolled past the pills
                still sees which bucket they're in. */}
            {tab === 'love' || tab === 'learn' ? (
              (() => {
                const b = BUCKETS.find(x => x.key === tab)
                const list = byBucket[tab]
                const c = COLOR[tab]
                return (
                  <div className={`rounded-2xl ${c.border} ${c.body} overflow-hidden shadow-sm`}>
                    <div className={`${c.header} px-3 py-2.5 flex items-center gap-2`}>
                      <span className="text-lg">{b.emoji}</span>
                      <span className={`text-sm font-bold ${c.title}`}>{b.label}</span>
                      <span className={`text-xs font-semibold ${c.pill} px-2 py-0.5 rounded-full`}>{list.length}</span>
                      {b.hint && <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">{b.hint}</span>}
                    </div>
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
                            currentBucket={tab}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })()
            ) : (
              /* Chef Notes tab — saved AI answers from Ask Chef Jennifer.
                 Not a bucket (no move-between UX), it's a separate kind
                 of content. Empty state routes users to /chef. */
              <div className={`rounded-2xl ${NOTES_COLOR.border} ${NOTES_COLOR.body} overflow-hidden shadow-sm`}>
                <div className={`${NOTES_COLOR.header} px-3 py-2.5 flex items-center gap-2`}>
                  <span className="text-lg">📝</span>
                  <span className={`text-sm font-bold ${NOTES_COLOR.title}`}>Chef Notes</span>
                  <span className={`text-xs font-semibold ${NOTES_COLOR.pill} px-2 py-0.5 rounded-full`}>{notes.length}</span>
                  <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">Saved answers from Chef Jennifer.</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {notes.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-400">No saved notes yet.</p>
                      <button onClick={() => window.location.href='/chef'} className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Ask Chef Jennifer →</button>
                    </div>
                  ) : (
                    notes.map(note => (
                      <ExpandableItem
                        key={note.id}
                        item={note}
                        emoji="💡"
                        onRemove={() => removeNote(note)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// One saved video row. Shows the video thumb + embed via <VideoItem>,
// plus a Move ▾ menu. With only 2 buckets, the "move to" target is
// always the single other bucket — one tap, no submenu needed.
function PlaybookRow({ item, onMove, onRemove, currentBucket }) {
  const other = BUCKETS.find(b => b.key !== currentBucket)
  const c = other ? COLOR[other.key] : null

  return (
    <div>
      <VideoItem video={item} onRemove={onRemove} />
      {other && c && (
        <div className="px-3 pb-2 pt-1 bg-white">
          <button
            onClick={() => onMove(other.key)}
            title={`Move to ${other.label}`}
            className={`text-xs font-semibold border-2 ${c.btnCls} rounded-lg px-2.5 py-1 hover:opacity-80`}
          >
            Move to {other.emoji} {other.label}
          </button>
        </div>
      )}
    </div>
  )
}
