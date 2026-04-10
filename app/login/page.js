'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/kitchen'
    })
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/confirm` }
    })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">MyRecipe Companion</h1>
        <p className="text-gray-500 text-sm mb-8">Sign in to access your personal kitchen</p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full py-4 bg-orange-600 text-white rounded-2xl text-base font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-50">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <p className="text-xs text-gray-400 mt-6">
          By signing in you agree to our terms of service
        </p>
      </div>
    </div>
  )
}