import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  const { cuisine, difficulty } = await request.json()

  const prompt = `You are a world-class chef creating an elevated, gourmet recipe. Create a ${difficulty} level ${cuisine} recipe that would impress dinner guests.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "title": "Recipe Name",
  "description": "A 2-sentence description of what makes this dish special and who would love it",
  "cuisine": "${cuisine}",
  "difficulty": "${difficulty}",
  "ingredients": [
    {"name": "ingredient name", "measure": "amount and unit"},
    {"name": "ingredient name", "measure": "amount and unit"}
  ],
  "instructions": "Step 1 instruction\\nStep 2 instruction\\nStep 3 instruction"
}

Make it genuinely impressive — use interesting techniques, quality ingredients, and chef-level presentation tips in the instructions.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].text.trim()
  const clean = text.replace(/```json|```/g, '').trim()
  const recipe = JSON.parse(clean)

  // Save to Supabase
  const { data, error } = await supabase
    .from('chef_recipes')
    .insert({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine,
      ai_prompt: `${cuisine} ${difficulty}`,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ recipe }, { status: 200 })
  }

  return Response.json({ recipe: data })
}