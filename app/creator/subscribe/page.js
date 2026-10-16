'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Check, Sparkles, ShieldCheck, CreditCard, Loader2, ArrowRight } from 'lucide-react'
import { getSubscriptionPricing } from '@/lib/plans'
import { BILLING_REGIONS, resolveBillingConfig } from '@/lib/billing/config'
import RegionSelectionModal from '@/components/dashboard/RegionSelectionModal'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'

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

export default function CreatorSubscribePage() {
  const router = useRouter()
  const [subStatus, setSubStatus] = useState(null)
  const [meData, setMeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('PRO') // 'CREATOR' | 'PRO'
  const [billingInterval, setBillingInterval] = useState('monthly') // 'monthly' | 'annual'
  const [viewRegion, setViewRegion] = useState(BILLING_REGIONS.INDIA)
  const [regionModalOpen, setRegionModalOpen] = useState(false)

  const isAnnual = billingInterval === 'annual'
  const isIntlView = viewRegion === BILLING_REGIONS.INTERNATIONAL

  useEffect(() => {
    Promise.all([
      api.get('/creator/subscription/status').catch(() => null),
      api.get('/me').catch(() => null),
    ]).then(([res, me]) => {
      setSubStatus(res)
      setMeData(me)
      if (res?.status === 'ACTIVE') {
        toast.success('Your Creator subscription is active!')
        if (!me?.profile?.onboardingComplete) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard/store')
        }
      }
    }).finally(() => setLoading(false))
  }, [router])

  const [verifyingStatus, setVerifyingStatus] = useState('')

  function handleStartPayment() {
    setRegionModalOpen(true)
  }

  async function handleProceedFromRegion({ plan, interval, region }) {
    if (paying) return
    setPaying(true)
    setVerifyingStatus('')
    try {
      console.log(`[Checkout] Creating checkout session for ${plan} plan (${interval}, region: ${region})`)
      const checkoutRes = await api.post('/creator/subscription/checkout', {
        plan,
        interval,
        region,
      })

      if (checkoutRes.alreadyActive) {
        toast.info(checkoutRes.message || 'You already have an active subscription.')
        setPaying(false)
        setRegionModalOpen(false)
        router.push('/dashboard/store')
        return
      }

      // OUTSIDE INDIA: Direct PayPal Integration (bypassing Razorpay)
      if (checkoutRes.provider === 'paypal' || region === BILLING_REGIONS.INTERNATIONAL) {
        console.log('[PayPal] Initiating direct PayPal checkout for international customer:', checkoutRes.approvalUrl || checkoutRes.orderId)
        if (checkoutRes.approvalUrl) {
          window.location.href = checkoutRes.approvalUrl
          return
        }
        toast.error(checkoutRes.message || checkoutRes.error || 'Failed to initiate secure PayPal subscription session. Please verify payment configuration.')
        setPaying(false)
        return
      }

      // INDIA: Razorpay Checkout
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load secure payment gateway. Please check your internet connection.')
        setPaying(false)
        return
      }

      const { subscriptionId, orderId, amount, currency, key, flowType } = checkoutRes

      const isSub = Boolean(subscriptionId && flowType === 'subscription')

      const options = {
        key: key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TU5aYIMJinylzM',
        amount: amount,
        currency: currency || (region === BILLING_REGIONS.INTERNATIONAL ? 'USD' : 'INR'),
        name: 'CreatorStore',
        description: `CreatorStore ${plan === 'CREATOR' ? 'Creator' : 'Pro'} Plan (${isAnnual ? 'Annual' : 'Monthly'})`,
        ...(isSub ? { subscription_id: subscriptionId } : { order_id: orderId }),
        prefill: {
          name: meData?.profile?.name || meData?.user?.name || 'Creator',
          email: meData?.user?.email || '',
          contact: meData?.profile?.phone || '',
        },
        theme: { color: 'var(--primary)' },
        handler: async function (response) {
          console.log('[Razorpay] Checkout success received:', response)
          setVerifyingStatus('Confirming your subscription...')
          const toastId = toast.loading('Confirming your subscription...')
          try {
            const verifyRes = await api.post('/creator/subscription/verify', {
              razorpaySubscriptionId: response.razorpay_subscription_id || subscriptionId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              razorpayOrderId: response.razorpay_order_id || orderId,
              region,
            })

            if (verifyRes.status === 'ACTIVE') {
              toast.dismiss(toastId)
              toast.success('Subscription activated successfully!')
              setVerifyingStatus('Subscription activated successfully')
              console.log('[Razorpay] Redirecting user to dashboard...')
              setRegionModalOpen(false)
              const me = await api.get('/me').catch(() => null)
              setTimeout(() => {
                if (!me?.profile?.onboardingComplete) {
                  router.push('/onboarding')
                } else {
                  router.push('/dashboard/store')
                }
              }, 600)
            } else {
              toast.dismiss(toastId)
              toast.error("Payment received, but we're still confirming your subscription. Please don't pay again.")
              setPaying(false)
              setVerifyingStatus('')
            }
          } catch (err) {
            console.error('[Razorpay] Verification error:', err)
            toast.dismiss(toastId)
            toast.error("Payment received, but we're still confirming your subscription. Please don't pay again.")
            setPaying(false)
            setVerifyingStatus('')
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment checkout closed.')
            setPaying(false)
            setVerifyingStatus('')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp) {
        toast.error(resp.error?.description || 'Payment failed. Please try again.')
        setPaying(false)
        setVerifyingStatus('')
      })

      setRegionModalOpen(false)
      rzp.open()
    } catch (err) {
      toast.error(err.message || 'Subscription activation failed')
      setPaying(false)
      setVerifyingStatus('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000000] p-6">
        <Skeleton className="h-96 w-full max-w-md rounded-3xl bg-[#0A0B13]" />
      </div>
    )
  }

  const pricing = isIntlView ? getSubscriptionPricing('USD', billingInterval) : getSubscriptionPricing('INR', billingInterval)
  const isPro = selectedPlan === 'PRO'
  const planData = isPro ? pricing.PRO : pricing.CREATOR
  const priceDisplay = planData.priceFormatted
  const periodLabel = planData.periodLabel

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-[#000000] p-6 font-sans text-[#F4F2EC]">
        <div className="w-full max-w-xl bg-[#0A0B13] rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl space-y-8">
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <CreatorStoreBrand href="/" theme="dark" size="lg" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7F000]/30 bg-[#C7F000]/10 px-3.5 py-1 text-xs font-bold text-[#C7F000]">
              <Sparkles className="h-3.5 w-3.5" /> 0% CreatorStore Platform Fee
            </div>
            <h1 className="text-3xl font-black text-[#F4F2EC] tracking-tight">Pick your Creator plan</h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium">
              Keep 100% of your product revenue and automate your creator business.
            </p>

            {/* Segmented Controls: Billing Interval & Region View */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center p-1 rounded-full bg-[#12141c] border border-white/20 transition-all">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    !isAnnual ? 'bg-primary text-black font-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isAnnual ? 'bg-primary text-black font-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                    isAnnual ? 'bg-black text-[#C7F000]' : 'bg-[#C7F000]/20 text-[#C7F000]'
                  }`}>
                    Save 20%
                  </span>
                </button>
              </div>

              {/* Currency Display Selector */}
              <div className="inline-flex items-center p-1 rounded-full bg-[#12141c] border border-white/20 transition-all">
                <button
                  type="button"
                  onClick={() => setViewRegion(BILLING_REGIONS.INDIA)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !isIntlView ? 'bg-primary text-black font-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>INR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewRegion(BILLING_REGIONS.INTERNATIONAL)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isIntlView ? 'bg-primary text-black font-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <span>🌎</span>
                  <span>USD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Plan Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedPlan('CREATOR')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                selectedPlan === 'CREATOR'
                  ? 'border-primary bg-[#12141c]'
                  : 'border-white/10 bg-[#0A0B13] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary">Creator</span>
                <span className="text-base font-black text-[#F4F2EC]">{pricing.CREATOR.priceFormatted}{pricing.CREATOR.periodLabel}</span>
              </div>
              {isAnnual && (
                <div className="text-[11px] text-[#C7F000] font-bold mt-1">
                  Save 20% vs monthly
                </div>
              )}
              <p className="text-xs text-[#A1A1AA] mt-2">Unlimited products, up to 3 AutoDM campaigns &amp; analytics.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('PRO')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                selectedPlan === 'PRO'
                  ? 'border-primary bg-[#12141c] shadow-[0_0_20px_rgba(192,132,252,0.15)]'
                  : 'border-white/10 bg-[#0A0B13] hover:border-white/20'
              }`}
            >
              <span className="absolute -top-2.5 right-3 bg-[#C7F000] text-[#000000] text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                Recommended
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#C7F000]">Pro</span>
                <span className="text-base font-black text-[#F4F2EC]">{pricing.PRO.priceFormatted}{pricing.PRO.periodLabel}</span>
              </div>
              {isAnnual && (
                <div className="text-[11px] text-[#C7F000] font-bold mt-1">
                  Save 20% vs monthly
                </div>
              )}
              <p className="text-xs text-[#A1A1AA] mt-2">Unlimited AutoDM campaigns, lead export &amp; advanced analytics.</p>
            </button>
          </div>

          {/* Pricing Card Details */}
          <div className="p-6 rounded-2xl bg-[#12141c] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#F4F2EC] text-base">
                  {isPro ? (isAnnual ? 'Pro Annual Plan' : 'Pro Monthly Plan') : (isAnnual ? 'Creator Annual Plan' : 'Creator Monthly Plan')}
                </h3>
                <p className="text-xs text-[#A1A1AA] font-medium">
                  {isAnnual ? 'Billed annually • Cancel anytime in settings' : 'Cancel anytime in settings'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary">{priceDisplay}</span>
                <span className="text-xs text-[#A1A1AA] font-bold">{periodLabel}</span>
                {isAnnual && (
                  <div className="text-[10px] text-[#C7F000] font-bold">20% Discount Applied</div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-semibold text-[#F4F2EC]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C7F000] shrink-0 stroke-[3]" />
                <span>0% CreatorStore platform fee on digital sales</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C7F000] shrink-0 stroke-[3]" />
                <span>{isPro ? 'Unlimited Instagram AutoDM campaigns' : 'Up to 3 Instagram AutoDM campaigns'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C7F000] shrink-0 stroke-[3]" />
                <span>{isPro ? 'Priority features + Lead export + Advanced analytics' : 'Standard storefront customization + Basic analytics'}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3">
            <Button
              onClick={handleStartPayment}
              disabled={paying}
              className="w-full h-12 font-black text-sm bg-primary hover:bg-primary-hover text-[#000000] rounded-xl gap-2 shadow-lg shadow-primary/25 cursor-pointer"
            >
              {paying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> {verifyingStatus || 'Opening Checkout...'}
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" /> Continue to Payment ({priceDisplay}{periodLabel}) <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-[#A1A1AA]/80 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C7F000]" /> Secure checkout • 0% platform fee • India (INR) &amp; Global (USD)
            </p>
          </div>
        </div>
      </div>

      {/* Region Selection & Confirmation Modal */}
      <RegionSelectionModal
        isOpen={regionModalOpen}
        onClose={() => setRegionModalOpen(false)}
        plan={selectedPlan}
        interval={billingInterval}
        onProceedToPayment={handleProceedFromRegion}
        loading={paying}
      />
    </>
  )
}
