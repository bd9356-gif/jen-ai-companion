// Short tip link for Facebook posts: recipe.mycompanionapps.com/t/<code>, where <code> is the
// first 8 characters of the tip's id (e.g. /t/3aa0c416 for /tip/3aa0c416-def3-…).
// Shows the tip's share page directly (no redirect): Facebook's share screen silently refuses
// to post when the link in the text redirects somewhere else. Same as /r/<code> for recipes.
// Lookup needs no database change: ids that start with the code sort between
// <code>-0000-0000-0000-000000000000 and <code>-ffff-ffff-ffff-ffffffffffff.
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import TipSharePage, { generateMetadata as tipMetadata } from '../../tip/[id]/page'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf',
  { auth: { persistSession: false } }
)

async function tipIdFor(code) {
  const short = String(code || '').toLowerCase()
  if (!/^[0-9a-f]{8}$/.test(short)) return null
  const { data } = await supabase
    .from('notes')
    .select('id')
    .gte('id', `${short}-0000-0000-0000-000000000000`)
    .lte('id', `${short}-ffff-ffff-ffff-ffffffffffff`)
    .order('id')
    .limit(1)
  return data?.[0]?.id || null
}

export async function generateMetadata({ params }) {
  const { code } = await params
  const id = await tipIdFor(code)
  if (!id) return { title: 'Chef Jen Tip — MyRecipe Companion' }
  return tipMetadata({ params: Promise.resolve({ id }) })
}

export default async function ShortTipPage({ params }) {
  const { code } = await params
  const id = await tipIdFor(code)
  if (!id) notFound()
  return TipSharePage({ params: Promise.resolve({ id }) })
}
