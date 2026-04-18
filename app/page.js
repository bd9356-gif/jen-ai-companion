'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const FEATURES = [
  {
    emoji: '📒',
    title: 'Recipe Vault',
    blurb: 'Your personal collection — saved, organized, and always a tap away.',
  },
  {
    emoji: '👨‍🍳',
    title: 'Chef Jennifer',
    blurb: 'An AI chef who builds recipes around your mood, meal, and pantry.',
  },
  {
    emoji: '🎯',
    title: 'MyPlan',
    blurb: 'What you\'re actually cooking this week — with a shopping list to match.',
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

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      supabase.auth.getSession()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  const userName = firstNameFromUser(user)
  const image = getDailyImage()

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="text-stone-800 text-base font-semibold tracking-tight">Recipe AI Companion</span>
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
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pt-4 pb-8 flex flex-col">

        {/* Hero image with text overlay */}
        <div className="w-full rounded-3xl overflow-hidden mb-4 relative shadow-sm" style={{height: '180px'}}>
          <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/40 to-stone-900/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-5 text-center">
            {userName ? (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5 drop-shadow">
                  Welcome back, {userName}.
                </h1>
                <p className="text-stone-100 text-xs sm:text-sm drop-shadow">
                  Your kitchen is right where you left it.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5 drop-shadow">
                  Cook with a little help.
                </h1>
                <p className="text-stone-100 text-xs sm:text-sm drop-shadow">
                  Save recipes, plan meals, and ask an AI chef anything.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Primary CTA */}
        <a href={user ? '/kitchen' : '/login'}
          className="w-full py-3.5 bg-stone-800 text-white rounded-2xl text-base font-semibold hover:bg-stone-900 transition-colors text-center block shadow-sm">
          {user ? 'Enter your kitchen →' : 'Get started →'}
        </a>

        {!user && (
          <p className="text-xs text-stone-500 text-center mt-2">
            Free to start — sign in or create an account in a few taps.
          </p>
        )}

        {/* Feature tiles */}
        <section className="mt-6">
          <p className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-semibold text-center mb-3">
            What's inside
          </p>
          <div className="grid gap-2.5">
            {FEATURES.map(({ emoji, title, blurb }) => (
              <div key={title}
                className="bg-white border border-stone-200 rounded-2xl px-3.5 py-3 flex items-start gap-3">
                <span className="text-xl leading-none shrink-0 mt-0.5">{emoji}</span>
                <div className="text-left min-w-0">
                  <p className="text-stone-800 font-semibold text-sm">{title}</p>
                  <p className="text-stone-600 text-xs sm:text-sm leading-snug mt-0.5">{blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-5 border-t border-stone-200 text-center">
          <a href="/about" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            About Recipe AI Companion
          </a>
          <p className="text-[10px] text-stone-400 mt-1.5">
            A cozy cooking companion, made with care.
          </p>
        </footer>

      </main>
    </div>
  )
}
