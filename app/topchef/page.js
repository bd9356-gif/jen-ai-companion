'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── RESTAURANT CLASSICS — rotates on each tap ──
const CLASSICS = [
  { dish: 'Pan-Seared Salmon', note: "Tonight's pick: bright, buttery, perfect with veggies." },
  { dish: 'Lemon Herb Chicken', note: "Golden skin, tender inside — a crowd-pleaser every time." },
  { dish: 'Tuscan Steak', note: "Bold flavors, herb-crusted — feels like Florence tonight." },
  { dish: 'Seared Duck Breast', note: "Rich, elegant — restaurant quality at home." },
  { dish: 'Branzino Piccata', note: "Light, citrusy — feels like the coast of Italy." },
]

// ── PROTEIN NIGHT ──
const PROTEIN_OPTIONS = {
  '🍗 Chicken': ['Crispy Butter Chicken', 'Garlic Herb Roasted Chicken', 'Chicken Marsala'],
  '🐟 Fish':    ['Pan-Seared Halibut', 'Miso Glazed Salmon', 'Lemon Sole Meunière'],
  '🥩 Beef':    ['Classic Beef Bourguignon', 'Herb Crusted Ribeye', 'Korean BBQ Short Ribs'],
  '🥦 Veggie':  ['Eggplant Parmigiana', 'Mushroom Risotto', 'Roasted Cauliflower Steak'],
}

// ── QUICK CHEF ──
const QUICK_MEALS = [
  { dish: 'One-Pan Chicken', time: '20 min', note: 'Golden, juicy, one pan to clean.' },
  { dish: 'Shrimp Garlic Bowls', time: '15 min', note: 'Fast, fresh, restaurant quality.' },
  { dish: 'Pasta Aglio e Olio', time: '12 min', note: 'Pantry magic — pure Italian simplicity.' },
  { dish: 'Teriyaki Salmon Bowl', time: '18 min', note: 'Sweet, savory, done in minutes.' },
  { dish: 'Seared Scallops', time: '10 min', note: 'Golden crust, butter finish — wow factor.' },
]

// ── CHEF'S SPECIALS ──
const SPECIALS = [
  { label: 'Seasonal Dish', dish: 'Spring Pea & Mint Risotto', note: "Chef's seasonal pick — fresh, light, vibrant." },
  { label: 'Trending Recipe', dish: 'Birria Tacos', note: "Everywhere right now — and for good reason." },
  { label: 'Comfort Classic', dish: 'Short Rib Shepherd\'s Pie', note: "The ultimate comfort dish — rich, hearty, warming." },
  { label: 'Light & Fresh', dish: 'Citrus Poached Halibut', note: "Clean, elegant — feels like fine dining at home." },
]

const PROTEINS = ['🍗 Chicken', '🐟 Fish', '🥩 Beef', '🥦 Veggie']
const FLAVORS = ['🌶 Bold & Spicy', '🍋 Light & Citrus', '🧈 Rich & Buttery', '🌿 Herb & Earthy']
const TIMES = ['⚡ Under 20 min', '🕐 30-45 min', '🍲 Slow & Low']

