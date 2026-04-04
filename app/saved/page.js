'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SavedPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadSaved(session.user.id)
    })
  }, [])

  async function loadSaved(userId) {
    const { data } = await supabase
      .from('saved_recipes')
      .select('recipe_id, recipes(id, title, category, cuisine, thumbnail_url, youtube_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes((data || []).map(s => s.recipes).filter(Boolean))
    setLoading(false)
  }

  async function unsave(recipeId) {
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">❤️ MySaved</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your saved recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="text-gray-500 font-semibold mb-2">No saved recipes yet</p>
            <p className="text-gray-400 text-sm mb-6">Browse recipes and tap ♥ to save your favorites</p>
            <a href="/recipes" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Browse Recipes
            </a>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{recipes.length} saved {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
            <div className="grid grid-cols-2 gap-3">
              {recipes.map(recipe => (
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
                      <a href={`/recipes/${recipe.id}`} className="text-xs text-orange-600 font-semibold">View recipe →</a>
                      <button onClick={() => unsave(recipe.id)} className="text-red-400 hover:text-red-600 text-lg">♥</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}