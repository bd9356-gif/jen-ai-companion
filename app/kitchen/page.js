'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  STARTER_RECIPES,
  STARTER_RECIPES_VERSION,
  STARTER_CHEF_NOTES,
  STARTER_CHEF_NOTES_VERSION,
  FAVORITE_STARTER_TITLES,
  STARTER_BACKFILL_VERSION,
} from '@/lib/starter_recipes'
import { KITCHEN_SECTIONS } from '@/lib/kitchen_sections'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Recognized prefix on the family_notes line of every app-seeded starter
// recipe. We use this to tell starter rows apart from a user's own saves
// when seeding downstream surfaces (Meal Plan), so we never auto-add a
// user's personally-favorited recipes to ⭐ To Make.
const STARTER_FAMILY_NOTES_PREFIX = 'Welcome — this starter'

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
    is_favorite: !!r.is_favorite,
  }))
  const { error: insertError } = await supabase.from('personal_recipes').insert(rows)
  if (!insertError) localStorage.setItem(flagKey, '1')
}

// Backfill is_favorite=true on existing starter rows whose seed missed
// the column write. Why this exists: the original v1/v2 ship included
// is_favorite in the insert, but on at least one tester's account
// (Hotmail sign-up, April 2026) the column never landed — likely a
// PostgREST schema-cache lag right after migration 011 applied. Result:
// ❤️ Favorites filter chip didn't appear, hearts didn't highlight, and
// the Meal Plan seeder (which used to filter by is_favorite=true)
// returned nothing.
//
// Defensive fix: on every MyKitchen visit, run an idempotent UPDATE
// that flags any row matching FAVORITE_STARTER_TITLES + the starter
// family_notes prefix. Gated on STARTER_BACKFILL_VERSION so we don't
// hammer the DB on every load — only the first visit per version. The
// UPDATE itself is a no-op if is_favorite is already true, so re-running
// across deploys is safe.
//
// Note: this runs even if the user already has a populated Vault. The
// match by FAVORITE_STARTER_TITLES + the "Welcome — this starter"
// family_notes prefix means we only ever touch app-seeded rows, never a
// user's own recipes.
async function backfillStarterFavoritesOnce(user) {
  if (typeof window === 'undefined' || !user?.id) return
  const flagKey = `recipe_ai_starter_backfill_${STARTER_BACKFILL_VERSION}_${user.id}`
  if (localStorage.getItem(flagKey)) return

  const { error } = await supabase
    .from('personal_recipes')
    .update({ is_favorite: true })
    .eq('user_id', user.id)
    .in('title', FAVORITE_STARTER_TITLES)
    .ilike('family_notes', `${STARTER_FAMILY_NOTES_PREFIX}%`)
  // Set flag whether or not rows existed — if the user has no starters
  // to backfill (e.g. they opted out by emptying their Vault), retrying
  // every visit is wasted work. If the column is broken on the project,
  // the UPDATE will silently no-op; setting the flag still prevents a
  // retry storm. The Meal Plan seeder below filters by title list (not
  // is_favorite) so it self-heals regardless of what happened here.
  if (!error) localStorage.setItem(flagKey, '1')
}

// NOTE: The Meal Plan seeder was removed (April 2026). It used to
// auto-populate ⭐ To Make from the favorite-flagged starter recipes,
// which conflated two separate gestures — clicking ❤️ Favorite is a
// preference signal, while tapping 📅 Meal Plan is the explicit
// "I'm cooking this" gesture. Coupling them at seed-time taught the
// wrong mental model on day one. New users now see an empty Meal Plan
// and discover the surface by tapping the tile, then fill it via the
// 📅 Meal Plan button on a Vault recipe (or a Card / Chef Jennifer
// recipe). Do NOT re-add automatic seeding here without revisiting
// the product framing.

