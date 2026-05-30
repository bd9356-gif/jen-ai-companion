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
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <div className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background food image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=80&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-lg mx-auto">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">My Companion Apps</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Welcome to<br/>MyRecipe Companion
          </h1>
          <p className="text-white/85 text-lg sm:text-xl leading-relaxed mb-8">
            Your cozy, AI-smart home for cooking and learning.
          </p>
          {user ? (
            <a href="/kitchen" className="inline-block px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold rounded-2xl shadow-xl transition-colors">
              Enter My Kitchen →
            </a>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/login" className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold rounded-2xl shadow-xl transition-colors">
                Get Started Free
              </a>
              <a href="/login" className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white text-lg font-semibold rounded-2xl border border-white/30 backdrop-blur-sm transition-colors">
                Sign In
              </a>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <p className="text-white/50 text-xs">↓ See what&apos;s inside</p>
        </div>
      </div>

      {/* ── TAGLINE STRIP ── */}
      <div className="bg-orange-600 py-5 px-6 text-center">
        <p className="text-white text-lg font-semibold">More than recipes — it&apos;s your kitchen companion.</p>
      </div>

      {/* ── FEATURES ── */}
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-16">

        {/* Feature 1 — Chef Jen */}
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-full sm:w-1/2 rounded-2xl overflow-hidden shadow-lg aspect-video">
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80&fit=crop"
              alt="Chef Jen AI"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">Chef Jen AI</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ask her anything.</h2>
            <p className="text-gray-600 leading-relaxed">Chef Jen teaches, creates, and cooks with you. Ask a question, get a lesson. Request a recipe, she makes it yours. Available in Practice and Teach mode — just like a real cooking class.</p>
          </div>
        </div>

        {/* Feature 2 — Recipe Vault */}
        <div className="flex flex-col sm:flex-row-reverse items-center gap-8">
          <div className="w-full sm:w-1/2 rounded-2xl overflow-hidden shadow-lg aspect-video">
            <img
              src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80&fit=crop"
              alt="Recipe Vault"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">Recipe Vault</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your recipes, your way.</h2>
            <p className="text-gray-600 leading-relaxed">Import from any website, scan old recipe cards, or create with Chef Jen. Your vault is private, organized, and always with you. Add to your meal plan, shopping list, and share with family.</p>
          </div>
        </div>

        {/* Feature 3 — Cooking School */}
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-full sm:w-1/2 rounded-2xl overflow-hidden shadow-lg aspect-video">
            <img
              src="https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=800&q=80&fit=crop"
              alt="Cooking School"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">Cooking School</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Learn and practice every day.</h2>
            <p className="text-gray-600 leading-relaxed">Chef TV brings you curated cooking videos. Chef Jen&apos;s classroom teaches the techniques behind the recipes. Your Learning Vault saves every lesson. Cook better, one day at a time.</p>
          </div>
        </div>

      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1543353071-873f17a7a088?w=1400&q=80&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to cook smarter?</h2>
          <p className="text-white/80 text-lg mb-8">Join MyRecipe Companion — free to start.</p>
          <a href="/login" className="inline-block px-10 py-4 bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold rounded-2xl shadow-xl transition-colors">
            Get Started Free
          </a>
        </div>
      </div>

      {/* ── APP STORE ── */}
      <div className="bg-gray-50 py-10 px-6">
        <div className="max-w-sm mx-auto">
          <p className="text-center text-gray-500 text-sm mb-4">Coming to your favorite app store</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-3 py-2.5">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400">Coming Soon</p>
                <p className="text-sm font-semibold">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-3 py-2.5">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 2.92v18.16c0 .69.5 1.06 1.04.78l13.92-9.08c.5-.32.5-1.25 0-1.57L6.04 2.14C5.5 1.86 5 2.23 5 2.92z" />
              </svg>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400">Coming Soon</p>
                <p className="text-sm font-semibold">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="py-6 px-6 text-center border-t border-gray-100">
        <p className="text-gray-400 text-xs">
          © 2026 My Companion Apps
          <span className="mx-2">·</span>
          <a href="/privacy" className="hover:text-orange-600">Privacy</a>
          <span className="mx-2">·</span>
          <a href="/terms" className="hover:text-orange-600">Terms</a>
          <span className="mx-2">·</span>
          <a href="mailto:support@mycompanionapps.com" className="hover:text-orange-600">Contact</a>
        </p>
      </footer>

    </div>
  )
}