'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Video,
  Clock,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
  Flame,
  ArrowRight
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
  const productId = initialProps.productId || initialProduct?.id || null

  const [product, setProduct] = useState(initialProduct)
  const [coachingConfig, setCoachingConfig] = useState(null)

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
    }
  }, [productId])

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

  const isSetupComplete = Boolean(
    product &&
    coachingConfig &&
    coachingConfig.availability?.some((d) => d.enabled)
  )

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
            {/* 1. Name Your Booking Link Banner (Matches Screenshot media_1792414775074.png) */}
            {(!title || title === 'Book a session') && (
              <div className="rounded-[18px] bg-[#FEFCE8] border border-[#FEF08A] p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#CA8A04] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#854D0E]">
                      Name your booking link
                    </p>
                    <p className="text-xs text-[#A16207]">
                      Add a title so visitors know what they&apos;re booking
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => titleInputRef.current?.focus()}
                  className="px-3.5 py-1.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Add title
                </button>
              </div>
            )}

            {/* 2. SECTION: INFO */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Info</h3>

              {/* Title Input with 0/255 and Sparkle icon */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    maxLength={255}
                    onChange={handleTitleChange}
                    placeholder="Enter title..."
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

              {/* Booking Details Card (Avatar placeholder + Finish setup / Edit details) */}
              <div
                onClick={() => setWizardOpen(true)}
                className="rounded-[18px] border border-[#E5E5E3] bg-[#FFFFFF] p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-[#1F1F1F] transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-14 w-14 rounded-[14px] bg-[#E5E5E3] overflow-hidden flex items-center justify-center shrink-0 border border-[#D9D9D9]">
                    {product?.thumbnail || product?.coverImage ? (
                      <img
                        src={product.thumbnail || product.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#BDBDBD] flex items-center justify-center text-white font-bold text-xs">
                        {title.charAt(0)?.toUpperCase() || 'B'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-[#1F1F1F] group-hover:text-purple-700 transition-colors">
                      Booking details
                    </p>
                    <p className="text-xs text-[#6F6F6B] truncate">
                      {isSetupComplete
                        ? 'Availability, session types, and customer settings configured'
                        : 'Finish setup to start taking bookings'}
                    </p>
                  </div>
                </div>

                <div className="p-1 rounded-full text-[#999995] group-hover:text-[#1F1F1F] transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* 3. SECTION: DISPLAY (Classic vs Featured) */}
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

            {/* 4. SECTION: INTERACTION */}
            <div className="space-y-4 pt-2 border-t border-[#F2F1EF]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">
                  Interaction
                </h3>
                <p className="text-xs text-[#6F6F6B]">
                  When the visitor clicks the button
                </p>
              </div>

              <div className="rounded-[18px] bg-[#FAF9F6] border border-[#E5E5E3] p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Bookings</h4>
                  <p className="text-xs leading-relaxed text-[#6F6F6B]">
                    Let visitors book and pay for time with you, right on your storefront.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="w-full h-11 rounded-[14px] bg-[#1F1F1F] hover:bg-black text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {isSetupComplete ? 'Edit setup' : 'Continue setup'}
                  <ArrowRight className="h-4 w-4" />
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
        onSuccess={(savedProduct) => {
          setProduct(savedProduct)
          setTitle(savedProduct.title || title)
          if (onUpdateProps) {
            onUpdateProps({ title: savedProduct.title || title })
          }
        }}
      />
    </>
  )
}
