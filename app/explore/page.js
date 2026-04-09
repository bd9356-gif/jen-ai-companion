'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = ['All', 'Beef', 'Chicken', 'Dessert', 'Lamb', 'Pasta', 'Pork', 'Seafood', 'Vegan', 'Vegetarian', 'Breakfast', 'Starter', 'Side']

export default function ExplorePage() {
  const [mode, setMode] = useState('swipe')
  const [recipes, setRecipes] = useState([])
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  function handleCategoryChange(newCat) {
    setCategory(newCat)
    setSwipeIndex(0)
    setSavedThisSession(0)
    setSkippedThisSession(0)
    setHistory([])
  }

  // Swipe state
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [swipeDir, setSwipeDir] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [savedThisSession, setSavedThisSession] = useState(0)
  const [skippedThisSession, setSkippedThisSession] = useState(0)
  const [history, setHistory] = useState([]) // for rewind
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadSaved(session.user.id)
      }
    })
    loadRecipes()
  }, [])

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, category, cuisine, thumbnail_url, youtube_url')
      .order('title')
      .range(0, 4999)
    const shuffled = (data || []).sort(() => Math.random() - 0.5)
    setRecipes(shuffled)
    const { data: meta } = await supabase
      .from('recipe_metadata')
      .select('recipe_id, difficulty_level, ai_summary')
      .range(0, 4999)
    const metaMap = {}
    ;(meta || []).forEach(m => { metaMap[m.recipe_id] = m })
    setMetadata(metaMap)
    setLoading(false)
  }

  async function loadSaved(userId) {
    const { data } = await supabase.from('saved_recipes').select('recipe_id').eq('user_id', userId)
    setSavedIds(new Set((data || []).map(s => s.recipe_id)))
  }

  async function saveRecipe(recipeId) {
    if (!user) { window.location.href = '/login'; return }
    if (!savedIds.has(recipeId)) {
      await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: recipeId })
      setSavedIds(prev => new Set([...prev, recipeId]))
    }
  }

  async function unsaveRecipe(recipeId) {
    if (!user) return
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setSavedIds(prev => { const n = new Set(prev); n.delete(recipeId); return n })
  }

  // Swipe handlers — prevent page scroll during horizontal drag
  function onDragStart(e) {
    isDragging.current = false
    dragStartX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    dragStartY.current = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
    setDragging(true)
  }

  function onDragMove(e) {
    if (!dragging) return
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
    const dx = clientX - dragStartX.current
    const dy = clientY - dragStartY.current
    // Only treat as horizontal drag if moving more horizontally than vertically
    if (Math.abs(dx) > Math.abs(dy)) {
      isDragging.current = true
      if (e.cancelable) e.preventDefault()
      setDragX(dx)
    }
  }

  async function onDragEnd() {
    if (!dragging) return
    setDragging(false)
    if (dragX > 80) {
      await handleSwipe('right')
    } else if (dragX < -80) {
      await handleSwipe('left')
    }
    setDragX(0)
  }

  async function handleSwipe(direction) {
    const current = swipeRecipes[0]
    if (!current) return
    setSwipeDir(direction)
    // Record history for rewind
    setHistory(prev => [...prev, { index: swipeIndex, direction, recipeId: current.id }])
    if (direction === 'right') {
      await saveRecipe(current.id)
      setSavedThisSession(s => s + 1)
    } else {
      setSkippedThisSession(s => s + 1)
    }
    setTimeout(() => {
      setSwipeIndex(i => i + 1)
      setSwipeDir(null)
    }, 300)
  }

  async function handleRewind() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    // Undo save if it was a right swipe
    if (last.direction === 'right') {
      await unsaveRecipe(last.recipeId)
      setSavedThisSession(s => Math.max(0, s - 1))
    } else {
      setSkippedThisSession(s => Math.max(0, s - 1))
    }
    setSwipeIndex(last.index)
  }

  const swipeFiltered = recipes.filter(r => category === 'All' || r.category === category)
  const swipeRecipes = swipeFiltered.slice(swipeIndex)
  const diffLabel = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', advanced: '🔴 Advanced' }

  const filtered = recipes.filter(r => {
    const matchCat = category === 'All' || r.category === category
    const matchSearch = search === '' || r.title.toLowerCase().includes(search.toLowerCase()) || r.cuisine?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  async function toggleSave(recipeId) {
    if (!user) { window.location.href = '/login'; return }
    if (savedIds.has(recipeId)) {
      await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(recipeId); return n })
    } else {
      await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: recipeId })
      setSavedIds(prev => new Set([...prev, recipeId]))
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🍳 Explore Recipes</h1>
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setMode('swipe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'swipe' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
              >
                👆 Swipe
              </button>
              <button
                onClick={() => setMode('browse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'browse' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
              >
                ⊞ Browse
              </button>
            </div>
          </div>
          {mode === 'browse' && (
            <>
              <input
                type="text"
                placeholder="Search recipes or cuisine..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2"
              />
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </>
          )}
          {mode === 'swipe' && (
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <select
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading recipes...</div>
        ) : mode === 'swipe' ? (
          <div>
            {/* Stats */}
            <div className="flex justify-center gap-6 mb-6 text-center">
              <div>
                <p className="text-2xl font-bold text-red-400">{skippedThisSession}</p>
                <p className="text-xs text-gray-400">Skipped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{savedThisSession}</p>
                <p className="text-xs text-gray-400">Saved</p>
              </div>
            </div>

            {swipeRecipes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-gray-700 font-semibold mb-2">You've seen them all!</p>
                <p className="text-gray-400 text-sm mb-6">Saved {savedThisSession} recipes this session</p>
                <button onClick={() => { setSwipeIndex(0); setSavedThisSession(0); setSkippedThisSession(0); setHistory([]) }}
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                  Start Over
                </button>
              </div>
            ) : (
              <div>
                {/* Card stack */}
                <div className="relative h-96 mb-6">
                  {swipeRecipes.slice(1, 3).map((recipe, i) => (
                    <div
                      key={recipe.id}
                      className="absolute inset-0 bg-white border border-gray-200 rounded-3xl overflow-hidden"
                      style={{
                        transform: `scale(${0.95 - i * 0.03}) translateY(${(i + 1) * 8}px)`,
                        zIndex: 10 - i
                      }}
                    />
                  ))}

                  {swipeRecipes[0] && (
                    <div
                      className="absolute inset-0 bg-white border border-gray-200 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
                      style={{
                        transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                        zIndex: 20,
                        transition: dragging && isDragging.current ? 'none' : 'transform 0.3s ease',
                        opacity: swipeDir ? 0 : 1,
                      }}
                      onMouseDown={onDragStart}
                      onMouseMove={onDragMove}
                      onMouseUp={onDragEnd}
                      onMouseLeave={onDragEnd}
                      onTouchStart={onDragStart}
                      onTouchMove={onDragMove}
                      onTouchEnd={onDragEnd}
                    >
                      <div className="relative h-64">
                        {swipeRecipes[0].thumbnail_url ? (
                          <img src={swipeRecipes[0].thumbnail_url} alt={swipeRecipes[0].title} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                            <span className="text-5xl">🍽️</span>
                          </div>
                        )}
                        {dragX > 40 && (
                          <div className="absolute top-4 left-4 bg-green-500 text-white font-bold text-lg px-4 py-2 rounded-xl border-2 border-green-600 rotate-[-12deg]">
                            SAVE ♥
                          </div>
                        )}
                        {dragX < -40 && (
                          <div className="absolute top-4 right-4 bg-red-400 text-white font-bold text-lg px-4 py-2 rounded-xl border-2 border-red-500 rotate-[12deg]">
                            SKIP ✕
                          </div>
                        )}
                        {swipeRecipes[0].youtube_url && (
                          <div className="absolute top-3 right-3 bg-red-600 rounded-full w-7 h-7 flex items-center justify-center">
                            <span className="text-white text-xs">▶</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{swipeRecipes[0].title}</h2>
                        <div className="flex gap-2 mb-2">
                          {swipeRecipes[0].cuisine && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">{swipeRecipes[0].cuisine}</span>}
                          {metadata[swipeRecipes[0].id]?.difficulty_level && (
                            <span className="text-xs text-gray-400">{diffLabel[metadata[swipeRecipes[0].id].difficulty_level]}</span>
                          )}
                        </div>
                        {metadata[swipeRecipes[0].id]?.ai_summary && (
                          <p className="text-xs text-gray-500 line-clamp-2">{metadata[swipeRecipes[0].id].ai_summary}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-4">
                  {/* Skip - Left */}
                  <button
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 bg-white border-2 border-red-200 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 transition-colors shadow-sm"
                    title="Skip"
                  >
                    ✕
                  </button>
                  {/* Rewind */}
                  <button
                    onClick={handleRewind}
                    disabled={history.length === 0}
                    className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-30"
                    title="Rewind"
                  >
                    ↩
                  </button>
                  {/* Details */}
                  <a
                    href={`/recipes/${swipeRecipes[0]?.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Details
                  </a>
                  {/* Save - Right */}
                  <button
                    onClick={() => handleSwipe('right')}
                    className="w-16 h-16 bg-white border-2 border-green-200 rounded-full flex items-center justify-center text-2xl hover:bg-green-50 transition-colors shadow-sm"
                    title="Save"
                  >
                    ♥
                  </button>
                </div>

                <p className="text-center text-sm font-semibold text-gray-500 mt-4">
                  {swipeRecipes.length} recipes left &nbsp;·&nbsp; ← Skip &nbsp;|&nbsp; Save → &nbsp;·&nbsp; ↩ Rewind
                </p>
              </div>
            )}
          </div>
        ) : (
          // BROWSE MODE
          <div>
            <p className="text-sm text-gray-400 mb-4">{filtered.length} recipes</p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(recipe => (
                <div key={recipe.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                  <a href={`/recipes/${recipe.id}`}>
                    <div style={{height: '120px'}}>
                      {recipe.thumbnail_url ? (
                        <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                          <span className="text-3xl">🍽️</span>
                        </div>
                      )}
                    </div>
                  </a>
                  <div className="p-3">
                    <a href={`/recipes/${recipe.id}`}>
                      <p className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{recipe.title}</p>
                    </a>
                    <p className="text-xs text-gray-400 mb-2">{recipe.cuisine || recipe.category}</p>
                    <div className="flex items-center justify-between">
                      {metadata[recipe.id]?.difficulty_level && (
                        <span className="text-xs text-gray-400">{diffLabel[metadata[recipe.id].difficulty_level]}</span>
                      )}
                      <button onClick={() => toggleSave(recipe.id)} className={`text-lg ml-auto ${savedIds.has(recipe.id) ? 'text-red-500' : 'text-gray-300'}`}>
                        ♥
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
