import BusinessCardsClient from './BusinessCardsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Business cards | CreatorStore',
  description: 'Customize your digital business card, QR code, and contact-sharing settings on CreatorStore.',
}

export default async function BusinessCardsPage() {
  return <BusinessCardsClient />
}
