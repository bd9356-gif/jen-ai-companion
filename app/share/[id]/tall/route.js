// Easy address for a recipe's tall picture (Facebook photo posts / Pinterest):
//   recipe.mycompanionapps.com/share/<id>/tall  →  the picture, made by the website.
// Open it on a phone, long-press the picture and Save to Photos.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  'sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf'
)
const TALL_DESIGN = 't1' // matches app/share/[id]/page.js and the website

export async function GET(req, { params }) {
  const { id } = await params
  const { data: recipe } = await supabase.from('personal_recipes').select('title, photo_url').eq('id', id).is('deleted_at', null).maybeSingle()
  if (!recipe) return new NextResponse('Recipe not found', { status: 404 })
  const photo = recipe.photo_url && recipe.photo_url !== '/chef-jen-update.png' ? recipe.photo_url : '/og-image.png'
  const str = JSON.stringify([TALL_DESIGN, recipe.title || 'Untitled Recipe', photo])
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return NextResponse.redirect(`https://www.mycompanionapps.com/api/og/recipe/${id}/tall?v=${(h >>> 0).toString(36)}`, 302)
}
