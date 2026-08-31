/** Works in server and client components: NEXT_PUBLIC_* is inlined at build. */
export function mediaUrl(key: string): string {
  const base = (process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? '').replace(/\/+$/, '')
  return `${base}/${key}`
}
