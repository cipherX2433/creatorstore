'use client'

import React from 'react'
import { WORKFLOW_STEPS } from '@/lib/howItWorksData'
import { CheckCircle2 } from 'lucide-react'

export default function WorkflowSection() {
  return (
    <section className="w-full bg-[#FFFFFF] text-[#1C1C1C] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 border-b border-[#E5E5E3]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F1F1EF] text-xs font-bold tracking-widest uppercase text-[#FF4D24] mb-4">
            CONNECTED WORKFLOW
          </div>
          <h2
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] tracking-tight leading-[1.12]"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            How CreatorStore fits together
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6F6F6B] max-w-2xl mx-auto font-normal">
            A seamless workflow connecting your store setup, audience channels, and payment settlements.
          </p>
        </div>

        {/* 4 Connected Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 relative">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="bg-[#FAFAF8] rounded-[28px] sm:rounded-[32px] p-7 sm:p-8 border border-[#E5E5E3] flex flex-col justify-between relative group hover:border-[#FF4D24]/40 transition-colors"
            >
              <div>
                {/* Step Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FF4D24] text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
                    {step.number}
                  </div>
                  <span className="text-xs font-mono font-bold text-[#A3A3A3]">
                    STEP {idx + 1} OF 4
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="text-xl sm:text-2xl font-bold text-[#1C1C1C] mb-3 tracking-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm sm:text-base text-[#6F6F6B] leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Bottom Subtle Indicator */}
              <div className="pt-6 mt-6 border-t border-[#EAEAE8] flex items-center gap-2 text-xs font-semibold text-[#8E8E89]">
                <CheckCircle2 className="h-4 w-4 text-[#FF4D24]" />
                <span>Verified capability</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
