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
  // Study Hall card starts collapsed — first-line "Study Hall is open." stays
  // visible as a header; the explainer body opens on tap. Keeps the Library
  // landing tight for return visitors who already know what Study Hall is.
  const [studyHallOpen, setStudyHallOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Phase 2C — Chef Jennifer's 📚 article chips deep-link here via
    // `?article=<id>`. We grab the id once on mount, then after the
    // articles load we expand its topic, mark it open, and scroll it
    // into view. If the id doesn't match any article (deleted, typo,
    // bookmarked-then-removed) we just fall through to the default
    // collapsed-Library view — no error UI, no toast.
    const targetArticleId = (() => {
      if (typeof window === 'undefined') return null
      try {
        return new URLSearchParams(window.location.search).get('article')
      } catch {
        return null
      }
    })()
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
        const allTopics = new Set(data.map(a => a.topic))
        const target = targetArticleId
          ? data.find(a => a.id === targetArticleId)
          : null
        if (target) {
          // Expand the target's topic + open the article.
          allTopics.delete(target.topic)
          setOpenArticleId(target.id)
          // Defer scroll until after the section renders.
          setTimeout(() => {
            if (cancelled) return
            const el = document.getElementById(`article-${target.id}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 80)
        }
        setCollapsedTopics(allTopics)
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
        <div className="max-w-2xl mx-auto px-4 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/library-hero-512.png"
            alt=""
            className="w-full h-auto block rounded-2xl"
            width={1753}
            height={471}
          />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📚 Guides</h1>
            {articles.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{articles.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/chef'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef Jen</button>
            <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Library banner (May 2026) — a row of cookbooks on a wooden
            shelf, bracketed by a small plant and a utensil crock. The
            "The Library" title and tagline are overlaid in the cream
            space above the books so the banner does the labeling too;
            the standalone H2 block that used to live below was retired
            in the same pass. A soft white pill backing on each line
            keeps the type readable against the colorful book spines
            without dimming the books themselves. */}



        {/* 📝 Study Hall highlight — first-time users need to discover
            that Chef Jen quizzes after articles. Card is collapsible so
            return visitors who already know don't see the explainer on
            every page load: the "Study Hall is open." header stays
            visible; tap to open the body, tap again to close. */}
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setStudyHallOpen(v => !v)}
            aria-expanded={studyHallOpen}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-50/60 transition-colors"
          >
            <span className="text-2xl shrink-0">🎓</span>
            <p className="flex-1 text-sm font-bold text-emerald-900">Study Hall is open.</p>
            <span className={`text-emerald-700 shrink-0 transition-transform ${studyHallOpen ? 'rotate-180' : ''}`} aria-hidden>▾</span>
          </button>
          {studyHallOpen && (
            <div className="px-4 pb-3.5 pl-[60px]">
              <p className="text-xs text-emerald-800/80 leading-relaxed">
                After you read an article, tap <span className="font-semibold">📝 Ask Chef Jen to quiz me</span> at the bottom. Three quick questions to see what stuck. Your results land in <span className="font-semibold">Learning Vault</span>.
              </p>
            </div>
          )}
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
                            id={`article-${article.id}`}
                            className="border border-gray-200 rounded-xl bg-white scroll-mt-24"
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
                                {/* 📝 Study Hall — Chef Jennifer quizzes
                                    you on what you just read. 3-question
                                    multiple choice, immediate feedback,
                                    result saves to Learning Vault. Lives at
                                    the bottom of every expanded article
                                    so it shows up right when the reading
                                    momentum is fresh. */}
                                <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                  <a
                                    href={`/study/${article.id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors"
                                  >
                                    📝 Ask Chef Jen to quiz me
                                  </a>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Three quick questions on what you just read.
                                  </p>
                                </div>
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