import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentAdmin } from '@/lib/studio-auth'
import { createInvite } from '../actions'

export const dynamic = 'force-dynamic'

export default async function Invite({ searchParams }: { searchParams: Promise<{ link?: string; error?: string }> }) {
  if (!(await currentAdmin())) redirect('/studio/login')
  const { link, error } = await searchParams
  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <p>
        <Link href="/studio">← Sites</Link>
      </p>
      <h1>Invite a client</h1>
      {link && (
        <div className="msg ok">
          Invite created. Their link:
          <br />
          <code style={{ wordBreak: 'break-all' }}>{link}</code>
        </div>
      )}
      {error && <p className="msg err">Please enter an email address.</p>}
      <form action={createInvite} className="card">
        <div className="field">
          <label htmlFor="email">Client's email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="note">Their name (optional, used in the email)</label>
          <input id="note" name="note" className="input" maxLength={80} />
        </div>
        <label className="check" style={{ marginBottom: 16 }}>
          <input type="checkbox" name="send" value="1" defaultChecked />
          <span>Email them the link now</span>
        </label>
        <button className="btn pri" type="submit">
          Create invite
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>Invites last 30 days. When the client submits, the build starts on its own and you'll get the "it's done" email.</p>
    </main>
  )
}
