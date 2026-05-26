import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: recipe } = await supabase
    .from('personal_recipes')
    .select('title, description, photo_url')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!recipe) return { title: 'Recipe Not Found' }

  return {
    title: `${recipe.title} — MyRecipe Companion`,
    description: recipe.description || 'A recipe made with Chef Jen ♥',
    openGraph: {
      title: recipe.title,
      description: recipe.description || 'A recipe made with Chef Jen ♥',
      images: recipe.photo_url && recipe.photo_url !== '/chef-jen-recipe.jpg' ? [recipe.photo_url] : ['https://recipe.mycompanionapps.com/landing-hero-01.png'],
      type: 'article',
    },
  }
}

export default async function SharePage({ params }) {
  const { id } = await params
  const { data: recipe } = await supabase
    .from('personal_recipes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🍽</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Recipe Not Found</h1>
          <p className="text-gray-500 text-sm">This recipe may have been removed.</p>
        </div>
      </div>
    )
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : typeof recipe.ingredients === 'string'
      ? recipe.ingredients.split('\n').filter(Boolean)
      : []

  const instructions = typeof recipe.instructions === 'string'
    ? recipe.instructions.split('\n').filter(Boolean)
    : Array.isArray(recipe.instructions)
      ? recipe.instructions
      : []

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">👨‍🍳</span>
          <span className="font-bold text-gray-900 text-sm">MyRecipe Companion</span>
        </div>
        <a
          href="https://recipe.mycompanionapps.com"
          className="text-xs font-semibold bg-orange-600 text-white px-3 py-1.5 rounded-lg"
        >
          Get the App
        </a>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Photo */}
        {recipe.photo_url && (
          <div className="w-full h-56 rounded-2xl overflow-hidden mb-5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title + Chef Jen stamp */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{recipe.title}</h1>
          <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            <span className="text-sm">👨‍🍳</span>
            <span className="text-xs font-semibold text-orange-700">Chef Jen approves ♥</span>
          </div>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-5">{recipe.description}</p>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Ingredients</h2>
            <ul className="space-y-1.5">
              {ingredients.map((ing, i) => {
                const text = typeof ing === 'string' ? ing : `${ing.measure || ''} ${ing.name || ''}`.trim()
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                    {text}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {instructions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Instructions</h2>
            <ol className="space-y-3">
              {instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
          <p className="text-2xl mb-2">👨‍🍳</p>
          <p className="font-bold text-gray-900 mb-1">Made with MyRecipe Companion</p>
          <p className="text-sm text-gray-500 mb-4">Your personal AI cooking assistant. Ask Chef Jen for any recipe.</p>
          <a
            href="https://recipe.mycompanionapps.com"
            className="inline-block bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Try MyRecipe Companion Free →
          </a>
        </div>
      </main>
    </div>
  )
}