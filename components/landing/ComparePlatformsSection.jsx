'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Check, Layers } from 'lucide-react'

const COMPARISON_HIGHLIGHTS = [
  'Digital products & instant downloads',
  'Custom services & digital bundles',
  '1:1 coaching calendar bookings',
  'Recurring memberships & subscriptions',
  'Instagram AutoDM on every plan',
  'Lead capture magnets & CRM export',
  '0% platform transaction fees',
  'Explore for free before paying',
]

export default function ComparePlatformsSection() {
  return (
    <section className="w-full bg-[#232323] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] sm:rounded-[36px] bg-[#1C1C1C] border border-[#303030] p-8 sm:p-12 lg:p-14 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4B1F]/30 bg-[#FF4B1F]/10 px-4 py-1.5 text-xs font-bold text-[#FF4B1F]">
                <Layers className="h-3.5 w-3.5" />
                <span>COMPETITOR COMPARISON</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Not sure which creator platform fits your workflow?
              </h2>

              <p className="text-sm sm:text-base text-[#A3A3A3] leading-relaxed max-w-xl">
                Compare CreatorStore side-by-side with Stan Store, Linktree, and Beacons across monetization, digital product delivery, Instagram automation, and platform fees.
              </p>

              {/* Feature highlight badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {COMPARISON_HIGHLIGHTS.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-semibold text-[#E0E0E0]">
                    <div className="w-4 h-4 rounded-full bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card / CTA Box */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
              <div className="w-full max-w-md bg-[#242424] rounded-[28px] sm:rounded-[32px] border border-[#303030] p-6 sm:p-8 space-y-6 shadow-xl text-center">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF4B1F] bg-[#FF4B1F]/15 px-3.5 py-1 rounded-full inline-block">
                    FULL BREAKDOWN
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    CreatorStore vs. Stan, Linktree &amp; Beacons
                  </h3>
                  <p className="text-xs text-[#A3A3A3] leading-relaxed">
                    Review every feature, pricing structure, and automation capability in one clear comparison table.
                  </p>
                </div>

                <Link href="/compare" className="block w-full">
                  <button
                    type="button"
                    className="w-full h-12 rounded-full bg-white hover:bg-neutral-200 text-[#0D0D0D] font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Compare Platforms</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </Link>

                <p className="text-[11px] text-[#808080] font-medium">
                  Transparent feature data • No credit card required to explore
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
