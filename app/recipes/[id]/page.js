'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import SafeYouTube from '@/components/SafeYouTube'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function getVideoType(url) {
  if (!url) return null
  if (url.match(/(?:youtube\.com|youtu\.be)/)) return 'youtube'
  if (url.match(/tiktok\.com/)) return 'tiktok'
  if (url.match(/\.(mp4|mov|webm)/i)) return 'mp4'
  return 'link'
}

function getYouTubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
  return match ? match[1] : null
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        checkSaved(session.user.id)
      }
    })
    loadRecipe()
  }, [id])

  async function loadRecipe() {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    setRecipe(data)

    const { data: meta } = await supabase
      .from('recipe_metadata')
      .select('*')
      .eq('recipe_id', id)
      .single()
    setMetadata(meta)
    setLoading(false)
  }

  async function checkSaved(userId) {
    const { data } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', id)
      .single()
    setSaved(!!data)
  }

  async function toggleSave() {
    if (!user) { window.location.href = '/login'; return }
    if (saved) {
      await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', id)
      setSaved(false)
    } else {
      await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: id })
      setSaved(true)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  if (!recipe) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400">Recipe not found</p>
    </div>
  )

  const ingredients = recipe.ingredients || []
  const instructions = (recipe.instructions || '').split('\n').filter(Boolean)
  const videoType = getVideoType(recipe.youtube_url)
  const diffLabel = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', advanced: '🔴 Advanced' }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => window.history.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <button onClick={toggleSave}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${saved ? 'bg-red-50 text-red-500 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}>
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Video */}
        {videoType === 'youtube' && (
          <div className="mb-6">
            {showVideo ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{paddingBottom:'56.25%'}}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${getYouTubeId(recipe.youtube_url)}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button onClick={() => setShowVideo(false)}
                  className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold z-10">✕</button>
              </div>
            ) : (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black cursor-pointer" style={{paddingBottom:'56.25%'}} onClick={() => setShowVideo(true)}>
                {recipe.thumbnail_url && (
                  <img src={recipe.thumbnail_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl ml-1">▶</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {videoType === 'mp4' && (
          <div className="mb-6 rounded-2xl overflow-hidden">
            <video src={recipe.youtube_url} controls className="w-full rounded-2xl" />
          </div>
        )}
        {videoType === 'tiktok' && (
          <div className="mb-6">
            <a href={recipe.youtube_url} target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 bg-black text-white rounded-2xl text-center text-sm font-semibold">
              Watch on TikTok ↗
            </a>
          </div>
        )}
        {!videoType && recipe.thumbnail_url && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{height:'240px'}}>
            <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {recipe.category && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">{recipe.category}</span>}
          {recipe.cuisine && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{recipe.cuisine}</span>}
          {metadata?.difficulty_level && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{diffLabel[metadata.difficulty_level]}</span>}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.title}</h1>

        {metadata?.ai_summary && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-orange-900 leading-relaxed">{metadata.ai_summary}</p>
          </div>
        )}

        {/* Ingredients */}
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

        {/* Instructions */}
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

        <button onClick={toggleSave}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-colors ${saved ? 'bg-red-50 text-red-500 border-2 border-red-200' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
          {saved ? '♥ Saved to Favorites' : '♡ Save to Favorites'}
        </button>
      </main>
    </div>
  )
}