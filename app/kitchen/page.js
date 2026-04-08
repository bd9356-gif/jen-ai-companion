'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MENU_ITEMS = [
  { emoji: '🔐', title: 'MyRecipeVault',    subtitle: 'Your personal cooking library',              href: '/secret',    accent: '#f97316' },
  { emoji: '🍳', title: 'Explore Recipes',  subtitle: 'Browse the full library — swipe or scroll',  href: '/explore',   accent: '#f97316' },
  { emoji: '❤️', title: 'MyFavorites',      subtitle: 'Videos, recipes, and ideas you love',        href: '/saved',     accent: '#e85d8a' },
  { emoji: '🃏', title: 'My Recipe Cards',  subtitle: 'Quick reference cards for your go-to recipes', href: '/cards',   accent: '#f59e0b' },
  { emoji: '🎬', title: 'Cooking Videos',   subtitle: '558 videos — filter by category or channel', href: '/videos',    accent: '#f97316' },
  { emoji: '👨‍🍳', title: 'AI Chef Creations', subtitle: 'Gourmet recipes from your personal AI chef', href: '/topchef', accent: '#a855f7' },
  { emoji: '📅', title: 'Meal Planner',     subtitle: 'Plan your meals for the week ahead',          href: '/weeklyplan', accent: '#14b8a6' },
  { emoji: '🤖', title: 'MyChef AI',        subtitle: 'Ask your personal AI chef anything',          href: '/chef',      accent: '#3b82f6' },
]

export default function KitchenPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🍳 My Kitchen</h1>
            <p className="text-xs text-gray-500 mt-0.5">Everything you need — all in one place.</p>
          </div>
          <button onClick={() => window.location.href = '/profile'}
            className="flex items-center gap-1.5 bg-orange-50 text-orange-600 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-orange-100 transition-colors">
            <span>👤</span> Profile
          </button>
        </div>
      </header>

      {/* Hero Image */}
      <div className="w-full overflow-hidden" style={{height:'160px'}}>
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
          alt="My Kitchen"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Menu */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-2.5 pb-10">
        {MENU_ITEMS.map(item => (
          <button
            key={item.href}
            onClick={() => window.location.href = item.href}
            className="w-full text-left bg-white rounded-2xl overflow-hidden active:scale-95 transition-transform"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              borderLeft: `4px solid ${item.accent}`
            }}
          >
            <div className="flex items-center gap-4 px-4 py-3.5">
              <span style={{fontSize:'22px', lineHeight:1}}>{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{item.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">{item.subtitle}</p>
              </div>
              <span className="text-gray-300 text-lg font-light">›</span>
            </div>
          </button>
        ))}
      </main>
    </div>
  )
}
