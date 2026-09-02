import type { ReactNode } from 'react'

/** No site header/footer around the admin. `.admin` scopes the admin's design tokens (see admin.css). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin admin-root">{children}</div>
}
