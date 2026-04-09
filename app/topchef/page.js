'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATIC_DRAWERS = [
  {
    id: 'protein-night',
    emoji: '🥩',
    title: 'Protein Night',
    subtitle: 'Pick the protein — your chef builds the meal.',
    items: ['Chicken Night', 'Fish Night', 'Beef Night'],
    color: 'red',
  },
  {
    id: 'quick-chef',
    emoji: '⚡',
    title: 'Quick Chef',
    subtitle: 'Restaurant flavor in under 20 minutes.',
    items: ['One-Pan Chicken', 'Fast Salmon Bowls', 'Garlic Butter Shrimp'],
    color: 'amber',
  },
  {
    id: 'chefs-specials',
    emoji: '⭐',
    title: "Chef's Specials",
    subtitle: 'Seasonal, trending, and comfort picks.',
    items: ['Seasonal Dish', 'Trending Recipe', 'Comfort Classic'],
    color: 'purple',
  },
  {
    id: 'build-my-meal',
    emoji: '🛠️',
    title: 'Build My Meal',
    subtitle: 'Tell your chef the vibe — get a custom dish.',
    items: ['Choose Protein', 'Choose Flavor Style', 'Choose Time'],
    color: 'teal',
  },
]

const COLOR_MAP = {
  orange: { header: 'bg-orange-50 border-orange-200', title: 'text-orange-900', sub: 'text-orange-600', item: 'hover:bg-orange-50 active:bg-orange-100', btn: 'bg-orange-600 hover:bg-orange-700' },
  red:    { header: 'bg-red-50 border-red-200',       title: 'text-red-900',    sub: 'text-red-500',    item: 'hover:bg-red-50 active:bg-red-100',    btn: 'bg-red-600 hover:bg-red-700' },
  amber:  { header: 'bg-amber-50 border-amber-200',   title: 'text-amber-900',  sub: 'text-amber-600',  item: 'hover:bg-amber-50 active:bg-amber-100',  btn: 'bg-amber-600 hover:bg-amber-700' },
  purple: { header: 'bg-purple-50 border-purple-200', title: 'text-purple-900', sub: 'text-purple-600', item: 'hover:bg-purple-50 active:bg-purple-100', btn: 'bg-purple-600 hover:bg-purple-700' },
  teal:   { header: 'bg-teal-50 border-teal-200',     title: 'text-teal-900',   sub: 'text-teal-600',   item: 'hover:bg-teal-50 active:bg-teal-100',   btn: 'bg-teal-600 hover:bg-teal-700' },
}

