import type { Metadata } from 'next'
import { PageHeader, PostList } from '@/components/sections'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Short notes from Christy Eller on websites for small businesses and nonprofits: photos, admins an owner can use, and getting a site launched in weeks.',
}

export default function Page() {
  return (
    <>
      <PageHeader title="Notes" body="Short pieces on websites for small businesses, when there is something worth saying." />
      <PostList limit={24} labelledBy="page-title" />
    </>
  )
}
