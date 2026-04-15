'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const GROUPS = [
  { key: 'meal_plan',     label: 'Meal Plan',     emoji: '📅', subtitle: 'Recipes you plan to cook', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'shopping_list', label: 'Shopping List',  emoji: '🛒', subtitle: 'Ingredients you need',     color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'ai_notes',      label: 'AI Notes',       emoji: '💡', subtitle: 'Saved Ask-AI answers',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'chefjen',       label: 'ChefJen',        emoji: '👨‍🍳', subtitle: 'Your AI chef recipe plans', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'chef_videos',   label: 'Chef Videos',    emoji: '🎬', subtitle: 'Saved cooking videos',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
]

const DEFAULT_SHOW = 5

export default function MyPlanPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [showMore, setShowMore] = useState({})

  // Data for each group
  const [mealPlan, setMealPlan] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [aiNotes, setAiNotes] = useState([])
  const [chefJen, setChefJen] = useState([])
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
      loadMealPlan(userId),
      loadShoppingList(userId),
      loadFavorites(userId),
      loadVideos(userId),
    ])
    setLoading(false)
  }

  async function loadMealPlan(userId) {
    const { data } = await supabase
      .from('my_picks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setMealPlan(data || [])
  }

  async function loadShoppingList(userId) {
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setShoppingList(data || [])
  }

  async function loadFavorites(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['ai_answer', 'ai_recipe'])
      .order('created_at', { ascending: false })
    setAiNotes((data || []).filter(i => i.type === 'ai_answer'))
    setChefJen((data || []).filter(i => i.type === 'ai_recipe'))
  }

  async function loadVideos(userId) {
    const [{ data: sv1 }, { data: sv2 }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
    ])
    const cookingIds = (sv1 || []).map(s => s.video_id)
    const educationIds = (sv2 || []).map(s => s.video_id)
    const [{ data: cv }, { data: ev }] = await Promise.all([
      cookingIds.length ? supabase.from('cooking_videos').select('*').in('id', cookingIds) : { data: [] },
      educationIds.length ? supabase.from('education_videos').select('*').in('id', educationIds) : { data: [] },
    ])
    setChefVideos([...(cv || []), ...(ev || [])])
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function toggleCollapse(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
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

  // Meal plan actions
  async function removeMealPlan(id) {
    await supabase.from('my_picks').delete().eq('id', id)
    setMealPlan(prev => prev.filter(i => i.id !== id))
    showToast('Removed from Meal Plan')
  }

  // Favorites actions
  async function removeFavorite(item) {
    await supabase.from('favorites').delete().eq('id', item.id)
    if (item.type === 'ai_answer') setAiNotes(prev => prev.filter(i => i.id !== item.id))
    if (item.type === 'ai_recipe') setChefJen(prev => prev.filter(i => i.id !== item.id))
    showToast('Removed')
  }

  // Video actions
  async function removeVideo(video) {
    const table = video._source === 'education' ? 'saved_education_videos' : 'saved_videos'
    await supabase.from(table).delete().eq('user_id', user.id).eq('video_id', video.id)
    setChefVideos(prev => prev.filter(v => v.id !== video.id))
    showToast('Removed')
  }

  const totalCount = mealPlan.length + shoppingList.length + aiNotes.length + chefJen.length + chefVideos.length

  const groupData = {
    meal_plan: mealPlan,
    shopping_list: shoppingList,
    ai_notes: aiNotes,
    chefjen: chefJen,
    chef_videos: chefVideos,
  }

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
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
          GROUPS.map(group => {
            const items = groupData[group.key] || []
            const isCollapsed = collapsed[group.key]
            const expanded = showMore[group.key]
            const visible = expanded ? items : items.slice(0, DEFAULT_SHOW)
            const hasMore = items.length > DEFAULT_SHOW

            return (
              <div key={group.key} className="border border-gray-100 rounded-2xl overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleCollapse(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.emoji}</span>
                    <span className="font-semibold text-sm text-gray-900">{group.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${group.color}`}>
                      {items.length}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">{isCollapsed ? '▶' : '▼'}</span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">{group.subtitle}</p>
                    ) : (
                      <>
                        {/* MEAL PLAN */}
                        {group.key === 'meal_plan' && visible.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <span className="text-xl">🍽️</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <button onClick={() => window.location.href=`/secret?recipe=${item.recipe_id}`}
                                className="font-semibold text-sm text-orange-600 truncate text-left w-full">{item.title} →</button>
                              {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                            </div>
                            <button onClick={() => removeMealPlan(item.id)} className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
                          </div>
                        ))}

                        {/* SHOPPING LIST */}
                        {group.key === 'shopping_list' && (
                          <>
                            {shoppingList.length > 0 && (
                              <div className="flex justify-end px-3 py-2 bg-white">
                                <button onClick={clearShoppingList} className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear All</button>
                              </div>
                            )}
                            {visible.map(item => (
                              <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
                                <button onClick={() => toggleShoppingItem(item)}
                                  className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                  {item.checked && <span className="text-xs">✓</span>}
                                </button>
                                <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.ingredient}</span>
                                {item.recipe_title && <span className="text-xs text-gray-400 truncate max-w-24">{item.recipe_title}</span>}
                                <button onClick={() => removeShoppingItem(item.id)} className="shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* AI NOTES */}
                        {group.key === 'ai_notes' && visible.map(item => (
                          <div key={item.id} className="flex items-start gap-3 p-3 bg-white hover:bg-gray-50">
                            <span className="text-xl shrink-0">💡</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.title}</p>
                              {item.metadata?.answer && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.metadata.answer}</p>}
                            </div>
                            <button onClick={() => removeFavorite(item)} className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
                          </div>
                        ))}

                        {/* CHEFJEN */}
                        {group.key === 'chefjen' && visible.map(item => (
                          <div key={item.id} className="flex items-start gap-3 p-3 bg-white hover:bg-gray-50">
                            <span className="text-xl shrink-0">👨‍🍳</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.title}</p>
                              {item.metadata?.answer && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.metadata.answer}</p>}
                            </div>
                            <button onClick={() => removeFavorite(item)} className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
                          </div>
                        ))}

                        {/* CHEF VIDEOS */}
                        {group.key === 'chef_videos' && visible.map(video => (
                          <div key={video.id} className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50">
                            <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                              alt={video.title} className="w-16 h-12 rounded-xl object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{video.title}</p>
                              <p className="text-xs text-orange-600">{video.channel}</p>
                            </div>
                            <button onClick={() => removeVideo(video)} className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
                          </div>
                        ))}

                        {/* Show More */}
                        {hasMore && (
                          <div className="px-4 py-2 bg-gray-50 text-center">
                            <button onClick={() => setShowMore(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                              className="text-xs text-orange-600 font-semibold hover:text-orange-700">
                              {expanded ? `Show Less ▲` : `Show ${items.length - DEFAULT_SHOW} More ▼`}
                            </button>
                          </div>
                        )}
                      </>
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