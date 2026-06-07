'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PRO: 'pro',
}

export const LIMITS = {
  free:    { chefJen: 2, imports: 3, photos: 0, recipes: 15 },
  premium: { chefJen: 30, imports: Infinity, photos: 10, recipes: Infinity },
  pro:     { chefJen: Infinity, imports: Infinity, photos: Infinity, recipes: Infinity },
}

export function useSubscription() {
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      if (Capacitor.getPlatform() !== 'ios') {
        // Web — check Supabase for subscription tier
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data } = await supabase
              .from('user_subscriptions')
              .select('tier, expires_at')
              .eq('user_id', session.user.id)
              .maybeSingle()
            if (data?.tier && data?.expires_at && new Date(data.expires_at) > new Date()) {
              setTier(data.tier)
            } else {
              setTier('free')
            }
          }
        } catch (err) {
          console.error('[useSubscription web]', err)
        }
        setLoading(false)
        return
      }
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const { customerInfo } = await Purchases.getCustomerInfo()
        const entitlements = customerInfo.entitlements.active
        if (entitlements['pro']) setTier('pro')
        else if (entitlements['premium']) setTier('premium')
        else setTier('free')
      } catch (err) {
        console.error('[useSubscription]', err)
        setTier('free')
      }
      setLoading(false)
    }
    check()
  }, [])

  return { tier, loading, limits: LIMITS[tier] }
}
