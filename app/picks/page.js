'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BUCKETS = [
  { key: 'top',  label: 'Top Picks',    emoji: '⭐', micro: 'Your main focus for now.', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { key: 'nice', label: 'Nice-to-Have', emoji: '📋', micro: 'If you get to them.',       bg: 'bg-gray-50',   border: 'border-gray-200'  },
  { key: 'later', label: 'Later',       emoji: '🗂',  micro: 'Still saved, not forgotten.', bg: 'bg-blue-50/50', border: 'border-blue-100' },
]

export default function MyPicksPage() {
  const [user, setUser] = useState(null)
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadPicks(session.user.id)
    })
  }, [])

  async function loadPicks(userId) {
    const { data } = await supabase
      .from('my_picks')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setPicks(data || [])
    setLoading(false)
  }

  async function moveTo(pick, bucket) {
    await supabase.from('my_picks').update({ bucket }).eq('id', pick.id)
    setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, bucket } : p))
    showToast(`Moved to ${BUCKETS.find(b => b.key === bucket)?.label} ✓`)
  }

  async function remove(id) {
    await supabase.from('my_picks').delete().eq('id', id)
    setPicks(prev => prev.filter(p => p.id !== id))
    showToast('Removed from MyPicks')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const topPicks = picks.filter(p => p.bucket === 'top')
  const nicePicks = picks.filter(p => p.bucket === 'nice')
  const laterPicks = picks.filter(p => p.bucket === 'later')

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🎯 MyPicks</h1>
            {picks.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{picks.length}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.href='/cards'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">MyRecipe Cards</button>
            <button onClick={() => window.location.href='/secret'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">MyRecipeVault</button>
          </div>
        </div>
        <p className="text-xs text-orange-500 font-semibold text-center pb-2">Your menu, your way — no pressure.</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your picks...</div>
        ) : picks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-gray-700 font-semibold mb-2">No picks yet</p>
            <p className="text-gray-400 text-sm mb-6">Add recipes from MyRecipe Cards or MyRecipeVault</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.href='/cards'} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold">MyRecipe Cards</button>
              <button onClick={() => window.location.href='/secret'} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">MyRecipeVault</button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* TOP PICKS */}
            <Section
              bucket={BUCKETS[0]}
              picks={topPicks}
              maxHighlight={3}
              onMoveTo={moveTo}
              onRemove={remove}
              moveUpLabel={null}
              moveDownLabel="→ Nice-to-Have"
              moveDownBucket="nice"
            />

            {/* NICE-TO-HAVE */}
            <Section
              bucket={BUCKETS[1]}
              picks={nicePicks}
              onMoveTo={moveTo}
              onRemove={remove}
              moveUpLabel="↑ Top Picks"
              moveUpBucket="top"
              moveDownLabel="↓ Later"
              moveDownBucket="later"
            />

            {/* LATER */}
            <Section
              bucket={BUCKETS[2]}
              picks={laterPicks}
              onMoveTo={moveTo}
              onRemove={remove}
              moveUpLabel="↑ Nice-to-Have"
              moveUpBucket="nice"
              moveDownLabel={null}
              compact={true}
            />

          </div>
        )}
      </main>
    </div>
  )
}

function Section({ bucket, picks, onMoveTo, onRemove, moveUpLabel, moveUpBucket, moveDownLabel, moveDownBucket, maxHighlight, compact }) {
  if (picks.length === 0) return null
  return (
    <div>
      <div className={`rounded-2xl border ${bucket.border} ${bucket.bg} p-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{bucket.emoji}</span>
          <h2 className="text-sm font-bold text-gray-900">{bucket.label}</h2>
          <span className="text-xs text-gray-400">({picks.length})</span>
        </div>
        <p className="text-xs text-gray-400 italic mb-4">{bucket.micro}</p>
        <div className="space-y-3">
          {picks.map((pick, i) => (
            <PickCard
              key={pick.id}
              pick={pick}
              highlighted={maxHighlight ? i < maxHighlight : false}
              compact={compact}
              onMoveTo={onMoveTo}
              onRemove={onRemove}
              moveUpLabel={moveUpLabel}
              moveUpBucket={moveUpBucket}
              moveDownLabel={moveDownLabel}
              moveDownBucket={moveDownBucket}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PickCard({ pick, highlighted, compact, onMoveTo, onRemove, moveUpLabel, moveUpBucket, moveDownLabel, moveDownBucket }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${highlighted ? 'shadow-md' : 'shadow-sm'}`}>
      <div className={`flex gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        {pick.photo_url ? (
          <img src={pick.photo_url} alt={pick.title}
            className={`rounded-xl object-cover shrink-0 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`} />
        ) : (
          <div className={`rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <span className={compact ? 'text-xl' : 'text-2xl'}>🍽️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm mb-1' : 'mb-1'}`}>{pick.title}</p>
          {pick.category && <p className="text-xs text-gray-400 mb-2">{pick.category}</p>}
          <div className="flex gap-2 flex-wrap">
            {moveUpLabel && (
              <button onClick={() => onMoveTo(pick, moveUpBucket)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                {moveUpLabel}
              </button>
            )}
            {moveDownLabel && (
              <button onClick={() => onMoveTo(pick, moveDownBucket)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors">
                {moveDownLabel}
              </button>
            )}
            {!moveUpLabel && !moveDownLabel && (
              <button onClick={() => onMoveTo(pick, 'nice')}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
                ↑ Move to Nice-to-Have
              </button>
            )}
          </div>
        </div>
        <button onClick={() => onRemove(pick.id)}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 text-2xl self-center">×</button>
      </div>
    </div>
  )
}