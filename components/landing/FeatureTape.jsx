'use client'

import {
  BarChart3,
  Download,
  Link2,
  BadgePercent,
  Sparkles,
  MessageSquare,
  Zap,
  Store,
} from 'lucide-react'

const FEATURES = [
  { text: 'LINK → SELL → CAPTURE → AUTOMATE → GROW', icon: Sparkles },
  { text: 'CREATOR STOREFRONT', icon: Store },
  { text: 'INSTANT DIGITAL DELIVERY', icon: Download },
  { text: 'INSTAGRAM AUTODM', icon: MessageSquare },
  { text: '0% CREATORSTORE FEES', icon: BadgePercent },
  { text: 'DIRECT CREATOR PAYMENTS', icon: Zap },
  { text: 'LEAD & AUDIENCE CAPTURE', icon: Link2 },
  { text: 'REAL-TIME ANALYTICS', icon: BarChart3 },
]

// Duplicate items twice per half so each half is very wide (~5500px), ensuring seamless loop on all viewports
const TAPE_ITEMS = [...FEATURES, ...FEATURES]

export default function FeatureTape() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F9B67D] border-y border-black/10 py-3.5 sm:py-4 select-none z-20">
      {/* Edge gradient masks for seamless fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-[#F9B67D] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-[#F9B67D] to-transparent z-10" />

      {/* Infinite Marquee Track */}
      <div className="flex w-full overflow-hidden">
        <div className="animate-marquee flex items-center">
          {/* Render both identical halves back-to-back */}
          {[...TAPE_ITEMS, ...TAPE_ITEMS].map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={`${item.text}-${idx}`}
                className="inline-flex items-center gap-2.5 sm:gap-3 px-5 sm:px-7 text-[#1E232B] hover:text-black transition-colors group whitespace-nowrap cursor-default"
              >
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-black/15 text-black group-hover:bg-black/25 group-hover:scale-105 transition-all shrink-0">
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                <span className="text-[11px] sm:text-xs font-black tracking-widest uppercase font-sans">
                  {item.text}
                </span>
                <span className="text-black/30 select-none pl-3 sm:pl-4 text-[10px]" aria-hidden="true">
                  ✦
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
