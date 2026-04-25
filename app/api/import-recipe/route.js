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

export async function POST(request) {
  const { text, url } = await request.json()

  let content = text
  let scrapedImage = ''

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
    try {
      // Use a real-browser User-Agent + standard headers so recipe blogs
      // behind Cloudflare / Sucuri / WP bot protection don't 403 us. Our
      // previous "RecipeBot/1.0" UA was getting blocked outright by big
      // sites (e.g. natashaskitchen.com), which returned challenge pages
      // with no recipe data and caused the model to report "No recipe found".
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })
      const html = await res.text()

      // Surface HTTP-level blocks clearly — otherwise we try to extract a
      // recipe from a 403/503 body and the user just sees "No recipe found".
      if (!res.ok) {
        return Response.json({
          error: `The site returned ${res.status} ${res.statusText || ''}. This usually means the site is blocking automated fetches. Try a different URL.`,
        }, { status: 400 })
      }

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
- If the content is a video transcript (includes "Video title", "Channel", "Transcript"), extract the recipe from what the host actually demonstrates. Ignore sponsor reads, intros, outros, subscribe asks, and personal anecdotes. If measurements are only spoken vaguely (e.g. "about a cup"), reflect that in "measure". Credit the channel in "family_notes" as: Recipe adapted from {Channel} on YouTube.

Respond with ONLY a valid JSON object, no markdown, no backticks:
{
  "title": "Recipe name",
  "description": "One short sentence.",
  "ingredients": [
    {"name": "ingredient name", "measure": "amount and unit"}
  ],
  "instructions": "Step 1 text\\nStep 2 text\\nStep 3 text",
  "tags": ["tag1", "tag2", "tag3"],
  "family_notes": "",
  "image": "https://… main recipe image URL if present in the content, otherwise empty string"
}

For "tags": pick 2–4 short lowercase words from this curated set when they fit the recipe — meal: breakfast, dinner, dessert, side, snack — protein: chicken, beef, fish, veg — style: quick, comfort, healthy, baking, holiday. Don't invent tags outside this list unless the recipe genuinely needs one.

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