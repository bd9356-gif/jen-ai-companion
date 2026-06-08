'use client'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => window.location.href = '/kitchen'} className="text-sm text-gray-500">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">Pricing</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="text-center">
          <p className="text-5xl mb-3">👩‍🍳</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Simple, honest pricing</h2>
          <p className="text-gray-500 text-sm">Start free. Upgrade when you're ready.</p>
        </div>

        {/* Comparison table */}
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
            ['Chef Jen AI', '5/mo', '5/mo', '∞'],
            ['AI Photos', '—', '5/mo', '∞'],
            ['Kitchen Helpers', 'Polish only', 'All', 'All'],
            ['Meal Plan', '—', '✓', '✓'],
            ['Chef TV', '✓', '✓', '✓'],
            ['Early Access', '—', '—', '✓'],
          ].map(([feature, free, premium, pro]) => (
            <div key={feature} className="grid grid-cols-4 gap-2 py-1.5 border-t border-gray-200">
              <p className="text-gray-700 text-xs">{feature}</p>
              <p className="text-center text-gray-400 text-xs">{free}</p>
              <p className="text-center text-orange-700 text-xs font-semibold">{premium}</p>
              <p className="text-center text-purple-700 text-xs font-semibold">{pro}</p>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        <div className="space-y-3">

          {/* Free */}
          <div className="border-2 border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-lg text-gray-900">Free</p>
              <p className="font-bold text-lg text-gray-900">$0</p>
            </div>
            <p className="text-sm text-gray-500 mb-3">Everything you need to get started</p>
            <button
              onClick={() => window.location.href = '/kitchen'}
              className="w-full py-3 rounded-xl font-bold text-gray-700 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
              Get Started Free
            </button>
          </div>

          {/* Premium */}
          <div className="border-2 border-orange-200 bg-orange-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-lg text-orange-900">Premium</p>
              <div className="text-right">
                <p className="font-bold text-lg text-orange-900">$34.99/yr</p>
                <p className="text-xs text-orange-700">$2.92/mo</p>
              </div>
            </div>
            <p className="text-sm text-orange-700 mb-3">Unlimited recipes, imports, and more</p>
            <ul className="space-y-1 mb-4">
              {['Unlimited Recipe Vault', 'Unlimited imports', 'Chef Jen AI — 5/month', 'AI Photo Generation — 5/month', 'All Kitchen Helpers', 'Meal Plan', 'Chef Jen Classroom'].map(f => (
                <li key={f} className="text-xs flex items-center gap-2 text-orange-800"><span>✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => window.location.href = '/paywall'}
              className="w-full py-3 rounded-xl font-bold text-white text-sm bg-orange-600 hover:bg-orange-700 transition-colors">
              Get Premium — $34.99/yr
            </button>
          </div>

          {/* Pro */}
          <div className="border-2 border-purple-200 bg-purple-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-lg text-purple-900">Pro</p>
              <div className="text-right">
                <p className="font-bold text-lg text-purple-900">$59.99/yr</p>
                <p className="text-xs text-purple-700">$5.00/mo</p>
              </div>
            </div>
            <p className="text-sm text-purple-700 mb-3">Everything unlimited, nothing held back</p>
            <ul className="space-y-1 mb-4">
              {['Everything in Premium', 'Unlimited Chef Jen AI', 'Unlimited AI Photos', 'Early access to new features'].map(f => (
                <li key={f} className="text-xs flex items-center gap-2 text-purple-800"><span>✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => window.location.href = '/paywall'}
              className="w-full py-3 rounded-xl font-bold text-white text-sm bg-purple-600 hover:bg-purple-700 transition-colors">
              Get Pro — $59.99/yr
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400">Cancel anytime. Billed annually. Available on web and iOS.</p>

      </main>
    </div>
  )
}
