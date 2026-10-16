'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap, Package, Video, Users, Radio, HeartHandshake, Briefcase, Calendar, Download
} from 'lucide-react'
import CircularOptionRow from '@/components/dashboard/CircularOptionRow'
import { ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

const OFFERINGS = [
  {
    title: 'Courses',
    description: 'Share your expertise with an online course.',
    href: '/dashboard/store?add=course',
    icon: GraduationCap,
  },
  {
    title: 'Digital products',
    description: 'Share downloadable content.',
    href: '/dashboard/store?add=digital_product',
    icon: Package,
  },
  {
    title: 'Bookings',
    description: 'Get booked for sessions, calls, or coaching.',
    href: '/dashboard/store?add=booking',
    icon: Video,
  },
  {
    title: 'Memberships',
    description: 'Recurring community access or content subscriptions.',
    href: '/dashboard/store?add=membership',
    icon: Users,
  },
  {
    title: 'Webinars',
    description: 'Live masterclasses and group sessions.',
    href: '/dashboard/store?add=webinar',
    icon: Radio,
  },
  {
    title: 'Community',
    description: 'Paid community access for your audience.',
    href: '/dashboard/store?add=community',
    icon: HeartHandshake,
  },
  {
    title: 'Services',
    description: 'Custom deliverables like design, audits, or freelance work.',
    href: '/dashboard/store?add=service',
    icon: Briefcase,
  },
]

export default function EarnOverviewPage() {
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({ title: 'Earn', actions: null })
  }, [setHeaderConfig])

  return (
    <div className="flex flex-col gap-8 max-w-5xl pb-16">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight">Turn what you know into income.</h2>
        <p className="text-xs sm:text-sm text-[#6F6F6B] font-normal mt-1">
          Pick how you want to earn — we&apos;ll walk you through setup in minutes.
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-4">
          {OFFERINGS.map((item) => (
            <CircularOptionRow
              key={item.title}
              href={item.href}
              icon={item.icon}
              iconColor={item.iconColor}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-[#E5E5E3]">
        <Link
          href="/dashboard/success-center"
          className="text-xs font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors"
        >
          Got an idea? Tell us what you want to sell next &rarr;
        </Link>
      </div>
    </div>
  )
}
