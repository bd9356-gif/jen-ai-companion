// Tasty API Recipe Ingestion Script for MyRecipe Companion
// Run: node ingest_tasty.js
// Requires: npm install @supabase/supabase-js node-fetch

const { createClient } = require('@supabase/supabase-js')

// ── CREDENTIALS ──────────────────────────────────────────────
const RAPIDAPI_KEY = 'fc8d2de768mshe405526173aa5ccp177101jsn2932935cd9e3'
const SUPABASE_URL = 'https://epgtahifcphwjifxmxst.supabase.co'
const SUPABASE_KEY = 'sb_secret_LuPgurliq-92bmy5HGhjTQ_3udJuXCU'
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Tags to pull — each = one API request (40 recipes max)
const TAGS = [
  'chicken', 'beef', 'pork', 'seafood', 'pasta', 'vegetarian',
  'desserts', 'breakfast', 'soup', 'salad', 'appetizers',
  'baking', 'healthy', 'quick_and_easy', 'comfort_food', 'dinner'
]

const DIFFICULTY_MAP = {
  'easy': 'beginner',
  'medium': 'intermediate',
  'hard': 'advanced'
}

async function fetchRecipes(tag, from = 0, size = 40) {
  const url = `https://tasty.p.rapidapi.com/recipes/list?from=${from}&size=${size}&tags=${tag}`
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'tasty.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY
    }
  })
  const data = await res.json()
  if (data.message) throw new Error(`API error: ${data.message}`)
  return data.results || []
}

function mapIngredients(sections) {
  const ingredients = []
  for (const section of (sections || [])) {
    for (const comp of (section.components || [])) {
      const name = comp.ingredient?.name || ''
      if (!name) continue
      // Prefer imperial measurements (index 1), fall back to metric (index 0)
      const m = comp.measurements?.[1] || comp.measurements?.[0]
      const measure = m
        ? `${m.quantity || ''} ${m.unit?.abbreviation || m.unit?.name || ''}`.trim()
        : ''
      ingredients.push({ name, measure })
    }
  }
  return ingredients
}

function mapInstructions(instructions) {
  return (instructions || [])
    .sort((a, b) => a.position - b.position)
    .map(i => i.display_text)
    .filter(Boolean)
    .join('\n')
}

function mapTags(tags) {
  return (tags || [])
    .map(t => t.name)
    .filter(Boolean)
    .slice(0, 10)
}

function mapDietaryTags(tags) {
  const dietary = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free',
    'low_carb', 'keto', 'paleo', 'nut_free', 'pescatarian', 'kosher']
  return (tags || [])
    .map(t => t.name)
    .filter(t => dietary.includes(t))
}

function mapCuisine(tags) {
  const cuisineTag = (tags || []).find(t => t.type === 'cuisine')
  return cuisineTag ? cuisineTag.display_name || cuisineTag.name : ''
}

function mapCategory(tags) {
  const mealTag = (tags || []).find(t => t.type === 'meal')
  return mealTag ? mealTag.display_name || mealTag.name : ''
}

function mapDifficulty(tags) {
  const diffTag = (tags || []).find(t => t.type === 'difficulty')
  if (!diffTag) return null
  return DIFFICULTY_MAP[diffTag.name] || diffTag.name || null
}

async function ingestTag(tag) {
  console.log(`\n🍽️  Fetching tag: ${tag}...`)
  let recipes
  try {
    recipes = await fetchRecipes(tag)
  } catch (err) {
    console.log(`  ⚠️  Skipped: ${err.message}`)
    return
  }

  console.log(`  Found ${recipes.length} recipes`)
  if (recipes.length === 0) return

  let inserted = 0, skipped = 0, metaInserted = 0

  for (const r of recipes) {
    // Skip if missing essential data
    if (!r.name || !r.instructions?.length || !r.sections?.length) {
      skipped++
      continue
    }

    const ingredients = mapIngredients(r.sections)
    const instructions = mapInstructions(r.instructions)
    const tags = mapTags(r.tags)
    const cuisine = mapCuisine(r.tags)
    const category = mapCategory(r.tags)
    const dietaryTags = mapDietaryTags(r.tags)
    const difficulty = mapDifficulty(r.tags)
    const aiSummary = r.description || ''

    // ── Insert into recipes table ──
    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .upsert({
        title: r.name,
        category,
        cuisine,
        instructions,
        thumbnail_url: r.thumbnail_url || '',
        youtube_url: r.original_video_url || '',
        source_url: r.canonical_id ? `https://tasty.co/recipe/${r.slug}` : '',
        tags,
        ingredients,
      }, { onConflict: 'title' })
      .select('id')
      .single()

    if (recipeError) {
      skipped++
      console.log(`  ⚠️  ${r.name.substring(0, 50)}: ${recipeError.message}`)
      continue
    }

    inserted++

    // ── Insert into recipe_metadata table ──
    if (recipeRow?.id) {
      const { error: metaError } = await supabase
        .from('recipe_metadata')
        .upsert({
          recipe_id: recipeRow.id,
          ai_summary: aiSummary,
          difficulty_level: difficulty,
          dietary_tags: dietaryTags,
          quality_score: r.user_ratings?.score
            ? Math.round(r.user_ratings.score * 100) / 10
            : null,
        }, { onConflict: 'recipe_id' })

      if (!metaError) metaInserted++
    }
  }

  console.log(`  ✅ Recipes: ${inserted} | Metadata: ${metaInserted} | Skipped: ${skipped}`)
}

async function main() {
  console.log('🍳 MyRecipe Companion — Tasty API Ingestion')
  console.log('============================================')

  for (const tag of TAGS) {
    await ingestTag(tag)
    await new Promise(r => setTimeout(r, 600)) // respect rate limit
  }

  const { count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })

  console.log(`\n🎉 Done! Total recipes in database: ${count}`)
}

main().catch(console.error)