'use client'
import { useState, type FormEvent } from 'react'
import { Button, Container, Heading, Input, Label, Section, Textarea } from '@/components/ui'

type Variant = 'contact' | 'volunteer' | 'newsletter' | 'register'
export type EventRef = { id: string; title: string; date?: string }

/** Posts to core's `forms/<variant>`; honeypot field `website` stays empty for humans. */
export function ContactForm(p: { variant?: Variant; title?: string; body?: string; tone?: 'bg' | 'surface'; event?: EventRef }) {
  const variant = p.variant ?? 'contact'
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const id = `form-${variant}-title`
  const fid = (f: string) => `f-${variant}-${f}`
  const titles: Record<Variant, string> = { contact: 'Send us a message', volunteer: 'Volunteer with us', newsletter: 'Stay in touch', register: 'Sign up' }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setState('busy')
    const fd = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    fd.forEach((v, k) => {
      if (typeof v === 'string' && v !== '') body[k] = v
    })
    body['website'] = String(fd.get('website') ?? '')
    try {
      const res = await fetch(`/api/site/forms/${variant}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('send')
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container narrow>
        <Heading level={2} id={id}>
          {p.title ?? titles[variant]}
        </Heading>
        {p.body && <p className="mt-3 text-lg text-muted-foreground">{p.body}</p>}
        {state === 'sent' ? (
          <p className="mt-8 rounded-lg border border-border bg-muted p-5" role="status">
            {variant === 'register' ? 'You’re signed up — we’ll be in touch with the details.' : 'Thank you — we’ve got your message and will reply soon.'}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 grid gap-5">
            {variant !== 'newsletter' && (
              <div className="grid gap-2">
                <Label htmlFor={fid('name')}>Name</Label>
                <Input id={fid('name')} name="name" required maxLength={120} autoComplete="name" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor={fid('email')}>Email</Label>
              <Input id={fid('email')} name="email" type="email" required maxLength={254} autoComplete="email" />
            </div>
            {variant === 'newsletter' && (
              <div className="grid gap-2">
                <Label htmlFor={fid('name')}>Name (optional)</Label>
                <Input id={fid('name')} name="name" maxLength={120} autoComplete="name" />
              </div>
            )}
            {variant !== 'newsletter' && (
              <div className="grid gap-2">
                <Label htmlFor={fid('phone')}>Phone (optional)</Label>
                <Input id={fid('phone')} name="phone" type="tel" maxLength={40} autoComplete="tel" />
              </div>
            )}
            {variant === 'contact' && (
              <div className="grid gap-2">
                <Label htmlFor={fid('message')}>Message</Label>
                <Textarea id={fid('message')} name="message" required maxLength={4000} />
              </div>
            )}
            {variant === 'register' && p.event && (
              <>
                <input type="hidden" name="eventId" value={p.event.id} />
                <input type="hidden" name="eventTitle" value={p.event.title} />
                {p.event.date && <input type="hidden" name="eventDate" value={p.event.date} />}
                <div className="grid gap-2">
                  <Label htmlFor={fid('guests')}>How many people?</Label>
                  <Input id={fid('guests')} name="guests" type="number" min={1} max={20} defaultValue={1} required className="max-w-32" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={fid('note')}>Anything we should know? (optional)</Label>
                  <Textarea id={fid('note')} name="note" maxLength={1000} />
                </div>
              </>
            )}
            {variant === 'volunteer' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={fid('interests')}>How would you like to help?</Label>
                  <Textarea id={fid('interests')} name="interests" required maxLength={500} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={fid('availability')}>When are you usually available? (optional)</Label>
                  <Input id={fid('availability')} name="availability" maxLength={500} />
                </div>
              </>
            )}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor={fid('website')}>Website</label>
              <input id={fid('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {state === 'error' && <p className="text-sm text-red-700">We couldn’t send that. Please try again in a moment.</p>}
            <div>
              <Button type="submit" size="lg" disabled={state === 'busy'}>
                {state === 'busy' ? 'Sending…' : variant === 'newsletter' ? 'Subscribe' : variant === 'register' ? 'Sign up' : 'Send'}
              </Button>
            </div>
          </form>
        )}
      </Container>
    </Section>
  )
}
