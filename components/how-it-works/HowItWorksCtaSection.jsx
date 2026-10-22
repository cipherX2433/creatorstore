'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'

export default function HowItWorksCtaSection() {
  const { isAuthenticated } = useAuth()
  const primaryHref = isAuthenticated ? '/dashboard/store' : '/signup'
  const primaryText = isAuthenticated ? 'Go to Dashboard' : 'Get started'

  return (
    <section className="w-full bg-[#000000] text-white py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 border-t border-[#303030] relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Subtle Brand Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#FF4D24] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>JOIN THOUSANDS OF CREATORS</span>
        </div>

        {/* Heading */}
        <h2
          className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] mb-6"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          Your creator business <br className="hidden sm:inline" />
          starts here.
        </h2>

        {/* Supporting Text */}
        <p className="text-lg sm:text-xl lg:text-2xl text-[#A3A3A3] max-w-2xl mx-auto font-normal leading-relaxed mb-10 sm:mb-12">
          Bring your content, products, and audience together in one place.
        </p>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href={primaryHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-neutral-100 text-black font-bold text-base sm:text-lg transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{primaryText}</span>
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-transparent hover:bg-white/10 text-white font-medium text-base sm:text-lg border border-white/20 transition-all hover:border-white/40"
          >
            <span>Explore features</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
