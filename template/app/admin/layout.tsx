import type { ReactNode } from 'react'

/** No site header/footer around the admin; core's AdminApp owns the whole viewport. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>
}
