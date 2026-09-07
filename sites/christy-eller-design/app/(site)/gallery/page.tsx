import type { Metadata } from 'next'
import { Gallery, PageHeader } from '@/components/sections'

export const metadata: Metadata = { title: "Gallery", description: "Photos from Christy Eller Design." }

export default function Page() {
  return (
    <>
      <PageHeader title="Gallery" body="A look around Christy Eller Design." />
      <Gallery collection="gallery" title="Photos" />
    </>
  )
}
