import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const event = body.event

    // Get the app user ID from RevenueCat event
    const appUserId = event?.app_user_id
    if (!appUserId) return Response.json({ received: true })

    const eventType = event?.type
    const productId = event?.product_id || ''

    // Determine tier from product ID
    const tier = productId.includes('pro') ? 'pro' : 'premium'

    // Calculate expiry
    const expiresAt = event?.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'].includes(eventType)) {
      await supabase.from('user_subscriptions').upsert({
        user_id: appUserId,
        tier,
        store_product_id: productId,
        expires_at: expiresAt,
      }, { onConflict: 'user_id' })
    }

    if (['CANCELLATION', 'EXPIRATION'].includes(eventType)) {
      await supabase.from('user_subscriptions').upsert({
        user_id: appUserId,
        tier: 'free',
        expires_at: null,
      }, { onConflict: 'user_id' })
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error('[RevenueCat webhook]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
