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
  TrendingUp,
  Zap,
  CheckCircle2,
  Sparkles,
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

        {/* 2-Column Desktop Grid, 1-Column Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {FEATURE_GOALS.map((goal) => {
            const GoalIcon = ICON_MAP[goal.iconName] || Store

            return (
              <div
                key={goal.id}
                className="bg-white rounded-[40px] sm:rounded-[48px] p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)] transition-all duration-200 flex flex-col sm:flex-row gap-6 sm:gap-7 justify-between items-stretch border border-black/5 overflow-hidden"
              >
                {/* Left Column: Title, Description, and Feature Chips */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-6">
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
                            className="bg-[#F2F1EF] hover:bg-[#E5E5E3] text-[#1C1C1C] text-xs sm:text-sm font-semibold px-4 py-2 rounded-full transition-colors inline-flex items-center gap-1 group/chip cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C1C1C]"
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

                {/* Right Column: Intentional, Visible Visual Graphic Panel */}
                <div
                  className={`w-full sm:w-48 lg:w-48 xl:w-56 min-h-[220px] sm:min-h-[260px] rounded-[28px] sm:rounded-[32px] ${goal.panelColor} ${goal.panelText} p-5 flex flex-col items-center justify-between shrink-0 shadow-inner relative overflow-hidden select-none`}
                >
                  {/* Subtle Background Glows */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none" />

                  {/* Top Badge */}
                  <div className="w-full flex items-center justify-between relative z-10">
                    <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                      <GoalIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 bg-white/10 px-2.5 py-0.5 rounded-full">
                      {goal.title}
                    </span>
                  </div>

                  {/* Intentional Centered CSS Illustration per Goal */}
                  <div className="my-auto py-3 relative z-10 w-full flex items-center justify-center">
                    {goal.id === 'monetize' && (
                      /* Monetize Illustration: Elevated Digital Product & Coin Badge */
                      <div className="relative group/panel">
                        <div className="w-28 h-32 bg-white rounded-2xl shadow-2xl p-3 flex flex-col justify-between border border-white/50 rotate-[-3deg] hover:rotate-0 transition-transform duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ₹499
                            </span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto my-1">
                            <Package className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-slate-100" />
                            <div className="w-3/4 h-1.5 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                        {/* Floating Gold Coin Badge */}
                        <div className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-[#D7F01D] text-black font-black text-xs flex items-center justify-center shadow-lg border-2 border-[#2058EA]">
                          ₹
                        </div>
                      </div>
                    )}

                    {goal.id === 'grow' && (
                      /* Grow Illustration: Elevated Metrics Sheet & Bar Graph */
                      <div className="relative group/panel">
                        <div className="w-28 h-32 bg-[#121E42] rounded-2xl shadow-2xl p-3 flex flex-col justify-between border border-white/15 rotate-[3deg] hover:rotate-0 transition-transform duration-200">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-[10px] font-bold text-[#D7F01D]">
                              +48.6%
                            </span>
                            <TrendingUp className="w-3.5 h-3.5 text-[#D7F01D]" />
                          </div>
                          {/* 4 Bar Pillars */}
                          <div className="flex items-end justify-between gap-1.5 h-14 px-1 my-1">
                            <div className="w-4 h-6 rounded-t-sm bg-white/30" />
                            <div className="w-4 h-9 rounded-t-sm bg-white/50" />
                            <div className="w-4 h-11 rounded-t-sm bg-white/80" />
                            <div className="w-4 h-14 rounded-t-sm bg-[#D7F01D]" />
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/20" />
                        </div>
                        {/* Floating Target Badge */}
                        <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-white text-[#0A1128] flex items-center justify-center shadow-lg border-2 border-[#0A1128]">
                          <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>
                    )}

                    {goal.id === 'engage' && (
                      /* Engage Illustration: Instagram AutoDM Chat Card */
                      <div className="relative group/panel">
                        <div className="w-28 h-32 bg-white rounded-2xl shadow-2xl p-2.5 flex flex-col justify-between border border-white/60 rotate-[-2deg] hover:rotate-0 transition-transform duration-200">
                          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-[7px] text-white font-bold">
                              IG
                            </div>
                            <span className="text-[9px] font-bold text-slate-800">AutoDM</span>
                          </div>
                          {/* Chat Bubble with Link */}
                          <div className="bg-[#EAC4E8]/60 text-[#5B347C] p-2 rounded-xl text-[9px] font-bold leading-tight space-y-1">
                            <div className="flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">Here is your link!</span>
                            </div>
                            <div className="w-full h-1 bg-[#5B347C]/20 rounded-full" />
                          </div>
                          <div className="flex items-center justify-end gap-1 text-[8px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Sent instantly</span>
                          </div>
                        </div>
                        {/* Floating Lightning Badge */}
                        <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-[#EAC4E8] text-[#5B347C] flex items-center justify-center shadow-lg border-2 border-[#4A2074]">
                          <Zap className="w-3.5 h-3.5 fill-[#5B347C]" />
                        </div>
                      </div>
                    )}

                    {goal.id === 'manage' && (
                      /* Manage Illustration: Storefront Wireframe with Published Status */
                      <div className="relative group/panel">
                        <div className="w-28 h-32 bg-[#27272A] rounded-2xl shadow-2xl p-2.5 flex flex-col justify-between border border-white/15 rotate-[3deg] hover:rotate-0 transition-transform duration-200">
                          {/* Store Avatar & Name */}
                          <div className="flex items-center gap-1.5 pb-1.5 border-b border-white/10">
                            <div className="w-4 h-4 rounded-full bg-[#D7F01D] text-black font-black text-[7px] flex items-center justify-center">
                              CS
                            </div>
                            <span className="text-[9px] font-bold text-white truncate">my-store</span>
                          </div>
                          {/* Stacked Storefront Link Tiles */}
                          <div className="space-y-1.5 py-1">
                            <div className="w-full h-4 rounded-lg bg-white/15 flex items-center px-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D7F01D]" />
                            </div>
                            <div className="w-full h-4 rounded-lg bg-white/10 flex items-center px-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                            </div>
                          </div>
                          {/* Live Status Pill */}
                          <div className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full text-center">
                            ● Live Store
                          </div>
                        </div>
                        {/* Floating Store Badge */}
                        <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg border-2 border-[#18181B]">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Subtitle / Info */}
                  <div className="relative z-10 text-center w-full">
                    <span className="text-[11px] font-bold text-white/80 block">
                      {goal.panelSub}
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
