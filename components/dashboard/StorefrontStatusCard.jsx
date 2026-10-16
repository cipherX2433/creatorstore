'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Store,
  ExternalLink,
  Copy,
  Check,
  Power,
  Rocket,
  ShieldAlert,
  Loader2,
  Lock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { BaseModal } from '@/components/ui/base-modal'
import { getSubscriptionPricing } from '@/lib/plans'

export default function StorefrontStatusCard({ store, subscription, onStoreUpdated }) {
  const { refreshMe } = useDashboard()
  const { setPricingModalOpen } = useDashboardHeader()
  const pricing = getSubscriptionPricing()

  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [turnOffModalOpen, setTurnOffModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const isStoreLive = Boolean(store?.published)
  const isPaid = Boolean(
    subscription &&
    (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING') &&
    (subscription.planId === 'CREATOR' || subscription.planId === 'PRO') &&
    subscription.entitlements?.canPublish
  )

  const planName = subscription?.plan || (isPaid ? 'Creator' : 'Free Account')
  const planPrice = subscription?.price ?? (subscription?.planId === 'CREATOR' ? pricing.CREATOR.priceInr : subscription?.planId === 'PRO' ? pricing.PRO.priceInr : 0)
  const storeSlug = store?.slug || store?.username || ''
  const publicUrl = typeof window !== 'undefined' && storeSlug ? `${window.location.origin}/${storeSlug}` : `/${storeSlug}`
  const displayUrl = storeSlug ? `creatorstore.store/${storeSlug}` : 'creatorstore.store/yourname'

  // Copy Public Store URL
  function handleCopyUrl() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Storefront link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle Storefront Activation
  async function handleLaunchStorefront() {
    if (!isPaid) {
      setUpgradeModalOpen(true)
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/storefront/activate')
      if (res?.store || res?.success) {
        toast.success(`🎉 Storefront is now LIVE at ${publicUrl}!`)
        if (onStoreUpdated) onStoreUpdated(res.store || { ...store, published: true })
        if (refreshMe) await refreshMe()
      }
    } catch (err) {
      if (err?.code === 'PAID_PLAN_REQUIRED' || err?.status === 403) {
        setUpgradeModalOpen(true)
      } else {
        toast.error(err?.message || 'Failed to activate storefront. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Turn Off (Deactivate)
  async function handleConfirmTurnOff() {
    setLoading(true)
    try {
      const res = await api.post('/storefront/deactivate')
      if (res?.store || res?.success) {
        toast.info('Storefront is now offline. It is no longer publicly visible.')
        setTurnOffModalOpen(false)
        if (onStoreUpdated) onStoreUpdated(res.store || { ...store, published: false })
        if (refreshMe) await refreshMe()
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to turn off storefront.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-full rounded-2xl bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-200 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative z-10">
          
          {/* Left: Info & Status */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F] tracking-tight flex items-center gap-2">
                <Store className="h-5 w-5 text-[#1F1F1F] shrink-0" />
                <span>Your Storefront</span>
              </h3>

              {/* Status Pill Badge */}
              {isStoreLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-xs font-semibold border border-[#16A34A]/20">
                  <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5F5F3] text-[#6F6F6B] text-xs font-semibold border border-[#E5E5E3]">
                  <span className="h-2 w-2 rounded-full bg-[#999995]" />
                  OFFLINE
                </span>
              )}

              {/* Plan Badge */}
              {isPaid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F1F1F] bg-[#F5F5F3] border border-[#E5E5E3] px-2.5 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3 text-[#1F1F1F] shrink-0" />
                  <span>{planName} Plan (${planPrice}/mo) ● Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6F6F6B] bg-[#F5F5F3] border border-[#E5E5E3] px-2.5 py-0.5 rounded-full">
                  <Lock className="h-3 w-3 text-[#6F6F6B] shrink-0" />
                  <span>Free Account ● Storefront locked</span>
                </span>
              )}
            </div>

            {/* Explanatory Text */}
            <div className="text-xs sm:text-sm text-[#6F6F6B] max-w-xl font-normal leading-relaxed">
              {isStoreLive ? (
                <div className="space-y-1">
                  <p>Your storefront is publicly live and accepting customer orders.</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-[#1F1F1F] font-medium flex-wrap">
                    <span className="truncate max-w-[260px] sm:max-w-md">{displayUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors p-1 cursor-pointer"
                      title="Copy URL"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[#16A34A]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : isPaid ? (
                <p>Your paid plan is active. You&apos;re ready to launch your storefront publicly to start selling.</p>
              ) : (
                <p>Your storefront isn&apos;t live yet. Choose a paid plan ({pricing.CREATOR.priceFormatted} Creator or {pricing.PRO.priceFormatted} Pro) to make it live and start selling.</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap shrink-0 pt-1 md:pt-0">
            {isStoreLive ? (
              <>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#1F1F1F] text-white hover:bg-[#000000] font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-xs min-h-[38px]"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span>View Store</span>
                </a>

                <button
                  type="button"
                  onClick={() => setTurnOffModalOpen(true)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F] border border-[#E5E5E3] font-semibold text-xs sm:text-sm transition-all cursor-pointer min-h-[38px]"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>Turn Off</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLaunchStorefront}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-[#1F1F1F] text-white hover:bg-[#000000] font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer min-h-[38px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    <span>Launch Storefront</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>

      <BaseModal
        open={turnOffModalOpen}
        onOpenChange={setTurnOffModalOpen}
        title="Turn off your storefront?"
        description="Your storefront will no longer be publicly visible. Your products, customizations, analytics, and settings will not be deleted."
        secondaryLabel="Cancel"
        onSecondary={() => setTurnOffModalOpen(false)}
        primaryLabel="Turn Off Storefront"
        onPrimary={handleConfirmTurnOff}
        primaryDisabled={loading}
        primaryLoading={loading}
        primaryDanger
      >
        <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center text-[#DC2626]">
          <AlertTriangle className="h-6 w-6" />
        </div>
      </BaseModal>

      <BaseModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        title="Upgrade to launch your storefront"
        description="Your storefront is ready to go. Choose a paid plan to make it live, start selling digital products, and accept payments."
        secondaryLabel="Maybe Later"
        onSecondary={() => setUpgradeModalOpen(false)}
        primaryLabel="View Plans"
        onPrimary={() => {
          setUpgradeModalOpen(false)
          setPricingModalOpen(true)
        }}
      >
        <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-2.5 text-xs text-[#6F6F6B]">
          <div className="font-bold text-[#1F1F1F]">Choose a CreatorStore plan:</div>
          <div className="flex items-center justify-between py-1 border-b border-[#E5E5E3]">
            <span>Creator Plan — 1 Storefront &amp; Unlimited Products</span>
            <span className="font-mono font-bold text-[#1F1F1F]">{pricing.CREATOR.priceFormatted}/mo</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>Pro Plan — Unlimited AutoDM, Lead Export &amp; Analytics</span>
            <span className="font-mono font-bold text-[#1F1F1F]">{pricing.PRO.priceFormatted}/mo</span>
          </div>
        </div>
      </BaseModal>
    </>
  )
}
