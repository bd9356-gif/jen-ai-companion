// Public share page for a saved Chef Jen tip (a `notes` row) — the tip version of
// /share/[id]. "Share for Facebook" in the app links here for any tip that isn't
// published on mycompanionapps.com, so every user's shared tip has a real page.
// Read server-side with the service key (notes are private to their owner in the
// app); only the one tip whose id is in the link is shown.

import { createClient } from '@supabase/supabase-js'
import { TipShareView, TipMoreButton, TipAppButton } from './TipPageEvents'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf',
  { auth: { persistSession: false } }
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OG_IMAGE = 'https://recipe.mycompanionapps.com/chef-jen-update.png'

async function loadTip(id) {
  if (!UUID_RE.test(id || '')) return null
  const { data } = await supabase
    .from('notes')
    .select('id, title, question, content')
    .eq('id', id)
    .maybeSingle()
  return data
}

function headingOf(tip) {
  const q = (tip.question || '').trim()
  return q && q.length <= 160 ? q : (tip.title || 'Chef Jen Tip')
}

function cleanLine(line) {
  return line.replace(/\*\*/g, '').replace(/^#+\s*/, '').replace(/\*/g, '').trim()
}

// Chef Jen answers use "**Heading**" lines, "- " bullets and plain paragraphs.
function toBlocks(content) {
  const blocks = []
  for (const raw of (content || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const isHeading = (line.startsWith('**') && line.endsWith('**') && line.length > 4) || /^#{1,4}\s/.test(line)
    if (isHeading) { blocks.push({ type: 'h', text: cleanLine(line).replace(/:$/, '') }); continue }
    const bullet = line.match(/^[-•*]\s+(.*)$/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(cleanLine(bullet[1]))
      else blocks.push({ type: 'ul', items: [cleanLine(bullet[1])] })
      continue
    }
    blocks.push({ type: 'p', text: cleanLine(line) })
  }
  return blocks
}

function summaryOf(content) {
  const text = toBlocks(content)
    .map((b) => (b.type === 'ul' ? b.items.join(' ') : b.text))
    .join(' ')
    .replace(/^(great|good|excellent|fantastic|wonderful) question[!.]?\s*/i, '')
  return text.length > 160 ? text.slice(0, 157).replace(/\s+\S*$/, '') + '…' : text
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const tip = await loadTip(id)
  if (!tip) return { title: 'Chef Jen Tip — MyRecipe Companion' }
  const heading = headingOf(tip)
  const description = summaryOf(tip.content) || 'A cooking tip from Chef Jen.'
  return {
    title: `${heading} — Chef Jen`,
    description,
    openGraph: {
      title: `${heading} — Chef Jen`,
      description,
      images: [OG_IMAGE],
      type: 'article',
      siteName: 'MyRecipe Companion',
    },
  }
}

export default async function TipSharePage({ params }) {
  const { id } = await params
  const tip = await loadTip(id)

  if (!tip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">👩‍🍳</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tip Not Found</h1>
          <p className="text-gray-500 text-sm mb-5">This tip may have been removed.</p>
          <a href="https://mycompanionapps.com/tips" className="inline-block text-sm font-bold text-white bg-orange-600 px-4 py-2 rounded-full">
            See More Chef Jen Tips →
          </a>
        </div>
      </div>
    )
  }

  const heading = headingOf(tip)
  const blocks = toBlocks(tip.content)

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <TipShareView tipId={tip.id} tipTitle={heading} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 mb-3">
          👩‍🍳 Chef Jen Tip
        </div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">{heading}</h1>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          {blocks.map((b, i) => {
            if (b.type === 'h') return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 first:mt-0 mb-1.5">{b.text}</h2>
            if (b.type === 'ul') return (
              <ul key={i} className="space-y-1.5 mb-3">
                {b.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-[15px] text-gray-700 leading-relaxed">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            )
            return <p key={i} className="text-[15px] text-gray-700 leading-relaxed mb-3">{b.text}</p>
          })}
        </div>

        <div className="bg-white rounded-2xl border border-orange-200 p-5 text-center shadow-sm">
          <p className="text-base font-bold text-gray-900 mb-1">Got a cooking question of your own?</p>
          <p className="text-sm text-gray-600 mb-4">Ask Chef Jen anything in MyRecipe Companion.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <TipAppButton tipId={tip.id} />
            <TipMoreButton tipId={tip.id} />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">Shared from MyRecipe Companion.</p>
        </div>
      </main>
    </div>
  )
}
