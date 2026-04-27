import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route — uses the service role key so we can flip
// `is_featured` on `cooking_videos` regardless of RLS. Never expose
// this key to the browser. Mirrors Golf's /api/admin/video-action
// pattern but pared down to the only column Recipe needs to mutate
// today (is_featured) — Recipe doesn't have editorial_status or
// per-channel pros to manage, so the action surface is simpler.
//
// Supabase's new dual-key system uses lowercase env var names by
// convention (`supabase_service_role_key`). We try lowercase first,
// then fall back to the legacy uppercase name, then to the anon key
// as a last resort.
const SERVICE_KEY =
  process.env.supabase_service_role_key ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const HAS_SERVICE_KEY = !!(
  process.env.supabase_service_role_key ||
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const KEY_PREFIX = (
  process.env.supabase_service_role_key ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).slice(0, 12)

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

export async function POST(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { videoId, action } = body || {}
  if (!videoId || !action) {
    return NextResponse.json({ error: 'videoId and action are required' }, { status: 400 })
  }

  const update = {}
  switch (action) {
    case 'feature':
      update.is_featured = true
      break
    case 'unfeature':
      update.is_featured = false
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  // Diagnostic-first version: check the row exists, then update, then
  // return rich info if anything looks off. Helps surface RLS / type /
  // scoping issues that .single() was hiding behind a generic
  // "Cannot coerce" error.
  const { data: pre, error: preErr } = await supabase
    .from('cooking_videos')
    .select('id, is_featured')
    .eq('id', videoId)
    .maybeSingle()

  if (preErr) {
    return NextResponse.json({
      error: `pre-select failed: ${preErr.message}`,
      videoId,
      hasServiceKey: HAS_SERVICE_KEY,
    }, { status: 500 })
  }
  if (!pre) {
    return NextResponse.json({
      error: 'Row not found by id (pre-select returned 0 rows)',
      videoId,
      hasServiceKey: HAS_SERVICE_KEY,
    }, { status: 404 })
  }

  const { data: rows, error } = await supabase
    .from('cooking_videos')
    .update(update)
    .eq('id', videoId)
    .select('id, is_featured')

  if (error) {
    return NextResponse.json({
      error: `update failed: ${error.message}`,
      videoId,
      hasServiceKey: HAS_SERVICE_KEY,
    }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({
      error: `Update returned 0 rows — RLS is blocking. hasServiceKey=${HAS_SERVICE_KEY} keyPrefix="${KEY_PREFIX}" (anon key would start "eyJ", legacy service_role also "eyJ", new sb_secret starts "sb_secret_"). If hasServiceKey=false, the env var isn't set in Vercel.`,
      videoId,
      preExists: true,
      preState: pre,
      hasServiceKey: HAS_SERVICE_KEY,
      keyPrefix: KEY_PREFIX,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true, video: rows[0] })
}
