'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Detect whether the page is loaded inside an in-app browser webview
// (Pinterest, Instagram, Facebook, Twitter/X, LinkedIn, TikTok, etc.).
// These embedded webviews break OAuth (Google blocks them outright)
// and don't persist session cookies, so the user gets a frustrating
// half-broken sign-in flow. The fix is "Open in Safari" — which most
// in-app browsers have in their ⋯ / share menu. We detect via UA
// string heuristics and surface a banner telling the user what to do.
function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  // Specific named in-app browsers — return the social platform name
  // so the banner can address it directly ("inside Pinterest" reads
  // friendlier than "inside an in-app browser").
  if (/Pinterest/i.test(ua)) return 'Pinterest'
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook'
  if (/Twitter/i.test(ua)) return 'Twitter'
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn'
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok'
  if (/Snapchat/i.test(ua)) return 'Snapchat'
  if (/Line\//i.test(ua)) return 'LINE'
  // iOS catch-all: real Safari always has "Safari/" in its UA; an
  // in-app webview on iOS does not. If we're on iOS but Safari is
  // missing, we're in an unknown embedded webview.
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS && !/Safari\//i.test(ua)) return 'in-app browser'
  // Android catch-all: WebView UAs contain "; wv)".
  if (/Android.*;\s*wv\)/i.test(ua)) return 'in-app browser'
  return null
}

