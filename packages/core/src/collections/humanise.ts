/** `coverMediaId` → "Cover media ID". Shared by field derivation (server) and the admin (client); no other imports. */
export function humanise(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\bid\b/i, 'ID')
    .replace(/^./, (c) => c.toUpperCase())
}
