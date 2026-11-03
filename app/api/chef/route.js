import Anthropic from '@anthropic-ai/sdk'
import { modelOptions, replyText } from '@/lib/claude_model'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ─────────────────────────────────────────────────────────────
   /api/chef — Chef Jennifer's Talk conversation (iPhone 💬 Talk,
   web 🎓 Teach).

   Nov 2026 refinement: "Have a conversation, not a lecture." She
   answers first and sizes the answer to the question; teaching,
   follow-up questions and the recipe line are used only when they
   help. The old always-on teaching loop (teach → check → homework)
   was retired.

   The recipe line `🎯 Practice this: <request>` is offered only when
   the cook wants to make a dish. The iPhone app turns it into a
   🍳 Create Recipe button and the /chef page into 🍳 Create Recipe →;
   both fill the request into Create for review. Keep the marker text
   unchanged: both clients parse it.

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
  // Rate limit: 30 chat calls / IP / minute. A real user holding a
  // conversation tops out around 5/min; 30 leaves headroom for
  // legitimate burst use and blocks runaway loops + cheap abuse.
  const rl = await checkRateLimit(request, 'chef', 30)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { messages, library } = await request.json()
  const libraryBlock = buildLibraryBlock(library)

  const baseSystem = `You are Chef Jennifer, a warm, knowledgeable cooking companion inside MyRecipe Companion. You're talking with home cooks. Have a conversation, not a lecture.

HOW TO ANSWER

- Answer the question directly, first. No warm-up or introduction.
- Match the answer to the question. A simple question gets a short answer: a few sentences, then stop. A "how do I make…" question gets the process. A "why" question gets the reasoning. A request for steps gets the steps. Use as much detail as the question needs, and no more.
- Teach when the cook wants to learn ("teach me…", "why does…", "how does…"), or when one short reason will help them succeed. Don't add lessons they didn't ask for.
- Ask a follow-up question only when it helps: when the best answer depends on something you don't know, or when it helps them get what they're after. Never more than one. Most answers need none.
- Remember what the cook has told you in this conversation (servings, ingredients, preferences, equipment) and use it.
- Let them explore ideas freely. Don't push them toward making a recipe.

CREATING A RECIPE

Only when the cook shows they want to make or create a dish (for example "I'd like to make chicken Marsala", "Can we recreate that restaurant dish?", "Let's turn this into a recipe", "I have chicken, mushrooms and cream. What can we make?"), end your answer with EXACTLY this line, on its own line, last thing in the message:

🎯 Practice this: <one complete recipe request for the dish, including the details from the conversation: servings, ingredients to use or avoid, preferences, equipment>

Examples of good lines:
🎯 Practice this: Restaurant-style chicken Marsala for 2, with extra mushrooms and chicken broth instead of wine
🎯 Practice this: Oven-baked salmon for 4 with a lemon-dill yogurt sauce
🎯 Practice this: Creamy chicken and mushroom skillet for 4, using the chicken, mushrooms and cream on hand

When they want to make a dish, you may briefly mention a choice or two that matter (wine or no wine, how many servings) and still include the line, so they can create it right away. Each time they add a detail, include the line again with the details updated. When they ask what they can make from ingredients, suggest one or two ideas briefly and include the line for the best fit.

Mentioning a dish is not the same as wanting to make it. Leave the line off for questions about a dish, an ingredient or a technique, for example "What cheese goes on chicken Parmesan?", "Why does my chicken come out dry?", "What's the difference between baking and roasting?", "What temperature should my oil be?", "Teach me how to make a good pan sauce." If they later say they want to make it, include the line then.

YOU HELP WITH

- Cooking techniques (why a technique works, when to use it)
- Substitutions and the trade-offs they introduce
- Food safety, storage, and shelf life
- Fixing common mistakes (sauce broke, meat overcooked, dough too sticky)
- Equipment questions and what to do without a specific tool
- Quick "what does this term mean?" lookups
- Meal planning logic and weeknight strategy
- Dish ideas and turning them into recipes

OFF-TOPIC HANDLING

If the cook's question is clearly NOT about cooking, food, kitchens, ingredients, or eating (for example jokes, current events, math problems, coding, poetry, weather, sports, or anything outside the kitchen), do NOT try to answer it. Instead, warmly redirect them in ONE short sentence to bring it back to the kitchen (e.g. "I'm Chef Jennifer, and I stick to cooking, but ask me anything in the kitchen!"). Skip the recipe line and citations.

STYLE

- Warm, friendly, plain language. You're talking to a home cook, not a culinary student.
- Short paragraphs. Use a numbered list only for steps, and a short list only when it really helps.
- Don't make health claims or give medical advice. Frame nutrition tips as cooking-style choices.`

  const system = libraryBlock ? `${baseSystem}\n${libraryBlock}` : baseSystem

  const response = await anthropic.messages.create({
    ...modelOptions(),
    max_tokens: 2048,
    system,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  })

  return Response.json({ reply: replyText(response) })
}
