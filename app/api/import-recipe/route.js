import Anthropic from '@anthropic-ai/sdk'
import { YoutubeTranscript } from 'youtube-transcript'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Returns the 11-char video ID from youtu.be, watch?v=, or shorts/embed URLs.
// Returns null for non-YouTube URLs so callers can fall back to HTML scraping.
function extractYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null
    if (u.pathname === '/watch') return u.searchParams.get('v')
    const m = u.pathname.match(/^\/(shorts|embed|v)\/([^/?#]+)/)
    return m ? m[2] : null
  } catch { return null }
}

// Pulls title/channel/description/thumbnail from the YouTube Data API,
// plus the transcript (if captions exist). Returns a single text blob ready
// for the existing Claude prompt, and the best thumbnail URL.
async function fetchYouTubeContent(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

  const metaRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!metaRes.ok) throw new Error(`YouTube API ${metaRes.status}`)
  const metaJson = await metaRes.json()
  const snippet = metaJson.items?.[0]?.snippet
  if (!snippet) throw new Error('Video not found or private')

  const { title, channelTitle, description, thumbnails } = snippet
  const thumbnail =
    thumbnails?.maxres?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ''

  // Transcript is best-effort. Many cooking videos have good auto-captions;
  // some don't have captions at all. We'd rather ship description-only than fail.
  let transcript = ''
  try {
    const chunks = await YoutubeTranscript.fetchTranscript(videoId)
    transcript = chunks.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    // No transcript — we still have the description, which is often enough.
  }

  const content = [
    `Video title: ${title}`,
    `Channel: ${channelTitle}`,
    '',
    'Video description:',
    description || '(none)',
    '',
    'Transcript:',
    transcript || '(no transcript available)',
  ].join('\n')

  return { content, thumbnail }
}

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

// Convert an ISO 8601 duration ("PT15M", "PT1H30M", "P0DT0H30M") to
// a number of minutes. Returns null when the input is missing or
// unparseable. Recipe schema lets sites use either ISO 8601 or a
// raw-number string ("15"); we accept both.
function parseISODuration(input) {
  if (input == null) return null
  const s = String(input).trim()
  if (!s) return null
  // Bare number (sites occasionally send "15" instead of "PT15M").
  const bare = s.match(/^\d+$/)
  if (bare) return parseInt(s, 10)
  const m = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i)
  if (!m) return null
  const days = parseInt(m[1] || '0', 10)
  const hours = parseInt(m[2] || '0', 10)
  const mins = parseInt(m[3] || '0', 10)
  const secs = parseInt(m[4] || '0', 10)
  const total = days * 24 * 60 + hours * 60 + mins + Math.round(secs / 60)
  return total > 0 ? total : null
}

// Pull a number out of a nutrient string ("5g", "320 kcal", "12.5 g").
// Returns a number (rounded to 2 decimals for grams, integer for cal)
// or null if no number is present.
function parseNutrient(input) {
  if (input == null) return null
  if (typeof input === 'number') return input
  const s = String(input)
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return Number.isFinite(n) ? n : null
}

// Pull a number of servings out of recipeYield. Sites send strings like
// "8 servings", "Makes 12", "12", or arrays with both forms. Returns
// the first integer found, capped at 99 so a runaway "12 to 16 servings"
// doesn't store something silly.
function parseYieldServings(input) {
  if (input == null) return null
  const arr = Array.isArray(input) ? input : [input]
  for (const item of arr) {
    if (typeof item === 'number' && Number.isFinite(item)) return Math.min(99, Math.max(1, Math.round(item)))
    const s = String(item || '')
    const m = s.match(/\d+/)
    if (m) return Math.min(99, Math.max(1, parseInt(m[0], 10)))
  }
  return null
}

