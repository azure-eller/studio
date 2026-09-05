// Part of the template — do not edit. "Add to calendar": one occurrence of an event as an .ics file.
import { docToText, icsFor, nextOccurrence } from '@studio/core'
import { content } from '@/lib/core'
import { site } from '@/lib/site'

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const ev = await content.get('events', slug)
  if (!ev) return new Response('Not found', { status: 404 })
  const at = new URL(req.url).searchParams.get('at')
  const from = at ? new Date(at) : new Date()
  if (Number.isNaN(from.getTime())) return new Response('Bad date', { status: 400 })
  const o = nextOccurrence(ev, from) ?? (at ? null : { startsAt: ev.startsAt, endsAt: ev.endsAt })
  if (!o) return new Response('No upcoming date', { status: 404 })
  const ics = icsFor({ uid: `${slug}@${new URL(site.url).hostname}`, title: ev.title, startsAt: o.startsAt, endsAt: o.endsAt, location: ev.location, description: docToText(ev.description).slice(0, 1000), url: `${site.url}/events/${slug}`, siteName: site.name })
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${slug}.ics"` } })
}
