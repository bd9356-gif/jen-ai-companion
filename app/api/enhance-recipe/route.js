import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// "Make This Recipe More..." — keep in sync with PREFERENCE_OPTIONS on the
// Recipe Vault (app/secret/page.js). The Chef Jennifer page (app/chef/page.js)
// no longer exposes the preference picker — Phase 2A simplified Chef Jennifer
// to a free-text Teach/Practice chat — but this server-side label map still backs
// the Vault's "Make This Recipe More..." flow.
const PREFERENCE_LABELS = {
  carb_aware: 'Carb-aware',
  carb_counting: 'Carb-counting friendly',
  portion_focused: 'Portion-focused',
  vegetarian: 'Vegetarian-friendly',
  gluten_friendly: 'Gluten-friendly',
  dairy_friendly: 'Dairy-friendly',
  low_sodium: 'Low-sodium',
  heart_healthy: 'Heart-healthy',
}

export async function POST(request) {
  try {
    const { recipe, action, servings, preferences } = await request.json()

    const currentServings = recipe.servings || null
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
      const fromServings = currentServings
        ? `${currentServings} servings`
        : 'an unknown number of servings (use your best judgment based on the ingredient quantities)'

      prompt = `Recalculate this recipe to make exactly ${servings} servings. The original recipe makes ${fromServings}. Adjust ALL ingredient amounts proportionally and precisely.

Original ingredients: ${JSON.stringify(recipe.ingredients)}

Important: Scale every single ingredient amount accurately. Do not round aggressively — keep reasonable precision (e.g. "1.5 cups" not "2 cups" if that's what the math gives).

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "ingredients": [{"name": "...", "measure": "..."}]
}`

    } else if (action === 'transform') {
      const selected = Array.isArray(preferences) ? preferences : []
      const prefLabels = selected
        .map(v => PREFERENCE_LABELS[v])
        .filter(Boolean)
        .join(', ')

      if (!prefLabels) {
        return Response.json({ error: 'No preferences selected' }, { status: 400 })
      }

      const servingsNote = currentServings
        ? `This recipe makes ${currentServings} servings.`
        : 'Use your best judgment for serving size based on the original ingredient quantities.'

      prompt = `You are a professional recipe editor helping a home cook adjust a saved recipe to better match their cooking preferences. Keep the dish recognizable — don't turn it into a completely different recipe. Adjust ingredients, quantities, and methods thoughtfully.

IMPORTANT: Frame every change as a practical home-cook tip — do not provide medical advice or make health claims. When portion or carb adjustments are requested, give clear per-serving notes rather than prescriptive guidance.

Original recipe: ${recipe.title}
${recipe.description ? `Description: ${recipe.description}` : ''}
${servingsNote}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Instructions: ${recipe.instructions}

Cooking preferences from the home cook: make this recipe more ${prefLabels}.

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "title": "Title for the transformed version (can be the same or slightly updated)",
  "description": "A short, cozy note (1-2 sentences) about how this version was adjusted for the selected preferences",
  "ingredients": [{"name": "...", "measure": "..."}],
  "instructions": "Step 1...\\nStep 2...\\nStep 3..."
}`

    } else if (action === 'generate_info') {
      const servingsNote = currentServings
        ? `This recipe makes ${currentServings} servings.`
        : `Estimate the number of servings based on the ingredient quantities.`

      prompt = `Analyze this recipe and generate accurate cooking information.

Recipe: ${recipe.title}
${servingsNote}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Instructions: ${recipe.instructions}

Use the actual ingredients and quantities to estimate nutrition accurately. All nutrition values should be per serving based on the actual serving count.

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
  "servings": ${currentServings || 'null'}
}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text.trim()

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