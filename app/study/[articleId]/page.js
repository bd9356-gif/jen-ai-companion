'use client'
import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────────────────────────────
   /study/[articleId] — Chef Jennifer's Study Hall quiz player.

   3-5 multiple choice questions generated from a Library article,
   one at a time. Immediate feedback after each answer — Chef Jen
   explains the why. Final screen shows the score (warm, never
   punitive) and saves the result to study_hall_results for the
   Playbook history.

   Voice rules:
   - She SPEAKS the explanations; the page doesn't describe her.
   - Wrong answers are "Not quite — [her explanation]," never
     "Incorrect" or "Wrong."
   - Final score is celebratory regardless: 3/3 = "Nicely done."
     2/3 = "Solid." 1/3 = "That's what practice is for."
   ─────────────────────────────────────────────────────────── */
export default function StudyHallPage({ params }) {
  // Next 16 — params is a Promise we have to `use()` to unwrap.
  const { articleId } = use(params)

  const [user, setUser] = useState(null)
  const [article, setArticle] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Quiz state machine — current question index, selected answer for
  // this question, whether we've revealed the answer yet, and the
  // running score (number correct so far).
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [savedResult, setSavedResult] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadEverything()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadEverything() {
    setLoading(true)
    setError('')
    try {
      // Pull the article (for title + back-link context) and the
      // quiz (generate-or-cache via the API) in parallel.
      const [articleRes, quizRes] = await Promise.all([
        supabase.from('recipe_articles').select('id, title, topic').eq('id', articleId).maybeSingle(),
        fetch('/api/study-hall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: articleId, count: 3 }),
        }).then(r => r.json()),
      ])

      if (articleRes.error || !articleRes.data) {
        setError("Couldn’t find that article.")
        setLoading(false)
        return
      }
      setArticle(articleRes.data)

      if (quizRes?.error || !quizRes?.questions?.length) {
        setError(quizRes?.error || 'No questions came back — try again in a sec.')
        setLoading(false)
        return
      }
      setQuestions(quizRes.questions)
    } catch (err) {
      setError(err.message || 'Something went sideways.')
    }
    setLoading(false)
  }

  function pickAnswer(optionIdx) {
    if (revealed) return
    setSelected(optionIdx)
    setRevealed(true)
    if (optionIdx === questions[idx].correct) {
      setScore(s => s + 1)
    }
  }

  async function nextQuestion() {
    if (idx + 1 >= questions.length) {
      setDone(true)
      // Save the result. Best-effort — a failure here shouldn't break
      // the celebration screen.
      if (user && !savedResult) {
        const finalScore = score + (selected === questions[idx].correct ? 0 : 0) // score already updated on pickAnswer
        try {
          await supabase.from('study_hall_results').insert({
            user_id: user.id,
            article_id: articleId,
            article_title: article?.title || 'Library article',
            score,
            total: questions.length,
          })
          // Save quiz result to Learning Vault
          await supabase.from('favorites').insert({
            user_id: user.id,
            type: 'ai_answer',
            title: `Quiz: ${article?.title || 'Library article'}`,
            thumbnail_url: '',
            source: 'ai',
            is_in_vault: true,
            metadata: {
              question: `Quiz results for: ${article?.title || 'Library article'}`,
              answer: `Score: ${score}/${questions.length} — ${Math.round((score/questions.length)*100)}% correct`,
            }
          })
          setSavedResult(true)
        } catch(err) { console.error("Quiz save error:", err) }
        void finalScore
      }
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header onBack={() => window.location.href = '/guides'} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 text-center">
          <p className="text-2xl mb-3">📝</p>
          <p className="text-lg font-bold text-gray-900">Building your quiz…</p>
          <p className="text-sm text-gray-500 mt-2">Hold on, picking out a few good questions.</p>
        </main>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header onBack={() => window.location.href = '/guides'} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 text-center">
          <p className="text-2xl mb-3">😅</p>
          <p className="text-lg font-bold text-gray-900">Couldn’t put the quiz together.</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => window.location.href = '/guides'}
            className="mt-6 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold"
          >
            Back to Library
          </button>
        </main>
      </div>
    )
  }

  // ── Final score screen ──
  if (done) {
    const total = questions.length
    const headline =
      score === total ? 'Nicely done.'
      : score >= Math.ceil(total / 2) ? 'Solid.'
      : "That's what practice is for."
    const subline =
      score === total ? "You got every one — looks like that one stuck."
      : score >= Math.ceil(total / 2) ? "Good run — a few more reads and these will be reflexes."
      : "No worries — re-read the article and try me again whenever."

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header onBack={() => window.location.href = '/guides'} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 text-center">
          <p className="text-5xl mb-4">🎓</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{headline}</p>
          <p className="text-base text-gray-700 mt-3">
            <span className="text-3xl font-bold text-orange-600">{score}</span>
            <span className="text-base text-gray-400"> of {total}</span>
          </p>
          <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto leading-relaxed">{subline}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => {
                // Reset state and reload the article's quiz fresh
                // (cache will return the same questions — that's fine,
                // re-taking still updates the user's score history).
                setIdx(0); setSelected(null); setRevealed(false)
                setScore(0); setDone(false); setSavedResult(false)
              }}
              className="px-4 py-2 bg-white border-2 border-orange-200 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-50"
            >
              ↺ Try again
            </button>
            <button
              onClick={() => window.location.href = '/guides'}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700"
            >
              Back to the article
            </button>
            <button
              onClick={() => window.location.href = '/secret?view=cardbox'}
              className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:border-gray-300"
            >
              See Learning Vault
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Question screen ──
  const q = questions[idx]
  const isCorrect = revealed && selected === q.correct

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header onBack={() => window.location.href = '/guides'} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Progress + article context */}
        <div className="text-center mb-5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">📝 Study Hall</p>
          {article?.title && (
            <p className="text-xs text-gray-500 mt-1">{article.title}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Question {idx + 1} of {questions.length}</p>
        </div>

        {/* The question */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-5 py-4 mb-4">
          <p className="text-base sm:text-lg font-bold text-gray-900 leading-snug">{q.question}</p>
        </div>

        {/* The four options. Tap one → reveal + lock. */}
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i
            const isRight = i === q.correct
            let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 transition-colors '
            if (!revealed) {
              cls += 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
            } else if (isRight) {
              cls += 'bg-emerald-50 border-emerald-400 text-emerald-900'
            } else if (isSelected) {
              cls += 'bg-rose-50 border-rose-400 text-rose-900'
            } else {
              cls += 'bg-white border-gray-200 text-gray-500'
            }
            return (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={revealed}
                className={cls}
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    !revealed ? 'bg-gray-100 text-gray-600'
                    : isRight ? 'bg-emerald-600 text-white'
                    : isSelected ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-medium leading-snug">{opt}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Feedback panel — shows after answer reveal */}
        {revealed && (
          <div className={`mt-4 rounded-2xl px-4 py-3 border-2 ${
            isCorrect
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
              isCorrect ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {isCorrect ? '✓ Got it' : 'Not quite'}
            </p>
            <p className={`text-sm leading-relaxed ${
              isCorrect ? 'text-emerald-900' : 'text-amber-900'
            }`}>{q.explanation}</p>
          </div>
        )}

        {/* Next / Finish button — only shows after reveal */}
        {revealed && (
          <button
            onClick={nextQuestion}
            className="mt-5 w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-colors"
          >
            {idx + 1 < questions.length ? 'Next question →' : 'See my score →'}
          </button>
        )}
      </main>
    </div>
  )
}

// Tiny header — mirrors the rhythm of the rest of the app's pages but
// keeps the focus on the quiz. Just a back-arrow + small title.
function Header({ onBack }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-600">← Library</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center">📝 Study Hall</h1>
        <span className="w-16 shrink-0" aria-hidden="true" />
      </div>
    </header>
  )
}
