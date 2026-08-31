export function formatEventDate(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(d)
}
export function formatEventRange(start: Date, end: Date | null, timezone: string): string {
  const s = formatEventDate(start, timezone)
  if (!end) return s
  const sameDay = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: timezone }).format(start) === new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: timezone }).format(end)
  const e = sameDay ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(end) : formatEventDate(end, timezone)
  return `${s} – ${e}`
}
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(d)
}
