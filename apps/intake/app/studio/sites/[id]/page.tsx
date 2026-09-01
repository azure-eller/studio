import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { STRIPE_KEY_INSTRUCTIONS } from '@studio/pipeline/src/steps/golive'
import { vercel } from '@studio/pipeline/src/clients/vercel'
import { namesFor } from '@studio/pipeline/src/config'
import { briefs, builds, studioDb } from '@/lib/db'
import { currentAdmin } from '@/lib/studio-auth'
import { actionAddDomain, actionSetAdmins, actionSetStripe } from './actions'

export const dynamic = 'force-dynamic'

export default async function SitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  if (!(await currentAdmin())) redirect('/studio/login')
  const { id } = await params
  const sp = await searchParams
  const db = studioDb()
  const [b] = await db.select().from(briefs).where(eq(briefs.id, id)).limit(1)
  if (!b) redirect('/studio')
  const [last] = await db.select().from(builds).where(eq(builds.briefId, id)).orderBy(desc(builds.startedAt)).limit(1)
  const brief = b.brief as { org?: { name?: string }; admins?: string[]; features?: { donations?: boolean } } | null
  const name = brief?.org?.name ?? b.slug
  const onStudio = !b.siteUrl || b.siteUrl.endsWith(`.${process.env['STUDIO_DOMAIN'] ?? ''}`)
  // What the live site actually uses (set-admins may have changed it since the brief was written).
  let currentAdmins = (brief?.admins ?? []).join(', ')
  try {
    const vc = vercel(process.env['VERCEL_TOKEN'] ?? '', process.env['VERCEL_TEAM_ID'])
    const project = await vc.findProject(namesFor(b.slug, process.env['STUDIO_DOMAIN'] ?? '').vercelProject)
    if (project) currentAdmins = (await vc.getEnv(project.id))['ADMIN_EMAILS'] ?? currentAdmins
  } catch {
    /* fall back to the brief */
  }
  return (
    <main className="wrap" style={{ maxWidth: 760 }}>
      <p>
        <Link href="/studio">← Sites</Link>
      </p>
      <h1>{name}</h1>
      <p className="muted">
        <span className="tag">{b.status}</span> {b.siteUrl && <a href={b.siteUrl} target="_blank" rel="noopener">{b.siteUrl}</a>}
        {b.siteUrl && (
          <>
            {' · '}
            <a href={`${b.siteUrl}/admin`} target="_blank" rel="noopener">their admin</a>
          </>
        )}
        {b.repoUrl && (
          <>
            {' · '}
            <a href={b.repoUrl} target="_blank" rel="noopener">code</a>
          </>
        )}
      </p>
      {sp.ok && <pre className="msg ok" style={{ whiteSpace: 'pre-wrap' }}>{sp.ok}</pre>}
      {sp.err && <p className="msg err">{sp.err}</p>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>1. Their own domain {onStudio ? <span className="tag">not yet</span> : <span className="tag">done</span>}</h2>
        <p className="muted">Attaches the domain to the site and tells you the DNS record the client must add wherever their domain lives. Search engines are told to index the site only after this.</p>
        <form action={actionAddDomain} className="field">
          <input type="hidden" name="id" value={b.id} />
          <label htmlFor="domain">Domain</label>
          <div className="row">
            <input id="domain" name="domain" className="input" placeholder="example.org" required />
            <button className="btn pri" type="submit">Attach domain</button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>2. Who can edit the site</h2>
        <p className="muted">They sign in at the site's <code>/admin</code> with a link emailed to them. No passwords.</p>
        <form action={actionSetAdmins} className="field">
          <input type="hidden" name="id" value={b.id} />
          <label htmlFor="emails">Email addresses (comma separated)</label>
          <div className="row">
            <input id="emails" name="emails" className="input" defaultValue={currentAdmins} required />
            <button className="btn pri" type="submit">Save admins</button>
          </div>
        </form>
      </section>

      {brief?.features?.donations && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>3. Online giving (Stripe)</h2>
          <p className="muted">The client's own Stripe account; money never passes through the studio.</p>
          <pre className="muted" style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem' }}>{STRIPE_KEY_INSTRUCTIONS.replace('<site>', b.siteUrl ?? 'https://<their site>')}</pre>
          <form action={actionSetStripe}>
            <input type="hidden" name="id" value={b.id} />
            <div className="field">
              <label htmlFor="secretKey">Restricted key (rk_live_…)</label>
              <input id="secretKey" name="secretKey" className="input" required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="webhookSecret">Webhook signing secret (whsec_…)</label>
              <input id="webhookSecret" name="webhookSecret" className="input" required autoComplete="off" />
            </div>
            <button className="btn pri" type="submit">Save Stripe keys</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Last build</h2>
        {last ? (
          <>
            <p className="muted">
              {last.status} @ {last.step ?? '—'} · {last.modelTurns ?? '?'} turns · ${(last.modelCostUsd ?? 0).toFixed(2)} · {last.startedAt.toLocaleString()}
            </p>
            <details>
              <summary className="muted">Log</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.75rem', maxHeight: 400, overflow: 'auto' }}>{last.log.slice(-8000)}</pre>
            </details>
          </>
        ) : (
          <p className="muted">No builds yet.</p>
        )}
      </section>
    </main>
  )
}
