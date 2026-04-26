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

/* ─────────────────────────────────────────────────────────────
   MyKitchen hub — 3 sections, 9 tiles (April 2026 Cooking School).
   Every tile uses a unified orange left stripe (brand color)
   mirroring Golf's green-stripe pattern. Section headers group
   the tiles but don't change the tile styling — consistency
   across the whole hub.

   Cooking School is the consolidated learn surface: Chef TV and
   Chef Jennifer are the two classrooms (video instructor + AI
   instructor), Guides is the library, My Playbook is the user's
   notebook. Order matters: classrooms first, then library, then
   notebook.

   Routing note:
   All tiles route to dedicated pages. The /picks combined view
   was retired in Phase 2C; old ?open= bookmarks still redirect
   from /picks for back-compat.
   ─────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    name: 'Your Recipes',
    subtitle: 'Your saved recipes and collections.',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',            description: 'Your saved recipes, organized.',       href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',            description: 'Flip through your collection.',        href: '/cards' },
      { emoji: '✨', title: 'Chef Jennifer Recipes',   description: 'Recipes Jennifer made for you.',       href: '/chef-recipes' },
    ]
  },
  {
    name: 'Plan & Shop',
    subtitle: 'Organize what you\'re cooking next.',
    items: [
      { emoji: '📅', title: 'Meal Plan',     description: 'What you\'re cooking soon.',        href: '/meal-plan' },
      { emoji: '🛒', title: 'Shopping List', description: 'Ingredients, organized to shop.',   href: '/shopping-list' },
    ]
  },
  {
    name: 'Cooking School',
    subtitle: 'Two classrooms, a library, and your notebook.',
    items: [
      { emoji: '🎬',   title: 'Chef TV',        description: 'Cooking videos, one tap away.',         href: '/videos' },
      { emoji: '👨‍🍳', title: 'Chef Jennifer',  description: 'Create a new recipe, tailored to you.', href: '/topchef' },
      { emoji: '📚',   title: 'Guides',         description: 'Reference reading for the kitchen.',    href: '/guides' },
      { emoji: '📘',   title: 'My Playbook',    description: 'Saved videos + chef notes.',            href: '/playbook' },
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
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-orange-600">{section.name}</h2>
              {section.subtitle && <p className="text-sm text-gray-500 mt-1 leading-snug">{section.subtitle}</p>}
            </div>
            {/* Section items */}
            <div className="space-y-2.5">
              {section.items.map(item => (
                <a
                  key={item.title}
                  href={item.href}
                  className="block w-full bg-white border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span style={{fontSize:'26px', lineHeight:1}} className="shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-gray-900 leading-tight">{item.title}</h3>
                      <p className="text-sm text-gray-600 mt-0.5 leading-snug truncate">{item.description}</p>
                    </div>
                    <span className="text-gray-300 text-xl font-light shrink-0">›</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
