'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { normalizeInstructionsArray, instructionsToString } from '@/lib/normalize_instructions'
import { searchLibrary } from '@/lib/library_search'

/* ─────────────────────────────────────────────────────────────
   Chef Jennifer — single chat-first surface (Cooking School #2).

   Two modes share one URL and one conversation:
     🎓 Teach    → teach me / answer (calls /api/chef, prose reply)
     🍳 Practice → cook me a recipe  (calls /api/topchef, JSON recipe)

   Order is locked Teach → Practice everywhere — the loop reads
   left-to-right: Chef Jennifer teaches, then you go practice.
   Default is Teach (matches the loop's starting point and the
   April 2026 instructor framing). Vocabulary mirrors Chef TV
   (Teach = technique content, Practice = recipe content) and
   Playbook (saved Teach videos vs saved Practice videos), so
   the same two words mean the same two things across the app.

   Saves split by mode:
     Teach    → favorites.type='ai_answer'  → Chef Notes (on /playbook)
     Practice → favorites.type='ai_recipe'  → Chef Jennifer Recipes

   The wizard at /topchef was retired — that route is now a
   server redirect to /chef. The "smart suggested prompts"
   below the empty-state replace the Meal/Mood/Protein flow
   for the Practice case; for Teach they're a fast on-ramp to
   common questions.
   ─────────────────────────────────────────────────────────── */

const TEACH_PROMPTS = [
  'How do I know when oil is hot enough for frying?',
  "What's a good substitute for buttermilk?",
  'How do I make pasta not stick together?',
  'How do I fix a sauce that\'s too salty?',
  "What's the difference between baking soda and baking powder?",
  'How long does cooked chicken last in the fridge?',
]

