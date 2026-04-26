import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const body = await request.json()
    const cuisine = body.cuisine || 'International'
    const difficulty = body.difficulty || 'Intermediate'
    const prompt = body.prompt || `Create a ${difficulty} level ${cuisine} recipe that would impress dinner guests.`
    const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: `${prompt}\n\nRespond with ONLY JSON in this exact shape — no prose, no markdown fences:\n{"title":"","description":"","cuisine":"${cuisine}","difficulty":"${difficulty}","ingredients":[{"name":"","measure":""}],"instructions":["step 1 as a full sentence","step 2 as a full sentence","..."]}\n\nRules for instructions: return an ARRAY of strings (not one paragraph, not numbered "1." prefixes). Each array item is ONE step — short, clear, complete sentence. Aim for 6–12 steps.` }]
    })
    const recipe = JSON.parse(message.content[0].text.trim().replace(/```json|```/g, '').trim())
    // Normalize instructions to a newline-separated string for storage (schema is text),
    // while tolerating either an array (new prompt) or a string (legacy).
    if (Array.isArray(recipe.instructions)) {
        recipe.instructions = recipe.instructions
            .map(s => String(s).trim().replace(/^\s*\d+[\.\)]\s*/, ''))
            .filter(Boolean)
            .join('\n')
    } else if (typeof recipe.instructions === 'string') {
        // Best-effort repair: if the model returned one long "1. ... 2. ..." blob, split it.
        const s = recipe.instructions.trim()
        if (!s.includes('\n') && /\s\d+[\.\)]\s/.test(s)) {
            recipe.instructions = s
                .split(/\s(?=\d+[\.\)]\s)/)
                .map(p => p.replace(/^\s*\d+[\.\)]\s*/, '').trim())
                .filter(Boolean)
                .join('\n')
        }
    }
    const { data, error } = await supabase.from('chef_recipes').insert({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, instructions: recipe.instructions, difficulty: recipe.difficulty, cuisine: recipe.cuisine, ai_prompt: body.prompt || `${cuisine} ${difficulty}` }).select().single()
    if (error) return Response.json({ recipe }, { status: 200 })
    return Response.json({ recipe: data })
}
