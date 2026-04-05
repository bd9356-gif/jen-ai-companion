'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PINNED_KEY = 'recipe_cards_pinned'

export default function CardsPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [search, setSearch] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [pinned, setPinned] = useState([]) // array of recipe ids

  useEffect(() => {
    // Load pinned ids from localStorage
    const saved = localStorage.getItem(PINNED_KEY)
    if (saved) setPinned(JSON.parse(saved))

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      loadRecipes(session.user.id)
    })
  }, [])

  function togglePin(id) {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  async function loadRecipes(userId) {
    const { data } = await supabase
      .from('personal_recipes')
      .select('id, title, category, ingredients, photo_url, servings, tags, description')
      .eq('user_id', userId)
      .order('title')
    setRecipes(data || [])
    setLoading(false)
  }

  // When not in select mode: show pinned first, then rest; when pinned is empty show all
  const pinnedRecipes = recipes.filter(r => pinned.includes(r.id))
  const unpinnedRecipes = recipes.filter(r => !pinned.includes(r.id))
  const displayRecipes = pinned.length > 0 && !selectMode ? pinnedRecipes : recipes

  const filtered = displayRecipes.filter(r =>
    search === '' || r.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── CARD DETAIL VIEW ──
  if (viewing) {
    const ingredients = viewing.ingredients || []
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Cards</button>
            <a href="/secret" className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">
              Full Recipe →
            </a>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 pb-16">
          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* Card header */}
            <div className="bg-orange-700 px-5 py-3 flex items-center justify-between">
              <span style={{fontSize:'11px'}} className="text-orange-200 font-semibold tracking-wider uppercase">My Recipe Cards</span>
              <span style={{fontSize:'16px'}}>🃏</span>
            </div>

            {/* Photo if available */}
            {viewing.photo_url && (
              <div style={{height:'160px'}} className="overflow-hidden">
                <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Title and meta */}
            <div className="px-5 pt-5 pb-3">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{viewing.title}</h1>
              <div className="flex gap-2 flex-wrap">
                {viewing.category && (
                  <span className="text-xs text-gray-400">{viewing.category}</span>
                )}
                {viewing.servings && (
                  <span className="text-xs text-gray-400">· {viewing.servings} servings</span>
                )}
                {(viewing.tags || []).slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-orange-500">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="px-5 pb-5">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ingredients</p>
                {ingredients.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No ingredients listed</p>
                ) : (
                  <ul className="space-y-0">
                    {ingredients.map((ing, i) => (
                      <li key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-orange-400 shrink-0 mt-0.5" style={{fontSize:'12px'}}>•</span>
                        <span className="text-sm text-gray-700">
                          {ing.measure && (
                            <span className="font-semibold text-gray-900">{ing.measure} </span>
                          )}
                          {ing.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">From MyRecipes</span>
              <a href="/secret" className="text-xs font-semibold text-orange-600">
                View full recipe →
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🃏 My Recipe Cards</h1>
            </div>
            <button
              onClick={() => setSelectMode(s => !s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${selectMode ? 'bg-orange-600 text-white border-orange-600' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          </div>
          {selectMode ? (
            <p className="text-xs text-orange-600 mb-3">Tap recipes to pin them to your card view. Pinned: {pinned.length}</p>
          ) : (
            <p className="text-xs text-gray-400 mb-3">
              {pinned.length > 0 ? `Showing ${pinnedRecipes.length} pinned cards — tap Select to change` : 'Your recipes, beautifully carded — just the title and ingredients.'}
            </p>
          )}
          <input
            type="text"
            placeholder="Search your cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your cards...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🃏</p>
            <p className="text-gray-700 font-semibold mb-2">No recipe cards yet</p>
            <p className="text-gray-400 text-sm mb-6">Add recipes to MyRecipes and they'll appear here as cards</p>
            <a href="/secret" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Go to MyRecipes
            </a>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{filtered.length} {filtered.length === 1 ? 'card' : 'cards'}{selectMode ? ' — tap to select' : pinned.length > 0 ? ' pinned' : ''}</p>
            <div className="space-y-3">
              {filtered.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => selectMode ? togglePin(recipe.id) : setViewing(recipe)}
                  className={`w-full text-left bg-white rounded-2xl overflow-hidden transition-colors border-2 ${
                    selectMode && pinned.includes(recipe.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <div className="bg-orange-700 px-4 py-2 flex items-center justify-between">
                    <span style={{fontSize:'10px'}} className="text-orange-200 font-semibold tracking-wider uppercase">Recipe Card</span>
                    {selectMode ? (
                      <span style={{fontSize:'16px'}}>{pinned.includes(recipe.id) ? '✅' : '⬜'}</span>
                    ) : (
                      <span style={{fontSize:'14px'}}>🃏</span>
                    )}
                  </div>
                  <div className="flex gap-3 p-4">
                    {recipe.photo_url ? (
                      <img src={recipe.photo_url} alt={recipe.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                        <span style={{fontSize:'22px'}}>🍽️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{recipe.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {recipe.category || 'Recipe'}
                        {recipe.servings ? ` · ${recipe.servings} servings` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(recipe.ingredients || []).length} ingredients
                      </p>
                    </div>
                    {!selectMode && <span className="text-gray-300 text-xl self-center">→</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}