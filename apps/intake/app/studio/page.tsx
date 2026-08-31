import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { briefs, builds, studioDb } from '@/lib/db'
import { currentAdmin } from '@/lib/studio-auth'
import { logout, rerunBuild } from './actions'

export const dynamic = 'force-dynamic'

export default async function Studio({ searchParams }: { searchParams: Promise<{ rerun?: string; error?: string }> }) {
  const admin = await currentAdmin()
  if (!admin) redirect('/studio/login')
  const sp = await searchParams
  const db = studioDb()
  const rows = await db.select().from(briefs).orderBy(desc(briefs.createdAt)).limit(100)
  const latest = new Map<string, typeof builds.$inferSelect>()
  for (const b of rows) {
    const [last] = await db.select().from(builds).where(eq(builds.briefId, b.id)).orderBy(desc(builds.startedAt)).limit(1)
    if (last) latest.set(b.id, last)
  }
  const orgName = (b: (typeof rows)[number]) => ((b.brief as { org?: { name?: string } } | null)?.org?.name ?? b.slug)
  return (
    <main className="wrap" style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Sites</h1>
        <div>
          <Link href="/studio/invite" className="btn pri">
            Invite a client
          </Link>{' '}
          <form action={logout} style={{ display: 'inline' }}>
            <button className="btn" type="submit">
              Sign out ({admin})
            </button>
          </form>
        </div>
      </div>
      {sp.rerun && <p className="msg ok">Build dispatched. You'll get an email when it's done.</p>}
      {sp.error && <p className="msg err">{sp.error}</p>}
      {rows.length === 0 ? (
        <p className="muted">No briefs yet. Invite a client to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Last build</th>
              <th>Links</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const last = latest.get(b.id)
              return (
                <tr key={b.id}>
                  <td>
                    <strong>{orgName(b)}</strong>
                    <br />
                    <span className="muted">{b.slug} · {b.clientEmail}</span>
                  </td>
                  <td>
                    <span className="tag">{b.status}</span>
                  </td>
                  <td className="muted">
                    {last ? (
                      <>
                        {last.status} @ {last.step ?? '—'}
                        <br />
                        {last.modelTurns ?? '?'} turns · ${(last.modelCostUsd ?? 0).toFixed(2)}
                        {last.fixAttempts ? ` · ${last.fixAttempts} fix` : ''}
                        <br />
                        {last.startedAt.toLocaleString()}
                        {last.error && (
                          <>
                            <br />
                            <span style={{ color: '#b91c1c' }}>{last.error.slice(0, 120)}</span>
                          </>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {b.siteUrl && (
                      <>
                        <a href={b.siteUrl} target="_blank" rel="noopener">
                          site
                        </a>{' '}
                        ·{' '}
                        <a href={`${b.siteUrl}/admin`} target="_blank" rel="noopener">
                          admin
                        </a>{' '}
                        ·{' '}
                      </>
                    )}
                    {b.repoUrl && (
                      <a href={b.repoUrl} target="_blank" rel="noopener">
                        repo
                      </a>
                    )}
                  </td>
                  <td>
                    {b.brief && !['provisioning', 'building', 'deploying', 'verifying'].includes(b.status) && (
                      <form action={rerunBuild}>
                        <input type="hidden" name="brief_id" value={b.id} />
                        <button className="btn sm" type="submit">
                          {b.status === 'done' ? 'Rebuild' : 'Build'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: 24 }}>
        Go-live tasks (custom domain, Stripe keys, extra admins) are run from the studio repo for now: <code>pnpm add-domain</code>, <code>pnpm set-stripe</code>, <code>pnpm set-admins</code>.
      </p>
    </main>
  )
}
