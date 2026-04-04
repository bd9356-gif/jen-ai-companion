'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SecretPage() {
  const [user, setUser] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', ingredients: '', instructions: '',
    category: '', is_family_recipe: false, family_notes: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadRecipes(session.user.id)
    })
  }, [])

  async function loadRecipes(userId) {
    const { data } = await supabase
      .from('personal_recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
  }

  async function saveRecipe() {
    if (!form.title.trim()) return
    const ingredients = form.ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.split(' - ')
      return { name: parts[0]?.trim(), measure: parts[1]?.trim() || '' }
    })
    const { data, error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      ingredients,
      instructions: form.instructions,
      category: form.category,
      is_family_recipe: form.is_family_recipe,
      family_notes: form.family_notes,
    }).select().single()
    if (!error && data) {
      setRecipes(prev => [data, ...prev])
      setAdding(false)
      setForm({ title: '', description: '', ingredients: '', instructions: '', category: '', is_family_recipe: false, family_notes: '' })
    }
  }

  async function deleteRecipe(id) {
    await supabase.from('personal_recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (viewing?.id === id) setViewing(null)
  }

  if (viewing) {
    const ingredients = viewing.ingredients || []
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <button onClick={() => deleteRecipe(viewing.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="flex items-center gap-2 mb-2">
            {viewing.is_family_recipe && <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">👨‍👩‍👧‍👦 Family Recipe</span>}
            {viewing.category && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.category}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{viewing.title}</h1>
          {viewing.description && <p className="text-gray-500 text-sm mb-4">{viewing.description}</p>}
          {viewing.family_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">📖 Family Notes</p>
              <p className="text-sm text-amber-900">{viewing.family_notes}</p>
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
          {viewing.instructions && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
              <div className="space-y-3">
                {viewing.instructions.split('\n').filter(Boolean).map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🔒 Top Secret Recipes</h1>
            </div>
            <button onClick={() => setAdding(true)} className="text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-xl transition-colors">
              + Add Recipe
            </button>
          </div>
          <p className="text-xs text-gray-400 ml-1">Your family's treasured recipes, kept safe and close.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {adding && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Add a Recipe</h2>
            <div className="space-y-3">
              <input
                placeholder="Recipe title *"
                value={form.title}
                onChange={e => setForm(f => ({...f, title: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <input
                placeholder="Short description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <input
                placeholder="Category (e.g. Dessert, Main, Side)"
                value={form.category}
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <textarea
                placeholder="Ingredients — one per line, e.g. Flour - 2 cups"
                value={form.ingredients}
                onChange={e => setForm(f => ({...f, ingredients: e.target.value}))}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <textarea
                placeholder="Instructions — one step per line"
                value={form.instructions}
                onChange={e => setForm(f => ({...f, instructions: e.target.value}))}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <textarea
                placeholder="Family notes — the story behind this recipe (optional)"
                value={form.family_notes}
                onChange={e => setForm(f => ({...f, family_notes: e.target.value}))}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_family_recipe}
                  onChange={e => setForm(f => ({...f, is_family_recipe: e.target.checked}))}
                  className="w-4 h-4 accent-orange-600"
                />
                Mark as a family recipe 👨‍👩‍👧‍👦
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={saveRecipe} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors text-sm">
                  Save Recipe
                </button>
                <button onClick={() => setAdding(false)} className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your secret recipes...</div>
        ) : recipes.length === 0 && !adding ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔒</p>
            <p className="text-gray-700 font-semibold mb-2">No secret recipes yet</p>
            <p className="text-gray-400 text-sm mb-6">Add your personal and family recipes — they're private and only visible to you</p>
            <button onClick={() => setAdding(true)} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Add Your First Recipe
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">{recipes.length} private {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
            {recipes.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => setViewing(recipe)}
                className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-orange-200 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{recipe.title}</p>
                      {recipe.is_family_recipe && <span className="text-xs">👨‍👩‍👧‍👦</span>}
                    </div>
                    {recipe.description && <p className="text-xs text-gray-400">{recipe.description}</p>}
                    {recipe.category && <p className="text-xs text-orange-500 mt-0.5">{recipe.category}</p>}
                  </div>
                  <span className="text-gray-300 text-xl">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}