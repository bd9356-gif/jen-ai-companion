'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PLANS = [
  {
    name: 'Premium',
    price: '$34.99/yr',
    monthly: '$2.92/mo',
    color: 'orange',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    appleId: 'com.mycompanionapps.recipe.premium.annual',
    features: [
      'Unlimited Recipe Vault',
      'Unlimited imports',
      'Chef Jen AI — 5/month',
      'AI Photo Generation — 5/month',
      'All Kitchen Helpers',
      'Meal Plan',
      'Chef Jen Classroom',
    ],
  },
  {
    name: 'Pro',
    price: '$59.99/yr',
    monthly: '$5.00/mo',
    color: 'purple',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    appleId: 'com.mycompanionapps.recipe.pro.annual',
    features: [
      'Everything in Premium',
      'Unlimited Chef Jen AI',
      'Unlimited AI Photos',
      'Early access to new features',
    ],
  },
]

export default function PaywallPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [error, setError] = useState('')
  const [iosPackages, setIosPackages] = useState([])
  const isNative = typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios'
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setSessionChecked(true)
    })

    if (isNative) {
      async function loadPackages() {
        try {
          const { Purchases } = await import('@revenuecat/purchases-capacitor')
          const { current } = await Purchases.getOfferings()
          if (current?.availablePackages) setIosPackages(current.availablePackages)
        } catch (err) {
          console.error('[Paywall]', err)
        }
      }
      loadPackages()
    }
  }, [])

  async function handleWebPurchase(plan) {
    if (!user) {
      window.location.href = '/login?next=/paywall'
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError('Could not start checkout')
    } catch (err) {
      setError('Something went wrong — please try again')
    }
    setLoading(false)
  }

  async function handleIosPurchase(pkg) {
    setLoading(true)
    setError('')
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.purchasePackage({ aPackage: pkg })
      router.back()
    } catch (err) {
      if (!err.message?.includes('cancelled')) setError('Purchase failed — please try again')
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
          <button onClick={() => window.history.length > 1 ? router.back() : window.location.href = '/kitchen'} className="text-sm text-gray-500">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">Upgrade</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <p className="text-5xl mb-3">👩‍🍳</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">MyRecipe Companion</h2>
          <p className="text-gray-500 text-sm">Your AI-powered kitchen</p>
        </div>

        {/* Free vs paid comparison */}
        <div className="bg-gray-50 rounded-2xl p-4 text-sm">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <p className="font-bold text-gray-700">Feature</p>
            <p className="text-center text-gray-500 font-semibold">Free</p>
            <p className="text-center text-orange-700 font-bold">Premium</p>
            <p className="text-center text-purple-700 font-bold">Pro</p>
          </div>
          {[
            ['Recipe Vault', '15 max', '∞', '∞'],
            ['Imports', '3/mo', '∞', '∞'],
            ['Chef Jen AI', '2/mo', '5/mo', '∞'],
            ['AI Photos', '—', '5/mo', '∞'],
            ['Kitchen Helpers', 'Polish', 'All', 'All'],
            ['Meal Plan', '—', '✓', '✓'],
          ].map(([feature, free, premium, pro]) => (
            <div key={feature} className="grid grid-cols-4 gap-2 py-1.5 border-t border-gray-200">
              <p className="text-gray-700 text-xs">{feature}</p>
              <p className="text-center text-gray-400 text-xs">{free}</p>
              <p className="text-center text-orange-700 text-xs font-semibold">{premium}</p>
              <p className="text-center text-purple-700 text-xs font-semibold">{pro}</p>
            </div>
          ))}
        </div>

        {/* Plan buttons */}
        <div className="space-y-3">
          {PLANS.map(plan => (
            <div key={plan.name} className={`border-2 rounded-2xl p-5 ${plan.color === 'purple' ? 'border-purple-200 bg-purple-50' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`font-bold text-lg ${plan.color === 'purple' ? 'text-purple-900' : 'text-orange-900'}`}>{plan.name}</p>
                  <p className={`text-sm ${plan.color === 'purple' ? 'text-purple-700' : 'text-orange-700'}`}>{plan.monthly} · billed as {plan.price}</p>
                </div>
              </div>
              <ul className="space-y-1 mb-4">
                {plan.features.map(f => (
                  <li key={f} className={`text-xs flex items-center gap-2 ${plan.color === 'purple' ? 'text-purple-800' : 'text-orange-800'}`}>
                    <span>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => isNative
                  ? handleIosPurchase(iosPackages.find(p => p.identifier.includes(plan.name.toLowerCase())))
                  : handleWebPurchase(plan)
                }
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 ${plan.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {loading ? 'Loading...' : `Get ${plan.name} — ${plan.price}`}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-center text-red-600 text-sm">{error}</p>}

        {isNative && (
          <div className="text-center">
            <button onClick={handleRestore} disabled={loading} className="text-sm text-gray-500 underline">
              Restore Purchases
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Cancel anytime. Billed annually through {isNative ? 'Apple' : 'Stripe'}.</p>
      </main>
    </div>
  )
}
