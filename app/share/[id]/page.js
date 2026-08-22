import { createClient } from '@supabase/supabase-js'
import { RecipeShareView, LearnMoreButton } from './SharePageEvents'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf'
)

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: recipe, error: recipeError } = await supabase
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
      images: recipe.photo_url && recipe.photo_url !== '/chef-jen-update.png' ? [recipe.photo_url] : ['https://recipe.mycompanionapps.com/landing-hero-01.png'],
      type: 'article',
      siteName: 'MyRecipe Companion',
    },
  }
}

export default async function SharePage({ params }) {
  const { id } = await params
  const { data: recipe, error: recipeError } = await supabase
    .from('personal_recipes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  console.log('share page - id:', id, 'recipe:', recipe, 'error:', recipeError)
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

  const ingredientStrings = ingredients.map((ing) =>
    typeof ing === 'string' ? ing : `${ing.measure || ing.amount || ''} ${ing.name || ''}`.trim()
  )

  const toISODuration = (minutes) =>
    minutes != null && minutes > 0 ? `PT${minutes}M` : undefined

  const recipeSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description || undefined,
    image: recipe.photo_url ? [recipe.photo_url] : undefined,
    recipeIngredient: ingredientStrings.length > 0 ? ingredientStrings : undefined,
    recipeInstructions: instructions.length > 0
      ? instructions.map((step) => ({ '@type': 'HowToStep', text: step }))
      : undefined,
    prepTime: toISODuration(recipe.prep_time_minutes),
    cookTime: toISODuration(recipe.cook_time_minutes),
    totalTime: toISODuration(recipe.total_time_minutes),
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    nutrition: (recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g) ? {
      '@type': 'NutritionInformation',
      calories: recipe.calories ? `${recipe.calories} calories` : undefined,
      proteinContent: recipe.protein_g ? `${recipe.protein_g}g` : undefined,
      carbohydrateContent: recipe.carbs_g ? `${recipe.carbs_g}g` : undefined,
      fatContent: recipe.fat_g ? `${recipe.fat_g}g` : undefined,
    } : undefined,
    author: { '@type': 'Organization', name: 'MyRecipe Companion' },
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }}
      />
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

        {/* Title + CTA */}
        <div className="mb-5">
          <RecipeShareView recipeId={recipe.id} recipeTitle={recipe.title} />
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{recipe.title}</h1>
          <LearnMoreButton recipeId={recipe.id} recipeTitle={recipe.title} />
        </div>

        {/* Source credit */}
        {recipe.family_notes && recipe.family_notes.includes('Source:') && (() => {
          const match = recipe.family_notes.match(/Source: (https?:\/\/[^\s\n]+)/)
          if (!match) return null
          try {
            const domain = new URL(match[1]).hostname.replace('www.', '')
            return (
              <div className="mb-4">
                <a href={match[1]} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-200 transition-colors">
                  🔗 Originally from {domain}
                </a>
              </div>
            )
          } catch { return null }
        })()}

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
                const text = typeof ing === 'string' ? ing : `${ing.measure || ing.amount || ''} ${ing.name || ''}`.trim()
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

        {/* Footer note */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">Shared from MyRecipe Companion.</p>
        </div>

      </main>
    </div>
  )
}