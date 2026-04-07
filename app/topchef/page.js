'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CUISINES = ['French', 'Italian', 'Japanese', 'Mexican', 'Indian', 'Mediterranean', 'Thai', 'American']
const DIFFICULTIES = ['Intermediate', 'Advanced', 'Chef Level']

export default function TopChefPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [cuisine, setCuisine] = useState('French')
  const [difficulty, setDifficulty] = useState('Advanced')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { loadChefRecipes() }, [])

  async function loadChefRecipes() {
    const { data } = await supabase
      .from('chef_recipes').select('*').order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
  }

  async function generateRecipe() {
    setGenerating(true)
    try {
      const res = await fetch('/api/topchef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuisine, difficulty })
      })
      const data = await res.json()
      if (data.recipe) {
        setRecipes(prev => [data.recipe, ...prev])
        setViewing(data.recipe)
      }
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  async function deleteRecipe(id, e) {
    e.stopPropagation()
    setDeleting(id)
    await supabase.from('chef_recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (viewing?.id === id) setViewing(null)
    setDeleting(null)
  }

  if (viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">👨‍🍳 AI Chef Creation</span>
              <button onClick={e => { deleteRecipe(viewing.id, e); setViewing(null) }}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 border border-red-200 rounded-lg">
                🗑 Delete
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="flex flex-wrap gap-2 mb-3">
            {viewing.cuisine && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">🌍 {viewing.cuisine}</span>}
            {viewing.difficulty && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{viewing.difficulty}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{viewing.title}</h1>
          {viewing.description && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-900 leading-relaxed">👨‍🍳 {viewing.description}</p>
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
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">👨‍🍳 AI Chef Creations</h1>
          </div>
          <p className="text-xs text-gray-400">Elevated dishes crafted by your AI chef.</p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold text-gray-900 mb-3">✨ Generate a New Chef Recipe</p>
          <div className="flex gap-2 flex-wrap mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Cuisine</p>
              <select value={cuisine} onChange={e => setCuisine(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                {CUISINES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Difficulty</p>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <button onClick={generateRecipe} disabled={generating}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm">
            {generating ? '👨‍🍳 Creating your recipe...' : '✨ Generate Chef Recipe'}
          </button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading chef recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No chef recipes yet — generate your first one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">{recipes.length} chef {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
            {recipes.map(recipe => (
              <div key={recipe.id} className="flex items-center gap-2">
                <button onClick={() => setViewing(recipe)}
                  className="flex-1 text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-orange-200 hover:bg-orange-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 mb-0.5">{recipe.title}</p>
                      <div className="flex gap-2">
                        {recipe.cuisine && <span className="text-xs text-orange-500">{recipe.cuisine}</span>}
                        {recipe.difficulty && <span className="text-xs text-gray-400">· {recipe.difficulty}</span>}
                      </div>
                    </div>
                    <span className="text-gray-300 text-xl">→</span>
                  </div>
                </button>
                <button onClick={e => deleteRecipe(recipe.id, e)} disabled={deleting === recipe.id}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-400 border border-gray-200 rounded-xl hover:border-red-200 transition-colors">
                  {deleting === recipe.id ? '...' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}