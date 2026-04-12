'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
      .order('created_at', { ascending: false })
    setPicks(data || [])
    setLoading(false)
  }

  async function moveTo(pick, bucket) {
    await supabase.from('my_picks').update({ bucket }).eq('id', pick.id)
    setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, bucket } : p))
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

  const today = picks.filter(p => p.bucket === 'today')
  const next = picks.filter(p => p.bucket === 'next')

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
              <button onClick={() => window.location.href='/cards'}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold">MyRecipe Cards</button>
              <button onClick={() => window.location.href='/secret'}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">MyRecipeVault</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TODAY */}
            {today.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">☀️</span>
                  <h2 className="text-sm font-bold text-gray-900">Today</h2>
                  <span className="text-xs text-gray-400">({today.length})</span>
                </div>
                <div className="space-y-3">
                  {today.map(pick => (
                    <PickCard key={pick.id} pick={pick} onMoveTo={moveTo} onRemove={remove} />
                  ))}
                </div>
              </div>
            )}

            {/* NEXT */}
            {next.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📋</span>
                  <h2 className="text-sm font-bold text-gray-900">Next</h2>
                  <span className="text-xs text-gray-400">({next.length})</span>
                </div>
                <div className="space-y-3">
                  {next.map(pick => (
                    <PickCard key={pick.id} pick={pick} onMoveTo={moveTo} onRemove={remove} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

function PickCard({ pick, onMoveTo, onRemove }) {
  const isToday = pick.bucket === 'today'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex gap-3 p-4">
        {pick.photo_url ? (
          <img src={pick.photo_url} alt={pick.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <span className="text-2xl">🍽️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate mb-1">{pick.title}</p>
          {pick.category && <p className="text-xs text-gray-400 mb-2">{pick.category}</p>}
          <div className="flex gap-2">
            <button onClick={() => onMoveTo(pick, isToday ? 'next' : 'today')}
              className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${isToday ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-orange-600 text-white border-orange-600'}`}>
              {isToday ? '→ Move to Next' : '☀️ Move to Today'}
            </button>
          </div>
        </div>
        <button onClick={() => onRemove(pick.id)}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 text-2xl self-center">×</button>
      </div>
    </div>
  )
}