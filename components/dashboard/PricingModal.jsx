'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Sparkles, ArrowRight, Loader2, CreditCard, ShieldCheck, AlertCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { getSubscriptionPricing } from '@/lib/plans'
import { useAuth } from '@/components/auth/AuthContext'
import { trackPricingPlanSelected } from '@/lib/analytics'
import CountrySelect from '@/components/ui/CountrySelect'
import { openRazorpaySubscriptionCheckout } from '@/lib/razorpayClient'
import { getCountryName } from '@/lib/countries'
import { CreatorPricingCard, ProPricingCard } from '@/components/pricing/PricingCards'

export default function PricingModal({ isOpen, onClose, defaultPlan = 'PRO', defaultInterval = 'monthly', isTrialExpired = false }) {
  const router = useRouter()
  const { subscription, user, profile } = useAuth()
  const [billingInterval, setBillingInterval] = useState(defaultInterval) // 'monthly' | 'annual'
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [cancellingDowngrade, setCancellingDowngrade] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(user?.country || profile?.country || '')
  const [isEditingCountry, setIsEditingCountry] = useState(false)

  useEffect(() => {
    if (user?.country || profile?.country) {
      setSelectedCountry(user?.country || profile?.country || '')
    }
  }, [user?.country, profile?.country])

  const isAnnual = billingInterval === 'annual'
  const isIndia = String(selectedCountry || '').toUpperCase().trim() === 'IN'
  const currency = isIndia ? 'INR' : 'USD'
  const pricing = getSubscriptionPricing(currency, billingInterval)

  const isPaidActive = subscription?.status === 'ACTIVE' && !subscription?.isTrial
  const activePlanId = isPaidActive ? (subscription?.planId || 'PRO') : null
  const activeInterval = isPaidActive ? String(subscription?.billingInterval || 'MONTHLY').toLowerCase() : null

  const isCreatorCurrent = isPaidActive && activePlanId === 'CREATOR' && activeInterval === billingInterval
  const isProCurrent = isPaidActive && activePlanId === 'PRO' && activeInterval === billingInterval
  const hasScheduledDowngrade = Boolean(subscription?.hasScheduledChange && subscription?.scheduledPlan === 'CREATOR')

  const trialExpiredState = isTrialExpired || subscription?.isTrialExpired || (subscription?.status === 'EXPIRED' && !subscription?.providerSubscriptionId)

  if (!isOpen) return null

  async function handleCountryChange(newCode) {
    setSelectedCountry(newCode)
    setIsEditingCountry(false)
    try {
      await api.patch('/me/profile', { country: newCode })
      toast.success(`Country updated to ${getCountryName(newCode)} (${newCode})`)
    } catch (e) {
      console.warn('Failed to save country:', e.message)
    }
  }

  async function handleSelectPlan(planId) {
    // If clicking current plan, do nothing
    if ((planId === 'CREATOR' && isCreatorCurrent) || (planId === 'PRO' && isProCurrent)) {
      toast.info('You are already on this plan.')
      return
    }

    if (!selectedCountry) {
      toast.error('Please select your country to continue to checkout.')
      setIsEditingCountry(true)
      return
    }

    setLoadingPlan(planId)
    try {
      console.log(`[Checkout] Selecting plan ${planId} (${billingInterval}) for country ${selectedCountry}`)
      trackPricingPlanSelected({
        plan_id: planId,
        interval: billingInterval,
        currency,
      })

      const checkoutRes = await api.post('/creator/subscription/checkout', {
        plan: planId,
        interval: billingInterval,
      })

      // Already active
      if (checkoutRes.alreadyActive) {
        toast.info(checkoutRes.message || 'You already have an active subscription for this plan.')
        setLoadingPlan(null)
        onClose()
        return
      }

      // Route A: Razorpay Checkout (India)
      if (checkoutRes.provider === 'razorpay') {
        console.log('[Razorpay] Opening checkout modal for subscription:', checkoutRes.subscriptionId)
        await openRazorpaySubscriptionCheckout({
          keyId: checkoutRes.keyId,
          subscriptionId: checkoutRes.subscriptionId,
          planName: checkoutRes.planName,
          billingInterval,
          customerEmail: user?.email,
          customerName: profile?.name || user?.name || 'Creator',
          onSuccess: async (rzpResp) => {
            try {
              const verifyRes = await api.post('/creator/subscription/verify', {
                razorpaySubscriptionId: rzpResp.razorpay_subscription_id,
                razorpayPaymentId: rzpResp.razorpay_payment_id,
                razorpaySignature: rzpResp.razorpay_signature,
              })
              if (verifyRes.status === 'ACTIVE') {
                toast.success('Subscription activated successfully!')
                onClose()
                window.location.reload()
              }
            } catch (err) {
              toast.error(err.message || 'Subscription verification failed')
            } finally {
              setLoadingPlan(null)
            }
          },
          onError: (err) => {
            const userMsg = err?.customerMessage || err?.description || 'Razorpay payment was not completed'
            toast.error(userMsg)
            setLoadingPlan(null)
          },
          onDismiss: () => {
            toast.info('Checkout was canceled. No charges were made.')
            setLoadingPlan(null)
          },
        })
        return
      }

      // Route B: Dodo Checkout (Outside India)
      if (checkoutRes.checkoutUrl) {
        console.log('[Dodo Payments] Redirecting to checkout:', checkoutRes.checkoutUrl)
        window.location.href = checkoutRes.checkoutUrl
        return
      }

      // Pending payment
      if (checkoutRes.pending) {
        toast.info(checkoutRes.message || 'Upgrade payment is processing. Pro entitlements will activate once confirmed.')
        setLoadingPlan(null)
        onClose()
        return
      }

      // Verified Instant Upgrade applied
      if (checkoutRes.upgraded && checkoutRes.status === 'ACTIVE') {
        toast.success(checkoutRes.message || 'Successfully upgraded to Pro!')
        setLoadingPlan(null)
        onClose()
        window.location.reload()
        return
      }

      // Scheduled Downgrade applied
      if (checkoutRes.scheduledDowngrade) {
        toast.success(checkoutRes.message || 'Downgrade scheduled for your next billing cycle.')
        setLoadingPlan(null)
        onClose()
        window.location.reload()
        return
      }

      throw new Error(checkoutRes.error || checkoutRes.message || 'Failed to process plan selection. Please try again.')
    } catch (err) {
      if (err.code === 'COUNTRY_REQUIRED' || err.message?.includes('Country selection is required') || err.message?.includes('Country is required')) {
        toast.error('Please select your country to continue.')
        setIsEditingCountry(true)
      } else {
        toast.error(err.message || 'Subscription plan change failed')
      }
      setLoadingPlan(null)
    }
  }

  async function handleCancelScheduledDowngrade() {
    setCancellingDowngrade(true)
    try {
      const res = await api.post('/creator/subscription/cancel-downgrade')
      toast.success(res.message || 'Scheduled downgrade cancelled. You will remain on Pro.')
      window.location.reload()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel scheduled downgrade')
    } finally {
      setCancellingDowngrade(false)
    }
  }

  return (
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
            {trialExpiredState ? 'Your 7-day trial has ended' : (isPaidActive ? 'Change your CreatorStore plan' : 'Upgrade your CreatorStore plan')}
          </h2>
          <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">
            {trialExpiredState
              ? 'Choose a plan to continue using CreatorStore.'
              : isAnnual
                ? 'Save 20% with annual billing. Billed annually.'
                : 'Start selling with transparent monthly pricing.'}
          </p>

          {/* Billing Interval Toggle */}
          <div className="pt-2 flex items-center justify-center">
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
          </div>

          {/* Country Selector in Modal */}
          {(!selectedCountry || isEditingCountry) ? (
            <div className="pt-2 max-w-sm mx-auto text-left">
              <CountrySelect
                value={selectedCountry}
                onChange={handleCountryChange}
                label="Billing Country"
                placeholder="Select your country..."
                required
              />
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#6F6F6B]">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>Billing Country:</span>
                <span className="font-semibold text-[#1F1F1F]">{getCountryName(selectedCountry)} ({selectedCountry})</span>
                <span className="text-[11px] text-[#A1A1AA]">· {isIndia ? 'Razorpay (INR)' : 'Dodo Payments (USD)'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCountry(true)}
                className="text-[#FF4B1F] hover:underline font-semibold text-xs cursor-pointer ml-1"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Scheduled Downgrade Alert Banner */}
        {hasScheduledDowngrade && (
          <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-3 text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#D97706]" />
              <div>
                <span className="font-bold">Scheduled Downgrade: </span>
                <span>
                  Your subscription will downgrade to Creator on {subscription.scheduledChangeAt ? new Date(subscription.scheduledChangeAt).toLocaleDateString() : 'your next billing date'}. You maintain Pro access until then.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={cancellingDowngrade}
              onClick={handleCancelScheduledDowngrade}
              className="text-xs font-bold rounded-full h-8 px-3 border-[#D97706] text-[#92400E] hover:bg-[#FFFFFF] shrink-0"
            >
              {cancellingDowngrade ? 'Cancelling...' : 'Keep Pro'}
            </Button>
          </div>
        )}

        {/* 2 Paid Plan Cards: CREATOR vs PRO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch pt-2">
          <CreatorPricingCard
            pricing={pricing}
            isAnnual={isAnnual}
            onSelect={() => handleSelectPlan('CREATOR')}
            isCurrent={isCreatorCurrent}
            isLoading={loadingPlan === 'CREATOR'}
            disabled={loadingPlan !== null || isCreatorCurrent}
            buttonText={
              loadingPlan === 'CREATOR' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...
                </>
              ) : isCreatorCurrent ? (
                'Current Plan'
              ) : isPaidActive && activePlanId === 'PRO' ? (
                `Downgrade to Creator — ${isAnnual ? pricing.CREATOR.annual.priceFormatted + '/year' : pricing.CREATOR.monthly.priceFormatted + '/mo'}`
              ) : isAnnual ? (
                `Start Creator Annual — ${pricing.CREATOR.annual.priceFormatted}/year`
              ) : (
                `Start with Creator — ${pricing.CREATOR.monthly.priceFormatted}/mo`
              )
            }
            subtext={
              isPaidActive && activePlanId === 'PRO' && !isCreatorCurrent
                ? 'Downgrade takes effect at the end of your billing cycle.'
                : null
            }
          />

          <ProPricingCard
            pricing={pricing}
            isAnnual={isAnnual}
            onSelect={() => handleSelectPlan('PRO')}
            isCurrent={isProCurrent}
            isLoading={loadingPlan === 'PRO'}
            disabled={loadingPlan !== null || isProCurrent}
            buttonText={
              loadingPlan === 'PRO' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...
                </>
              ) : isProCurrent ? (
                'Current Plan'
              ) : isPaidActive && activePlanId === 'CREATOR' ? (
                <>
                  Upgrade to Pro — {isAnnual ? pricing.PRO.annual.priceFormatted + '/year' : pricing.PRO.monthly.priceFormatted + '/mo'} <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              ) : isAnnual ? (
                <>
                  Start Pro Annual — {pricing.PRO.annual.priceFormatted}/year <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              ) : (
                <>
                  Go Pro — {pricing.PRO.monthly.priceFormatted}/mo <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )
            }
            subtext={
              isPaidActive && activePlanId === 'CREATOR' && !isProCurrent
                ? 'Immediate upgrade • Unused Creator balance is prorated'
                : null
            }
          />
        </div>

        {/* Footer info & Disclaimer */}
        <div className="pt-2 text-center text-xs text-[#6F6F6B] space-y-1">
          <p>
            {isAnnual
              ? 'Annual plans are billed annually with a 20% discount. 0% CreatorStore platform fee. Cancel anytime.'
              : '0% CreatorStore platform fee. Payment processor fees may still apply. Cancel anytime.'}
          </p>
          <p className="text-[11px] text-[#8E8E89]">
            Checkout is processed securely via Dodo Payments. Accepts Credit/Debit Cards, Apple Pay, Google Pay, and supported global payment methods.
          </p>
        </div>

      </div>
    </div>
  )
}
