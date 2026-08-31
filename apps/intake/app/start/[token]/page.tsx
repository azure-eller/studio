import { and, eq, gt } from 'drizzle-orm'
import { briefs, invites, studioDb } from '@/lib/db'
import { directions } from '@/lib/directions'
import { IntakeForm } from '@/components/IntakeForm'

export default async function StartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = studioDb()
  const [inv] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), gt(invites.expiresAt, new Date())))
    .limit(1)
  if (!inv) {
    return (
      <main className="wrap">
        <h1>This link isn't valid</h1>
        <p className="muted">It may have expired. Ask us for a new one.</p>
      </main>
    )
  }
  const [existing] = await db.select().from(briefs).where(eq(briefs.inviteId, inv.id)).limit(1)
  if (existing && existing.status !== 'draft') {
    return (
      <main className="wrap">
        <h1>Already submitted</h1>
        <p className="muted">Your brief is in. Your site is on its way; we'll email you when it's ready.</p>
      </main>
    )
  }
  // The Look step previews each direction in its own typefaces.
  const families = [...new Set(directions().flatMap((d) => [d.fonts.heading, d.fonts.body]))]
  const fontsHref = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`).join('&')}&display=swap`
  return (
    <main className="wrap">
      <link rel="stylesheet" href={fontsHref} />
      <IntakeForm
        token={token}
        inviteEmail={inv.email}
        directions={directions().map((d) => ({ name: d.name, label: d.label, summary: d.summary, suits: d.suits, fonts: d.fonts, tokens: d.tokens }))}
        existing={existing ? { briefId: existing.id, slug: existing.slug, draft: (existing.brief ?? null) as Record<string, unknown> | null } : null}
        mediaBaseUrl={process.env['MEDIA_BASE_URL'] ?? ''}
      />
    </main>
  )
}
