'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { STARTER_RECIPES, STARTER_RECIPES_VERSION } from '@/lib/starter_recipes'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Seed starter recipes the first time a user lands on MyKitchen.
// Idempotent: skips if a localStorage flag is set OR if the user already
// has any recipes in personal_recipes. The localStorage flag prevents
// re-seeding for someone who deliberately empties their Vault.
async function seedStarterRecipesOnce(user) {
  if (typeof window === 'undefined' || !user?.id) return
  const flagKey = `recipe_ai_seeded_${STARTER_RECIPES_VERSION}_${user.id}`
  if (localStorage.getItem(flagKey)) return

  const { count, error: countError } = await supabase
    .from('personal_recipes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (countError) return
  if ((count || 0) > 0) {
    // User already has recipes — don't seed, but mark as handled
    localStorage.setItem(flagKey, '1')
    return
  }

  const rows = STARTER_RECIPES.map(r => ({
    user_id: user.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    category: r.category || '',
    tags: r.tags || [],
    family_notes: r.family_notes || '',
    photo_url: r.photo_url || '',
    difficulty: r.difficulty || '',
    servings: r.servings ?? null,
  }))
  const { error: insertError } = await supabase.from('personal_recipes').insert(rows)
  if (!insertError) localStorage.setItem(flagKey, '1')
}

const SECTIONS = [
  {
    name: 'Your Cooking Life',
    subtitle: "Your saved recipes, cooking cards, and what you're making next.",
    accent: '#f59e0b',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',  href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',  href: '/cards' },
      { emoji: '🎯', title: 'MyPlan',        href: '/picks' },
    ]
  },
  {
    name: 'AI Kitchen',
    subtitle: 'Smart support whenever you need ideas, guidance, or answers.',
    accent: '#a855f7',
    items: [
      { emoji: '👨‍🍳', title: 'Chef Jennifer', href: '/topchef' },
    ]
  },
  {
    name: 'Explore',
    subtitle: 'Find ideas, inspiration, and dishes worth considering.',
    accent: '#f97316',
    items: [
      { emoji: '🎬', title: 'Chef TV', href: '/videos' },
    ]
  },
]

export default function KitchenPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        // Seed starter recipes on first visit (idempotent).
        seedStarterRecipesOnce(session.user).catch(() => {})
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-5 py-4 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-900">👨‍🍳 MyKitchen</h1>
          <p className="text-xs text-gray-500 mt-0.5">Everything you need — all in one place.</p>
        </div>
        <button onClick={() => window.location.href='/profile'}
          className="flex items-center gap-1.5 bg-orange-50 text-orange-600 rounded-full px-3 py-1.5 text-xs font-semibold">
          👤 Profile
        </button>
      </div>
      </div>

      {/* Sections */}
      <main className="px-4 pt-6 pb-10 max-w-lg mx-auto space-y-8">
        {SECTIONS.map(section => (
          <div key={section.name}>
            {/* Section header */}
            <div className="mb-3 px-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider" style={{color: section.accent}}>{section.name}</h2>
              {section.subtitle && <p className="text-sm text-gray-500 mt-1 leading-snug">{section.subtitle}</p>}
            </div>
            {/* Section items */}
            <div className="space-y-3">
              {section.items.map(item => (
                <button
                  key={item.href}
                  onClick={() => window.location.href = item.href}
                  className="w-full text-left bg-white rounded-2xl overflow-hidden active:scale-95 transition-transform"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${section.accent}` }}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <span style={{fontSize:'28px', lineHeight:1}}>{item.emoji}</span>
                    <p className="flex-1 text-base font-semibold text-gray-900">{item.title}</p>
                    <span className="text-gray-300 text-xl font-light">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}