export default function TopChefPage() {
  const [openDrawer, setOpenDrawer] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [generatingItem, setGeneratingItem] = useState(null)
  const [chefMenuItems, setChefMenuItems] = useState(['Pan-Seared Salmon', 'Chicken Piccata', 'Steak with Herb Butter'])
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
    loadRotatingMenu()
  }, [])

  async function loadRotatingMenu() {
    // Pull 3 random recipes from DB for Chef's Menu
    const { data } = await supabase
      .from('recipes')
      .select('title')
      .not('thumbnail_url', 'is', null)
      .limit(200)
    if (data && data.length >= 3) {
      const shuffled = data.sort(() => Math.random() - 0.5)
      setChefMenuItems(shuffled.slice(0, 3).map(r => r.title))
    }
  }

  const DRAWERS = [
    {
      id: 'chefs-menu',
      emoji: '🍽️',
      title: "Chef's Menu",
      subtitle: "Tonight's curated picks — refreshes every visit.",
      items: chefMenuItems,
      color: 'orange',
    },
    ...STATIC_DRAWERS,
  ]

  function toggleDrawer(id) {
    setOpenDrawer(prev => prev === id ? null : id)
  }

  async function cookThis(drawer, item) {
    setGeneratingItem(item)
    setGenerating(true)
    setSaved(false)
    try {
      const prompt = buildPrompt(drawer, item)
      const res = await fetch('/api/topchef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, item, drawer: drawer.title })
      })
      const data = await res.json()
      if (data.recipe) setViewing(data.recipe)
    } catch (err) { console.error(err) }
    finally { setGenerating(false); setGeneratingItem(null) }
  }

  function buildPrompt(drawer, item) {
    const prompts = {
      'chefs-menu': `Create a refined restaurant-style recipe for "${item}". Make it elevated and impressive.`,
      'protein-night': `Create a complete dinner meal centered around ${item.replace(' Night', '')}. Build a satisfying, flavorful meal.`,
      'quick-chef': `Create a quick recipe for "${item}" that takes under 20 minutes. Restaurant quality, fast execution.`,
      'chefs-specials': `Create a ${item.toLowerCase()} recipe that feels special and memorable. Seasonal ingredients, comfort or trending flavors.`,
      'build-my-meal': `Create a custom recipe based on the preference: "${item}". Make it personalized and delicious.`,
    }
    return prompts[drawer.id] || `Create a delicious recipe for "${item}".`
  }

  async function saveToFavorites() {
    if (!user || !viewing) return
    setSaving(true)
    // Save recipe to personal_recipes as a vault entry
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: viewing.title,
      description: viewing.description || '',
      ingredients: viewing.ingredients || [],
      instructions: viewing.instructions || '',
      category: 'AI Chef Creation',
      tags: ['ai-chef', viewing.cuisine?.toLowerCase() || ''].filter(Boolean),
      family_notes: `Created by AI Chef — ${viewing.difficulty || ''}`,
      photo_url: '',
    })
    if (!error) setSaved(true)
    setSaving(false)
  }

  if (viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">👨‍🍳 AI Chef Creation</span>
              <button
                onClick={saveToFavorites}
                disabled={saving || saved}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  saved
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                } disabled:opacity-50`}
              >
                {saving ? '⏳' : saved ? '✓ Saved!' : '♥ Save to Vault'}
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
            <div className="mb-8">
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
          {/* Save button at bottom */}
          <button
            onClick={saveToFavorites}
            disabled={saving || saved}
            className={`w-full py-4 rounded-2xl text-base font-semibold transition-colors ${
              saved
                ? 'bg-green-50 text-green-600 border-2 border-green-200'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            } disabled:opacity-50`}
          >
            {saving ? '⏳ Saving...' : saved ? '✓ Saved to MyRecipeVault' : '♥ Save to MyRecipeVault'}
          </button>
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
          <p className="text-xs text-gray-400">Open a drawer — your chef builds the meal.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16 space-y-3">
        {DRAWERS.map(drawer => {
          const isOpen = openDrawer === drawer.id
          const colors = COLOR_MAP[drawer.color]
          return (
            <div key={drawer.id} className={`border rounded-2xl overflow-hidden transition-all ${colors.header}`}>
              <button
                onClick={() => toggleDrawer(drawer.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span style={{fontSize:'22px'}}>{drawer.emoji}</span>
                  <div>
                    <p className={`font-bold text-sm ${colors.title}`}>{drawer.title}</p>
                    <p className={`text-xs mt-0.5 ${colors.sub}`}>{drawer.subtitle}</p>
                  </div>
                </div>
                <span className={`text-lg transition-transform duration-200 ${colors.title} ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {isOpen && (
                <div className="bg-white border-t border-gray-100 divide-y divide-gray-50">
                  {drawer.items.map(item => (
                    <button
                      key={item}
                      onClick={() => cookThis(drawer, item)}
                      disabled={generating}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors disabled:opacity-50 ${colors.item}`}
                    >
                      <span className="text-sm font-medium text-gray-800 leading-snug">{item}</span>
                      <span className={`shrink-0 ml-3 text-xs font-semibold px-3 py-1 rounded-full text-white ${colors.btn} ${generatingItem === item ? 'opacity-70' : ''}`}>
                        {generatingItem === item ? '⏳ Cooking...' : 'Cook This →'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {generating && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 animate-pulse">👨‍🍳 Your chef is creating your recipe...</p>
          </div>
        )}
      </main>
    </div>
  )
}