'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const GROUPS = [
  { key: 'recipe',          label: 'Recipes',           emoji: '🍽️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'video_recipe',    label: 'Recipe Videos',     emoji: '🍳', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'video_education', label: 'Education Videos',  emoji: '📚', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'ai_recipe',       label: 'AI Recipes',        emoji: '🤖', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'ai_answer',       label: 'AI Answers',        emoji: '💬', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
]

const DEFAULT_SHOW = 5

export default function FavoritesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({ recipe: true, video_recipe: true, video_education: true, ai_recipe: true, ai_answer: true })
  const [showMore, setShowMore] = useState({})
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState(null)
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadFavorites(session.user.id)
    })
  }, [])

  // Close any playing video when navigating back
  useEffect(() => {
    return () => setPlayingId(null)
  }, [])

  async function loadFavorites(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('is_in_vault', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function addToVault(item) {
    setPlayingId(null)
    await supabase.from('favorites').update({ is_in_vault: true }).eq('id', item.id)
    if (item.type === 'recipe' || item.type === 'ai_recipe' || item.type === 'video_recipe') {
      const meta = item.metadata || {}
      await supabase.from('personal_recipes').insert({
        user_id: user.id,
        title: item.title,
        description: meta.description || meta.ai_summary || meta.channel || '',
        ingredients: meta.ingredients || [],
        instructions: meta.instructions || '',
        category: item.type === 'video_recipe' ? 'Recipe Videos' : (meta.category || 'My Recipes'),
        tags: meta.tags || [],
        photo_url: item.thumbnail_url || '',
        family_notes: `youtube_id:${meta.youtube_id || ''}|channel:${meta.channel || ''}|Added from MyFavorites`,
      })
    }
    if (item.type === 'ai_answer') {
      const meta = item.metadata || {}
      await supabase.from('notes').insert({
        user_id: user.id,
        title: item.title,
        content: meta.answer || '',
        question: meta.question || '',
        source: 'ai',
      })
    }
    setItems(prev => prev.filter(i => i.id !== item.id))
    showToast('Added to your Vault ✓')
  }

  async function removeItem(id) {
    setPlayingId(null)
    await supabase.from('favorites').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Removed from Favorites')
  }

  async function batchAddToVault() {
    const toAdd = items.filter(i => selected.has(i.id))
    for (const item of toAdd) await addToVault(item)
    setSelected(new Set())
    setBatchMode(false)
  }

  async function batchRemove() {
    for (const id of selected) await supabase.from('favorites').delete().eq('id', id)
    setItems(prev => prev.filter(i => !selected.has(i.id)))
    setSelected(new Set())
    setBatchMode(false)
    showToast('Removed from Favorites')
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleCollapse(key) {
    setPlayingId(null)
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function closeAll() {
    setPlayingId(null)
    setCollapsed(prev => {
      const all = {}
      GROUPS.forEach(g => { all[g.key] = true })
      return all
    })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function getYouTubeId(url) {
    if (!url) return null
    const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
    return m ? m[1] : null
  }

  const totalCount = items.length
  const anyOpen = Object.values(collapsed).some(v => v === false) || Object.keys(collapsed).length < GROUPS.filter(g => items.some(i => i.type === g.key)).length

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => { setPlayingId(null); window.location.href='/kitchen' }} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">❤️ MyFavorites</h1>
              {totalCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{totalCount}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={closeAll}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                Close All
              </button>
              <button
                onClick={() => { setBatchMode(!batchMode); setSelected(new Set()) }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${batchMode ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {batchMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>
          {/* Tagline — more prominent */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-orange-700">🗂️ Where your best finds wait for you — review before adding to your Vault.</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-32">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🗂️</div>
            <p className="text-gray-700 font-semibold mb-2">Nothing saved yet</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Anything you save while exploring will land here. Pick what you love, then add it to your Vault.
            </p>
            <a href="/explore" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Explore Recipes
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {GROUPS.map(group => {
              const groupItems = items.filter(i => i.type === group.key)
              if (groupItems.length === 0) return null
              const isCollapsed = collapsed[group.key]
              const expanded = showMore[group.key]
              const visible = expanded ? groupItems : groupItems.slice(0, DEFAULT_SHOW)
              const hasMore = groupItems.length > DEFAULT_SHOW

              return (
                <div key={group.key} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleCollapse(group.key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.emoji}</span>
                      <span className="font-semibold text-sm text-gray-900">{group.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${group.color}`}>
                        {groupItems.length}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">{isCollapsed ? '▶' : '▼'}</span>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-gray-50">
                      {visible.map(item => {
                        const youtubeId = item.metadata?.youtube_id || getYouTubeId(item.metadata?.url || '')
                        const isPlaying = playingId === item.id

                        return (
                          <div key={item.id}
                            className={`transition-colors ${selected.has(item.id) ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'}`}>

                            {/* Inline video player */}
                            {isPlaying && youtubeId && (
                              <div className="relative w-full bg-black" style={{aspectRatio:'16/9'}}>
                                <iframe
                                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                                <button onClick={() => setPlayingId(null)}
                                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
                              </div>
                            )}

                            <div className="flex gap-3 p-3">
                              {batchMode && (
                                <button onClick={() => toggleSelect(item.id)}
                                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center self-center transition-colors ${selected.has(item.id) ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-300'}`}>
                                  {selected.has(item.id) && <span className="text-xs">✓</span>}
                                </button>
                              )}

                              {/* Thumbnail — clickable for videos */}
                              <div
                                onClick={() => youtubeId && setPlayingId(isPlaying ? null : item.id)}
                                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-orange-50 ${youtubeId ? 'cursor-pointer relative' : ''}`}>
                                {item.thumbnail_url ? (
                                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl">{group.emoji}</div>
                                )}
                                {youtubeId && !isPlaying && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
                                    <span className="text-white text-xs">▶</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.title}</p>
                                  {!batchMode && (
                                    <button onClick={() => removeItem(item.id)} className="shrink-0 text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                                  )}
                                </div>
                                {!batchMode && (
                                  <div className="flex gap-2 flex-wrap">
                                    {item.type === 'recipe' && item.ref_id && (
                                      <a href={`/recipes/${item.ref_id}`} className="text-xs text-orange-600 font-semibold">View →</a>
                                    )}
                                    {youtubeId && !isPlaying && (
                                      <button onClick={() => setPlayingId(item.id)} className="text-xs text-red-600 font-semibold">Watch ▶</button>
                                    )}
                                    {youtubeId && isPlaying && (
                                      <button onClick={() => setPlayingId(null)} className="text-xs text-gray-500 font-semibold">Stop ■</button>
                                    )}
                                    <button onClick={() => addToVault(item)}
                                      className="text-xs bg-orange-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors">
                                      Add to Vault
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Show More / Less */}
                      {hasMore && (
                        <div className="px-4 py-2 bg-gray-50 text-center">
                          <button
                            onClick={() => setShowMore(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                            className="text-xs text-orange-600 font-semibold hover:text-orange-700">
                            {expanded ? `Show Less ▲` : `Show ${groupItems.length - DEFAULT_SHOW} More ▼`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {batchMode && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button onClick={batchAddToVault}
              className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Add {selected.size} to Vault
            </button>
            <button onClick={batchRemove}
              className="flex-1 py-3 bg-red-50 text-red-500 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors">
              Remove {selected.size}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}