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
   MyKitchen hub — 2 sections, 8 tiles (April 2026 reframe).
   Every tile uses a unified orange left stripe (brand color)
   mirroring Golf's green-stripe pattern.

   Bill's reframe: the hub used to read as three flat groups
   (Your Recipes / Plan & Shop / Cooking School). Once Chef
   Jennifer + Chef TV + Guides + Playbook were all locked together
   under one Learning section, the symmetry tipped — *all* the
   cooking-life surfaces (saving + planning + shopping) belong
   together too. So the hub is two halves of the same story:

     Cooking Life       — what the user does in the kitchen.
     Learning Journey   — how the user gets better at it.

   Inside Learning Journey, Chef Jennifer leads. She's the AI
   instructor — the most personal teaching surface in the app —
   so she's the first thing a user sees in the learning column.
   Chef TV (video classroom) follows her — split into two tiles,
   one per mode (🎓 Teach for techniques, 🍳 Practice for
   recipes) — then the library (Guides), then the practice book
   (My Playbook). Splitting Chef TV is honest: unlike Chef
   Jennifer (who flexes between modes through conversation),
   Chef TV is a fixed library where you're either browsing
   techniques or browsing recipes — committing to a side at the
   hub gets the user there in one tap. The two tiles deep-link
   into /videos via ?tab=teach and ?tab=practice.

   Routing note:
   All tiles route to dedicated pages. The /picks combined view
   was retired in Phase 2C; old ?open= bookmarks still redirect
   from /picks for back-compat.

   Title format note:
   Tiles in Learning Journey use a "Name — Role" title pattern
   ("Chef Jennifer — Your Instructor") so each tile names what
   it IS in addition to what it does. This intentionally breaks
   the Phase-1 "no dash subtitles" rule for Cooking Life tiles
   (which kept the simpler "Recipe Vault" name) — Learning
   Journey's role labels carry teaching framing the plain names
   couldn't.
   ─────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    name: 'Cooking Life',
    subtitle: 'Your recipes, your plan, your essentials.',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',   description: 'Your saved recipes, organized.',   href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',   description: 'Flip through your collection.',    href: '/cards' },
      { emoji: '📅', title: 'Meal Plan',      description: 'What you\'re cooking soon.',       href: '/meal-plan' },
      { emoji: '🛒', title: 'Shopping List',  description: 'Ingredients, organized to shop.',  href: '/shopping-list' },
    ]
  },
  {
    name: 'Learning Journey',
    subtitle: 'Your classrooms, your library, your practice book.',
    items: [
      { emoji: '👨‍🍳', title: 'Chef Jennifer — Your Instructor', description: 'Your AI cooking teacher.',    href: '/chef' },
      { emoji: '🎓',   title: 'Chef TV — Teach',                 description: 'Lessons to watch and learn.', href: '/videos?tab=teach' },
      { emoji: '🍳',   title: 'Chef TV — Practice',              description: 'Recipes to watch and cook.',  href: '/videos?tab=practice' },
      { emoji: '📚',   title: 'Guides — Your Library',           description: 'Knife skills, subs, safety.', href: '/guides' },
      { emoji: '📘',   title: 'My Playbook — Your Saved Items',  description: 'Videos, recipes, and notes.', href: '/playbook' },
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
