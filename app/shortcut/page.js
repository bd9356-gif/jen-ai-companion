// /shortcut — Rewritten May 2026 as an iPhone-app coming-soon pitch
// instead of a detailed Shortcut-build tutorial. The original was a
// 6-step instruction page; in practice, the typical user wouldn't
// follow it and the power user didn't need it. The right framing:
// someone who lands on this page is signaling "I want a better mobile
// experience" — answer that with what's actually coming (the native
// MyRecipe iPhone app via Capacitor), not a DIY workaround.
//
// A tiny power-user note still appears at the bottom for the rare
// developer-type who wants to build their own Shortcut today —
// terse, no hand-holding, since that audience can absolutely
// figure it out from a single paragraph.

'use client'

const APP_HIGHLIGHTS = [
  {
    emoji: '📲',
    title: 'One-tap recipe import',
    body: 'Tap Share on any recipe page in Safari, choose MyRecipe, done. The recipe lands in your Vault with photo, ingredients, and instructions parsed. Even on sites that block scrapers.',
  },
  {
    emoji: '🍎',
    title: 'Sign in with Apple',
    body: 'No magic-link emails to dig out of spam, no passwords to remember. FaceID confirms, you\'re in. The whole login flow is one tap.',
  },
  {
    emoji: '⚡',
    title: 'Native speed',
    body: 'The Vault, Recipe Cards, Chef Jennifer — everything you use on the web, now wrapped in a native iPhone app that opens instantly from your home screen.',
  },
  {
    emoji: '🔔',
    title: 'Live notifications',
    body: 'Optional reminders when it\'s time to start dinner prep, your meal plan refreshes, or Chef Jennifer has a new lesson waiting in My Playbook.',
  },
]

export default function ShortcutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">MyRecipe iPhone App</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Hero — anticipation, not instruction. */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6 text-center">
          <p className="text-5xl mb-3">📲</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            The MyRecipe iPhone app is&nbsp;coming.
          </h2>
          <p className="text-base text-gray-700 leading-relaxed mt-3 max-w-md mx-auto">
            Everything you love on the web, wrapped in a native iPhone app — one-tap recipe import from Safari, Sign in with Apple, and a Share Sheet shortcut that just&nbsp;works.
          </p>

          {/* Coming Soon store buttons, same pair as the landing
              page so the visual story is consistent. */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-6">
            <div className="flex items-center gap-3 bg-stone-900 text-white rounded-xl px-3 py-2.5">
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] uppercase tracking-wider text-stone-400 leading-none">Coming Soon</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-stone-900 text-white rounded-xl px-3 py-2.5">
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5 2.92v18.16c0 .69.5 1.06 1.04.78l13.92-9.08c.5-.32.5-1.25 0-1.57L6.04 2.14C5.5 1.86 5 2.23 5 2.92z" />
              </svg>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] uppercase tracking-wider text-stone-400 leading-none">Coming Soon</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">Google Play</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's coming — four highlights. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">What you&rsquo;ll get</p>
          </div>
          <div className="divide-y divide-gray-100">
            {APP_HIGHLIGHTS.map(h => (
              <div key={h.title} className="px-5 py-4 flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden="true">{h.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{h.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* "What changes for current web users" — reassurance. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider mb-2">What about the web?</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            The web version stays. The iPhone app is a smoother home for mobile cooking, but if you do your meal planning on a laptop or share recipe links with friends, the web is still where that lives. Your Vault, your Cards, your Playbook — same data, both places. Sign in with the same account, see the same recipes.
          </p>
        </div>

        {/* Power-user footer — terse, single paragraph, no
            hand-holding. The audience for this is small and they
            can figure it out from this hint alone. */}
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">For the curious</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Until the app lands, the web version handles every site via the <span className="font-semibold">📋 Paste</span> tab on the Import page. If you&rsquo;re comfortable with Apple Shortcuts, you can also build a 4-action share from Safari: <em>Receive URLs → Get Contents of Web Page → Combine URL + blank line + Contents → Copy to Clipboard → Open URL</em> <code className="text-[11px] bg-white border border-gray-300 rounded px-1 py-0.5 font-mono">recipe.mycompanionapps.com/secret?smart_import=1</code>. Most users won&rsquo;t bother — the iPhone app makes this built-in.
          </p>
        </div>

      </main>
    </div>
  )
}
