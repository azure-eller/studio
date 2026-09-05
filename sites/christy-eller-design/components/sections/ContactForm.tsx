'use client'
import { useState, type FormEvent } from 'react'
import { Button, Container, Heading, Input, Label, Section, Textarea } from '@/components/ui'

type Variant = 'contact' | 'volunteer' | 'newsletter' | 'register'
export type EventRef = { id: string; title: string; date?: string }

/** Posts to core's `forms/<variant>`; honeypot field `website` stays empty for humans. `bare` renders just the form. */
export function ContactForm(p: {
  variant?: Variant
  title?: string
  body?: string
  tone?: 'bg' | 'surface'
  event?: EventRef
  bare?: boolean
}) {
  const variant = p.variant ?? 'contact'
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const id = `form-${variant}-title`
  const fid = (f: string) => `f-${variant}-${f}`
  const titles: Record<Variant, string> = {
    contact: 'Send a message',
    volunteer: 'Volunteer',
    newsletter: 'Stay in touch',
    register: 'Sign up',
  }
  const field = 'h-11 rounded-[var(--radius)] border-border bg-background px-3.5 text-base shadow-none md:text-base'

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
      const res = await fetch(`/api/site/forms/${variant}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('send')
      setState('sent')
    } catch {
      setState('error')
    }
  }

  const inner =
    state === 'sent' ? (
      <p className="rounded-[var(--radius)] bg-muted p-5" role="status">
        {variant === 'register'
          ? 'You’re signed up. The details are on their way by email.'
          : 'Sent. Your message is in Christy’s inbox and she’ll reply by email.'}
      </p>
    ) : (
      <form onSubmit={submit} className="font-ui grid gap-5">
        {variant !== 'newsletter' && (
          <div className="grid gap-2">
            <Label htmlFor={fid('name')} className="text-[0.9375rem]">
              Name
            </Label>
            <Input id={fid('name')} name="name" required maxLength={120} autoComplete="name" className={field} />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor={fid('email')} className="text-[0.9375rem]">
            Email
          </Label>
          <Input
            id={fid('email')}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={field}
          />
        </div>
        {variant === 'newsletter' && (
          <div className="grid gap-2">
            <Label htmlFor={fid('name')} className="text-[0.9375rem]">
              Name (optional)
            </Label>
            <Input id={fid('name')} name="name" maxLength={120} autoComplete="name" className={field} />
          </div>
        )}
        {variant !== 'newsletter' && (
          <div className="grid gap-2">
            <Label htmlFor={fid('phone')} className="text-[0.9375rem]">
              Phone (optional)
            </Label>
            <Input id={fid('phone')} name="phone" type="tel" maxLength={40} autoComplete="tel" className={field} />
          </div>
        )}
        {variant === 'contact' && (
          <div className="grid gap-2">
            <Label htmlFor={fid('message')} className="text-[0.9375rem]">
              What you do, and what the site needs to do
            </Label>
            <Textarea
              id={fid('message')}
              name="message"
              required
              maxLength={4000}
              rows={7}
              className="min-h-40 rounded-[var(--radius)] border-border bg-background px-3.5 py-3 text-base shadow-none md:text-base"
            />
          </div>
        )}
        {variant === 'register' && p.event && (
          <>
            <input type="hidden" name="eventId" value={p.event.id} />
            <input type="hidden" name="eventTitle" value={p.event.title} />
            {p.event.date && <input type="hidden" name="eventDate" value={p.event.date} />}
            <div className="grid gap-2">
              <Label htmlFor={fid('guests')} className="text-[0.9375rem]">
                How many people?
              </Label>
              <Input
                id={fid('guests')}
                name="guests"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
                required
                className={`${field} max-w-32`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fid('note')} className="text-[0.9375rem]">
                Anything we should know? (optional)
              </Label>
              <Textarea
                id={fid('note')}
                name="note"
                maxLength={1000}
                className="rounded-[var(--radius)] border-border bg-background px-3.5 py-3 text-base shadow-none md:text-base"
              />
            </div>
          </>
        )}
        {variant === 'volunteer' && (
          <>
            <div className="grid gap-2">
              <Label htmlFor={fid('interests')} className="text-[0.9375rem]">
                How would you like to help?
              </Label>
              <Textarea
                id={fid('interests')}
                name="interests"
                required
                maxLength={500}
                className="rounded-[var(--radius)] border-border bg-background px-3.5 py-3 text-base shadow-none md:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fid('availability')} className="text-[0.9375rem]">
                When are you usually available? (optional)
              </Label>
              <Input id={fid('availability')} name="availability" maxLength={500} className={field} />
            </div>
          </>
        )}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={fid('website')}>Website</label>
          <input id={fid('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        {state === 'error' && (
          <p className="text-[0.9375rem] text-red-800">
            That didn’t send. Check your connection and try again, or email instead.
          </p>
        )}
        <div>
          <Button type="submit" size="lg" disabled={state === 'busy'} className="h-11 px-6 text-[0.9375rem] font-bold">
            {state === 'busy'
              ? 'Sending…'
              : variant === 'newsletter'
                ? 'Subscribe'
                : variant === 'register'
                  ? 'Sign up'
                  : 'Send message'}
          </Button>
        </div>
      </form>
    )

  if (p.bare) return inner
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container narrow>
        <Heading level={2} id={id}>
          {p.title ?? titles[variant]}
        </Heading>
        {p.body && <p className="mt-3 text-lg text-muted-foreground">{p.body}</p>}
        <div className="mt-8">{inner}</div>
      </Container>
    </Section>
  )
}
