import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Service-role Supabase client — needed because study_quizzes is RLS
// "read for authenticated, no writes" by design. Inserts come from the
// server only. The anon client wouldn't have permission to cache new
// quizzes.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────────────────────────────
   /api/study-hall — Chef Jennifer's Study Hall quiz generator.

   POST body: { article_id: uuid, count?: number (default 3) }
   Response:  { questions: [{ question, options, correct, explanation }] }

   Caching strategy: one quiz per article, lazily generated and
   stored in `study_quizzes`. The first user to take a quiz triggers
   generation; everyone after reads from cache. Means two cooks who
   take the same quiz see the same questions — good for shared
   conversations ("did you get the brown-butter one?") and
   deterministic from the user's POV (no slot-machine effect).

   Voice: Chef Jennifer writes the questions and the explanations.
   Phase 2 of the persona unification — she's not "an AI quiz
   engine," she's a chef checking what stuck.
   ─────────────────────────────────────────────────────────── */
export async function POST(request) {
  // Rate limit: 10 study-hall generations per IP / minute. A user
  // tapping through every Library article in one session won't hit
  // this; abuse would.
  const rl = await checkRateLimit(request, 'study-hall', 10)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const articleId = body?.article_id
  const count = Math.max(2, Math.min(5, Number(body?.count) || 3))

  if (!articleId) {
    return Response.json({ error: 'Missing article_id' }, { status: 400 })
  }

  // Cache check — if this article already has a quiz, return it.
  // Stable across users; first-cooker-to-tap-Study-Hall triggers
  // generation and everyone else reads.
  const { data: cached } = await supabaseAdmin
    .from('study_quizzes')
    .select('questions')
    .eq('article_id', articleId)
    .maybeSingle()

  if (cached?.questions) {
    return Response.json({ questions: cached.questions, source: 'cache' })
  }

  // Cache miss — load the article and ask Chef Jennifer to generate
  // a quiz from its actual content. The prompt constrains her to
  // questions that are answerable ONLY from the article, with
  // clearly distinct distractors and a one-line "why" per question.
  const { data: article, error: articleErr } = await supabaseAdmin
    .from('recipe_articles')
    .select('id, title, content, topic')
    .eq('id', articleId)
    .maybeSingle()

  if (articleErr || !article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const prompt = `You are Chef Jennifer, the home cook's AI cooking companion inside MyRecipe Companion. The home cook just finished reading a Library article and tapped Study Hall to test what stuck. Generate ${count} multiple-choice questions from this article — questions that are answerable ONLY from the article's content (not from outside knowledge). Keep it warm, never punitive — wrong answers are learning moments, not failures.

ARTICLE TITLE: ${article.title}
ARTICLE CONTENT:
${article.content}

RULES for each question:
- The "question" is one short, specific sentence. Concrete over abstract. ("What temperature does butter brown at?" not "What is the Maillard reaction?")
- "options" is an array of EXACTLY 4 strings — one correct, three plausible distractors that are clearly different from each other (don't make three options look almost identical to the right one — that's a trick, not a test).
- "correct" is the 0-indexed position of the right answer in the options array.
- "explanation" is ONE warm sentence in Chef Jennifer's voice explaining why the right answer is right — written like she's standing next to the user at the counter. Reference what the article said where natural. ("320°F is when the milk solids start to color — that's the brown-butter moment.")
- Do NOT include questions about anything not stated in the article.
- Do NOT make every correct answer position the same — vary which option is correct across the ${count} questions.

Respond with ONLY a valid JSON object — no markdown, no backticks, no commentary:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 2,
      "explanation": "Chef Jennifer's warm one-line explanation."
    }
  ]
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return Response.json({ error: 'Quiz generation returned an unexpected shape' }, { status: 500 })
    }

    // Validate each question's shape — drop any malformed ones rather
    // than 500ing the whole request.
    const valid = parsed.questions.filter(q =>
      q && typeof q.question === 'string'
      && Array.isArray(q.options) && q.options.length === 4
      && q.options.every(o => typeof o === 'string')
      && typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4
      && typeof q.explanation === 'string'
    )

    if (valid.length === 0) {
      return Response.json({ error: 'Quiz generation produced no valid questions' }, { status: 500 })
    }

    // Cache the validated questions for everyone after this user.
    await supabaseAdmin
      .from('study_quizzes')
      .insert({ article_id: articleId, questions: valid })

    return Response.json({ questions: valid, source: 'fresh' })
  } catch (err) {
    return Response.json({ error: 'Could not build the quiz: ' + err.message }, { status: 500 })
  }
}
