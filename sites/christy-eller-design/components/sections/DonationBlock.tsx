'use client'
import { useState, type FormEvent } from 'react'
import { Button, Card, CardContent, Container, Heading, Input, Label, Section } from '@/components/ui'

/** Renders a "not set up yet" state until Stripe is configured (SPEC §1.2 stripe/checkout → 503). */
export function DonationBlock(p: { title?: string; body?: string; amounts?: number[]; configured: boolean }) {
  const amounts = p.amounts ?? [25, 50, 100, 250]
  const [amount, setAmount] = useState<number>(amounts[1] ?? 50)
  const [custom, setCustom] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const id = 'donate-title'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const dollars = custom ? Number(custom) : amount
    if (!Number.isFinite(dollars) || dollars < 1) return
    setState('busy')
    try {
      const res = await fetch('/api/site/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountCents: Math.round(dollars * 100) }),
      })
      const data = (await res.json()) as { url?: string }
      if (!res.ok || !data.url) throw new Error('checkout')
      window.location.assign(data.url)
    } catch {
      setState('error')
    }
  }

  return (
    <Section labelledBy={id}>
      <Container narrow>
        <Heading level={2} id={id}>
          {p.title ?? 'Give'}
        </Heading>
        {p.body && <p className="mt-3 text-lg text-muted-foreground">{p.body}</p>}
        <Card className="mt-8">
          <CardContent>
            {!p.configured ? (
              <p className="text-muted-foreground">Online giving isn’t switched on yet. Please get in touch to give another way.</p>
            ) : (
              <form onSubmit={submit}>
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold">Choose an amount</legend>
                  <div className="flex flex-wrap gap-2">
                    {amounts.map((a) => (
                      <label key={a} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${amount === a && !custom ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                        <input type="radio" name="amount" value={a} className="sr-only" checked={amount === a && !custom} onChange={() => (setAmount(a), setCustom(''))} />${a}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-4 grid max-w-xs gap-2">
                  <Label htmlFor="custom-amount">Or another amount (USD)</Label>
                  <Input id="custom-amount" type="number" min={1} step={1} inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} />
                </div>
                {state === 'error' && <p className="mt-3 text-sm text-red-700">Something went wrong starting your donation. Please try again.</p>}
                <Button type="submit" size="lg" className="mt-6" disabled={state === 'busy'}>
                  {state === 'busy' ? 'Opening secure checkout…' : 'Give now'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </Container>
    </Section>
  )
}
