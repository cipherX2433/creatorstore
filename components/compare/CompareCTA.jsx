'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'

export default function CompareCTA() {
  return (
    <section className="w-full max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="rounded-[26px] bg-[#0D0D0D] text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden border border-[#30353C]">
        
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#194DF5]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#194DF5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-bold text-[#194DF5]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>START WITHOUT RISK</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Ready to build your creator business?
          </h2>

          <p className="text-sm sm:text-base text-[#A3A7AE] font-medium leading-relaxed">
            Create your account and explore CreatorStore for free. Upgrade to a paid plan when you&apos;re ready to launch your storefront and start selling.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link href="/signup" className="w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto px-10 sm:px-14 py-4.5 sm:py-5 rounded-full bg-[#0A1124] hover:bg-[#121D38] text-white font-bold text-lg sm:text-xl shadow-[0_12px_32px_rgba(10,17,36,0.35)] hover:shadow-[0_16px_40px_rgba(10,17,36,0.45)] transition-all flex items-center justify-center cursor-pointer"
            >
              <span>Start My Trial</span>
            </button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/15 transition-all cursor-pointer"
            >
              View Transparent Pricing
            </button>
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2 text-xs text-[#858D97] pt-2">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>7-day Pro trial available • 0% platform fee • No credit card required</span>
        </div>

      </div>
    </section>
  )
}
