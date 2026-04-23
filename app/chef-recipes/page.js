'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import ChefJenItem from '@/components/ChefJenItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Chef Jennifer Recipes — every recipe Chef Jennifer has generated and you
// saved. Each row expands to show ingredients and instructions, and has a
// 💾 Save to Recipe Vault button that promotes the recipe into your
// permanent personal_recipes collection.
//
// Data: `favorites` table, type = 'ai_recipe'. metadata carries
// {description, ingredients[], instructions, difficulty, cuisine}.
export default function ChefRecipesPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState([])
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function loadRecipes(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'ai_recipe')
      .order('created_at', { ascending: false })
    setRecipes(data || [])
  }

  async function removeRecipe(item) {
    await supabase.from('favorites').delete().eq('id', item.id)
    setRecipes(prev => prev.filter(r => r.id !== item.id))
    showToast('Removed')
  }

  async function saveToVault(item) {
    if (!user) return
    const meta = item.metadata || {}
    // Keep {name, measure} shape expected by the Vault
    const ingredients = Array.isArray(meta.ingredients) ? meta.ingredients.map(ing => {
      if (typeof ing === 'string') return { name: ing, measure: '' }
      return { name: ing?.name || '', measure: ing?.measure || '' }
    }) : []
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: item.title,
      description: meta.description || '',
      ingredients,
      instructions: meta.instructions || '',
      category: '',
      tags: [],
      family_notes: 'Saved from Chef Jennifer.',
      photo_url: '',
      difficulty: meta.difficulty || '',
    })
    if (error) {
      showToast('Could not save to Vault')
      return
    }
    showToast('Saved to Recipe Vault ✓')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadRecipes(session.user.id).finally(() => setLoading(false))
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">✨ Chef Jennifer Recipes</h1>
            {recipes.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{recipes.length}</span>}
          </div>
          <button onClick={() => window.location.href='/topchef'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Create New</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-3">
          <p className="text-sm text-gray-600 leading-snug">Every recipe Chef Jennifer made for you, ready to cook or save to your Vault.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading Chef Jennifer&apos;s recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">👨‍🍳</p>
            <p className="text-gray-500 font-medium">No Chef Jennifer recipes yet</p>
            <p className="text-sm text-gray-400 mt-1">Have her create one tailored to your mood, meal, and protein.</p>
            <button onClick={() => window.location.href='/topchef'} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold">Create a Recipe →</button>
          </div>
        ) : (
          <div className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
            {recipes.map(item => (
              <ChefJenItem
                key={item.id}
                item={item}
                onRemove={() => removeRecipe(item)}
                onSaveToVault={() => saveToVault(item)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