const PRACTICE_PROMPTS = [
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
  const [mode, setMode] = useState('teach')        // 'teach' | 'practice'
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

  // Parse "🎯 Practice this: <text>" out of a Teach-mode response.
  // The system prompt instructs Claude to end with this exact format when
  // the topic has a natural cooking exercise. We strip the line from the
  // prose body so we can render it as a styled "homework" chip and offer
  // a `🍳 Cook in Practice →` handoff button below the save button.
  function parsePractice(content) {
    if (!content) return { prose: '', practice: null }
    const m = content.match(/🎯\s*Practice this:\s*([^\n]+?)\s*$/m)
    if (!m) return { prose: content, practice: null }
    const prose = content.replace(m[0], '').trimEnd()
    return { prose, practice: m[1].trim() }
  }

  // Phase 2B — render Teach-mode prose with `{cite:type:id}` tokens
  // replaced inline by clickable 📚/🎬/🔐 chips. Tokens whose IDs aren't
  // in the message's library payload are dropped silently (model
  // hallucinated an ID, or the row was deleted between turns).
  function renderProseWithCitations(prose, library) {
    if (!prose) return null
    if (!library) return prose
    const lookup = {
      article: Object.fromEntries((library.articles || []).map(a => [a.id, a])),
      video: Object.fromEntries((library.videos || []).map(v => [v.id, v])),
      recipe: Object.fromEntries((library.recipes || []).map(r => [r.id, r])),
    }
    const re = /\{cite:(article|video|recipe):([a-zA-Z0-9_-]+)\}/g
    const parts = []
    let last = 0
    let m
    let key = 0
    while ((m = re.exec(prose)) !== null) {
      if (m.index > last) parts.push(prose.slice(last, m.index))
      const [, type, id] = m
      const item = lookup[type]?.[id]
      if (item) {
        parts.push(<CitationChip key={`c-${key++}`} type={type} item={item} />)
      }
      // Drop unknown tokens entirely — better silent than ugly.
      last = m.index + m[0].length
    }
    if (last < prose.length) parts.push(prose.slice(last))
    return parts
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
      if (useMode === 'practice') {
        // Practice: free-text → recipe JSON. The /api/topchef route appends
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
        // Topic-guard refusal — /api/topchef returns `{recipe: {refusal:"…"}}`
        // when the user's prompt isn't actually a cooking ask (jokes,
        // random questions, non-food topics). Render it as a prose
        // bubble (no recipe card, no save button) so Chef Jennifer can
        // politely redirect the user back to the kitchen instead of
        // generating a forced recipe for an off-topic prompt.
        if (recipe.refusal) {
          setMessages([...newMessages, {
            role: 'assistant',
            mode: 'practice',
            question: trimmed,
            content: recipe.refusal,
            refusal: true,
          }])
          return
        }
        setMessages([...newMessages, {
          role: 'assistant',
          mode: 'practice',
          question: trimmed,
          content: recipe.title || 'Here is a recipe for you.',
          recipe,
        }])
      } else {
        // Teach: chat-style Q&A.
        // Phase 2B — run a keyword search across Guides, Chef TV, and the
        // user's Recipe Vault first, then forward the top hits as
        // citation candidates. The route uses them to build a LIBRARY
        // CONTEXT block; the model embeds {cite:type:id} tokens inline
        // when (and only when) a resource is a direct match. Search is
        // best-effort — any failure falls through with no citations.
        let library = null
        if (user) {
          try {
            library = await searchLibrary(trimmed, user.id)
          } catch {
            library = null
          }
        }
        const res = await fetch('/api/chef', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, library })
        })
        const data = await res.json()
        setMessages([...newMessages, {
          role: 'assistant',
          mode: 'teach',
          question: trimmed,
          content: data?.reply || 'Sorry — empty reply. Try again.',
          library,
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
  const isPractice = mode === 'practice'
  const promptList = isPractice ? PRACTICE_PROMPTS : TEACH_PROMPTS
  const accentBubble = isPractice ? 'bg-orange-600' : 'bg-sky-600'
  const accentRing  = isPractice ? 'focus:ring-orange-300' : 'focus:ring-sky-300'
  const accentSend  = isPractice ? 'bg-orange-600 hover:bg-orange-700' : 'bg-sky-600 hover:bg-sky-700'
  const accentChip  = isPractice
    ? 'hover:bg-orange-50 hover:border-orange-200 text-gray-700'
    : 'hover:bg-sky-50 hover:border-sky-200 text-gray-700'
  const placeholder = isPractice
    ? 'Tell Chef Jennifer what to cook…'
    : 'Ask Chef Jennifer anything…'

  // h-dvh + min-h-0 chain — locks the page to the visible viewport
  // (excluding iOS Safari's bottom URL bar) and lets only the message
  // list scroll, so the textarea never falls off the bottom of the
  // screen. min-h-screen used to let the column grow past 100vh, which
  // on iPhone hid the input behind the browser chrome.
  return (
    <div className="h-dvh bg-white flex flex-col">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header — single compact row with the Teach/Practice toggle
          inline on the right. The previous layout had three rows (title
          row, full-width pill row, tagline caption) which ate ~120px of
          vertical real estate before the suggested prompts could even
          start. By inlining the toggle and dropping the standalone
          tagline (its meaning is folded into the empty-state subtitle
          below), the prompt list rises into view on iPhone without
          scrolling. Toggle order is locked Teach → Practice (the loop
          reads left-to-right) and pill colors match (sky / orange). */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => window.location.href='/kitchen'}
            aria-label="Back to MyKitchen"
            className="text-base text-gray-500 hover:text-gray-700 shrink-0 px-1"
          >
            ←
          </button>
          <h1 className="text-base font-bold text-gray-900 truncate min-w-0">👨‍🍳 Chef Jennifer</h1>
          <div className="shrink-0 ml-auto flex bg-gray-100 rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => setMode('teach')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                mode === 'teach' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎓 Teach
            </button>
            <button
              onClick={() => setMode('practice')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                mode === 'practice' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🍳 Practice
            </button>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="shrink-0 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1">
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-2xl mx-auto w-full px-4 py-2 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">

          {/* Empty state — mode-aware copy + suggested prompts.
              Stripped down so the prompt boxes ride near the top on
              iPhone: dropped the 4xl emoji (it's already in the header),
              dropped the "Try one of these" label (the cards are
              self-evidently tappable), and tightened to a single
              heading + readable subtitle. Subtitle stays at text-base
              gray-600 — that's the readable size. */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <div className="text-center pt-1 pb-1">
                <p className="text-gray-900 font-bold text-xl leading-tight">
                  {isPractice ? 'What should I cook for you?' : 'What can I teach you?'}
                </p>
                <p className="text-gray-600 text-base mt-1 leading-snug max-w-md mx-auto">
                  {isPractice
                    ? 'Class just ended — you\u2019re in the practice kitchen. Pick an assignment or ask Chef Jennifer for a custom one.'
                    : 'You\u2019re in the classroom with your chef — ask your question, learn the skill, then head to 🍳 Practice for your homework.'}
                </p>
              </div>
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
            const userBubbleColor = msg.mode === 'practice' ? 'bg-orange-600' : 'bg-sky-600'
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

            // ASSISTANT — Practice (recipe card) vs Teach (prose bubble)
            if (msg.mode === 'practice' && msg.recipe) {
              return <RecipeMessage key={i} msg={msg} saved={saved} onSave={() => saveRecipe(msg)} />
            }

            // Teach-mode prose bubble. Parse out the "🎯 Practice this:" line
            // (when present) and render it as a styled homework chip + a
            // 🍳 Cook in Practice → handoff button below the save button.
            // Practice-mode refusals (msg.refusal === true) also fall
            // through to this branch — they render as a plain prose bubble
            // with the 🍳 Practice emoji, no homework chip, no save button.
            const { prose, practice } = parsePractice(msg.content)
            const proseEmoji = msg.mode === 'practice' ? '🍳' : '🎓'
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full max-w-[95%]">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    <p className="text-xs text-gray-500 font-semibold mb-1">{proseEmoji} Chef Jennifer</p>
                    {renderProseWithCitations(prose, msg.library)}
                    {practice && (
                      <div className="mt-3 pt-3 border-t border-gray-300/70">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 leading-snug">🎯 Homework — Practice this</p>
                        <p className="text-sm text-gray-800 leading-snug mt-1">{practice}</p>
                      </div>
                    )}
                  </div>
                  {msg.question && !msg.error && !msg.refusal && (
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
                      {/* Post-save exit cue — same fix as the Practice
                          recipe bubble. After `saved === true`, surface
                          a "📘 View in Playbook →" link next to the
                          greyed save button so the user sees where the
                          note went and has an obvious next step. Deep-
                          links to Playbook's 📝 Notes tab. */}
                      {saved && (
                        <a
                          href="/playbook?tab=chef_notes"
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                          📘 View in Playbook →
                        </a>
                      )}
                      {practice && !loading && (
                        <button
                          onClick={() => sendMessage(practice, 'practice')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                          🍳 Cook in Practice →
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
                  {isPractice ? '👨‍🍳 Chef Jennifer is cooking…' : '🎓 Chef Jennifer is thinking…'}
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

        {/* Input bar — pinned to the bottom of the dvh column. The
            paddingBottom uses env(safe-area-inset-bottom) so iPhone's
            home indicator doesn't overlap the textarea. */}
        <div
          className="border-t border-gray-100 pt-3 pb-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
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
            {isPractice ? 'Recipes save to Chef Jennifer Recipes.' : 'Answers save to Chef Notes (on My Playbook).'}
          </p>
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RecipeMessage — assistant message renderer for Practice mode.

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
        <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs text-orange-700 font-semibold mb-1">🍳 Chef Jennifer made you a recipe</p>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{r.title || 'Recipe'}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.difficulty && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-700 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">{r.difficulty}</span>
              )}
              {r.cuisine && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 bg-white/80 border border-orange-200 rounded-full px-2 py-0.5">{r.cuisine}</span>
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
                  <div key={i} className="text-xs text-gray-800 bg-white/70 border border-orange-100 rounded-lg px-2 py-1.5">
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
                    <span className="shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <span className="leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Save row + post-save exit cue. Once `saved === true`, the
            save button greys out and a prominent "📘 View in Playbook →"
            link appears next to it — without this the page sat idle
            after a save with no obvious next step (Bill: "the page stays
            after save need to go back to get out"). The link deep-links
            into Playbook's ✨ Recipes tab via ?tab=chef_recipes. */}
        <div className="flex gap-2 mt-2 ml-1 flex-wrap">
          <button
            onClick={onSave}
            disabled={saved}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              saved
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50'
            }`}>
            {saved ? '✓ Saved to Chef Jennifer Recipes' : '💾 Save to Chef Jennifer Recipes'}
          </button>
          {saved && (
            <a
              href="/playbook?tab=chef_recipes"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-500 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              📘 View in Playbook →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CitationChip — Phase 2B inline chip for {cite:type:id} tokens.

   Three flavors with matching color schemes drawn from each
   destination page:
     📚 article  → /guides           (emerald — Guides Library)
     🎬 video    → youtu.be/<id>     (rose — Chef TV)
     🔐 recipe   → /secret?recipe=id (orange — Recipe Vault)

   The recipe link uses /secret's existing `?recipe=` deep-link.
   The article link uses /guides' Phase 2C `?article=` deep-link;
   videos go straight to YouTube (most useful single destination).
   ─────────────────────────────────────────────────────────── */
function CitationChip({ type, item }) {
  let emoji, classes, href, external = false
  if (type === 'article') {
    emoji = '📚'
    classes = 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
    href = item?.id ? `/guides?article=${item.id}` : '/guides'
  } else if (type === 'video') {
    emoji = '🎬'
    classes = 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
    href = item?.youtube_id ? `https://youtu.be/${item.youtube_id}` : '/videos'
    external = !!item?.youtube_id
  } else {
    emoji = '🔐'
    classes = 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
    href = `/secret?recipe=${item?.id || ''}`
  }
  const title = item?.title || 'Resource'
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-baseline gap-1 px-2 py-0.5 mx-0.5 rounded-md border text-xs font-semibold align-baseline transition-colors ${classes}`}
    >
      <span>{emoji}</span>
      <span className="truncate max-w-[180px]">{title}</span>
    </a>
  )
}
