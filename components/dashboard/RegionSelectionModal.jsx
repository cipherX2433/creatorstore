'use client'

import { useState } from 'react'
import { X, ArrowRight, ArrowLeft, ShieldCheck, Loader2, Sparkles, CreditCard, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BILLING_REGIONS, resolveBillingConfig } from '@/lib/billing/config'

/**
 * CreatorStore Payment Region Selection & Confirmation Modal
 *
 * Implements Phase 3 & Phase 16:
 * Step 1: "Where are you paying from?" (India 🇮🇳 vs Outside India 🌎)
 * Step 2: Plan Confirmation ("Continue to Razorpay")
 */
export default function RegionSelectionModal({
  isOpen,
  onClose,
  plan = 'PRO',
  interval = 'monthly',
  onProceedToPayment,
  loading = false,
}) {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const isAnnual = String(interval).toLowerCase() === 'annual'

  if (!isOpen) return null

  const indiaConfig = resolveBillingConfig({
    plan,
    interval,
    region: BILLING_REGIONS.INDIA,
  })

  const intlConfig = resolveBillingConfig({
    plan,
    interval,
    region: BILLING_REGIONS.INTERNATIONAL,
  })

  const activeConfig = selectedRegion === BILLING_REGIONS.INTERNATIONAL ? intlConfig : indiaConfig

  function handleSelectRegion(region) {
    setSelectedRegion(region)
  }

  function handleConfirmPayment() {
    if (!selectedRegion) return
    onProceedToPayment({
      plan,
      interval,
      region: selectedRegion,
    })
  }

  function handleBack() {
    setSelectedRegion(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.14)] text-[#1F1F1F] space-y-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors border border-[#E5E5E3] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {!selectedRegion ? (
          // ==========================================
          // STEP 1: WHERE ARE YOU PAYING FROM?
          // ==========================================
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
                <Sparkles className="h-3 w-3" />
                <span>{plan === 'CREATOR' ? 'Creator' : 'Pro'} Plan · {isAnnual ? 'Annual' : 'Monthly'}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
                Choose your payment region
              </h2>
              <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">
                Where are you paying from?
              </p>
            </div>

            {/* Region Options */}
            <div className="space-y-3 pt-1">
              {/* Option 1: India */}
              <button
                type="button"
                onClick={() => handleSelectRegion(BILLING_REGIONS.INDIA)}
                className="w-full text-left p-4 sm:p-5 rounded-[18px] border-2 border-[#E5E5E3] hover:border-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#FAF9F7] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇳</span>
                    <span className="font-bold text-base text-[#1F1F1F]">India</span>
                  </div>
                  <p className="text-xs text-[#6F6F6B]">
                    Pay in INR using Razorpay
                  </p>
                  <p className="text-[11px] text-[#8E8E89]">
                    UPI · Credit/Debit Cards · Netbanking
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-[#1F1F1F]">
                    {indiaConfig.priceFormatted}
                    <span className="text-xs text-[#6F6F6B] font-normal">{indiaConfig.periodLabel}</span>
                  </div>
                  {isAnnual && (
                    <span className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">
                      Save 20%
                    </span>
                  )}
                </div>
              </button>

              {/* Option 2: Outside India */}
              <button
                type="button"
                onClick={() => handleSelectRegion(BILLING_REGIONS.INTERNATIONAL)}
                className="w-full text-left p-4 sm:p-5 rounded-[18px] border-2 border-[#E5E5E3] hover:border-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#FAF9F7] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌎</span>
                    <span className="font-bold text-base text-[#1F1F1F]">Outside India</span>
                  </div>
                  <p className="text-xs text-[#6F6F6B]">
                    Pay using PayPal in USD
                  </p>
                  <p className="text-[11px] text-[#8E8E89]">
                    PayPal · International Cards
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-[#1F1F1F]">
                    {intlConfig.priceFormatted}
                    <span className="text-xs text-[#6F6F6B] font-normal">{intlConfig.periodLabel}</span>
                  </div>
                  {isAnnual && (
                    <span className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">
                      Save 20%
                    </span>
                  )}
                </div>
              </button>
            </div>

            <p className="text-[11px] text-center text-[#8E8E89] flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
              Secure 256-bit encrypted checkout · 0% platform fee
            </p>
          </div>
        ) : (
          // ==========================================
          // STEP 2: PLAN CONFIRMATION
          // ==========================================
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="text-xs text-[#6F6F6B] hover:text-[#1F1F1F] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Change region</span>
              </button>
              <span className="text-xs font-bold text-[#1F1F1F] bg-[#F2F1EF] px-2.5 py-0.5 rounded-full">
                {selectedRegion === BILLING_REGIONS.INTERNATIONAL ? '🌎 Outside India' : '🇮🇳 India'}
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
                Confirm your subscription
              </h2>
              <p className="text-xs text-[#6F6F6B]">
                {selectedRegion === BILLING_REGIONS.INTERNATIONAL
                  ? 'Review your plan details before proceeding to PayPal checkout.'
                  : 'Review your plan details before proceeding to Razorpay checkout.'}
              </p>
            </div>

            {/* Plan Confirmation Card */}
            <div className="p-5 rounded-[20px] bg-[#FAF9F7] border border-[#E5E5E3] space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#1F1F1F] text-white mb-1.5">
                    {activeConfig.planName} Plan
                  </div>
                  <h3 className="font-extrabold text-lg text-[#1F1F1F]">
                    {activeConfig.planName} ({isAnnual ? 'Annual' : 'Monthly'})
                  </h3>
                  <p className="text-xs text-[#6F6F6B]">
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL
                      ? (isAnnual ? '365-day access · 20% discount · Manual renewal' : '30-day access · Manual renewal')
                      : (isAnnual ? 'Billed annually with 20% discount · Auto-renews' : 'Billed monthly · Auto-renews · Cancel anytime')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#1F1F1F]">
                    {activeConfig.priceFormatted}
                  </div>
                  <span className="text-xs text-[#6F6F6B] font-medium">{activeConfig.periodLabel}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E5E3] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Billing Currency</span>
                  <span className="font-bold text-[#1F1F1F]">{activeConfig.currency}</span>
                </div>
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Payment Gateway</span>
                  <span className="font-bold text-[#1F1F1F]">
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL ? 'PayPal' : 'Razorpay Secure'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Available Methods</span>
                  <span className="font-medium text-[#1F1F1F] text-right text-[11px] max-w-[220px]">
                    {activeConfig.paymentMethodsDescription}
                  </span>
                </div>
                {activeConfig.billingNotice && (
                  <div className="pt-2 border-t border-[#E5E5E3] text-[11px] text-[#6F6F6B] leading-tight">
                    {activeConfig.billingNotice}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full h-11 bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs rounded-full cursor-pointer shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL ? 'Redirecting to PayPal...' : 'Opening Razorpay Checkout...'}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL
                      ? `Continue to PayPal (${activeConfig.priceFormatted}${activeConfig.periodLabel})`
                      : `Continue to Razorpay (${activeConfig.priceFormatted}${activeConfig.periodLabel})`}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-[#8E8E89]">
                {selectedRegion === BILLING_REGIONS.INTERNATIONAL
                  ? 'International payments are processed in USD directly via PayPal with credit/debit card and PayPal balance support.'
                  : 'Domestic payments are processed in INR via Razorpay with UPI and card support.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
              </h2 >
  <p className="text-xs text-[#6F6F6B]">
    {selectedRegion === BILLING_REGIONS.INTERNATIONAL
      ? 'Complete subscription approval with PayPal in USD.'
      : 'Review your plan details before proceeding to Razorpay checkout.'}
  </p>
            </div >

  {/* Plan Confirmation Card */ }
  < div className = "p-5 rounded-[20px] bg-[#FAF9F7] border border-[#E5E5E3] space-y-4" >
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#1F1F1F] text-white mb-1.5">
                    {activeConfig.planName} Plan
                  </div>
                  <h3 className="font-extrabold text-lg text-[#1F1F1F]">
                    {activeConfig.planName} ({isAnnual ? 'Annual' : 'Monthly'})
                  </h3>
                  <p className="text-xs text-[#6F6F6B]">
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL
                      ? (isAnnual ? '365-day access · 20% discount' : 'Monthly recurring subscription via PayPal')
                      : (isAnnual ? 'Billed annually with 20% discount · Auto-renews' : 'Billed monthly · Auto-renews · Cancel anytime')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#1F1F1F]">
                    {activeConfig.priceFormatted}
                  </div>
                  <span className="text-xs text-[#6F6F6B] font-medium">{activeConfig.periodLabel}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E5E3] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Billing Currency</span>
                  <span className="font-bold text-[#1F1F1F]">{activeConfig.currency}</span>
                </div>
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Payment Gateway</span>
                  <span className="font-bold text-[#1F1F1F]">
                    {selectedRegion === BILLING_REGIONS.INTERNATIONAL ? 'PayPal Subscriptions' : 'Razorpay Secure'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#6F6F6B]">
                  <span>Available Methods</span>
                  <span className="font-medium text-[#1F1F1F] text-right text-[11px] max-w-[220px]">
                    {activeConfig.paymentMethodsDescription}
                  </span>
                </div>
                {activeConfig.billingNotice && (
                  <div className="pt-2 border-t border-[#E5E5E3] text-[11px] text-[#6F6F6B] leading-tight">
                    {activeConfig.billingNotice}
                  </div>
                )}
              </div>
            </div >

  {/* Action Buttons */ }
  < div className = "space-y-2.5 pt-1" >
    { selectedRegion === BILLING_REGIONS.INTERNATIONAL ? (
    <div className="space-y-3">
      {/* Dedicated PayPal mount container with NO React children */}
      <div className="space-y-2">
        {sdkLoading && (
          <div className="flex items-center justify-center p-3 text-xs text-[#6F6F6B] gap-2 rounded-[14px] bg-[#FAF9F7] border border-[#E5E5E3]">
            <Loader2 className="h-4 w-4 animate-spin text-[#1F1F1F]" />
            <span>Loading secure PayPal button...</span>
          </div>
        )}

        {sdkError && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center">
            {sdkError}
          </p>
        )}

        <div
          ref={paypalContainerRef}
          className="w-full min-h-[44px]"
        />
      </div>

      {/* Fallback button if user prefers direct PayPal checkout link */}
      <Button
        type="button"
        onClick={handleConfirmPayment}
        disabled={loading}
        variant="outline"
        className="w-full h-10 border-[#E5E5E3] hover:bg-[#F5F5F3] text-[#1F1F1F] font-bold text-xs rounded-full cursor-pointer shadow-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Starting PayPal Session...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            <span>Pay via PayPal Checkout Link</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  ) : (
    <Button
      type="button"
      onClick={handleConfirmPayment}
      disabled={loading}
      className="w-full h-11 bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs rounded-full cursor-pointer shadow-none flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Opening Razorpay Checkout...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          <span>Continue to Razorpay ({activeConfig.priceFormatted}{activeConfig.periodLabel})</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  )}

<p className="text-[11px] text-center text-[#8E8E89]">
  {selectedRegion === BILLING_REGIONS.INTERNATIONAL
    ? 'International payments are processed in USD directly via PayPal with vault=true recurring subscription support.'
    : 'Domestic payments are processed in INR via Razorpay with UPI and card support.'}
</p>
            </div >
          </div >
        )}
      </div >
    </div >
  )
}
