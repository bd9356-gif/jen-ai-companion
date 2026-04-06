'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const KITCHEN_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop', name: 'The Kitchen' },
  { url: 'https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=800&q=80&fit=crop', name: 'Home Cooking' },
  { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&fit=crop', name: 'Made with Love' },
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&fit=crop', name: 'Fresh & Delicious' },
  { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&fit=crop', name: 'Eat Well' },
  { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&fit=crop', name: 'From the Kitchen' },
  { url: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80&fit=crop', name: 'Tonight\'s Dinner' },
]

function getDailyImage() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return KITCHEN_IMAGES[(dayOfYear + 2) % KITCHEN_IMAGES.length]
}

const SECTIONS = [
  {
    icon: '🔒',
    title: 'MyRecipes',
    subtitle: '— Your Recipe Library',
    desc: 'The heart of your recipe library, all in one trusted place.',
    href: '/secret',
  },
  {
    icon: '🎴',
    title: 'MyRecipe Deck',
    subtitle: '— Swipe & Discover',
    desc: 'A simple, swipe-friendly way to browse recipes.',
    href: '/explore',
  },
  {
    icon: '🔍',
    title: 'Browse Recipes',
    subtitle: '— Search & Find',
    desc: 'A classic, easy-to-scan list for finding exactly what you need.',
    href: '/recipes',
  },
  {
    icon: '❤️',
    title: 'Your Favorite Recipes',
    subtitle: '— Saved & Easy to Find',
    desc: 'Your go-to favorites, saved and easy to find.',
    href: '/saved',
  },
  {
    icon: '🃏',
    title: 'My Recipe Cards',
    subtitle: '— Beautifully Carded',
    desc: 'Your saved recipes, gratefully carded and simple to use.',
    href: '/cards',
  },
  {
    icon: '👨‍🍳',
    title: 'AI Chef Creations',
    subtitle: '— Smart & Elevated',
    desc: 'Smart, chef-inspired dishes made just for you.',
    href: '/topchef',
  },
  {
    icon: '📅',
    title: 'Meal Planner',
    subtitle: '— Daily & Weekly',
    desc: 'Daily and weekly meals, planned your way.',
    href: '/weeklyplan',
  },
  {
    icon: '🤖',
    title: 'MyChef AI',
    subtitle: '— Ask the Chef',
    desc: 'Your personal AI chef, ready whenever you need help.',
    href: '/chef',
  },
]

export default function KitchenPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        await supabase.auth.getSession()
        window.history.replaceState({}, document.title, window.location.pathname)
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    init()
  }, [])

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Chef'
  const image = getDailyImage()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-4xl">🍽️</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">MyRecipe Companion</h1>
                <p className="text-xs text-gray-400">Your AI guide to great cooking</p>
              </div>
            </div>
            <a href="/profile" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <span>👤</span> {userName}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* Daily rotating kitchen image with overlay */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{height: '220px'}}>
          <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45 rounded-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow">My Kitchen</h2>
            <p className="text-orange-200 text-sm mb-3">
              What are we cooking today, {userName}?
            </p>
            <a href="/recipes" className="inline-block bg-orange-600/90 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-orange-700 transition-colors">
              🍳 Browse Recipes
            </a>
          </div>
          <div className="absolute bottom-2 right-3">
            <span className="text-white/50 text-xs">{image.name}</span>
          </div>
        </div>

        {/* Section cards */}
        <div className="space-y-3">
          {SECTIONS.map(({ icon, title, subtitle, desc, href }) => (
            <a
              key={title}
              href={href}
              className="block bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 transition-colors shadow-sm"
            >
              {/* Drawer header stripe */}
              <div className="bg-orange-700 px-4 py-2 flex items-center justify-between">
                <span className="text-orange-200 font-semibold text-xs tracking-wider uppercase">{title}</span>
                <span className="text-orange-300 text-lg">{icon}</span>
              </div>
              {/* Drawer body */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
                </div>
                <span className="text-gray-300 text-xl ml-3 shrink-0">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }}
          className="mt-8 w-full py-3 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </main>
    </div>
  )
}