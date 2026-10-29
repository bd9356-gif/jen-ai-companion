// Short recipe link used in Facebook posts: recipe.mycompanionapps.com/r/<code>,
// where <code> is the first 8 characters of the recipe's id (e.g. /r/e21fc39e).
// Published recipes go to their website page; others to their share page.
// Lookup: supabase/022_recipe_short_links.sql (recipe_by_short_code).
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf'
)

export async function GET(req, { params }) {
  const { code } = await params
  const short = String(code || '').toLowerCase()
  if (!/^[0-9a-f]{8}$/.test(short)) return NextResponse.redirect(new URL('/', req.url), 302)

  const { data } = await supabase.rpc('recipe_by_short_code', { code: short })
  const recipe = Array.isArray(data) ? data[0] : data
  if (!recipe) return NextResponse.redirect(new URL('/', req.url), 302)

  const dest = recipe.published && recipe.web_slug
    ? `https://mycompanionapps.com/recipes/${recipe.web_slug}`
    : new URL(`/share/${recipe.id}`, req.url).toString()
  return NextResponse.redirect(dest, 302)
}
