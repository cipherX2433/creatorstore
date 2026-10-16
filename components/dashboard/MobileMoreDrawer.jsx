'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X,
  ChevronRight,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import { MORE_MENU_CATEGORIES } from '@/lib/navigationConfig'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

/**
 * MobileMoreDrawer — Slide-up bottom sheet / drawer for secondary navigation items on mobile.
 * 
 * Includes:
 * - Profile summary & store URL
 * - Plan status & Upgrade CTA
 * - Categorized navigation: Tools & Growth, Finance, Account, Support
 * - Logout trigger
 * - Full touch accessibility & safe scroll containers
 */
export default function MobileMoreDrawer({
  isOpen,
  onClose,
  me,
  onLogout
}) {
  const pathname = usePathname()
  const { setPricingModalOpen } = useDashboardHeader()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname])

  // Prevent background body scroll when drawer is open
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

  const username = me?.store?.username || me?.store?.slug || me?.profile?.username || 'creator'
  const creatorName = me?.profile?.name || username
  const initial = (creatorName || me?.user?.email || 'C')[0].toUpperCase()
  const storeUrl = `creatorstore.store/${username}`
  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial)
  const isTrialActive = Boolean(sub?.isTrial && !sub?.isTrialExpired && (sub?.daysRemaining === undefined || sub?.daysRemaining > 0))
  const planBadge = isPaid
    ? (sub?.plan || 'Pro')
    : (isTrialActive
        ? `Pro Trial · ${Math.max(1, sub?.daysRemaining ?? 7)}d left`
        : (sub?.isTrialExpired || sub?.trialStatus === 'EXPIRED' ? 'Trial Expired' : 'Free'))

  return (
    <div
      className="fixed inset-0 z-50 flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-more-title"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/35 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className="relative ml-auto w-full max-w-sm sm:max-w-md bg-[#F2F1EF] text-[#1F1F1F] border-l border-[#E5E5E3] h-full flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.12)] z-10 animate-in slide-in-from-right duration-200"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E3] px-4 h-16 shrink-0 bg-[#F2F1EF]">
          <h2 id="mobile-more-title" className="text-base font-bold tracking-tight text-[#1F1F1F]">
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#6F6F6B] hover:text-[#1F1F1F] cursor-pointer rounded-[10px]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar">

          {/* Creator Profile & Store Card */}
          <div className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#1F1F1F] text-sm font-bold text-[#FFFFFF] shrink-0 shadow-xs">
                {me?.profile?.avatarUrl ? (
                  <img src={me.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1F1F1F]">{creatorName}</p>
                <a
                  href={`/${username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-[#6F6F6B] hover:text-[#1F1F1F] hover:underline truncate max-w-full"
                >
                  <span className="truncate">{storeUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#E5E5E3]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#E5E5E3] bg-[#F5F5F3] text-[#1F1F1F]">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {planBadge}
              </span>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  setPricingModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1F1F1F] text-[#FFFFFF] text-xs font-semibold hover:bg-[#000000] active:bg-[#111111] transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>Upgrade Plan</span>
              </button>
            </div>
          </div>

          {/* Navigation Categories */}
          {MORE_MENU_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-2">
              <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#6F6F6B]">
                {category.title}
              </span>

              <div className="rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] overflow-hidden divide-y divide-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                {category.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between p-3.5 transition-colors group min-h-[48px] ${active
                          ? 'bg-[#F5F5F3] text-[#1F1F1F] font-semibold'
                          : 'text-[#1F1F1F] hover:bg-[#F5F5F3]'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`p-2 rounded-[10px] shrink-0 ${active
                            ? 'bg-[#1F1F1F] text-[#FFFFFF]'
                            : 'bg-[#F2F1EF] text-[#6F6F6B] group-hover:text-[#1F1F1F]'
                          }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate">{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded-md bg-[#F2F1EF] text-[#1F1F1F] text-[9px] font-bold uppercase border border-[#E5E5E3]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-[#6F6F6B] truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-[#999995] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Log Out Action */}
          <div className="pt-2 pb-6">
            <button
              type="button"
              onClick={() => {
                onClose()
                onLogout?.()
              }}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-[14px] bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626]/20 font-bold text-xs transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
