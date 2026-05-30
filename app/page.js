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
      if (session?.user) {
        setUser(session.user)
      }
    })
  }, [])

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Full screen hero image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/landing-hero-01.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Content over image */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 py-12 max-w-lg mx-auto w-full">

        {/* Top — logo/brand */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">My Companion Apps</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            MyRecipe<br/>Companion
          </h1>
          <p className="text-white/85 text-lg leading-relaxed max-w-sm">
            Your personal AI kitchen — Chef Jen cooks with you, teaches you, and keeps your recipes safe.
          </p>
        </div>

        {/* Bottom — actions */}
        <div className="space-y-3 pb-8">
          {user ? (
            <a
              href="/kitchen"
              className="block w-full py-4 bg-orange-600 hover:bg-orange-700 text-white text-center text-lg font-bold rounded-2xl shadow-lg transition-colors"
            >
              Enter My Kitchen →
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="block w-full py-4 bg-orange-600 hover:bg-orange-700 text-white text-center text-lg font-bold rounded-2xl shadow-lg transition-colors"
              >
                Get Started — It&apos;s Free
              </a>
              <a
                href="/login"
                className="block w-full py-4 bg-white/15 hover:bg-white/25 text-white text-center text-base font-semibold rounded-2xl border border-white/30 transition-colors backdrop-blur-sm"
              >
                Sign In
              </a>
            </>
          )}

          {/* App store pills */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white rounded-xl px-3 py-2.5 border border-white/20">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/60">Coming Soon</p>
                <p className="text-sm font-semibold">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white rounded-xl px-3 py-2.5 border border-white/20">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 2.92v18.16c0 .69.5 1.06 1.04.78l13.92-9.08c.5-.32.5-1.25 0-1.57L6.04 2.14C5.5 1.86 5 2.23 5 2.92z" />
              </svg>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/60">Coming Soon</p>
                <p className="text-sm font-semibold">Google Play</p>
              </div>
            </div>
          </div>

          {/* Footer links */}
          <p className="text-center text-white/50 text-xs pt-2">
            <a href="/privacy" className="hover:text-white/80">Privacy</a>
            <span className="mx-2">·</span>
            <a href="/terms" className="hover:text-white/80">Terms</a>
          </p>
        </div>
      </div>
    </div>
  )
}