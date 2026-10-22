'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { MOBILE_BOTTOM_NAV_ITEMS } from '@/lib/navigationConfig'
import { BRAND_COLOR } from '@/components/brand/CreatorStoreBrand'

/**
 * MobileBottomNavigation — Compact fixed bottom dock matching Linktree reference screenshots.
 * 
 * Features:
 * - Fixed full-width bottom bar (solid white #FFFFFF, subtle top border #E5E5E3)
 * - 5 equal destinations: My Store, Earn, Audience, Insights, More
 * - Icon on top, compact label underneath
 * - Active state highlighted in CreatorStore's signature orange accent (#FF4B1F)
 * - Respects safe area bottom on mobile devices
 */
export default function MobileBottomNavigation({ onOpenMore, isMoreOpen = false }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed left-0 right-0 bottom-0 z-40 md:hidden bg-[#FFFFFF] border-t border-[#E5E5E3] select-none shadow-[0_-4px_16px_rgba(0,0,0,0.03)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-5 h-[56px] w-full max-w-md mx-auto items-stretch">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.isAction
            ? isMoreOpen || item.matches(pathname, searchParams)
            : !isMoreOpen && item.matches(pathname, searchParams)

          const activeColor = BRAND_COLOR // '#FF4B1F'

          if (item.isAction) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onOpenMore}
                className="flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer group select-none outline-none focus:outline-none"
                aria-label="More tools and settings"
                aria-expanded={isMoreOpen}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-[20px] w-[20px] transition-transform group-active:scale-95 shrink-0 ${
                      isActive ? 'stroke-[2.2]' : 'stroke-[1.8] text-[#71717A] group-hover:text-[#1F1F1F]'
                    }`}
                    style={isActive ? { color: activeColor } : undefined}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                    isActive ? 'font-bold' : 'font-medium text-[#71717A] group-hover:text-[#1F1F1F]'
                  }`}
                  style={isActive ? { color: activeColor } : undefined}
                >
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 transition-all group select-none outline-none focus:outline-none"
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-[20px] w-[20px] transition-transform group-active:scale-95 shrink-0 ${
                    isActive ? 'stroke-[2.2]' : 'stroke-[1.8] text-[#71717A] group-hover:text-[#1F1F1F]'
                  }`}
                  style={isActive ? { color: activeColor } : undefined}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                  isActive ? 'font-bold' : 'font-medium text-[#71717A] group-hover:text-[#1F1F1F]'
                }`}
                style={isActive ? { color: activeColor } : undefined}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
