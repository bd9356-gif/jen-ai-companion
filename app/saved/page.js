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
  const [copying, setCopying] = useState(null) // recipe id being copied
  const [copiedIds, setCopiedIds] = useState(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadSaved(session.user.id)
      loadExistingMyRecipes(session.user.id)
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

  async function loadExistingMyRecipes(userId) {
    // Check which saved recipes have already been copied to MyRecipes
    // by matching title (since they come from different tables)
    const { data } = await supabase
      .from('personal_recipes')
      .select('id, title')
      .eq('user_id', userId)
    // Store titles that already exist
    const existingTitles = new Set((data || []).map(r => r.title.toLowerCase()))
    setCopiedIds(existingTitles)
  }

  async function unsave(recipeId) {
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  async function copyToMyRecipes(recipe) {
    setCopying(recipe.id)
    try {
      // Fetch full recipe details including ingredients and instructions
      const { data: full } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipe.id)
        .single()

      if (!full) {
        alert('Could not load recipe details')
        setCopying(null)
        return
      }

      // Insert into personal_recipes
      const { error } = await supabase.from('personal_recipes').insert({
        user_id: user.id,
        title: full.title,
        description: `Imported from recipe library — ${full.cuisine || full.category || ''}`.trim().replace(/—\s*$/, ''),
        ingredients: full.ingredients || [],
        instructions: full.instructions || '',
        category: full.category || '',
        tags: full.tags || [],
        family_notes: '',
        photo_url: full.thumbnail_url || '',
      })

      if (error) {
        alert('Failed to copy recipe: ' + error.message)
      } else {
        setCopiedIds(prev => new Set([...prev, full.title.toLowerCase()]))
        alert(`✓ "${full.title}" added to MyRecipes!`)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setCopying(null)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">❤️ Your Favorite Recipes</h1>
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
            <p className="text-sm text-gray-400 mb-1">{recipes.length} saved {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
            <p className="text-xs text-gray-400 mb-4">Tap 🔒 to copy any recipe into MyRecipes for editing, photos, and personal notes.</p>
            <div className="space-y-3">
              {recipes.map(recipe => (
                <div key={recipe.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <a href={`/recipes/${recipe.id}`} className="shrink-0">
                      <div style={{width:'72px', height:'72px'}} className="rounded-xl overflow-hidden">
                        {recipe.thumbnail_url ? (
                          <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        )}
                      </div>
                    </a>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <a href={`/recipes/${recipe.id}`}>
                        <p className="text-sm font-semibold text-gray-900 leading-tight mb-0.5 line-clamp-2">{recipe.title}</p>
                      </a>
                      <p className="text-xs text-gray-400 mb-2">{recipe.cuisine || recipe.category}</p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <a href={`/recipes/${recipe.id}`} className="text-xs text-orange-600 font-semibold">
                          View →
                        </a>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => copyToMyRecipes(recipe)}
                          disabled={copying === recipe.id || copiedIds.has(recipe.title?.toLowerCase())}
                          className={`text-xs font-semibold transition-colors ${
                            copiedIds.has(recipe.title?.toLowerCase())
                              ? 'text-green-500'
                              : 'text-gray-500 hover:text-orange-600'
                          }`}
                        >
                          {copying === recipe.id
                            ? '⏳ Copying...'
                            : copiedIds.has(recipe.title?.toLowerCase())
                            ? '✓ In MyRecipes'
                            : '🔒 Add to MyRecipes'}
                        </button>
                        <button
                          onClick={() => unsave(recipe.id)}
                          className="text-red-400 hover:text-red-600 text-lg ml-auto"
                        >
                          ♥
                        </button>
                      </div>
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