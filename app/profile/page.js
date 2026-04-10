'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ProfilePage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      setLoading(false)
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function getInitials(user) {
    if (!user) return '?'
    const name = user.user_metadata?.full_name || user.email || ''
    const parts = name.split(/[\s@]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.location.href = '/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Avatar + Name */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-orange-600">{getInitials(user)}</span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">{user?.user_metadata?.full_name || 'My Account'}</p>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">Member since</p>
            <p className="text-sm text-gray-900 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* App Links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">App</p>
          </div>
          <button onClick={() => window.location.href = '/about'}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50">
            <p className="text-sm text-gray-900">About MyRecipe Companion</p>
            <span className="text-gray-300 text-lg">›</span>
          </button>
          <a href="https://mycompanionapps.com" target="_blank" rel="noreferrer"
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <p className="text-sm text-gray-900">MyCompanionApps.com</p>
            <span className="text-gray-300 text-lg">↗</span>
          </a>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-4 bg-white text-red-500 font-semibold rounded-2xl shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>

      </main>
    </div>
  )
}