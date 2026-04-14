'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function CardsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [search, setSearch] = useState('')
  const [familyNotes, setFamilyNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [cardPhoto, setCardPhoto] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [toast, setToast] = useState(null)
  const photoInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadCards(session.user.id)
    })
  }, [])

  async function loadCards(userId) {
    const { data } = await supabase
      .from('recipe_cards')
      .select('recipe_id, personal_recipes(id, title, category, ingredients, instructions, photo_url, servings, tags, description, family_notes)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes((data || []).map(d => d.personal_recipes).filter(Boolean))
    setLoading(false)
  }

  async function loadCardPhoto(recipeId) {
    const { data } = await supabase
      .from('card_photos')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setCardPhoto(data || null)
  }

  function openCard(recipe) {
    setViewing(recipe)
    setFamilyNotes(recipe.family_notes || '')
    setNotesSaved(false)
    setSuggestions(null)
    setCardPhoto(null)
    loadCardPhoto(recipe.id)
  }

  async function saveNotes() {
    if (!viewing) return
    setSavingNotes(true)
    await supabase.from('personal_recipes').update({ family_notes: familyNotes }).eq('id', viewing.id)
    setRecipes(prev => prev.map(r => r.id === viewing.id ? { ...r, family_notes: familyNotes } : r))
    setSavingNotes(false)
    setNotesSaved(true)
    showToast('Notes saved ✓')
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function uploadCardPhoto(file) {
    if (!file || !user) return
    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `card-photos/${user.id}/${viewing.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('personal_recipes')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/personal_recipes/${path}`

      // Delete old photo if exists
      if (cardPhoto) {
        await supabase.from('card_photos').delete().eq('id', cardPhoto.id)
      }
      const { data } = await supabase.from('card_photos').insert({
        user_id: user.id,
        recipe_id: viewing.id,
        photo_url: publicUrl
      }).select().single()
      setCardPhoto(data)
      showToast('Photo saved ✓')
    } catch (err) {
      showToast('Photo upload failed')
    }
    setUploadingPhoto(false)
  }

  async function getSuggestions() {
    if (!viewing) return
    setLoadingSuggestions(true)
    setSuggestions(null)
    try {
      const res = await fetch('/api/chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Give me 5 practical suggestions for this recipe: "${viewing.title}". Include: an ingredient swap, a healthier version tip, what to serve it with, how to store leftovers, and a flavor upgrade. Keep each suggestion to 1-2 sentences. Format as JSON array: [{"type":"Ingredient Swap","tip":"..."},{"type":"Healthier Version","tip":"..."},{"type":"Serve With","tip":"..."},{"type":"Storage","tip":"..."},{"type":"Flavor Upgrade","tip":"..."}]`
          }]
        })
      })
      const data = await res.json()
      const text = data.reply || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setSuggestions(parsed)
    } catch {
      setSuggestions([{ type: 'Suggestion', tip: 'Could not load suggestions right now. Try again.' }])
    }
    setLoadingSuggestions(false)
  }

  async function removeCard(recipeId) {
    await supabase.from('recipe_cards').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
    setViewing(null)
  }

  async function clearAll() {
    await supabase.from('recipe_cards').delete().eq('user_id', user.id)
    setRecipes([])
    setViewing(null)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = recipes.filter(r => search === '' || r.title.toLowerCase().includes(search.toLowerCase()))

  // ── CARD DETAIL VIEW ──
  if (viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)

    return (
      <div className="min-h-screen bg-white">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
        )}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setViewing(null)} className="text-sm text-gray-500 hover:text-gray-600">← Cards</button>
            <div className="flex gap-2">
              <button onClick={() => removeCard(viewing.id)} className="text-xs font-semibold text-red-400 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">Remove Card</button>
              <button onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return
                await supabase.from('my_picks').upsert({ user_id: session.user.id, recipe_id: viewing.id, title: viewing.title, photo_url: viewing.photo_url || '', category: viewing.category || '', bucket: 'top' }, { onConflict: 'user_id,recipe_id' })
                alert('Added to MyPicks! ✓')
              }} className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">🎯 MyPicks</button>
              <a href={`/secret?recipe=${viewing.id}`} className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">Full Recipe →</a>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 pb-16">
          {/* Card header */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-5">
            <div className="bg-orange-700 px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold truncate" style={{fontSize:'15px'}}>{viewing.title}</span>
              <span style={{fontSize:'16px'}}>🃏</span>
            </div>

            {/* Recipe photo */}
            {viewing.photo_url && (
              <div style={{height:'180px'}} className="overflow-hidden">
                <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="px-5 pt-4 pb-2">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{viewing.title}</h1>
              <div className="flex gap-2 flex-wrap">
                {viewing.category && <span className="text-xs text-gray-500">{viewing.category}</span>}
                {viewing.servings && <span className="text-xs text-gray-500">· {viewing.servings} servings</span>}
                {(viewing.tags || []).slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-orange-500">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="px-5 pb-5">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ingredients</p>
                {ingredients.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No ingredients listed</p>
                ) : (
                  <ul>
                    {ingredients.map((ing, i) => (
                      <li key={i} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-orange-400 shrink-0 mt-0.5" style={{fontSize:'12px'}}>•</span>
                        <span className="text-sm text-gray-700">
                          {ing.measure && <span className="font-semibold text-gray-900">{ing.measure} </span>}
                          {ing.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Family Notes */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold text-gray-900">Family Notes</h2>
              <span className="text-xs text-amber-600 italic">— the soul of the card</span>
            </div>
            <textarea
              value={familyNotes}
              onChange={e => setFamilyNotes(e.target.value)}
              placeholder={`"Use less salt next time"\n"Kids loved this"\n"Grandma's version used fresh basil"\n"This was our Sunday dinner in 1998"`}
              rows={5}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
            />
            <button onClick={saveNotes} disabled={savingNotes}
              className={`mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${notesSaved ? 'bg-green-100 text-green-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
              {savingNotes ? 'Saving...' : notesSaved ? '✓ Saved' : 'Save Notes'}
            </button>
          </div>

          {/* My Photo */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📷</span>
              <h2 className="text-sm font-bold text-gray-900">My Photo</h2>
              <span className="text-xs text-gray-500">— your version of the dish</span>
            </div>
            {cardPhoto ? (
              <div className="relative rounded-xl overflow-hidden mb-3" style={{height:'200px'}}>
                <img src={cardPhoto.photo_url} alt="My version" className="w-full h-full object-cover" />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
                  Replace
                </button>
              </div>
            ) : (
              <button onClick={() => photoInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-colors mb-3">
                <span className="text-3xl">📷</span>
                <span className="text-sm text-gray-500 font-semibold">Add your photo</span>
                <span className="text-xs text-gray-500">Your cooked version, holiday edition, or kids helping!</span>
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadCardPhoto(e.target.files[0])} />
            {uploadingPhoto && <p className="text-xs text-center text-gray-500">Uploading...</p>}
          </div>

          {/* AI Suggestions */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <h2 className="text-sm font-bold text-gray-900">Chef Suggestions</h2>
              <span className="text-xs text-purple-600">AI-powered</span>
            </div>
            {!suggestions && !loadingSuggestions && (
              <button onClick={getSuggestions}
                className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                ✨ Get Smart Suggestions
              </button>
            )}
            {loadingSuggestions && (
              <div className="text-center py-4 text-gray-500 text-sm">Your chef is thinking...</div>
            )}
            {suggestions && (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="bg-white border border-purple-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-purple-600 mb-1">{s.type}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{s.tip}</p>
                  </div>
                ))}
                <button onClick={getSuggestions}
                  className="w-full py-2 text-xs text-purple-600 font-semibold hover:text-purple-800">
                  ↺ Get new suggestions
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <a href={`/secret?recipe=${viewing.id}`} className="text-sm text-orange-600 font-semibold">View full recipe in MyRecipeVault →</a>
          </div>
        </main>
      </div>
    )
  }

  // ── CARDS LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🃏 MyRecipe Cards</h1>
              {recipes.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{recipes.length}</span>}
            </div>
            <div className="flex gap-2">
              {recipes.length > 0 && (
                <button onClick={clearAll} className="text-xs font-semibold text-red-400 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">Clear All</button>
              )}
              <a href="/secret" className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">+ Add</a>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">Your kitchen memory — family notes, photos, and AI tips for every recipe.</p>
          <input type="text" placeholder="Search your cards..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your cards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🃏</p>
            <p className="text-gray-700 font-semibold mb-2">No cards yet</p>
            <p className="text-gray-500 text-sm mb-6">Open any recipe in MyRecipeVault and tap 🃏 Cards to add it here</p>
            <a href="/secret" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">Go to MyRecipeVault</a>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{filtered.length} {filtered.length === 1 ? 'card' : 'cards'}</p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(recipe => (
                <button key={recipe.id} onClick={() => openCard(recipe)}
                  className="text-left bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 hover:shadow-md transition-all active:scale-95">
                  <div className="bg-orange-700 px-3 py-2.5">
                    <p className="text-white font-bold text-xs leading-tight line-clamp-2">{recipe.title}</p>
                  </div>
                  <div className="p-3">
                    {recipe.photo_url ? (
                      <div style={{height:'90px'}} className="rounded-xl overflow-hidden mb-2">
                        <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div style={{height:'90px'}} className="rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-2">
                        <span style={{fontSize:'28px'}}>🍽️</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{recipe.category || 'Recipe'}{recipe.servings ? ` · ${recipe.servings} servings` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(recipe.ingredients || []).length} ingredients</p>
                    {recipe.family_notes && <p className="text-xs text-amber-600 mt-0.5">📝 Notes</p>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}