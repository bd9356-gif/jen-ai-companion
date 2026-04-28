'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// /import?url=<encoded> — short entry point used by the iOS Share-Sheet
// Shortcut and any external "send a URL to MyRecipe" flow.
//
// Why a dedicated page instead of just hitting `/secret?import=…`:
//   1. Cleaner URL to type into a Shortcut ("mycompanionapps.com/import"
//      vs the longer Vault path).
//   2. Gives us one place to handle auth: if the user isn't signed in
//      yet, we send them to /login with `?next=/import?url=…` so the
//      URL survives the round-trip and the import resumes after auth.
//   3. Centralizes any future ingestion entry points (e.g. an HTML-blob
//      capture path that POSTs the page body, bypassing the scraper).
//      Today we only handle the URL case; HTML capture is a follow-up.
//
// Behavior:
//   - Reads ?url=<encoded> (also accepts ?u=<encoded> as a short alias).
//   - If signed in, redirects to `/secret?import=<encoded>` which the
//     Vault page already wires up to the existing import pipeline.
//   - If not signed in, redirects to `/login?next=/import?url=<encoded>`.
//     /login doesn't honor `next` yet, but landing on the login page
//     with the URL preserved in history is better than dropping it.
//   - If no URL is present, shows a tiny help card explaining what this
//     page is for and a link back to the Vault. Never a dead-end.
export default function ImportEntryPage() {
  const [status, setStatus] = useState('loading') // 'loading' | 'no-url' | 'redirecting'
  const [target, setTarget] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('url') || params.get('u') || '').trim()
    if (!raw) {
      setStatus('no-url')
      return
    }
    // Defensive: only allow http(s) URLs through. Anything else is a
    // potential injection vector (javascript:, data:, etc.) and not
    // something the import pipeline knows what to do with.
    if (!/^https?:\/\//i.test(raw)) {
      setStatus('no-url')
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      const encoded = encodeURIComponent(raw)
      if (!session) {
        const next = encodeURIComponent(`/import?url=${encoded}`)
        const dest = `/login?next=${next}`
        setTarget(raw)
        setStatus('redirecting')
        window.location.replace(dest)
        return
      }
      const dest = `/secret?import=${encoded}`
      setTarget(raw)
      setStatus('redirecting')
      window.location.replace(dest)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-3">📥</div>
            <p className="text-gray-700 font-semibold">Preparing import…</p>
          </>
        )}
        {status === 'redirecting' && (
          <>
            <div className="text-4xl mb-3">📥</div>
            <p className="text-gray-700 font-semibold">Importing recipe…</p>
            <p className="text-xs text-gray-500 mt-2 break-all">{target}</p>
          </>
        )}
        {status === 'no-url' && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 border-l-8 border-l-orange-600 p-6 text-left">
            <p className="text-sm font-extrabold text-orange-600 uppercase tracking-wider mb-2">Recipe import</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Send a recipe to MyRecipe</h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              This page is the entry point for the iOS Share-Sheet shortcut. To use it directly, append a recipe URL like:
            </p>
            <code className="block text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg break-all">
              /import?url=https://example.com/recipe
            </code>
            <a
              href="/secret"
              className="inline-block mt-4 text-sm font-semibold text-orange-700 border-b border-orange-200 hover:border-orange-700"
            >
              ← Back to Recipe Vault
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
