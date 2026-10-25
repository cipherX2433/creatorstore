'use client'

import { Sparkles } from 'lucide-react'

export default function CompareHero() {
  return (
    <div className="text-center space-y-5 max-w-3xl mx-auto px-4">
      {/* Eyebrow Pill */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE7FF] bg-[#F4F7FF] px-4 py-1.5 text-xs font-bold text-[#194DF5] shadow-xs">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="tracking-wide uppercase">COMPARE CREATOR PLATFORMS</span>
      </div>

      {/* Main H1 */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0D0D0D] tracking-tight leading-[1.1]">
        How CreatorStore compares
      </h1>

      {/* Subheading */}
      <p className="text-base sm:text-lg text-[#5F6873] font-medium leading-relaxed max-w-2xl mx-auto">
        0% fees on every plan, digital downloads + coaching + memberships + Instagram AutoDM all in one place.
      </p>
    </div>
  )
}
