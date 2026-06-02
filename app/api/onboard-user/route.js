import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STARTER_RECIPES = [
  { title: 'Classic Spaghetti Carbonara', category: 'Dinner', tags: ['Italian', 'Pasta', 'Quick'] },
  { title: 'Easy Chicken Stir Fry', category: 'Dinner', tags: ['Asian', 'Chicken', 'Healthy'] },
  { title: 'Homemade Banana Bread', category: 'Baking', tags: ['Breakfast', 'Baking', 'Sweet'] },
  { title: 'Smashed Avocado Toast', category: 'Breakfast', tags: ['Breakfast', 'Quick', 'Healthy'] },
  { title: 'Chocolate Chip Cookies', category: 'Dessert', tags: ['Baking', 'Dessert', 'Sweet'] },
]

async function generateRecipe(title, category, tags) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Generate a complete recipe for "${title}". Return ONLY valid JSON with these exact fields:
{
  "title": "${title}",
  "description": "one sentence description",
  "ingredients": ["item 1", "item 2"],
  "instructions": ["step 1", "step 2"],
  "servings": "4",
  "prep_time": "10 mins",
  "cook_time": "20 mins",
  "category": "${category}",
  "tags": ${JSON.stringify(tags)}
}
No markdown, no explanation, just JSON.`
    }]
  })
  const text = msg.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

export async function POST(req) {
  try {
    const { userId } = await req.json()
    if (!userId) return Response.json({ error: 'No userId' }, { status: 400 })

    // Check if already onboarded
    const { data: existing } = await supabase
      .from('personal_recipes')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    
    if (existing && existing.length > 0) {
      return Response.json({ message: 'Already onboarded' })
    }

    // Generate 5 recipes
    const recipes = []
    for (const r of STARTER_RECIPES) {
      try {
        const recipe = await generateRecipe(r.title, r.category, r.tags)
        recipes.push(recipe)
      } catch (e) {
        // Skip failed recipes
      }
    }

    // Insert recipes to vault
    const insertedIds = []
    for (let i = 0; i < recipes.length; i++) {
      const r = recipes[i]
      const { data } = await supabase.from('personal_recipes').insert({
        user_id: userId,
        title: r.title,
        description: r.description,
        ingredients: r.ingredients,
        instructions: r.instructions,
        servings: r.servings,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        category: r.category,
        tags: r.tags,
        is_in_vault: false,
        is_in_social_share: i === 2, // Banana Bread → Share Later
        family_notes: 'Welcome recipe from Chef Jen ♥',
      }).select('id').single()
      if (data) insertedIds.push(data.id)
    }

    // Add Chicken Stir Fry to meal plan (Monday)
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const weekStart = monday.toISOString().split('T')[0]

    if (insertedIds[1]) {
      await supabase.from('weekly_plan').insert({
        user_id: userId,
        recipe_id: insertedIds[1],
        recipe_title: recipes[1]?.title || 'Chicken Stir Fry',
        day_of_week: 'Monday',
        week_start: weekStart,
      })

      // Add shopping list items from Chicken Stir Fry
      const ingredients = recipes[1]?.ingredients || []
      const shopRows = ingredients.slice(0, 6).map(ingredient => ({
        user_id: userId,
        ingredient,
        recipe_title: recipes[1]?.title || 'Chicken Stir Fry',
      }))
      if (shopRows.length > 0) {
        await supabase.from('shopping_list').insert(shopRows)
      }
    }

    // Add a Chef Jen tip to Learning Vault
    await supabase.from('favorites').insert({
      user_id: userId,
      type: 'ai_answer',
      is_in_vault: true,
      title: 'Chef Jen\'s Top Cooking Tip',
      content: 'Always mise en place — prepare and measure all your ingredients before you start cooking. This keeps you calm, organized, and in control of your kitchen.',
      source: 'Chef Jen',
    })

    // Add a learning video to Learning Vault
    const { data: video } = await supabase
      .from('cooking_videos')
      .select('youtube_id, title')
      .eq('bucket', 'A')
      .limit(1)
      .single()

    if (video) {
      await supabase.from('favorites').insert({
        user_id: userId,
        type: 'video_education',
        is_in_vault: true,
        title: video.title,
        youtube_id: video.youtube_id,
      })
    }

    return Response.json({ success: true, recipesCreated: insertedIds.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}