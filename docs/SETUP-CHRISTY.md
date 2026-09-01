# Setting up your studio

The five steps are at the top of the repository README ("Christy — start here"). Everything else —
creating the API tokens in your dashboards, the Cloudflare clicks, the database, email domain, GitHub
secrets, the intake app, and a first test website — is done by your assistant when you type
`/setup-studio`. You will never be asked for a password.

What only you can do: install two tools, sign in to your accounts in Chrome, click "Authorize" when a
site asks, run `claude setup-token` once (it opens your browser), and — if your domain isn't at
Cloudflare yet — change its nameservers at your registrar.

Costs while testing: $0 beyond your Claude subscription. Before your first paying client: Vercel Pro
($20/month — their terms require it for commercial sites).
