'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Meal Plan — 3 buckets of "what you're cooking soon".
// To Make (⭐ amber), Maybe (📋 violet), Later (🗂 sky).
// Matching colors on the bucket frames and the move buttons so the user
// always sees where an item IS and where it would GO at a glance.
//
// Ordering:
//   - Cross-bucket moves use the emoji buttons (kept from the original UI).
//   - Within a bucket, items reorder by drag-and-drop on the ≡ handle.
//     Drag is bucket-local only — each bucket has its own SortableContext,
//     so you can't pull an item out of To Make into Maybe by dragging; you
//     still have to tap a move button for that. Keeping the two modes
//     separate means a finger-slip while re-ranking can't accidentally
//     change a meal's "when I'm cooking it" intent.
//   - On drop, the bucket's items are rewritten with dense sort_order
//     (0, 1, 2, …) in a parallel batch update. Order survives refresh
//     because we seed sort_order on load, not from a computed index.
const BUCKETS = [
  { key: 'top',   label: 'To Make', emoji: '⭐', micro: 'Your main focus for now.',    bg: 'bg-amber-100',  border: 'border-2 border-amber-400'  },
  { key: 'nice',  label: 'Maybe',   emoji: '📋', micro: 'If you get to them.',         bg: 'bg-violet-100', border: 'border-2 border-violet-400' },
  { key: 'later', label: 'Later',   emoji: '🗂',  micro: 'Still saved, not forgotten.', bg: 'bg-sky-100',    border: 'border-2 border-sky-400'    },
]

