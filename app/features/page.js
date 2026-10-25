import FeaturesClient from '@/components/features/FeaturesClient'

export const metadata = {
  title: 'CreatorStore Features — Everything to Create, Manage, and Grow',
  description:
    'Explore CreatorStore features: mobile-first digital storefronts, instant digital product delivery, 1:1 coaching bookings, Instagram AutoDM, automated customer payouts, and in-depth analytics.',
  openGraph: {
    title: 'CreatorStore Features — Everything to Create, Manage, and Grow',
    description:
      'Explore CreatorStore features: mobile-first digital storefronts, instant digital product delivery, 1:1 coaching bookings, Instagram AutoDM, automated customer payouts, and in-depth analytics.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreatorStore Features — Everything to Create, Manage, and Grow',
    description:
      'Explore CreatorStore features: mobile-first digital storefronts, instant digital product delivery, 1:1 coaching bookings, Instagram AutoDM, automated customer payouts, and in-depth analytics.',
  },
}

export default function FeaturesPage() {
  return <FeaturesClient />
}
