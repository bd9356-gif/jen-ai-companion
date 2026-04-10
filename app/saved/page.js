'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TYPE_LABELS = {
  recipe: { label: 'Recipe', color: 'bg-orange-50 text-orange-700' },
  video: { label: 'Video', color: 'bg-red-50 text-red-700' },
  ai_recipe: { label: 'AI Recipe', color: 'bg-purple-50 text-purple-700' },
  ai_answer: { label: 'AI Answer', color: 'bg-blue-50 text-blue-700' },
}

export default function FavoritesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadFavorites(session.user.id)
    })
  }, [])

  async function loadFavorites(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('is_in_vault', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function addToVault(item) {
    await supabase
      .from('favorites')
      .update({ is_in_vault: true })
      .eq('id', item.id)

    // Also add to personal_recipes if it's a recipe type
    if (item.type === 'recipe' || item.type === 'ai_recipe') {
      const meta = item.metadata || {}
      await supabase.from('personal_recipes').insert({
        user_id: user.id,
        title: item.title,
        description: meta.description || '',
        ingredients: meta.ingredients || [],
        instructions: meta.instructions || '',
        category: meta.category || 'My Recipes',
        tags: meta.tags || [],
        photo_url: item.thumbnail_url || '',
        family_notes: `Added from My Favorites — ${item.source || ''}`,
      })
    }

    setItems(prev => prev.filter(i => i.id !== item.id))
    showToast('Added to your Vault ✓')
  }

  async function removeFromFavorites(id) {
    await supabase.from('favorites').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Removed from Favorites')
  }

  async function batchAddToVault() {
    const toAdd = items.filter(i => selected.has(i.id))
    for (const item of toAdd) {
      await addToVault(item)
    }
    setSelected(new Set())
    setBatchMode(false)
  }

  async function batchRemove() {
    for (const id of selected) {
      await supabase.from('favorites').delete().eq('id', id)
    }
    setItems(prev => prev.filter(i => !selected.has(i.id)))
    setSelected(new Set())
    setBatchMode(false)
    showToast('Removed from Favorites')
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const types = ['all', ...new Set(items.map(i => i.type))]

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">❤️ My Favorites</h1>
            </div>
            <button
              onClick={() => { setBatchMode(!batchMode); setSelected(new Set()) }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${batchMode ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {batchMode ? 'Cancel' : 'Select'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">A holding drawer for recipes, videos, and AI creations you want to review before adding them to your Vault.</p>

          {/* Type filter tabs */}
          {types.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === t ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t === 'all' ? 'All' : TYPE_LABELS[t]?.label || t}
                  {t === 'all' ? ` (${items.length})` : ` (${items.filter(i => i.type === t).length})`}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-32">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🗂️</div>
            <p className="text-gray-700 font-semibold mb-2">Nothing saved yet</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Recipes, videos, and AI creations you save while exploring will land here for review.
            </p>
            <a href="/explore" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Explore Recipes
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-colors ${selected.has(item.id) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
              >
                <div className="flex gap-3 p-3">
                  {/* Checkbox in batch mode */}
                  {batchMode && (
                    <button onClick={() => toggleSelect(item.id)}
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center self-center transition-colors ${selected.has(item.id) ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-300'}`}>
                      {selected.has(item.id) && <span className="text-xs">✓</span>}
                    </button>
                  )}

                  {/* Thumbnail */}
                  <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-orange-50">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {item.type === 'video' ? '🎬' : item.type?.includes('ai') ? '🤖' : '🍽️'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.title}</p>
                      {!batchMode && (
                        <button onClick={() => removeFromFavorites(item.id)}
                          className="shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </div>

                    {/* Type badge */}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${TYPE_LABELS[item.type]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[item.type]?.label || item.type}
                    </span>

                    {/* Actions */}
                    {!batchMode && (
                      <div className="flex gap-2">
                        {item.ref_id && item.type === 'recipe' && (
                          <a href={`/recipes/${item.ref_id}`}
                            className="text-xs text-orange-600 font-semibold hover:text-orange-700">
                            View →
                          </a>
                        )}
                        <button onClick={() => addToVault(item)}
                          className="text-xs bg-orange-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors">
                          Add to Vault
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Batch action bar */}
      {batchMode && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button onClick={batchAddToVault}
              className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Add {selected.size} to Vault
            </button>
            <button onClick={batchRemove}
              className="flex-1 py-3 bg-red-50 text-red-500 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors">
              Remove {selected.size}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}