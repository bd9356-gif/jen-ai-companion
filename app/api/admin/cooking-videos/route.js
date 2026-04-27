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
  const q = (url.searchParams.get('q') || '').trim()  // optional title search (ilike)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500)

  let query = supabase
    .from('cooking_videos')
    .select('id, title, channel, youtube_id, thumbnail_url, view_count, is_featured')
    .limit(limit)

  if (featured === 'true') {
    query = query.eq('is_featured', true)
  }
  if (q.length > 0) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: videos, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pull metadata in a second query keyed by video id. Matches the pattern
  // /videos/page.js uses on the client.
  const ids = (videos || []).map(v => v.id)
  let metaMap = {}
  if (ids.length > 0) {
    const { data: metaRows } = await supabase
      .from('video_metadata')
      .select('video_id, ai_summary, ingredients, instructions')
      .in('video_id', ids)
    ;(metaRows || []).forEach(m => { metaMap[m.video_id] = m })
  }

  // Sort featured-first, then by view_count desc. Same shape Golf's curator
  // expects under `_meta`.
  const rows = (videos || []).map(v => ({ ...v, _meta: metaMap[v.id] || null }))
  rows.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return (b.view_count || 0) - (a.view_count || 0)
  })

  return NextResponse.json({ videos: rows, count: rows.length })
}
