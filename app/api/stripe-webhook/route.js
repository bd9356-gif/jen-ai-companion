import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    const priceId = session.line_items?.data[0]?.price?.id || ''
    const tier = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'premium'

    if (userId) {
      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier,
        store_product_id: priceId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const customer = await stripe.customers.retrieve(sub.customer)
    // Find user by email and downgrade
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find(u => u.email === customer.email)
    if (user) {
      await supabase.from('user_subscriptions').upsert({
        user_id: user.id,
        tier: 'free',
      }, { onConflict: 'user_id' })
    }
  }

  return Response.json({ received: true })
}
