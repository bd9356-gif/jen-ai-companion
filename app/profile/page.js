'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ saved: 0, personal: 0, planned: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      // Load stats
      const [saved, personal, planned] = await Promise.all([
        supabase.from('saved_recipes').select('id', { count: 'exact' }).eq('user_id', session.user.id),
        supabase.from('personal_recipes').select('id', { count: 'exact' }).eq('user_id', session.user.id),
        supabase.from('weekly_plan').select('id', { count: 'exact' }).eq('user_id', session.user.id),
      ])

      setStats({
        saved: saved.count || 0,
        personal: personal.count || 0,
        planned: planned.count || 0,
      })
      setLoading(false)
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const userName = user?.user_metadata?.full_name || user?.email || 'Chef'
  const userEmail = user?.email || ''
  const userAvatar = user?.user_metadata?.avatar_url || null
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">👤 My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Avatar and name */}
            <div className="flex flex-col items-center text-center mb-8">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-20 h-20 rounded-full mb-4 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-orange-600">{initials}</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{userEmail}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.saved}</p>
                <p className="text-xs text-gray-500 mt-1">Saved Recipes</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.personal}</p>
                <p className="text-xs text-gray-500 mt-1">My Recipes</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.planned}</p>
                <p className="text-xs text-gray-500 mt-1">Meal Plans</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="space-y-2 mb-8">
              {[
                { icon: '🔒', label: 'My Recipes', href: '/secret' },
                { icon: '❤️', label: 'Saved Recipes', href: '/saved' },
                { icon: '📅', label: 'Meal Planner', href: '/weeklyplan' },
                { icon: '👨‍🍳', label: 'AI Chef Creations', href: '/topchef' },
              ].map(({ icon, label, href }) => (
                <a key={href} href={href}
                  className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-2xl hover:border-orange-200 hover:bg-orange-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                  </div>
                  <span className="text-gray-300">→</span>
                </a>
              ))}
            </div>

            {/* Sign out */}
            <button onClick={signOut}
              className="w-full py-3 border border-red-200 text-red-400 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors">
              Sign Out
            </button>
          </>
        )}
      </main>
    </div>
  )
}