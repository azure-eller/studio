# Setting up your studio (for Christy)

Everything below happens on your own computer, in your own accounts. Nothing needs Azure's logins,
and you never share a password with anyone — including the AI.

## One-time installs (10 minutes)

1. Install **Node.js 22+** from https://nodejs.org (the "LTS" button).
2. In a terminal: `npm install -g pnpm @anthropic-ai/claude-code`
3. Install **GitHub CLI** from https://cli.github.com, then run `gh auth login` (choose browser login).

## Accounts you need (free to start)

GitHub, Vercel, Neon, Cloudflare (holding your domain), Resend — all under YOUR email —
plus your Claude Pro/Max subscription. Sign up for any you don't have; stay logged in in your browser.

## Then let Claude do the rest

```
gh repo clone <the-studio-repo> studio
cd studio
claude
```

and type:

```
/setup-studio
```

Claude walks you through everything: creating the handful of API tokens (you'll be told exactly
where each button is), two clicks in Cloudflare, and one command that sets up everything else.
At the end you'll invite yourself as a test client, fill in the form, and watch a website build
itself and email you when it's done. Roughly 45 minutes end to end.

Costs while testing: $0 except your Claude subscription. Before the first paying client:
Vercel Pro ($20/mo — their terms require it for commercial sites).
