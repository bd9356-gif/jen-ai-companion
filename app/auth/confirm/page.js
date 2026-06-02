'use client'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Whitelist a `next` param to a same-origin relative path. Rejects
// absolute URLs, protocol-relative (`//evil.com`), and anything that
// doesn't start with `/`. Belt-and-suspenders against open-redirect.
function safeNext(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

export default function AuthConfirmPage() {
  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    async function handleAuth() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) await supabase.auth.exchangeCodeForSession(code)
      // After sign-in, return to the URL the user was originally trying
      // to reach (threaded through ?next=...). Falls back to /kitchen.
      const next = safeNext(params.get('next'))
      window.location.href = next || '/kitchen'
    }
    handleAuth()
  }, [])
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
