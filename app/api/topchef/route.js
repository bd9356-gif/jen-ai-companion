import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { findCachedRecipe, bumpServeCount } from '@/lib/chef_recipe_cache'

// Normalize instructions to a newline-separated string. Tolerates
// either an array (preferred shape from the prompt) or a numbered
// blob string (legacy / occasional model drift).
function normalizeInstructions(value) {
  if (Array.isArray(value)) {
    return value
      .map(s => String(s).trim().replace(/^\s*\d+[\.\)]\s*/, ''))
      .filter(Boolean)
      .join('\n')
  }
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s.includes('\n') && /\s\d+[\.\)]\s/.test(s)) {
      return s
        .split(/\s(?=\d+[\.\)]\s)/)
        .map(p => p.replace(/^\s*\d+[\.\)]\s*/, '').trim())
        .filter(Boolean)
        .join('\n')
    }
    return s
  }
  return ''
}

export async function POST(request) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const body = await request.json()
    const cuisine = body.cuisine || 'International'
    const difficulty = body.difficulty || 'Intermediate'
    const prompt = body.prompt || `Create a ${difficulty} level ${cuisine} recipe that would impress dinner guests.`

    // ── Stage 2: try the corpus first.
    // chef_recipes grows on every fresh generation; if a previous
    // tap produced a recipe close to this request, riff on it
    // instead of burning a from-scratch call. The model sees the
    // base recipe + the user's new request and adapts.
    const base = await findCachedRecipe(prompt, cuisine)
    if (base) {
        const adaptText = `You are adapting an existing recipe to better fit a user's request. Keep most of the recipe intact — vary 2–4 ingredients, adjust the title to reflect the change, and rewrite the description in 1–2 short sentences. The result should still feel like a variation of the base, not a totally different dish.

USER REQUEST: "${prompt}"

BASE RECIPE:
${JSON.stringify({
  title: base.title,
  description: base.description,
  cuisine: base.cuisine,
  difficulty: base.difficulty,
  ingredients: base.ingredients,
  instructions: base.instructions,
}, null, 2)}

FIRST, decide if the user's request is actually a request for a cooking recipe or food. If the request is NOT about cooking, food, ingredients, or eating — for example a joke, a random non-food question, a request for a poem, code, weather, or anything outside the kitchen — respond with ONLY JSON in this shape and nothing else:
{"refusal":"<one warm, friendly sentence in Chef Jennifer's voice that politely redirects the user to send a cooking or recipe request instead>"}

Otherwise respond with ONLY JSON in this exact shape — no prose, no markdown fences:
{"title":"","description":"","cuisine":"${base.cuisine}","difficulty":"${base.difficulty}","ingredients":[{"name":"","measure":""}],"instructions":["step 1 as a full sentence","step 2 as a full sentence","..."]}

Rules: instructions are an ARRAY of strings (not a paragraph, not numbered prefixes). Aim for 6–12 steps.`

        let recipe = null
        try {
            const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1500,
                messages: [{ role: 'user', content: adaptText }],
            })
            recipe = JSON.parse(message.content[0].text.trim().replace(/```json|```/g, '').trim())
        } catch (e) {
            // Adaptation failed — return the base recipe directly so
            // the user still gets a usable result. Worst-case the
            // user sees the same recipe they (or someone) saw before;
            // never an error.
            recipe = {
                title: base.title,
                description: base.description,
                cuisine: base.cuisine,
                difficulty: base.difficulty,
                ingredients: base.ingredients,
                instructions: base.instructions,
            }
        }

        // Topic-guard refusal path. The adapt prompt instructs the model
        // to return `{refusal:"…"}` when the user's request isn't really
        // a cooking ask (e.g. joke, random question). When that happens
        // we return the refusal as-is, do NOT bump serve count, and do
        // NOT fall back to the base recipe — the refusal is the right
        // outcome. The page renders it as a prose bubble.
        if (recipe && recipe.refusal && !recipe.title) {
            return Response.json({ recipe: { refusal: recipe.refusal }, source: 'refusal' })
        }

        recipe.instructions = normalizeInstructions(recipe.instructions)

        // Bookkeeping — bump the base's serve counter. We deliberately
        // do NOT insert the adapted variant: it shares structure with
        // the base and re-saving would bloat the corpus and double-
        // count popularity. Stage 3 will use times_served to gate
        // pure-cache pulls (no AI call at all).
        await bumpServeCount(supabase, base.id, base.times_served)

        return Response.json({ recipe, source: 'cache' })
    }

    // ── Cache miss: original fresh-generation path.
    // Topic guard is baked into the prompt — model returns a refusal
    // JSON for non-cooking requests (jokes, random questions, etc.)
    // and a recipe JSON otherwise. Single-call classifier-and-respond
    // pattern keeps cost flat. Refusals skip the chef_recipes INSERT
    // so non-cooking prompts don't pollute the corpus.
    const freshPrompt = `${prompt}

FIRST, decide if this is actually a request for a cooking recipe or food. If the request is NOT about cooking, food, ingredients, or eating — for example a joke, a random non-food question, a request for a poem, code, weather, or anything outside the kitchen — respond with ONLY JSON in this shape and nothing else:
{"refusal":"<one warm, friendly sentence in Chef Jennifer's voice that politely redirects the user to send a cooking or recipe request instead>"}

Otherwise respond with ONLY JSON in this exact shape — no prose, no markdown fences:
{"title":"","description":"","cuisine":"${cuisine}","difficulty":"${difficulty}","ingredients":[{"name":"","measure":""}],"instructions":["step 1 as a full sentence","step 2 as a full sentence","..."]}

Rules for instructions: return an ARRAY of strings (not one paragraph, not numbered "1." prefixes). Each array item is ONE step — short, clear, complete sentence. Aim for 6–12 steps.`

    const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: freshPrompt }]
    })
    const recipe = JSON.parse(message.content[0].text.trim().replace(/```json|```/g, '').trim())

    // Refusal short-circuit — same shape the page handles for the
    // adapt path. Don't INSERT into chef_recipes (we don't want
    // refusals showing up as cache candidates for future prompts).
    if (recipe && recipe.refusal && !recipe.title) {
        return Response.json({ recipe: { refusal: recipe.refusal }, source: 'refusal' })
    }

    recipe.instructions = normalizeInstructions(recipe.instructions)

    const { data, error } = await supabase.from('chef_recipes').insert({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, instructions: recipe.instructions, difficulty: recipe.difficulty, cuisine: recipe.cuisine, ai_prompt: body.prompt || `${cuisine} ${difficulty}` }).select().single()
    if (error) return Response.json({ recipe, source: 'fresh' }, { status: 200 })
    return Response.json({ recipe: data, source: 'fresh' })
}
