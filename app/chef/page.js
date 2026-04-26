'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { normalizeInstructionsArray, instructionsToString } from '@/lib/normalize_instructions'

/* ─────────────────────────────────────────────────────────────
   Chef Jennifer — single chat-first surface (Cooking School #2).

   Two modes share one URL and one conversation:
     ❤️ Love  → make me a recipe (calls /api/topchef, JSON recipe)
     🎓 Learn → teach me / answer (calls /api/chef, prose reply)

   Default is Learn — that's the new instructor framing the
   April 2026 pivot is meant to surface. Vocabulary mirrors
   Chef TV (Love = recipe content, Learn = technique content)
   and Playbook (saved Love videos vs saved Learn videos), so
   the same two words mean the same two things across the app.

   Saves split by mode:
     Love  → favorites.type='ai_recipe'  → Chef Jennifer Recipes
     Learn → favorites.type='ai_answer'  → Chef Notes (on /playbook)

   The wizard at /topchef was retired — that route is now a
   server redirect to /chef. The "smart suggested prompts"
   below the empty-state replace the Meal/Mood/Protein flow
   for the Love case; for Learn they're a fast on-ramp to
   common questions.
   ─────────────────────────────────────────────────────────── */

const LEARN_PROMPTS = [
  'How do I know when oil is hot enough for frying?',
  "What's a good substitute for buttermilk?",
  'How do I make pasta not stick together?',
  'How do I fix a sauce that\'s too salty?',
  "What's the difference between baking soda and baking powder?",
  'How long does cooked chicken last in the fridge?',
]

const LOVE_PROMPTS = [
  'A cozy weeknight dinner with chicken',
  "Something light for lunch with what's in the fridge",
  'A 30-minute pasta with bold flavors',
  'A make-ahead breakfast for busy mornings',
  'An impressive dinner for date night',
  'Something quick and vegetarian',
]

