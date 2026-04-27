'use client'

import { KITCHEN_SECTIONS } from '@/lib/kitchen_sections'

// Recent shipped features — keep this short (3–5) and rewrite as new ones land.
// The section is meant to feel like "here's what's gotten better lately,"
// not a changelog. Long-tail history belongs in AGENTS.md.
const RECENT = [
  {
    emoji: '💎',
    title: 'Chef Portfolio',
    body: 'Zip through your Chef Notes inbox, file the keepers to your Portfolio, and they auto-organize into 5 How-to groups — Prep, Cook, Season, Improve, and Shop.',
  },
  {
    emoji: '👨‍🍳',
    title: 'Chef Jennifer — Teach & Practice',
    body: 'One chat, two modes. 🎓 Teach answers your kitchen questions and assigns a recipe as homework; 🍳 Practice cooks it for you in the lab.',
  },
  {
    emoji: '📚',
    title: 'Guides — your library',
    body: 'Curated reference reading — knife skills, techniques, cooking times, pantry, safety, equipment. The stuff every cook should know, in one calm shelf.',
  },
  {
    emoji: '📘',
    title: 'My Playbook — your saved items',
    body: 'Two classrooms, two modes. Saved videos, recipes, and notes from Chef Jennifer and Chef TV all live under one roof, organized by who taught it and what to do with it.',
  },
]

const TECH = ['Next.js 16', 'React 19', 'Supabase', 'Claude', 'Vercel', 'Tailwind v4']

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header — matches landing/MyKitchen rhythm: brand left, sticky white. */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">About</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Brand identity card. */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 border-l-8 border-l-orange-600 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
            <span style={{ fontSize: '32px' }}>🍽️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">MyRecipe Companion</h2>
          <p className="text-sm text-orange-600 mt-1 font-semibold">Cooking, figured out.</p>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-md mx-auto">
            A cozy, modern cooking companion — save recipes, plan meals, learn skills, and cook alongside an AI chef who&apos;s always ready to help.
          </p>
        </div>

        {/* What it is — prose, not bullets. The product story in three short paragraphs. */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">What it is</p>
          </div>
          <div className="px-4 py-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              MyRecipe Companion is two halves of the same kitchen. <strong>Cooking Life</strong> is what you do — saving recipes, planning meals, shopping for them. <strong>Learning Journey</strong> is how you get better — two teachers, a library, and a notebook for the things you save.
            </p>
            <p>
              <strong>Chef Jennifer</strong> is your AI instructor. Ask her anything in 🎓 Teach mode and she&apos;ll explain the why; tap 🍳 Practice and she&apos;ll generate a recipe to cook. <strong>Chef TV</strong> is the video classroom — hand-picked lessons from real chefs, sortable by Teach (technique) or Practice (recipe). <strong>Guides</strong> is the library: curated reference reading that doesn&apos;t change. <strong>My Playbook</strong> is your notebook for everything you save from any of them.
            </p>
            <p className="text-gray-900 font-medium">
              No clutter. No overwhelm. A cozy, premium space for learning, creating, and cooking with confidence.
            </p>
          </div>
        </div>

        {/* What's inside — pulled from the same source of truth as MyKitchen + the
            landing page so the three pages can never drift. Tile descriptions
            mirror the hub exactly. */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">What&apos;s inside</p>
          </div>
          <div className="px-4 py-4 space-y-5">
            {KITCHEN_SECTIONS.map(section => (
              <div key={section.name}>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">{section.name}</p>
                <p className="text-xs text-gray-500 italic mb-2.5">{section.subtitle}</p>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {section.items.map(item => (
                    <div key={item.title} className="flex items-start gap-3 px-3 py-2.5 border-l-4 border-l-orange-500 bg-white">
                      <span style={{ fontSize: '22px' }} className="shrink-0 mt-0.5">{item.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600 truncate">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent — what's gotten better lately, in plain language. */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">Recent</p>
          </div>
          <div className="divide-y divide-gray-100">
            {RECENT.map(item => (
              <div key={item.title} className="px-4 py-3 flex items-start gap-3">
                <span style={{ fontSize: '22px' }} className="shrink-0">{item.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Built by — sister-app context. */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">Built by</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              MyRecipe Companion is part of the <span className="font-semibold text-gray-900">MyCompanionApps</span> family — a small set of AI-powered companion apps for the parts of life that deserve a little help.
            </p>
            <a
              href="https://mycompanionapps.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-orange-700 hover:text-orange-800 border-b border-orange-200 hover:border-orange-700 transition-colors"
            >
              Visit MyCompanionApps.com ↗
            </a>
          </div>
        </div>

        {/* Powered by — small tech footer. */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">Powered by</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {TECH.map(tech => (
              <span
                key={tech}
                className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold border border-orange-100"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 pb-4">
          © {new Date().getFullYear()} MyCompanionApps · Made with care for home cooks.
        </p>

      </main>
    </div>
  )
}
