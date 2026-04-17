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
      loadFavorites(userId),
      loadVideos(userId),
    ])
    setLoading(false)
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
          <button onClick={() => window.location.href='/secret'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">MyVault</button>
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
                            <button onClick={() => window.location.href='/cards'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">MyRecipe Cards</button>
                            <button onClick={() => window.location.href='/secret'} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold">MyVault</button>
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
                      shoppingList.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No items — add from vault recipes</p>
                      ) : (
                        <>
                          <div className="flex justify-end px-3 pt-2">
                            <button onClick={clearShoppingList} className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear All</button>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {shoppingList.map(item => (
                              <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
                                <button onClick={() => toggleShoppingItem(item)}
                                  className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                  {item.checked && <span className="text-xs">✓</span>}
                                </button>
                                <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.ingredient}</span>
                                {item.recipe_title && <span className="text-xs text-gray-400 truncate max-w-24">{item.recipe_title}</span>}
                                <button onClick={() => removeShoppingItem(item.id)} title="Remove from shopping list" className="shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                              </div>
                            ))}
                          </div>
                        </>
                      )
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