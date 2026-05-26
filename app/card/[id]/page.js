import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: recipe } = await supabase
    .from('personal_recipes')
    .select('title')
    .eq('id', id)
    .single()
  return { title: recipe ? `${recipe.title} — Recipe Card` : 'Recipe Card' }
}

export default async function RecipeCardPage({ params }) {
  const { id } = await params
  const { data: recipe } = await supabase
    .from('personal_recipes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!recipe) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Recipe not found.</p></div>
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : typeof recipe.ingredients === 'string'
      ? recipe.ingredients.split('\n').filter(Boolean).map(l => ({ name: l, measure: '' }))
      : []

  const instructions = typeof recipe.instructions === 'string'
    ? recipe.instructions.split('\n').filter(Boolean)
    : Array.isArray(recipe.instructions) ? recipe.instructions : []

  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh', padding: '16px', fontFamily: 'Georgia, serif' }}>
      {/* Screenshot hint */}
      <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginBottom: '12px' }}>
        📸 Screenshot this card to share on social media
      </p>

      {/* Card */}
      <div style={{
        maxWidth: '480px', margin: '0 auto', background: '#fff',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        border: '2px solid #e8d5b0'
      }}>
        {/* Header */}
        <div style={{ background: '#7b1c1c', padding: '20px 20px 16px', color: '#fff' }}>
          <p style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.8 }}>Chef Jen approves ♥</p>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: 1.2, margin: 0 }}>{recipe.title}</h1>
          {recipe.description && (
            <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.85, lineHeight: 1.4 }}>{recipe.description}</p>
          )}
        </div>

        {/* Photo */}
        {recipe.photo_url && recipe.photo_url !== '/chef-jen-recipe.jpg' && (
          <div style={{ width: '100%', height: '220px', overflow: 'hidden' }}>
            <img src={recipe.photo_url} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Stats row */}
        {(recipe.prep_time || recipe.cook_time || recipe.servings || recipe.difficulty) && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e8d5b0', background: '#fdf8f0' }}>
            {recipe.prep_time && (
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRight: '1px solid #e8d5b0' }}>
                <p style={{ fontSize: '10px', color: '#999', margin: 0, textTransform: 'uppercase' }}>Prep</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', margin: '2px 0 0' }}>{recipe.prep_time}</p>
              </div>
            )}
            {recipe.cook_time && (
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRight: '1px solid #e8d5b0' }}>
                <p style={{ fontSize: '10px', color: '#999', margin: 0, textTransform: 'uppercase' }}>Cook</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', margin: '2px 0 0' }}>{recipe.cook_time}</p>
              </div>
            )}
            {recipe.servings && (
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRight: recipe.difficulty ? '1px solid #e8d5b0' : 'none' }}>
                <p style={{ fontSize: '10px', color: '#999', margin: 0, textTransform: 'uppercase' }}>Serves</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', margin: '2px 0 0' }}>{recipe.servings}</p>
              </div>
            )}
            {recipe.difficulty && (
              <div style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#999', margin: 0, textTransform: 'uppercase' }}>Level</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', margin: '2px 0 0' }}>{recipe.difficulty}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 0 }}>
          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div style={{ flex: 1, padding: '16px', borderRight: instructions.length > 0 ? '1px solid #e8d5b0' : 'none' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7b1c1c', marginBottom: '10px', fontFamily: 'sans-serif' }}>Ingredients</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {ingredients.slice(0, 12).map((ing, i) => {
                  const text = typeof ing === 'string' ? ing : `${ing.measure || ''} ${ing.name || ''}`.trim()
                  return (
                    <li key={i} style={{ fontSize: '11px', color: '#444', padding: '2px 0', borderBottom: '1px dotted #e8d5b0', display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#7b1c1c', flexShrink: 0 }}>•</span>
                      <span>{text}</span>
                    </li>
                  )
                })}
                {ingredients.length > 12 && <li style={{ fontSize: '11px', color: '#999', paddingTop: '4px' }}>+{ingredients.length - 12} more...</li>}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <div style={{ flex: 1, padding: '16px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7b1c1c', marginBottom: '10px', fontFamily: 'sans-serif' }}>Instructions</h2>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {instructions.slice(0, 8).map((step, i) => (
                  <li key={i} style={{ fontSize: '11px', color: '#444', padding: '3px 0', borderBottom: '1px dotted #e8d5b0', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#fff', background: '#7b1c1c', borderRadius: '50%', width: '16px', height: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>{i + 1}</span>
                    <span style={{ lineHeight: 1.4 }}>{step.substring(0, 80)}{step.length > 80 ? '...' : ''}</span>
                  </li>
                ))}
                {instructions.length > 8 && <li style={{ fontSize: '11px', color: '#999', paddingTop: '4px' }}>+{instructions.length - 8} more steps...</li>}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#7b1c1c', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: '#fff', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>From My Kitchen ♥</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', margin: 0, fontFamily: 'sans-serif' }}>MyRecipe Companion</p>
        </div>
      </div>

      {/* Share buttons */}
      <div style={{ maxWidth: '480px', margin: '16px auto 0', display: 'flex', gap: '8px' }}>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://recipe.mycompanionapps.com/share/${recipe.id}`)}&quote=${encodeURIComponent(`${recipe.title} — Chef Jen approves ♥`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, background: '#1877f2', color: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}
        >
          📘 Share to Facebook
        </a>
        <a
          href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`https://recipe.mycompanionapps.com/share/${recipe.id}`)}&description=${encodeURIComponent(`${recipe.title} — Chef Jen approves ♥`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, background: '#e60023', color: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}
        >
          📌 Pin to Pinterest
        </a>
      </div>
    </div>
  )
}