// Read `next` from the URL and validate it's a same-origin relative
// path — anything else is dropped. Lets callers preserve the URL the
// user was originally trying to reach (e.g. /secret?import=…) across
// the OAuth round-trip; without this every sign-in dumps them on
// /kitchen and the import URL is lost. Returns a query-string
// fragment ready to append to a callback URL, or '' if no next.
function nextSuffix() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = new URLSearchParams(window.location.search).get('next')
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return ''
    return `?next=${encodeURIComponent(raw)}`
  } catch { return '' }
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // In-app browser detection (May 2026). Runs on mount; if non-null,
  // we render a banner at the top of the page telling the user to
  // open the link in their real browser. Detection only happens
  // once because navigator.userAgent doesn't change after page load.
  const [inAppBrowser, setInAppBrowser] = useState(null)
  // Native iOS detection (May 2026). When the app is running inside
  // the Capacitor wrap on iPhone, we show the native "Sign in with
  // Apple" button which uses ASAuthorizationController under the hood
  // — no OAuth round-trip, no web webview redirect, no JWT key
  // rotation, just a one-tap FaceID flow. Detected via Capacitor's
  // global, which is only injected in the native app context.
  const [isIOSNative, setIsIOSNative] = useState(false)
  useEffect(() => {
    setInAppBrowser(detectInAppBrowser())
    if (typeof window !== 'undefined') {
      const cap = window.Capacitor
      setIsIOSNative(!!(cap && typeof cap.getPlatform === 'function' && cap.getPlatform() === 'ios'))
    }
  }, [])

  async function handleGoogle() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback${nextSuffix()}` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  // Native Sign in with Apple (May 2026) — iOS-only path. When the
  // app is running inside the Capacitor wrap on iPhone, we call the
  // @capacitor-community/apple-sign-in plugin which under the hood
  // uses iOS's ASAuthorizationController. That gives us a one-tap
  // FaceID flow tied to the device's Apple ID — no OAuth round-trip,
  // no JWT generation, no Service ID domain config, no 6-month key
  // rotation. The identity token Apple returns is passed to Supabase
  // via signInWithIdToken('apple'), which verifies the token's
  // signature against Apple's public keys and creates/finds the user.
  //
  // For this to work, Supabase's Apple provider must accept the App
  // ID 'com.mycompanionapps.recipe' as a valid client ID — the same
  // identifier iOS will set as the token's `aud` claim. See AGENTS.md
  // for the Supabase config detail.
  async function handleAppleNative() {
    setError('')
    setLoading(true)
    try {
      // Dynamic import — the native plugin doesn't exist on the web,
      // so we only load it when actually inside the iOS app.
      const mod = await import('@capacitor-community/apple-sign-in')
      const SignInWithApple = mod.SignInWithApple
      const result = await SignInWithApple.authorize({
        clientId: 'com.mycompanionapps.recipe',
        // redirectURI is required by the plugin contract but not
        // actually used for native flows (ASAuthorizationController
        // handles the auth on-device).
        redirectURI: `${window.location.origin}/auth/callback`,
        scopes: 'email name',
      })
      const idToken = result?.response?.identityToken
      if (!idToken) throw new Error('Apple did not return an identity token.')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
      })
      if (error) throw error
      // Honor the `next` URL if present and same-origin; otherwise /kitchen.
      const raw = new URLSearchParams(window.location.search).get('next')
      const dest = (raw && raw.startsWith('/') && !raw.startsWith('//')) ? raw : '/kitchen'
      window.location.href = dest
    } catch (err) {
      // User-cancel comes back as a specific error — silently swallow,
      // they tapped the X / cancelled the sheet, not an actual failure.
      const msg = (err && (err.message || err.toString())) || ''
      const cancelled = /canceled|cancel|1001|user canceled|AuthorizationError/i.test(msg)
      if (!cancelled) setError(msg || 'Apple Sign In failed')
      setLoading(false)
    }
  }

  // Microsoft OAuth — covers Hotmail, Outlook.com, Live, MSN, Office365.
  // Supabase's provider name is 'azure'; user-facing brand is "Sign in
  // with Microsoft" per Microsoft brand guidelines. Added as a peer to
  // Google so Hotmail testers don't have to rely on the magic-link
  // fallback (which is fragile in mobile email apps' in-app browsers).
  async function handleMicrosoft() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextSuffix()}`,
        scopes: 'email openid profile',
      }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed) return
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${nextSuffix()}`,
      },
    })
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/" className="flex flex-col items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-192-transparent.png"
              alt=""
              width="96"
              height="96"
              className="w-24 h-24 shrink-0"
            />
            <span className="text-stone-900 text-2xl font-bold tracking-tight whitespace-nowrap">MyRecipe Companion</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-6 pb-8">
        <div className="w-full max-w-sm">
          {/* In-app browser warning banner (May 2026). When the user
              lands on this page inside Pinterest, Instagram, Facebook,
              etc., Google blocks OAuth and session cookies don't
              persist, so signing in is fundamentally broken from
              there. Show a banner before the form so the user knows
              the fix (open in real browser) before they hit the wall. */}
          {inAppBrowser && (
            <div className="mb-5 bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3 text-sm">
              <p className="font-bold text-amber-900 mb-1">
                📱 You&rsquo;re inside {inAppBrowser}&rsquo;s browser
              </p>
              <p className="text-amber-900 leading-snug">
                Sign-in doesn&rsquo;t work reliably in here &mdash; Google blocks it for security. Tap the <span className="font-bold">⋯</span> menu at the top of this page and choose <span className="font-bold">&ldquo;Open in Safari&rdquo;</span> (or your browser), then sign in from there.
              </p>
            </div>
          )}

          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-stone-900">Welcome back</h1>
            <p className="text-stone-500 mt-1">Sign in to your kitchen</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ─── Sign in with Apple — iOS NATIVE ONLY ───
                 Only renders when running inside the Capacitor iOS
                 wrap. Bypasses the web OAuth flow entirely; uses
                 ASAuthorizationController + the device's Apple ID
                 + FaceID. Apple's brand guidelines say SiwA should
                 sit first or at equal-best prominence among social
                 sign-in options when available, so it leads. */}
          {isIOSNative && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 text-center">
                Use your Apple ID
              </p>
              <button
                onClick={handleAppleNative}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-xl text-base font-semibold hover:bg-stone-900 disabled:opacity-60 transition-colors shadow-sm"
              >
                {/* Apple silhouette per Apple's brand guidelines */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                {loading ? 'Signing in…' : 'Sign in with Apple'}
              </button>
              <p className="mt-2 text-xs text-stone-500 text-center leading-snug">
                One tap &mdash; FaceID confirms, you&rsquo;re in.
              </p>
            </div>
          )}

          {/* ─── Option 1: Gmail / Google ─── */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 text-center">
              Have a Gmail address?
            </p>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-stone-800 rounded-xl text-base font-semibold text-stone-800 hover:bg-stone-100 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in…' : 'Sign in with Gmail'}
            </button>
            <p className="mt-2 text-xs text-stone-500 text-center leading-snug">
              One tap — uses your Google / Gmail account.
            </p>
          </div>

          {/* ─── Option 2: Hotmail / Microsoft ─── */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 text-center">
              Have a Hotmail or Outlook address?
            </p>
            <button
              onClick={handleMicrosoft}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-stone-800 rounded-xl text-base font-semibold text-stone-800 hover:bg-stone-100 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
              </svg>
              {loading ? 'Signing in…' : 'Sign in with Microsoft'}
            </button>
            <p className="mt-2 text-xs text-stone-500 text-center leading-snug">
              One tap — works for Hotmail, Outlook, Live, or MSN.
            </p>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-3 text-xs text-stone-400 uppercase tracking-wide">or</span>
            </div>
          </div>

          {/* ─── Option 3: Any other email (magic link) ─── */}
          {sent ? (
            <div className="mb-6 px-4 py-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-800">
              <p className="font-semibold mb-1">📬 Check your email</p>
              <p>
                We sent a sign-in link to <span className="font-medium">{email.trim()}</span>.
                Click the link to finish signing in. It may take a minute — and check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-3 text-xs font-semibold text-green-700 underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="mb-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 text-center">
                Use any other email
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ fontSize: '16px' }}
                className="w-full px-4 py-3 bg-white border-2 border-stone-200 rounded-xl mb-3 focus:outline-none focus:border-stone-600"
              />
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full px-4 py-3 bg-white border-2 border-stone-300 hover:border-stone-500 hover:bg-stone-100 disabled:opacity-60 text-stone-800 font-semibold rounded-xl transition-colors"
              >
                {sending ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              <p className="mt-2 text-xs text-stone-500 text-center leading-snug">
                No password — we email you a one-time link to click.
              </p>
            </form>
          )}

          <p className="text-center text-xs text-stone-400 mt-6">
            New here? Signing in with any option creates your account automatically.
          </p>
        </div>
      </main>
    </div>
  )
}
