import { requestLogin } from '../actions'

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams
  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <h1>Studio console</h1>
      {sent ? (
        <p className="msg ok">If that address is on the list, a sign-in link is on its way.</p>
      ) : (
        <form action={requestLogin} className="card">
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" name="email" type="email" className="input" required autoFocus />
          </div>
          <button className="btn pri" type="submit">
            Send sign-in link
          </button>
        </form>
      )}
    </main>
  )
}