// Seed two starter Chef Notes the first time a user lands on MyKitchen.
// Independent of the recipe seeder: gated on its own version flag and its
// own emptiness check (favorites where type='ai_answer'), so a user who
// got the v1 recipe seed without notes still picks up notes here. Mirrors
// two of the empty-state suggested prompts on /chef so the surfaces feel
// connected — tap that prompt later, see your saved note already there.
async function seedChefNotesOnce(user) {
  if (typeof window === 'undefined' || !user?.id) return
  const flagKey = `recipe_ai_chef_notes_seeded_${STARTER_CHEF_NOTES_VERSION}_${user.id}`
  if (localStorage.getItem(flagKey)) return

  const { count, error: countError } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'ai_answer')
  if (countError) return
  if ((count || 0) > 0) {
    localStorage.setItem(flagKey, '1')
    return
  }

  const rows = STARTER_CHEF_NOTES.map(n => ({
    user_id: user.id,
    type: 'ai_answer',
    title: n.title.substring(0, 120),
    thumbnail_url: '',
    source: 'ai',
    is_in_vault: false,
    metadata: { question: n.title, answer: n.answer },
  }))
  const { error: insertError } = await supabase.from('favorites').insert(rows)
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
   Chef TV (video classroom) follows her, then the library
   (Guides), then the practice book (My Playbook).

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

   The section/tile data lives in lib/kitchen_sections.js so
   the landing page (app/page.js) renders the same structure
   without drift.
   ─────────────────────────────────────────────────────────── */

export default function KitchenPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        // Seed starter content on first visit. Each seeder is idempotent
        // and gated by its own version flag, so they can ship and bump
        // independently. Errors are swallowed — a failed seed should
        // never block the user from using the hub.
        //
        // Order matters in this chain:
        //   1. Recipes — insert the 5 starters into personal_recipes
        //   2. Backfill — flag favorite-titled starters as is_favorite
        //      (catches any tester whose first-seed write missed the
        //      column due to PostgREST schema-cache lag right after
        //      migration 011)
        //
        // Meal Plan intentionally is NOT auto-seeded — favoriting and
        // meal-planning are two separate user gestures. See the long
        // comment above seedChefNotesOnce.
        //
        // Chef Notes is independent and runs in parallel.
        seedStarterRecipesOnce(session.user)
          .catch(() => {})
          .then(() => backfillStarterFavoritesOnce(session.user))
          .catch(() => {})
        seedChefNotesOnce(session.user).catch(() => {})
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header — matches the landing's header rhythm (text-lg brand,
          [11px] subtitle, py-3) so cresting from /  to /kitchen feels
          continuous, not like jumping into a roomier page. */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-5 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-bold text-gray-900">👨‍🍳 MyKitchen</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Everything you need — all in one place.</p>
        </div>
        <button onClick={() => window.location.href='/profile'}
          className="flex items-center gap-1.5 bg-orange-50 text-orange-600 rounded-full px-3 py-1.5 text-xs font-semibold">
          👤 Profile
        </button>
      </div>
      </div>

      {/* Sections — tightened so all 8 tiles + both section labels
          sit on a phone screen without scrolling. Tile descriptions
          stay (this is the hub — descriptions help with destination
          choice; on the landing they were dropped because the hub
          itself ships the long-form copy). */}
      <main className="px-4 pt-3 pb-6 max-w-lg mx-auto space-y-5">
        {KITCHEN_SECTIONS.map(section => (
          <div key={section.name}>
            {/* Section header */}
            <div className="mb-2 px-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">{section.name}</h2>
              {section.subtitle && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{section.subtitle}</p>}
            </div>
            {/* Section items — px-3 py-2.5 rounded-xl, 22px emoji,
                text-sm title, text-xs description. Same rhythm as
                the landing's tiles so the two pages read identically. */}
            <div className="space-y-2">
              {section.items.map(item => (
                <a
                  key={item.title}
                  href={item.href}
                  className="block w-full bg-white border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-xl px-3 py-2.5 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span style={{fontSize:'22px', lineHeight:1}} className="shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 leading-tight truncate">{item.title}</h3>
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug truncate">{item.description}</p>
                    </div>
                    <span className="text-gray-300 text-lg font-light shrink-0">›</span>
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