// Walk the page's JSON-LD blocks and pull the structured fields we
// care about out of any Recipe node. Returns an object whose keys are
// only set when a value was successfully extracted — everything else
// falls back to whatever Claude returns. Same parsing precedence as
// `extractImageUrl`: if the page ships valid JSON-LD with a Recipe,
// we trust it over the model.
function parseRecipeSchema(html) {
  const out = {}
  const scripts = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const script of scripts) {
    if (!script.includes('"Recipe"')) continue
    const json = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
    let parsed
    try { parsed = JSON.parse(json) } catch { continue }
    const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed])
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const t = node['@type']
      const isRecipe = t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
      if (!isRecipe) continue
      const prep = parseISODuration(node.prepTime)
      const cook = parseISODuration(node.cookTime)
      const total = parseISODuration(node.totalTime)
      if (prep) out.prep_time_minutes = prep
      if (cook) out.cook_time_minutes = cook
      // If totalTime missing but prep+cook both present, derive it.
      if (total) out.total_time_minutes = total
      else if (prep && cook) out.total_time_minutes = prep + cook
      const yieldServings = parseYieldServings(node.recipeYield)
      if (yieldServings != null) out.servings = yieldServings
      const nutr = node.nutrition
      if (nutr && typeof nutr === 'object') {
        const cal = parseNutrient(nutr.calories)
        const pro = parseNutrient(nutr.proteinContent)
        const car = parseNutrient(nutr.carbohydrateContent)
        const fat = parseNutrient(nutr.fatContent)
        if (cal != null) out.calories = Math.round(cal)
        if (pro != null) out.protein_g = Math.round(pro * 10) / 10
        if (car != null) out.carbs_g = Math.round(car * 10) / 10
        if (fat != null) out.fat_g = Math.round(fat * 10) / 10
      }
      // First Recipe node wins — most pages only have one.
      return out
    }
  }
  return out
}

// Pulls recipe-shaped content out of a raw HTML page. Prefers JSON-LD
// "Recipe" blocks (most accurate), falls back to stripping all HTML to
// plain text. Used by both the server-side URL-fetch path AND the
// client-supplied HTML fallback path (the iOS Share-Sheet Shortcut sends
// page HTML alongside the URL so we can rescue blocked sites without a
// separate Paste step).
function extractContentFromHtml(html) {
  const jsonLdMatch = html.match(/"@type"\s*:\s*"Recipe"[\s\S]*?(?=<\/script>)/i)
  if (jsonLdMatch) {
    const scriptMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (scriptMatch) {
      for (const script of scriptMatch) {
        if (script.includes('"Recipe"')) {
          return script.replace(/<[^>]*>/g, '')
        }
      }
    }
  }
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000)
}

