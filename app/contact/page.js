import ContactClient from '@/components/contact/ContactClient'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Contact CreatorStore — Support & Inquiries',
  description:
    'Have questions, need help, or want to report an issue? Reach out to the CreatorStore support team directly for billing, technical setup, and general inquiries.',
}

export default function ContactPage() {
  return <ContactClient supportEmail={SUPPORT_EMAIL} />
}
