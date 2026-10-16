'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check, DollarSign } from 'lucide-react'
import ComparisonStatus from './ComparisonStatus'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'

export default function ComparisonTable({ data, competitorName }) {
  if (!data) return null

  const snapshot = data.pricingSnapshot

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      
      {/* 1. PRICING SNAPSHOT CARD */}
      {snapshot && (
        <div className="rounded-[22px] bg-[#F7F9FB] border border-[#E1E4E8] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E4E8] pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#194DF5]/10 text-[#194DF5] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-[#0D0D0D] uppercase tracking-wide">
                Pricing Snapshot: CreatorStore vs. {competitorName}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#194DF5] bg-white px-2.5 py-1 rounded-md border border-[#E1E4E8]">
              0% Platform Fee on All Plans
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Starter Plan Comparison */}
            <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E8] space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#858D97]">
                Starter / Creator Tier
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#0D0D0D]">
                  <span className="text-[#194DF5]">CreatorStore:</span> {snapshot.creatorStorePlan}
                </p>
                <p className="text-xs font-medium text-[#5F6873]">
                  <span className="text-[#0D0D0D] font-semibold">{competitorName}:</span> {snapshot.competitorPlan}
                </p>
              </div>
            </div>

            {/* Pro Plan Comparison */}
            <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E8] space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#858D97]">
                Pro Tier
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#0D0D0D]">
                  <span className="text-[#194DF5]">CreatorStore:</span> {snapshot.creatorStorePro}
                </p>
                <p className="text-xs font-medium text-[#5F6873]">
                  <span className="text-[#0D0D0D] font-semibold">{competitorName}:</span> {snapshot.competitorPro}
                </p>
              </div>
            </div>

            {/* Platform Fee Comparison */}
            <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E8] space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#858D97]">
                Platform Transaction Fee
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#22C55E]">
                  {snapshot.platformFee}
                </p>
                <p className="text-[11px] text-[#858D97] leading-tight">
                  Keep 100% of customer payments
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#858D97] font-medium leading-relaxed pt-1">
            * {snapshot.note}
          </p>
        </div>
      )}

      {/* 2. SUMMARY HIGHLIGHT BANNER */}
      {data.summary && (
        <div className="rounded-2xl bg-[#F8FAFF] border border-[#DCE7FF] p-4 sm:p-5 text-center text-xs sm:text-sm font-medium text-[#26384A] max-w-3xl mx-auto">
          <p className="leading-relaxed">
            <span className="font-bold text-[#194DF5]">Comparison Summary: </span>
            {data.summary}
          </p>
        </div>
      )}

      {/* 3. MAIN COMPARISON CONTAINER */}
      <div className="rounded-[24px] bg-white border border-[#E1E4E8] shadow-[0_12px_36px_rgba(15,20,25,0.05)] overflow-hidden">
        
        {/* DESKTOP & TABLET TABLE VIEW (≥ 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            {/* Table Header with Solid Backgrounds to prevent overlap bleed */}
            <thead>
              <tr className="border-b border-[#E1E4E8]">
                <th scope="col" className="py-5 px-6 text-xs font-mono font-bold uppercase tracking-wider text-[#5F6873] w-[40%] bg-white">
                  Feature / Capability
                </th>
                
                {/* CreatorStore Column Header */}
                <th scope="col" className="py-5 px-6 text-center w-[30%] bg-[#F4F7FF] border-l border-[#DCE7FF] relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#194DF5]" />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <CreatorStoreBrand theme="light" size="sm" />
                    </div>
                    <span className="text-[11px] font-bold text-[#194DF5]">
                      All-in-one Platform
                    </span>
                  </div>
                </th>

                {/* Competitor Column Header */}
                <th scope="col" className="py-5 px-6 text-center w-[30%] border-l border-[#E1E4E8] bg-[#FAFBFD]">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-sm font-extrabold text-[#0D0D0D]">
                      {competitorName}
                    </span>
                    <span className="text-[11px] font-medium text-[#858D97]">
                      Alternative
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body by Category */}
            <tbody className="divide-y divide-[#E1E4E8] text-sm font-medium">
              {data.categories.map((category) => (
                <Fragment key={category.name}>
                  {/* Category Header Row */}
                  <tr className="bg-[#F8FAFC]">
                    <td colSpan={3} className="py-3.5 px-6 border-y border-[#E1E4E8]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 rounded-full bg-[#194DF5]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">
                          {category.name}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {category.features.map((row) => (
                    <tr 
                      key={row.name} 
                      className="hover:bg-[#F9FAFB] transition-colors bg-white opacity-100"
                    >
                      {/* Feature Name & Description */}
                      <td className="py-4 px-6 text-[#0D0D0D] align-middle">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-[#0D0D0D] leading-snug">
                            {row.name}
                          </p>
                          {row.description && (
                            <p className="text-xs text-[#858D97] leading-relaxed">
                              {row.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* CreatorStore Value */}
                      <td className="py-4 px-6 text-center align-middle bg-[#F4F7FF]/40 border-l border-[#DCE7FF]">
                        <ComparisonStatus cell={row.creatorStore} isCreatorStore={true} />
                      </td>

                      {/* Competitor Value */}
                      <td className="py-4 px-6 text-center align-middle border-l border-[#E1E4E8]">
                        <ComparisonStatus cell={row.competitor} isCreatorStore={false} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKED VIEW (< 640px) */}
        <div className="block sm:hidden divide-y divide-[#E1E4E8]">
          {/* Mobile Competitor Bar */}
          <div className="bg-white px-4 py-3 border-b border-[#E1E4E8] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-1.5">
              <CreatorStoreBrand theme="light" size="sm" />
            </div>
            <span className="text-xs font-mono font-bold text-[#5F6873]">
              vs. <span className="text-[#0D0D0D] font-extrabold">{competitorName}</span>
            </span>
          </div>

          {data.categories.map((category) => (
            <div key={category.name} className="p-4 space-y-3 bg-white">
              {/* Category Header */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <div className="w-1 h-3.5 rounded-full bg-[#194DF5]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">
                  {category.name}
                </h4>
              </div>

              {/* Feature Cards */}
              <div className="space-y-2.5">
                {category.features.map((row) => (
                  <div 
                    key={row.name}
                    className="p-3.5 rounded-xl border border-[#E1E4E8] bg-[#FAFBFD] space-y-3"
                  >
                    <div>
                      <p className="font-bold text-xs text-[#0D0D0D] leading-tight">
                        {row.name}
                      </p>
                      {row.description && (
                        <p className="text-[11px] text-[#858D97] mt-0.5 leading-snug">
                          {row.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E1E4E8]/60">
                      {/* CreatorStore Side */}
                      <div className="p-2.5 rounded-lg bg-[#F4F7FF] border border-[#DCE7FF] flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-[#194DF5] uppercase tracking-wider mb-1">
                          CreatorStore
                        </span>
                        <ComparisonStatus cell={row.creatorStore} isCreatorStore={true} />
                      </div>

                      {/* Competitor Side */}
                      <div className="p-2.5 rounded-lg bg-white border border-[#E1E4E8] flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-[#5F6873] uppercase tracking-wider mb-1">
                          {competitorName}
                        </span>
                        <ComparisonStatus cell={row.competitor} isCreatorStore={false} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Footer inside Table Card */}
        <div className="bg-[#FAFBFD] border-t border-[#E1E4E8] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-[#0D0D0D]">
              Ready to launch your store with 0% platform fees?
            </h4>
            <p className="text-xs sm:text-sm text-[#5F6873]">
              Explore CreatorStore free. Upgrade when you&apos;re ready to sell.
            </p>
          </div>

          <Link href="/signup" className="shrink-0 w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#0A1124] hover:bg-[#121D38] text-white font-bold text-base sm:text-lg shadow-[0_10px_24px_rgba(10,17,36,0.3)] flex items-center justify-center transition-all cursor-pointer"
            >
              <span>Start My Trial</span>
            </button>
          </Link>
        </div>

      </div>
    </div>
  )
}
