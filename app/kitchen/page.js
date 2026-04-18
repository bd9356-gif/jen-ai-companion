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
      { emoji: '🎬', title: 'Chef TV', href: '/videos' },
    ]
  },
  {
    name: 'Collect & Decide',
    subtitle: 'Your staging drawer — review, compare, and choose what moves into your cooking life.',
    accent: '#e85d8a',
    items: [
      { emoji: '❤️', title: 'Favorites', href: '/saved' },
    ]
  },
  {
    name: 'Your Cooking Life',
    subtitle: "Your saved recipes, cooking cards, and what you're making next.",
    accent: '#f59e0b',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',  href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',  href: '/cards' },
      { emoji: '🎯', title: 'Plan',          href: '/picks' },
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
      <main className="px-4 py-4 max-w-lg mx-auto pb-6 space-y-5">
        {SECTIONS.map(section => (
          <div key={section.name}>
            {/* Section header */}
            <div className="mb-2 px-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider" style={{color: section.accent}}>{section.name}</h2>
              {section.subtitle && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{section.subtitle}</p>}
            </div>
            {/* Section items */}
            <div className="space-y-2">
              {section.items.map(item => (
                <button
                  key={item.href}
                  onClick={() => window.location.href = item.href}
                  className="w-full text-left bg-white rounded-2xl overflow-hidden active:scale-95 transition-transform"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${section.accent}` }}
                >
                  <div className="flex items-center gap-4 px-4 py-2.5">
                    <span style={{fontSize:'22px', lineHeight:1}}>{item.emoji}</span>
                    <p className="flex-1 text-sm font-semibold text-gray-900">{item.title}</p>
                    <span className="text-gray-300 text-lg font-light">›</span>
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