import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { text, url } = await request.json()

  let content = text

  // If URL provided, try to fetch it
  if (url && !text) {
    try {
      const res = await fetch(url)
      content = await res.text()
      // Strip HTML tags
      content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      content = content.substring(0, 5000) // Limit length
    } catch {
      return Response.json({ error: 'Could not fetch URL' }, { status: 400 })
    }
  }

  const prompt = `Extract a recipe from this text. Clean it up and format it properly.

Text:
${content}

Respond with ONLY a JSON object:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient name", "measure": "amount and unit"}
  ],
  "instructions": "Step 1...\\nStep 2...\\nStep 3...",
  "category": "e.g. Dessert, Main, Side, Breakfast",
  "tags": ["tag1", "tag2", "tag3"],
  "family_notes": "Any personal notes found in the text (optional)"
}

If you cannot find a recipe, return: {"error": "No recipe found"}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text2 = message.content[0].text.trim()
  const clean = text2.replace(/```json|```/g, '').trim()
  const result = JSON.parse(clean)

  return Response.json(result)
}