'use client'

// Web/Stripe checkout has been retired — subscriptions are now handled
// exclusively through the iOS app via RevenueCat/App Store. This page
// stays in place (rather than being deleted) because several other
// pages link here as their "Upgrade" destination — removing it outright
// would 404 those links. Instead, it just points people to the app.

export default function PaywallPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <p className="text-5xl">👩‍🍳</p>
        <h1 className="text-xl font-bold text-gray-900">Upgrade in the App</h1>
        <p className="text-sm text-gray-500">
          Premium and Pro subscriptions are managed through the MyRecipe
          Companion iOS app. Open the app to upgrade, or download it below.
        </p>
        <a
          href="https://apps.apple.com/us/app/myrecipe-ai-cooking-companion/id6772163990"
          className="inline-block text-sm font-semibold bg-orange-600 text-white px-6 py-3 rounded-xl"
        >
          Get the App
        </a>
        <div>
          <a href="/kitchen" className="text-xs text-gray-400 underline">
            ← Back
          </a>
        </div>
      </div>
    </div>
  )
}
