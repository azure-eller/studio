const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const shell = (title: string, body: string) => `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px">${esc(title)}</h1>${body}</body></html>`

export function magicLinkEmail(opts: { siteName: string; url: string }) {
  return {
    subject: `Sign in to ${opts.siteName}`,
    html: shell(
      `Sign in to ${opts.siteName}`,
      `<p>Click the link below to sign in. It works once and expires in 15 minutes.</p>
<p><a href="${esc(opts.url)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a></p>
<p style="color:#666;font-size:13px">If you didn't request this, you can ignore this email.</p>`,
    ),
    text: `Sign in to ${opts.siteName}: ${opts.url}\n\nThis link works once and expires in 15 minutes.`,
  }
}

export function submissionEmail(opts: { siteName: string; form: string; payload: Record<string, unknown>; adminUrl: string }) {
  const rows = Object.entries(opts.payload)
    .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 8px;white-space:pre-wrap">${esc(String(v ?? ''))}</td></tr>`)
    .join('')
  const text = Object.entries(opts.payload).map(([k, v]) => `${k}: ${String(v ?? '')}`).join('\n')
  return {
    subject: `New ${opts.form} submission — ${opts.siteName}`,
    html: shell(`New ${opts.form} submission`, `<table>${rows}</table><p><a href="${esc(opts.adminUrl)}">Open in admin</a></p>`),
    text: `New ${opts.form} submission\n\n${text}\n\n${opts.adminUrl}`,
  }
}

export function donationReceiptEmail(opts: { siteName: string; amountCents: number; currency: string }) {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: opts.currency.toUpperCase() }).format(opts.amountCents / 100)
  return {
    subject: `Thank you for your gift to ${opts.siteName}`,
    html: shell(`Thank you`, `<p>We received your donation of <strong>${esc(amount)}</strong> to ${esc(opts.siteName)}. Thank you for your support.</p>`),
    text: `We received your donation of ${amount} to ${opts.siteName}. Thank you for your support.`,
  }
}
