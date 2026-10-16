'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthContext'
import { getSubscriptionPricing } from '@/lib/plans'
import PricingModal from '@/components/dashboard/PricingModal'
import { trackPricingViewed, trackPricingPlanSelected } from '@/lib/analytics'

export default function SimplerSolutionSection() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { isAuthenticated } = useAuth()
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [billingInterval, setBillingInterval] = useState('monthly') // 'monthly' | 'annual'
  const [currency, setCurrency] = useState('INR')

  const isAnnual = billingInterval === 'annual'

  useEffect(() => {
    trackPricingViewed('landing_pricing')
  }, [])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('creatorstore_pref_currency')
      if (saved && (saved === 'INR' || saved === 'USD')) {
        setCurrency(saved)
      }
    } catch { }
  }, [])

  function handleCurrencyChange(newCurr) {
    setCurrency(newCurr)
    try {
      sessionStorage.setItem('creatorstore_pref_currency', newCurr)
    } catch { }
  }

  const pricing = getSubscriptionPricing(currency, billingInterval)

  // Scale tier display calculation
  const scaleMonthlyPrice = currency === 'USD' ? 29 : 2499
  const scaleAnnualPrice = currency === 'USD' ? 279 : 23990
  const scaleDisplayPrice = isAnnual
    ? (currency === 'USD' ? `$${scaleAnnualPrice}` : `₹${scaleAnnualPrice.toLocaleString('en-IN')}`)
    : (currency === 'USD' ? `$${scaleMonthlyPrice}` : `₹${scaleMonthlyPrice.toLocaleString('en-IN')}`)
  const scaleOriginalAnnual = currency === 'USD' ? `$${scaleMonthlyPrice * 12}` : `₹${(scaleMonthlyPrice * 12).toLocaleString('en-IN')}`

  function handleSelectPlan(planId) {
    trackPricingPlanSelected({
      plan_id: planId,
      interval: billingInterval,
      currency,
    })
    if (!isAuthenticated) {
      const targetPlan = planId === 'SCALE' ? 'PRO' : planId
      router.push(`/signup?plan=${targetPlan}&interval=${billingInterval}`)
      return
    }
    setCheckoutPlan(planId === 'SCALE' ? 'PRO' : planId)
  }

  return (
    <section
      id="pricing"
      className="w-full bg-[#000000] text-white py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none border-t border-[#262626] scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10 relative z-10">

        {/* ==============================================================
            HEADER ROW: Left-aligned Title/Subtitle & Right-aligned Toggles
           ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-1">
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold tracking-widest text-[#FF4B1F] uppercase">
              PRICING
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white leading-tight">
              Simple pricing. Built for creators.
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] font-normal max-w-xl leading-relaxed">
              Keep 100% of your earnings with 0% platform transaction fees on all paid plans.
            </p>
          </div>

          {/* Right Controls: Billing Interval & Currency Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#161616] border border-[#2E2E2E] shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  !isAnnual
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isAnnual
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isAnnual ? 'bg-[#FF4B1F] text-white' : 'bg-[#FF4B1F]/20 text-[#FF4B1F]'
                }`}>
                  -20%
                </span>
              </button>
            </div>

            {/* Currency Selector */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#161616] border border-[#2E2E2E] shadow-2xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleCurrencyChange('INR')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
            MAIN PRICING CONTAINER (Unified Card Deck with 3 Columns)
           ============================================================== */}
        <div className="bg-white rounded-[28px] sm:rounded-[32px] p-3 sm:p-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)] border border-white/10 text-[#111111]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 items-stretch">
            
            {/* ── CARD 1: CREATOR (Light Column) ────────────────────── */}
            <div className="bg-[#F7F7F9] rounded-2xl sm:rounded-[24px] p-6 sm:p-8 flex flex-col justify-between border border-transparent hover:border-[#E0E0E4] transition-all">
              <div>
                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-[#111111] tracking-tight">
                  Creator
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed mt-1 min-h-[34px]">
                  High-impact storefront &amp; bio link designed to convert audience into customers.
                </p>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111111]">
                    {isAnnual ? pricing.CREATOR.annual.priceFormatted : pricing.CREATOR.monthly.priceFormatted}
                  </span>
                  <span className="text-xs text-[#777777] font-medium">
                    {isAnnual ? '/year' : '/mo'}
                  </span>
                  {isAnnual && (
                    <span className="text-[11px] text-[#999999] line-through ml-2">
                      {pricing.CREATOR.annual.originalPriceInrFormatted || pricing.CREATOR.annual.originalPriceFormatted}
                    </span>
                  )}
                </div>

                {/* Divider Line */}
                <div className="border-b border-[#E4E4E8] my-6" />

                {/* Full-width Black Pill Action Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan('CREATOR')}
                  className="w-full py-3 px-4 rounded-full bg-[#111111] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs cursor-pointer text-center"
                >
                  Get Started with Creator
                </button>

                {/* Feature Checklist with `+ ` prefix */}
                <div className="space-y-3 pt-7 text-xs sm:text-sm text-[#444444]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Single bio link storefront</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Unlimited digital products &amp; sales</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Instant checkout &amp; digital delivery</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>0% CreatorStore platform fees</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Built-in UPI, cards &amp; Stripe settlement</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Customer lead &amp; email collection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 2: PRO (Light Column) ────────────────────────── */}
            <div className="bg-[#F7F7F9] rounded-2xl sm:rounded-[24px] p-6 sm:p-8 flex flex-col justify-between border border-transparent hover:border-[#E0E0E4] transition-all">
              <div>
                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-[#111111] tracking-tight">
                  Pro
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed mt-1 min-h-[34px]">
                  Full creator suite with automated Instagram DMs and viral growth workflows.
                </p>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111111]">
                    {isAnnual ? pricing.PRO.annual.priceFormatted : pricing.PRO.monthly.priceFormatted}
                  </span>
                  <span className="text-xs text-[#777777] font-medium">
                    {isAnnual ? '/year' : '/mo'}
                  </span>
                  {isAnnual && (
                    <span className="text-[11px] text-[#999999] line-through ml-2">
                      {pricing.PRO.annual.originalPriceInrFormatted || pricing.PRO.annual.originalPriceFormatted}
                    </span>
                  )}
                </div>

                {/* Divider Line */}
                <div className="border-b border-[#E4E4E8] my-6" />

                {/* Full-width Black Pill Action Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan('PRO')}
                  className="w-full py-3 px-4 rounded-full bg-[#111111] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs cursor-pointer text-center"
                >
                  Get Started with Pro
                </button>

                {/* Feature Checklist with `+ ` prefix */}
                <div className="space-y-3 pt-7 text-xs sm:text-sm text-[#444444]">
                  <div className="flex items-start gap-2 font-medium text-[#111111]">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Everything in Creator, plus:</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Unlimited Instagram Auto-DMs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Meta Graph API Delivery Guard protection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Custom branded domain connection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Discount coupons &amp; promo codes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#999999] font-mono select-none">+</span>
                    <span>Priority email &amp; Discord support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 3: SCALE (Elevated Inverted Dark Column) ───────── */}
            <div className="bg-[#18181A] text-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-[0_12px_36px_rgba(0,0,0,0.18)] relative border border-white/5">
              <div>
                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Scale
                </h3>
                <p className="text-xs text-[#999999] leading-relaxed mt-1 min-h-[34px]">
                  Dedicated scaling infrastructure and ongoing expertise to keep your product moving forward.
                </p>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                    {scaleDisplayPrice}
                  </span>
                  <span className="text-xs text-[#888888] font-medium">
                    {isAnnual ? '/year' : '/mo'}
                  </span>
                  {isAnnual && (
                    <span className="text-[11px] text-[#666666] line-through ml-2">
                      {scaleOriginalAnnual}
                    </span>
                  )}
                </div>

                {/* Divider Line */}
                <div className="border-b border-white/10 my-6" />

                {/* Full-width White Pill Action Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan('SCALE')}
                  className="w-full py-3 px-4 rounded-full bg-white hover:bg-[#F2F2F2] text-black text-xs sm:text-sm font-semibold transition-all duration-150 shadow-md cursor-pointer text-center"
                >
                  Get Started with Scale
                </button>

                {/* Feature Checklist with `+ ` prefix */}
                <div className="space-y-3 pt-7 text-xs sm:text-sm text-[#CCCCCC]">
                  <div className="flex items-start gap-2 font-medium text-white">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>Everything in Pro, plus:</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>Unlimited automated message pipelines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>Up to 5 team member sub-accounts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>Custom domain SSL &amp; zero platform branding</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>1-on-1 migration &amp; onboarding session</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#777777] font-mono select-none">+</span>
                    <span>Dedicated VIP priority support</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Micro-Strip on Main Deck */}
          <div className="pt-4 pb-1 text-center text-xs text-[#777777] flex items-center justify-center gap-1.5 select-none font-medium">
            <span>✦</span>
            <span>7-day free trial on Pro. No hidden fees. 0% platform transaction fees on all plans.</span>
          </div>
        </div>

      </div>

      {/* Checkout Modal when authenticated user clicks a plan */}
      <PricingModal
        isOpen={Boolean(checkoutPlan)}
        onClose={() => setCheckoutPlan(null)}
        defaultPlan={checkoutPlan || 'PRO'}
        defaultInterval={billingInterval}
      />
    </section>
  )
}
