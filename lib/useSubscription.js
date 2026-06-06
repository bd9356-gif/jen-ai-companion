'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export const TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PRO: 'pro',
}

export const LIMITS = {
  free:    { chefJen: 10, imports: 3, photos: 2 },
  premium: { chefJen: 50, imports: Infinity, photos: Infinity },
  pro:     { chefJen: Infinity, imports: Infinity, photos: Infinity },
}

export function useSubscription() {
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      if (Capacitor.getPlatform() !== 'ios') {
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
