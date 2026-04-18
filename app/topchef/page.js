'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const STEPS = {
  MEAL: 'meal',
  MOOD: 'mood',
  PROTEIN: 'protein',
  PREFERENCES: 'preferences',
  COOKING: 'cooking',
  RESULT: 'result',
}

// Ordered list used to render the "Step N of 4" progress pill.
const WIZARD_ORDER = [STEPS.MEAL, STEPS.MOOD, STEPS.PROTEIN, STEPS.PREFERENCES]

// Rotating messages during the /api/topchef call. Cozy, not clinical.
const COOKING_MESSAGES = [
  "Chef Jennifer is tasting…",
  "…adjusting the seasoning…",
  "…pulling the good pans out…",
  "…double-checking the measurements…",
  "…plating it now…",
]

// Simple greeting based on local hour. Safe in SSR because we compute on mount.
function greetingFor(hour) {
  if (hour < 5)  return 'Up late?'
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

// "Make my recipe more..." — multi-select cooking preferences.
// These are cooking-style adjustments, NOT medical advice.
const PREFERENCE_OPTIONS = [
  { value: 'carb_aware',       label: 'Carb-aware',            emoji: '🌾', hint: 'lower carbs where sensible' },
  { value: 'carb_counting',    label: 'Carb-counting friendly', emoji: '📊', hint: 'clearer per-serving carb info' },
  { value: 'portion_focused',  label: 'Portion-focused',       emoji: '⚖️', hint: 'right-sized servings' },
  { value: 'vegetarian',       label: 'Vegetarian-friendly',   emoji: '🥦', hint: 'swap meat for plant options' },
  { value: 'gluten_friendly',  label: 'Gluten-friendly',       emoji: '🌿', hint: 'avoid wheat where possible' },
  { value: 'dairy_friendly',   label: 'Dairy-friendly',        emoji: '🥛', hint: 'avoid dairy where possible' },
  { value: 'low_sodium',       label: 'Low-sodium',            emoji: '🧂', hint: 'reduce added salt' },
  { value: 'heart_healthy',    label: 'Heart-healthy',         emoji: '❤️', hint: 'leaner fats, more veg' },
]

const MEAL_OPTIONS = [
  { label: 'Breakfast', emoji: '🌅', value: 'breakfast' },
  { label: 'Lunch',     emoji: '☀️', value: 'lunch' },
  { label: 'Dinner',    emoji: '🌙', value: 'dinner' },
]

const MOOD_OPTIONS = {
  breakfast: [
    { label: 'Quick & light',    emoji: '⚡', value: 'quick and light' },
    { label: 'Hearty & filling', emoji: '💪', value: 'hearty and filling' },
    { label: 'Sweet treat',      emoji: '🍯', value: 'sweet' },
    { label: 'Savory classic',   emoji: '🍳', value: 'savory classic' },
  ],
  lunch: [
    { label: 'Light & fresh',    emoji: '🥗', value: 'light and fresh' },
    { label: 'Warm & comforting',emoji: '🍲', value: 'warm and comforting' },
    { label: 'Something quick',  emoji: '⚡', value: 'quick and easy' },
    { label: 'Bold flavors',     emoji: '🌶️', value: 'bold flavors' },
  ],
  dinner: [
    { label: 'Comfort food',     emoji: '🏠', value: 'comfort food' },
    { label: 'Something elegant',emoji: '✨', value: 'elegant and impressive' },
    { label: 'Quick weeknight',  emoji: '⚡', value: 'quick weeknight' },
    { label: 'Bold & spicy',     emoji: '🌶️', value: 'bold and spicy' },
  ],
}

const PROTEIN_OPTIONS = [
  { label: 'Chicken', emoji: '🍗', value: 'chicken' },
  { label: 'Beef',    emoji: '🥩', value: 'beef' },
  { label: 'Fish',    emoji: '🐟', value: 'fish' },
  { label: 'Pork',    emoji: '🥓', value: 'pork' },
  { label: 'Veggie',  emoji: '🥦', value: 'vegetarian' },
  { label: 'Surprise me', emoji: '🎲', value: 'chef\'s choice' },
]

function StepPill({ current }) {
  const idx = WIZARD_ORDER.indexOf(current)
  if (idx < 0) return null
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
        Step {idx + 1} of {WIZARD_ORDER.length}
      </span>
      <div className="flex-1 flex gap-1">
        {WIZARD_ORDER.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-orange-400' : 'bg-gray-200'}`} />
        ))}
      </div>
    </div>
  )
}

