import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/cleanup-list
// Body: { items: [{ id, ingredient, store_id? }], stores?: [{ id, name }] }
// Returns: { items: [{ ingredient, store_id }] } — a cleaned, deduped,
// grocery-shoppable version of the list. Store assignments are preserved
// where possible.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const items = Array.isArray(body?.items) ? body.items : []
  const stores = Array.isArray(body?.stores) ? body.stores : []

  if (items.length === 0) {
    return Response.json({ items: [] })
  }

  // Build a compact, numbered representation that's easy for Claude
  // to reason about without losing the store_id associations.
  const numbered = items.map((it, idx) => ({
    n: idx + 1,
    ingredient: String(it.ingredient || '').trim(),
    store_id: it.store_id || null,
  }))

  const storeLookup = stores.map(s => ({ id: s.id, name: s.name }))

  const prompt = `You are helping a home cook clean up their grocery shopping list so it matches what you actually buy at a store.

Here is the raw list (each entry has a number, a text description, and an optional store_id):
${JSON.stringify(numbered, null, 2)}

Here are the user's stores (for reference only — you can preserve store_id values):
${JSON.stringify(storeLookup, null, 2)}

Clean up the list using these rules:
1. Round fractional store units UP to a whole unit. You cannot buy a fraction of a can, jar, bottle, bag, box, package, carton, loaf, or head. For example "1/4 can tomato paste" → "1 can tomato paste", "1/2 bag spinach" → "1 bag spinach".
2. Remove cooking-only measurements that don't help at the store. Units like tsp, tbsp, pinch, dash, clove, sprig, "to taste" — just keep the ingredient name (with a sensible quantity). For example "2 tbsp olive oil" → "olive oil" or "1 bottle olive oil" only if explicitly called out. When in doubt, drop the measurement and leave just the ingredient.
3. Combine duplicates. If the same base ingredient appears more than once, merge into a single line with the total quantity. For example two entries of "1 can tomatoes" and "2 cans tomatoes" → "3 cans tomatoes".
4. Keep fresh/produce quantities if they're countable (e.g. "3 lemons", "2 onions"). If it's vague, drop the number.
5. Preserve store_id when merging. If all merged entries share the same store_id, keep it. If they conflict, set store_id to null.
6. Keep the ingredient names lowercase-first style (normal sentence case is fine), no bullets, no numbering.
7. Do not invent new items. Only clean up what's there.

Respond with ONLY a valid JSON object — no markdown, no backticks, no commentary:
{
  "items": [
    {"ingredient": "cleaned ingredient text", "store_id": "uuid-or-null"}
  ]
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed || !Array.isArray(parsed.items)) {
      return Response.json({ error: 'Cleanup returned an unexpected shape' }, { status: 500 })
    }

    // Validate / sanitize
    const validStoreIds = new Set(stores.map(s => s.id))
    const cleaned = parsed.items
      .filter(x => x && typeof x.ingredient === 'string' && x.ingredient.trim())
      .map(x => ({
        ingredient: x.ingredient.trim(),
        store_id: x.store_id && validStoreIds.has(x.store_id) ? x.store_id : null,
      }))

    return Response.json({ items: cleaned })
  } catch (err) {
    return Response.json({ error: 'Could not clean up list: ' + err.message }, { status: 500 })
  }
}
