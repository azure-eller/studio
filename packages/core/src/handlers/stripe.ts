import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { z } from 'zod'
import { rateLimit } from '../auth/ratelimit'
import { donations } from '../db/schema'
import { donationReceiptEmail } from '../email/templates'
import type { Ctx } from './context'
import { clientIp, HttpError, json, readJson } from './http'

const checkoutSchema = z.object({
  amountCents: z.number().int().min(100).max(10_000_000),
  currency: z.string().regex(/^[a-z]{3}$/i, 'ISO currency code').default('usd'),
  donorName: z.string().max(120).optional(),
  donorEmail: z.email().max(254).optional(),
})

export async function stripeCheckout(req: Request, ctx: Ctx): Promise<Response> {
  if (!ctx.stripe) throw new HttpError(503, 'donations_not_configured')
  const body = checkoutSchema.safeParse(await readJson(req))
  if (!body.success) throw new HttpError(400, 'invalid_body', body.error.issues)
  // Each call creates a Stripe session and a ledger row; a loop must not be free.
  if (!(await rateLimit(ctx.db, `checkout:ip:${clientIp(req)}`, 10, 15 * 60))) throw new HttpError(429, 'rate_limited')
  const d = body.data
  const site = ctx.env.NEXT_PUBLIC_SITE_URL
  const session = await ctx.stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: { currency: d.currency, unit_amount: d.amountCents, product_data: { name: `Donation to ${ctx.siteName}` } },
      },
    ],
    ...(d.donorEmail ? { customer_email: d.donorEmail } : {}),
    metadata: { donorName: d.donorName ?? '' },
    success_url: `${site}/donate?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/donate?status=cancelled`,
  })
  await ctx.db
    .insert(donations)
    .values({
      stripeCheckoutSessionId: session.id,
      amountCents: d.amountCents,
      currency: d.currency.toLowerCase(),
      donorName: d.donorName ?? null,
      donorEmail: d.donorEmail ?? null,
      status: 'pending',
    })
    .onConflictDoNothing()
  return json(200, { url: session.url })
}

export async function stripeWebhook(req: Request, ctx: Ctx): Promise<Response> {
  if (!ctx.stripe || !ctx.env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'donations_not_configured')
  const sig = req.headers.get('stripe-signature') ?? ''
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = ctx.stripe.webhooks.constructEvent(raw, sig, ctx.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    throw new HttpError(400, 'invalid_signature')
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const amount = s.amount_total ?? 0
    const currency = (s.currency ?? 'usd').toLowerCase()
    const donorEmail = s.customer_details?.email ?? s.customer_email ?? null
    const donorName = s.metadata?.['donorName'] || s.customer_details?.name || null
    const paymentIntent = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null)
    // Delayed payment methods complete the session before the money arrives; only `paid` is a donation.
    const status = s.payment_status === 'paid' ? 'paid' : 'pending'
    const before = (await ctx.db.select({ status: donations.status }).from(donations).where(eq(donations.stripeCheckoutSessionId, s.id)).limit(1))[0]
    await ctx.db
      .insert(donations)
      .values({ stripeCheckoutSessionId: s.id, stripePaymentIntentId: paymentIntent, amountCents: amount, currency, donorName, donorEmail, status })
      .onConflictDoUpdate({
        target: donations.stripeCheckoutSessionId,
        set: { status, stripePaymentIntentId: paymentIntent, amountCents: amount, currency, donorEmail, donorName },
      })
    // Stripe redelivers; the receipt goes out on the transition to paid, once.
    if (status === 'paid' && before?.status !== 'paid' && donorEmail) {
      const tpl = donationReceiptEmail({ siteName: ctx.siteName, amountCents: amount, currency })
      await ctx.mailer.send({ from: ctx.env.EMAIL_FROM, to: donorEmail, replyTo: ctx.env.EMAIL_REPLY_TO, ...tpl })
    }
  } else if (event.type === 'charge.refunded') {
    const c = event.data.object
    const pi = typeof c.payment_intent === 'string' ? c.payment_intent : (c.payment_intent?.id ?? null)
    // A partial refund leaves the donation paid; the ledger records whole donations, not balances.
    if (pi && c.refunded) await ctx.db.update(donations).set({ status: 'refunded' }).where(eq(donations.stripePaymentIntentId, pi))
  }
  return json(200, { received: true })
}
