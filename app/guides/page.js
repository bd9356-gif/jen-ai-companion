'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// The 6 curated topic keys + their human labels and emoji.
// Order here is the order that sections render on the page.
const TOPIC_LABELS = {
  knife_skills:  'Knife Skills',
  techniques:    'Techniques',
  cooking_times: 'Cooking Times & Heat',
  pantry:        'Pantry & Substitutions',
  safety:        'Safety & Storage',
  equipment:     'Equipment',
}

const TOPIC_ICONS = {
  knife_skills:  '🔪',
  techniques:    '🥘',
  cooking_times: '⏱️',
  pantry:        '🥫',
  safety:        '🛡️',
  equipment:     '🧰',
}

// Per-topic color scheme — left-edge stripe + soft body tint when open.
// All classes are written out as complete literal strings so Tailwind v4's
// JIT scanner picks them up. Don't try to interpolate color names.
const TOPIC_COLORS = {
  knife_skills: {
    outer:    'border-gray-200 border-l-8 border-l-red-600',
    headerBg: 'bg-red-50',
    title:    'text-red-900',
    count:    'text-red-700',
    bodyBg:   'bg-red-50/40',
  },
  techniques: {
    outer:    'border-gray-200 border-l-8 border-l-orange-600',
    headerBg: 'bg-orange-50',
    title:    'text-orange-900',
    count:    'text-orange-700',
    bodyBg:   'bg-orange-50/40',
  },
  cooking_times: {
    outer:    'border-gray-200 border-l-8 border-l-amber-600',
    headerBg: 'bg-amber-50',
    title:    'text-amber-900',
    count:    'text-amber-700',
    bodyBg:   'bg-amber-50/40',
  },
  pantry: {
    outer:    'border-gray-200 border-l-8 border-l-emerald-600',
    headerBg: 'bg-emerald-50',
    title:    'text-emerald-900',
    count:    'text-emerald-700',
    bodyBg:   'bg-emerald-50/40',
  },
  safety: {
    outer:    'border-gray-200 border-l-8 border-l-sky-600',
    headerBg: 'bg-sky-50',
    title:    'text-sky-900',
    count:    'text-sky-700',
    bodyBg:   'bg-sky-50/40',
  },
  equipment: {
    outer:    'border-gray-200 border-l-8 border-l-stone-600',
    headerBg: 'bg-stone-100',
    title:    'text-stone-900',
    count:    'text-stone-700',
    bodyBg:   'bg-stone-50',
  },
}

const FALLBACK_COLOR = TOPIC_COLORS.equipment
const topicColor = (t) => TOPIC_COLORS[t] || FALLBACK_COLOR

// Light markdown → HTML pass. Mirrors Golf's renderMarkdown — handles
// ## headers, **bold**, paragraph breaks, and single newlines. Inline
// formatting only; no lists/quotes/links yet (we don't author those).
function renderMarkdown(text) {
  return (text || '')
    .replace(/## (.+)/g, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>')
}

export default function GuidesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [openArticleId, setOpenArticleId] = useState(null)
  const [collapsedTopics, setCollapsedTopics] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { window.location.href = '/login'; return }
      const { data, error } = await supabase
        .from('recipe_articles')
        .select('*')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (!error && data) {
        setArticles(data)
        // All sections collapsed on first open — Library look, scan-first.
        setCollapsedTopics(new Set(data.map(a => a.topic)))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function toggleTopic(topic) {
    setCollapsedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })
  }

  // Group articles by topic, preserving the order in TOPIC_LABELS so the
  // page reads consistently regardless of when articles were added.
  const grouped = (() => {
    const order = Object.keys(TOPIC_LABELS)
    const map = new Map()
    for (const a of articles) {
      if (!map.has(a.topic)) map.set(a.topic, [])
      map.get(a.topic).push(a)
    }
    const knownGroups = order.filter(t => map.has(t)).map(t => [t, map.get(t)])
    const unknownGroups = [...map.entries()].filter(([t]) => !order.includes(t))
    return [...knownGroups, ...unknownGroups]
  })()

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📚 Guides</h1>
            {articles.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{articles.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Tagline — frames Guides as the school library that pairs
            with the two classrooms (Chef TV + Chef Jennifer). */}
        <div className="text-center px-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
            The Library
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Reference reading for everything in the kitchen.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-gray-700 font-semibold text-lg">The library is being stocked.</p>
            <p className="text-gray-500 text-sm mt-2">New articles arrive soon — check back in a day or two.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([topic, items]) => {
              const isCollapsed = collapsedTopics.has(topic)
              const c = topicColor(topic)
              return (
                <section key={topic} className={`border-2 rounded-2xl ${c.outer}`}>
                  <button
                    onClick={() => toggleTopic(topic)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-t-2xl ${isCollapsed ? 'bg-white rounded-b-2xl' : c.headerBg}`}
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TOPIC_ICONS[topic] ?? '📖'}</span>
                      <span className={`font-semibold ${c.title}`}>{TOPIC_LABELS[topic] ?? topic}</span>
                      <span className={`text-xs font-semibold ${c.count}`}>({items.length})</span>
                    </div>
                    <span className={`text-lg ${c.title} opacity-70`}>{isCollapsed ? '▼' : '▲'}</span>
                  </button>
                  {!isCollapsed && (
                    <div className={`px-4 pb-4 pt-3 space-y-3 rounded-b-2xl ${c.bodyBg}`}>
                      {items.map(article => {
                        const isOpen = openArticleId === article.id
                        return (
                          <div
                            key={article.id}
                            className="border border-gray-200 rounded-xl bg-white"
                          >
                            <button
                              onClick={() => setOpenArticleId(isOpen ? null : article.id)}
                              className="w-full text-left px-4 py-3"
                              aria-expanded={isOpen}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 text-base leading-snug">{article.title}</h3>
                                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{article.summary}</p>
                                  <p className="text-xs text-gray-400 mt-1">{article.read_time_minutes} min read</p>
                                </div>
                                <span className="text-gray-400 text-base shrink-0 mt-1">{isOpen ? '▲' : '▼'}</span>
                              </div>
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                                <div
                                  className="text-base text-gray-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderMarkdown(article.content)}</p>` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
