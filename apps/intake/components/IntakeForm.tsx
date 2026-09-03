'use client'
/**
 * The intake form. Produces the brief (template/lib/brief.ts) step by step, autosaving drafts.
 * Step 1 reserves the slug; photos upload straight to the site's R2 prefix; submit dispatches the build.
 */
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { presignUpload, reserveSlug, saveDraft, submitBrief } from '@/app/start/[token]/actions'
import { draftFrom, SOCIAL_KEYS, toBrief, type Draft, type Photo } from '@/lib/draft'

interface Direction {
  name: string
  label: string
  summary: string
  suits: string[]
  fonts: { heading: string; body: string }
  tokens: Record<string, string>
}
interface Props {
  token: string
  inviteEmail: string
  directions: Direction[]
  existing: { briefId: string; slug: string; draft: unknown } | null
  mediaBaseUrl: string
  studioDomain: string
}

const STEPS = ['Organisation', 'Contact', 'Pages', 'Look', 'Words', 'Photos', 'Starting content', 'Review'] as const
const ORG_TYPES = [
  ['church', 'Church or faith community'],
  ['nonprofit', 'Nonprofit'],
  ['business', 'Small business'],
  ['community', 'Community group or club'],
  ['other', 'Something else'],
] as const
const TONES = [
  ['warm', 'Warm — friendly, plain, welcoming'],
  ['formal', 'Formal — measured and precise'],
  ['energetic', 'Energetic — short, active, upbeat'],
  ['calm', 'Calm — unhurried and gentle'],
] as const
const FEATURES = [
  ['events', 'Events', 'A calendar of upcoming events you can update yourself'],
  ['posts', 'News / posts', 'Short updates or articles'],
  ['gallery', 'Photo gallery', 'A page of photos'],
  ['donations', 'Online giving', 'Take donations by card (Stripe, set up later)'],
  ['contactForm', 'Contact form', 'Messages come to your inbox'],
  ['volunteerForm', 'Volunteer sign-up', 'A form for people who want to help'],
  ['newsletter', 'Newsletter sign-up', 'Collect email addresses'],
] as const

interface FieldProps {
  label: string
  path: string
  value: unknown
  onChange: (v: string) => void
  issue?: { message: string } | undefined
  help?: string
  kind?: 'input' | 'textarea' | 'select'
  type?: string
  options?: readonly (readonly [string, string])[]
  maxLength?: number
  placeholder?: string
  required?: boolean
}

/** Module-level on purpose: a component declared inside the form would be a new type every render and lose focus per keystroke. */
function Field(props: FieldProps): ReactNode {
  const v = (props.value ?? '') as string
  const id = `f-${props.path.replace(/\./g, '-')}`
  return (
    <div className="field">
      <label htmlFor={id}>
        {props.label}
        {props.required ? ' *' : ''}
      </label>
      {props.kind === 'textarea' ? (
        <textarea id={id} className="textarea" value={v} maxLength={props.maxLength} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
      ) : props.kind === 'select' ? (
        <select id={id} className="select" value={v} onChange={(e) => props.onChange(e.target.value)}>
          {props.options?.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} className="input" type={props.type ?? 'text'} value={v} maxLength={props.maxLength} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
      )}
      {props.help && <div className="help">{props.help}</div>}
      {props.issue && <div className="err">{props.issue.message}</div>}
    </div>
  )
}

async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return null
  try {
    const bmp = await createImageBitmap(file)
    const s = { width: bmp.width, height: bmp.height }
    bmp.close()
    return s
  } catch {
    return null
  }
}

