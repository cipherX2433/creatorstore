'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Store, Instagram, Sparkles } from 'lucide-react'
import { BaseModal, ModalFooterActions } from '@/components/ui/base-modal'
import { SelectableCard } from '@/components/ui/selectable-card'
import { ICON_BADGE_COLORS } from '@/components/ui/icon-badge'

export default function OnboardingWelcomeModal({ me }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    if (!me?.id) return
    const storageKey = `creatorstore_welcome_dismissed_${me.id}`
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) setOpen(true)
  }, [me])

  function handleDismiss() {
    if (me?.id) {
      localStorage.setItem(`creatorstore_welcome_dismissed_${me.id}`, 'true')
    }
    setOpen(false)
  }

  function handleContinue() {
    const route = picked || '/dashboard/store'
    handleDismiss()
    router.push(route)
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={(next) => { if (!next) handleDismiss() }}
      title="Let's get your CreatorStore ready."
      description="Choose what you want to do first. You can change everything later."
      hideFooter
      className="sm:max-w-2xl"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full text-xs font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
        <Sparkles className="h-3.5 w-3.5 text-[#1F1F1F]" /> Welcome to CreatorStore
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SelectableCard
          selected={picked === '/dashboard/products/new'}
          onSelect={() => setPicked('/dashboard/products/new')}
          icon={<Package className="h-5 w-5" />}
          iconColor={ICON_BADGE_COLORS.product}
          title="Sell a product"
          description="Create your first digital product and start selling immediately."
        />
        <SelectableCard
          selected={picked === '/dashboard/store'}
          onSelect={() => setPicked('/dashboard/store')}
          icon={<Store className="h-5 w-5" />}
          iconColor={ICON_BADGE_COLORS.theme}
          title="Set up my store"
          description="Build your storefront and share your digital products link."
        />
        <SelectableCard
          selected={picked === '/dashboard/settings/connected-accounts'}
          onSelect={() => setPicked('/dashboard/settings/connected-accounts')}
          icon={<Instagram className="h-5 w-5" />}
          iconColor={ICON_BADGE_COLORS.instagram}
          title="Connect Instagram"
          description="Turn comments into DMs and send people directly to products."
        />
      </div>
      <div className="pt-6">
        <ModalFooterActions
          secondaryLabel="Go to dashboard"
          onSecondary={() => {
            handleDismiss()
            router.push('/dashboard/store')
          }}
          primaryLabel="Continue"
          onPrimary={handleContinue}
        />
      </div>
    </BaseModal>
  )
}
