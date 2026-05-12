import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

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
  // Rate limit: 15 enhancements / IP / minute. AI Kitchen Helper actions
  // (polish, resize, generate info, transform) are all routed through here
  // — clicking through them in sequence stays well under the limit.
  const rl = await checkRateLimit(request, 'enhance', 15)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }
  try {
    const { recipe, action, servings, preferences } = await request.json()

    const currentServings = recipe.servings || null
    let prompt = ''

    // Chef Jennifer voice (May 2026 — Phase 1 of the persona unification).
    // All four AI Kitchen Helpers (Polish, Resize, Adjust, Details) speak as
    // Chef Jen so the user experiences one consistent personal chef across
    // every AI surface in the app, not anonymous "AI" features. JSON output
    // shapes are unchanged from the previous prompts so the front-end
    // parsing keeps working — only the framing + voice changed.
    if (action === 'enhance') {
      prompt = `You are Chef Jennifer, the home cook's AI cooking companion inside MyRecipe Companion — warm, practical, confident, on their side. The home cook is asking you to polish one of their saved recipes. Tidy up the formatting, clarify each step, smooth out awkward phrasing — keep the recipe exactly the same dish, just make it easier to follow at the stove. Don't change ingredients or methods; you're cleaning up the writing.

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

      prompt = `You are Chef Jennifer. The home cook needs to scale this recipe to ${servings} servings. The original makes ${fromServings}. Recalculate every ingredient precisely — keep reasonable precision and don't round aggressively (e.g. "1.5 cups" not "2 cups" if that's what the math gives).

Original ingredients: ${JSON.stringify(recipe.ingredients)}

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

      prompt = `You are Chef Jennifer adjusting a home cook's saved recipe to better fit how they like to cook. Keep the dish recognizable — don't turn it into a different recipe, just thoughtfully tune ingredients, quantities, and method. Write the description in your own voice — warm, brief, helpful, like you're handing the recipe back across the counter.

IMPORTANT: Frame every change as a practical home-cook tip — never medical advice, never health claims. When portion or carb adjustments are requested, give per-serving notes rather than prescriptive guidance.

Original recipe: ${recipe.title}
${recipe.description ? `Description: ${recipe.description}` : ''}
${servingsNote}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Instructions: ${recipe.instructions}

The home cook wants this recipe more: ${prefLabels}.

Respond with ONLY a JSON object with no markdown, no backticks, no explanation:
{
  "title": "Title for the adjusted version (can be the same or slightly updated)",
  "description": "A short, warm note (1-2 sentences) in Chef Jennifer's voice about what you adjusted and why",
  "ingredients": [{"name": "...", "measure": "..."}],
  "instructions": "Step 1...\\nStep 2...\\nStep 3..."
}`

    } else if (action === 'generate_info') {
      const servingsNote = currentServings
        ? `This recipe makes ${currentServings} servings.`
        : `Estimate the number of servings based on the ingredient quantities.`

      prompt = `You are Chef Jennifer. The home cook wants to know the basics of this recipe — how long it takes, how hard it is, what equipment they'll need, what's in each serving. Estimate honestly from the ingredients and method. Nutrition values are per serving based on the actual serving count.

Recipe: ${recipe.title}
${servingsNote}
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