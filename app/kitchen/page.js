'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SECTIONS = [
  {
    name: 'Explore',
    subtitle: 'Find ideas, inspiration, and dishes worth considering.',
    accent: '#f97316',
    items: [
      { emoji: '🍳', title: 'Explore Recipes', href: '/explore' },
      { emoji: '🎬', title: 'TopChef Videos',  href: '/videos' },
    ]
  },
  {
    name: 'Collect & Decide',
    subtitle: 'Your staging drawer — review, compare, and choose what moves into your cooking life.',
    accent: '#e85d8a',
    items: [
      { emoji: '❤️', title: 'MyFavorites', href: '/saved' },
    ]
  },
  {
    name: 'Your Cooking Life',
    subtitle: "Your saved recipes, cooking cards, and what you're making next.",
    accent: '#f59e0b',
    items: [
      { emoji: '🔐', title: 'MyRecipeVault',  href: '/secret' },
      { emoji: '🃏', title: 'MyRecipe Cards', href: '/cards' },
      { emoji: '🎯', title: 'MyPicks',        href: '/picks' },
    ]
  },
  {
    name: 'AI Helpers',
    subtitle: 'Smart support whenever you need ideas, guidance, or answers.',
    accent: '#a855f7',
    items: [
      { emoji: '👨‍🍳', title: 'MY-AI ChefJen',  href: '/topchef' },
      { emoji: '🤖', title: 'Ask-AI Anything', href: '/chef' },
    ]
  },
]

export default function KitchenPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{height:'140px'}}>
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
          alt="My Kitchen"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-2xl font-bold text-white leading-tight">🍳 My Kitchen</h1>
          <p className="text-sm text-white/80 mt-0.5">Everything you need — all in one place.</p>
        </div>
        <button onClick={() => window.location.href='/profile'}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-xs font-semibold">
          👤 Profile
        </button>
      </div>

      {/* Sections */}
      <main className="px-4 py-3 max-w-2xl mx-auto pb-4 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.name}>
            {/* Section header */}
            <div className="mb-1.5 flex items-center gap-2">
              <div style={{width:'3px', height:'14px', backgroundColor: section.accent, borderRadius:'2px', flexShrink:0}} />
              <h2 className="text-xs font-extrabold uppercase tracking-wider" style={{color: section.accent}}>{section.name}</h2>
            </div>
            {/* Section items */}
            <div className="space-y-1.5">
              {section.items.map(item => (
                <button
                  key={item.href}
                  onClick={() => window.location.href = item.href}
                  className="w-full text-left bg-white rounded-xl active:scale-95 transition-transform"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
                >
                  <div className="flex items-center gap-3 py-2.5">
                    <div style={{width:'4px', alignSelf:'stretch', backgroundColor: section.accent, flexShrink:0}} />
                    <span style={{fontSize:'18px', lineHeight:1, paddingLeft:'8px'}}>{item.emoji}</span>
                    <p className="flex-1 text-sm font-semibold text-gray-900">{item.title}</p>
                    <span className="text-gray-300 text-lg font-light pr-4">›</span>
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