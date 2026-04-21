'use client'

const FEATURES = [
  { emoji: '📒', label: 'Recipe Vault', desc: 'Your private library of saved recipes, organized and searchable.' },
  { emoji: '🗂', label: 'Recipe Cards', desc: 'Flip through your recipes like a deck of cozy index cards.' },
  { emoji: '🎯', label: 'MyCooking', desc: "This week's cooking plan, with a shopping list to match." },
  { emoji: '👨‍🍳', label: 'Chef Jennifer', desc: 'An AI chef who builds recipes and answers any kitchen question.' },
  { emoji: '📺', label: 'Chef TV', desc: 'Cooking videos for learning skills and finding new ideas.' },
]

const TECH = ['Next.js', 'React', 'Supabase', 'Claude AI', 'Vercel', 'Tailwind CSS']

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-amber-50">

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-stone-800">About</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* App Identity */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center border border-stone-200">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <span style={{ fontSize: '32px' }}>🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-stone-800">MyRecipe Companion</h2>
          <p className="text-sm text-stone-500 mt-1">Version 1.0</p>
          <p className="text-sm text-stone-600 mt-3 leading-relaxed max-w-xs">
            A cozy, modern cooking companion — save recipes, plan meals, learn new skills, and cook alongside an AI chef who&apos;s always ready to help.
          </p>
        </div>

        {/* Our Approach */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-[0.15em]">Our Approach</p>
          </div>
          <div className="px-4 py-4 space-y-3 text-sm text-stone-700 leading-relaxed">
            <p>
              We built a modern cooking companion designed for people who want more than recipes. Real chefs teach you technique on Chef TV, while Chef Jennifer elevates everything you cook — generating new dishes, refining existing ones, adjusting servings, adding cooking detail, nutrition, and dietary modes like vegetarian-friendly or heart-healthy.
            </p>
            <p>
              Your Recipe Vault becomes a curated library of the recipes you choose — whether they&apos;re saved, imported from the web, chef-created, or AI-enhanced. Every part of the experience is focused, personal, and intentionally crafted to help you grow in the kitchen.
            </p>
            <p className="text-stone-800 font-medium">
              No clutter. No overwhelm. Just a cozy, premium space for learning, creating, and cooking with confidence.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-[0.15em]">What&apos;s Inside</p>
          </div>
          {FEATURES.map((item, i, arr) => (
            <div
              key={item.label}
              className={`flex items-start gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-stone-100' : ''}`}
            >
              <span style={{ fontSize: '20px' }} className="shrink-0 mt-0.5">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-800">{item.label}</p>
                <p className="text-xs text-stone-600 leading-snug mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Built by */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-[0.15em]">Built By</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-stone-700 leading-relaxed">
              MyRecipe Companion is part of the <span className="font-semibold text-stone-800">MyCompanionApps</span> suite — a family of AI-powered companion apps built to make everyday life a little easier.
            </p>
            <a
              href="https://mycompanionapps.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-stone-800 hover:text-stone-900 border-b border-stone-300 hover:border-stone-800 transition-colors"
            >
              Visit MyCompanionApps.com ↗
            </a>
          </div>
        </div>

        {/* Tech */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-[0.15em]">Powered By</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {TECH.map(tech => (
              <span
                key={tech}
                className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-stone-500 pb-4">
          © {new Date().getFullYear()} MyCompanionApps · All rights reserved
        </p>

      </main>
    </div>
  )
}