export default function ChefPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('learn')        // 'love' | 'learn'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedKeys, setSavedKeys] = useState(new Set())
  const [toast, setToast] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Stable per-message identity for save-button state. We can't use array
  // index because pushing new messages would invalidate previous entries.
  function keyFor(msg) {
    return `${msg.mode}:${msg.question || ''}`
  }

  // Parse "🎯 Practice this: <text>" out of a Learn-mode response.
  // The system prompt instructs Claude to end with this exact format when
  // the topic has a natural cooking exercise. We strip the line from the
  // prose body so we can render it as a styled "homework" chip and offer
  // a `❤️ Practice in Love →` handoff button below the bubble.
  function parsePractice(content) {
    if (!content) return { prose: '', practice: null }
    const m = content.match(/🎯\s*Practice this:\s*([^\n]+?)\s*$/m)
    if (!m) return { prose: content, practice: null }
    const prose = content.replace(m[0], '').trimEnd()
    return { prose, practice: m[1].trim() }
  }

  async function sendMessage(text, modeOverride = null) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    // Allow callers (the Practice button) to switch mode and send in one
    // step. State updates are queued, so we use the local `useMode` value
    // throughout this fn rather than reading `mode` from state mid-flight.
    const useMode = modeOverride || mode
    if (modeOverride && modeOverride !== mode) {
      setMode(modeOverride)
    }
    const userMsg = { role: 'user', content: trimmed, mode: useMode }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      if (useMode === 'love') {
        // Love: free-text → recipe JSON. The /api/topchef route appends
        // the JSON-shape instruction onto whatever prompt we pass, so the
        // wrapper here just clarifies "this is a request for a recipe".
        const wrappedPrompt = `Create a recipe based on this request from a home cook: "${trimmed}". Keep it approachable, delicious, and clear for a home kitchen.`
        const res = await fetch('/api/topchef', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: wrappedPrompt })
        })
        const data = await res.json()
        const recipe = data?.recipe || null
        if (!recipe) throw new Error('no recipe')
        setMessages([...newMessages, {
          role: 'assistant',
          mode: 'love',
          question: trimmed,
          content: recipe.title || 'Here is a recipe for you.',
          recipe,
        }])
      } else {
        // Learn: chat-style Q&A.
        const res = await fetch('/api/chef', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages })
        })
        const data = await res.json()
        setMessages([...newMessages, {
          role: 'assistant',
          mode: 'learn',
          question: trimmed,
          content: data?.reply || 'Sorry — empty reply. Try again.',
        }])
      }
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        mode: useMode,
        content: 'Sorry, something went wrong. Please try again.',
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  async function saveAnswer(msg) {
    if (!user) { window.location.href = '/login'; return }
    const k = keyFor(msg)
    if (savedKeys.has(k)) return
    await supabase.from('favorites').insert({
      user_id: user.id,
      type: 'ai_answer',
      title: (msg.question || msg.content).substring(0, 120),
      thumbnail_url: '',
      source: 'ai',
      is_in_vault: false,
      metadata: {
        question: msg.question,
        answer: msg.content,
      }
    })
    setSavedKeys(prev => new Set([...prev, k]))
    showToast('Saved to Chef Notes ✓')
  }

  async function saveRecipe(msg) {
    if (!user) { window.location.href = '/login'; return }
    const k = keyFor(msg)
    if (savedKeys.has(k)) return
    const r = msg.recipe
    if (!r) return
    await supabase.from('favorites').insert({
      user_id: user.id,
      type: 'ai_recipe',
      title: r.title,
      thumbnail_url: '',
      source: 'ai',
      metadata: {
        description: r.description,
        ingredients: r.ingredients,
        instructions: instructionsToString(r.instructions),
        difficulty: r.difficulty,
        cuisine: r.cuisine,
        prompt: msg.question,
      }
    })
    setSavedKeys(prev => new Set([...prev, k]))
    showToast('Saved to Chef Jennifer Recipes ✓')
  }

  // Mode-aware styling helpers — fully literal class strings so v4 JIT picks them up.
  const isLove = mode === 'love'
  const promptList = isLove ? LOVE_PROMPTS : LEARN_PROMPTS
  const accentBubble = isLove ? 'bg-rose-600' : 'bg-sky-600'
  const accentRing  = isLove ? 'focus:ring-rose-300' : 'focus:ring-sky-300'
  const accentSend  = isLove ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
  const accentChip  = isLove
    ? 'hover:bg-rose-50 hover:border-rose-200 text-gray-700'
    : 'hover:bg-sky-50 hover:border-sky-200 text-gray-700'
  const placeholder = isLove
    ? 'Tell Chef Jennifer what to cook…'
    : 'Ask Chef Jennifer anything…'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600 shrink-0">← Back</button>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">👨‍🍳 Chef Jennifer</h1>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1 shrink-0">
              Clear
            </button>
          )}
        </div>
        {/* Love / Learn pill row — same vocabulary as Chef TV + Playbook. */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setMode('learn')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'learn' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎓 Learn
            </button>
            <button
              onClick={() => setMode('love')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'love' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ❤️ Love
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 text-center">
            {isLove
              ? '❤️ Love — the kitchen lab. Cook a recipe, practice the lesson.'
              : '🎓 Learn — Chef Jennifer teaches, then assigns homework you can cook in Love.'}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">

          {/* Empty state — mode-aware copy + suggested prompts */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-center py-6">
                <p className="text-5xl mb-2">{isLove ? '❤️' : '🎓'}</p>
                <p className="text-gray-800 font-bold text-lg">
                  {isLove ? 'What should I cook for you?' : 'What can I teach you?'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isLove
                    ? 'Tell Chef Jennifer what to make — or come here from 🎓 Learn to practice what you just learned.'
                    : 'Ask anything kitchen. When the topic has a natural exercise, Chef Jennifer will assign a recipe to practice.'}
                </p>
              </div>
              <p className="text-xs text-gray-400 text-center uppercase tracking-wider font-semibold">Try one of these</p>
              <div className="space-y-2">
                {promptList.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className={`w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm transition-colors ${accentChip}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          {messages.map((msg, i) => {
            const k = keyFor(msg)
            const saved = savedKeys.has(k)
            const userBubbleColor = msg.mode === 'love' ? 'bg-rose-600' : 'bg-sky-600'
            const userBubble = `${userBubbleColor} text-white`

            // USER bubble
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap ${userBubble}`}>
                    {msg.content}
                  </div>
                </div>
              )
            }

            // ASSISTANT — Love (recipe card) vs Learn (prose bubble)
            if (msg.mode === 'love' && msg.recipe) {
              return <RecipeMessage key={i} msg={msg} saved={saved} onSave={() => saveRecipe(msg)} />
            }

            // Learn-mode prose bubble. Parse out the "🎯 Practice this:" line
            // (when present) and render it as a styled homework chip + a
            // ❤️ Practice in Love → handoff button below the save button.
            const { prose, practice } = parsePractice(msg.content)
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full max-w-[95%]">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    <p className="text-xs text-gray-500 font-semibold mb-1">🎓 Chef Jennifer</p>
                    {prose}
                    {practice && (
                      <div className="mt-3 pt-3 border-t border-gray-300/70">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 leading-snug">🎯 Homework — Practice this</p>
                        <p className="text-sm text-gray-800 leading-snug mt-1">{practice}</p>
                      </div>
                    )}
                  </div>
                  {msg.question && !msg.error && (
                    <div className="flex gap-2 mt-2 ml-1 flex-wrap">
                      <button
                        onClick={() => saveAnswer(msg)}
                        disabled={saved}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          saved
                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                        }`}>
                        {saved ? '✓ Saved to Chef Notes' : '📝 Save to Chef Notes'}
                      </button>
                      {practice && !loading && (
                        <button
                          onClick={() => sendMessage(practice, 'love')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          ❤️ Practice in Love →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Loading indicator — color-coded by current mode */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <p className="text-xs text-gray-500 font-semibold mb-1">
                  {isLove ? '👨‍🍳 Chef Jennifer is cooking…' : '🎓 Chef Jennifer is thinking…'}
                </p>
                <div className="flex gap-1">
                  <span className={`w-2 h-2 ${accentBubble} rounded-full animate-bounce`} style={{animationDelay:'0ms'}} />
                  <span className={`w-2 h-2 ${accentBubble} rounded-full animate-bounce`} style={{animationDelay:'150ms'}} />
                  <span className={`w-2 h-2 ${accentBubble} rounded-full animate-bounce`} style={{animationDelay:'300ms'}} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder={placeholder}
              rows={1}
              style={{ fontSize: '16px' }}
              className={`flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${accentRing} resize-none`}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={`h-11 w-11 shrink-0 ${accentSend} text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            {isLove ? 'Recipes save to Chef Jennifer Recipes.' : 'Answers save to Chef Notes (on My Playbook).'}
          </p>
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RecipeMessage — assistant message renderer for Love mode.

   Lays the recipe out as a card-shaped bubble inside the chat:
   title + difficulty pill, description, ingredients chips,
   numbered instructions, and a 💾 Save to Chef Jennifer Recipes
   button. Mirrors the visual vocabulary of /chef-recipes.
   ─────────────────────────────────────────────────────────── */
function RecipeMessage({ msg, saved, onSave }) {
  const r = msg.recipe || {}
  const steps = normalizeInstructionsArray(r.instructions)
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : []

  return (
    <div className="flex justify-start">
      <div className="w-full">
        <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border-2 border-rose-200 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs text-rose-700 font-semibold mb-1">❤️ Chef Jennifer made you a recipe</p>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{r.title || 'Recipe'}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.difficulty && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-700 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">{r.difficulty}</span>
              )}
              {r.cuisine && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 bg-white/80 border border-rose-200 rounded-full px-2 py-0.5">{r.cuisine}</span>
              )}
            </div>
            {r.description && (
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.description}</p>
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="px-4 pb-2">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-2">Ingredients</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ingredients.map((ing, i) => (
                  <div key={i} className="text-xs text-gray-800 bg-white/70 border border-rose-100 rounded-lg px-2 py-1.5">
                    {typeof ing === 'string' ? (
                      ing
                    ) : (
                      <>
                        {ing.measure && <span className="font-semibold">{ing.measure} </span>}
                        {ing.name}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-2">Instructions</p>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-800">
                    <span className="shrink-0 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <span className="leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2 ml-1">
          <button
            onClick={onSave}
            disabled={saved}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              saved
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}>
            {saved ? '✓ Saved to Chef Jennifer Recipes' : '💾 Save to Chef Jennifer Recipes'}
          </button>
        </div>
      </div>
    </div>
  )
}
