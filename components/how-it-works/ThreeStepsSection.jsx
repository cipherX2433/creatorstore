'use client'

import React from 'react'
import Link from 'next/link'
import { Store, Package, Sparkles, ArrowRight } from 'lucide-react'
import { THREE_STEPS } from '@/lib/howItWorksData'

const ICON_MAP = {
  Store,
  Package,
  Sparkles,
}

export default function ThreeStepsSection() {
  return (
    <section className="w-full bg-[#F4F4F2] text-[#1C1C1C] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 border-b border-black/5">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E5E5E3] text-xs font-bold tracking-widest uppercase text-[#FF4D24] mb-4">
            SIMPLE SETUP
          </div>
          <h2
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] tracking-tight leading-[1.12]"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            Get started in three simple steps
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6F6F6B] max-w-xl mx-auto font-normal">
            From signing up to accepting payments from your community in minutes.
          </p>
        </div>

        {/* 3 Large White Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {THREE_STEPS.map((stepItem) => {
            const Icon = ICON_MAP[stepItem.iconName] || Store
            return (
              <div
                key={stepItem.step}
                className="bg-white rounded-[28px] sm:rounded-[32px] lg:rounded-[36px] p-8 sm:p-10 border border-[#E5E5E3] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-200"
              >
                <div>
                  {/* Top Bar: Icon + Step Number */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-full bg-[#F1F1EF] flex items-center justify-center text-[#1C1C1C]">
                      <Icon className="h-6 w-6 stroke-[2]" />
                    </div>
                    <span className="font-mono text-lg font-black text-[#FF4D24] bg-[#FF4D24]/10 px-3.5 py-1 rounded-full">
                      STEP {stepItem.step}
                    </span>
                  </div>

                  {/* Heading */}
                  <h3
                    className="text-2xl sm:text-[26px] font-bold text-[#1C1C1C] mb-3 tracking-tight leading-snug"
                    style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                  >
                    {stepItem.title}
                  </h3>

                  {/* Description */}
                  <p className="text-base text-[#6F6F6B] leading-relaxed">
                    {stepItem.description}
                  </p>
                </div>

                {/* Optional Small Action */}
                <div className="pt-8 mt-6 border-t border-[#F1F1EF]">
                  <Link
                    href={stepItem.actionHref}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#1C1C1C] hover:text-[#FF4D24] transition-colors group"
                  >
                    <span>{stepItem.actionText}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-[#FF4D24]" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
