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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: `${prompt}\n\nRespond with ONLY JSON: {"title":"","description":"","cuisine":"${cuisine}","difficulty":"${difficulty}","ingredients":[{"name":"","measure":""}],"instructions":""}` }]
    })
    const recipe = JSON.parse(message.content[0].text.trim().replace(/```json|```/g, '').trim())
    const { data, error } = await supabase.from('chef_recipes').insert({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, instructions: recipe.instructions, difficulty: recipe.difficulty, cuisine: recipe.cuisine, ai_prompt: body.prompt || `${cuisine} ${difficulty}` }).select().single()
    if (error) return Response.json({ recipe }, { status: 200 })
    return Response.json({ recipe: data })
}