export default function MyChefPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(STEPS.MEAL)
  const [meal, setMeal] = useState(null)
  const [mood, setMood] = useState(null)
  const [protein, setProtein] = useState(null)
  const [preferences, setPreferences] = useState([]) // array of PREFERENCE_OPTIONS values
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(null)
  const [greeting, setGreeting] = useState('')   // set on mount to avoid SSR mismatch
  const [cookingIdx, setCookingIdx] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
    setGreeting(greetingFor(new Date().getHours()))
  }, [])

  // Rotate the cooking messages every ~1.6s while the AI is thinking.
  useEffect(() => {
    if (step !== STEPS.COOKING) return
    setCookingIdx(0)
    const t = setInterval(() => {
      setCookingIdx(i => (i + 1) % COOKING_MESSAGES.length)
    }, 1600)
    return () => clearInterval(t)
  }, [step])

  function reset() {
    setStep(STEPS.MEAL)
    setMeal(null)
    setMood(null)
    setProtein(null)
    setPreferences([])
    setRecipe(null)
    setSaved(false)
  }

  function selectMeal(option) {
    setMeal(option)
    setStep(STEPS.MOOD)
  }

  function selectMood(option) {
    setMood(option)
    setStep(STEPS.PROTEIN)
  }

  function selectProtein(option) {
    setProtein(option)
    setStep(STEPS.PREFERENCES)
  }

  function togglePreference(value) {
    setPreferences(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  async function submitPreferences() {
    setStep(STEPS.COOKING)
    setLoading(true)

    let prompt = `You are a warm, friendly personal chef. Create a ${meal.label} recipe that is ${mood.value} with ${protein.value} as the main protein. Keep it approachable and delicious.`

    if (preferences.length > 0) {
      const prefLabels = preferences
        .map(v => PREFERENCE_OPTIONS.find(o => o.value === v)?.label)
        .filter(Boolean)
        .join(', ')
      prompt += `\n\nAdditional cooking preferences from the home cook: make this recipe more ${prefLabels}. Adjust ingredients, portions, and preparation methods to support these preferences. Frame every change as a practical home-cook tip — do not provide medical advice or make health claims. When portion or carb adjustments are requested, give clear per-serving notes rather than prescriptive guidance.`
    }

    try {
      const res = await fetch('/api/topchef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          drawer: `${meal.label} — ${mood.label}`,
          cuisine: meal.value,
          preferences, // send to backend for logging/metadata
        })
      })
      const data = await res.json()
      setRecipe(data.recipe)
      setStep(STEPS.RESULT)
    } catch (err) {
      showToast('Something went wrong. Try again.')
      setStep(STEPS.PREFERENCES)
    }
    setLoading(false)
  }

  async function saveToFavorites() {
    if (!user) { window.location.href = '/login'; return }
    if (!recipe) return
    await supabase.from('favorites').insert({
      user_id: user.id,
      type: 'ai_recipe',
      title: recipe.title,
      thumbnail_url: '',
      source: 'ai',
      metadata: {
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        meal: meal?.value,
        mood: mood?.value,
        protein: protein?.value,
        preferences, // snapshot of selected preferences for this generation
      }
    })
    setSaved(true)
    showToast('Saved to MyPlan ✓')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Tolerant parser: handles array, newline-separated string, OR a single
  // "1. foo 2. bar" blob (legacy rows). Strips leading "1." / "1)" numbers.
  const instructions = (() => {
    const raw = recipe?.instructions
    if (!raw) return []
    let parts = []
    if (Array.isArray(raw)) {
      parts = raw.map(String)
    } else if (typeof raw === 'string') {
      const s = raw.trim()
      if (s.includes('\n')) {
        parts = s.split('\n')
      } else if (/\s\d+[\.\)]\s/.test(s)) {
        parts = s.split(/\s(?=\d+[\.\)]\s)/)
      } else {
        parts = [s]
      }
    }
    return parts
      .map(p => String(p).trim().replace(/^\s*\d+[\.\)]\s*/, ''))
      .filter(Boolean)
  })()

  // Pull the first name from the user's email for a personal touch.
  const firstName = user?.email ? user.email.split('@')[0].split('.')[0] : ''
  const niceName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">👨‍🍳 Chef Jennifer</h1>
          </div>
          {step !== STEPS.MEAL && (
            <button onClick={reset} className="text-xs text-orange-600 font-semibold hover:text-orange-700">
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">

        {/* STEP 1 — Meal time (with greeting + avatar) */}
        {step === STEPS.MEAL && (
          <div>
            {/* Chef hero card */}
            <div className="relative rounded-3xl overflow-hidden mb-6 shadow-sm border border-orange-100" style={{height:'220px'}}>
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
                alt="Your personal chef"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end gap-3">
                <div className="w-14 h-14 rounded-full bg-white/95 border-2 border-orange-300 flex items-center justify-center text-3xl shrink-0 shadow-md">
                  👨‍🍳
                </div>
                <div className="text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-200/90">Chef Jennifer</p>
                  <p className="font-bold text-lg leading-tight">
                    {greeting ? `${greeting}${niceName ? `, ${niceName}` : ''} — what are we cooking?` : 'What are we cooking today?'}
                  </p>
                </div>
              </div>
            </div>

            <StepPill current={STEPS.MEAL} />

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Pick a meal</h2>
            <p className="text-gray-500 text-sm mb-6">Tell me what time of day we're cooking for.</p>
            <div className="grid grid-cols-3 gap-3">
              {MEAL_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => selectMeal(opt)}
                  className="flex flex-col items-center gap-2 py-6 bg-white border-2 border-orange-100 rounded-2xl hover:border-orange-400 hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Ask-anything entry — moved from MyKitchen nav */}
            <div className="mt-10 pt-6 border-t-2 border-gray-100">
              <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600 mb-1">Or just ask</p>
              <p className="text-xs text-gray-500 mb-3">Have a kitchen question instead of a recipe request? Chef Jennifer can answer anything.</p>
              <button onClick={() => window.location.href='/chef'}
                className="w-full flex items-center gap-3 p-4 bg-white border-2 border-purple-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 transition-all active:scale-95 text-left">
                <span className="text-2xl">🤖</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Ask Chef Anything</p>
                  <p className="text-xs text-gray-500">Substitutions, techniques, tips — anything.</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Mood */}
        {step === STEPS.MOOD && (
          <div>
            <StepPill current={STEPS.MOOD} />
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">{meal?.emoji}</span>
              <div>
                <p className="text-xs text-gray-400">Making {meal?.label}</p>
                <h2 className="text-xl font-bold text-gray-900">What's the vibe?</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS[meal?.value]?.map(opt => (
                <button key={opt.value} onClick={() => selectMood(opt)}
                  className="flex items-center gap-3 p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm hover:-translate-y-0.5 transition-all active:scale-95 text-left">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — Protein */}
        {step === STEPS.PROTEIN && (
          <div>
            <StepPill current={STEPS.PROTEIN} />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{meal?.emoji}</span>
              <div>
                <p className="text-xs text-gray-400">{meal?.label} · {mood?.label}</p>
                <h2 className="text-xl font-bold text-gray-900">Pick your protein</h2>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6">Almost there — one more tiny choice.</p>
            <div className="grid grid-cols-2 gap-3">
              {PROTEIN_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => selectProtein(opt)}
                  className="flex items-center gap-3 p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm hover:-translate-y-0.5 transition-all active:scale-95 text-left">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Preferences (optional) */}
        {step === STEPS.PREFERENCES && (
          <div>
            <StepPill current={STEPS.PREFERENCES} />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{meal?.emoji}</span>
              <div>
                <p className="text-xs text-gray-400">{meal?.label} · {mood?.label} · {protein?.label}</p>
                <h2 className="text-xl font-bold text-gray-900">Make my recipe more...</h2>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5">Choose the kind of support you want — or skip. Multi-select.</p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {PREFERENCE_OPTIONS.map(opt => {
                const selected = preferences.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => togglePreference(opt.value)}
                    className={`flex items-start gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                      selected
                        ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'
                    }`}
                  >
                    <span className="text-xl shrink-0">{opt.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-tight ${selected ? 'text-purple-800' : 'text-gray-900'}`}>{opt.label}</p>
                      <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{opt.hint}</p>
                    </div>
                    {selected && <span className="text-purple-600 text-sm font-bold shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>

            <p className="text-[11px] text-gray-400 mb-4 leading-snug">
              These are cooking-style preferences, not medical advice. Always check with a healthcare provider for specific dietary needs.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={submitPreferences}
                className="w-full py-4 rounded-2xl text-base font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-md shadow-orange-200"
              >
                {preferences.length === 0 ? 'Skip — keep it classic →' : `Continue with ${preferences.length} preference${preferences.length === 1 ? '' : 's'} →`}
              </button>
              {preferences.length > 0 && (
                <button
                  onClick={() => setPreferences([])}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 5 — Cooking (rotating cozy messages) */}
        {step === STEPS.COOKING && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 rounded-full bg-orange-200/60 blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-white border-4 border-orange-300 flex items-center justify-center text-5xl shadow-lg animate-bounce">
                👨‍🍳
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Your chef is cooking</h2>
            <p className="text-orange-600 text-sm font-semibold min-h-[1.25rem] transition-opacity">
              {COOKING_MESSAGES[cookingIdx]}
            </p>
            <p className="text-gray-400 text-xs mt-4">{meal?.label} · {mood?.label} · {protein?.label}</p>
          </div>
        )}

        {/* STEP 6 — Result */}
        {step === STEPS.RESULT && recipe && (
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
              <span>{meal?.emoji} {meal?.label}</span>
              <span>·</span>
              <span>{mood?.emoji} {mood?.label}</span>
              <span>·</span>
              <span>{protein?.emoji} {protein?.label}</span>
            </div>

            {/* Applied preferences */}
            {preferences.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mr-1 self-center">Made more:</span>
                {preferences.map(v => {
                  const opt = PREFERENCE_OPTIONS.find(o => o.value === v)
                  if (!opt) return null
                  return (
                    <span key={v} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                      {opt.emoji} {opt.label}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Recipe hero — soft gradient card with chef badge */}
            <div className="relative rounded-3xl overflow-hidden mb-5 p-6 bg-gradient-to-br from-orange-100 via-amber-50 to-rose-50 border-2 border-orange-200 shadow-sm">
              <div className="absolute -top-6 -right-6 text-[120px] opacity-10 select-none">👨‍🍳</div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 bg-white/70 border border-orange-200 rounded-full px-2 py-0.5">Chef's recipe</span>
                  {recipe.difficulty && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-white/70 border border-gray-200 rounded-full px-2 py-0.5">{recipe.difficulty}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{recipe.title}</h2>
                {recipe.description && (
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">{recipe.description}</p>
                )}
              </div>
            </div>

            {/* Ingredients — index-card chips */}
            {recipe.ingredients?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Ingredients</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="relative flex items-start gap-2 px-3 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm">
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r" />
                      <span className="text-amber-700 shrink-0 ml-1">•</span>
                      <span className="text-gray-800">
                        {ing.measure && <span className="font-semibold text-gray-900">{ing.measure} </span>}
                        {ing.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions — numbered steps */}
            {instructions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Instructions</h3>
                <div className="space-y-3">
                  {instructions.map((stepText, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50/40 transition-colors">
                      <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                        {i+1}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed pt-1">{stepText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button onClick={saveToFavorites} disabled={saved}
                title="Save this recipe to your MyPlan"
                className={`w-full py-4 rounded-2xl text-base font-semibold transition-colors shadow-md ${saved ? 'bg-gray-100 text-gray-400 shadow-none' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'}`}>
                {saved ? '✓ Saved to MyPlan' : '📋 Save to MyPlan'}
              </button>
              <button onClick={reset}
                className="w-full py-4 rounded-2xl text-base font-semibold bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                👨‍🍳 Cook Something Else
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
