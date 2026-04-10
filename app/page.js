'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATS = [
  { stat: '1,464', label: 'Recipes' },
  { stat: '14', label: 'Categories' },
  { stat: '27', label: 'Cuisines' },
  { stat: 'AI', label: 'Personalized' },
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

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || null
  const image = getDailyImage()

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="bg-orange-700 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <span className="text-orange-100 text-lg font-semibold">MyRecipe Companion</span>
          </div>
          {user ? (
            <a href="/kitchen" className="text-orange-200 text-sm border border-orange-500 rounded-xl px-4 py-1.5 hover:bg-orange-600 transition-colors">
              My Kitchen →
            </a>
          ) : (
            <a href="/login" className="text-orange-200 text-sm border border-orange-500 rounded-xl px-4 py-1.5 hover:bg-orange-600 transition-colors">
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-4 pb-12 flex flex-col items-center text-center">

        {/* Hero image with text overlay */}
        <div className="w-full rounded-2xl overflow-hidden mb-6 relative" style={{height: '240px'}}>
          <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45 rounded-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {userName ? (
              <>
                <h1 className="text-2xl font-bold text-white mb-1 drop-shadow">
                  Welcome back, {userName}!
                </h1>
                <p className="text-orange-200 text-sm drop-shadow">
                  Your kitchen is ready — let's cook something great.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-1 drop-shadow">
                  Welcome to MyRecipe Companion
                </h1>
                <p className="text-orange-200 text-sm drop-shadow">
                  1,464 recipes matched to your taste — powered by AI.
                </p>
              </>
            )}
          </div>
          <div className="absolute bottom-2 right-3">
            <span className="text-white/50 text-xs">{image.name}</span>
          </div>
        </div>

        {/* Primary CTA */}
        <a href={user ? '/kitchen' : '/login'}
          className="w-full py-4 bg-orange-600 text-white rounded-2xl text-lg font-semibold hover:bg-orange-700 transition-colors text-center block mb-3">
          🍽️ Enter My Kitchen
        </a>

        {!user && (
          <p className="text-sm text-gray-400 mb-8">
            Sign in or create a free account to get started
          </p>
        )}

        {/* Stats */}
        <div className="w-full mt-4 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-orange-700 px-4 py-2">
            <p className="text-orange-200 text-xs font-semibold tracking-wider text-center uppercase">Recipe Card</p>
          </div>
          <div className="grid grid-cols-2">
            {STATS.map(({ stat, label }, i) => (
              <div key={label}
                className={`p-5 text-center ${i % 2 === 0 ? 'border-r border-gray-200' : ''} ${i >= 2 ? 'border-t border-gray-200' : ''}`}>
                <p className="text-2xl font-bold text-orange-600">{stat}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <a href="/about" className="mt-8 text-sm text-gray-400 hover:text-gray-600">
          About MyRecipe Companion →
        </a>

      </main>
    </div>
  )
}