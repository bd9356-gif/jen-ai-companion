import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route — uses the service role key so we can flip
// `is_featured` on `cooking_videos` regardless of RLS. Never expose
// this key to the browser. Mirrors Golf's /api/admin/video-action
// pattern but pared down to the only column Recipe needs to mutate
// today (is_featured) — Recipe doesn't have editorial_status or
// per-channel pros to manage, so the action surface is simpler.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

  const { data, error } = await supabase
    .from('cooking_videos')
    .update(update)
    .eq('id', videoId)
    .select('id, is_featured')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, video: data })
}
