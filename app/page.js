'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────────────────────────────
   TESTER BANNER — edit message/link here, redeploy.
   Bump BANNER.version to force-redisplay to users who dismissed.
   Set BANNER.enabled to false to hide entirely.
   ─────────────────────────────────────────────────────────── */
const BANNER = {
  enabled: true,
  version: 'v1',
  message: "Welcome, testers — here's what's new and what to try.",
  linkHref: '/notes',
  linkLabel: 'Tester notes →',
}

// Each tile carries the in-app route so signed-in visitors jump straight
// there; signed-out visitors get routed through /login first. Both paths are
// computed in render (see `tileHref` below).
const FEATURES = [
  {
    emoji: '📒',
    title: 'Recipe Vault',
    blurb: 'Your private library of saved recipes, organized and searchable.',
    route: '/secret',
  },
  {
    emoji: '🗂',
    title: 'Recipe Cards',
    blurb: 'Flip through your recipes like a deck of cozy index cards.',
    route: '/cards',
  },
  {
    emoji: '📅',
    title: 'Meal Plan',
    blurb: "What you're cooking this week, with a shopping list to match.",
    route: '/meal-plan',
  },
  {
    emoji: '👨‍🍳',
    title: 'Chef Jennifer',
    blurb: 'An AI chef who builds recipes and answers kitchen questions.',
    route: '/topchef',
  },
  {
    emoji: '📺',
    title: 'Chef TV',
    blurb: 'Cooking videos for learning skills and finding new ideas.',
    route: '/videos',
  },
]

const FOOD_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&fit=crop', name: 'Fresh & Delicious' },
  { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&fit=crop', name: 'Home Cooking' },
  { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&fit=crop', name: 'From the Kitchen' },
  { url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80&fit=crop', name: 'Family Favorites' },
  { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&fit=crop', name: 'Eat Well' },
  { url: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80&fit=crop', name: 'Made with Love' },
  { url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80&fit=crop', name: "Tonight's Dinner" },
]

function getDailyImage() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return FOOD_IMAGES[dayOfYear % FOOD_IMAGES.length]
}

function firstNameFromUser(user) {
  if (!user) return null
  const full = user.user_metadata?.full_name || user.user_metadata?.name
  if (full) return String(full).split(' ')[0]
  if (user.email) return user.email.split('@')[0]
  return null
}

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      supabase.auth.getSession()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    if (BANNER.enabled && typeof window !== 'undefined') {
      const flagKey = `recipe_ai_banner_dismissed_${BANNER.version}`
      if (!localStorage.getItem(flagKey)) {
        // Reading persisted dismissal from localStorage must happen after
        // mount (SSR has no window), so setState-in-effect is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBannerVisible(true)
      }
    }
  }, [])

  function dismissBanner() {
    setBannerVisible(false)
    try {
      localStorage.setItem(`recipe_ai_banner_dismissed_${BANNER.version}`, '1')
    } catch {}
  }

  const userName = firstNameFromUser(user)
  const image = getDailyImage()

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <span className="text-stone-900 text-lg font-bold tracking-tight">MyRecipe Companion</span>
          </div>
          {user ? (
            <a href="/kitchen" className="text-stone-800 text-sm font-medium border border-stone-300 bg-white rounded-full px-3 py-1 hover:bg-stone-100 transition-colors">
              MyKitchen →
            </a>
          ) : (
            <a href="/login" className="text-stone-700 text-sm font-medium border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-100 transition-colors">
              Sign in
            </a>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pt-2 pb-6 flex flex-col">

        {/* Tester banner (dismissible) */}
        {BANNER.enabled && bannerVisible && (
          <div className="mb-3 bg-stone-900 text-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
            <span className="text-sm leading-snug flex-1 min-w-0">
              {BANNER.message}{' '}
              <a
                href={BANNER.linkHref}
                className="underline font-semibold whitespace-nowrap"
              >
                {BANNER.linkLabel}
              </a>
            </span>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="text-stone-400 hover:text-white text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Entry box: hero image + CTA wrapped as one unit */}
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm mb-5">
          <div className="w-full relative" style={{ height: '150px' }}>
            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/35 to-stone-900/10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
              {userName ? (
                <>
                  <h1 className="text-xl font-bold text-white drop-shadow leading-tight">
                    Welcome back, {userName}.
                  </h1>
                  <p className="text-stone-100 text-xs drop-shadow mt-0.5">
                    Your kitchen is right where you left it.
                  </p>
                </>
              ) : (
                <>
                  {/* Joinery arrows match the Playbook header pattern — three
                      stages, visually connected, one habit. */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow leading-tight tracking-tight">
                    Save it <span className="text-stone-300">→</span> Plan it <span className="text-stone-300">→</span> Cook it
                  </h1>
                  <p className="text-stone-100 text-xs sm:text-sm drop-shadow mt-1">
                    Your cozy kitchen companion &mdash; recipes, meal plans, and an AI chef.
                  </p>
                </>
              )}
            </div>
          </div>
          <a
            href={user ? '/kitchen' : '/login'}
            className="block w-full py-3.5 bg-stone-800 text-white text-center text-base font-semibold hover:bg-stone-900 transition-colors"
          >
            {user ? 'Enter your kitchen →' : 'Get started →'}
          </a>
        </div>

        {/* Feature tiles — each links to its in-app page; signed-out visitors
            route through /login so a tap on any tile becomes a sign-in path. */}
        <section>
          <p className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-semibold text-center mb-2.5">
            What&apos;s inside
          </p>
          <div className="grid gap-2">
            {FEATURES.map(({ emoji, title, blurb, route }) => {
              const tileHref = user ? route : '/login'
              return (
                <a
                  key={title}
                  href={tileHref}
                  className="bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 flex items-start gap-3 hover:border-stone-400 hover:bg-stone-50 transition-colors"
                >
                  <span className="text-lg leading-none shrink-0 mt-0.5">{emoji}</span>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-stone-800 font-semibold text-sm leading-tight">{title}</p>
                    <p className="text-stone-600 text-xs leading-snug mt-0.5">{blurb}</p>
                  </div>
                  <span className="text-stone-400 text-sm shrink-0 mt-0.5" aria-hidden="true">→</span>
                </a>
              )
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-5 text-center flex items-center justify-center gap-3">
          <a href="/about" className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors">
            About MyRecipe Companion
          </a>
          <span className="text-[11px] text-stone-300">•</span>
          <a href="/notes" className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors">
            Tester notes
          </a>
        </footer>

      </main>
    </div>
  )
}
