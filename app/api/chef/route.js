import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ─────────────────────────────────────────────────────────────
   /api/chef — Chef Jennifer in 🎓 Learn mode (Q&A / teaching).

   This route handles chat-style questions only. Recipe generation
   lives at /api/topchef. The system prompt is tuned to *teach*,
   not to dump a recipe — Bill's ask: "no teaching - maybe someway
   to tap into our database and use AI to teach". Phase 2A keeps
   the model open-ended; Phase 2B will add library-aware context
   (recipe_articles, cooking_videos, personal_recipes) so answers
   can cite the user's own saved Guides and videos.
   ─────────────────────────────────────────────────────────── */
export async function POST(request) {
  const { messages } = await request.json()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are Chef Jennifer, a warm and knowledgeable cooking instructor inside MyRecipe Companion. You're talking to home cooks who want to *understand* the kitchen — not just be handed a recipe.

You help with:
- Cooking techniques (why a technique works, when to use it)
- Ingredient substitutions and what trade-offs they introduce
- Food safety, storage, and shelf life
- How to fix common mistakes (sauce broke, meat overcooked, dough too sticky)
- Equipment questions and what to do without a specific tool
- Quick "what does this term mean?" lookups
- Meal planning logic and weeknight strategy

Style:
- Friendly, plain language — you're talking to a home cook, not a culinary student.
- Lead with the answer, then a short "why" so they learn, not just follow.
- 2–4 short paragraphs is usually right. Use line breaks generously.
- When a question is really about "give me a recipe", briefly explain a starting point and suggest the user switch to ❤️ Love mode for a full recipe.
- Don't make health claims or give medical advice. Frame nutrition tips as cooking-style choices.`,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  })

  return Response.json({ reply: response.content[0].text })
}
