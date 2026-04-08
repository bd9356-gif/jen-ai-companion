import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { recipe, action, servings } = await request.json()

    let prompt = ''

    if (action === 'enhance') {
      prompt = `You are a professional recipe editor. Clean up and improve this recipe for clarity and readability. Fix any formatting issues, improve step descriptions, and make instructions clear and easy to follow. Keep the same recipe — just polish it.

Recipe: ${recipe.title}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Instructions: ${recipe.instructions}

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "ingredients": [{"name": "...", "measure": "..."}],
  "instructions": "Step 1...\\nStep 2...\\nStep 3..."
}`
    } else if (action === 'resize') {
      prompt = `Recalculate this recipe for ${servings} servings. Adjust all ingredient amounts proportionally.

Original recipe (serves ${recipe.servings || 4}):
Ingredients: ${JSON.stringify(recipe.ingredients)}

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "ingredients": [{"name": "...", "measure": "..."}]
}`
    } else if (action === 'generate_info') {
      prompt = `Analyze this recipe and generate helpful cooking information.

Recipe: ${recipe.title}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Instructions: ${recipe.instructions}

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "cooking_time": "e.g. 45 minutes",
  "prep_time": "e.g. 15 minutes",
  "difficulty": "beginner | intermediate | advanced",
  "equipment": ["item1", "item2", "item3"],
  "nutrition_estimate": {
    "calories": "~400 per serving",
    "protein": "~25g",
    "carbs": "~30g",
    "fat": "~15g"
  },
  "servings": 4
}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text.trim()

    // Strip any markdown fences Claude might add
    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const result = JSON.parse(clean)
    return Response.json(result)

  } catch (err) {
    console.error('enhance-recipe error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}