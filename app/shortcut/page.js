// /shortcut — Optional setup guide for iPhone users who want one-tap
// "Share to MyRecipe" from Safari. Lives off the main flow because:
//   1. It's iOS-only (everyone else uses the Paste tab on /secret).
//   2. It depends on the user building a Shortcut on their phone, which
//      is more work than the primary import path (open MyRecipe → paste
//      URL → tap Import).
//   3. It's temporary — the native iOS app via Capacitor will register
//      a real Share Extension and make this whole page obsolete.
//
// Framed honestly: a 5-minute power-user setup, not the main path.
// Surface the trade-offs upfront so the user can decide if it's worth
// the effort for them.

'use client'

const SHORTCUT_STEPS = [
  {
    n: 1,
    title: 'Receive what you share',
    body: 'In iOS Shortcuts, tap + (new shortcut). Tap the ⓘ info icon → Show in Share Sheet ON. Set "Accept" to URLs only.',
  },
  {
    n: 2,
    title: 'Get the page content',
    body: 'Add action: Get Contents of Web Page. Input = Shortcut Input. This grabs the recipe page\'s HTML so we can read it even when the URL fetch fails.',
  },
  {
    n: 3,
    title: 'Combine URL + HTML',
    body: 'Add action: Text. Type the URL on the first line, leave a blank line, then drag in the "Contents of Web Page" variable. Looks like:  [Shortcut Input] (blank line) [Contents of Web Page].',
  },
  {
    n: 4,
    title: 'Copy to clipboard',
    body: 'Add action: Copy to Clipboard. Input = the Text from step 3.',
  },
  {
    n: 5,
    title: 'Open MyRecipe',
    body: 'Add action: Open URL. Set URL to: https://recipe.mycompanionapps.com/secret?smart_import=1',
  },
  {
    n: 6,
    title: 'Name and save',
    body: 'Tap the shortcut name at the top, change it to "Send to MyRecipe" (or whatever you like). Tap Done.',
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
          <h1 className="text-lg font-bold text-gray-900">iPhone Share Setup</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Honest framing card — sets expectations before the user
            commits to the 5-minute build. */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-amber-900 mb-2">📲 Optional: one-tap share from Safari</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            This is for iPhone users who want to tap <span className="font-semibold">Share → MyRecipe</span> on any recipe page and have it pulled in automatically. Most users don&rsquo;t need it &mdash; the <span className="font-semibold">📋 Paste</span> tab on the Import page works on every device and every recipe site.
          </p>
          <p className="text-sm text-amber-900 leading-relaxed mt-2">
            If you cook from your phone often and want a smoother flow, it&rsquo;s a 5-minute setup using Apple&rsquo;s built-in Shortcuts app.
          </p>
          <p className="text-xs text-amber-800 leading-relaxed mt-3 italic">
            When the MyRecipe iPhone app launches in the App Store, this is built in &mdash; no setup needed. Until then, this is the bridge.
          </p>
        </div>

        {/* What it does — quick reassurance before the steps. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-2">What it does</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            When you tap <span className="font-semibold">Share</span> on a recipe page in Safari, your Shortcut grabs both the URL <em>and</em> the page&rsquo;s HTML, then opens MyRecipe with the recipe ready to import. Even on sites that block our server-side fetcher (a handful of big recipe sites do), the HTML gets in &mdash; so the import works either way.
          </p>
        </div>

        {/* Step-by-step build. Six numbered cards with the exact
            action sequence in Apple's Shortcuts app. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-bold text-gray-900">Build the Shortcut (5 minutes)</p>
          <ol className="space-y-3">
            {SHORTCUT_STEPS.map(step => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center">{step.n}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600 leading-snug mt-0.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* How to use it after building. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-2">After you save it</p>
          <ol className="space-y-2 text-sm text-gray-700 leading-relaxed list-decimal list-inside">
            <li>Open Safari, navigate to any recipe page.</li>
            <li>Tap the <span className="font-semibold">Share</span> button (square with up-arrow).</li>
            <li>Scroll down the share sheet to find <span className="font-semibold">Send to MyRecipe</span>. Tap it.</li>
            <li>MyRecipe opens with the recipe parsed and ready to save.</li>
          </ol>
          <p className="text-xs text-gray-500 italic mt-3">
            First time you use it, iOS may show a permission prompt for clipboard access. Allow it &mdash; that&rsquo;s how the recipe data moves from Safari to MyRecipe.
          </p>
        </div>

        {/* Troubleshooting card — common gotchas. */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-2">If something goes wrong</p>
          <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <li>
              <span className="font-semibold">Shortcut doesn&rsquo;t appear in the share sheet:</span>{' '}
              In Shortcuts app, tap the ⓘ icon on your shortcut and make sure <em>Show in Share Sheet</em> is ON and <em>Accept: URLs</em>.
            </li>
            <li>
              <span className="font-semibold">Nothing happens when you tap it:</span>{' '}
              The clipboard permission prompt may be hiding behind the share sheet. Try again from a fresh tab.
            </li>
            <li>
              <span className="font-semibold">Imports come in empty:</span>{' '}
              Step 3 (Combine URL + HTML) is the easiest to get wrong. Make sure the URL is on the first line, with a blank line before the page contents.
            </li>
            <li>
              <span className="font-semibold">Doesn&rsquo;t fit your workflow:</span>{' '}
              No problem &mdash; the <span className="font-semibold">📋 Paste</span> tab in MyRecipe&rsquo;s Import Tools handles every site without any setup at all.
            </li>
          </ul>
        </div>

        <p className="text-center text-xs text-gray-500 italic">
          Questions or stuck? Tap <a href="/notes" className="text-orange-600 underline">Tester notes</a> for help.
        </p>

      </main>
    </div>
  )
}
