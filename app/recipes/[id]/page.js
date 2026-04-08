'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const diffLabel = {
  beginner: '🟢 Beginner',
  intermediate: '🟡 Intermediate',
  advanced: '🔴 Advanced'
}

function getVideoType(url) {
  if (!url) return null
  if (url.match(/(?:youtube\.com|youtu\.be)/)) return 'youtube'
  if (url.match(/tiktok\.com/)) return 'tiktok'
  if (url.match(/\.(mp4|mov|webm|m4v)/i) || url.match(/s3\.amazonaws\.com/)) return 'mp4'
  if (url.match(/facebook\.com|fb\.watch/)) return 'facebook'
  return 'link'
}

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/)
  return match ? match[1] : null
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const [showVideo, setShowVideo] = useState(false)

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
    const { data: r } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    setRecipe(r)

    const { data: m } = await supabase
      .from('recipe_metadata')
      .select('*')
      .eq('recipe_id', id)
      .single()
    setMeta(m)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-4xl animate-pulse">🍽️</p>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Recipe not found.</p>
      </div>
    )
  }

  const ingredients = recipe.ingredients || []
  const instructions = (recipe.instructions || '').split(/\r?\n/).filter(Boolean)
  const videoType = getVideoType(recipe.youtube_url)
  const youtubeId = videoType === 'youtube' ? getYouTubeId(recipe.youtube_url) : null

  function renderVideo() {
    if (!recipe.youtube_url || !videoType) return null

    if (videoType === 'youtube' && youtubeId) {
      return (
        <div className="mb-6">
          {showVideo ? (
            <div className="relative w-full rounded-2xl overflow-hidden" style={{paddingBottom: '56.25%'}}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title="Recipe video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              onClick={() => setShowVideo(true)}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-semibold text-base hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>▶</span> Watch Cooking Video
            </button>
          )}
        </div>
      )
    }

    if (videoType === 'mp4') {
      return (
        <div className="mb-6">
          {showVideo ? (
            <video
              src={recipe.youtube_url}
              controls
              autoPlay
              className="w-full rounded-2xl bg-black"
              style={{maxHeight: '300px'}}
            />
          ) : (
            <button
              onClick={() => setShowVideo(true)}
              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-semibold text-base hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>▶</span> Watch Cooking Video
            </button>
          )}
        </div>
      )
    }

    if (videoType === 'tiktok' || videoType === 'facebook' || videoType === 'link') {
      return (
        <div className="mb-6">
          <a
            href={recipe.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="w-full py-4 bg-gray-800 text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
          >
            <span>▶</span> Watch on {videoType === 'tiktok' ? 'TikTok' : videoType === 'facebook' ? 'Facebook' : 'External Site'}
          </a>
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => window.history.back()} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <button
            onClick={toggleSave}
            className={`text-2xl transition-colors ${saved ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
          >
            ♥
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-16">
        {/* Hero image */}
        <div className="relative w-full overflow-hidden mb-6" style={{height: '240px'}}>
          {recipe.thumbnail_url ? (
            <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-orange-50 flex items-center justify-center">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Title & meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.cuisine && (
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">
                🌍 {recipe.cuisine}
              </span>
            )}
            {recipe.category && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                {recipe.category}
              </span>
            )}
            {meta?.difficulty_level && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                {diffLabel[meta.difficulty_level]}
              </span>
            )}
          </div>

          {meta?.ai_summary && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-sm text-orange-900 leading-relaxed">🤖 {meta.ai_summary}</p>
            </div>
          )}
        </div>

        {/* Video */}
        {renderVideo()}

        {/* Ingredients */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Ingredients</h2>
          <div className="bg-gray-50 rounded-2xl p-4">
            <ul className="space-y-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span className="text-gray-600">
                    {ing.measure && <span className="font-semibold text-gray-800">{ing.measure} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
          <div className="space-y-4">
            {instructions.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={toggleSave}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-colors ${
            saved
              ? 'bg-red-50 text-red-600 border-2 border-red-200'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {saved ? '♥ Saved to My Kitchen' : '♥ Save Recipe'}
        </button>
      </main>
    </div>
  )
}