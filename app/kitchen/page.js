'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function DrawerCard({ emoji, title, subtitle, href, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-100 text-orange-900',
    green:  'bg-green-100 text-green-900',
    purple: 'bg-purple-100 text-purple-900',
    amber:  'bg-amber-100 text-amber-900',
    teal:   'bg-teal-100 text-teal-900',
    rose:   'bg-rose-100 text-rose-900',
    blue:   'bg-blue-100 text-blue-900',
  }
  return (
    <button onClick={() => window.location.href = href}
      className="w-full text-left border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 hover:shadow-sm transition-all active:scale-95">
      <div className={`px-4 py-3 font-bold text-sm ${colors[color]}`}>
        {emoji} {title}
      </div>
      {subtitle && (
        <div className="px-4 py-3 text-sm text-gray-500 leading-snug">{subtitle}</div>
      )}
    </button>
  )
}

export default function KitchenPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="relative w-full overflow-hidden" style={{height:'220px'}}>
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
          alt="My Kitchen"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-2xl font-bold text-white leading-tight">🍳 My Kitchen</h1>
          <p className="text-sm text-white/80 mt-0.5 leading-snug">
            Everything you use for cooking, planning, and finding great meals — all organized in one place.
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-orange-500">👇 Open a drawer to get started</p>
      </div>

      <main className="px-4 pb-8 space-y-3 max-w-4xl mx-auto">
        <DrawerCard emoji="🔐" title="MyRecipeVault" subtitle="Your personal cooking library — recipes, videos, and AI creations you choose to keep." href="/secret" color="orange" />
        <DrawerCard emoji="🎴" title="MyRecipeDeck" subtitle="Swipe through recipes for quick inspiration." href="/explore" color="amber" />
        <DrawerCard emoji="❤️" title="MyFavorites" subtitle="Everything you've saved — videos, recipes, and ideas you want to revisit." href="/saved" color="rose" />
        <DrawerCard emoji="🃏" title="My Recipe Cards" subtitle="Quick reference cards for your go-to recipes." href="/cards" color="amber" />
        <DrawerCard emoji="🎬" title="Cooking Videos" subtitle="558 videos — filter by category, channel, or recipe type." href="/videos" color="orange" />
        <DrawerCard emoji="👨‍🍳" title="AI Chef Creations" subtitle="Gourmet recipes crafted by your personal AI chef." href="/topchef" color="purple" />
        <DrawerCard emoji="📅" title="Meal Planner" subtitle="Plan your meals for the week ahead." href="/weeklyplan" color="teal" />
        <DrawerCard emoji="🤖" title="MyChef AI" subtitle="Ask your personal AI chef anything about cooking." href="/chef" color="blue" />
      </main>
    </div>
  )
}