'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Sparkles, Check, ShieldCheck, CreditCard, ArrowUpRight, Lock, Zap } from 'lucide-react'
import PricingModal from '@/components/dashboard/PricingModal'
import { getPlanConfig, getSubscriptionPricing } from '@/lib/plans'

export default function CreatorBillingSettingsPage() {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pricingOpen, setPricingOpen] = useState(false)
  const pricing = getSubscriptionPricing()

  function loadStatus() {
    setLoading(true)
    api.get('/creator/subscription/status')
      .then((res) => setSub(res))
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStatus()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-64 w-full rounded-[24px] bg-[#F2F1EF]" />
      </div>
    )
  }

  const isTrial = sub?.isTrial
  const isTrialExpired = sub?.isTrialExpired || (sub?.status === 'EXPIRED' && !sub?.providerSubscriptionId)
  const isPaidSub = sub?.status === 'ACTIVE' && !isTrial
  const isSubscribed = isPaidSub || isTrial
  const isAnnual = Boolean(sub?.isAnnual || sub?.billingInterval === 'ANNUAL')
  const currentPlanId = isSubscribed ? (sub?.planId || 'PRO') : 'UNSUBSCRIBED'
  const planConfig = getPlanConfig(currentPlanId, sub?.status, isAnnual ? 'annual' : 'monthly')
  const subCurrency = (sub?.currency || 'INR').toUpperCase()
  const priceDisplay = isTrial
    ? 'Free (7-Day Trial)'
    : (isPaidSub
      ? (sub?.priceFormatted || (sub?.price ? (subCurrency === 'USD' ? `$${sub.price}` : `₹${Number(sub.price).toLocaleString('en-IN')}`) : planConfig.priceFormatted))
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-[#1F1F1F] bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
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
