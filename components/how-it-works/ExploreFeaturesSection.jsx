'use client'

import React from 'react'
import Link from 'next/link'
import {
  Package,
  Calendar,
  CreditCard,
  Bot,
  BarChart3,
  Users,
  Tag,
  FileText,
  Palette,
  ArrowRight,
} from 'lucide-react'
import { EXPLORE_FEATURES } from '@/lib/howItWorksData'

const ICON_MAP = {
  Package,
  Calendar,
  CreditCard,
  Bot,
  BarChart3,
  Users,
  Tag,
  FileText,
  Palette,
}

export default function ExploreFeaturesSection() {
  return (
    <section className="w-full bg-[#FF4D24] text-[#1C1C1C] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/10 text-xs font-bold tracking-widest uppercase text-black mb-4">
            FEATURE SHOWCASE
          </div>
          <h2
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.12]"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            Everything for your creator business
          </h2>
          <p className="mt-4 text-base sm:text-xl text-black/85 max-w-2xl mx-auto font-medium">
            Explore verified tools to monetize your audience, engage followers, and manage your storefront.
          </p>
        </div>

        {/* 3-Column Desktop Grid / 2-Column Tablet / 1-Column Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {EXPLORE_FEATURES.map((feat) => {
            const Icon = ICON_MAP[feat.iconName] || Package
            return (
              <div
                key={feat.id}
                className="bg-white rounded-[28px] sm:rounded-[32px] lg:rounded-[36px] p-7 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  {/* Category Pill + Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#F1F1EF] flex items-center justify-center text-[#1C1C1C]">
                      <Icon className="h-5 w-5 stroke-[2]" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F1F1EF] text-[#6F6F6B]">
                      {feat.category}
                    </span>
                  </div>

                  {/* Feature Title */}
                  <h3
                    className="text-xl sm:text-2xl font-bold text-[#1C1C1C] mb-2.5 tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                  >
                    {feat.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-[#6F6F6B] leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 mt-6 border-t border-[#F1F1EF]">
                  <Link
                    href={feat.href}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1C1C1C] hover:text-[#FF4D24] transition-colors group"
                  >
                    <span>View feature</span>
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
