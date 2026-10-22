'use client'

import {
  Wallet,
  BarChart3,
  Bot,
  Store,
  CreditCard,
  Package,
  Calendar,
  Users,
  FormInput,
  IdCard,
  Link2,
  Palette,
  ShoppingBag,
  Tag,
  ArrowUpRight,
} from 'lucide-react'
import { FEATURE_GOALS, CREATORSTORE_FEATURES } from '@/lib/featuresData'

const ICON_MAP = {
  Wallet,
  BarChart3,
  Bot,
  Store,
  CreditCard,
  Package,
  Calendar,
  Users,
  FormInput,
  IdCard,
  Link2,
  Palette,
  ShoppingBag,
  Tag,
}

export default function BrowseByGoalSection({ onSelectFeatureChip }) {
  // Map feature ID to feature record
  const featureMap = {}
  CREATORSTORE_FEATURES.forEach((f) => {
    featureMap[f.id] = f
  })

  return (
    <section
      id="browse-by-goal"
      className="w-full bg-[#D7F01D] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-black/5"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] text-center mb-12 sm:mb-16 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          Browse by goal
        </h2>

        {/* 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {FEATURE_GOALS.map((goal) => {
            const GoalIcon = ICON_MAP[goal.iconName] || Store

            return (
              <div
                key={goal.id}
                className="bg-white rounded-[32px] p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row gap-6 justify-between items-stretch border border-black/5"
              >
                {/* Left Side: Content & Feature Chips */}
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-black text-[#1C1C1C] tracking-tight"
                      style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                    >
                      {goal.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#6F6F6B] mt-1.5 leading-relaxed">
                      {goal.description}
                    </p>
                  </div>

                  {/* Feature Chips */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#999995] mb-3 block">
                      Features
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {goal.featureIds.map((featId) => {
                        const feat = featureMap[featId]
                        if (!feat) return null

                        return (
                          <button
                            key={feat.id}
                            type="button"
                            onClick={() => {
                              if (onSelectFeatureChip) {
                                onSelectFeatureChip(feat)
                              }
                            }}
                            className="bg-[#F2F1EF] hover:bg-[#E5E5E3] text-[#1C1C1C] text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-full transition-colors inline-flex items-center gap-1 group/chip cursor-pointer"
                            title={`Filter catalog by ${feat.name}`}
                          >
                            <span>{feat.name}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#999995] group-hover/chip:text-[#1C1C1C] transition-colors" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side: Visual Graphic Panel */}
                <div
                  className={`w-full sm:w-44 md:w-52 h-44 sm:h-auto rounded-[24px] ${goal.panelColor} ${goal.panelText} p-5 flex flex-col justify-between shrink-0 shadow-inner relative overflow-hidden`}
                >
                  {/* Subtle Background Pattern Elements */}
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

                  {/* Top Badge */}
                  <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <GoalIcon className="w-5 h-5 text-white" />
                  </div>

                  {/* Bottom Goal Title on Visual Panel */}
                  <div className="relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70 block">
                      Goal
                    </span>
                    <span className="text-base sm:text-lg font-black tracking-tight text-white block mt-0.5">
                      {goal.title}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
