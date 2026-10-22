'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthContext'
import { getSubscriptionPricing } from '@/lib/plans'
import PricingModal from '@/components/dashboard/PricingModal'
import { trackPricingViewed, trackPricingPlanSelected } from '@/lib/analytics'
import { CreatorPricingCard, ProPricingCard } from '@/components/pricing/PricingCards'

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

  function handleSelectPlan(planId) {
    trackPricingPlanSelected({
      plan_id: planId,
      interval: billingInterval,
      currency,
    })
    if (!isAuthenticated) {
      router.push(`/signup?plan=${planId}&interval=${billingInterval}`)
      return
    }
    setCheckoutPlan(planId)
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
            MAIN PRICING CONTAINER (Unified Card Deck with 2 Columns)
           ============================================================== */}
        <div className="max-w-4xl mx-auto bg-white rounded-[28px] sm:rounded-[32px] p-3 sm:p-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)] border border-white/10 text-[#111111]">
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
