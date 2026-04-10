'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = ['All', 'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat']
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced']

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([])
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [search, setSearch] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [user, setUser] = useState(null)

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
    setLoading(true)
    const { data } = await supabase
      .from('recipes')
      .select('id, title, category, cuisine, thumbnail_url, youtube_url')
      .order('title')
    setRecipes(data || [])

    // Load metadata for difficulty
    const { data: meta } = await supabase
      .from('recipe_metadata')
      .select('recipe_id, difficulty_level, ai_summary')
    const metaMap = {}
    ;(meta || []).forEach(m => { metaMap[m.recipe_id] = m })
    setMetadata(metaMap)
    setLoading(false)
  }

  async function loadSaved(userId) {
    const { data } = await supabase
      .from('saved_recipes')
      .select('recipe_id')
      .eq('user_id', userId)
    setSavedIds(new Set((data || []).map(s => s.recipe_id)))
  }

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

  const filtered = recipes.filter(r => {
    const matchCat = category === 'All' || r.category === category
    const matchDiff = difficulty === 'All' || metadata[r.id]?.difficulty_level === difficulty
    const matchSearch = search === '' || r.title.toLowerCase().includes(search.toLowerCase()) || r.cuisine?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchDiff && matchSearch
  })

  const diffLabel = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', advanced: '🔴 Advanced' }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🍳 MyRecipes</h1>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder="Search recipes or cuisine..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
          />
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  category === cat ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Difficulty filter */}
          <div className="flex gap-2 mt-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  difficulty === d ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                }`}
              >
                {d === 'All' ? 'All Levels' : diffLabel[d]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        <p className="text-sm text-gray-400 mb-4">{filtered.length} recipes</p>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading recipes...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(recipe => (
              <div key={recipe.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                {/* Thumbnail */}
                <a href={`/recipes/${recipe.id}`}>
                  <div className="relative" style={{height: '120px'}}>
                    {recipe.thumbnail_url ? (
                      <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}
                    {recipe.youtube_url && (
                      <div className="absolute top-2 right-2 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center">
                        <span className="text-white text-xs">▶</span>
                      </div>
                    )}
                  </div>
                </a>
                {/* Info */}
                <div className="p-3">
                  <a href={`/recipes/${recipe.id}`}>
                    <p className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{recipe.title}</p>
                  </a>
                  <p className="text-xs text-gray-400 mb-2">{recipe.cuisine || recipe.category}</p>
                  <div className="flex items-center justify-between">
                    {metadata[recipe.id]?.difficulty_level && (
                      <span className="text-xs text-gray-400">{diffLabel[metadata[recipe.id].difficulty_level]}</span>
                    )}
                    <button
                      onClick={() => toggleSave(recipe.id)}
                      className={`text-lg ml-auto ${savedIds.has(recipe.id) ? 'text-red-500' : 'text-gray-300'}`}
                    >
                      ♥
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