// One draggable row. Accepts the @dnd-kit hooks and wires transform/transition
// onto the outer container. The ≡ drag handle is the only drag surface — the
// title stays a plain clickable link so tapping a meal still navigates.
function SortablePick({ pick, bucketKey, onMove, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pick.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Lift the dragging row so users see it separate from siblings.
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? '0 6px 14px rgba(0,0,0,0.12)' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white rounded-xl p-2">
      {/* Dedicated drag handle — touch-friendly, keyboard accessible,
          doesn't steal clicks from the title. */}
      <button
        type="button"
        className="shrink-0 w-7 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <span className="text-base leading-none">⋮⋮</span>
      </button>
      {pick.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pick.photo_url} alt={pick.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <span className="text-lg">🍽️</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <button onClick={() => window.location.href=`/secret?recipe=${pick.recipe_id}`}
          className="font-semibold text-xs text-orange-600 truncate text-left w-full">{pick.title} →</button>
      </div>
      <div className="flex gap-1">
        {bucketKey !== 'top'   && <button onClick={() => onMove(pick, 'top')}   title="Move to To Make — your main focus for now"      className="text-xs px-1.5 py-0.5 rounded border-2 border-amber-400 text-amber-700 font-semibold">⭐</button>}
        {bucketKey !== 'nice'  && <button onClick={() => onMove(pick, 'nice')}  title="Move to Maybe — if you get to it"               className="text-xs px-1.5 py-0.5 rounded border-2 border-violet-400 text-violet-700 font-semibold">📋</button>}
        {bucketKey !== 'later' && <button onClick={() => onMove(pick, 'later')} title="Move to Later — still saved, not forgotten"     className="text-xs px-1.5 py-0.5 rounded border-2 border-sky-400 text-sky-700 font-semibold">🗂</button>}
        <button onClick={() => onRemove(pick.id)} title="Remove from Meal Plan" className="text-gray-300 hover:text-red-400 text-lg leading-none ml-1">×</button>
      </div>
    </div>
  )
}

export default function MealPlanPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState([])
  const [toast, setToast] = useState(null)

  // Pointer + touch sensors. The 8px distance gate on PointerSensor prevents
  // accidental drags when the user is just tapping a move button next to
  // the handle; TouchSensor with a short delay lets mobile users scroll
  // the page past the rows without initiating a drag every time.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function loadPicks(userId) {
    const { data } = await supabase.from('my_picks').select('*').eq('user_id', userId).order('sort_order', { ascending: true })
    setPicks(data || [])
  }

  async function moveTo(pick, bucket) {
    await supabase.from('my_picks').update({ bucket }).eq('id', pick.id)
    setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, bucket } : p))
  }

  async function removePick(id) {
    await supabase.from('my_picks').delete().eq('id', id)
    setPicks(prev => prev.filter(p => p.id !== id))
    showToast('Removed from Meal Plan')
  }

  // Persist new order within a single bucket. Rewrites sort_order densely
  // (0..n-1) and dispatches the updates in parallel — small lists, single
  // user, RLS-scoped, so the batch is safe.
  async function persistBucketOrder(bucketKey, orderedIds) {
    const updates = orderedIds.map((id, idx) =>
      supabase.from('my_picks').update({ sort_order: idx }).eq('id', id)
    )
    await Promise.all(updates)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // Figure out which bucket the active item belongs to, then only reorder
    // within that bucket. If over.id is somehow in a different bucket (can't
    // happen with per-bucket SortableContexts, but belt and suspenders), bail.
    const activePick = picks.find(p => p.id === active.id)
    const overPick   = picks.find(p => p.id === over.id)
    if (!activePick || !overPick) return
    if (activePick.bucket !== overPick.bucket) return
    const bucketKey = activePick.bucket
    const bucketPicks = picks.filter(p => p.bucket === bucketKey)
    const oldIndex = bucketPicks.findIndex(p => p.id === active.id)
    const newIndex = bucketPicks.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(bucketPicks, oldIndex, newIndex)
    // Optimistically update state: keep non-bucket items in place, substitute
    // the reordered items in the same relative slots.
    setPicks(prev => {
      // Build a new array: walk prev; whenever we hit an item in this bucket,
      // pull the next item from `reordered` instead.
      const queue = [...reordered]
      return prev.map(p => (p.bucket === bucketKey ? queue.shift() : p))
    })
    persistBucketOrder(bucketKey, reordered.map(p => p.id))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadPicks(session.user.id).finally(() => setLoading(false))
    })
  }, [])

  const topPicks   = picks.filter(p => p.bucket === 'top')
  const nicePicks  = picks.filter(p => p.bucket === 'nice')
  const laterPicks = picks.filter(p => p.bucket === 'later')

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📅 Meal Plan</h1>
            {picks.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{picks.length}</span>}
          </div>
          <button onClick={() => window.location.href='/secret'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Recipe Vault</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-4">
          <p className="text-sm text-gray-600 leading-snug">What you&apos;re cooking soon, organized your way.</p>
          <p className="text-[11px] text-gray-400 mt-1">Tip: use <span className="font-semibold">⋮⋮</span> to drag a meal up or down inside its bucket.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your meal plan...</div>
        ) : picks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 text-sm mb-4">No recipes in your meal plan yet</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.href='/cards'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Recipe Cards</button>
              <button onClick={() => window.location.href='/secret'} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold">Recipe Vault</button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-3">
              {[
                { picks: topPicks,   bucket: BUCKETS[0] },
                { picks: nicePicks,  bucket: BUCKETS[1] },
                { picks: laterPicks, bucket: BUCKETS[2] },
              ].map(({ picks: bPicks, bucket }) => bPicks.length === 0 ? null : (
                <div key={bucket.key} className={`rounded-2xl ${bucket.border} ${bucket.bg} p-3 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{bucket.emoji}</span>
                    <h3 className="text-sm font-bold text-gray-900">{bucket.label}</h3>
                    <span className="text-xs text-gray-500">({bPicks.length})</span>
                    <span className="text-xs text-gray-500 ml-auto italic">{bucket.micro}</span>
                  </div>
                  {/* Each bucket is its own SortableContext so drags never
                      escape the bucket — cross-bucket moves stay on the
                      colored emoji buttons where the user can't misfire. */}
                  <SortableContext items={bPicks.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {bPicks.map(pick => (
                        <SortablePick
                          key={pick.id}
                          pick={pick}
                          bucketKey={bucket.key}
                          onMove={moveTo}
                          onRemove={removePick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </main>
    </div>
  )
}
