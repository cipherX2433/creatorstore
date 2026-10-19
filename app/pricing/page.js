'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import {
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { getSubscriptionPricing, COMPARISON_TABLE_ROWS } from '@/lib/plans'
import PricingModal from '@/components/dashboard/PricingModal'
import { trackPricingViewed, trackPricingPlanSelected } from '@/lib/analytics'
import { CreatorPricingCard, ProPricingCard } from '@/components/pricing/PricingCards'

export default function PublicPricingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [billingInterval, setBillingInterval] = useState('monthly') // 'monthly' | 'annual'
  const [showFullComparison, setShowFullComparison] = useState(false)
  const isAnnual = billingInterval === 'annual'

  useEffect(() => {
    trackPricingViewed('pricing_page')
  }, [])

  const pricing = getSubscriptionPricing('USD', billingInterval)

  function handleSelectPlan(planId) {
    trackPricingPlanSelected({
      plan_id: planId,
      interval: billingInterval,
      currency: 'USD',
    })
    if (!isAuthenticated) {
      router.push(`/signup?plan=${planId}&interval=${billingInterval}`)
      return
    }
    setCheckoutPlan(planId)
  }

  return (
    <div className="min-h-screen bg-[#ECECED] text-[#111111] font-sans antialiased selection:bg-[#FF4B1F] selection:text-white">
      {/* 1. Global Fixed Navbar */}
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 sm:pb-28 space-y-7">
        
        {/* ==============================================================
            HEADER ROW: Left-aligned Title/Subtitle & Right-aligned Toggles
           ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-1">
          <div className="space-y-1.5">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-[#111111]">
              Pricing
            </h1>
            <p className="text-sm sm:text-base text-[#666666] font-normal max-w-xl leading-relaxed">
              Simple, transparent creator pricing. Keep 100% of your earnings with 0% platform transaction fees.
            </p>
          </div>

          {/* Right Controls: Billing Interval */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#DCDCE0] shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  !isAnnual
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isAnnual
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                <span>Annual</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isAnnual ? 'bg-[#FF4B1F] text-white' : 'bg-[#FF4B1F]/10 text-[#FF4B1F]'
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
            MAIN PRICING CONTAINER (Unified Card Deck with 2 Columns)
           ============================================================== */}
        <div className="max-w-4xl mx-auto bg-white rounded-[28px] sm:rounded-[32px] p-3 sm:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#E5E5E8]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
            <CreatorPricingCard
              pricing={pricing}
              isAnnual={isAnnual}
              onSelect={() => handleSelectPlan('CREATOR')}
            />
            <ProPricingCard
              pricing={pricing}
              isAnnual={isAnnual}
              onSelect={() => handleSelectPlan('PRO')}
            />
          </div>

          {/* Bottom Micro-Strip on Main Deck */}
          <div className="pt-4 pb-1 text-center text-xs text-[#777777] flex items-center justify-center gap-1.5 select-none font-medium">
            <span>✦</span>
            <span>7-day free trial on Pro. No hidden fees. 0% platform transaction fees on all plans.</span>
          </div>
        </div>

        {/* ==============================================================
            BOTTOM TWO COMPLEMENTARY CARDS (Matching Reference Layout)
           ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Card 1: Try Risk-Free (Light Card) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-[#E5E5E8] flex flex-col justify-between min-h-[170px]">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F4F4F6] border border-[#E2E2E6] flex items-center justify-center text-[#111111]">
                  <Sparkles className="w-4 h-4 text-[#FF4B1F]" />
                </div>
                <div className="bg-[#F4F4F6] border border-[#E2E2E6] text-[#555555] px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium">
                  ⚡ 7-DAY FREE TRIAL
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-[#111111] mt-3 tracking-tight">
                Try Pro Risk-Free
              </h3>
              <p className="text-xs sm:text-sm text-[#666666] mt-1 leading-relaxed max-w-md">
                Experience full access to Instagram automations and storefront features with zero commitment. Keep 100% of your earnings.
              </p>
            </div>

            <div className="flex justify-end mt-4">
              <Link
                href="/signup"
                className="bg-[#FF4B1F] hover:bg-[#E03E14] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Start Selling Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Meta Graph API Safety (Dark Card) */}
          <div className="bg-[#18181A] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-white/5 flex flex-col justify-between min-h-[170px]">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#262629] border border-white/10 flex items-center justify-center text-[#FF4B1F]">
                  <ShieldCheck className="w-4 h-4 text-[#FF4B1F]" />
                </div>
                <div className="bg-white/10 border border-white/10 text-white/90 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider">
                  PRO SAFE
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-white mt-3 tracking-tight">
                Official Meta Graph API Safety
              </h3>
              <p className="text-xs sm:text-sm text-[#A3A3A3] mt-1 leading-relaxed max-w-md">
                Built-in rate limiting and queue pacing ensures your Instagram account remains 100% compliant with platform limits.
              </p>
            </div>

            <div className="flex justify-end mt-4">
              <Link
                href="/safety"
                className="bg-[#2B2B2E] hover:bg-[#38383C] text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Learn About Safety</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* ==============================================================
            COLLAPSIBLE FEATURE COMPARISON ACCORDION
           ============================================================== */}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setShowFullComparison(!showFullComparison)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white border border-[#E5E5E8] shadow-2xs hover:border-[#D5D5D8] flex items-center justify-between text-sm font-semibold text-[#111111] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF4B1F]" />
              <span>Compare all features in detail</span>
            </span>
            {showFullComparison ? (
              <ChevronUp className="w-4 h-4 text-[#666666]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#666666]" />
            )}
          </button>

          {showFullComparison && (
            <div className="mt-3 bg-white border border-[#E5E5E8] rounded-2xl p-4 sm:p-6 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E8] text-[#777777] font-semibold">
                    <th className="py-3 px-3">Feature</th>
                    <th className="py-3 px-3">Creator</th>
                    <th className="py-3 px-3">Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F2]">
                  {COMPARISON_TABLE_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F9F9FB] transition-colors">
                      <td className="py-3 px-3 font-medium text-[#222222]">{row.feature}</td>
                      <td className="py-3 px-3 text-[#555555]">
                        {typeof row.creator === 'boolean' ? (
                          row.creator ? (
                            <Check className="w-4 h-4 text-[#22C55E]" />
                          ) : (
                            <span className="text-[#BBBBBB]">—</span>
                          )
                        ) : (
                          row.creator
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#111111]">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <Check className="w-4 h-4 text-[#FF4B1F]" />
                          ) : (
                            <span className="text-[#BBBBBB]">—</span>
                          )
                        ) : (
                          row.pro
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* 3. Global Minimal Footer */}
      <Footer />

      {/* 4. Checkout Modal when authenticated user clicks a plan */}
      <PricingModal
        isOpen={Boolean(checkoutPlan)}
        onClose={() => setCheckoutPlan(null)}
        defaultPlan={checkoutPlan || 'PRO'}
        defaultInterval={billingInterval}
      />
    </div>
  )
}
