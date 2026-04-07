'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SavedPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('recipes')

  // Saved recipe library
  const [recipes, setRecipes] = useState([])
  const [copying, setCopying] = useState(null)
  const [copiedIds, setCopiedIds] = useState(new Set())

  // Saved videos
  const [recipeVideos, setRecipeVideos] = useState([])
  const [summaryVideos, setSummaryVideos] = useState([])
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadAll(session.user.id)
    })
  }, [])

  async function loadAll(userId) {
    await Promise.all([
      loadSavedRecipes(userId),
      loadSavedVideos(userId),
    ])
    setLoading(false)
  }

  async function loadSavedRecipes(userId) {
    const { data } = await supabase
      .from('saved_recipes')
      .select('recipe_id, recipes(id, title, category, cuisine, thumbnail_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes((data || []).map(s => s.recipes).filter(Boolean))

    const { data: myRecipes } = await supabase
      .from('personal_recipes').select('title').eq('user_id', userId)
    setCopiedIds(new Set((myRecipes || []).map(r => r.title.toLowerCase())))
  }

  async function loadSavedVideos(userId) {
    // Load saved cooking videos with metadata
    const [{ data: sv1 }, { data: sv2 }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
    ])

    const cookingIds = (sv1 || []).map(s => s.video_id)
    const educationIds = (sv2 || []).map(s => s.video_id)

    // Fetch actual video records
    const [{ data: cv }, { data: ev }] = await Promise.all([
      cookingIds.length ? supabase.from('cooking_videos').select('*').in('id', cookingIds) : { data: [] },
      educationIds.length ? supabase.from('education_videos').select('*').in('id', educationIds) : { data: [] },
    ])

    const allVideos = [
      ...(cv || []).map(v => ({ ...v, _source: 'cooking' })),
      ...(ev || []).map(v => ({ ...v, _source: 'education' })),
    ]

    // Fetch metadata
    const allIds = allVideos.map(v => v.id)
    const cookingVideoIds = (cv || []).map(v => v.id)
    const educationVideoIds = (ev || []).map(v => v.id)

    const [{ data: cm }, { data: em }] = await Promise.all([
      cookingVideoIds.length ? supabase.from('video_metadata').select('*').in('video_id', cookingVideoIds) : { data: [] },
      educationVideoIds.length ? supabase.from('education_video_metadata').select('*').in('video_id', educationVideoIds) : { data: [] },
    ])

    const metaMap = {}
    ;(cm || []).forEach(m => { metaMap[m.video_id] = m })
    ;(em || []).forEach(m => { metaMap[m.video_id] = m })

    // Split into recipe vs summary
    const withRecipe = allVideos.filter(v => metaMap[v.id]?.ingredients?.length > 0)
    const withSummary = allVideos.filter(v => !metaMap[v.id]?.ingredients?.length)

    setRecipeVideos(withRecipe.map(v => ({ ...v, _meta: metaMap[v.id] })))
    setSummaryVideos(withSummary.map(v => ({ ...v, _meta: metaMap[v.id] })))
  }

  async function unsaveVideo(video) {
    const table = video._source === 'education' ? 'saved_education_videos' : 'saved_videos'
    await supabase.from(table).delete().eq('user_id', user.id).eq('video_id', video.id)
    if (video._meta?.ingredients?.length > 0) {
      setRecipeVideos(prev => prev.filter(v => v.id !== video.id))
    } else {
      setSummaryVideos(prev => prev.filter(v => v.id !== video.id))
    }
  }

  async function unsaveRecipe(recipeId) {
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  async function copyToMyRecipes(recipe) {
    setCopying(recipe.id)
    const { data: full } = await supabase.from('recipes').select('*').eq('id', recipe.id).single()
    if (full) {
      await supabase.from('personal_recipes').insert({
        user_id: user.id,
        title: full.title,
        description: `Imported from recipe library — ${full.cuisine || full.category || ''}`.trim().replace(/—\s*$/, ''),
        ingredients: full.ingredients || [],
        instructions: full.instructions || '',
        category: full.category || '',
        tags: full.tags || [],
        family_notes: '',
        photo_url: full.thumbnail_url || '',
      })
      setCopiedIds(prev => new Set([...prev, full.title.toLowerCase()]))
    }
    setCopying(null)
  }

  function viewCount(n) {
    if (!n) return ''
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M views`
    if (n >= 1000) return `${(n/1000).toFixed(0)}K views`
    return `${n} views`
  }

  const tabs = [
    { key: 'recipes', label: '🍽️ Recipes', count: recipes.length },
    { key: 'recipe_videos', label: '🍳 Recipe Videos', count: recipeVideos.length },
    { key: 'summary_videos', label: '📝 Summary Videos', count: summaryVideos.length },
  ]

  function VideoCard({ video, onUnsave }) {
    const [expanded, setExpanded] = useState(false)
    const meta = video._meta
    const hasRecipe = meta?.ingredients?.length > 0

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">
        {playingId === video.id ? (
          <div className="relative w-full bg-black" style={{aspectRatio:'16/9'}}>
            <iframe src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
            <button onClick={() => setPlayingId(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
          </div>
        ) : (
          <button onClick={() => setPlayingId(video.id)} className="w-full relative block group">
            <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
              alt={video.title} className="w-full object-cover" style={{height:'160px'}} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="#dc2626"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">{video.duration}</div>
            )}
          </button>
        )}
        <div className="p-3">
          <p className="font-semibold text-gray-900 text-sm leading-snug mb-0.5">{video.title}</p>
          <p className="text-xs text-orange-600 font-medium mb-0.5">{video.channel}</p>
          <p className="text-xs text-gray-400 mb-3">{viewCount(video.view_count)}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setExpanded(!expanded)}
              className="text-sm text-orange-600 font-semibold">
              {expanded ? 'Hide ▲' : 'See Details ▼'}
            </button>
            <button onClick={() => onUnsave(video)}
              className="text-red-400 hover:text-red-600 text-sm font-semibold ml-auto">
              ♥ Remove
            </button>
          </div>
          {expanded && meta && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {meta.ai_summary && <p className="text-sm text-gray-600 mb-3">{meta.ai_summary}</p>}
              {hasRecipe && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ingredients</p>
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <ul className="space-y-1">
                      {meta.ingredients.map((ing, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-orange-400">•</span>
                          <span className="text-gray-700">
                            {ing.measure && <span className="font-semibold">{ing.measure} </span>}
                            {ing.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {meta.instructions && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Instructions</p>
                      <div className="space-y-2">
                        {meta.instructions.split('\n').filter(Boolean).map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                            <p className="text-sm text-gray-700 pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">❤️ Your Favorites</h1>
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  tab === t.key ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                {t.label}
                {t.count > 0 && <span className="ml-1 opacity-75">({t.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your favorites...</div>
        ) : (
          <>
            {/* RECIPES TAB */}
            {tab === 'recipes' && (
              recipes.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-4">🍽️</p>
                  <p className="text-gray-500 font-semibold mb-2">No saved recipes yet</p>
                  <a href="/recipes" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold">Browse Recipes</a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">{recipes.length} saved recipes</p>
                  {recipes.map(recipe => (
                    <div key={recipe.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                      <div className="flex gap-3 p-3">
                        <a href={`/recipes/${recipe.id}`} className="shrink-0">
                          <div style={{width:'72px', height:'72px'}} className="rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center">
                            {recipe.thumbnail_url
                              ? <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
                              : <span className="text-2xl">🍽️</span>}
                          </div>
                        </a>
                        <div className="flex-1 min-w-0">
                          <a href={`/recipes/${recipe.id}`}>
                            <p className="text-sm font-semibold text-gray-900 leading-tight mb-0.5 line-clamp-2">{recipe.title}</p>
                          </a>
                          <p className="text-xs text-gray-400 mb-2">{recipe.cuisine || recipe.category}</p>
                          <div className="flex items-center gap-2">
                            <a href={`/recipes/${recipe.id}`} className="text-xs text-orange-600 font-semibold">View →</a>
                            <span className="text-gray-200">|</span>
                            <button onClick={() => copyToMyRecipes(recipe)}
                              disabled={copying === recipe.id || copiedIds.has(recipe.title?.toLowerCase())}
                              className={`text-xs font-semibold ${copiedIds.has(recipe.title?.toLowerCase()) ? 'text-green-500' : 'text-gray-500 hover:text-orange-600'}`}>
                              {copying === recipe.id ? '⏳' : copiedIds.has(recipe.title?.toLowerCase()) ? '✓ In MyRecipes' : '🔒 Add to MyRecipes'}
                            </button>
                            <button onClick={() => unsaveRecipe(recipe.id)} className="text-red-400 hover:text-red-600 text-lg ml-auto">♥</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* RECIPE VIDEOS TAB */}
            {tab === 'recipe_videos' && (
              recipeVideos.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-4">🍳</p>
                  <p className="text-gray-500 font-semibold mb-2">No saved recipe videos yet</p>
                  <p className="text-sm text-gray-400 mb-6">Save videos with 🍳 Has Recipe badge from the Cooking Videos page</p>
                  <a href="/videos" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold">Browse Videos</a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">{recipeVideos.length} saved recipe videos</p>
                  {recipeVideos.map(video => (
                    <VideoCard key={video.id} video={video} onUnsave={unsaveVideo} />
                  ))}
                </div>
              )
            )}

            {/* SUMMARY VIDEOS TAB */}
            {tab === 'summary_videos' && (
              summaryVideos.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-4">📝</p>
                  <p className="text-gray-500 font-semibold mb-2">No saved summary videos yet</p>
                  <p className="text-sm text-gray-400 mb-6">Save videos with 📝 Summary only badge from the Cooking Videos page</p>
                  <a href="/videos" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold">Browse Videos</a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">{summaryVideos.length} saved summary videos</p>
                  {summaryVideos.map(video => (
                    <VideoCard key={video.id} video={video} onUnsave={unsaveVideo} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  )
}