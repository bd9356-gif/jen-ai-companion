'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = ['All', 'Beef', 'Chicken', 'Dessert', 'Lamb', 'Pasta', 'Pork', 'Seafood', 'Vegan', 'Vegetarian', 'Breakfast', 'Starter', 'Side']

export default function CardsPage() {
  const [recipes, setRecipes] = useState([])
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, category, cuisine, thumbnail_url, ingredients, instructions, youtube_url')
      .order('title')
    setRecipes(data || [])

    const { data: meta } = await supabase
      .from('recipe_metadata')
      .select('recipe_id, ai_summary, difficulty_level')
    const metaMap = {}
    ;(meta || []).forEach(m => { metaMap[m.recipe_id] = m })
    setMetadata(metaMap)
    setLoading(false)
  }

  const filtered = recipes.filter(r => {
    const matchCat = category === 'All' || r.category === category
    const matchSearch = search === '' || r.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const diffLabel = { beginner: '🟢', intermediate: '🟡', advanced: '🔴' }

  if (viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split(/\r?\n/).filter(Boolean)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <span className="text-xs text-gray-400">🃏 Recipe Card</span>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          {viewing.thumbnail_url && (
            <div className="w-full rounded-2xl overflow-hidden mb-5" style={{height:'200px'}}>
              <img src={viewing.thumbnail_url} alt={viewing.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {viewing.cuisine && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">🌍 {viewing.cuisine}</span>}
            {viewing.category && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.category}</span>}
            {metadata[viewing.id]?.difficulty_level && <span className="text-xs text-gray-500">{diffLabel[metadata[viewing.id].difficulty_level]}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{viewing.title}</h1>
          {metadata[viewing.id]?.ai_summary && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-orange-900 leading-relaxed">🤖 {metadata[viewing.id].ai_summary}</p>
            </div>
          )}
          {ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Ingredients</h2>
              <div className="bg-gray-50 rounded-2xl p-4">
                <ul className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-orange-400">•</span>
                      <span className="text-gray-600">
                        {ing.measure && <span className="font-semibold text-gray-800">{ing.measure} </span>}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {instructions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
              <div className="space-y-4">
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🃏 Recipe Cards</h1>
          </div>
          <p className="text-xs text-gray-400 mb-3">Clean, organized recipe cards you can trust.</p>
          <input
            type="text"
            placeholder="Search recipe cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
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
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        <p className="text-sm text-gray-400 mb-4">{filtered.length} recipe cards</p>
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading recipe cards...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => setViewing(recipe)}
                className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-orange-200 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {recipe.thumbnail_url && (
                    <img src={recipe.thumbnail_url} alt={recipe.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{recipe.title}</p>
                    <p className="text-xs text-gray-400">{recipe.cuisine || recipe.category}</p>
                    {metadata[recipe.id]?.ai_summary && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{metadata[recipe.id].ai_summary}</p>
                    )}
                  </div>
                  <span className="text-gray-300 shrink-0">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}