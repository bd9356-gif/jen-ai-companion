'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LandingPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-end relative overflow-hidden">
      {/* Full screen hero image — not clickable */}
      <img
        src="/landing.png"
        alt="MyRecipe Companion"
        className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
      />

      {/* Button overlay at bottom */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-12 flex flex-col gap-3">
        {user ? (
          <a
            href="/kitchen"
            className="block w-full py-4 bg-orange-600 hover:bg-orange-700 text-white text-center text-lg font-bold rounded-2xl shadow-xl transition-colors"
          >
            Enter My Kitchen →
          </a>
        ) : (
          <>
            <a
              href="/login"
              className="block w-full py-4 bg-orange-600 hover:bg-orange-700 text-white text-center text-lg font-bold rounded-2xl shadow-xl transition-colors"
            >
              Get Started — It&apos;s Free
            </a>
            <a
              href="/login"
              className="block w-full py-4 bg-white/20 hover:bg-white/30 text-white text-center text-base font-semibold rounded-2xl border border-white/40 backdrop-blur-sm transition-colors"
            >
              Sign In
            </a>
          </>
        )}
        <p className="text-center text-white/50 text-xs pt-1">
          <a href="/privacy" className="hover:text-white/80">Privacy</a>
          <span className="mx-2">·</span>
          <a href="/terms" className="hover:text-white/80">Terms</a>
        </p>
      </div>
    </div>
  )
}