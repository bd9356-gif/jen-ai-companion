'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BUCKETS = [
  { key: 'top',   label: 'To Make', emoji: '⭐', micro: 'Your main focus for now.',      bg: 'bg-amber-100',  border: 'border-2 border-amber-400'  },
  { key: 'nice',  label: 'Maybe',   emoji: '📋', micro: 'If you get to them.',            bg: 'bg-violet-100', border: 'border-2 border-violet-400' },
  { key: 'later', label: 'Later',   emoji: '🗂',  micro: 'Still saved, not forgotten.',   bg: 'bg-sky-100',    border: 'border-2 border-sky-400'    },
]

const DEFAULT_SHOW = 5

export default function MyPlanPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  // Default: every tab collapsed (closed) on open
  const [collapsed, setCollapsed] = useState({
    meal_plan: true,
    shopping_list: true,
    ai_notes: true,
    chefjen: true,
    chef_videos: true,
  })
  const [showMore, setShowMore] = useState({})

  // Meal Plan
  const [picks, setPicks] = useState([])
  // Shopping List
  const [shoppingList, setShoppingList] = useState([])
  // Stores (grocery store grouping for shopping list)
  const [stores, setStores] = useState([])
  const [showStoreEditor, setShowStoreEditor] = useState(false)
  const [cleaningList, setCleaningList] = useState(false)
  // AI Notes + ChefJen
  const [aiNotes, setAiNotes] = useState([])
  const [chefJen, setChefJen] = useState([])
  // Videos
  const [chefVideos, setChefVideos] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadAll(session.user.id)
    })
  }, [])

  async function loadAll(userId) {
    await Promise.all([
      loadPicks(userId),
      loadShoppingList(userId),
      loadStores(userId),
      loadFavorites(userId),
      loadVideos(userId),
    ])
    setLoading(false)
  }

  async function loadStores(userId) {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setStores(data || [])
  }

  async function addStore({ name, emoji, website_url }) {
    if (!user || !name.trim()) return
    const nextOrder = stores.length
    const { data, error } = await supabase.from('stores').insert({
      user_id: user.id,
      name: name.trim(),
      emoji: emoji || '🛒',
      website_url: website_url || '',
      sort_order: nextOrder,
    }).select().single()
    if (error) { showToast('Could not add store'); return }
    setStores(prev => [...prev, data])
  }

  async function updateStore(id, updates) {
    await supabase.from('stores').update(updates).eq('id', id)
    setStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  async function removeStore(id) {
    if (!confirm('Remove this store? Items assigned to it will move to Unsorted.')) return
    await supabase.from('stores').delete().eq('id', id)
    setStores(prev => prev.filter(s => s.id !== id))
    // In-memory, items whose store_id matches fall back to "Unsorted"
    setShoppingList(prev => prev.map(i => i.store_id === id ? { ...i, store_id: null } : i))
  }

  async function setItemStore(itemId, storeId) {
    await supabase.from('shopping_list').update({ store_id: storeId }).eq('id', itemId)
    setShoppingList(prev => prev.map(i => i.id === itemId ? { ...i, store_id: storeId } : i))
  }

  async function loadPicks(userId) {
    const { data } = await supabase
      .from('my_picks')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setPicks(data || [])
  }

  async function loadShoppingList(userId) {
    const { data } = await supabase.from('shopping_list').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setShoppingList(data || [])
  }

  async function loadFavorites(userId) {
    const { data } = await supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['ai_answer', 'ai_recipe']).order('created_at', { ascending: false })
    setAiNotes((data || []).filter(i => i.type === 'ai_answer'))
    setChefJen((data || []).filter(i => i.type === 'ai_recipe'))
  }

  async function loadVideos(userId) {
    // Legacy path — saved_videos / saved_education_videos tables
    const [{ data: sv1 }, { data: sv2 }, { data: favVids }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      // New path — Chef TV page saves directly to `favorites` with video types
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['video_recipe', 'video_education']),
    ])
    const cookingIds = (sv1 || []).map(s => s.video_id)
    const educationIds = (sv2 || []).map(s => s.video_id)
    const [{ data: cv }, { data: ev }] = await Promise.all([
      cookingIds.length ? supabase.from('cooking_videos').select('*').in('id', cookingIds) : { data: [] },
      educationIds.length ? supabase.from('education_videos').select('*').in('id', educationIds) : { data: [] },
    ])
    const legacyVideos = [
      ...(cv || []).map(v => ({ ...v, _source: 'cooking' })),
      ...(ev || []).map(v => ({ ...v, _source: 'education' })),
    ]
    // Normalize favorites-based saves to the same shape used by the VideoItem component
    const favoriteVideos = (favVids || []).map(fav => ({
      id: fav.ref_id,
      youtube_id: fav.metadata?.youtube_id || '',
      title: fav.title || '',
      channel: fav.metadata?.channel || '',
      duration: fav.metadata?.duration || '',
      _source: fav.type === 'video_education' ? 'education' : 'cooking',
      _favoriteId: fav.id, // remember so we can delete from favorites on remove
    }))
    // Dedupe — if the same video was saved both ways, prefer the legacy record so removeVideo keeps working
    const existingIds = new Set(legacyVideos.map(v => String(v.id)))
    const favOnly = favoriteVideos.filter(v => !existingIds.has(String(v.id)))
    setChefVideos([...legacyVideos, ...favOnly])
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }
  function toggleCollapse(key) { setCollapsed(prev => ({ ...prev, [key]: !prev[key] })) }

  // Picks actions
  async function moveTo(pick, bucket) {
    await supabase.from('my_picks').update({ bucket }).eq('id', pick.id)
    setPicks(prev => prev.map(p => p.id === pick.id ? { ...p, bucket } : p))
    showToast(`Moved to ${BUCKETS.find(b => b.key === bucket)?.label} ✓`)
  }
  async function removePick(id) {
    await supabase.from('my_picks').delete().eq('id', id)
    setPicks(prev => prev.filter(p => p.id !== id))
    showToast('Removed')
  }

  // Shopping list actions
  async function toggleShoppingItem(item) {
    await supabase.from('shopping_list').update({ checked: !item.checked }).eq('id', item.id)
    setShoppingList(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }
  async function removeShoppingItem(id) {
    await supabase.from('shopping_list').delete().eq('id', id)
    setShoppingList(prev => prev.filter(i => i.id !== id))
  }
  async function clearShoppingList() {
    await supabase.from('shopping_list').delete().eq('user_id', user.id)
    setShoppingList([])
    showToast('Shopping list cleared')
  }

  // Build a plain-text version of the shopping list, grouped by store in the
  // same order the UI shows them. Used for both Copy-to-clipboard and Print.
  function buildShoppingListText() {
    if (!shoppingList.length) return ''
    const groups = new Map()
    for (const item of shoppingList) {
      const key = item.store_id || '__unsorted__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    const storeById = Object.fromEntries(stores.map(s => [s.id, s]))
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === '__unsorted__') return 1
      if (b === '__unsorted__') return -1
      const sa = storeById[a]?.sort_order ?? 0
      const sb = storeById[b]?.sort_order ?? 0
      return sa - sb
    })
    const lines = ['Shopping List', '']
    for (const key of sortedKeys) {
      const header = key === '__unsorted__'
        ? '📦 Unsorted'
        : `${storeById[key]?.emoji || '🏪'} ${storeById[key]?.name || 'Store'}`
      lines.push(header)
      for (const item of groups.get(key)) {
        const prefix = item.checked ? '[x]' : '[ ]'
        lines.push(`${prefix} ${item.ingredient}`)
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  }

  async function copyShoppingList() {
    const text = buildShoppingListText()
    if (!text) { showToast('Nothing to copy'); return }
    try {
      await navigator.clipboard.writeText(text)
      showToast('Shopping list copied to clipboard ✓')
    } catch {
      showToast('Copy failed — try Print instead')
    }
  }

  function printShoppingList() {
    const text = buildShoppingListText()
    if (!text) { showToast('Nothing to print'); return }
    const w = window.open('', '_blank', 'width=520,height=720')
    if (!w) { showToast('Pop-up blocked — allow pop-ups to print'); return }
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    w.document.write(`<!doctype html><html><head><title>Shopping List</title><style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; padding: 24px; color: #111; max-width: 520px; margin: 0 auto; }
      pre { font-family: inherit; white-space: pre-wrap; font-size: 14px; line-height: 1.7; margin: 0; }
      @media print { body { padding: 0; max-width: none; } }
    </style></head><body><pre>${escaped}</pre>
    <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 200); });</script>
    </body></html>`)
    w.document.close()
  }

  // AI cleanup — sends the current list to Claude, gets back a cleaned /
  // deduped / shoppable version, then replaces the list in Supabase.
  async function cleanUpList() {
    if (!user || shoppingList.length === 0 || cleaningList) return
    if (!confirm('Clean up the whole list with AI? This will replace the current items with a cleaned, deduped version.')) return
    setCleaningList(true)
    try {
      const res = await fetch('/api/cleanup-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: shoppingList.map(i => ({ id: i.id, ingredient: i.ingredient, store_id: i.store_id || null })),
          stores: stores.map(s => ({ id: s.id, name: s.name })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.items)) {
        showToast(data?.error || 'Cleanup failed')
        return
      }
      if (data.items.length === 0) {
        showToast('Cleanup returned no items')
        return
      }
      // Replace: delete all current rows, insert cleaned ones.
      const { error: delErr } = await supabase.from('shopping_list').delete().eq('user_id', user.id)
      if (delErr) { showToast('Could not clear existing list'); return }
      const rows = data.items.map(it => ({
        user_id: user.id,
        ingredient: it.ingredient,
        recipe_title: '',
        store_id: it.store_id || null,
      }))
      const { data: inserted, error: insErr } = await supabase.from('shopping_list').insert(rows).select()
      if (insErr) { showToast('Could not save cleaned list'); return }
      setShoppingList(inserted || [])
      showToast(`Cleaned ✨ — ${data.items.length} item${data.items.length === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Cleanup failed: ' + err.message)
    } finally {
      setCleaningList(false)
    }
  }

  // Favorites actions
  async function removeFavorite(item) {
    await supabase.from('favorites').delete().eq('id', item.id)
    if (item.type === 'ai_answer') setAiNotes(prev => prev.filter(i => i.id !== item.id))
    if (item.type === 'ai_recipe') setChefJen(prev => prev.filter(i => i.id !== item.id))
    showToast('Removed')
  }

  // Save a Chef Jennifer recipe to the permanent Recipe Vault (personal_recipes)
  async function saveChefJenToVault(item) {
    if (!user) return
    const meta = item.metadata || {}
    // Normalize ingredients: keep {name, measure} shape expected by the Vault
    const ingredients = Array.isArray(meta.ingredients)
      ? meta.ingredients.map(ing => typeof ing === 'string'
          ? { name: ing, measure: '' }
          : { name: ing?.name || '', measure: ing?.measure || '' })
      : []
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: item.title,
      description: meta.description || '',
      ingredients,
      instructions: meta.instructions || '',
      category: meta.cuisine || '',
      tags: [],
      family_notes: `Saved from Chef Jennifer.`,
      photo_url: '',
      difficulty: meta.difficulty || '',
    })
    if (error) { showToast('Save failed'); return }
    showToast('Saved to Recipe Vault ✓')
  }

  // Video actions
  async function removeVideo(video) {
    if (video._favoriteId) {
      // Came from Chef TV (favorites table)
      await supabase.from('favorites').delete().eq('id', video._favoriteId)
    } else {
      const table = video._source === 'education' ? 'saved_education_videos' : 'saved_videos'
      await supabase.from(table).delete().eq('user_id', user.id).eq('video_id', video.id)
    }
    setChefVideos(prev => prev.filter(v => v.id !== video.id))
    showToast('Removed')
  }

  const topPicks   = picks.filter(p => p.bucket === 'top')
  const nicePicks  = picks.filter(p => p.bucket === 'nice')
  const laterPicks = picks.filter(p => p.bucket === 'later')
  const totalCount = picks.length + shoppingList.length + aiNotes.length + chefJen.length + chefVideos.length

  const SECTIONS = [
    { key: 'meal_plan',     label: 'Meal Plan',     emoji: '📅',   color: 'bg-amber-50 text-amber-700 border-amber-200',   count: picks.length,        subtitle: "What you're cooking soon, organized your way." },
    { key: 'shopping_list', label: 'Shopping List', emoji: '🛒',   color: 'bg-green-50 text-green-700 border-green-200',   count: shoppingList.length, subtitle: 'Your ingredients, organized and ready to shop.' },
    { key: 'ai_notes',      label: 'AI Notes',      emoji: '💡',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200', count: aiNotes.length,      subtitle: 'Tips and answers from Chef Jennifer, saved for later.' },
    { key: 'chefjen',       label: 'Chef Jennifer', emoji: '👨‍🍳', color: 'bg-purple-50 text-purple-700 border-purple-200', count: chefJen.length,      subtitle: 'Your personal AI chef — guiding your cooking and planning.' },
    { key: 'chef_videos',   label: 'Saved Skills from Chef TV',   emoji: '🎬',   color: 'bg-blue-50 text-blue-700 border-blue-200',       count: chefVideos.length,   subtitle: "Skills you're learning, lessons you've added, and what you're mastering next." },
  ]

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📋 MyPlan</h1>
            {totalCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{totalCount}</span>}
          </div>
          <button onClick={() => window.location.href='/secret'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Recipe Vault</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your plan...</div>
        ) : (
          SECTIONS.map(section => {
            const isCollapsed = collapsed[section.key]

            return (
              <div key={section.key} className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => toggleCollapse(section.key)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{section.emoji}</span>
                      <span className="font-semibold text-sm text-gray-900">{section.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${section.color}`}>{section.count}</span>
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                  </div>
                  {section.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{section.subtitle}</p>
                  )}
                </button>

                {!isCollapsed && (
                  <div>
                    {/* MEAL PLAN — 3 buckets */}
                    {section.key === 'meal_plan' && (
                      picks.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-400 text-sm mb-4">No recipes in your meal plan yet</p>
                          <div className="flex gap-3 justify-center">
                            <button onClick={() => window.location.href='/cards'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Recipe Cards</button>
                            <button onClick={() => window.location.href='/secret'} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold">Recipe Vault</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 space-y-3">
                          {[
                            { picks: topPicks,   bucket: BUCKETS[0] },
                            { picks: nicePicks,  bucket: BUCKETS[1] },
                            { picks: laterPicks, bucket: BUCKETS[2] },
                          ].map(({ picks: bPicks, bucket }) => bPicks.length === 0 ? null : (
                            <div key={bucket.key} className={`rounded-2xl ${bucket.border} ${bucket.bg} p-3 shadow-sm`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span>{bucket.emoji}</span>
                                <h3 className="text-sm font-bold text-gray-900">{bucket.label}</h3>
                                <span className="text-xs text-gray-500">({bPicks.length})</span>
                              </div>
                              <div className="space-y-2">
                                {bPicks.map(pick => (
                                  <div key={pick.id} className="flex items-center gap-3 bg-white rounded-xl p-2">
                                    {pick.photo_url ? (
                                      <img src={pick.photo_url} alt={pick.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                        <span className="text-lg">🍽️</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <button onClick={() => window.location.href=`/secret?recipe=${pick.recipe_id}`}
                                        className="font-semibold text-xs text-orange-600 truncate text-left w-full">{pick.title} →</button>
                                    </div>
                                    <div className="flex gap-1">
                                      {bucket.key !== 'top'   && <button onClick={() => moveTo(pick, 'top')}   title="Move to Top Pick — your main focus for now"   className="text-xs px-1.5 py-0.5 rounded border-2 border-amber-400 text-amber-700 font-semibold">⭐</button>}
                                      {bucket.key !== 'nice'  && <button onClick={() => moveTo(pick, 'nice')}  title="Move to Maybe — if you get to it"                className="text-xs px-1.5 py-0.5 rounded border-2 border-violet-400 text-violet-700 font-semibold">📋</button>}
                                      {bucket.key !== 'later' && <button onClick={() => moveTo(pick, 'later')} title="Move to Later — still saved, not forgotten"      className="text-xs px-1.5 py-0.5 rounded border-2 border-sky-400 text-sky-700 font-semibold">🗂</button>}
                                      <button onClick={() => removePick(pick.id)} title="Remove from Plan" className="text-gray-300 hover:text-red-400 text-lg leading-none ml-1">×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* SHOPPING LIST */}
                    {section.key === 'shopping_list' && (
                      <>
                        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setShowStoreEditor(v => !v)}
                              title="Add or edit the stores you shop at"
                              className="text-xs font-semibold text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1 hover:bg-sky-50"
                            >
                              🏬 Manage Stores
                            </button>
                            {shoppingList.length > 0 && (
                              <button
                                onClick={cleanUpList}
                                disabled={cleaningList}
                                title="Use AI to consolidate fractions into whole store units, strip cooking-only measures (tsp/tbsp/pinch), and dedupe repeats"
                                className="text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {cleaningList ? '✨ Cleaning…' : '✨ Clean Up List'}
                              </button>
                            )}
                            {shoppingList.length > 0 && (
                              <button
                                onClick={copyShoppingList}
                                title="Copy the list as plain text so you can paste it into Notes, Reminders, or your store's app"
                                className="text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50"
                              >
                                📋 Copy
                              </button>
                            )}
                            {shoppingList.length > 0 && (
                              <button
                                onClick={printShoppingList}
                                title="Open a printable version of the shopping list in a new window"
                                className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                              >
                                🖨️ Print
                              </button>
                            )}
                          </div>
                          {shoppingList.length > 0 && (
                            <button onClick={clearShoppingList} title="Clear every item from the shopping list" className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear All</button>
                          )}
                        </div>

                        {showStoreEditor && (
                          <StoreEditor
                            stores={stores}
                            onAdd={addStore}
                            onUpdate={updateStore}
                            onRemove={removeStore}
                            onClose={() => setShowStoreEditor(false)}
                          />
                        )}

                        {shoppingList.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-6">No items — add from vault recipes</p>
                        ) : (
                          <ShoppingByStore
                            shoppingList={shoppingList}
                            stores={stores}
                            onToggle={toggleShoppingItem}
                            onRemove={removeShoppingItem}
                            onSetItemStore={setItemStore}
                          />
                        )}
                      </>
                    )}

                    {/* AI NOTES */}
                    {section.key === 'ai_notes' && (
                      aiNotes.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No saved AI notes yet</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {aiNotes.map(item => (
                            <ExpandableItem key={item.id} item={item} emoji="💡" onRemove={() => removeFavorite(item)} />
                          ))}
                        </div>
                      )
                    )}

                    {/* CHEFJEN */}
                    {section.key === 'chefjen' && (
                      chefJen.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No ChefJen recipes saved yet</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {chefJen.map(item => (
                            <ChefJenItem
                              key={item.id}
                              item={item}
                              onRemove={() => removeFavorite(item)}
                              onSaveToVault={() => saveChefJenToVault(item)}
                            />
                          ))}
                        </div>
                      )
                    )}

                    {/* CHEF VIDEOS */}
                    {section.key === 'chef_videos' && (
                      chefVideos.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No saved videos yet</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {chefVideos.map(video => (
                            <VideoItem key={video.id} video={video} onRemove={() => removeVideo(video)} />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}

function ExpandableItem({ item, emoji, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const answer = item.metadata?.answer || ''
  return (
    <div className="bg-white hover:bg-gray-50">
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl shrink-0" title="Saved AI note">{emoji}</span>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse note' : 'Expand note'}
            className="font-semibold text-sm text-gray-900 leading-tight text-left w-full"
          >
            {item.title}
            <span className="text-gray-400 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && answer && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{answer}</p>
          )}
        </div>
        <button onClick={onRemove} title="Remove from Plan" className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
      </div>
    </div>
  )
}

function ChefJenItem({ item, onRemove, onSaveToVault }) {
  const [expanded, setExpanded] = useState(false)
  const [savedToVault, setSavedToVault] = useState(false)
  const meta = item.metadata || {}
  const description  = meta.description || ''
  const ingredients  = Array.isArray(meta.ingredients) ? meta.ingredients : []
  const instructions = meta.instructions || ''
  const difficulty   = meta.difficulty || ''
  const cuisine      = meta.cuisine || ''
  // Fallback: some older saves may have used metadata.answer
  const answer       = meta.answer || ''
  const hasContent   = description || ingredients.length > 0 || instructions || answer

  async function handleSaveToVault() {
    if (savedToVault) return
    await onSaveToVault()
    setSavedToVault(true)
  }

  return (
    <div className="bg-white hover:bg-gray-50">
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl shrink-0" title="Chef Jennifer recipe">👨‍🍳</span>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-semibold text-sm text-gray-900 leading-tight text-left w-full"
            title={expanded ? 'Collapse recipe' : 'Expand recipe'}
          >
            {item.title}
            <span className="text-gray-400 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="mt-2 space-y-3 text-sm text-gray-700">
              {(cuisine || difficulty) && (
                <div className="flex gap-2 flex-wrap">
                  {cuisine && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{cuisine}</span>}
                  {difficulty && <span className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full">{difficulty}</span>}
                </div>
              )}

              {description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{description}</p>
              )}

              {ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Ingredients</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {ingredients.map((ing, i) => {
                      if (typeof ing === 'string') return <li key={i}>{ing}</li>
                      const measure = ing?.measure || ''
                      const name = ing?.name || ''
                      if (!measure && !name) return <li key={i}>{JSON.stringify(ing)}</li>
                      return (
                        <li key={i}>
                          {measure && <span className="font-semibold text-gray-900">{measure} </span>}
                          {name}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {instructions && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Instructions</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{instructions}</p>
                </div>
              )}

              {answer && !description && !instructions && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{answer}</p>
              )}

              {!hasContent && (
                <p className="text-gray-400 italic">No details saved for this recipe.</p>
              )}

              {/* Save to Vault — promotes this Chef Jennifer recipe into the permanent Recipe Vault */}
              {onSaveToVault && (
                <button
                  onClick={handleSaveToVault}
                  disabled={savedToVault}
                  title="Save this recipe to your Recipe Vault"
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                    savedToVault
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {savedToVault ? '✓ Saved to Recipe Vault' : '💾 Save to Recipe Vault'}
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          title="Remove from Plan"
          className="shrink-0 text-gray-300 hover:text-red-400 text-xl"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function VideoItem({ video, onRemove }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="bg-white">
      {playing ? (
        <div className="relative w-full bg-black" style={{paddingBottom:'56.25%'}}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope"
            sandbox="allow-scripts allow-same-origin"
          />
          <button onClick={() => setPlaying(false)}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
          <button onClick={() => setPlaying(true)} title="Play skill video" className="relative shrink-0">
            <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
              alt={video.title} className="w-16 h-12 rounded-xl object-cover" />
            <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="#dc2626"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{video.title}</p>
            <p className="text-xs text-orange-600">{video.channel}</p>
          </div>
          <button onClick={onRemove} title="Remove saved video from Plan" className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// StoreEditor — inline "My Stores" manager.
// Add, rename, emoji-pick, set a website URL, or remove a store.
// ──────────────────────────────────────────────────────────────
function StoreEditor({ stores, onAdd, onUpdate, onRemove, onClose }) {
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🛒')
  const [newUrl, setNewUrl] = useState('')

  async function handleAdd() {
    if (!newName.trim()) return
    await onAdd({ name: newName, emoji: newEmoji, website_url: newUrl })
    setNewName(''); setNewEmoji('🛒'); setNewUrl('')
  }

  return (
    <div className="mx-3 my-2 rounded-xl border-2 border-sky-200 bg-sky-50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-sky-800">🏬 My Stores</h4>
        <button onClick={onClose} title="Close editor" className="text-sky-700 hover:text-sky-900 text-lg leading-none">×</button>
      </div>

      {stores.length === 0 ? (
        <p className="text-xs text-sky-700">No stores yet. Add Publix, ShopRite, Costco, or wherever you shop below.</p>
      ) : (
        <div className="space-y-2">
          {stores.map(s => (
            <StoreRow key={s.id} store={s} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </div>
      )}

      {/* Add new store */}
      <div className="border-t-2 border-sky-200 pt-3">
        <p className="text-xs font-semibold text-sky-800 mb-2">Add a store</p>
        <div className="flex gap-2">
          <input
            value={newEmoji}
            onChange={e => setNewEmoji(e.target.value)}
            placeholder="🛒"
            className="w-12 text-center border border-sky-200 rounded-lg px-2 py-2 text-base bg-white"
            aria-label="Emoji"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Store name (e.g. Publix)"
            className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
        <input
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          placeholder="Website URL (optional)"
          className="mt-2 w-full border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          title="Add this store"
          className="mt-2 w-full py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-40"
        >
          + Add Store
        </button>
      </div>
    </div>
  )
}

function StoreRow({ store, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(store.name)
  const [emoji, setEmoji] = useState(store.emoji || '🛒')
  const [url, setUrl] = useState(store.website_url || '')

  async function save() {
    await onUpdate(store.id, { name: name.trim() || store.name, emoji: emoji || '🛒', website_url: url })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-sky-200 p-2 space-y-2">
        <div className="flex gap-2">
          <input value={emoji} onChange={e => setEmoji(e.target.value)} className="w-12 text-center border border-sky-200 rounded-lg px-2 py-1.5 text-base" />
          <input value={name} onChange={e => setName(e.target.value)} className="flex-1 border border-sky-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Website URL" className="w-full border border-sky-200 rounded-lg px-3 py-1.5 text-sm" />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold">Save</button>
          <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-sky-200 text-xs font-semibold text-sky-700">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-sky-100 px-2 py-1.5">
      <span className="text-lg shrink-0">{store.emoji || '🛒'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{store.name}</p>
        {store.website_url && <p className="text-xs text-sky-700 truncate">{store.website_url}</p>}
      </div>
      <button onClick={() => setEditing(true)} title="Edit this store" className="text-xs text-sky-700 font-semibold">Edit</button>
      <button onClick={() => onRemove(store.id)} title="Remove this store" className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ShoppingByStore — renders the shopping list grouped by store.
// Items with no store_id land in an "Unsorted" bucket so nothing
// gets lost.
// ──────────────────────────────────────────────────────────────
function ShoppingByStore({ shoppingList, stores, onToggle, onRemove, onSetItemStore }) {
  // Build map: storeId -> array of items, plus "unsorted"
  const groups = new Map()
  groups.set(null, [])
  for (const s of stores) groups.set(s.id, [])
  for (const item of shoppingList) {
    const key = item.store_id || null
    if (!groups.has(key)) groups.set(null, [...(groups.get(null) || []), item])
    else groups.get(key).push(item)
  }

  const orderedStores = [...stores, { id: null, name: 'Unsorted', emoji: '📦', website_url: '' }]

  return (
    <div className="px-3 pb-3 space-y-3">
      {orderedStores.map(store => {
        const items = groups.get(store.id) || []
        if (store.id === null && items.length === 0) return null // hide empty Unsorted
        if (items.length === 0 && stores.length > 0) {
          // Still render empty store groups so the user sees they exist, but compact
          return (
            <div key={String(store.id)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <span>{store.emoji || '🛒'}</span>
              <span className="font-semibold text-gray-600">{store.name}</span>
              <span className="text-gray-400">· 0 items</span>
            </div>
          )
        }
        return (
          <div key={String(store.id)} className="rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{store.emoji || '🛒'}</span>
                <span className="font-semibold text-sm text-gray-900 truncate">{store.name}</span>
                <span className="text-xs text-gray-500">· {items.length}</span>
              </div>
              {store.website_url && (
                <a
                  href={store.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${store.name} in a new tab`}
                  className="text-xs font-semibold text-sky-700 border border-sky-200 rounded-lg px-2 py-0.5 hover:bg-sky-50"
                >
                  Open ↗
                </a>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
                  <button onClick={() => onToggle(item)}
                    title={item.checked ? 'Mark as not bought' : 'Mark as bought'}
                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                    {item.checked && <span className="text-xs">✓</span>}
                  </button>
                  <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.ingredient}</span>
                  {item.recipe_title && <span className="text-xs text-gray-400 truncate max-w-24">{item.recipe_title}</span>}
                  {/* Store selector — short dropdown so the user can move an item to a different bucket */}
                  <select
                    value={item.store_id || ''}
                    onChange={e => onSetItemStore(item.id, e.target.value || null)}
                    title="Assign this item to a store"
                    className="shrink-0 text-xs border border-gray-200 rounded-lg px-1.5 py-0.5 bg-white text-gray-600 max-w-[5.5rem]"
                  >
                    <option value="">Unsorted</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.emoji || '🛒'} {s.name}</option>
                    ))}
                  </select>
                  <button onClick={() => onRemove(item.id)} title="Remove from shopping list" className="shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}