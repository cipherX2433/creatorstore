'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Clock,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
  Flame,
  Video,
} from 'lucide-react'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import StoreItemDisplaySelector from '@/components/dashboard/editors/StoreItemDisplaySelector'
import LinktreeBookingWizardModal from '@/components/coaching/LinktreeBookingWizardModal'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'

export default function BookingEditor({
  section,
  product: initialProduct = null,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
  creatorProfile = null,
  currentPlan = 'FREE',
}) {
  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('idle')
  const [wizardOpen, setWizardOpen] = useState(false)

  const initialProps = section?.props || {}
  // Resolve the product ID: from section props, or from the passed product, or null
  const productId = initialProps.productId || initialProduct?.id || initialProps.bookingId || initialProps.coachingId || null

  const [product, setProduct] = useState(initialProduct)
  const [coachingConfig, setCoachingConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Auto-heal section props if productId was resolved but missing from section props
  useEffect(() => {
    if (section && !section.props?.productId && productId && onUpdateProps) {
      onUpdateProps({ productId })
    }
  }, [section, productId, onUpdateProps])

  const [title, setTitle] = useState(
    initialProps.title || initialProduct?.title || 'Book a session'
  )
  const [displayMode, setDisplayMode] = useState(
    initialProps.layout || initialProps.displayMode || initialProduct?.displayMode || 'classic'
  )

  const titleInputRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Fetch Product & Coaching Config if not provided
  useEffect(() => {
    if (productId) {
      setLoadingConfig(true)
      Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/coaching/config/${productId}`),
      ])
        .then(([pRes, cfgRes]) => {
          if (pRes?.product) {
            setProduct(pRes.product)
            setTitle(pRes.product.title || title)
            if (pRes.product.displayMode) {
              setDisplayMode(pRes.product.displayMode)
            }
          }
          if (cfgRes?.config) {
            setCoachingConfig(cfgRes.config)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingConfig(false))
    }
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSave = (patch) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (onUpdateProps) {
          onUpdateProps(patch)
        }
        if (productId && (patch.title || patch.displayMode)) {
          await api.put(`/products/${productId}`, {
            ...(patch.title ? { title: patch.title } : {}),
            ...(patch.displayMode ? { displayMode: patch.displayMode } : {}),
          })
        }
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1500)
      } catch (err) {
        console.error('Failed to auto-save booking:', err)
        setSaveState('error')
        toast.error('Failed to save changes')
      }
    }, 400)
  }

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    triggerSave({ title: val })
  }

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode)
    triggerSave({ layout: mode, displayMode: mode })
  }

  // Consider setup complete if we have an availability configuration with at least one enabled day
  const isSetupComplete = Boolean(
    coachingConfig &&
    coachingConfig.availability?.some((d) => d.enabled)
  )

  // Stats from coaching config
  const configuredTypes = coachingConfig?.bookingTypes?.length || 0
  const enabledDays = coachingConfig?.availability?.filter((d) => d.enabled)?.length || 0

  const handleWizardSuccess = (savedProduct) => {
    if (savedProduct) {
      setProduct(savedProduct)
      setTitle(savedProduct.title || title)
      if (onUpdateProps) {
        onUpdateProps({ title: savedProduct.title || title })
      }
    }
    // Reload coaching config after save
    if (productId || savedProduct?.id) {
      const pid = productId || savedProduct.id
      api.get(`/coaching/config/${pid}`)
        .then((cfgRes) => {
          if (cfgRes?.config) setCoachingConfig(cfgRes.config)
        })
        .catch(() => {})
    }
  }

  return (
    <>
      <StoreItemEditorShell
        itemTypeLabel="Bookings"
        title={title || 'Bookings'}
        onBack={onBack}
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'powerups', label: 'Power-ups' },
          { id: 'insights', label: 'Insights' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveState={saveState}
        isHidden={section?.hidden}
        onToggleHidden={onToggleHidden}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onOpenMobilePreview={onOpenMobilePreview}
      >
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-7">

            {/* SECTION: INFO */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Info</h3>

              {/* Title Input with character counter and sparkle icon */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    maxLength={255}
                    onChange={handleTitleChange}
                    placeholder="Book a session"
                    className="w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-[#6F6F6B] font-mono">
                    {title.length}/255
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION: DISPLAY (Classic vs Featured) */}
            <div className="space-y-2 pt-2 border-t border-[#F2F1EF]">
              <StoreItemDisplaySelector
                value={displayMode}
                onChange={handleDisplayModeChange}
                thumbnail={product?.thumbnail || product?.coverImage}
                itemType="product"
                title="Display"
                subtitle="How you display your content"
              />
            </div>

            {/* SECTION: INTERACTION */}
            <div className="space-y-4 pt-2 border-t border-[#F2F1EF]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">
                  Interaction
                </h3>
                <p className="text-xs text-[#6F6F6B]">
                  When the visitor clicks the button
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Bookings</h4>
                  <p className="text-xs leading-relaxed text-[#6F6F6B]">
                    Let visitors book and pay for time with you, right on your storefront.
                  </p>
                </div>

                {/* Setup status summary — only shown after setup */}
                {isSetupComplete && (
                  <div className="rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <div className="text-xs text-[#15803D] space-y-0.5">
                      <p className="font-semibold">Booking is set up</p>
                      <p className="text-[#166534]">
                        {enabledDays} day{enabledDays !== 1 ? 's' : ''} available
                        {configuredTypes > 0 ? ` · ${configuredTypes} session type${configuredTypes !== 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Full-width pill Continue setup button — matching reference */}
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="w-full h-12 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  Continue setup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POWER-UPS */}
        {activeTab === 'powerups' && (
          <div className="space-y-5 py-2">
            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F1F1F]">
                <Flame className="h-4 w-4 text-orange-500" />
                Booking Reminders
              </div>
              <p className="text-xs text-[#6F6F6B] leading-relaxed">
                Automated email reminders are automatically dispatched to customers 24 hours and 1 hour before scheduled booking calls.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F1F1F]">
                <Video className="h-4 w-4 text-purple-600" />
                Native Google Meet Integration
              </div>
              <p className="text-xs text-[#6F6F6B] leading-relaxed">
                Unique Google Meet links are generated and included in calendar invitations sent to both you and your customer.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-[#FAF9F6] space-y-1">
                <span className="text-xs text-[#6F6F6B]">Total Bookings</span>
                <p className="text-xl font-bold text-[#1F1F1F]">0</p>
              </div>
              <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-[#FAF9F6] space-y-1">
                <span className="text-xs text-[#6F6F6B]">Completed Sessions</span>
                <p className="text-xl font-bold text-[#1F1F1F]">0</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white text-center py-8 space-y-2">
              <BarChart3 className="h-8 w-8 text-[#999995] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[#1F1F1F]">No booking traffic yet</p>
              <p className="text-xs text-[#6F6F6B]">
                Publish your store and share your booking link with your audience to start scheduling sessions.
              </p>
            </div>
          </div>
        )}
      </StoreItemEditorShell>

      {/* SETUP WIZARD MODAL */}
      <LinktreeBookingWizardModal
        open={wizardOpen}
        editProductId={productId}
        creatorProfile={creatorProfile}
        currentPlan={currentPlan}
        onClose={() => setWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />
    </>
  )
}
