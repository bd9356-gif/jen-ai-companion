'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Meal Plan — 3 buckets of "what you're cooking soon".
// To Make (⭐ amber), Maybe (📋 violet), Later (🗂 sky).
// Matching colors on the bucket frames and the move buttons so the user
// always sees where an item IS and where it would GO at a glance.
const BUCKETS = [
  { key: 'top',   label: 'To Make', emoji: '⭐', micro: 'Your main focus for now.',    bg: 'bg-amber-100',  border: 'border-2 border-amber-400'  },
  { key: 'nice',  label: 'Maybe',   emoji: '📋', micro: 'If you get to them.',         bg: 'bg-violet-100', border: 'border-2 border-violet-400' },
  { key: 'later', label: 'Later',   emoji: '🗂',  micro: 'Still saved, not forgotten.', bg: 'bg-sky-100',    border: 'border-2 border-sky-400'    },
]

export default function MealPlanPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState([])
  const [toast, setToast] = useState(null)

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
                <div className="space-y-2">
                  {bPicks.map(pick => (
                    <div key={pick.id} className="flex items-center gap-3 bg-white rounded-xl p-2">
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
                        {bucket.key !== 'top'   && <button onClick={() => moveTo(pick, 'top')}   title="Move to To Make — your main focus for now"      className="text-xs px-1.5 py-0.5 rounded border-2 border-amber-400 text-amber-700 font-semibold">⭐</button>}
                        {bucket.key !== 'nice'  && <button onClick={() => moveTo(pick, 'nice')}  title="Move to Maybe — if you get to it"               className="text-xs px-1.5 py-0.5 rounded border-2 border-violet-400 text-violet-700 font-semibold">📋</button>}
                        {bucket.key !== 'later' && <button onClick={() => moveTo(pick, 'later')} title="Move to Later — still saved, not forgotten"     className="text-xs px-1.5 py-0.5 rounded border-2 border-sky-400 text-sky-700 font-semibold">🗂</button>}
                        <button onClick={() => removePick(pick.id)} title="Remove from Meal Plan" className="text-gray-300 hover:text-red-400 text-lg leading-none ml-1">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
