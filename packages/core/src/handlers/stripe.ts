import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { z } from 'zod'
import { donations } from '../db/schema'
import { donationReceiptEmail } from '../email/templates'
import type { Ctx } from './context'
import { HttpError, json, readJson } from './http'

const checkoutSchema = z.object({
  amountCents: z.number().int().min(100).max(10_000_000),
  currency: z.string().length(3).default('usd'),
  donorName: z.string().max(120).optional(),
  donorEmail: z.email().max(254).optional(),
})

export async function stripeCheckout(req: Request, ctx: Ctx): Promise<Response> {
  if (!ctx.stripe) throw new HttpError(503, 'donations_not_configured')
  const body = checkoutSchema.safeParse(await readJson(req))
  if (!body.success) throw new HttpError(400, 'invalid_body', body.error.issues)
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
    const rows = await ctx.db
      .insert(donations)
      .values({
        stripeCheckoutSessionId: s.id,
        stripePaymentIntentId: paymentIntent,
        amountCents: amount,
        currency,
        donorName,
        donorEmail,
        status: 'paid',
      })
      .onConflictDoUpdate({
        target: donations.stripeCheckoutSessionId,
        set: { status: 'paid', stripePaymentIntentId: paymentIntent, amountCents: amount, currency, donorEmail, donorName },
      })
      .returning({ id: donations.id })
    // Idempotent: the upsert above is the only write; receipts are sent once per session id.
    if (rows[0] && donorEmail && !(s.metadata?.['receiptSent'] === '1')) {
      const tpl = donationReceiptEmail({ siteName: ctx.siteName, amountCents: amount, currency })
      await ctx.mailer.send({ from: ctx.env.EMAIL_FROM, to: donorEmail, replyTo: ctx.env.EMAIL_REPLY_TO, ...tpl })
    }
  } else if (event.type === 'charge.refunded') {
    const c = event.data.object
    const pi = typeof c.payment_intent === 'string' ? c.payment_intent : (c.payment_intent?.id ?? null)
    if (pi) await ctx.db.update(donations).set({ status: 'refunded' }).where(eq(donations.stripePaymentIntentId, pi))
  }
  return json(200, { received: true })
}
