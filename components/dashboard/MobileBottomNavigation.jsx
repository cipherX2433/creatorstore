'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MOBILE_BOTTOM_NAV_ITEMS } from '@/lib/navigationConfig'

/**
 * MobileBottomNavigation — Floating Active-Pill Bottom Navigation for CreatorStore.
 * 
 * Features:
 * - Floating rounded pill container (solid #0D0D0D opaque surface, subtle border & shadow)
 * - 5 primary destinations: Store, Products, Earn, Insights, More
 * - Inactive destinations show icon only (~44px touch target)
 * - Active destination expands into an active pill with [ icon  Label ]
 * - Smooth layoutId animation moving the active pill between destinations
 * - Solid CreatorStore tokens: #0D0D0D outer surface, #202534 active pill with #194DF5 primary accent
 * - Safe area inset bottom support + zero horizontal overflow across 320px–440px
 */
export default function MobileBottomNavigation({ onOpenMore, isMoreOpen = false }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed left-0 right-0 z-40 md:hidden flex justify-center pointer-events-none select-none px-3"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-1 p-1 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.08)] w-full max-w-[390px]">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.isAction
            ? isMoreOpen || item.matches(pathname, searchParams)
            : !isMoreOpen && item.matches(pathname, searchParams)

          if (item.isAction) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onOpenMore}
                className={`relative flex items-center justify-center min-h-[44px] h-[44px] transition-colors cursor-pointer group shrink-0 ${isActive
                    ? 'px-3.5 sm:px-4 text-[#FFFFFF]'
                    : 'w-[44px] min-w-[44px] text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                aria-label="More tools and settings"
                aria-expanded={isMoreOpen}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    className="absolute inset-0 rounded-full bg-[#1F1F1F] shadow-xs z-0"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 35,
                      mass: 0.8,
                    }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                  <Icon
                    className={`h-[18px] w-[18px] transition-transform group-active:scale-95 shrink-0 ${isActive
                        ? 'text-[#FFFFFF] stroke-[2.25]'
                        : 'stroke-[1.8]'
                      }`}
                  />
                  {isActive && (
                    <span className="text-xs font-bold tracking-tight text-[#FFFFFF] whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex items-center justify-center min-h-[44px] h-[44px] transition-colors group shrink-0 ${isActive
                  ? 'px-3.5 sm:px-4 text-[#FFFFFF]'
                  : 'w-[44px] min-w-[44px] text-[#6F6F6B] hover:text-[#1F1F1F]'
                }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 rounded-full bg-[#1F1F1F] shadow-xs z-0"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 35,
                    mass: 0.8,
                  }}
                />
              )}
              <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <Icon
                  className={`h-[18px] w-[18px] transition-transform group-active:scale-95 shrink-0 ${isActive
                      ? 'text-[#FFFFFF] stroke-[2.25]'
                      : 'stroke-[1.8]'
                    }`}
                />
                {isActive && (
                  <span className="text-xs font-bold tracking-tight text-[#FFFFFF] whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
