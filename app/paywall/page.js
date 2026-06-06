'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'

export default function PaywallPage() {
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function loadPackages() {
      if (Capacitor.getPlatform() !== 'ios') return
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const { current } = await Purchases.getOfferings()
        if (current?.availablePackages) {
          setPackages(current.availablePackages)
        }
      } catch (err) {
        console.error('[Paywall]', err)
      }
    }
    loadPackages()
  }, [])

  async function handlePurchase(pkg) {
    setLoading(true)
    setError('')
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.purchasePackage({ aPackage: pkg })
      router.back()
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        setError('Purchase failed — please try again')
      }
    }
    setLoading(false)
  }

  async function handleRestore() {
    setLoading(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.restorePurchases()
      router.back()
    } catch (err) {
      setError('Could not restore purchases')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => router.back()} className="text-sm text-gray-500">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">Upgrade</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <p className="text-5xl mb-3">👩‍🍳</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MyRecipe Companion</h2>
          <p className="text-gray-500 text-sm">Your AI-powered kitchen</p>
        </div>

        {/* Feature comparison */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-3">
          {[
            { feature: 'Recipe Vault', free: true, premium: true, pro: true },
            { feature: 'Shopping List & Chef TV', free: true, premium: true, pro: true },
            { feature: 'URL & Paste Import', free: '3/week', premium: 'Unlimited', pro: 'Unlimited' },
            { feature: 'Meal Plan', free: false, premium: true, pro: true },
            { feature: 'Chef Jen AI', free: '10/mo', premium: '50/mo', pro: 'Unlimited' },
            { feature: 'AI Photo Generation', free: '2/mo', premium: 'Unlimited', pro: 'Unlimited' },
            { feature: 'Kitchen Helpers', free: 'Polish only', premium: 'All', pro: 'All' },
            { feature: 'Chef Jen Classroom', free: false, premium: true, pro: true },
          ].map(({ feature, free, premium, pro }) => (
            <div key={feature} className="grid grid-cols-4 gap-2 items-center">
              <p className="text-xs font-semibold text-gray-700 col-span-1">{feature}</p>
              <p className="text-xs text-center text-gray-500">{free === true ? '✓' : free === false ? '—' : free}</p>
              <p className="text-xs text-center text-orange-700 font-semibold">{premium === true ? '✓' : premium === false ? '—' : premium}</p>
              <p className="text-xs text-center text-purple-700 font-semibold">{pro === true ? '✓' : pro === false ? '—' : pro}</p>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-orange-200">
            <p className="text-xs text-gray-400">Plan</p>
            <p className="text-xs text-center text-gray-400">Free</p>
            <p className="text-xs text-center text-orange-700 font-bold">Premium</p>
            <p className="text-xs text-center text-purple-700 font-bold">Pro</p>
          </div>
        </div>

        {/* Purchase buttons */}
        <div className="space-y-3">
          {packages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm">Loading plans...</p>
          ) : (
            packages.map(pkg => {
              const isPro = pkg.identifier.includes('pro')
              return (
                <button
                  key={pkg.identifier}
                  onClick={() => handlePurchase(pkg)}
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 ${
                    isPro ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isPro ? '🚀 Go Pro' : '⭐ Go Premium'} — {pkg.product.priceString}/year
                </button>
              )
            })
          )}
        </div>

        {error && <p className="text-center text-red-600 text-sm">{error}</p>}

        <div className="text-center space-y-2">
          <button onClick={handleRestore} disabled={loading} className="text-sm text-gray-500 underline">
            Restore Purchases
          </button>
          <p className="text-xs text-gray-400">Cancel anytime. Billed annually.</p>
        </div>
      </main>
    </div>
  )
}
