'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Sparkles, ArrowRight, Loader2, CreditCard, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { getSubscriptionPricing } from '@/lib/plans'
import { BILLING_REGIONS, resolveBillingConfig } from '@/lib/billing/config'
import RegionSelectionModal from './RegionSelectionModal'

import { useAuth } from '@/components/auth/AuthContext'
import {
  trackPricingPlanSelected,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackPaymentFailed,
  trackPurchase,
} from '@/lib/analytics'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PricingModal({ isOpen, onClose, defaultPlan = 'PRO', defaultInterval = 'monthly', isTrialExpired = false }) {
  const router = useRouter()
  const { subscription } = useAuth()
  const [billingInterval, setBillingInterval] = useState(defaultInterval) // 'monthly' | 'annual'
  const [viewRegion, setViewRegion] = useState(BILLING_REGIONS.INDIA) // 'INDIA' | 'INTERNATIONAL'
  const [loadingPlan, setLoadingPlan] = useState(null)

  // Region selection modal state
  const [regionModalOpen, setRegionModalOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)

  const isAnnual = billingInterval === 'annual'
  const isIntlView = viewRegion === BILLING_REGIONS.INTERNATIONAL

  const inrPricing = getSubscriptionPricing('INR', billingInterval)
  const usdPricing = getSubscriptionPricing('USD', billingInterval)
  const activePricing = isIntlView ? usdPricing : inrPricing

  const trialExpiredState = isTrialExpired || subscription?.isTrialExpired || (subscription?.status === 'EXPIRED' && !subscription?.providerSubscriptionId)

  if (!isOpen) return null

  // Step 1: User clicks Buy Now / Plan CTA -> open Region selection modal
  function handleSelectPlan(planId) {
    setPendingPlan(planId)
    setRegionModalOpen(true)
  }

  // Step 2: User confirms region in RegionSelectionModal -> execute Provider-specific checkout
  async function handleProceedFromRegion({ plan: planId, interval, region }) {
    setLoadingPlan(planId)
    try {
      console.log(`[Checkout] Creating checkout session for ${planId} (${interval}, region: ${region})`)
      trackPricingPlanSelected({
        plan_id: planId,
        interval: interval,
        region: region,
      })

      // 1. Request server-authoritative checkout session
      const checkoutRes = await api.post('/creator/subscription/checkout', {
        plan: planId,
        interval: interval,
        region: region,
      })

      // Check if user already has an active subscription for this plan
      if (checkoutRes.alreadyActive) {
        toast.info(checkoutRes.message || 'You already have an active subscription for this plan.')
        setLoadingPlan(null)
        setRegionModalOpen(false)
        onClose()
        return
      }

      // 2. OUTSIDE INDIA: Direct PayPal Integration (bypassing Razorpay)
      if (checkoutRes.provider === 'paypal' || region === BILLING_REGIONS.INTERNATIONAL) {
        console.log('[PayPal] Initiating direct PayPal checkout for international customer:', checkoutRes.approvalUrl || checkoutRes.orderId)
        if (checkoutRes.approvalUrl) {
          window.location.href = checkoutRes.approvalUrl
          return
        }
        toast.error(checkoutRes.message || checkoutRes.error || 'Failed to initiate secure PayPal subscription session. Please check payment configuration.')
        setLoadingPlan(null)
        return
      }

      // 3. INDIA: Razorpay Checkout
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load secure payment gateway. Please check your internet connection.')
        setLoadingPlan(null)
        return
      }

      const { subscriptionId, orderId, amount, currency: resCurrency, key, flowType } = checkoutRes

      // User prefill
      const me = await api.get('/me').catch(() => null)

      const isSub = Boolean(subscriptionId && flowType === 'subscription')
      const targetSessionId = isSub ? subscriptionId : orderId

      const options = {
        key: key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TU5aYIMJinylzM',
        amount: amount,
        currency: resCurrency || (region === BILLING_REGIONS.INTERNATIONAL ? 'USD' : 'INR'),
        name: 'CreatorStore',
        description: `CreatorStore ${planId === 'CREATOR' ? 'Creator' : 'Pro'} Plan (${isAnnual ? 'Annual' : 'Monthly'})`,
        ...(isSub ? { subscription_id: subscriptionId } : { order_id: orderId }),
        prefill: {
          name: me?.profile?.name || me?.user?.name || 'Creator',
          email: me?.user?.email || '',
          contact: me?.profile?.phone || '',
        },
        theme: {
          color: "#1F1F1F",
        },
        handler: async function (response) {
          console.log('[Razorpay] Checkout success received in PricingModal:', response)
          setLoadingPlan(planId)
          const toastId = toast.loading('Confirming your subscription...')
          try {
            const verifyRes = await api.post('/creator/subscription/verify', {
              razorpaySubscriptionId: response.razorpay_subscription_id || subscriptionId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              razorpayOrderId: response.razorpay_order_id || orderId,
              region: region,
            })

            if (verifyRes.status === 'ACTIVE') {
              const txId = response.razorpay_order_id || orderId || response.razorpay_subscription_id || subscriptionId
              trackPaymentCompleted({
                transaction_id: txId,
                value: amount,
                currency: resCurrency || (region === BILLING_REGIONS.INTERNATIONAL ? 'USD' : 'INR'),
              })
              trackPurchase({
                transaction_id: txId,
                value: amount,
                currency: resCurrency || (region === BILLING_REGIONS.INTERNATIONAL ? 'USD' : 'INR'),
                items: [{
                  item_id: planId,
                  item_name: `CreatorStore ${planId} Plan`,
                  price: amount,
                  quantity: 1,
                }],
              })
              toast.dismiss(toastId)
              toast.success('Subscription activated successfully!')
              console.log('[Razorpay] Closing modal and refreshing page state')
              setRegionModalOpen(false)
              onClose()
              router.refresh()
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            } else {
              toast.dismiss(toastId)
              toast.error("Payment received, but we're still confirming your subscription. Please don't pay again.")
              setLoadingPlan(null)
            }
          } catch (err) {
            console.error('[Razorpay] Verification error in modal:', err)
            trackPaymentFailed({
              product_id: planId,
              reason: err.message || 'subscription_verification_failed',
            })
            toast.dismiss(toastId)
            toast.error("Payment received, but we're still confirming your subscription. Please don't pay again.")
            setLoadingPlan(null)
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment checkout closed.')
            setLoadingPlan(null)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp) {
        trackPaymentFailed({
          product_id: planId,
          reason: resp?.error?.description || 'Payment failed',
        })
        toast.error(resp.error?.description || 'Payment failed. Please try again.')
        setLoadingPlan(null)
      })
      trackPaymentInitiated({
        product_id: planId,
        product_type: 'subscription',
        value: amount,
        currency: resCurrency || (region === BILLING_REGIONS.INTERNATIONAL ? 'USD' : 'INR'),
      })

      // Close region modal and open Razorpay
      setRegionModalOpen(false)
      rzp.open()
    } catch (err) {
      toast.error(err.message || 'Failed to start subscription checkout')
      setLoadingPlan(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/35 animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-6 text-[#1F1F1F] overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors border border-[#E5E5E3] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Close pricing modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-3 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>0% Platform Fee on All Paid Plans</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1F1F1F] tracking-tight">
              {trialExpiredState ? 'Your 7-day trial has ended' : 'Upgrade your CreatorStore plan'}
            </h2>
            <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">
              {trialExpiredState
                ? 'Choose a plan to continue using CreatorStore.'
                : isAnnual
                  ? 'Save 20% with annual billing. Billed annually.'
                  : 'Start selling with transparent monthly pricing.'}
            </p>

            {/* Segmented Controls: Billing Interval & Region View */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              {/* Billing Interval Toggle */}
              <div className="inline-flex items-center p-1 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] transition-all duration-200">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    !isAnnual
                      ? 'bg-[#1F1F1F] text-white shadow-none'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isAnnual
                      ? 'bg-[#1F1F1F] text-white shadow-none'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <span>Annual</span>
                  <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded-full ${
                    isAnnual
                      ? 'bg-white text-[#1F1F1F]'
                      : 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                  }`}>
                    Save 20%
                  </span>
                </button>
              </div>

              {/* Currency Display Selector */}
              <div className="inline-flex items-center p-1 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] transition-all duration-200">
                <button
                  type="button"
                  onClick={() => setViewRegion(BILLING_REGIONS.INDIA)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    !isIntlView
                      ? 'bg-[#1F1F1F] text-white shadow-none'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>INR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewRegion(BILLING_REGIONS.INTERNATIONAL)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    isIntlView
                      ? 'bg-[#1F1F1F] text-white shadow-none'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <span>🌎</span>
                  <span>USD</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2 Paid Plan Cards: CREATOR vs PRO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">

            {/* Plan 1: CREATOR */}
            <div className="bg-[#FFFFFF] p-6 sm:p-7 rounded-[20px] border border-[#E5E5E3] flex flex-col justify-between space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#1F1F1F]/40 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] bg-[#F2F1EF] px-3 py-1 rounded-full border border-[#E5E5E3]">
                    CREATOR PLAN
                  </span>
                  <span className="text-[10px] font-bold text-[#16A34A]">0% PLATFORM FEE</span>
                </div>

                <div>
                  {isAnnual ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-[#1F1F1F]">{activePricing.CREATOR.annual.priceFormatted}</span>
                        <span className="text-xs text-[#6F6F6B] font-medium">/year</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#999995] line-through">
                          {isIntlView ? activePricing.CREATOR.annual.originalPriceFormatted : activePricing.CREATOR.annual.originalPriceInrFormatted}/year
                        </span>
                        <span className="text-[11px] font-bold text-[#16A34A]">Save 20%</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-[#1F1F1F]">{activePricing.CREATOR.monthly.priceFormatted}</span>
                        <span className="text-xs text-[#6F6F6B] font-medium">/month</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs font-bold text-[#1F1F1F] mt-1.5">Start Selling</p>
                  <p className="text-[11px] text-[#6F6F6B] mt-0.5">Everything you need to launch your creator business.</p>
                </div>

                {/* Benefits list */}
                <div className="space-y-2.5 pt-3 border-t border-[#E5E5E3] text-xs">
                  {[
                    'Unlimited digital products & product checkout',
                    'Instant digital download file delivery',
                    'Unlimited Instagram DMs',
                    'Up to 3 storefront pages',
                    'Product collections & storefront grouping',
                    'Basic sales & customer analytics',
                    'Standard store customization & lead collection',
                    '0% CreatorStore platform fee',
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#16A34A] shrink-0 stroke-[3]" />
                      <span className="text-[#1F1F1F] font-medium">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handleSelectPlan('CREATOR')}
                disabled={loadingPlan !== null}
                className="w-full bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F] border border-[#E5E5E3] font-bold py-3 text-xs rounded-full cursor-pointer shadow-none"
              >
                {loadingPlan === 'CREATOR' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Setting up...
                  </>
                ) : isAnnual ? (
                  `Start Creator Annual — ${activePricing.CREATOR.annual.priceFormatted}/year`
                ) : (
                  `Start with Creator — ${activePricing.CREATOR.monthly.priceFormatted}/mo`
                )}
              </Button>
            </div>

            {/* Plan 2: PRO - HIGHLIGHTED */}
            <div className="bg-[#FFFFFF] p-6 sm:p-7 rounded-[20px] border-2 border-[#1F1F1F] flex flex-col justify-between space-y-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="absolute top-0 right-0 bg-[#1F1F1F] text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl-xl">
                BEST FOR GROWING CREATORS
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white bg-[#1F1F1F] px-3 py-1 rounded-full">
                    PRO PLAN
                  </span>
                </div>

                <div>
                  {isAnnual ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-[#1F1F1F]">{activePricing.PRO.annual.priceFormatted}</span>
                        <span className="text-xs text-[#6F6F6B] font-medium">/year</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#999995] line-through">
                          {isIntlView ? activePricing.PRO.annual.originalPriceFormatted : activePricing.PRO.annual.originalPriceInrFormatted}/year
                        </span>
                        <span className="text-[11px] font-bold text-[#16A34A]">Save 20%</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-[#1F1F1F]">{activePricing.PRO.monthly.priceFormatted}</span>
                        <span className="text-xs text-[#6F6F6B] font-medium">/month</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs font-bold text-[#1F1F1F] mt-1.5">Turn your audience into a business</p>
                  <p className="text-[11px] text-[#6F6F6B] mt-0.5">Powerful tools to automate, analyze and scale.</p>
                </div>

                {/* Benefits list */}
                <div className="space-y-2.5 pt-3 border-t border-[#E5E5E3] text-xs">
                  {[
                    'Everything in Creator included',
                    'Leads & Lead Magnets',
                    'Coupons & Discounts',
                    'Email Broadcasts',
                    'Unlimited Instagram DMs',
                    'Unlimited store pages & navigation links',
                    'Advanced creator & conversion analytics',
                    'Unlimited product variants & pricing tiers',
                    'Lead export (CSV & CRM sync)',
                    'Remove CreatorStore branding',
                    'Priority creator customer support',
                    '0% CreatorStore platform fee',
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#16A34A] shrink-0 stroke-[3]" />
                      <span className="text-[#1F1F1F] font-medium">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handleSelectPlan('PRO')}
                disabled={loadingPlan !== null}
                className="w-full bg-[#1F1F1F] text-white font-bold hover:bg-[#000000] active:bg-[#111111] py-3 text-xs rounded-full cursor-pointer shadow-none"
              >
                {loadingPlan === 'PRO' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Activating Pro...
                  </>
                ) : isAnnual ? (
                  <>
                    Start Pro Annual — {activePricing.PRO.annual.priceFormatted}/year <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                ) : (
                  <>
                    Go Pro — {activePricing.PRO.monthly.priceFormatted}/mo <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Footer info & Disclaimer */}
          <div className="pt-2 text-center text-xs text-[#6F6F6B] space-y-1">
            <p>
              {isAnnual
                ? 'Annual plans are billed annually with a 20% discount. 0% CreatorStore platform fee. Cancel anytime.'
                : '0% CreatorStore platform fee. Payment processor fees may still apply. Cancel anytime.'}
            </p>
            <p className="text-[11px] text-[#8E8E89]">
              Accepts Indian UPI &amp; Cards (INR) and International Cards &amp; connected PayPal (USD) via Razorpay.
            </p>
          </div>

        </div>
      </div>

      {/* Region Selection & Confirmation Modal */}
      <RegionSelectionModal
        isOpen={regionModalOpen}
        onClose={() => {
          setRegionModalOpen(false)
          setPendingPlan(null)
        }}
        plan={pendingPlan || 'PRO'}
        interval={billingInterval}
        onProceedToPayment={handleProceedFromRegion}
        loading={loadingPlan !== null}
      />
    </>
  )
}
