'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X,
  ChevronRight,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  IdCard,
  Megaphone,
  Calendar,
  Bot,
  Link2,
  FormInput,
  Settings,
  User,
  CreditCard,
  Cookie,
  HelpCircle,
  Mail,
  Zap,
  ChevronsUpDown,
  ShoppingBag
} from 'lucide-react'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { BRAND_COLOR } from '@/components/brand/CreatorStoreBrand'
import MobileBottomNavigation from '@/components/dashboard/MobileBottomNavigation'

/**
 * MobileMoreDrawer — Mobile More screen strictly following Linktree reference Screenshot 5.
 * 
 * Sections:
 * - Header: "More", Pro status / Keep Pro access CTA, close button
 * - Profile Switcher Row: Avatar, @username, storefront URL, switcher indicator
 * - Tools: Business cards, Media kit, Social planner, Automations, Link shortener, Forms
 * - Account: Settings, Account, Billing, Cookie preferences
 * - Support: Ask a question, Help topics, Log out
 * - Fixed bottom navigation is rendered with "More" active.
 */
export default function MobileMoreDrawer({
  isOpen,
  onClose,
  me,
  onLogout
}) {
  const pathname = usePathname()
  const { setPricingModalOpen } = useDashboardHeader()
  const [cookieToast, setCookieToast] = useState(false)

  // Close on route change
  useEffect(() => {
    onClose?.()
  }, [pathname])

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const rawUsername = me?.store?.username || me?.store?.slug || me?.profile?.username || 'creator'
  const username = rawUsername.replace(/^@/, '')
  const creatorName = me?.profile?.name || username
  const initial = (creatorName || me?.user?.email || 'C')[0].toUpperCase()
  const storeUrl = `creatorstore.store/${username}`
  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial && sub?.planId !== 'UNSUBSCRIBED' && sub?.plan !== 'UNSUBSCRIBED')
  const isTrialActive = Boolean(
    !isPaid &&
    (sub?.isTrial || sub?.status === 'TRIALING' || sub?.trialStatus === 'ACTIVE') &&
    !sub?.isTrialExpired &&
    (!sub?.trialEndsAt || new Date(sub.trialEndsAt).getTime() > Date.now())
  )

  const toolItems = [
    {
      title: 'Business cards',
      desc: 'Share your details with a tap or scan',
      icon: IdCard,
      href: '/dashboard/business-cards',
    },
    {
      title: 'Media kit',
      desc: 'Help brands find and collaborate with you',
      icon: Megaphone,
      href: '/dashboard/marketing',
    },
    {
      title: 'Social planner',
      desc: 'Schedule content and get inspired',
      icon: Calendar,
      href: '/dashboard/calendar',
    },
    {
      title: 'Instagram auto-reply',
      desc: 'Send automated comments and DMs',
      icon: Bot,
      href: '/dashboard/automations',
      badge: 'AutoDM',
    },
    {
      title: 'Link shortener',
      desc: 'Make long URLs short and trackable',
      icon: Link2,
      href: '/dashboard/external-link',
    },
    {
      title: 'Forms & Responses',
      desc: 'Collect inquiries, emails and feedback',
      icon: FormInput,
      href: '/dashboard/forms',
    },
  ]

  const accountItems = [
    {
      title: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
    },
    {
      title: 'Account',
      icon: User,
      href: '/dashboard/settings?tab=account',
    },
    {
      title: 'Billing & Payouts',
      icon: CreditCard,
      href: '/dashboard/payments',
    },
    {
      title: 'Orders & Sales',
      icon: ShoppingBag,
      href: '/dashboard/earn/orders',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FFFFFF] text-[#222222] md:hidden overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="More Menu"
    >
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-[#E8E8E8] shrink-0 bg-[#FFFFFF]">
        <h1 className="text-2xl font-extrabold text-[#222222] tracking-tight">
          More
        </h1>

        <div className="flex items-center gap-2">
          {/* Pro / Reactivate Pro Pill */}
          <button
            type="button"
            onClick={() => {
              onClose()
              setPricingModalOpen?.(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E8E8E8] bg-[#FFFFFF] hover:bg-[#F2F2F2] active:scale-95 text-xs font-bold text-[#222222] shadow-2xs transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-[#FF4B1F] fill-[#FF4B1F]" />
            <span>{isPaid ? 'Pro Plan' : isTrialActive ? 'Keep Pro access' : 'Reactivate Pro'}</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-6 pb-28">

        {/* PROFILE / ACCOUNT SWITCHER ROW */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-[#F2F2F2] flex items-center justify-center overflow-hidden shrink-0 border border-[#E8E8E8]">
              {me?.profile?.avatarUrl ? (
                <img src={me.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-bold text-[#222222]">{initial}</span>
              )}
            </div>

            <div className="min-w-0 flex flex-col">
              <span className="text-base font-bold text-[#222222] truncate">
                {username}
              </span>
              <span className="text-xs text-[#777777] truncate font-medium">
                {storeUrl}
              </span>
            </div>
          </div>

          <div className="p-1.5 text-[#777777] shrink-0">
            <ChevronsUpDown className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* SECTION: TOOLS */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[#8C8C88] uppercase tracking-wider px-1">
            Tools
          </h2>

          <div className="divide-y divide-[#F2F2F2] rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] overflow-hidden shadow-2xs">
            {toolItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between p-3.5 min-h-[48px] hover:bg-[#F2F2F2] active:bg-[#E8E8E8] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-[#F2F2F2] group-hover:bg-[#E8E8E8] flex items-center justify-center text-[#222222] shrink-0 transition-colors">
                      <Icon className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#222222] truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#194DF5]/10 text-[#194DF5]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#777777] truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* SECTION: ACCOUNT */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[#8C8C88] uppercase tracking-wider px-1">
            Account
          </h2>

          <div className="divide-y divide-[#F2F2F2] rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] overflow-hidden shadow-2xs">
            {accountItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between p-3.5 min-h-[48px] hover:bg-[#F2F2F2] active:bg-[#E8E8E8] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4.5 w-4.5 text-[#777777] group-hover:text-[#222222] shrink-0 stroke-[1.8]" />
                    <span className="text-sm font-semibold text-[#222222]">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* SECTION: SUPPORT */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[#8C8C88] uppercase tracking-wider px-1">
            Support
          </h2>

          <div className="divide-y divide-[#F2F2F2] rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => {
                const email = 'support@creatorstore.app'
                const subject = encodeURIComponent('Question from CreatorStore')
                window.open(`mailto:${email}?subject=${subject}`, '_blank')
              }}
              className="w-full flex items-center justify-between p-3.5 min-h-[48px] hover:bg-[#F2F2F2] active:bg-[#E8E8E8] transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <HelpCircle className="h-4.5 w-4.5 text-[#777777] group-hover:text-[#222222] shrink-0 stroke-[1.8]" />
                <span className="text-sm font-semibold text-[#222222]">
                  Ask a question
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>

            <Link
              href="/help"
              onClick={onClose}
              className="flex items-center justify-between p-3.5 min-h-[48px] hover:bg-[#F2F2F2] active:bg-[#E8E8E8] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="h-4.5 w-4.5 text-[#777777] group-hover:text-[#222222] shrink-0 stroke-[1.8]" />
                <span className="text-sm font-semibold text-[#222222]">
                  Help topics & Documentation
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-between p-3.5 min-h-[48px] hover:bg-rose-50 active:bg-rose-100 transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <LogOut className="h-4.5 w-4.5 text-[#DC2626] shrink-0 stroke-[1.8]" />
                <span className="text-sm font-semibold text-[#DC2626]">
                  Log out
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#DC2626]/40 group-hover:text-[#DC2626] transition-colors shrink-0 ml-2" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. FIXED BOTTOM NAVIGATION DOCK WITH MORE ACTIVE */}
      <MobileBottomNavigation
        onOpenMore={onClose}
        isMoreOpen={true}
      />
    </div>
  )
}
