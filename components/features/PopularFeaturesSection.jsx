'use client'

import Link from 'next/link'
import {
  Package,
  Store,
  Bot,
  BarChart3,
  Calendar,
  Wallet,
  ArrowRight,
} from 'lucide-react'
import { POPULAR_FEATURES } from '@/lib/featuresData'

const ICON_MAP = {
  Package,
  Store,
  Bot,
  BarChart3,
  Calendar,
  Wallet,
}

export default function PopularFeaturesSection() {
  return (
    <section
      id="popular-features"
      className="w-full bg-[#FF9414] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-black/5"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] text-center mb-12 sm:mb-16 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          Popular features
        </h2>

        {/* 3-Column Desktop Grid, 2-col tablet, 1-col mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {POPULAR_FEATURES.map((feature) => {
            const IconComponent = ICON_MAP[feature.iconName] || Package

            return (
              <div
                key={feature.id}
                className="bg-white rounded-[28px] p-7 sm:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-200 group"
              >
                <div>
                  {/* Top Row: Icon on Left, Category Pill on Right */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F3F3F0] flex items-center justify-center text-[#1C1C1C] group-hover:scale-105 transition-transform duration-200">
                      <IconComponent className="w-5 h-5 stroke-[2]" />
                    </div>

                    <span className="px-3.5 py-1 rounded-full bg-[#F3F3F0] text-[#1C1C1C] text-xs font-bold tracking-wide uppercase">
                      {feature.category}
                    </span>
                  </div>

                  {/* Feature Title */}
                  <h3
                    className="text-2xl font-bold text-[#1C1C1C] mt-6 mb-2.5 tracking-tight group-hover:text-[#FF4B1F] transition-colors"
                    style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                  >
                    {feature.name}
                  </h3>

                  {/* Feature Description */}
                  <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Action Link */}
                <div className="mt-8 pt-2">
                  <Link
                    href={feature.href}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1C1C1C] hover:text-[#FF4B1F] group-hover:gap-2.5 transition-all"
                  >
                    <span>View feature</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
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
