'use client'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AuthConfirmPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    useEffect(() => {
           {
                  const params = new URLSearchParams(window.location.search)
                  const code = params.get('code')
                  if (code) await supabase.auth.exchangeCodeForSession(code)
                  window.location.href = '/kitchen'
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
