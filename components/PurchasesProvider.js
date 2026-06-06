'use client'
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function PurchasesProvider({ children }) {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return
    async function init() {
      try {
        const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor')
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
        await Purchases.configure({ apiKey: 'appl_test_vIDmRqzGjHxiqoGajfNicIpHkbt' })
        console.log('[RevenueCat] initialized')
      } catch (err) {
        console.error('[RevenueCat] init failed:', err)
      }
    }
    init()
  }, [])
  return children
}
