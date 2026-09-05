import type { Metadata } from 'next'
import { ContactDetails, ContactForm, Map, PageHeader } from '@/components/sections'

export const metadata: Metadata = { title: "Contact", description: "Get in touch with Christy Eller Design." }

export default function Page() {
  return (
    <>
      <PageHeader title="Contact" body="We'd love to hear from you." />
      <ContactDetails />
      <ContactForm variant="contact" title="Send a message" />
      <Map />
    </>
  )
}
