import Stripe from 'stripe'
import { beforeAll, describe, expect, it } from 'vitest'
import { donations } from '../src/db/schema'
import { makeHandlers, testDb, testEnv } from './helpers'

let db: Awaited<ReturnType<typeof testDb>>['db']
beforeAll(async () => ({ db } = await testDb()))

const WHSEC = 'whsec_test_secret'
function fakeStripe() {
  const s = new Stripe('sk_test_x')
  s.checkout.sessions.create = (async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' })) as never
  return s
}
const completed = (id: string, payment_status = 'paid') =>
  JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id, object: 'checkout.session', amount_total: 2500, currency: 'usd', payment_status, payment_intent: 'pi_1', customer_details: { email: 'donor@example.org', name: 'Dana' }, metadata: { donorName: '' } } },
  })
const refunded = (refundedFully: boolean) =>
  JSON.stringify({ id: 'evt_2', object: 'event', type: 'charge.refunded', data: { object: { id: 'ch_1', object: 'charge', payment_intent: 'pi_1', refunded: refundedFully } } })

describe('SPEC §1.2 — donations', () => {
  it('returns 503 when Stripe is not configured', async () => {
    const h = makeHandlers(db)
    const res = await h.call('POST', 'stripe/checkout', { body: { amountCents: 1000 } })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'donations_not_configured' })
  })

  it('creates a checkout session and a pending donation', async () => {
    const h = makeHandlers(db, { env: testEnv({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WHSEC }), deps: { stripe: fakeStripe() } })
    const res = await h.call('POST', 'stripe/checkout', { body: { amountCents: 2500, donorName: 'Dana', donorEmail: 'donor@example.org' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/cs_test_1' })
    const rows = await db.select().from(donations)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ stripeCheckoutSessionId: 'cs_test_1', amountCents: 2500, status: 'pending' })
    expect((await h.call('POST', 'stripe/checkout', { body: { amountCents: 5 } })).status).toBe(400)
  })

  it('rejects a bad signature and is idempotent on a valid one', async () => {
    const stripe = fakeStripe()
    const h = makeHandlers(db, { env: testEnv({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WHSEC }), deps: { stripe } })
    const payload = completed('cs_test_1')
    const bad = await h.call('POST', 'stripe/webhook', { raw: payload, headers: { 'stripe-signature': 't=1,v1=deadbeef' } })
    expect(bad.status).toBe(400)

    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC })
    for (let i = 0; i < 2; i++) {
      const ok = await h.call('POST', 'stripe/webhook', { raw: payload, headers: { 'stripe-signature': sig } })
      expect(ok.status).toBe(200)
    }
    const rows = await db.select().from(donations)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'paid', stripePaymentIntentId: 'pi_1', donorEmail: 'donor@example.org', donorName: 'Dana' })
    // Redelivered webhooks must not re-send the receipt.
    expect(h.mailer.sent.filter((m) => m.to === 'donor@example.org')).toHaveLength(1)

    // A completed session we never saw (e.g. created from the Stripe dashboard) is still recorded.
    const other = completed('cs_test_2')
    await h.call('POST', 'stripe/webhook', { raw: other, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: other, secret: WHSEC }) } })
    expect(await db.select().from(donations)).toHaveLength(2)
  })

  it('a session completed with a delayed payment stays pending and gets no receipt; only a full refund marks refunded', async () => {
    const stripe = fakeStripe()
    const h = makeHandlers(db, { env: testEnv({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WHSEC }), deps: { stripe } })
    const sign = (payload: string) => ({ raw: payload, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC }) } })
    await h.call('POST', 'stripe/webhook', sign(completed('cs_test_3', 'unpaid')))
    const pending = (await db.select().from(donations)).find((r) => r.stripeCheckoutSessionId === 'cs_test_3')
    expect(pending?.status).toBe('pending')
    expect(h.mailer.sent).toHaveLength(0)

    await h.call('POST', 'stripe/webhook', sign(refunded(false)))
    expect((await db.select().from(donations)).find((r) => r.stripePaymentIntentId === 'pi_1')?.status).toBe('paid')
    await h.call('POST', 'stripe/webhook', sign(refunded(true)))
    expect((await db.select().from(donations)).find((r) => r.stripePaymentIntentId === 'pi_1')?.status).toBe('refunded')
  })

  it('rate-limits checkout creation per IP', async () => {
    const h = makeHandlers(db, { env: testEnv({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WHSEC }), deps: { stripe: fakeStripe() } })
    const statuses: number[] = []
    for (let i = 0; i < 12; i++) statuses.push((await h.call('POST', 'stripe/checkout', { body: { amountCents: 1000 }, headers: { 'x-forwarded-for': '203.0.113.9' } })).status)
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0)
  })
})