export async function POST(request) {
  // `html` is the optional client-supplied fallback path: when an iOS
  // Shortcut grabs the page contents in the user's Safari context (which
  // has the user's cookies and bypasses our server-side fetch being
  // blocked), it sends both `url` AND `html`. We try the URL fetch first
  // because it's lighter and gets the canonical og:image; we silently fall
  // through to the supplied HTML only if our fetch fails. The user never
  // sees the difference — A-sites and B-sites both work via the same
  // share-sheet tap.
  const { text, url, html } = await request.json()

  let content = text
  let scrapedImage = ''
  // Direct JSON-LD extractions (timing, nutrition, yield). When present,
  // these override whatever Claude infers. Empty {} when no JSON-LD or
  // the request is text/youtube-only.
  let scrapedSchema = {}

  if (url && !text) {
    // YouTube branch — recipe video URLs (youtu.be, youtube.com/watch, shorts).
    // Uses the Data API for title/description/thumbnail, plus youtube-transcript
    // for captions. Falls through to the HTML scraper for everything else.
    const ytId = extractYouTubeId(url)
    if (ytId) {
      try {
        const yt = await fetchYouTubeContent(ytId)
        // Transcripts can be long; 12k chars is plenty for Claude to extract from.
        content = yt.content.substring(0, 12000)
        scrapedImage = yt.thumbnail
      } catch (err) {
        return Response.json({
          error: 'Could not load YouTube video: ' + err.message,
        }, { status: 400 })
      }
    } else {
      // Try the server-side fetch first. If it succeeds (non-blocked site),
      // we use what came back. If it fails (HTTP 4xx/5xx, network error,
      // timeout) AND the caller supplied `html`, we silently fall through
      // to the HTML payload below.
      let urlSucceeded = false
      let urlError = ''
      try {
        // Use a real-browser User-Agent + standard headers so recipe blogs
        // behind Cloudflare / Sucuri / WP bot protection don't 403 us.
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) {
          urlError = `The site returned ${res.status} ${res.statusText || ''}. This usually means the site is blocking automated fetches. Try a different URL.`
        } else {
          const fetchedHtml = await res.text()
          scrapedImage = extractImageUrl(fetchedHtml, url)
          scrapedSchema = parseRecipeSchema(fetchedHtml)
          content = extractContentFromHtml(fetchedHtml)
          urlSucceeded = true
        }
      } catch (err) {
        urlError = 'Could not fetch URL: ' + err.message
      }

      if (!urlSucceeded) {
        if (html) {
          // Caller (typically the iOS Share-Sheet Shortcut) supplied page
          // HTML because they could fetch it from their browser context
          // when we couldn't from the server. Run the same extraction on
          // it. og:image scraping uses the original URL as the base so
          // relative image URLs in the HTML resolve correctly.
          scrapedImage = scrapedImage || extractImageUrl(html, url)
          scrapedSchema = Object.keys(scrapedSchema).length ? scrapedSchema : parseRecipeSchema(html)
          content = extractContentFromHtml(html)
        } else {
          return Response.json({ error: urlError }, { status: 400 })
        }
      }
    }
  } else if (!url && !text && html) {
    // No URL, no text, but the caller sent HTML — treat that as the source.
    // Image extraction without a base URL keeps absolute URLs and leaves
    // relative ones as-is (rare on og:image / JSON-LD anyway).
    scrapedImage = extractImageUrl(html, '')
    scrapedSchema = parseRecipeSchema(html)
    content = extractContentFromHtml(html)
  }

  if (!content || content.trim().length < 10) {
    return Response.json({ error: 'No content found at that URL' }, { status: 400 })
  }

  // Limit content length
  content = content.substring(0, 8000)

  const prompt = `Extract a recipe from this content. The content may include structured JSON-LD recipe data or plain text. Extract all recipe information accurately.

Content:
${content}

Rules for the output:
- "description" MUST be one short sentence, max ~25 words. If the source has a longer intro, keep only the opening sentence; put any additional context into "family_notes".
- "instructions" MUST use a real newline (\\n) between every step — never one paragraph. If the source has one running paragraph, break it on each sentence so each step is on its own line.
- "ingredients" entries: "measure" is the quantity and unit (e.g. "2 cups", "1 large", "to taste"); "name" is just the ingredient name. If there's no quantity, leave "measure" as an empty string.
- "family_notes" is for anecdotes, tips, source attribution, and any overflow from description. Keep it short.
- "prep_time_minutes" / "cook_time_minutes" / "total_time_minutes": integers in MINUTES. Look for phrases like "Prep Time: 5 minutes", "Cook: 10 min", "Total: 1 hour 15 min", "PT15M". Convert hours to minutes (1 hr 30 min → 90). If a field isn't mentioned in the source, use null. If only prep+cook are present, you may set total = prep + cook.
- "servings": integer count if the source says "Servings: 4" / "Makes 12" / "Yields: 8". Use null if absent.
- "calories": integer per-serving calories. Look for "370kcal", "320 calories", "Calories: 450". Use null if absent.
- "protein_g" / "carbs_g" / "fat_g": numbers (decimals OK) in GRAMS, per serving. Look for "37g protein", "23g fat", "3g carbs", or "Carbohydrates: 12g". Strip the "g" and any unit prefix. Use null if absent.
- If the content is a video transcript (includes "Video title", "Channel", "Transcript"), extract the recipe from what the host actually demonstrates. Ignore sponsor reads, intros, outros, subscribe asks, and personal anecdotes. If measurements are only spoken vaguely (e.g. "about a cup"), reflect that in "measure". Credit the channel in "family_notes" as: Recipe adapted from {Channel} on YouTube. For transcripts, leave timing/nutrition as null unless the host states them explicitly.

Respond with ONLY a valid JSON object, no markdown, no backticks:
{
  "title": "Recipe name",
  "description": "One short sentence.",
  "category": "Main Dish | Side | Dessert | Breakfast | Soup | etc.",
  "ingredients": [
    {"name": "ingredient name", "measure": "amount and unit"}
  ],
  "instructions": "Step 1 text\\nStep 2 text\\nStep 3 text",
  "tags": ["tag1", "tag2", "tag3"],
  "family_notes": "",
  "image": "https://… main recipe image URL if present in the content, otherwise empty string",
  "prep_time_minutes": null,
  "cook_time_minutes": null,
  "total_time_minutes": null,
  "servings": null,
  "calories": null,
  "protein_g": null,
  "carbs_g": null,
  "fat_g": null
}

For "tags": pick 2–4 short lowercase words from this curated set when they fit the recipe — meal: breakfast, lunch, dinner, dessert, side, snack — food groups: chicken, beef, seafood, pasta, vegetarian — style: quick, comfort, healthy, baking, holiday. Don't invent tags outside this list unless the recipe genuinely needs one.

If no recipe is found, return exactly: {"error": "No recipe found"}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()
    // Strip any markdown fences the model might still wrap the JSON in.
    const stripped = responseText.replace(/```json|```/g, '').trim()

    // Robustly extract the first balanced JSON object from the response.
    // Some pages nudge the model into a preamble ("Here is the recipe:…") or
    // a trailing explanation, which made the naive JSON.parse fail with
    // "Unexpected non-whitespace character after JSON at position N".
    // Walk through, find the first `{`, then balance braces while ignoring
    // braces that appear inside strings. Stop at the matching close brace.
    function extractFirstJsonObject(src) {
      const start = src.indexOf('{')
      if (start === -1) return null
      let depth = 0
      let inString = false
      let escape = false
      for (let i = start; i < src.length; i++) {
        const ch = src[i]
        if (inString) {
          if (escape) { escape = false; continue }
          if (ch === '\\') { escape = true; continue }
          if (ch === '"') inString = false
          continue
        }
        if (ch === '"') { inString = true; continue }
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) return src.slice(start, i + 1)
        }
      }
      return null
    }

    const candidate = extractFirstJsonObject(stripped) || stripped
    let result
    try {
      result = JSON.parse(candidate)
    } catch (parseErr) {
      // Surface a helpful snippet so we can see what the model actually said.
      const snippet = responseText.slice(0, 200).replace(/\s+/g, ' ')
      return Response.json({
        error: `Could not parse recipe: ${parseErr.message}. Response started with: "${snippet}${responseText.length > 200 ? '…' : ''}"`
      }, { status: 500 })
    }

    // Prefer a directly scraped og:image/JSON-LD image (more reliable than
    // asking the model to pick one), fall back to whatever Claude returned.
    if (!result.error) {
      result.image = scrapedImage || result.image || ''

      // Structured fields from JSON-LD (timing + nutrition + servings)
      // — the whole point of upgrade #1. We trust the site's labeled
      // data over anything Claude might have inferred. Only set fields
      // when scrapedSchema actually has them; null/missing entries are
      // skipped so the UI knows to hide that pill rather than show "0".
      if (scrapedSchema.prep_time_minutes != null) result.prep_time_minutes = scrapedSchema.prep_time_minutes
      if (scrapedSchema.cook_time_minutes != null) result.cook_time_minutes = scrapedSchema.cook_time_minutes
      if (scrapedSchema.total_time_minutes != null) result.total_time_minutes = scrapedSchema.total_time_minutes
      if (scrapedSchema.servings != null) result.servings = scrapedSchema.servings
      if (scrapedSchema.calories != null) result.calories = scrapedSchema.calories
      if (scrapedSchema.protein_g != null) result.protein_g = scrapedSchema.protein_g
      if (scrapedSchema.carbs_g != null) result.carbs_g = scrapedSchema.carbs_g
      if (scrapedSchema.fat_g != null) result.fat_g = scrapedSchema.fat_g

      // Belt-and-suspenders post-processing — the model usually honors the
      // prompt, but some sites push it into overlong descriptions or one
      // giant instructions paragraph. Normalize here so the edit form
      // doesn't inherit the mess.

      // 1. Keep description short; dump overflow into family_notes.
      const DESC_MAX = 200
      if (typeof result.description === 'string' && result.description.length > DESC_MAX) {
        const firstSentenceMatch = result.description.match(/^[^.!?]+[.!?]/)
        const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : result.description.slice(0, DESC_MAX).trim()
        const overflow = result.description.slice(firstSentence.length).trim()
        result.description = firstSentence
        if (overflow) {
          const existing = (result.family_notes || '').trim()
          result.family_notes = existing
            ? `${existing}\n\nFrom the original post: ${overflow}`
            : `From the original post: ${overflow}`
        }
      }

      // 2. If instructions came back as one paragraph, split on sentence
      //    boundaries so every step gets its own line.
      if (typeof result.instructions === 'string') {
        const inst = result.instructions.trim()
        if (inst && !inst.includes('\n')) {
          const steps = inst
            .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
            .map(s => s.trim())
            .filter(Boolean)
          if (steps.length > 1) result.instructions = steps.join('\n')
        }
      }
    }
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: 'Could not parse recipe: ' + err.message }, { status: 500 })
  }
}