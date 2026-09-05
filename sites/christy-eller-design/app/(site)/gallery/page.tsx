import type { Metadata } from 'next'
import { PageHeader, WorkGrid } from '@/components/sections'

export const metadata: Metadata = {
  title: 'Work: websites by Christy Eller',
  description:
    'Websites Christy Eller has built for Colorado businesses and nonprofits: a soil company, a peach farm, a 1906 hotel, libraries, festivals and theatres.',
}

export default function Page() {
  return (
    <>
      <PageHeader
        title="Work"
        body="Real places, real photos, sites the owners run themselves. Every one of these is a business or organization with a real thing to show."
      />
      <WorkGrid collection="work" labelledBy="page-title" />
    </>
  )
}
