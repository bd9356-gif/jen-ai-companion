import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Best-effort image URL extraction from page HTML.
// Prefers JSON-LD recipe image, then og:image, then twitter:image.
function extractImageUrl(html, baseUrl) {
  const candidates = []

  // JSON-LD recipe "image" field — can be a string, array, or ImageObject
  const scripts = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const script of scripts) {
    if (!script.includes('"Recipe"')) continue
    const json = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
    try {
      const parsed = JSON.parse(json)
      const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed])
      for (const node of nodes) {
        if (!node || node['@type'] !== 'Recipe') continue
        const img = node.image
        if (typeof img === 'string') { candidates.push(img); break }
        if (Array.isArray(img) && img.length) {
          const first = typeof img[0] === 'string' ? img[0] : img[0]?.url
          if (first) { candidates.push(first); break }
        }
        if (img && typeof img === 'object' && img.url) { candidates.push(img.url); break }
      }
      if (candidates.length) break
    } catch {
      // If JSON.parse fails, fall through to meta-tag scraping
    }
  }

  // og:image / twitter:image
  const metaRegex = /<meta[^>]+(?:property|name)=["'](og:image|og:image:url|twitter:image)["'][^>]*content=["']([^"']+)["']/gi
  let m
  while ((m = metaRegex.exec(html)) !== null) {
    candidates.push(m[2])
  }
  // Also handle content-before-property ordering
  const metaRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](og:image|og:image:url|twitter:image)["']/gi
  while ((m = metaRegex2.exec(html)) !== null) {
    candidates.push(m[1])
  }

  const first = candidates.find(Boolean)
  if (!first) return ''
  try { return new URL(first, baseUrl).toString() } catch { return first }
}

export async function POST(request) {
  const { text, url } = await request.json()

  let content = text
  let scrapedImage = ''

  if (url && !text) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)' },
        signal: AbortSignal.timeout(10000)
      })
      const html = await res.text()

      // Grab the best available image up front — independent of the content path
      scrapedImage = extractImageUrl(html, url)

      // First try to extract JSON-LD schema recipe data (most reliable)
      const jsonLdMatch = html.match(/"@type"\s*:\s*"Recipe"[\s\S]*?(?=<\/script>)/i)
      if (jsonLdMatch) {
        // Found structured recipe data - extract just that part
        const scriptMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
        if (scriptMatch) {
          for (const script of scriptMatch) {
            if (script.includes('"Recipe"')) {
              content = script.replace(/<[^>]*>/g, '')
              break
            }
          }
        }
      } else {
        // Fall back to stripping HTML
        content = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000)
      }
    } catch (err) {
      return Response.json({ error: 'Could not fetch URL: ' + err.message }, { status: 400 })
    }
  }

  if (!content || content.trim().length < 10) {
    return Response.json({ error: 'No content found at that URL' }, { status: 400 })
  }

  // Limit content length
  content = content.substring(0, 8000)

  const prompt = `Extract a recipe from this content. The content may include structured JSON-LD recipe data or plain text. Extract all recipe information accurately.

Content:
${content}

Respond with ONLY a valid JSON object, no markdown, no backticks:
{
  "title": "Recipe name",
  "description": "Brief 1-2 sentence description",
  "ingredients": [
    {"name": "ingredient name", "measure": "amount and unit"}
  ],
  "instructions": "Step 1 text\\nStep 2 text\\nStep 3 text",
  "category": "e.g. Dessert, Main, Side, Breakfast, Pasta",
  "tags": ["tag1", "tag2", "tag3"],
  "family_notes": "",
  "image": "https://… main recipe image URL if present in the content, otherwise empty string"
}

If no recipe is found, return exactly: {"error": "No recipe found"}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()
    const clean = responseText.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    // Prefer a directly scraped og:image/JSON-LD image (more reliable than
    // asking the model to pick one), fall back to whatever Claude returned.
    if (!result.error) {
      result.image = scrapedImage || result.image || ''
    }
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: 'Could not parse recipe: ' + err.message }, { status: 500 })
  }
}