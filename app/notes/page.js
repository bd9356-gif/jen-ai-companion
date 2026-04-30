'use client'

import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────
   TESTER NOTES — edit below, push, Vercel redeploys in ~1 min.
   ─────────────────────────────────────────────────────────── */

const NOTES_UPDATED = 'April 29, 2026'

const INTRO = `Welcome — and thanks for trying MyRecipe Companion. This is a cozy AI
cooking app for home cooks: save recipes, plan meals, shop for them, and
learn from an AI chef who's always in the kitchen with you.

First visit? Jump to "Start here" below — it'll get you oriented in five
minutes. Been here before? "What's new" is current.

Anything confusing, broken, or delightful — text me or email
bd9356@gmail.com. Brutal honesty welcome.`

const START_HERE = [
  'Sign in with Gmail, Microsoft (Outlook/Hotmail/Live), or your email. No password — magic-link.',
  'On iPhone, open the site in Safari, then Share → Add to Home Screen. It opens full-screen like a real app.',
  'MyKitchen is the hub. Two halves: Cook (recipes / meal plans / shopping) and Learn Your Way (the AI cooking school).',
  'Open Recipe Vault first. You\'ll see 5 starter recipes and 2 starter Chef Notes — they\'re examples to play with, not your saves. Edit, swap, or delete any of them.',
  'Try one Chef Jennifer question in 🎓 Teach mode (e.g. "How do I know when oil is hot enough?"). She\'ll teach, then assign homework you can cook in 🍳 Practice with one tap.',
]

const WHATS_NEW = [
  'New MyKitchen layout — two sections, eight tiles: Cook (Recipe Vault / Recipe Cards / Meal Plan / Shopping List) and Learn Your Way (Chef Jennifer / Chef TV / Your Library / My Playbook).',
  'Chef Jennifer has two modes: 🎓 Teach (ask questions, get taught + homework) and 🍳 Practice (describe a meal, get a cook-it recipe).',
  'Chef Portfolio — keepers from Chef Notes file into the Vault. Auto-sorted into 5 "How to..." groups (Prep / Cook / Season / Improve / Shop).',
  'Your Library (Guides) — curated reference articles by topic: knife skills, techniques, cooking times, pantry, safety, equipment.',
  'Recipe Vault opens in Grid view by default — index-card style. Tag chips, search, and import all live in the sticky header.',
  'Sign in with Microsoft (Outlook/Hotmail/Live) — bypasses the Hotmail spam-folder dance.',
]

const TRY_THIS = [
  'Save a recipe from a website: Recipe Vault → 📥 Import → paste the URL → "Import & Clean with AI". Paste the page text on the Paste tab if a site blocks the fetcher.',
  'Ask Chef Jennifer "How do I keep pasta from sticking?" in 🎓 Teach. When she suggests homework at the end, tap 🍳 Cook in Practice → save the recipe she generates.',
  'Pin a Chef Jennifer answer you want to keep: Playbook → 📝 Chef Notes → expand → 💎 File to Portfolio. It lands in Recipe Vault → 💎 Portfolio.',
  'Browse Chef TV — start on the 🎓 Teach tab and try the ⭐ Featured chip for a curated starter set. Switch to 🍳 Practice for recipe videos.',
  'Move 2–3 Vault recipes into Meal Plan\'s ⭐ To Make bucket (drag the ⋮⋮ handle to reorder). Then open Shopping List and try ✨ Clean Up List.',
  'Open a recipe in Recipe Vault, tap ✨ AI Kitchen Helpers → 🌿 Make more… → pick a few preferences → Transform. Save as a new recipe or replace.',
]

const KNOWN_QUIRKS = [
  'Magic-link email may land in Junk on first send to Hotmail/Outlook — mark "Not Junk" once or use Sign in with Microsoft instead.',
  'Outlook\'s mobile app opens links in its own webview, which doesn\'t share storage with Safari. The session sticks inside Outlook. Use Sign in with Microsoft to avoid this.',
  'Some Learn Your Way tile descriptions truncate on a small phone. The full version is on the page itself.',
  'No offline mode yet — losing signal mid-page pauses the app.',
  'Push notifications and service worker are still to come.',
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

        <Section title="Start here" items={START_HERE} />
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
