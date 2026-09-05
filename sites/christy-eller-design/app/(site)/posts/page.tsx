import type { Metadata } from 'next'
import { PageHeader, PostList } from '@/components/sections'

export const metadata: Metadata = { title: "News", description: "News and updates from Christy Eller Design." }

export default function Page() {
  return (
    <>
      <PageHeader title="News" body="Updates from Christy Eller Design." />
      <PostList title="Latest" limit={24} />
    </>
  )
}
