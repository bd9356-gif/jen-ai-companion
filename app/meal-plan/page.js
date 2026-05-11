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
//
// Two visual modes (May 2026): main and side. Bill's KISS workflow plans
// dinner as main → sides under it. The "↳ Side" toggle below the title
// flips a row to side mode: indented, smaller thumb, softer styling, so
// the structure of "main + its sides" reads visually inside the bucket.
// Drag-reorder still works, side rows keep all their move/remove
// buttons — the flag is purely cosmetic + organizational.
function SortablePick({ pick, bucketKey, onMove, onRemove, onToggleSide }) {
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

  const isSide = !!pick.is_side
  const rowCls = isSide
    ? 'flex items-center gap-2 bg-white/70 rounded-xl p-1.5 ml-6 border-l-2 border-gray-200'
    : 'flex items-center gap-2 bg-white rounded-xl p-2'
  const photoCls = isSide ? 'w-7 h-7 rounded-md' : 'w-10 h-10 rounded-lg'
  const photoFallbackCls = isSide
    ? 'w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center shrink-0'
    : 'w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0'
  const titleCls = isSide
    ? 'font-medium text-xs text-gray-600 truncate text-left w-full'
    : 'font-semibold text-xs text-orange-600 truncate text-left w-full'

  return (
    <div ref={setNodeRef} style={style} className={rowCls}>
      {/* Dedicated drag handle — touch-friendly, keyboard accessible,
          doesn't steal clicks from the title. */}
      <button
        type="button"
        className={`shrink-0 ${isSide ? 'w-5 h-7' : 'w-7 h-10'} flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none`}
        title="Drag to reorder"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <span className={`leading-none ${isSide ? 'text-xs' : 'text-base'}`}>⋮⋮</span>
      </button>
      {pick.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={pick.photo_url} alt={pick.title} className={`${photoCls} object-cover shrink-0`} />
      ) : (
        <div className={photoFallbackCls}>
          <span className={isSide ? 'text-sm' : 'text-lg'}>🍽️</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <button onClick={() => window.location.href=`/secret?recipe=${pick.recipe_id}`}
          className={titleCls}>{pick.title} →</button>
      </div>
      <div className="flex gap-1 items-center">
        {/* Side toggle — flips the row's visual treatment. ↳ to mark
            as side, ↑ to flip back to main. Tooltip explains the
            framing so it's discoverable without needing to read docs. */}
        <button
          onClick={() => onToggleSide(pick)}
          title={isSide ? 'Mark as main' : 'Mark as side'}
          aria-label={isSide ? 'Mark as main' : 'Mark as side'}
          className={`text-xs px-1.5 py-0.5 rounded border font-semibold transition-colors ${
            isSide
              ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
          }`}
        >
          {isSide ? '↑' : '↳'}
        </button>
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
  // Mise en Place — when set, the modal shows the prep list for this
  // meal. Shape: { mealNumber, picks: [main, ...sides] }. recipes is
  // populated by openMise() with the full personal_recipes rows
  // (ingredients + title) so the modal can render without re-fetching.
  // checked is a per-line tick state, scoped to this modal session
  // (clears on close — it's a working surface, not persisted).
  const [miseMeal, setMiseMeal] = useState(null)
  const [miseRecipes, setMiseRecipes] = useState([])
  const [miseChecked, setMiseChecked] = useState(new Set())
  const [miseLoading, setMiseLoading] = useState(false)
  // Print uses an in-page hidden container instead of a popup window
  // so iOS Safari doesn't strand a popup tab when the user dismisses
  // the print sheet. Mirror of the Shopping List pattern.
  const [misePrintText, setMisePrintText] = useState('')

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

  // Move a pick to another bucket and place it LAST in the destination
  // (May 2026, Bill's ask). Promoted items shouldn't crowd the top of
  // a carefully-ordered list — they go to the back of the line and the
  // user can drag them up if they want to push them forward.
  //
  // Two-step state update: (1) flip bucket + bump sort_order on the
  // moved row, (2) re-sort the whole picks array so the visual order
  // matches the DB order. Without (2), the array still has the moved
  // item wherever it was before, and the buckets render in stale
  // order — which is what made it look like the item landed at the
  // TOP of the destination instead of the bottom.
  async function moveTo(pick, bucket) {
    if (pick.bucket === bucket) return
    const destItems = picks.filter(p => p.bucket === bucket && p.id !== pick.id)
    const maxOrder = destItems.reduce((m, p) => Math.max(m, p.sort_order ?? 0), -1)
    const newOrder = maxOrder + 1
    await supabase.from('my_picks').update({ bucket, sort_order: newOrder }).eq('id', pick.id)
    setPicks(prev => {
      const updated = prev.map(p => p.id === pick.id ? { ...p, bucket, sort_order: newOrder } : p)
      // Re-sort by sort_order ASC so the moved row visually lands
      // at the end of its new bucket. picks is filtered (not sorted)
      // when the buckets render, so the array's own order drives the
      // displayed order.
      return [...updated].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    })
  }

  async function removePick(id) {
    await supabase.from('my_picks').delete().eq('id', id)
    setPicks(prev => prev.filter(p => p.id !== id))
    showToast('Removed from Meal Plan')
  }

  // Open the Mise en Place modal for one meal — main + all its
  // sides. Fetches the recipe rows so we can render full ingredient
  // lists (my_picks rows only carry title/photo, not ingredients).
  // Idempotent: re-tapping while the modal is open just refreshes.
  async function openMise(mealNumber, mealPicks) {
    setMiseMeal({ mealNumber, picks: mealPicks })
    setMiseChecked(new Set())
    setMiseLoading(true)
    const ids = mealPicks.map(p => p.recipe_id).filter(Boolean)
    if (ids.length === 0) {
      setMiseRecipes([])
      setMiseLoading(false)
      return
    }
    const { data } = await supabase
      .from('personal_recipes')
      .select('id, title, ingredients')
      .in('id', ids)
    // Preserve meal-pick order (main first, then sides) when
    // rendering the recipe blocks, regardless of DB row order.
    const byId = new Map((data || []).map(r => [r.id, r]))
    const ordered = mealPicks
      .map(p => byId.get(p.recipe_id))
      .filter(Boolean)
    setMiseRecipes(ordered)
    setMiseLoading(false)
  }

  function closeMise() {
    setMiseMeal(null)
    setMiseRecipes([])
    setMiseChecked(new Set())
  }

  function toggleMiseLine(key) {
    setMiseChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Build a plain-text mise en place. Used by both Copy-to-clipboard
  // and Print so the two paths show identical output. Format mirrors
  // the on-screen layout: header, then each recipe with a [ ] / [x]
  // checkbox per ingredient. Checkbox state reflects the current
  // miseChecked set so a half-prepped list copies/prints with the
  // user's progress preserved.
  function buildMiseText() {
    if (!miseMeal || !miseRecipes.length) return ''
    const lines = [`Mise en Place — Meal ${miseMeal.mealNumber}`, '']
    miseRecipes.forEach((recipe, ri) => {
      lines.push(`${ri === 0 ? '🍽' : '↳'} ${recipe.title}`)
      const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
      if (ings.length === 0) {
        lines.push('  (no ingredients listed)')
      } else {
        ings.forEach((ing, idx) => {
          const measure = (typeof ing === 'object' && ing?.measure) || ''
          const name = (typeof ing === 'object' && ing?.name) || (typeof ing === 'string' ? ing : '')
          const text = [measure, name].filter(Boolean).join(' ').trim() || '(no text)'
          const key = `${recipe.id}-${idx}`
          const prefix = miseChecked.has(key) ? '[x]' : '[ ]'
          lines.push(`  ${prefix} ${text}`)
        })
      }
      lines.push('')
    })
    return lines.join('\n').trim()
  }

  async function copyMise() {
    const text = buildMiseText()
    if (!text) { showToast('Nothing to copy'); return }
    try {
      await navigator.clipboard.writeText(text)
      showToast('Mise en place copied ✓')
    } catch {
      showToast('Copy failed — try Print instead')
    }
  }

  function printMise() {
    const text = buildMiseText()
    if (!text) { showToast('Nothing to print'); return }
    setMisePrintText(text)
    // One-tick wait so the hidden print container has rendered with
    // the text before the print dialog opens. afterprint fires whether
    // the user prints or cancels (every browser, including iOS Safari)
    // so the container is cleared either way. Same in-page pattern as
    // the Shopping List — popup-based print previews can leave a
    // stranded popup tab on iOS.
    setTimeout(() => {
      const cleanup = () => { setMisePrintText(''); window.removeEventListener('afterprint', cleanup) }
      window.addEventListener('afterprint', cleanup)
      window.print()
      // Belt-and-braces fallback in case afterprint never fires
      // (older mobile browsers occasionally swallow it).
      setTimeout(() => { setMisePrintText(''); window.removeEventListener('afterprint', cleanup) }, 5000)
    }, 50)
  }

  // Flip a pick between main and side (purely cosmetic — see
  // SortablePick comment + migration 018). Optimistic state update;
  // the DB write happens in the background and rolls back on error.
  async function toggleSide(pick) {
    const next = !pick.is_side
    setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, is_side: next } : p))
    const { error } = await supabase.from('my_picks').update({ is_side: next }).eq('id', pick.id)
    if (error) {
      // Roll back on failure.
      setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, is_side: !next } : p))
      showToast('Could not update — try again')
    }
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
          <p className="text-base text-gray-600 leading-snug">What you&apos;re cooking soon, organized your way.</p>
          <p className="text-xs text-gray-400 mt-1">Tip: drag with <span className="font-semibold">⋮⋮</span> to reorder · tap <span className="font-semibold">↳</span> to mark a side dish</p>
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
                      colored emoji buttons where the user can't misfire.
                      For ⭐ To Make, picks are auto-grouped into "Meal 1,
                      Meal 2…" sections (each main starts a new meal; sides
                      attach to the most recent main). Other buckets stay
                      flat — they're not the weekly plan, just storage. */}
                  <SortableContext items={bPicks.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {bucket.key === 'top' ? (
                      <ToMakeMeals
                        picks={bPicks}
                        bucketKey={bucket.key}
                        onMove={moveTo}
                        onRemove={removePick}
                        onToggleSide={toggleSide}
                        onMise={openMise}
                      />
                    ) : (
                      <div className="space-y-2">
                        {bPicks.map(pick => (
                          <SortablePick
                            key={pick.id}
                            pick={pick}
                            bucketKey={bucket.key}
                            onMove={moveTo}
                            onRemove={removePick}
                            onToggleSide={toggleSide}
                          />
                        ))}
                      </div>
                    )}
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </main>

      {/* 🥣 Mise en Place modal — full-screen overlay listing every
          ingredient from a meal (main + sides), grouped by recipe with
          a checkbox per line. Tap-checked lines strike-through so the
          cook can tick prep work as it gets done. Local-state only —
          checks reset when the modal closes; this is a working surface
          for a single cook session, not persisted. */}
      {miseMeal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-6"
          onClick={closeMise}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">
                  🥣 Mise en Place
                </p>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  Meal {miseMeal.mealNumber} — prep list
                </h2>
              </div>
              <button
                onClick={closeMise}
                aria-label="Close"
                className="shrink-0 text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>
            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {miseLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading prep list…</p>
              ) : miseRecipes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No ingredients found for this meal.</p>
              ) : (
                <div className="space-y-5">
                  {miseRecipes.map((recipe, ri) => {
                    const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
                    return (
                      <div key={recipe.id}>
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          {ri === 0 ? '🍽 ' : '↳ '}{recipe.title}
                        </p>
                        {ings.length === 0 ? (
                          <p className="text-xs text-gray-400 italic pl-4">No ingredients listed</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {ings.map((ing, idx) => {
                              const measure = (typeof ing === 'object' && ing?.measure) || ''
                              const name = (typeof ing === 'object' && ing?.name) || (typeof ing === 'string' ? ing : '')
                              const text = [measure, name].filter(Boolean).join(' ').trim()
                              const key = `${recipe.id}-${idx}`
                              const checked = miseChecked.has(key)
                              return (
                                <li key={key}>
                                  <button
                                    onClick={() => toggleMiseLine(key)}
                                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                                  >
                                    <span className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 bg-white'}`}>
                                      {checked && <span className="text-xs">✓</span>}
                                    </span>
                                    <span className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                      {measure && <span className="font-semibold">{measure} </span>}
                                      {name}
                                      {!text && <span className="italic text-gray-400">(no text)</span>}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Footer — counter on the left, action buttons on the
                right (Copy, Print, Done). Copy + Print use the same
                buildMiseText() so the output matches the on-screen
                layout. */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-gray-500 shrink-0">
                {miseChecked.size} / {miseRecipes.reduce((n, r) => n + (Array.isArray(r.ingredients) ? r.ingredients.length : 0), 0)} prepped
              </p>
              <div className="flex items-center gap-2">
                {miseRecipes.length > 0 && (
                  <button
                    onClick={copyMise}
                    title="Copy as plain text — paste into Notes / Reminders / etc."
                    className="text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50"
                  >
                    📋 Copy
                  </button>
                )}
                {miseRecipes.length > 0 && (
                  <button
                    onClick={printMise}
                    title="Print this prep list"
                    className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                  >
                    🖨️ Print
                  </button>
                )}
                <button
                  onClick={closeMise}
                  className="text-sm font-semibold bg-amber-500 text-white rounded-xl px-4 py-2 hover:bg-amber-600"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print container — invisible in normal view; becomes the only
          visible element during print via the @media print rules below.
          misePrintText is cleared on afterprint so this stays empty
          between prints. Same pattern as the Shopping List's printer. */}
      <div id="print-mise" aria-hidden="true" style={{ display: misePrintText ? 'block' : 'none' }}>
        <pre style={{
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: '1.7',
          margin: 0,
          padding: '24px',
          color: '#111',
        }}>{misePrintText}</pre>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-mise, #print-mise * { visibility: visible !important; }
          #print-mise {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

// Auto-group "To Make" picks into Meal 1, Meal 2, ... where each main
// starts a new meal and any sides that follow attach to that meal.
// Sides that appear before any main go in a "🌾 Sides" pre-section
// at the top so nothing gets lost. Visual: small "MEAL N" eyebrow +
// a thin amber divider between meals.
//
// The drag-reorder + move/remove buttons all keep working — this is
// purely a render-time transformation of the same picks array.
function ToMakeMeals({ picks, bucketKey, onMove, onRemove, onToggleSide, onMise }) {
  // Walk top-to-bottom; collect (main, sides[]) tuples. Sides before
  // the first main go in `orphans`.
  const orphans = []
  const meals = []
  let current = null
  for (const p of picks) {
    if (p.is_side) {
      if (current) current.sides.push(p)
      else orphans.push(p)
    } else {
      current = { main: p, sides: [] }
      meals.push(current)
    }
  }

  // Empty bucket — render nothing; the parent already shows the bucket
  // header + count, so an empty inner section reads cleanly.
  if (!picks.length) return <div className="space-y-2" />

  return (
    <div className="space-y-3">
      {orphans.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">🌾 Sides (no main yet)</p>
          {orphans.map(pick => (
            <SortablePick
              key={pick.id}
              pick={pick}
              bucketKey={bucketKey}
              onMove={onMove}
              onRemove={onRemove}
              onToggleSide={onToggleSide}
            />
          ))}
        </div>
      )}
      {meals.map((meal, i) => (
        <div key={meal.main.id} className={i > 0 ? 'pt-3 border-t-2 border-amber-300/50' : ''}>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">
              🍽 Meal {i + 1}
            </p>
            {/* 🥣 Mise en Place — French chef move: prep all the
                ingredients before you start cooking. Tap to open a
                modal with every ingredient from this meal's main +
                sides, with a checkbox per line so you tick as you
                prep. Works on a phone in the kitchen. */}
            <button
              onClick={() => onMise(i + 1, [meal.main, ...meal.sides])}
              title="Mise en place — prep list for this meal"
              className="text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-300 rounded-md px-2 py-0.5 hover:bg-amber-50"
            >
              🥣 Mise
            </button>
          </div>
          <div className="space-y-1.5">
            <SortablePick
              pick={meal.main}
              bucketKey={bucketKey}
              onMove={onMove}
              onRemove={onRemove}
              onToggleSide={onToggleSide}
            />
            {meal.sides.map(side => (
              <SortablePick
                key={side.id}
                pick={side}
                bucketKey={bucketKey}
                onMove={onMove}
                onRemove={onRemove}
                onToggleSide={onToggleSide}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
