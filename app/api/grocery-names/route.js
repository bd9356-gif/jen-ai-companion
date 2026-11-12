import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'
import { modelOptions, replyText } from '@/lib/claude_model'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/grocery-names — the iOS Shopping List's grocery helper (Nov 2026 redesign).
// The shopping list is now one reusable master list of grocery PRODUCTS ("Chicken Breasts"),
// not recipe lines ("¾ lb boneless chicken breasts"). This route turns recipe lines into
// product names and spots likely duplicates. It never changes anything itself: the app
// shows the result and the customer decides.
//
// mode 'import' — adding recipe ingredients to the list.
//   Body:    { mode: 'import', lines: ["¾ lb chicken breasts", ...], existing: [{ id, name }] }
//   Returns: { items: [{ line, name, match_id }] }   match_id = an existing item that is the
//            same product (so no duplicate is created), or null.
//
// mode 'tidy' — the AI Tidy button: suggestions for the whole list, shown for review.
//   Body:    { mode: 'tidy', items: [{ id, name }] }
//   Returns: { suggestions: [{ ids: [...], name }] }  one id = rename it; several ids = the
//            same product listed more than once (merge into one, named `name`).

const RULES = `What counts as a grocery product name:
- What a shopper looks for in the store, in Title Case, usually plural for countable things: "Chicken Breasts", "Onions", "Olive Oil", "Linguine", "Eggs", "Garlic".
- No quantities, sizes or cooking units (lb, oz, cup, tbsp, tsp, clove, pinch, "to taste").
- No prep words (chopped, diced, minced, sliced, softened, divided, at room temperature) and no notes in parentheses.
- Drop descriptors that don't change what you buy ("boneless skinless", "fresh", "dry", "large", "yellow" for onions, "extra virgin" for olive oil).
- Keep words that DO change the product: Whole Milk vs Skim Milk, Chicken Breasts vs Chicken Thighs, Garlic vs Garlic Powder, Brown Sugar vs Sugar, Unsalted Butter is just Butter.
- "EVOO" is Olive Oil. "Chicken Breast" and "Chicken Breasts" are the same product.
- Never treat different products as the same. When unsure, they are different.`

function parseJson(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON in reply')
  return JSON.parse(clean.slice(start, end + 1))
}

const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request) {
  const rl = await checkRateLimit(request, 'grocery', 20)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const mode = body?.mode === 'tidy' ? 'tidy' : 'import'

  try {
    if (mode === 'import') {
      const lines = (Array.isArray(body?.lines) ? body.lines : []).map((l) => str(l, 200)).filter(Boolean).slice(0, 80)
      const existing = (Array.isArray(body?.existing) ? body.existing : [])
        .map((e) => ({ id: str(e?.id, 60), name: str(e?.name) })).filter((e) => e.id && e.name).slice(0, 400)
      if (lines.length === 0) return Response.json({ items: [] })

      const prompt = `A home cook is adding recipe ingredients to their reusable grocery list. Turn each recipe line into the grocery product name, and say whether it is already on their list.

${RULES}

Recipe lines (numbered):
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Products already on their list (id: name):
${existing.length ? existing.map((e) => `${e.id}: ${e.name}`).join('\n') : '(none)'}

For every recipe line, in order, give the product name and match_id = the id of the existing product that is the SAME product (or null if none is clearly the same).
Respond with ONLY JSON, no commentary:
{"items":[{"n":1,"name":"Chicken Breasts","match_id":null}]}`

      const message = await anthropic.messages.create({ ...modelOptions(), max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
      const parsed = parseJson(replyText(message))
      const validIds = new Set(existing.map((e) => e.id))
      const byN = new Map((Array.isArray(parsed?.items) ? parsed.items : []).map((x) => [Number(x?.n), x]))
      const items = lines.map((line, i) => {
        const x = byN.get(i + 1)
        const name = str(x?.name)
        const match = str(x?.match_id, 60)
        return { line, name: name || null, match_id: match && validIds.has(match) ? match : null }
      })
      return Response.json({ items })
    }

    // tidy
    const items = (Array.isArray(body?.items) ? body.items : [])
      .map((e) => ({ id: str(e?.id, 60), name: str(e?.name, 200) })).filter((e) => e.id && e.name).slice(0, 400)
    if (items.length === 0) return Response.json({ suggestions: [] })

    const prompt = `A home cook keeps one reusable grocery list. Suggest how to tidy it: rename entries that read like recipe lines into grocery product names, and point out entries that are the same product listed more than once.

${RULES}

Their list (id: text):
${items.map((e) => `${e.id}: ${e.name}`).join('\n')}

Only include entries that need a change. A suggestion with one id renames that entry. A suggestion with several ids means they are the same product and would become one entry with that name. Leave entries that are already fine out entirely. Do not invent items.
Respond with ONLY JSON, no commentary:
{"suggestions":[{"ids":["<id>"],"name":"Olive Oil"}]}`

    const message = await anthropic.messages.create({ ...modelOptions(), max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    const parsed = parseJson(replyText(message))
    const nameById = new Map(items.map((e) => [e.id, e.name]))
    const used = new Set()
    const suggestions = []
    for (const s of Array.isArray(parsed?.suggestions) ? parsed.suggestions : []) {
      const name = str(s?.name)
      const ids = [...new Set((Array.isArray(s?.ids) ? s.ids : []).map((id) => str(id, 60)))]
        .filter((id) => nameById.has(id) && !used.has(id))
      if (!name || ids.length === 0) continue
      // A one-item "rename" to the same text isn't a change.
      if (ids.length === 1 && nameById.get(ids[0]) === name) continue
      ids.forEach((id) => used.add(id))
      suggestions.push({ ids, name })
    }
    return Response.json({ suggestions })
  } catch (err) {
    return Response.json({ error: 'Could not tidy the list: ' + err.message }, { status: 500 })
  }
}
