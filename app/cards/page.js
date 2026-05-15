'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Tag taxonomy — mirrors `app/secret/page.js`. Duplicated here so the
// filter pulldown can group the same way the Vault's does, without
// pulling in the whole Vault module. Same three labelled groups: 🍽 Meal,
// 🥩 Food Groups, ✨ Style — anything else a recipe carries is a
// "custom" tag and collapses to the single "✏️ Custom tags" option.
const TAG_GROUPS = [
  { label: 'Meal',        emoji: '🍽', tags: ['breakfast', 'lunch', 'dinner', 'dessert', 'side', 'snack'] },
  { label: 'Food Groups', emoji: '🥩', tags: ['chicken', 'beef', 'seafood', 'pasta', 'vegetarian'] },
  { label: 'Style',       emoji: '✨', tags: ['quick', 'comfort', 'healthy', 'baking', 'holiday'] },
  // Source — auto-stamped at save-to-Vault time on /videos and /playbook
  // (chef-jen / chef-tv). Mirrors /secret's TAG_GROUPS so the same group
  // shows in the Cards filter pulldown.
  { label: 'Source',      emoji: '🍳', tags: ['chef-jen', 'chef-tv'] },
]
const CURATED_TAGS = TAG_GROUPS.flatMap(g => g.tags)

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
  const [showSearch, setShowSearch] = useState(false)
  // Tag/favorites filter — mirrors the Vault's pulldown. Empty string =
  // "All recipes". Sentinel "__favorites__" = is_favorite. Sentinel
  // "__custom__" = any tag not in CURATED_TAGS. Anything else = exact
  // curated tag match.
  const [searchTag, setSearchTag] = useState('')
  const [addedToList, setAddedToList] = useState(new Set())
  const [familyNotes, setFamilyNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [toast, setToast] = useState(null)
  // Set of recipe ids that are currently in the user's Meal Plan
  // (`my_picks`). Loaded once at auth so we can render the inline
  // 📅 button on each card tile in the right state without opening
  // the card. Toggling updates this set optimistically.
  const [picksIds, setPicksIds] = useState(new Set())
  // Cook log — dated entries for the currently-viewing card. The
  // heritage feature: each row is one time the user cooked this recipe
  // (date stamp + handwritten notes). Reset to [] when a new card is
  // opened; loaded fresh from `recipe_cook_log` for the open card.
  const [cookLog, setCookLog] = useState([])
  // New-entry form state. `logDate` defaults to today (YYYY-MM-DD) so
  // tapping "Add entry" lands a current row; the user can backdate by
  // editing the date input.
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')
  const [savingLog, setSavingLog] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  // Default shopping store — when set, new shopping_list rows land
  // here instead of NULL/Unsorted. Loaded on mount; null means user
  // hasn't picked a default. Set via the 🏬 Manage Stores editor on
  // /shopping-list.
  const [defaultStoreId, setDefaultStoreId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      /* eslint-disable react-hooks/immutability -- hoisted function declarations are safe to call here */
      loadCards(session.user.id)
      loadPicks(session.user.id)
      loadDefaultStore(session.user.id)
      /* eslint-enable react-hooks/immutability */
    })
  }, [])

  async function loadDefaultStore(userId) {
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
    setDefaultStoreId(data?.id || null)
  }

  async function loadCards(userId) {
    const { data } = await supabase
      .from('recipe_cards')
      .select('recipe_id, personal_recipes(id, title, category, ingredients, instructions, photo_url, servings, tags, description, family_notes)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes((data || []).map(d => d.personal_recipes).filter(Boolean))
    setLoading(false)
  }

  // Pull the recipe ids currently in the user's Meal Plan so the inline
  // 📅 button on each card tile can render in the right state (filled
  // when present, outlined when absent). Light query — id only.
  async function loadPicks(userId) {
    const { data } = await supabase
      .from('my_picks')
      .select('recipe_id')
      .eq('user_id', userId)
    setPicksIds(new Set((data || []).map(r => r.recipe_id)))
  }

  // Toggle a recipe in/out of the Meal Plan without opening the card.
  // Mirrors the Recipe Vault detail-view's toggle behavior: tap once
  // to add (lands in 'top' bucket), tap again to remove. Optimistic UI
  // — picksIds updates immediately; toasts confirm. Used by the inline
  // tile button AND the detail-view header button so behavior is the
  // same everywhere.
  async function toggleMealPlan(recipe, e) {
    if (e) e.stopPropagation()
    if (!user || !recipe) return
    const inPlan = picksIds.has(recipe.id)
    if (inPlan) {
      setPicksIds(prev => { const n = new Set(prev); n.delete(recipe.id); return n })
      await supabase.from('my_picks').delete().eq('user_id', user.id).eq('recipe_id', recipe.id)
      showToast('Removed from Meal Plan')
    } else {
      setPicksIds(prev => new Set([...prev, recipe.id]))
      await supabase.from('my_picks').upsert({
        user_id: user.id,
        recipe_id: recipe.id,
        title: recipe.title,
        photo_url: recipe.photo_url || '',
        category: recipe.category || '',
        // New picks default to 'nice' (Maybe) so they don't crowd the
        // carefully-ordered ⭐ To Make list. Promote to To Make from
        // /meal-plan when actually ready to cook.
        bucket: 'nice'
      }, { onConflict: 'user_id,recipe_id' })
      showToast('Added to Maybe ✓')
    }
  }

  function openCard(recipe) {
    setViewing(recipe)
    setFamilyNotes(recipe.family_notes || '')
    setNotesSaved(false)
    setSuggestions(null)
    setAddedToList(new Set())
    // Reset the cook log form + load this card's history.
    setCookLog([])
    setShowLogForm(false)
    setLogDate(new Date().toISOString().slice(0, 10))
    setLogNotes('')
    if (user) loadCookLog(user.id, recipe.id)
  }

  // Pull the dated cook log entries for one (user, recipe). Newest first
  // (entry_date desc, then created_at desc as a tiebreaker for two
  // entries on the same day).
  async function loadCookLog(userId, recipeId) {
    const { data } = await supabase
      .from('recipe_cook_log')
      .select('id, entry_date, notes, created_at')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
    setCookLog(data || [])
  }

  // Save a new cook-log entry. Optimistic — we splice the new row in
  // by entry_date desc immediately, then INSERT and reconcile by id.
  // Empty notes are allowed; a date stamp alone is still a meaningful
  // record ("we cooked this on this day").
  async function addLogEntry() {
    if (!user || !viewing) return
    setSavingLog(true)
    // eslint-disable-next-line react-hooks/purity -- async event handler, not render
    const tempId = `tmp-${Date.now()}`
    const tempRow = {
      id: tempId,
      entry_date: logDate,
      notes: logNotes,
      created_at: new Date().toISOString(),
    }
    setCookLog(prev => {
      const merged = [tempRow, ...prev]
      merged.sort((a, b) => {
        if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1
        return a.created_at < b.created_at ? 1 : -1
      })
      return merged
    })
    const { data, error } = await supabase
      .from('recipe_cook_log')
      .insert({
        user_id: user.id,
        recipe_id: viewing.id,
        entry_date: logDate,
        notes: logNotes,
      })
      .select()
      .single()
    if (error || !data) {
      // Roll back optimistic insert on failure.
      setCookLog(prev => prev.filter(r => r.id !== tempId))
      showToast('Could not save entry')
    } else {
      setCookLog(prev => prev.map(r => r.id === tempId ? data : r))
      showToast('Entry saved ✓')
    }
    setLogNotes('')
    setLogDate(new Date().toISOString().slice(0, 10))
    setShowLogForm(false)
    setSavingLog(false)
  }

  async function deleteLogEntry(entryId) {
    if (!user) return
    setCookLog(prev => prev.filter(r => r.id !== entryId))
    await supabase
      .from('recipe_cook_log')
      .delete()
      .eq('user_id', user.id)
      .eq('id', entryId)
    showToast('Entry removed')
  }

  // Friendly date formatter for the cook log header. "March 15, 2026"
  // reads warmer than "3/15/26" or "2026-03-15"; matches the heritage
  // feel without being too fussy. Falls back to the raw ISO date if
  // anything goes sideways.
  function formatLogDate(iso) {
    if (!iso) return ''
    try {
      // Date-only strings like "2026-03-15" parse as UTC midnight in
      // some browsers, which can shift to the previous day in earlier
      // timezones. Force-parse as local by appending a noon offset.
      const d = new Date(`${iso}T12:00:00`)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }

  async function saveNotes() {
    if (!viewing) return
    setSavingNotes(true)
    await supabase.from('personal_recipes').update({ family_notes: familyNotes }).eq('id', viewing.id)
    setRecipes(prev => prev.map(r => r.id === viewing.id ? { ...r, family_notes: familyNotes } : r))
    setSavingNotes(false)
    setNotesSaved(true)
    showToast('Origin saved ✓')
    setTimeout(() => setNotesSaved(false), 2000)
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

  // Toggle a single ingredient — matches the Recipe Vault pattern: + adds, ✓ removes.
  async function toggleIngredient(ing) {
    if (!user || !viewing) return
    const ingredient = [ing.measure, ing.name].filter(Boolean).join(' ') || String(ing)
    const key = ingredient.toLowerCase()
    if (addedToList.has(key)) {
      await supabase.from('shopping_list').delete().eq('user_id', user.id).eq('ingredient', ingredient)
      setAddedToList(prev => { const n = new Set(prev); n.delete(key); return n })
      showToast('Removed from Shopping List')
    } else {
      await supabase.from('shopping_list').insert({ user_id: user.id, ingredient, recipe_title: viewing.title || '', checked: false, store_id: defaultStoreId || null })
      setAddedToList(prev => new Set([...prev, key]))
      showToast('Added to Shopping List')
    }
  }

  async function addAllToShoppingList() {
    if (!user || !viewing) return
    const ings = viewing.ingredients || []
    if (!ings.length) return
    const rows = ings.map(ing => ({
      user_id: user.id,
      ingredient: [ing.measure, ing.name].filter(Boolean).join(' ') || String(ing),
      recipe_title: viewing.title || '',
      checked: false,
      store_id: defaultStoreId || null,
    }))
    await supabase.from('shopping_list').insert(rows)
    setAddedToList(new Set(rows.map(r => r.ingredient.toLowerCase())))
    showToast(`Added ${rows.length} ingredient${rows.length === 1 ? '' : 's'} to Shopping List`)
  }

  async function removeCard(recipeId) {
    await supabase.from('recipe_cards').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
    setViewing(null)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Available tags across all cards — drives which optgroup options
  // actually render in the filter pulldown (empty groups vanish).
  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))]
  const favoritesCount = recipes.filter(r => r.is_favorite).length

  const filtered = recipes.filter(r => {
    // Text search (title contains)
    if (search !== '' && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    // Tag/favorites filter
    if (searchTag === '') return true
    if (searchTag === '__favorites__') return !!r.is_favorite
    if (searchTag === '__custom__') {
      return (r.tags || []).some(t => !CURATED_TAGS.includes(t))
    }
    return (r.tags || []).includes(searchTag)
  })

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
              {/* Meal Plan toggle — fill orange when the recipe is in
                  the plan so the user can tap once to remove it again.
                  Same picksIds set as the inline tile button. */}
              <button
                onClick={() => toggleMealPlan(viewing)}
                title={picksIds.has(viewing.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                className={`text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors ${
                  picksIds.has(viewing.id)
                    ? 'bg-orange-600 text-white border border-orange-600 hover:bg-orange-700'
                    : 'text-orange-600 border border-orange-200 hover:bg-orange-50'
                }`}
              >
                {picksIds.has(viewing.id) ? '📅 In Meal Plan' : '📅 Meal Plan'}
              </button>
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
                <img loading="lazy" decoding="async" src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
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

            {/* Ingredients — per-item +/✓ toggles (matches Recipe Vault). */}
            <div className="px-5 pb-5">
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingredients</p>
                  {ingredients.length > 0 && (
                    <button
                      onClick={addAllToShoppingList}
                      className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-50"
                    >
                      🛒 Add All
                    </button>
                  )}
                </div>
                {ingredients.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No ingredients listed</p>
                ) : (
                  <ul>
                    {ingredients.map((ing, i) => {
                      const key = [ing.measure, ing.name].filter(Boolean).join(' ').toLowerCase()
                      return (
                        <li key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-orange-400 shrink-0" style={{fontSize:'12px'}}>•</span>
                          <span className="flex-1 text-sm text-gray-700">
                            {ing.measure && <span className="font-semibold text-gray-900">{ing.measure} </span>}
                            {ing.name}
                          </span>
                          <button
                            onClick={() => toggleIngredient(ing)}
                            title={addedToList.has(key) ? 'Remove from Shopping List' : 'Add to Shopping List'}
                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${addedToList.has(key) ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                          >
                            {addedToList.has(key) ? '✓' : '+'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Origin — "the story" of the card. Where it came from,
              who in the family makes it best, the memory attached to
              it. One-time write that anchors the card. Family Notes
              (below) is the running, dated history; Origin is the
              introduction. */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📜</span>
              <h2 className="text-sm font-bold text-gray-900">Origin</h2>
              <span className="text-xs text-amber-600 italic">— where it came from</span>
            </div>
            <textarea
              value={familyNotes}
              onChange={e => setFamilyNotes(e.target.value)}
              placeholder={`"Grandma's recipe — she got it from her sister"\n"Sunday dinner growing up"\n"The one we always make for birthdays"`}
              rows={4}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
            />
            <button onClick={saveNotes} disabled={savingNotes}
              className={`mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${notesSaved ? 'bg-green-100 text-green-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
              {savingNotes ? 'Saving...' : notesSaved ? '✓ Saved' : 'Save Origin'}
            </button>
          </div>

          {/* Family Notes — the heritage feature. Real recipe boxes
              accumulate dated entries: each cook adds a line ("3/15/26
              — Made for Tom's birthday. Added cayenne, hit."). Each
              entry renders in the Caveat handwriting font over a faint
              ruled background so the section reads like a card that's
              been written on across years. (Section was called "Cook
              Log" briefly; renamed to Family Notes May 2026 to put the
              heritage label on the actual heritage surface.) */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-5 relative overflow-hidden">
            {/* Subtle horizontal rule lines for the index-card feel */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.18]"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, #d6d3d1 27px, #d6d3d1 28px)',
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h2 className="text-sm font-bold text-stone-900">Family Notes</h2>
                  <span className="text-xs text-stone-500 italic">— each time you make it</span>
                </div>
                {!showLogForm && (
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="text-xs font-semibold text-orange-700 border border-orange-300 bg-white rounded-lg px-2.5 py-1 hover:bg-orange-50"
                  >
                    + Add entry
                  </button>
                )}
              </div>

              {/* Add-entry form — date picker + freeform notes. Reveals
                  on tap so the section starts compact. Notes textarea
                  uses the handwriting font so the user feels like
                  they're writing on a card, not filling out a form. */}
              {showLogForm && (
                <div className="bg-white/80 border border-stone-200 rounded-xl p-3 mb-4 backdrop-blur-sm">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">Date cooked</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2"
                    style={{ fontSize: '16px' }}
                  />
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">What happened</label>
                  <textarea
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder={`"Made for Tom's birthday — added cayenne, big hit"\n"Doubled the garlic. Better."\n"Out of buttermilk; used yogurt + milk"`}
                    rows={3}
                    style={{ fontFamily: 'var(--font-caveat)', fontSize: '24px', lineHeight: '32px' }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={addLogEntry}
                      disabled={savingLog}
                      className="flex-1 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
                    >
                      {savingLog ? 'Saving…' : 'Save entry'}
                    </button>
                    <button
                      onClick={() => {
                        setShowLogForm(false)
                        setLogNotes('')
                        setLogDate(new Date().toISOString().slice(0, 10))
                      }}
                      className="px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-600 text-sm font-semibold hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Entry list. Empty state nudges toward the ritual. */}
              {cookLog.length === 0 ? (
                <p className="text-sm text-stone-500 italic leading-relaxed">
                  No entries yet. The next time you make this — even a quick line — adds it here. A card that gets written on becomes a card worth keeping.
                </p>
              ) : (
                <ul className="space-y-3">
                  {cookLog.map(entry => (
                    <li key={entry.id} className="group relative">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          {formatLogDate(entry.entry_date)}
                        </span>
                        <button
                          onClick={() => deleteLogEntry(entry.id)}
                          title="Remove this entry"
                          className="text-stone-300 hover:text-red-400 text-base leading-none px-1"
                        >
                          ×
                        </button>
                      </div>
                      <p
                        className="text-stone-800 whitespace-pre-wrap leading-snug"
                        style={{ fontFamily: 'var(--font-caveat)', fontSize: '24px', lineHeight: '32px' }}
                      >
                        {entry.notes || <span className="text-stone-400 italic" style={{ fontFamily: 'inherit' }}>(no notes — just cooked)</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Chef Jen Suggestions — was "AI Suggestions" / "AI-powered". */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <h2 className="text-sm font-bold text-gray-900">Chef Jen&rsquo;s Tips</h2>
              <span className="text-xs text-purple-600">picked just for this card</span>
            </div>
            {!suggestions && !loadingSuggestions && (
              <button onClick={getSuggestions}
                className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                ✨ Ask Chef Jen for tips
              </button>
            )}
            {loadingSuggestions && (
              <div className="text-center py-4 text-gray-500 text-sm">Hold on, thinking on this one&hellip;</div>
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
                  ↺ Want a different take? Try again.
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
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-3">
          {/* Row 1: ← Back left, title centered, invisible spacer right —
              keeps "🃏 Recipe Cards" prominent at the visual top, mirrors
              the Vault header rhythm so the two recipe surfaces feel like
              one app. */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-500 hover:text-gray-600 shrink-0">← Back</button>
            <h1 className="text-xl font-bold text-gray-900 flex-1 text-center">🃏 Recipe Cards</h1>
            <span className="w-12 shrink-0" aria-hidden="true" />
          </div>
          {/* Row 2: filter pulldown on the left (All / ❤️ Favorites / tag
              groups / Custom), action cluster on the right (🔍 + Add).
              Mirrors Vault — native <select> on mobile gives a clean
              full-screen picker for free. Color shifts (gray → orange →
              rose) keep the active filter visible after scroll. */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <select
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
              style={{ fontSize: '16px' }}
              className={`flex-1 min-w-0 border-2 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                searchTag === '__favorites__'
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : searchTag
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-white border-gray-200 text-gray-600'
              }`}
              title="Filter cards"
            >
              <option value="">All recipes</option>
              {favoritesCount > 0 && (
                <option value="__favorites__">❤️ Favorites</option>
              )}
              {TAG_GROUPS.map(group => {
                const usedInGroup = group.tags.filter(t => allTags.includes(t))
                if (usedInGroup.length === 0) return null
                return (
                  <optgroup key={group.label} label={`${group.emoji} ${group.label}`}>
                    {usedInGroup.map(tag => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </optgroup>
                )
              })}
              {/* Custom tags — list each non-curated tag individually
                  (was collapsed to a sentinel "Custom tags" option;
                  May 2026: Bill wanted to filter to specific custom tags). */}
              {(() => {
                const customTags = allTags.filter(t => !CURATED_TAGS.includes(t)).sort()
                if (customTags.length === 0) return null
                return (
                  <optgroup label="✏️ Custom">
                    {customTags.map(tag => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </optgroup>
                )
              })()}
            </select>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => {
                  if (showSearch || search) {
                    setSearch('')
                    setShowSearch(false)
                  } else {
                    setShowSearch(true)
                  }
                }}
                title={(showSearch || search) ? 'Close search' : 'Search by name'}
                className={`text-base font-semibold border rounded-lg px-2.5 py-1.5 ${
                  (showSearch || search)
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'text-gray-500 border-gray-200'
                }`}
              >
                {(showSearch || search) ? '✕' : '🔍'}
              </button>
              <a href="/secret" className="text-sm font-semibold text-orange-600 border-2 border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">+ Add</a>
            </div>
          </div>
          {(showSearch || search) && (
            <input type="text" placeholder="Search your cards..."
              autoFocus
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '16px' }}
              className="w-full border-2 border-orange-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 mt-2 mb-1" />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 pb-6">
        {/* Intro banner (May 2026) — the recipe-box "lid" is now a real
            illustrated card: pink/cream gradient, watercolor strawberries
            with blossoms, dotted border, and a script "Recipe" already
            baked into the top-left corner. The heritage tagline overlays
            the empty pink space so the visual hierarchy reads:
            illustrated card frame → handwritten tagline → lineage line.
            Replaces the cream-paper text-only frame that came before;
            the illustrated card lands the box metaphor faster than any
            framed copy block could. */}
        <div className="relative mx-auto max-w-md mb-5 rounded-2xl overflow-hidden shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/recipe-card-banner.png"
            alt=""
            className="w-full h-auto block"
            width={1250}
            height={360}
          />
          {/* Tagline overlay — centered vertically inside the card.
              The image is now cropped to 3.5:1 (240px of top content
              with the script + strawberries, joined to 120px of bottom
              dotted border with the empty middle gradient removed). With
              the empty space pulled out, the tagline lands center-center
              with no asymmetric padding. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p
              className="text-gray-900 leading-none mb-1"
              style={{ fontFamily: 'var(--font-caveat)', fontSize: 'clamp(22px, 5.5vw, 30px)', fontWeight: 600 }}
            >
              Your modern recipe box.
            </p>
            <p className="text-[11px] sm:text-sm text-gray-700 leading-snug">
              Your <span className="font-semibold text-rose-700">keep-forever</span> recipes
            </p>
            <p className="text-[11px] sm:text-sm text-gray-700 leading-snug italic">
              Grandmother&rsquo;s, mom&rsquo;s, aunt&rsquo;s, yours.
            </p>
          </div>
        </div>

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
            {/* Recipe-card grid (May 2026 heritage refresh — Bill's ask).
                Pulled away from the Vault Grid's index-card look so
                Cards feel like the heirloom recipe-box object, not a
                second cookbook view. Visual cues borrowed from real
                recipe-card stationery: rose-cream paper, red dashed
                accent rules, cursive script title (Caveat font, loaded
                app-wide), and a small botanical glyph for warmth. The
                tap-to-open header + 📅 Meal Plan toggle stay where
                they were. */}
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(recipe => {
                const inPlan = picksIds.has(recipe.id)
                return (
                  <div key={recipe.id}
                    className="relative bg-rose-50 border-2 border-rose-200 rounded-2xl overflow-hidden hover:border-rose-400 hover:shadow-md transition-all shadow-sm flex flex-col">
                    {/* Decorative botanical glyph in the top-right —
                        balances the "Recipe" cursive flourish on the
                        left so the header reads symmetrically (Bill's
                        ask, May 2026). Slight rotation + soft opacity
                        so it reads as ornament, not a button. */}
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-2 text-2xl pointer-events-none select-none opacity-80"
                    >
                      🍴
                    </span>
                    {/* Red dashed top rule — three thin stacked lines
                        give the printed-stationery border feel that a
                        single solid bar can't. Pure decoration. */}
                    <div className="border-t-2 border-dashed border-red-400 mt-1.5" />
                    <button
                      onClick={() => openCard(recipe)}
                      className="text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="px-3 pt-2 pb-1">
                        {/* "Recipe" flourish in cursive — the recipe-card
                            stationery hallmark. Caveat font already
                            loaded for /cards Family Notes. Sized to read
                            as a calligraphic header, not a tiny eyebrow. */}
                        <p
                          className="text-red-600 leading-none -mb-1"
                          style={{ fontFamily: 'var(--font-caveat)', fontSize: '22px', fontWeight: 600 }}
                        >
                          Recipe
                        </p>
                        <p className="font-bold text-xs text-gray-900 leading-snug line-clamp-2 min-h-[2rem] mt-1">{recipe.title}</p>
                      </div>
                      <div className="px-3 pb-2">
                        {recipe.photo_url ? (
                          <div style={{height:'88px'}} className="rounded-xl overflow-hidden border border-rose-200">
                            <img loading="lazy" decoding="async" src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div style={{height:'88px'}} className="rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                            <span style={{fontSize:'28px'}}>🍓</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="px-2 pb-2 mt-auto">
                      <button
                        onClick={(e) => toggleMealPlan(recipe, e)}
                        title={inPlan ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                        className={`w-full text-[11px] font-semibold rounded-md py-1 border transition-colors ${
                          inPlan
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {inPlan ? 'In Meal Plan' : 'Meal Plan'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}