export default function TopChefPage() {
  const [openDrawer, setOpenDrawer] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const [fadeKey, setFadeKey] = useState(0)

  // Classics state
  const [classicIndex, setClassicIndex] = useState(0)
  const [classics, setClassics] = useState([
    { dish: 'Pan-Seared Salmon', note: "Tonight's pick: bright, buttery, perfect with veggies." },
    { dish: 'Lemon Herb Chicken', note: "Golden skin, tender inside — a crowd-pleaser every time." },
    { dish: 'Tuscan Steak', note: "Bold flavors, herb-crusted — feels like Florence tonight." },
    { dish: 'Seared Duck Breast', note: "Rich, elegant — restaurant quality at home." },
    { dish: 'Branzino Piccata', note: "Light, citrusy — feels like the coast of Italy." },
  ])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
    loadRotatingClassics()
  }, [])

  async function loadRotatingClassics() {
    const { data } = await supabase
      .from('recipes')
      .select('title')
      .not('thumbnail_url', 'is', null)
      .limit(300)
    if (data && data.length >= 5) {
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 8)
      const notes = [
        "Tonight's pick — fresh, vibrant, impressive.",
        "Chef recommends — bold flavors, easy to love.",
        "A crowd-pleaser — always gets compliments.",
        "Something different — you'll want to make this again.",
        "Tonight's special — restaurant quality at home.",
        "Chef's favorite — simple but stunning.",
        "Perfect for tonight — satisfying and delicious.",
        "The one to try — trust your chef on this one.",
      ]
      setClassics(shuffled.map((r, i) => ({ dish: r.title, note: notes[i % notes.length] })))
    }
  }

  // Protein Night state
  const [selectedProtein, setSelectedProtein] = useState(null)

  // Quick Chef state
  const [quickIndex, setQuickIndex] = useState(0)

  // Chef's Specials state
  const [specialIndex, setSpecialIndex] = useState(0)

  // Build My Meal state
  const [buildStep, setBuildStep] = useState(0)
  const [buildProtein, setBuildProtein] = useState(null)
  const [buildFlavor, setBuildFlavor] = useState(null)
  const [buildTime, setBuildTime] = useState(null)

  function toggleDrawer(id) {
    setOpenDrawer(prev => prev === id ? null : id)
  }

  function nextClassic() {
    setFadeKey(k => k + 1)
    setClassicIndex(i => (i + 1) % CLASSICS.length)
  }

  function nextQuick() {
    setFadeKey(k => k + 1)
    setQuickIndex(i => (i + 1) % QUICK_MEALS.length)
  }

  function nextSpecial() {
    setFadeKey(k => k + 1)
    setSpecialIndex(i => (i + 1) % SPECIALS.length)
  }

  function resetBuild() {
    setBuildStep(0)
    setBuildProtein(null)
    setBuildFlavor(null)
    setBuildTime(null)
  }

  async function cookThis(item, context = '') {
    setGenerating(true)
    setSaved(false)
    try {
      const prompt = `Create a refined, restaurant-quality recipe for "${item}". ${context} Make it impressive and delicious.`
      const res = await fetch('/api/topchef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, item, drawer: 'Chef Menu' })
      })
      const data = await res.json()
      if (data.recipe) setViewing(data.recipe)
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  async function cookBuildMyMeal() {
    if (!buildProtein || !buildFlavor || !buildTime) return
    const context = `Use ${buildProtein.replace(/^[^\s]+\s/, '')} as the protein. Flavor profile: ${buildFlavor.replace(/^[^\s]+\s/, '')}. Time: ${buildTime.replace(/^[^\s]+\s/, '')}.`
    await cookThis('a custom chef creation', context)
    resetBuild()
  }

  async function saveToVault() {
    if (!user || !viewing) return
    setSaving(true)
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: viewing.title,
      description: viewing.description || '',
      ingredients: viewing.ingredients || [],
      instructions: viewing.instructions || '',
      category: 'AI Chef Creation',
      tags: ['ai-chef'],
      family_notes: `AI Chef Creation — ${viewing.difficulty || ''}`,
      photo_url: '',
    })
    if (!error) setSaved(true)
    setSaving(false)
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-4xl animate-bounce">👨‍🍳</p>
        <p className="text-lg font-bold text-gray-900">Your chef is at work...</p>
        <p className="text-sm text-gray-400 text-center">Crafting something special just for you.</p>
      </div>
    )
  }

  if (viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-400 hover:text-gray-600">← Menu</button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">👨‍🍳 Chef's Creation</span>
              <button onClick={saveToVault} disabled={saving || saved}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${saved ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'} disabled:opacity-50`}>
                {saving ? '⏳' : saved ? '✓ Saved!' : '♥ Save to Vault'}
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="flex flex-wrap gap-2 mb-3">
            {viewing.cuisine && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">🌍 {viewing.cuisine}</span>}
            {viewing.difficulty && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{viewing.difficulty}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{viewing.title}</h1>
          {viewing.description && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-900 leading-relaxed">👨‍🍳 {viewing.description}</p>
            </div>
          )}
          {ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Ingredients</h2>
              <div className="bg-gray-50 rounded-2xl p-4">
                <ul className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-orange-400">•</span>
                      <span className="text-gray-600">
                        {ing.measure && <span className="font-semibold text-gray-800">{ing.measure} </span>}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {instructions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
              <div className="space-y-4">
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={saveToVault} disabled={saving || saved}
            className={`w-full py-4 rounded-2xl text-base font-semibold transition-colors ${saved ? 'bg-green-50 text-green-600 border-2 border-green-200' : 'bg-orange-600 text-white hover:bg-orange-700'} disabled:opacity-50`}>
            {saving ? '⏳ Saving...' : saved ? '✓ Saved to MyRecipeVault' : '♥ Save to MyRecipeVault'}
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">👨‍🍳 AI Chef Creations</h1>
          </div>
          <p className="text-xs text-gray-400">Tap a section — your chef builds the meal.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16 space-y-3">

        {/* 1. RESTAURANT CLASSICS */}
        <div className="border border-orange-200 rounded-2xl overflow-hidden bg-orange-50">
          <button onClick={() => toggleDrawer('classics')} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <span style={{fontSize:'22px'}}>🥘</span>
              <div>
                <p className="font-bold text-sm text-orange-900">Restaurant Classics</p>
                <p className="text-xs mt-0.5 text-orange-600">Tap to flip through tonight's picks.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); nextClassic() }} className="text-xs text-orange-500 hover:text-orange-700 font-semibold">🔄</button>
              <span className={`text-lg text-orange-900 transition-transform duration-200 ${openDrawer === 'classics' ? 'rotate-180' : ''}`}>▾</span>
            </div>
          </button>
          {openDrawer === 'classics' && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div key={fadeKey} className="mb-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="font-bold text-gray-900 text-base mb-1">{classics[classicIndex].dish}</p>
                <p className="text-xs text-orange-700 italic">"{classics[classicIndex].note}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={nextClassic}
                  className="flex-1 py-2.5 border-2 border-orange-200 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors">
                  ↻ Next Pick
                </button>
                <button onClick={() => cookThis(classics[classicIndex].dish)}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">
                  Cook This →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. PROTEIN NIGHT */}
        <div className="border border-red-200 rounded-2xl overflow-hidden bg-red-50">
          <button onClick={() => toggleDrawer('protein')} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <span style={{fontSize:'22px'}}>🍗</span>
              <div>
                <p className="font-bold text-sm text-red-900">Protein Night</p>
                <p className="text-xs mt-0.5 text-red-500">Pick the protein — chef shows 3 dishes.</p>
              </div>
            </div>
            <span className={`text-lg text-red-900 transition-transform duration-200 ${openDrawer === 'protein' ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openDrawer === 'protein' && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PROTEINS.map(p => (
                  <button key={p} onClick={() => setSelectedProtein(p)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${selectedProtein === p ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}>
                    {p}
                  </button>
                ))}
              </div>
              {selectedProtein && (
                <div className="space-y-2">
                  {PROTEIN_OPTIONS[selectedProtein].map(dish => (
                    <button key={dish} onClick={() => cookThis(dish, `Focus on ${selectedProtein.replace(/^[^\s]+\s/, '')} as the star protein.`)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                      <span className="text-sm font-medium text-gray-800">{dish}</span>
                      <span className="text-xs font-semibold text-red-600">Cook →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. QUICK CHEF */}
        <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50">
          <button onClick={() => toggleDrawer('quick')} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <span style={{fontSize:'22px'}}>⚡</span>
              <div>
                <p className="font-bold text-sm text-amber-900">Quick Chef</p>
                <p className="text-xs mt-0.5 text-amber-600">Restaurant flavor in under 20 minutes.</p>
              </div>
            </div>
            <span className={`text-lg text-amber-900 transition-transform duration-200 ${openDrawer === 'quick' ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openDrawer === 'quick' && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div key={`q-${quickIndex}`} className="mb-3 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{QUICK_MEALS[quickIndex].dish}</p>
                  <p className="text-xs text-amber-700 italic mt-0.5">"{QUICK_MEALS[quickIndex].note}"</p>
                </div>
                <span className="shrink-0 ml-3 bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{QUICK_MEALS[quickIndex].time}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={nextQuick}
                  className="flex-1 py-2.5 border-2 border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-colors">
                  ↻ Next Meal
                </button>
                <button onClick={() => cookThis(QUICK_MEALS[quickIndex].dish, `This must be completable in ${QUICK_MEALS[quickIndex].time}. Quick, flavorful, minimal cleanup.`)}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
                  Cook This →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. CHEF'S SPECIALS */}
        <div className="border border-purple-200 rounded-2xl overflow-hidden bg-purple-50">
          <button onClick={() => toggleDrawer('specials')} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <span style={{fontSize:'22px'}}>⭐</span>
              <div>
                <p className="font-bold text-sm text-purple-900">Chef's Specials</p>
                <p className="text-xs mt-0.5 text-purple-600">Tap to reveal tonight's special.</p>
              </div>
            </div>
            <span className={`text-lg text-purple-900 transition-transform duration-200 ${openDrawer === 'specials' ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openDrawer === 'specials' && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div key={`s-${specialIndex}`} className="mb-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">{SPECIALS[specialIndex].label}</p>
                <p className="font-bold text-gray-900 mb-1">{SPECIALS[specialIndex].dish}</p>
                <p className="text-xs text-purple-700 italic">"{SPECIALS[specialIndex].note}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={nextSpecial}
                  className="flex-1 py-2.5 border-2 border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors">
                  ↻ New Special
                </button>
                <button onClick={() => cookThis(SPECIALS[specialIndex].dish)}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                  Cook This →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. BUILD MY MEAL */}
        <div className="border border-teal-200 rounded-2xl overflow-hidden bg-teal-50">
          <button onClick={() => toggleDrawer('build')} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <span style={{fontSize:'22px'}}>🧑‍🍳</span>
              <div>
                <p className="font-bold text-sm text-teal-900">Build My Meal</p>
                <p className="text-xs mt-0.5 text-teal-600">Tell your chef the vibe — get a custom dish.</p>
              </div>
            </div>
            <span className={`text-lg text-teal-900 transition-transform duration-200 ${openDrawer === 'build' ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openDrawer === 'build' && (
            <div className="bg-white border-t border-gray-100 p-4 space-y-3">
              {/* Step 1 — Protein */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">1. Choose Protein</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROTEINS.map(p => (
                    <button key={p} onClick={() => { setBuildProtein(p); if (buildStep < 1) setBuildStep(1) }}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${buildProtein === p ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 — Flavor */}
              {buildStep >= 1 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">2. Choose Flavor</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FLAVORS.map(f => (
                      <button key={f} onClick={() => { setBuildFlavor(f); if (buildStep < 2) setBuildStep(2) }}
                        className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${buildFlavor === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 — Time */}
              {buildStep >= 2 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">3. How much time?</p>
                  <div className="space-y-2">
                    {TIMES.map(t => (
                      <button key={t} onClick={() => { setBuildTime(t); setBuildStep(3) }}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${buildTime === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate */}
              {buildStep >= 3 && buildProtein && buildFlavor && buildTime && (
                <div>
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 mb-3 text-xs text-teal-800">
                    <span className="font-semibold">Your order: </span>{buildProtein} · {buildFlavor} · {buildTime}
                  </div>
                  <button onClick={cookBuildMyMeal}
                    className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors">
                    👨‍🍳 Build My Meal
                  </button>
                </div>
              )}

              {buildStep > 0 && (
                <button onClick={resetBuild} className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1">
                  ↺ Start over
                </button>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}