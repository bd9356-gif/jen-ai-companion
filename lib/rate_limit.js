// Per-IP-per-minute rate limiting for the Anthropic-backed API routes.
// See supabase/017_api_rate_limits.sql for the schema + RPC.
//
// Usage in a route:
//
//   import { checkRateLimit } from '@/lib/rate_limit'
//   ...
//   const rl = await checkRateLimit(request, 'chef', 30)
//   if (!rl.ok) {
//     return Response.json({ error: rl.message }, {
//       status: 429,
//       headers: { 'Retry-After': '60' }
//     })
//   }
//
// Fail-open: if Supabase is unreachable or the RPC errors, the
// request is allowed through. Cost protection isn't worth blocking
// real users when our database is having a bad day.

import { createClient } from '@supabase/supabase-js'

let _admin = null
function getAdmin() {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _admin = createClient(url, key, { auth: { persistSession: false } })
  return _admin
}

// Pull the caller's IP from Vercel's standard headers. Falls back to
// a stable bucket key when no IP is detectable so we still rate-limit
// (worst case: everyone shares one bucket = stricter, fail-safe).
function ipFromRequest(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

// Round a Date down to the start of its minute. Used as the bucket
// key — every request in the same minute shares one row.
function minuteWindow(now = new Date()) {
  const d = new Date(now)
  d.setSeconds(0, 0)
  return d.toISOString()
}

/**
 * Check + increment the rate limit for this request.
 *
 * @param {Request} request — the API route's request object.
 * @param {string} endpoint — short label used as the bucket key
 *   (e.g. 'chef', 'topchef', 'import', 'enhance', 'cleanup').
 * @param {number} limitPerMinute — max requests allowed in any
 *   60-second window for this (ip, endpoint) pair.
 * @returns {{ ok: boolean, count: number, limit: number, message?: string }}
 */
export async function checkRateLimit(request, endpoint, limitPerMinute) {
  const admin = getAdmin()
  if (!admin) {
    // No service role configured — can't rate-limit. Fail open.
    return { ok: true, count: 0, limit: limitPerMinute }
  }
  const ip = ipFromRequest(request)
  const window = minuteWindow()

  const { data, error } = await admin.rpc('increment_rate_limit', {
    p_ip: ip,
    p_endpoint: endpoint,
    p_window: window,
  })

  if (error) {
    // RPC failed (network blip, schema mismatch, etc.). Fail open
    // so we don't block real traffic on infrastructure hiccups.
    return { ok: true, count: 0, limit: limitPerMinute }
  }

  const count = typeof data === 'number' ? data : 0
  if (count > limitPerMinute) {
    return {
      ok: false,
      count,
      limit: limitPerMinute,
      message: `Too many requests — limit is ${limitPerMinute} per minute. Try again in a moment.`,
    }
  }
  return { ok: true, count, limit: limitPerMinute }
}