export function IntakeForm(p: Props): ReactNode {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(p.inviteEmail, p.existing?.draft))
  const [step, setStep] = useState(0)
  const [briefId, setBriefId] = useState<string | null>(p.existing?.briefId ?? null)
  const [slug, setSlug] = useState<string | null>(p.existing?.slug ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Writes one field by dotted path ("seed.events.2.title"). The one dynamic spot: inputs bind to paths, the draft stays typed. */
  const set = useCallback((path: string, value: unknown) => {
    setDraft((d) => {
      const next = structuredClone(d)
      const keys = path.split('.')
      let o = next as unknown as Record<string, unknown>
      for (const k of keys.slice(0, -1)) o = (o[k] ??= {}) as Record<string, unknown>
      const last = keys[keys.length - 1]!
      // Updater form reads the CURRENT value — appends across awaits must not use a stale closure.
      o[last] = typeof value === 'function' ? (value as (prev: unknown) => unknown)(o[last]) : value
      return next
    })
  }, [])

  // autosave (debounced) once a brief row exists
  useEffect(() => {
    if (!briefId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveDraft(p.token, briefId, draft).catch(() => {}), 1200)
  }, [draft, briefId, p.token])

  const next = async () => {
    setError(null)
    if (step === 0) {
      const name = draft.org.name.trim()
      if (!name) return setError('Please enter the organisation name.')
      if (!briefId) {
        setBusy(true)
        try {
          const r = await reserveSlug(p.token, name)
          setBriefId(r.briefId)
          setSlug(r.slug)
        } catch (e) {
          setError((e as Error).message)
          return setBusy(false)
        }
        setBusy(false)
      }
    }
    if (step === 3 && !draft.direction) return setError('Pick a look to continue.')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0 })
  }
  const back = () => (setError(null), setStep((s) => Math.max(0, s - 1)))

  const upload = async (files: FileList | null, target: 'photos' | 'logo') => {
    if (!files || !briefId) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const size = await readImageSize(file)
        if (!size) throw new Error(`${file.name}: please upload a JPG, PNG or WebP image.`)
        const { url, key } = await presignUpload(p.token, briefId, { name: file.name, type: file.type, size: file.size })
        const put = await fetch(url, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
        if (!put.ok) throw new Error(`${file.name}: upload failed`)
        const photo: Photo = { key, ...size, alt: '' }
        if (target === 'logo') set('media.logo', photo)
        else set('media.photos', (prev: unknown) => [...((prev as Photo[]) ?? []), photo])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!briefId) return
    setBusy(true)
    setError(null)
    setIssues([])
    try {
      const r = await submitBrief(p.token, briefId, toBrief(draft))
      if (r.ok) router.push('/thanks')
      else {
        setIssues(r.issues)
        setError('A few things need attention before we can build — see below.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const issueFor = (path: string) => issues.find((i) => path.endsWith(i.path) || i.path.endsWith(path.split('.').pop()!))

  const photos = draft.media.photos
  const logo = draft.media.logo
  const features = draft.features
  const extra = draft.extraPages

  let body: ReactNode
  switch (step) {
    case 0:
      body = (
        <>
          <h2>Tell us about the organisation</h2>
          <Field label="Name" path="org.name" required maxLength={80} value={draft.org.name} onChange={(v) => set('org.name', v)} issue={issueFor('org.name')} />
          <Field label="What kind of organisation is it?" path="org.type" kind="select" options={ORG_TYPES} value={draft.org.type} onChange={(v) => set('org.type', v)} issue={issueFor('org.type')} />
          <Field label="One line that says what you are" path="org.tagline" required maxLength={120} placeholder="A neighborhood church in North Boulder" help="This goes at the top of the home page." value={draft.org.tagline} onChange={(v) => set('org.tagline', v)} issue={issueFor('org.tagline')} />
          <Field label="Why does it exist? In your own words." path="org.mission" kind="textarea" required maxLength={1500} help="Two to five sentences. The more specific, the better the site reads — days, places, who comes." value={draft.org.mission} onChange={(v) => set('org.mission', v)} issue={issueFor('org.mission')} />
          <Field label="A bit of history and what you do (optional)" path="org.about" kind="textarea" maxLength={4000} help="For the About page. Paragraphs are fine." value={draft.org.about} onChange={(v) => set('org.about', v)} issue={issueFor('org.about')} />
          <Field label="Year founded (optional)" path="org.founded" type="number" value={draft.org.founded} onChange={(v) => set('org.founded', v)} issue={issueFor('org.founded')} />
        </>
      )
      break
    case 1:
      body = (
        <>
          <h2>How people reach you</h2>
          <Field label="Public email" path="contact.email" type="email" required help="Shown on the site; messages from the contact form come here." value={draft.contact.email} onChange={(v) => set('contact.email', v)} issue={issueFor('contact.email')} />
          <Field label="Phone (optional)" path="contact.phone" type="tel" maxLength={40} value={draft.contact.phone} onChange={(v) => set('contact.phone', v)} issue={issueFor('contact.phone')} />
          <Field label="Current website (optional)" path="domain.existing" maxLength={253} placeholder="www.yourorganisation.org" help="If you have one today, we'll rescue the good photos from it for the new site." value={draft.domain.existing} onChange={(v) => set('domain.existing', v)} issue={issueFor('domain.existing')} />
          <Field label="Street address (optional)" path="contact.address.street" maxLength={120} value={draft.contact.address.street} onChange={(v) => set('contact.address.street', v)} issue={issueFor('contact.address.street')} />
          <div className="row">
            <Field label="City" path="contact.address.city" maxLength={80} value={draft.contact.address.city} onChange={(v) => set('contact.address.city', v)} issue={issueFor('contact.address.city')} />
            <Field label="State / region" path="contact.address.region" maxLength={80} value={draft.contact.address.region} onChange={(v) => set('contact.address.region', v)} issue={issueFor('contact.address.region')} />
          </div>
          <div className="row">
            <Field label="Postal code" path="contact.address.postal" maxLength={20} value={draft.contact.address.postal} onChange={(v) => set('contact.address.postal', v)} issue={issueFor('contact.address.postal')} />
            <Field label="Country (2 letters)" path="contact.address.country" maxLength={2} value={draft.contact.address.country} onChange={(v) => set('contact.address.country', v)} issue={issueFor('contact.address.country')} />
          </div>
          <Field label="Hours or regular times (optional)" path="contact.hours" kind="textarea" maxLength={500} placeholder={'Sundays 10am service\nOffice Mon–Thu 9–3'} value={draft.contact.hours} onChange={(v) => set('contact.hours', v)} issue={issueFor('contact.hours')} />
          <h3>Social links (optional)</h3>
          {SOCIAL_KEYS.map((k) => (
            <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)} path={`socials.${k}`} type="url" placeholder="https://…" maxLength={300} value={draft.socials[k]} onChange={(v) => set(`socials.${k}`, v)} issue={issueFor(`socials.${k}`)} />
          ))}
        </>
      )
      break
    case 2:
      body = (
        <>
          <h2>What should the site do?</h2>
          <p className="muted">Every site gets a home page. Tick what you need; you can change content yourself later.</p>
          <div className="checks">
            {(
              [
                ['about', 'About page', 'Your story and what you do'],
                ['contact', 'Contact page', 'Address, hours, map link and a form'],
              ] as const
            ).map(([key, label, help]) => (
              <label key={key} className={`check ${extra[key] ? 'on' : ''}`}>
                <input type="checkbox" checked={extra[key]} onChange={(e) => set(`extraPages.${key}`, e.target.checked)} />
                <span>
                  {label}
                  <small>{help}</small>
                </span>
              </label>
            ))}
            {FEATURES.map(([k, label, help]) => (
              <label key={k} className={`check ${features[k] ? 'on' : ''}`}>
                <input type="checkbox" checked={Boolean(features[k])} onChange={(e) => set(`features.${k}`, e.target.checked)} />
                <span>
                  {label}
                  <small>{help}</small>
                </span>
              </label>
            ))}
          </div>
          {!extra.contact && features.contactForm && <p className="help" style={{ marginTop: 12 }}>The contact form lives on the Contact page — turning that page on is recommended.</p>}
        </>
      )
      break
    case 3:
      body = (
        <>
          <h2>Pick a look</h2>
          <p className="muted">Each one is a complete design; your words and photos go into it. Pick the one that feels most like you.</p>
          <div className="dirs">
            {p.directions.map((d) => {
              const t = d.tokens
              const on = draft.direction === d.name
              return (
                <button key={d.name} type="button" className={`dir ${on ? 'on' : ''}`} onClick={() => set('direction', d.name)} aria-pressed={on}>
                  <div className="preview" style={{ background: t['--background'], color: t['--foreground'], fontFamily: d.fonts.body }}>
                    <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: t['--muted-foreground'] }}>{d.label}</div>
                    <h3 style={{ fontFamily: `'${d.fonts.heading}', serif`, color: t['--foreground'] }}>A place to belong</h3>
                    <div style={{ color: t['--muted-foreground'], fontSize: 13 }}>Sundays at 10, everyone welcome.</div>
                    <span className="btn" style={{ background: t['--primary'], color: t['--primary-foreground'], borderColor: t['--primary'], borderRadius: t['--radius'] }}>
                      Plan a visit
                    </span>
                  </div>
                  <div className="meta">
                    <strong>{d.label}</strong>
                    <span>{d.summary}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )
      break
    case 4:
      body = (
        <>
          <h2>Your words</h2>
          <Field label="Who is the site for?" path="copy.audience" kind="textarea" required maxLength={500} help="Describe the people you most want to reach, in a sentence or two." value={draft.copy.audience} onChange={(v) => set('copy.audience', v)} issue={issueFor('copy.audience')} />
          <Field label="How should it sound?" path="copy.tone" kind="select" options={TONES} value={draft.copy.tone} onChange={(v) => set('copy.tone', v)} issue={issueFor('copy.tone')} />
          <div className="field">
            <label>Three to five things people should know</label>
            {draft.copy.keyMessages.map((m, i) => (
              <input key={i} className="input" style={{ marginBottom: 8 }} value={m} maxLength={200} placeholder={['Sunday service at 10am, everyone welcome', 'Wednesday soup lunch, no sign-up needed', 'Food pantry every second Saturday'][i] ?? ''} onChange={(e) => set(`copy.keyMessages.${i}`, e.target.value)} />
            ))}
            {draft.copy.keyMessages.length < 5 && (
              <button type="button" className="btn sm" onClick={() => set('copy.keyMessages', [...draft.copy.keyMessages, ''])}>
                Add another
              </button>
            )}
            <div className="help">Short and specific. These become the main sections of the home page.</div>
          </div>
          <div className="field">
            <label>What do you want visitors to do? (up to 3)</label>
            {draft.copy.callsToAction.map((m, i) => (
              <input key={i} className="input" style={{ marginBottom: 8 }} value={m} maxLength={60} placeholder={['Plan a visit', 'Give', 'Volunteer'][i] ?? ''} onChange={(e) => set(`copy.callsToAction.${i}`, e.target.value)} />
            ))}
            {draft.copy.callsToAction.length < 3 && (
              <button type="button" className="btn sm" onClick={() => set('copy.callsToAction', [...draft.copy.callsToAction, ''])}>
                Add another
              </button>
            )}
          </div>
          <div className="field">
            <label>Kind words from real people (optional, up to 6)</label>
            {draft.copy.testimonials.map((t, i) => (
              <div key={i} className="list-item">
                <textarea className="textarea" style={{ minHeight: 70 }} placeholder="What they said" maxLength={400} value={t.quote} onChange={(e) => set(`copy.testimonials.${i}.quote`, e.target.value)} />
                <div className="row" style={{ marginTop: 8 }}>
                  <input className="input" placeholder="Their name" maxLength={80} value={t.name} onChange={(e) => set(`copy.testimonials.${i}.name`, e.target.value)} />
                  <input className="input" placeholder="e.g. member since 2019 (optional)" maxLength={80} value={t.role} onChange={(e) => set(`copy.testimonials.${i}.role`, e.target.value)} />
                </div>
                <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => set('copy.testimonials', draft.copy.testimonials.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            ))}
            {draft.copy.testimonials.length < 6 && (
              <button type="button" className="btn sm" onClick={() => set('copy.testimonials', [...draft.copy.testimonials, { quote: '', name: '', role: '' }])}>
                Add a quote
              </button>
            )}
            <div className="help">Only real quotes from real people. We never invent these.</div>
          </div>
        </>
      )
      break
    case 5:
      body = (
        <>
          <h2>Photos</h2>
          <p className="muted">Your own photos of your place and people make the biggest difference. We never add stock photos. Landscape photos work best at the top of pages. Up to 30.</p>
          <div className="field">
            <label className="btn pri" style={{ display: 'inline-block' }}>
              {busy ? 'Uploading…' : 'Add photos'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden disabled={busy || photos.length >= 30} onChange={(e) => void upload(e.target.files, 'photos')} />
            </label>
            <div className="thumbs">
              {photos.map((ph, i) => (
                <div key={ph.key} className="thumb">
                  <img src={`${p.mediaBaseUrl}/${ph.key}`} alt="" />
                  <input placeholder="What's in this photo?" maxLength={200} value={ph.alt ?? ''} onChange={(e) => set(`media.photos.${i}.alt`, e.target.value)} />
                  <button type="button" className="btn sm" style={{ width: '100%', borderRadius: 0 }} onClick={() => set('media.photos', photos.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="help">A few words about each photo helps people who can't see it, and helps us place it well.</div>
          </div>
          <div className="field">
            <label>Logo (optional)</label>
            <label className="btn" style={{ display: 'inline-block' }}>
              {logo ? 'Replace logo' : 'Add logo'}
              <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden disabled={busy} onChange={(e) => void upload(e.target.files, 'logo')} />
            </label>
            {logo && <img src={`${p.mediaBaseUrl}/${logo.key}`} alt="Logo" style={{ height: 48, marginLeft: 12, verticalAlign: 'middle' }} />}
          </div>
        </>
      )
      break
    case 6:
      body = (
        <>
          <h2>Something to start with</h2>
          <p className="muted">Optional. You'll be able to add more yourself once the site is live.</p>
          {features.posts && (
            <div className="field">
              <label>A first news post or two</label>
              {draft.seed.posts.map((t, i) => (
                <div key={i} className="list-item">
                  <input className="input" placeholder="Title" maxLength={120} value={t.title} onChange={(e) => set(`seed.posts.${i}.title`, e.target.value)} />
                  <textarea className="textarea" style={{ marginTop: 8 }} placeholder="The post itself" maxLength={4000} value={t.body} onChange={(e) => set(`seed.posts.${i}.body`, e.target.value)} />
                  <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => set('seed.posts', draft.seed.posts.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
              ))}
              {draft.seed.posts.length < 3 && (
                <button type="button" className="btn sm" onClick={() => set('seed.posts', [...draft.seed.posts, { title: '', body: '' }])}>
                  Add a post
                </button>
              )}
            </div>
          )}
          {features.events && (
            <div className="field">
              <label>Upcoming events</label>
              {draft.seed.events.map((t, i) => (
                <div key={i} className="list-item">
                  <input className="input" placeholder="Event name" maxLength={120} value={t.title} onChange={(e) => set(`seed.events.${i}.title`, e.target.value)} />
                  <div className="row" style={{ marginTop: 8 }}>
                    <div>
                      <label className="help">Starts</label>
                      <input className="input" type="datetime-local" value={t.startsAt} onChange={(e) => set(`seed.events.${i}.startsAt`, e.target.value)} />
                    </div>
                    <div>
                      <label className="help">Ends (optional)</label>
                      <input className="input" type="datetime-local" value={t.endsAt} onChange={(e) => set(`seed.events.${i}.endsAt`, e.target.value)} />
                    </div>
                  </div>
                  <input className="input" style={{ marginTop: 8 }} placeholder="Where (optional)" maxLength={200} value={t.location} onChange={(e) => set(`seed.events.${i}.location`, e.target.value)} />
                  <textarea className="textarea" style={{ marginTop: 8, minHeight: 70 }} placeholder="A sentence or two (optional)" maxLength={2000} value={t.description} onChange={(e) => set(`seed.events.${i}.description`, e.target.value)} />
                  <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => set('seed.events', draft.seed.events.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
              ))}
              {draft.seed.events.length < 10 && (
                <button type="button" className="btn sm" onClick={() => set('seed.events', [...draft.seed.events, { title: '', startsAt: '', endsAt: '', location: '', description: '' }])}>
                  Add an event
                </button>
              )}
            </div>
          )}
          {!features.posts && !features.events && <p className="muted">Nothing to add here — you didn't turn on news or events.</p>}
        </>
      )
      break
    default: {
      const b = toBrief(draft)
      body = (
        <>
          <h2>Check and send</h2>
          <div className="field">
            <label>Who can sign in to edit the site?</label>
            {draft.admins.map((a, i) => (
              <input key={i} className="input" style={{ marginBottom: 8 }} type="email" value={a} maxLength={254} onChange={(e) => set(`admins.${i}`, e.target.value)} />
            ))}
            {draft.admins.length < 5 && (
              <button type="button" className="btn sm" onClick={() => set('admins', [...draft.admins, ''])}>
                Add a person
              </button>
            )}
            <div className="help">They'll sign in with a link sent to their email. No passwords.</div>
          </div>
          <Field label="Time zone" path="timezone" help="For event times." value={draft.timezone} onChange={(v) => set('timezone', v)} issue={issueFor('timezone')} />
          <Field label="Anything else? (optional)" path="notes" kind="textarea" maxLength={1000} value={draft.notes} onChange={(v) => set('notes', v)} issue={issueFor('notes')} />
          <div className="card">
            <p>
              <span className="tag">{b.org.name}</span>
              <span className="tag">{b.direction || 'no look chosen'}</span>
              <span className="tag">{b.pages.join(' · ')}</span>
            </p>
            <p className="muted">
              {b.media.photos.length} photos · {b.copy.keyMessages.length} key messages · {b.copy.testimonials?.length ?? 0} quotes
            </p>
            {slug && (
              <p className="muted">
                Your site will first appear at <strong>{slug}.{p.studioDomain}</strong>; your own domain can be attached once it's built.
              </p>
            )}
          </div>
          {issues.length > 0 && (
            <ul className="msg err" style={{ marginTop: 16 }}>
              {issues.map((i, k) => (
                <li key={k}>
                  <code>{i.path}</code>: {i.message}
                </li>
              ))}
            </ul>
          )}
        </>
      )
    }
  }

  return (
    <div>
      <h1>New website brief</h1>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      {error && <div className="msg err">{error}</div>}
      <div className="card">{body}</div>
      <div className="actions">
        <button type="button" className="btn" onClick={back} disabled={step === 0 || busy}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn pri" onClick={() => void next()} disabled={busy}>
            {busy ? 'One moment…' : 'Continue'}
          </button>
        ) : (
          <button type="button" className="btn pri" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Sending…' : 'Build my website'}
          </button>
        )}
      </div>
    </div>
  )
}
