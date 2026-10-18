'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Sparkles, Check, ShieldCheck, CreditCard, ArrowUpRight, Lock, Zap, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import PricingModal from '@/components/dashboard/PricingModal'
import { getPlanConfig, getSubscriptionPricing } from '@/lib/plans'

export default function CreatorBillingSettingsPage() {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [isProcessingState, setIsProcessingState] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false)
  const pricing = getSubscriptionPricing()

  function loadStatus() {
    setLoading(true)
    api.get('/creator/subscription/status')
      .then((res) => {
        setSub(res)
        if (res?.status === 'PENDING' || res?.pendingUpgrade) {
          setIsProcessingState(true)
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await api.get('/creator/subscription/status')
      setSub(res)
      if (res?.planId === 'PRO') {
        toast.success('Pro upgrade confirmed!')
        setIsProcessingState(false)
      } else if (res?.pendingUpgrade) {
        toast.info(res.pendingUpgrade.message || 'Payment is still processing with provider.')
      } else {
        toast.info('Subscription status refreshed.')
      }
    } catch (err) {
      toast.error('Failed to refresh status: ' + (err.message || 'Network error'))
    } finally {
      setRefreshing(false)
    }
  }

  async function handleUpdatePaymentMethod() {
    setUpdatingPaymentMethod(true)
    try {
      const res = await api.post('/creator/subscription/update-payment-method', {})
      if (res?.checkoutUrl) {
        toast.info('Redirecting to Dodo to update payment method...')
        window.location.href = res.checkoutUrl
      } else {
        toast.error(res?.message || 'Unable to generate payment update session.')
      }
    } catch (err) {
      toast.error('Unable to initiate card update: ' + (err.message || 'Error'))
    } finally {
      setUpdatingPaymentMethod(false)
    }
  }

  useEffect(() => {
    loadStatus()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const successParam = params.get('success') === 'true'
      const processingParam = params.get('processing') === 'true'
      const paymentMethodUpdated = params.get('payment_method_updated') === 'true'
      const errorParam = params.get('error')
      const reasonParam = params.get('reason')
      const canceledParam = params.get('canceled') === 'true' || params.get('cancelled') === 'true'
      const upgradedParam = params.get('upgraded') === 'true'

      if (upgradedParam) {
        toast.success("Congratulations! You've upgraded to the Pro Plan. Your Pro benefits are now active.")
      } else if (paymentMethodUpdated) {
        toast.success('Payment method updated. Checking upgrade status...')
        handleRefresh()
      } else if (processingParam) {
        setIsProcessingState(true)
        toast.info('Your plan change payment is processing. Pro entitlements will activate once confirmed.')
      } else if (successParam) {
        toast.success('Subscription payment confirmed.')
      } else if (errorParam) {
        const decoded = reasonParam ? decodeURIComponent(reasonParam) : 'Unable to verify plan upgrade with payment provider.'
        toast.error(`Verification notice: ${decoded}`)
      } else if (canceledParam) {
        toast.info('Checkout was canceled. No charges were made to your account.')
      }

      // Authoritative URL cleanup: never leave success=true, canceled=true, or error params stuck in browser address bar
      if (successParam || processingParam || paymentMethodUpdated || errorParam || canceledParam || upgradedParam) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-64 w-full rounded-[24px] bg-[#F2F1EF]" />
      </div>
    )
  }

  const isTrial = sub?.isTrial
  const isTrialExpired = sub?.isTrialExpired || (sub?.status === 'EXPIRED' && !sub?.providerSubscriptionId && !sub?.dodoSubscriptionId?.startsWith('cks_'))
  const isCheckoutExpired = Boolean(sub?.isCheckoutExpired || (sub?.status === 'EXPIRED' && sub?.dodoSubscriptionId?.startsWith('cks_')))
  const isRetryPending = Boolean(sub?.isPastDue || (sub?.status === 'PENDING' && sub?.authStatus === 'PENDING_RETRY'))
  const isSubscriptionHalted = Boolean(sub?.isHalted || sub?.status === 'HALTED' || sub?.authStatus === 'HALTED')
  const isUpgraded = Boolean(sub?.isUpgraded || sub?.previousSubscriptionReplaced)
  const isUpgradePending = Boolean(sub?.pendingUpgrade && (sub.pendingUpgrade.status === 'PENDING_CHECKOUT' || sub.pendingUpgrade.status === 'PROCESSING'))
  const isUpgradeFailed = Boolean(sub?.pendingUpgrade && sub.pendingUpgrade.status === 'FAILED')
  const isSubscriptionCancelled = Boolean((sub?.status === 'CANCELLED' || sub?.authStatus === 'CANCELLED') && !isUpgraded && sub?.cancellationReason !== 'plan_upgraded')
  const inGracePeriod = Boolean(sub?.inGracePeriod)
  const gracePeriodDaysRemaining = sub?.gracePeriodDaysRemaining || 0
  const isAwaitingPayment = sub?.status === 'PENDING' && !isCheckoutExpired && !isRetryPending && !isUpgradePending
  const isPaymentFailed = (sub?.status === 'FAILED' || isUpgradeFailed) && !isUpgradeNeedsAttention
  const isUpgradeNeedsAttention = Boolean(sub?.pendingUpgrade && (sub.pendingUpgrade.needsAttention || sub.pendingUpgrade.isStale || sub.pendingUpgrade.status === 'STALE_PROCESSING' || sub.pendingUpgrade.errorMessage))
  const isProcessingWithProvider = isUpgradePending && !isUpgradeNeedsAttention

  const isPaidSub = (sub?.status === 'ACTIVE' || inGracePeriod || (sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date())) && !isTrial
  const isSubscribed = isPaidSub || isTrial
  const isAnnual = Boolean(sub?.isAnnual || sub?.billingInterval === 'ANNUAL')
  const currentPlanId = isSubscribed ? (sub?.planId || 'PRO') : 'UNSUBSCRIBED'
  const subCurrency = (sub?.currency || 'USD').toUpperCase()
  const planConfig = getPlanConfig(currentPlanId, sub?.status, isAnnual ? 'annual' : 'monthly', subCurrency)
  const priceDisplay = isTrial
    ? 'Free (7-Day Trial)'
    : (isPaidSub
      ? planConfig.priceFormatted
      : 'Free Account')

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-8 font-sans text-[#1F1F1F]">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E5E5E3] pb-4 overflow-x-auto">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Profile &amp; Store
        </Link>
        <Link
          href="/dashboard/settings/payments"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Payments
        </Link>
        <Link
          href="/dashboard/settings/connected-accounts"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Connected Accounts
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="px-4 py-2 text-sm font-bold text-[#1F1F1F] border-b-2 border-[#1F1F1F] shrink-0"
        >
          Billing &amp; Subscription
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E3] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E3] bg-[#F2F1EF] px-3.5 py-1 text-xs font-bold text-[#1F1F1F] mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Plan &amp; Billing
          </div>
          <h1 className="text-3xl font-bold text-[#1F1F1F] tracking-tight">Subscription &amp; Plans</h1>
          <p className="text-xs sm:text-sm text-[#6F6F6B] font-normal mt-1">
            Manage your plan, payment status, and unlocked platform entitlements.
          </p>
        </div>

        <Button
          onClick={() => setPricingOpen(true)}
          className="bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-white font-bold text-xs h-10 px-5 rounded-full cursor-pointer self-start sm:self-auto shadow-none"
        >
          {isPaidSub ? 'Change / Upgrade Plan' : 'Choose a Plan'}
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* STATE 0: Successful Upgrade Confirmation */}
      {isUpgraded && sub?.planId === 'PRO' && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border-2 border-[#16A34A] space-y-3 shadow-[0_8px_30px_rgba(22,163,74,0.08)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#16A34A]" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">You've upgraded to Pro!</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
              Active Pro
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            Your Pro plan is now active. You now have access to Pro features.
          </p>
          {sub?.previousSubscriptionCancelledConfirmed && (
            <p className="text-[11px] text-[#6F6F6B] border-t border-[#E5E5E3] pt-2">
              Your previous Creator subscription has been cancelled.
            </p>
          )}
        </div>
      )}

      {/* STATE 1: Awaiting Payment Completion */}
      {isAwaitingPayment && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#3B82F6]/30 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#3B82F6] animate-pulse" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Awaiting Payment Completion</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
              Awaiting Payment
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            A subscription checkout session is currently open with the payment provider. Please complete payment within {sub?.pendingPaymentTTLMinutes || 30} minutes to activate your subscription.
          </p>
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </Button>
            {sub?.checkoutUrl && (
              <Button
                onClick={() => { window.location.href = sub.checkoutUrl }}
                className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
              >
                Complete Payment Now
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STATE 2: Processing With Provider */}
      {isProcessingWithProvider && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#3B82F6]/30 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3B82F6] animate-pulse" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Your Pro upgrade is processing</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
              Processing
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            Your Creator plan remains active while we confirm your upgrade.
          </p>
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
        </div>
      )}

      {/* STATE 3: Recurring Payment Failed — Auto-Retry Pending */}
      {isRetryPending && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border-2 border-[#F59E0B] space-y-4 shadow-[0_8px_30px_rgba(245,158,11,0.08)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#D97706] animate-pulse" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Payment Failed — Automatic Retry Pending</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
              {inGracePeriod ? `Grace Period Active (${gracePeriodDaysRemaining}d remaining)` : 'Retry in Progress'}
            </span>
          </div>

          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            {sub?.lastPaymentFailureReason
              ? `Notice from payment gateway: ${sub.lastPaymentFailureReason}.`
              : 'Your scheduled recurring subscription payment could not be processed.'}{' '}
            Razorpay will automatically re-attempt the charge according to the retry schedule.
            {inGracePeriod
              ? ` Your full plan access is preserved under the grace period for ${gracePeriodDaysRemaining} more day(s).`
              : sub?.currentPeriodEnd
                ? ` Your plan entitlements remain active through ${new Date(sub.currentPeriodEnd).toLocaleDateString()}.`
                : ''}
          </p>

          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Recheck Status'}
            </Button>
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
            >
              Change or Re-authorize Plan
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STATE 4: Subscription Halted — Action Required */}
      {isSubscriptionHalted && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border-2 border-[#DC2626] space-y-4 shadow-[0_8px_30px_rgba(220,38,38,0.08)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#DC2626]" />
              <h3 className="font-bold text-sm text-[#991B1B]">Subscription Halted — Action Required</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
              Charging Stopped
            </span>
          </div>

          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            All automatic payment retries have been exhausted for your subscription and automated recurring charging has stopped.
            {inGracePeriod
              ? ` You have ${gracePeriodDaysRemaining} day(s) remaining in your grace period before paid store features are restricted.`
              : ' Your paid platform entitlements are currently restricted until billing is restored.'}
          </p>

          <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <div className="space-y-1">
              <span className="font-bold block">
                {sub?.lastPaymentFailureReason ? `Gateway Notice: ${sub.lastPaymentFailureReason}` : 'Automated collection exhausted.'}
              </span>
              <span className="text-[11px] text-[#7F1D1D] block">
                To restore full active status, please choose your plan below to initiate a fresh authorization, or contact support if you need assistance.
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
            >
              Restore Subscription Now
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
        </div>
      )}

      {/* STATE 4B: Subscription Cancelled */}
      {isSubscriptionCancelled && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#6F6F6B]" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Subscription Cancelled</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]">
              Cancelled
            </span>
          </div>

          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            Your subscription has been cancelled.
            {sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()
              ? ` You have already paid for your current billing period and retain full plan access until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}. No future charges will be billed.`
              : ' Your subscription is no longer active. You can re-activate or choose a plan at any time.'}
          </p>

          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
            >
              Re-activate Plan
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STATE 5: Checkout Expired */}
      {isCheckoutExpired && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#6B7280]/30 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#6B7280]" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Checkout Session Expired</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20">
              Checkout Expired
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            Your previous checkout attempt was not completed within the {sub?.pendingPaymentTTLMinutes || 30}-minute window and has been safely expired. No funds were charged to your card. You can safely initiate a new checkout now.
          </p>
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
            >
              Start New Checkout
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STATE 6: Upgrade Needs Attention */}
      {isUpgradeNeedsAttention && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#F59E0B]/50 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Upgrade Needs Attention</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30">
              Action Required
            </span>
          </div>

          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            {sub?.pendingUpgrade?.amount
              ? `Your Pro upgrade payment (${sub.pendingUpgrade.currency === 'INR' ? '₹' : '$'}${sub.pendingUpgrade.amount}, Payment ID: ${sub.pendingUpgrade.paymentId}) has remained pending with Dodo Payments. Your Creator plan and entitlements remain fully active.`
              : 'Your Pro upgrade payment has remained pending with Dodo Payments. Your Creator plan remains fully active.'}
          </p>

          <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#D97706]" />
            <div className="space-y-1">
              <span className="font-bold block">
                {sub?.pendingUpgrade?.errorMessage
                  ? `Provider Notice: ${sub.pendingUpgrade.errorMessage}`
                  : 'Provider Status: Payment is awaiting manual completion or card verification.'}
              </span>
              <span className="text-[11px] text-[#B45309] block">
                Off-session card payment requires authentication or an updated payment method. You can update your payment method below to finalize the upgrade safely without duplicate charges.
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </Button>

            {sub?.pendingUpgrade?.paymentLink && (
              <Button
                onClick={() => { window.location.href = sub.pendingUpgrade.paymentLink }}
                className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
              >
                Complete Payment
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}

            <Button
              onClick={handleUpdatePaymentMethod}
              disabled={updatingPaymentMethod}
              className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer flex items-center gap-2 shadow-none"
            >
              {updatingPaymentMethod ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating Link...
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  Update Payment Method / Retry
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STATE 4: Payment Failed */}
      {isPaymentFailed && !isUpgradeNeedsAttention && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#DC2626]/30 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#DC2626]" />
              <h3 className="font-bold text-sm text-[#DC2626]">
                {isUpgradeFailed ? "Your upgrade wasn't completed" : "Payment Failed"}
              </h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
              {isUpgradeFailed ? "Upgrade Incomplete" : "Payment Failed"}
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            {isUpgradeFailed
              ? "Your Creator plan is still active. You can try upgrading again."
              : (sub?.pendingUpgrade?.errorMessage || 'Your recent payment attempt could not be completed by the payment provider. Your existing features remain active.')}
          </p>
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs h-9 px-5 rounded-full cursor-pointer shadow-none"
            >
              Retry Payment
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="text-xs h-9 px-5 rounded-full border-[#E5E5E3] hover:bg-[#F2F1EF] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
        </div>
      )}

      {/* Trial Active Banner */}
      {isTrial && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#1F1F1F]" />
              <h3 className="font-bold text-sm text-[#1F1F1F]">Pro 7-Day Free Trial Active</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
              {sub?.daysRemaining ?? 0} {sub?.daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            You are currently exploring CreatorStore with full Pro features. No credit card is required. Choose a plan anytime to continue selling smoothly after your trial ends.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] text-white font-bold text-xs h-9 px-5 rounded-full hover:bg-[#000000] cursor-pointer shadow-none"
            >
              Choose a Plan
            </Button>
          </div>
        </div>
      )}

      {/* Trial Expired Banner */}
      {isTrialExpired && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#DC2626]/30 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#DC2626]" />
            <h3 className="font-bold text-sm text-[#DC2626]">Trial Expired</h3>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            Your 7-day Pro trial has ended. Your existing products, orders, and customer data remain safely stored in your account. Choose a plan to unlock product publishing, payments, and marketing tools.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] text-white font-bold text-xs h-9 px-5 rounded-full hover:bg-[#000000] cursor-pointer shadow-none"
            >
              Choose a Plan to Continue
            </Button>
          </div>
        </div>
      )}

      {/* Unsubscribed / Not Started Banner */}
      {!isSubscribed && !isTrialExpired && (
        <div className="p-6 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#1F1F1F]" />
            <h3 className="font-bold text-sm text-[#1F1F1F]">You are currently in Free Explore Mode</h3>
          </div>
          <p className="text-xs text-[#6F6F6B] leading-relaxed max-w-2xl">
            You can design and preview your storefront layout and dashboard. A paid plan (Creator {pricing.CREATOR.priceFormatted}/mo or Pro {pricing.PRO.priceFormatted}/mo) is required to launch your store, publish products, accept payments, and activate Instagram AutoDM.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={() => setPricingOpen(true)}
              className="bg-[#1F1F1F] text-white font-bold text-xs h-9 px-5 rounded-full hover:bg-[#000000] cursor-pointer shadow-none"
            >
              Choose a Plan
            </Button>
          </div>
        </div>
      )}

      {/* Subscription Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] p-6 sm:p-8 border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E3] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold text-[#1F1F1F]">
                {isTrial ? 'Pro Trial' : (isPaidSub ? `${planConfig.name} Plan` : (isTrialExpired ? 'Trial Expired' : 'Free Account (Explore Mode)'))}
              </h2>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${isTrial
                ? 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20'
                : (isPaidSub
                  ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                  : 'bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]')
                }`}>
                {isTrial ? 'PRO TRIAL' : (isPaidSub ? (sub?.status || 'ACTIVE') : (isTrialExpired ? 'EXPIRED' : 'EXPLORE ONLY'))}
              </span>
            </div>
            <p className="text-xs text-[#6F6F6B] font-normal">{isTrial ? 'Full Pro features unlocked for your 7-day trial period.' : planConfig.description}</p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-[#1F1F1F]">
              {priceDisplay} {isPaidSub && <span className="text-xs text-[#6F6F6B] font-bold">{isAnnual ? '/year' : '/month'}</span>}
            </div>
            <p className="text-[11px] text-[#16A34A] font-bold">
              {isAnnual ? '20% Annual Discount Applied' : '0% CreatorStore platform fee'}
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${isUpgraded ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 text-xs font-semibold text-[#1F1F1F] bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]`}>
          <div className="space-y-1">
            <span className="text-[#6F6F6B] font-normal block">Billing Status</span>
            <span className="text-[#1F1F1F] font-bold block">
              {isTrial ? '7-Day Free Trial' : (isPaidSub ? (isAnnual ? 'Annual Recurring (20% Off)' : 'Monthly Recurring') : (isTrialExpired ? 'Trial Expired' : 'Free Explore'))}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[#6F6F6B] font-normal block">{isTrial ? 'Started' : 'Billing Interval'}</span>
            <span className="text-[#16A34A] font-bold block">
              {isTrial && sub?.trialStartedAt
                ? new Date(sub.trialStartedAt).toLocaleDateString()
                : (isPaidSub ? (isAnnual ? 'Yearly Billing' : 'Monthly Billing') : '0% Platform Fee')}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[#6F6F6B] font-normal block">{isTrial ? 'Ends' : 'Renewal Date'}</span>
            <span className="text-[#1F1F1F] font-bold block">
              {isTrial && sub?.trialEndsAt
                ? new Date(sub.trialEndsAt).toLocaleDateString()
                : (isPaidSub && (sub?.nextBillingDate || sub?.currentPeriodEnd) ? new Date(sub.nextBillingDate || sub.currentPeriodEnd).toLocaleDateString() : '—')}
            </span>
          </div>
          {isUpgraded && (
            <div className="space-y-1">
              <span className="text-[#6F6F6B] font-normal block">Previous Subscription</span>
              <span className="text-[#1F1F1F] font-bold block">
                Replaced by Pro Plan
              </span>
            </div>
          )}
        </div>

        {/* Feature Entitlements List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B]">{isSubscribed ? 'Current Plan Features:' : 'Available with a Paid Plan:'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#1F1F1F] font-normal">
            {(isSubscribed ? planConfig.displayFeatures : getPlanConfig('CREATOR').displayFeatures).map((feat, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#16A34A] shrink-0 stroke-[3]" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footnote */}
        <div className="pt-4 border-t border-[#E5E5E3] text-[11px] text-[#6F6F6B] flex items-center justify-between">
          <span>Payment processor fees may still apply. Cancel or change plan anytime.</span>
          <button
            onClick={() => setPricingOpen(true)}
            className="text-[#1F1F1F] hover:underline font-bold cursor-pointer"
          >
            View All Plans
          </button>
        </div>
      </div>

      {/* Payment & Invoice History */}
      {sub?.paymentHistory && sub.paymentHistory.length > 0 && (
        <div className="p-6 sm:p-8 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E3] bg-[#F2F1EF] px-3.5 py-1 text-xs font-bold text-[#1F1F1F] mb-2">
              <CreditCard className="h-3.5 w-3.5" /> Transaction History
            </div>
            <h2 className="text-xl font-bold text-[#1F1F1F]">Payment History</h2>
            <p className="text-xs text-[#6F6F6B] mt-0.5">Authoritative transaction records from Dodo Payments.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E3] text-[#6F6F6B] font-semibold">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Payment ID</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F1EF]">
                {sub.paymentHistory.map((item) => {
                  const isSuccess = item.status === 'Successful'
                  const isProc = item.status === 'Processing'
                  return (
                    <tr key={item.id || item.paymentId} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3.5 pr-4 text-[#1F1F1F] font-medium whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 pr-4 text-[#1F1F1F] font-semibold whitespace-nowrap">
                        {item.plan || 'Subscription Charge'}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[11px] text-[#6F6F6B] whitespace-nowrap">
                        {item.paymentId || '—'}
                      </td>
                      <td className="py-3.5 pr-4 text-[#1F1F1F] font-bold whitespace-nowrap">
                        {item.currencySymbol || '₹'}{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSuccess
                            ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20'
                            : (isProc
                              ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
                              : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20')
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-[#6F6F6B] text-[11px] max-w-[200px] truncate">
                        {item.errorMessage || (isSuccess ? 'Verified' : 'In Progress')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PricingModal
        isOpen={pricingOpen}
        onClose={() => {
          setPricingOpen(false)
          loadStatus()
        }}
        isTrialExpired={isTrialExpired}
      />
    </div>
  )
}
