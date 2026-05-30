'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { KITCHEN_SECTIONS } from '@/lib/kitchen_sections'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────────────────────────────
   TESTER BANNER — edit message/link here, redeploy.
   Bump BANNER.version to force-redisplay to users who dismissed.
   Set BANNER.enabled to false to hide entirely.
   ─────────────────────────────────────────────────────────── */
const BANNER = {
  enabled: false,
  version: 'v1',
  message: "Welcome, testers — here's what's new and what to try.",
  linkHref: '/notes',
  linkLabel: 'Tester notes →',
}

/* ─────────────────────────────────────────────────────────────
   Daily food image — rotates by day-of-year so the hero feels
   fresh on repeat visits without flipping every reload.
   ─────────────────────────────────────────────────────────── */
const FOOD_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&fit=crop', name: 'Fresh & Delicious' },
  { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&fit=crop', name: 'Home Cooking' },
  { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&fit=crop', name: 'From the Kitchen' },
  { url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80&fit=crop', name: 'Family Favorites' },
  { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&fit=crop', name: 'Eat Well' },
  { url: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80&fit=crop', name: 'Made with Love' },
  { url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80&fit=crop', name: "Tonight's Dinner" },
]

function getDailyImage() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return FOOD_IMAGES[dayOfYear % FOOD_IMAGES.length]
}

function firstNameFromUser(user) {
  if (!user) return null
  const full = user.user_metadata?.full_name || user.user_metadata?.name
  if (full) return String(full).split(' ')[0]
  if (user.email) return user.email.split('@')[0]
  return null
}

/* ─────────────────────────────────────────────────────────────
   Landing page (April 2026 redesign — match MyKitchen).

   Visual story matches the hub exactly so signing in feels like
   stepping through a door, not switching apps:
     • bg-gray-50 page, max-w-lg container (same as /kitchen)
     • orange accents (brand color from MyKitchen)
     • the same two sections (Cooking Life / Learning Journey)
       with the same orange uppercase headers and the same
       orange-stripe tiles, sourced from KITCHEN_SECTIONS so the
       two pages can never drift
     • food photo hero on top — only thing the landing has that
       MyKitchen doesn't, since the landing is the front door
       for cold visitors

   Tile hrefs on the landing are overridden: signed-in visitors
   route to /kitchen (let the real hub take it from there), and
   signed-out visitors route to /login. The KITCHEN_SECTIONS hrefs
   are deliberately ignored on the landing — every tile becomes a
   sign-in path or a hub entry.
   ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [user, setUser] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      supabase.auth.getSession()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    if (BANNER.enabled && typeof window !== 'undefined') {
      const flagKey = `recipe_ai_banner_dismissed_${BANNER.version}`
      if (!localStorage.getItem(flagKey)) {
        // Reading persisted dismissal from localStorage must happen after
        // mount (SSR has no window), so setState-in-effect is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBannerVisible(true)
      }
    }
  }, [])

  function dismissBanner() {
    setBannerVisible(false)
    try {
      localStorage.setItem(`recipe_ai_banner_dismissed_${BANNER.version}`, '1')
    } catch {}
  }

  const userName = firstNameFromUser(user)
  const image = getDailyImage()
  const tileHref = user ? '/kitchen' : '/login'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f0e8' }}>

      {/* Header — mirrors MyKitchen's pattern: brand left, action pill
          right. Profile pill on /kitchen is bg-orange-50 text-orange-600;
          here the entry pill picks up the same orange so the two pages
          read as siblings. */}


      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-3 pb-8 flex flex-col">

        {/* Tester banner (dismissible) — kept as the dark stone-900 strip
            so it reads as a temporary callout against the warm orange
            accents below. */}
        {BANNER.enabled && bannerVisible && (
          <div className="mb-3 bg-stone-900 text-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
            <span className="text-sm leading-snug flex-1 min-w-0">
              {BANNER.message}{' '}
              <a
                href={BANNER.linkHref}
                className="underline font-semibold whitespace-nowrap"
              >
                {BANNER.linkLabel}
              </a>
            </span>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="text-stone-400 hover:text-white text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Entry box: hero image + CTA wrapped as one unit. The hero is
            kept short (130px) so the whole landing — hero, both
            sections, all 8 tiles, footer — fits on a phone screen
            without scrolling. The headline is sized accordingly so it
            still reads at a glance against the dark gradient. CTA uses
            bg-orange-600 (MyKitchen's brand color) so signing in feels
            like crossing the same threshold as a tile tap on the hub. */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-3 mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{height:"200px", overflow:"hidden"}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing-hero-01.png" alt="Cooking, figured out." className="w-full h-auto block" width={1774} height={887} />
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-lockup.png" alt="MyRecipe Companion" width="511" height="156" className="h-14 w-auto" />
            </div>
            {userName ? (
              <a href="/kitchen" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                Welcome back, {userName} →
              </a>
            ) : (
              <a href="/login" className="bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-700 transition-colors">
                Sign in
              </a>
            )}
          </div>

        </div>

        {/* What's inside — a preview of MyKitchen, rendered with the
            same section headers + orange-stripe tile pattern. The tile
            hrefs are overridden with `tileHref` so signed-out visitors
            land on /login on any tap; signed-in visitors land on
            /kitchen and pick from there.

            Density note (April 2026): the landing intentionally renders
            tiles WITHOUT descriptions or section subtitles. The hub
            ships the long-form copy; here the goal is "see the shape
            of the app on one phone screen". The section name plus the
            emoji + title is enough to telegraph what's inside. */}
        <div className="space-y-3">
          {KITCHEN_SECTIONS.map(section => {
            // Per-section color (May 2026): same color story as the
            // hub tiles — Cook = orange, Learn Your Way = sky.
            const c = section.color || {
              label: 'text-orange-600',
              stripe: 'border-l-orange-600',
              hover: 'hover:border-orange-300',
            }
            return (
              <div key={section.name}>
                {/* Section header — label only, no subtitle. */}
                <div className="mb-1.5 px-1">
                  <h2 className={`text-sm font-extrabold uppercase tracking-wider ${c.label}`}>{section.name}</h2>
                </div>
                {/* Section items — single-line tiles (emoji + title +
                    chevron). py-2 instead of py-2.5; no description row. */}
                <div className="space-y-1.5">
                  {section.items.map(item => (
                    <a
                      key={item.title}
                      href={tileHref}
                      className={`block w-full bg-white border-2 border-gray-200 border-l-8 ${c.stripe} ${c.hover} hover:shadow-sm rounded-xl px-3 py-2 transition-all active:scale-[0.98]`}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{fontSize:'20px', lineHeight:1}} className="shrink-0">{item.emoji}</span>
                        <h3 className="flex-1 min-w-0 font-semibold text-sm text-gray-900 leading-tight truncate">{item.title}</h3>
                        <span className="text-gray-300 text-lg font-light shrink-0">›</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* App Store / Google Play "Coming Soon" buttons (May 2026). Brand-
            safe styled pills — Apple silhouette + Google Play arrow on a
            dark stone background, with "Coming Soon" eyebrow telegraphing
            that the native apps are on the way. Honest about state; swap
            for the real official badges once the apps actually ship. */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-stone-900 text-white rounded-xl px-3 py-2.5" aria-label="App Store — coming soon">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider text-stone-400 leading-none">Coming Soon</p>
              <p className="text-sm font-semibold leading-tight mt-0.5">App Store</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-stone-900 text-white rounded-xl px-3 py-2.5" aria-label="Google Play — coming soon">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M5 2.92v18.16c0 .69.5 1.06 1.04.78l13.92-9.08c.5-.32.5-1.25 0-1.57L6.04 2.14C5.5 1.86 5 2.23 5 2.92z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider text-stone-400 leading-none">Coming Soon</p>
              <p className="text-sm font-semibold leading-tight mt-0.5">Google Play</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-5 text-center flex items-center justify-center gap-3">
          <a href="/about" className="text-[11px] text-stone-500 hover:text-orange-600 transition-colors">
            About MyRecipe Companion
          </a>
          <span className="text-[11px] text-stone-300">•</span>
          <a href="/notes" className="text-[11px] text-stone-500 hover:text-orange-600 transition-colors">
            Tester notes
          </a>
        </footer>

      </main>
    </div>
  )
}