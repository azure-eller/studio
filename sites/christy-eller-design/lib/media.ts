/** Works in server and client components: NEXT_PUBLIC_* is inlined at build. */
export function mediaUrl(key: string): string {
  if (key.startsWith('/')) return key // a file in this repo's public/ (e.g. photos sourced during the build)
  const base = (process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? '').replace(/\/+$/, '')
  return `${base}/${key}`
}
