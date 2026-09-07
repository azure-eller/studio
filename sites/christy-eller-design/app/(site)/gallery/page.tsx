import type { Metadata } from 'next'
import { Gallery, PageHeader } from '@/components/sections'

export const metadata: Metadata = {
  title: 'Work: websites for Colorado businesses',
  description: 'Live websites designed and built by Christy Eller for hotels, libraries, farms, festivals and nonprofits, each shown as it is with its real web address.',
}

export default function Page() {
  return (
    <>
      <PageHeader title="Work" body="Sites I designed and built, shown as they are. Every one is live; the address in the strip goes to it." />
      <Gallery collection="work" labelledBy="page-title" />
    </>
  )
}
