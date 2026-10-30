// Short recipe link used in Facebook posts: recipe.mycompanionapps.com/r/<code>,
// where <code> is the first 8 characters of the recipe's id (e.g. /r/e21fc39e).
// It shows the recipe's share page directly (no redirect): Facebook's share screen
// silently refuses to post when the link in the text redirects somewhere else.
// Lookup: supabase/022_recipe_short_links.sql (recipe_by_short_code).
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import SharePage, { generateMetadata as shareMetadata } from '../../share/[id]/page'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf'
)

async function recipeIdFor(code) {
  const short = String(code || '').toLowerCase()
  if (!/^[0-9a-f]{8}$/.test(short)) return null
  const { data } = await supabase.rpc('recipe_by_short_code', { code: short })
  const recipe = Array.isArray(data) ? data[0] : data
  return recipe?.id || null
}

export async function generateMetadata({ params }) {
  const { code } = await params
  const id = await recipeIdFor(code)
  if (!id) return { title: 'Recipe Not Found' }
  return shareMetadata({ params: Promise.resolve({ id }) })
}

export default async function ShortRecipePage({ params }) {
  const { code } = await params
  const id = await recipeIdFor(code)
  if (!id) notFound()
  return SharePage({ params: Promise.resolve({ id }) })
}
