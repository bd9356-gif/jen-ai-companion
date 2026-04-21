'use client'

import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────
   TESTER NOTES — edit below, push, Vercel redeploys in ~1 min.
   ─────────────────────────────────────────────────────────── */

const NOTES_UPDATED = 'April 18, 2026'

const INTRO = `Thanks for helping test MyRecipe Companion. Here's what's
new, what to try, and what to ignore for now. Use the thumbs-up /
thumbs-down feedback in your head — or better, text Bill directly.`

const WHATS_NEW = [
  'Sign in with your email — no Google account needed. Type your email on the sign-in screen and click the link we send you.',
  'Brand-new vaults start with 5 starter recipes so the app never feels empty. Swap, edit, or delete them any time.',
  'Installable on iPhone — open the site in Safari, tap Share, then "Add to Home Screen".',
]

const TRY_THIS = [
  "Add a recipe of your own in Recipe Vault — paste from a website, type it in, or snap a photo.",
  'Ask Chef Jennifer to build a dinner for tonight based on your mood and what protein you have.',
  "Move 2–3 recipes into MyCooking's 'To Make' bucket and try the shopping list.",
  'Try the ✨ Clean Up List button on the shopping list after adding a few recipes.',
  'Open a recipe in Recipe Vault, tap ✨ AI, and try "Make This Recipe More…" — adjust it to be lighter, vegetarian, or heart-healthy.',
]

const KNOWN_QUIRKS = [
  'First magic-link email to a Hotmail/Outlook address may land in Junk — mark "Not Junk" once and future ones come through.',
  'No offline mode yet. If you lose signal mid-page the app pauses.',
  'Service worker / push notifications are still to come.',
]

const FEEDBACK = {
  text: 'Found something broken, confusing, or delightful? Text Bill or email',
  email: 'bd9356@gmail.com',
}

/* ───────────────────────────────────────────────────────────── */

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="text-stone-800 text-base font-semibold tracking-tight">
              MyRecipe Companion
            </span>
          </Link>
          <Link
            href="/"
            className="text-stone-700 text-sm font-medium border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-100 transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pt-5 pb-8">

        <div className="mb-5">
          <p className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-semibold">
            Tester Notes
          </p>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">What to try this week</h1>
          <p className="text-xs text-stone-500 mt-1">Updated {NOTES_UPDATED}</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {INTRO}
          </p>
        </div>

        <Section title="What's new" items={WHATS_NEW} />
        <Section title="Try this" items={TRY_THIS} />
        <Section title="Known quirks" items={KNOWN_QUIRKS} />

        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-semibold mb-2">
            Feedback
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            {FEEDBACK.text}{' '}
            <a
              href={`mailto:${FEEDBACK.email}`}
              className="text-stone-900 font-medium underline"
            >
              {FEEDBACK.email}
            </a>
            .
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            ← Back to home
          </Link>
        </div>

      </main>
    </div>
  )
}

function Section({ title, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
      <p className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-semibold mb-3">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-stone-700 leading-relaxed">
            <span className="text-stone-400 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
