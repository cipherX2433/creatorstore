'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import {
  X, Check, ChevronRight, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

import BookingDetailsStep from './BookingDetailsStep'
import CalendarStep from './CalendarStep'
import AvailabilityStep from './AvailabilityStep'
import BookingRulesStep from './BookingRulesStep'
import PricingStep from './PricingStep'
import CustomerStep from './CustomerStep'
import BookingReviewStep from './BookingReviewStep'
import { validateCoachingStep, validateAllCoachingSteps } from '@/lib/wizardValidators'

export const STEPS = [
  { num: 1, label: 'Details' },
  { num: 2, label: 'Calendar' },
  { num: 3, label: 'Availability' },
  { num: 4, label: 'Rules' },
  { num: 5, label: 'Pricing' },
  { num: 6, label: 'Customer' },
  { num: 7, label: 'Review' },
]

export const INITIAL_FORM_STATE = {
  name: '1:1 Creator Growth Consultation',
  description: 'A private 30-minute session to discuss your content strategy, audience growth and monetization.',
  thumbnail: '',
  sessionType: '1:1 Consultation',
  durationMinutes: 30,
  isCustomDuration: false,
  customDuration: '',
  calendarConnected: true,
  calendarId: 'primary',
  meetingType: 'GOOGLE_MEET',
  meetingUrl: '',
  locationText: '',
  timezone: 'Asia/Kolkata',
  availability: [
    { dayOfWeek: 1, enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '14:00', endTime: '17:00' }] },
    { dayOfWeek: 2, enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }] },
    { dayOfWeek: 3, enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 4, enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 5, enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
    { dayOfWeek: 6, enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
    { dayOfWeek: 0, enabled: true, windows: [{ startTime: '10:00', endTime: '16:00' }] },
  ],
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 15,
  minimumNoticeMinutes: 1440,
  maximumAdvanceDays: 60,
  maxSessionsPerDay: null,
  allowCancellation: true,
  cancellationPolicyNoticeHours: 24,
  cancellationPolicy: 'Cancellations made less than 24 hours before the session are not eligible for a refund.',
  allowRescheduling: true,
  reschedulingDeadlineNoticeHours: 24,
  isFree: false,
  price: 2000,
  basePrice: 2000,
  currency: 'inr',
  offerDiscount: false,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  customerFields: {
    phone: { enabled: true, required: false },
    instagram: { enabled: false, required: false },
    company: { enabled: false, required: false },
    website: { enabled: false, required: false },
    message: { enabled: true, required: false },
  },
  questions: [
    { id: 'q1', question: 'What would you like help with in this session?', type: 'LONG_TEXT', required: true }
  ],
}

