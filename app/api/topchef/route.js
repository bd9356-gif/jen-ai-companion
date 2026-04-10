import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
    const body = await request.json()

  let prompt
    let cuisine = body.cuisine || 'International'
    let difficulty = body.difficulty || 'Intermediate'

  if (body.prompt) {
        prompt = body.prompt
        cuisine = body.drawer || 'Chef Special'
        difficulty = 'Chef Level'
  } else {
        const { data: existing } = await supabase
          .from('chef_recipes')
          .select('title')
          .eq('cuisine', cuisine)
          .order('created_at', { ascending: false })
          .limit(20)

      const existingTitles = (existing || []).map(r => r.title).join(', ')
        const avoidClause = existingTitles
          ? `\n\nDo NOT create any of these recipes: ${existingTitles}.`
                : ''

      const techniques = ['braising','sous vide','confit','searing','roasting','caramelizing','deglazing']
        const ingredients = ['truffle','saffron','miso','tamarind','preserved lemon','burrata','sumac','harissa','gochujang','black garlic','yuzu','tahini']
        const randomTechnique = techniques[Math.floor(Math.random() * techniques.length)]
        const randomIngredient = ingredients[Math.floor(Math.random() * ingredients.length)]

      prompt = `You are a world-class chef creating an elevated, gourmet recipe.
      Create a ${difficulty} level ${cuisine} recipe that would impress dinner guests.
      Try to incorporate ${randomTechnique} or ${randomIngredient} if it fits naturally.
      Be creative and unexpected.${avoidClause}`
  }

  const fullPrompt = `${prompt}

  Respond with ONLY a JSON object in this exact format, no other text:
  {
    "title": "Recipe Name",
      "description": "A 2-sentence description of what makes this dish special",
        "cuisine": "${cuisine}",
          "difficulty": "${difficulty}",
            "ingredients": [
                {"name": "ingredient name", "measure": "amount and unit"}
                  ],
                    "instructions": "Step 1 instruction\\nStep 2 instruction\\nStep 3 instruction"
                    }`

  const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: fullPrompt }]
  })

  const text = message.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const recipe = JSON.parse(clean)

  const { data, error } = await supabase
      .from('chef_recipes')
      .insert({
              title: recipe.title,
              description: recipe.description,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              difficulty: recipe.difficulty,
              cuisine: recipe.cuisine,
              ai_prompt: body.prompt || `${cuisine} ${difficulty}`,
      })
      .select()
      .single()

  if (error) {
        return Response.json({ recipe }, { status: 200 })
  }
    return Response.json({ recipe: data })
}
