import type { Metadata } from 'next'
import { PageHeader, PostList } from '@/components/sections'

export const metadata: Metadata = {
  title: 'Notes',
  description:
    'Occasional notes from Christy Eller on what makes a small business website work: correct hours, real photos, an admin the owner can use, and launching in weeks.',
}

export default function Page() {
  return (
    <>
      <PageHeader title="Notes" body="Occasional notes from Christy on small business websites." />
      <PostList
        limit={24}
        headingLevel={1}
        emptyText="Nothing here yet. Notes appear here as soon as they are published."
      />
    </>
  )
}