export function CoachingBookingWizardContent({
  editProductId = null,
  onClose,
  onSuccess,
  hideHeader = false,
}) {
  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState(() => new Set())
  const [formState, setFormState] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(false)

  useEffect(() => {
    if (editProductId) {
      setLoadingConfig(true)
      Promise.all([
        api.get(`/products/${editProductId}`),
        api.get(`/coaching/config/${editProductId}`)
      ]).then(([prodRes, cfgRes]) => {
        const p = prodRes?.product || {}
        const cfg = cfgRes?.config || {}
        const loadedState = {
          ...INITIAL_FORM_STATE,
          name: p.title || INITIAL_FORM_STATE.name,
          description: p.description || p.shortDescription || INITIAL_FORM_STATE.description,
          thumbnail: p.thumbnail || p.coverImage || '',
          price: p.price !== undefined ? p.price : 2000,
          basePrice: p.price !== undefined ? p.price : 2000,
          currency: p.currency || 'inr',
          ...cfg,
          isFree: Number(p.price) === 0,
        }
        setFormState(loadedState)
        const validSteps = new Set()
        for (let k = 1; k <= 7; k++) {
          if (validateCoachingStep(k, loadedState).valid) {
            validSteps.add(k)
          }
        }
        setCompletedSteps(validSteps)
        setLoadingConfig(false)
      }).catch(() => {
        setLoadingConfig(false)
      })
    } else {
      setFormState(INITIAL_FORM_STATE)
      setCompletedSteps(new Set())
    }
  }, [editProductId])

  const updateFormState = useCallback((patch) => {
    setFormState((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((k) => {
        delete next[k]
      })
      return next
    })
    setIsDirty(true)
  }, [])

  function handleCloseRequest() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose?.()
    }
  }

  function validateCurrentStep() {
    const res = validateCoachingStep(step, formState)
    setErrors(res.errors)
    if (!res.valid) {
      const firstErr = Object.values(res.errors)[0]
      if (firstErr) toast.error(firstErr)
      return false
    }
    return true
  }

  function handleStepClick(targetStep) {
    if (targetStep === step) return

    // Backward navigation is always permitted
    if (targetStep < step) {
      setErrors({})
      setStep(targetStep)
      return
    }

    // Forward navigation: validate all steps between 1 and targetStep - 1
    for (let s = 1; s < targetStep; s++) {
      const res = validateCoachingStep(s, formState)
      if (!res.valid) {
        setStep(s)
        setErrors(res.errors)
        const firstErr = Object.values(res.errors)[0]
        toast.error(`Please complete Step ${s} (${STEPS[s - 1].label}) first: ${firstErr}`)
        return
      }
    }

    setErrors({})
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      for (let k = 1; k < targetStep; k++) {
        next.add(k)
      }
      return next
    })
    setStep(targetStep)
  }

  function handleContinue() {
    const res = validateCoachingStep(step, formState)
    if (!res.valid) {
      setErrors(res.errors)
      const firstErr = Object.values(res.errors)[0]
      if (firstErr) toast.error(firstErr)
      return
    }
    setErrors({})
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => Math.min(7, s + 1))
  }

  function handleBack() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
  }

  async function handlePublishOrSave(publish = false) {
    if (publish) {
      const fullCheck = validateAllCoachingSteps(formState)
      if (!fullCheck.valid) {
        setStep(fullCheck.firstInvalidStep)
        setErrors(fullCheck.errors)
        const firstErr = Object.values(fullCheck.errors)[0]
        toast.error(`Cannot publish: Fix Step ${fullCheck.firstInvalidStep} (${STEPS[fullCheck.firstInvalidStep - 1].label}) – ${firstErr}`)
        return
      }
    }

    setSubmitting(true)
    try {
      let targetProductId = editProductId

      const numericBase = formState.isFree ? 0 : Math.max(0, parseFloat(formState.basePrice !== undefined ? formState.basePrice : formState.price) || 0)
      let finalCalculatedPrice = numericBase

      if (!formState.isFree && formState.offerDiscount) {
        const val = Math.max(0, parseFloat(formState.discountValue || 0))
        if (formState.discountType === 'PERCENTAGE') {
          const clampedPct = Math.min(100, val)
          finalCalculatedPrice = Math.max(0, Math.round(numericBase * (1 - clampedPct / 100)))
        } else {
          finalCalculatedPrice = Math.max(0, numericBase - Math.min(numericBase, val))
        }
      }

      const duration = formState.isCustomDuration
        ? (parseInt(formState.customDuration, 10) || 30)
        : (formState.durationMinutes || 30)

      // 1. If new product, create product record first
      if (!targetProductId) {
        const prodRes = await api.post('/products', {
          type: 'COACHING',
          title: formState.name?.trim() || '1:1 Consultation',
          description: formState.description?.trim(),
          shortDescription: formState.description?.trim().slice(0, 140),
          thumbnail: formState.thumbnail,
          price: finalCalculatedPrice,
          currency: formState.currency || 'inr',
          status: publish ? 'PUBLISHED' : 'DRAFT',
          addToStore: true,
        })
        targetProductId = prodRes.product?.id || prodRes.id
      }

      // 2. Save complete Coaching Configuration
      const payload = {
        title: formState.name?.trim(),
        name: formState.name?.trim(),
        description: formState.description?.trim(),
        shortDescription: formState.description?.trim().slice(0, 140),
        thumbnail: formState.thumbnail,
        coverImage: formState.thumbnail,
        price: finalCalculatedPrice,
        basePrice: numericBase,
        currency: formState.currency || 'inr',
        status: publish ? 'PUBLISHED' : 'DRAFT',
        sessionType: formState.sessionType,
        durationMinutes: duration,
        calendarProvider: 'GOOGLE_CALENDAR',
        calendarId: formState.calendarId || 'primary',
        meetingType: formState.meetingType || 'GOOGLE_MEET',
        deliveryMethod: formState.meetingType || 'GOOGLE_MEET',
        meetingUrl: formState.meetingUrl?.trim() || '',
        locationText: formState.locationText?.trim() || '',
        timezone: formState.timezone || 'Asia/Kolkata',
        availability: formState.availability,
        bufferBeforeMinutes: formState.bufferBeforeMinutes || 0,
        bufferAfterMinutes: formState.bufferAfterMinutes !== undefined ? formState.bufferAfterMinutes : 15,
        minimumNoticeMinutes: formState.minimumNoticeMinutes !== undefined ? formState.minimumNoticeMinutes : 1440,
        maximumAdvanceDays: formState.maximumAdvanceDays || 60,
        maxSessionsPerDay: formState.maxSessionsPerDay || null,
        allowCancellation: formState.allowCancellation !== false,
        cancellationPolicyNoticeHours: formState.cancellationPolicyNoticeHours || 24,
        cancellationPolicy: formState.cancellationPolicy || '',
        allowRescheduling: formState.allowRescheduling !== false,
        reschedulingDeadlineNoticeHours: formState.reschedulingDeadlineNoticeHours || 24,
        discountType: formState.offerDiscount ? formState.discountType : null,
        discountValue: formState.offerDiscount ? formState.discountValue : 0,
        customerFields: formState.customerFields,
        questions: formState.questions || [],
      }

      await api.post(`/coaching/config/${targetProductId}`, payload)

      if (publish) {
        await api.post(`/products/${targetProductId}/publish`).catch(() => {})
        toast.success('Booking published successfully.')
      } else {
        toast.success('Booking draft saved successfully.')
      }

      setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7]))
      setIsDirty(false)
      onSuccess?.({
        id: targetProductId,
        title: formState.name,
        price: finalCalculatedPrice,
        currency: formState.currency,
        type: 'COACHING',
        status: publish ? 'PUBLISHED' : 'DRAFT',
      })
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Failed to save coaching product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FFFFFF] text-[#010619] overflow-hidden">
      {/* 1. FIXED HEADER */}
      {!hideHeader && (
        <div className="px-6 py-5 border-b border-[#D8DFFA] flex items-center justify-between shrink-0 bg-[#FFFFFF]">
          <div>
            <h2 className="text-xl font-bold text-[#010619] tracking-tight">
              {editProductId ? 'Edit Booking' : 'Create a Booking'}
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Set up your coaching, consultation, or 1:1 session.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCloseRequest}
            className="p-2 rounded-full text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 2. HORIZONTAL STEP INDICATOR */}
      <div className="px-6 py-3 border-b border-[#D8DFFA] bg-[#F2F5FE] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {STEPS.map((s) => {
          const isActive = step === s.num
          const wasCompleted = completedSteps.has(s.num)
          const isValid = validateCoachingStep(s.num, formState).valid
          // Step is complete ONLY if it was previously completed, is currently valid, and is NOT the current active step
          const isComplete = !isActive && wasCompleted && isValid
          
          let isLocked = false
          for (let k = 1; k < s.num; k++) {
            if (!validateCoachingStep(k, formState).valid) {
              isLocked = true
              break
            }
          }

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => handleStepClick(s.num)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#194DF5] text-[#FFFFFF]'
                  : isComplete
                  ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                  : isLocked
                  ? 'bg-[#E8EDFB] text-[#A5A5A5] border border-[#D8DFFA] opacity-60 cursor-not-allowed'
                  : 'bg-[#FFFFFF] text-[#666666] border border-[#D8DFFA] hover:bg-[#F5F5F3]'
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-white text-[#194DF5]'
                    : isComplete
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-[#D8DFFA] text-[#666666]'
                }`}
              >
                {isComplete ? <Check className="h-3 w-3 stroke-[3]" /> : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. SCROLLABLE FORM CONTENT */}
      <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-[#FFFFFF] no-scrollbar max-h-[58vh]">
        {loadingConfig ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#194DF5]" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <BookingDetailsStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 2 && (
              <CalendarStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 3 && (
              <AvailabilityStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 4 && (
              <BookingRulesStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 5 && (
              <PricingStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 6 && (
              <CustomerStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 7 && (
              <BookingReviewStep
                formState={formState}
                onGoToStep={setStep}
              />
            )}
          </>
        )}
      </div>

      {/* 4. FIXED FOOTER CONTROLS */}
      <div className="px-6 py-4 border-t border-[#D8DFFA] bg-[#FFFFFF] flex items-center justify-between shrink-0">
        <div>
          {step === 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRequest}
              className="rounded-full border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:bg-[#EAEAE8] text-xs font-semibold px-5 h-9 cursor-pointer"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="rounded-full border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:bg-[#EAEAE8] text-xs font-semibold px-5 h-9 gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePublishOrSave(false)}
            disabled={submitting}
            className="rounded-full border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:bg-[#EAEAE8] text-xs font-semibold px-5 h-9 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Draft'}
          </Button>

          {step === 7 ? (
            <Button
              type="button"
              onClick={() => handlePublishOrSave(true)}
              disabled={submitting}
              className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-6 h-9 shadow-sm cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Publish Booking'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleContinue}
              className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-6 h-9 gap-1 shadow-sm cursor-pointer"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[10000] bg-black/45 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#010619]">Discard changes?</h3>
              <p className="text-xs text-[#666666]">
                You have unsaved changes in this coaching setup. Are you sure you want to discard them?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8DFFA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-full border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:bg-[#EAEAE8] text-xs font-semibold px-4 cursor-pointer"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false)
                  setIsDirty(false)
                  onClose?.()
                }}
                className="rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold px-4 cursor-pointer"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoachingBookingWizardModal({
  open = false,
  onClose,
  onSuccess,
  editProductId = null,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock scroll when open
  useEffect(() => {
    if (open && mounted) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open, mounted])

  // Handle Escape key
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  if (!open) return null
  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editProductId ? 'Edit Booking' : 'Create a Booking'}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in-0 duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl shadow-2xl flex flex-col text-[#010619] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <CoachingBookingWizardContent
          editProductId={editProductId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>,
    document.body
  )
}

