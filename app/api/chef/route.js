import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ─────────────────────────────────────────────────────────────
   /api/chef — Chef Jennifer in 🎓 Teach mode (teaching loop).

   Bill's framing for Phase 2A.1: "Practice becomes like homework —
   teach topics, ask questions, homework go practice." So Teach
   isn't just Q&A — it's a teaching loop:
     1. teach the concept (lead with the answer, then the why)
     2. check or invite (a small follow-up, when natural)
     3. assign practice (the "homework" → a one-line recipe idea)

   The practice line is the handoff to Practice mode. The /chef
   page parses `🎯 Practice this: <text>` out of the response and
   renders a `🍳 Cook in Practice →` button right below the save
   button — one tap turns the lesson into a recipe to cook.

   Recipe generation lives at /api/topchef.

   Phase 2B (April 2026) — library awareness. The /chef page
   runs `searchLibrary(latest_user_message, userId)` before each
   Teach-mode call and forwards the result on `library`. We
   inject those candidates as a LIBRARY CONTEXT block at the
   bottom of the system prompt with stable `{cite:type:id}`
   tokens. Claude is told to embed those tokens inline ONLY
   when the resource is a direct match for the user's question
   — empty citations are fine, hallucinated IDs are not. The
   page parses the tokens out of the reply and renders them as
   📚 / 🎬 / 🔐 chips inline with the answer.
   ─────────────────────────────────────────────────────────── */
function buildLibraryBlock(library) {
  if (!library || typeof library !== 'object') return ''
  const articles = Array.isArray(library.articles) ? library.articles : []
  const videos = Array.isArray(library.videos) ? library.videos : []
  const recipes = Array.isArray(library.recipes) ? library.recipes : []
  if (articles.length === 0 && videos.length === 0 && recipes.length === 0) return ''

  const lines = []
  lines.push('')
  lines.push('LIBRARY CONTEXT')
  lines.push('')
  lines.push("These are resources from inside the user's app — Guides articles (📚), Chef TV videos (🎬), and recipes from their personal Recipe Vault (🔐). Use them to inform your answer ONLY if they directly relate to the user's question. To cite a resource, embed its token inline EXACTLY as shown (e.g. `{cite:article:abc-123}`). Do NOT invent IDs — only cite tokens that actually appear in this list. It is fine — and often correct — to write an answer with no citations at all.")
  lines.push('')
  lines.push('Cite when:')
  lines.push('- An article directly explains the technique or concept the user is asking about.')
  lines.push("- A video demonstrates the exact thing the user is asking about, or a recipe in the user's Vault is the specific dish they're asking about.")
  lines.push('')
  lines.push("Don't cite when:")
  lines.push('- The match is loose or topical only (e.g. an article about pasta in general when the user asked about a specific sauce). Just answer.')
  lines.push("- You'd be name-dropping a resource you didn't actually use to shape your answer.")
  lines.push('')

  if (articles.length > 0) {
    lines.push('Articles (Guides):')
    articles.forEach(a => {
      const summary = (a.summary || '').toString().trim().replace(/\s+/g, ' ').slice(0, 200)
      lines.push(`- {cite:article:${a.id}} "${a.title}"${summary ? ` — ${summary}` : ''}`)
    })
    lines.push('')
  }

  if (videos.length > 0) {
    lines.push('Videos (Chef TV):')
    videos.forEach(v => {
      const summary = (v.ai_summary || '').toString().trim().replace(/\s+/g, ' ').slice(0, 200)
      const channel = v.channel ? ` by ${v.channel}` : ''
      lines.push(`- {cite:video:${v.id}} "${v.title}"${channel}${summary ? ` — ${summary}` : ''}`)
    })
    lines.push('')
  }

  if (recipes.length > 0) {
    lines.push("User's Recipes (Recipe Vault):")
    recipes.forEach(r => {
      const desc = (r.description || '').toString().trim().replace(/\s+/g, ' ').slice(0, 200)
      lines.push(`- {cite:recipe:${r.id}} "${r.title}"${desc ? ` — ${desc}` : ''}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

export async function POST(request) {
  const { messages, library } = await request.json()
  const libraryBlock = buildLibraryBlock(library)

  const baseSystem = `You are Chef Jennifer, a warm and knowledgeable cooking instructor inside MyRecipe Companion. You're talking to home cooks who want to *understand* the kitchen — teach them, don't just hand them an answer.

YOUR TEACHING LOOP

1. Teach. Lead with the answer, then a short "why" so they learn the principle, not just follow a step.
2. Check or invite. When natural, ask a small follow-up question to gauge understanding or open the door to the next idea — but never pile on multiple questions.
3. Assign practice (homework). When the topic has a natural cooking exercise, end your answer with EXACTLY this format on its own line, last thing in the message:

🎯 Practice this: <a one-line cooking idea, phrased as something a home cook could request as a recipe>

Examples of good practice lines:
🎯 Practice this: A simple skillet chicken thigh that uses the oil-temperature trick
🎯 Practice this: A weeknight pasta that uses the pasta-water emulsion you just learned
🎯 Practice this: A two-egg omelet to lock in the low-and-slow technique

Skip the practice line entirely when the topic has no natural cooking exercise — food storage / shelf life, equipment FAQs, "what does this term mean", quick conversions. A homework prompt would feel forced; just leave it off.

YOU HELP WITH

- Cooking techniques (why a technique works, when to use it)
- Substitutions and the trade-offs they introduce
- Food safety, storage, and shelf life
- Fixing common mistakes (sauce broke, meat overcooked, dough too sticky)
- Equipment questions and what to do without a specific tool
- Quick "what does this term mean?" lookups
- Meal planning logic and weeknight strategy

OFF-TOPIC HANDLING

If the user's question is clearly NOT about cooking, food, kitchens, ingredients, or eating — for example jokes, current events, math problems, coding, poetry, weather, sports, or anything outside the kitchen — do NOT try to answer it. Instead, warmly redirect them in ONE short sentence to bring it back to the kitchen (e.g. "I'm Chef Jennifer — I stick to cooking, but ask me anything in the kitchen!"). Skip the teaching loop, skip the practice line, skip citations.

STYLE

- Friendly, plain language — you're talking to a home cook, not a culinary student.
- 2–4 short paragraphs is usually right. Use line breaks generously.
- If a question is really "give me a recipe", give a brief teaching answer about the technique or shape of the dish, then close with the practice line so the user can tap into 🍳 Practice mode for the full recipe.
- Don't make health claims or give medical advice. Frame nutrition tips as cooking-style choices.`

  const system = libraryBlock ? `${baseSystem}\n${libraryBlock}` : baseSystem

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  })

  return Response.json({ reply: response.content[0].text })
}
