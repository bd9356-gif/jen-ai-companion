import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route — service role key reads `cooking_videos` regardless of
// RLS for the admin curator at /admin/featured. Never expose this key to
// the browser. Mirrors Golf's /api/admin/approved-list pattern but pared
// down: Recipe has no editorial_status, no primary_bucket, no pros — just
// is_featured and a view_count sort. Education videos are intentionally
// excluded (Featured is a Chef TV / cooking concept, not an Education one).
//
// Recipe's existing app code does two separate queries
// (cooking_videos + video_metadata.in(ids)) instead of an embedded join
// because the FK between the two tables doesn't have a discoverable name
// in our migrations. We do the same here — slightly chattier but
// guaranteed to work without inspecting Postgres directly.
// Supabase's new dual-key system uses lowercase env var names by convention
// (`supabase_service_role_key`). We try lowercase first, then fall back to the
// legacy uppercase name, then to the anon key as a last resort.
const SERVICE_KEY =
  process.env.supabase_service_role_key ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_KEY
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bd9356@gmail.com'

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data } = await supabase.auth.getUser(token)
  const user = data?.user
  if (user?.email === ADMIN_EMAIL) return user
  return null
}

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const featured = url.searchParams.get('featured')   // 'true' to restrict to is_featured rows
  const status = url.searchParams.get('status')       // 'visible' | 'hidden' | 'all' (default: 'all')
  const q = (url.searchParams.get('q') || '').trim()  // optional title/channel search (ilike)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500)

  // Pull from cooking_videos AND education_videos in parallel so the
  // admin library curator can manage every video that surfaces on Chef
  // TV. Both tables now carry is_featured + is_hidden (migration 013),
  // so the same filters apply to either source. Each row is tagged
  // with `_source` so the action API knows which table to update.
  function buildQuery(table) {
    let q2 = supabase.from(table)
      .select('id, title, channel, youtube_id, thumbnail_url, view_count, is_featured, is_hidden')
      .limit(limit)
    if (featured === 'true') q2 = q2.eq('is_featured', true)
    if (status === 'visible') q2 = q2.eq('is_hidden', false)
    else if (status === 'hidden') q2 = q2.eq('is_hidden', true)
    if (q.length > 0) q2 = q2.or(`title.ilike.%${q}%,channel.ilike.%${q}%`)
    return q2
  }

  const [{ data: cookingRows, error: cErr }, { data: educationRows, error: eErr }] = await Promise.all([
    buildQuery('cooking_videos'),
    buildQuery('education_videos'),
  ])

  if (cErr) return NextResponse.json({ error: `cooking_videos: ${cErr.message}` }, { status: 500 })
  // education_videos missing the is_featured / is_hidden columns means
  // migration 013 hasn't been run yet. Surface that clearly so the user
  // knows what to do, rather than failing with a cryptic select error.
  if (eErr) {
    return NextResponse.json({
      error: `education_videos query failed: ${eErr.message}. If this mentions is_hidden / is_featured, run supabase/013_chef_tv_education_admin.sql in the Supabase SQL Editor first.`,
    }, { status: 500 })
  }

  const cooking = (cookingRows || []).map(v => ({ ...v, _source: 'cooking' }))
  const education = (educationRows || []).map(v => ({ ...v, _source: 'education' }))
  const videos = [...cooking, ...education]

  // Pull metadata from BOTH metadata tables in parallel. cooking_videos
  // joins to video_metadata; education_videos joins to
  // education_video_metadata. Both keyed by video_id.
  const cookingIds = cooking.map(v => v.id)
  const educationIds = education.map(v => v.id)
  let metaMap = {}
  const metaPromises = []
  if (cookingIds.length > 0) {
    metaPromises.push(
      supabase.from('video_metadata').select('video_id, ai_summary, ingredients, instructions').in('video_id', cookingIds)
    )
  }
  if (educationIds.length > 0) {
    metaPromises.push(
      supabase.from('education_video_metadata').select('video_id, ai_summary, ingredients, instructions').in('video_id', educationIds)
    )
  }
  if (metaPromises.length > 0) {
    const results = await Promise.all(metaPromises)
    for (const r of results) {
      ;(r.data || []).forEach(m => { metaMap[m.video_id] = m })
    }
  }

  const rows = videos.map(v => ({ ...v, _meta: metaMap[v.id] || null }))
  rows.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return (b.view_count || 0) - (a.view_count || 0)
  })

  return NextResponse.json({ videos: rows, count: rows.length })
}
