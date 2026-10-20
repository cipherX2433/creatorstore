'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/lib/clientApi'
import {
  X, ArrowLeft, Check, Plus, Trash2, Edit2, Clock, Globe,
  Sparkles, AlertCircle, Loader2, Info, ChevronDown, ChevronUp,
  Tag, Shield, Mail, CheckCircle2, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import {
  validateLinktreeBookingStep,
  validateAllLinktreeBookingSteps,
} from '@/lib/wizardValidators'

export const TIMEZONE_LIST = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

export const DAYS_OF_WEEK = [
  { dayOfWeek: 0, key: 'S', dayName: 'Sunday' },
  { dayOfWeek: 1, key: 'M', dayName: 'Monday' },
  { dayOfWeek: 2, key: 'T', dayName: 'Tuesday' },
  { dayOfWeek: 3, key: 'W', dayName: 'Wednesday' },
  { dayOfWeek: 4, key: 'T', dayName: 'Thursday' },
  { dayOfWeek: 5, key: 'F', dayName: 'Friday' },
  { dayOfWeek: 6, key: 'S', dayName: 'Saturday' },
]

export const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00',
]

export function formatTime12(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m}${ampm}`
}

export function formatTimezoneLabel(tz) {
  try {
    const now = new Date()
    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    }).format(now)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'shortOffset',
      timeZone: tz,
    }).formatToParts(now)
    const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value || 'UTC'
    let cityName = tz.split('/').pop().replace(/_/g, ' ')
    if (tz === 'Asia/Kolkata') cityName = 'Calcutta'
    return `${cityName} (${timeStr.toLowerCase()} · ${offsetStr})`
  } catch {
    return tz
  }
}

export const INITIAL_WIZARD_STATE = {
  title: 'Book a session',
  timezone: 'Asia/Kolkata',
  availability: [
    { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 4, dayName: 'Thursday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 5, dayName: 'Friday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 6, dayName: 'Saturday', enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 0, dayName: 'Sunday', enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
  ],
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 15,
  minimumNoticeMinutes: 240, // 4 hours
  maximumAdvanceDays: 10, // 10 days
  bookingImage: '',
  bookingName: 'My Bookings Link',
  description: 'Book a session with me.',
  bookingTypes: [
    {
      id: 'bt_default',
      name: 'Book 1:1 time with me',
      durationMinutes: 30,
      price: 0,
      currency: 'inr',
      isFree: true,
    },
  ],
  customerFields: {
    name: { enabled: true, required: true },
    email: { enabled: true, required: true },
    phone: { enabled: false, required: false },
    message: { enabled: true, required: false },
  },
  customFields: [],
  mailingListOptIn: false,
  customTerms: '',
  cancellationPolicy: 'Cancellations must be made at least 24 hours before the scheduled booking.',
  supportEmail: '',
}

export const SUGGESTED_TITLES = [
  'Book a session',
  '1:1 Strategy & Mentorship Call',
  'Portfolio & Resume Review',
  'Career & Growth Consultation',
  '30-Min Quick Advice Session',
]

export default function LinktreeBookingWizardModal({
  open = true,
  onClose,
  onSuccess,
  editProductId = null,
  creatorProfile = null,
  currentPlan = 'FREE',
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState(() => {
    // Detect browser timezone if available
    let detectedTz = 'Asia/Kolkata'
    try {
      detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
    } catch {}
    return { ...INITIAL_WIZARD_STATE, timezone: detectedTz }
  })
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [activeDayIndex, setActiveDayIndex] = useState(1) // Monday by default

  // Booking Type Edit Modal state
  const [editingTypeIndex, setEditingTypeIndex] = useState(null)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [typeForm, setTypeForm] = useState({
    name: '',
    durationMinutes: 30,
    price: 0,
    currency: 'inr',
    isFree: true,
  })

  // Custom Field Modal state
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [fieldForm, setFieldForm] = useState({
    label: '',
    type: 'SHORT_TEXT', // 'SHORT_TEXT' | 'LONG_TEXT' | 'PHONE' | 'SELECT' | 'CHECKBOX'
    required: false,
    options: '',
  })

  const imageInputRef = useRef(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll while modal is open, and reset step when modal opens
  useEffect(() => {
    if (!open) return
    // Always restart from step 1 when the modal is opened
    setStep(1)
    setErrors({})
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  // Draft key
  const draftKey = `creatorstore_booking_draft_${editProductId || 'new'}`

  // Load existing product or local draft
  useEffect(() => {
    if (!open) return

    if (editProductId) {
      setLoading(true)
      Promise.all([
        api.get(`/products/${editProductId}`),
        api.get(`/coaching/config/${editProductId}`),
      ])
        .then(([prodRes, cfgRes]) => {
          const p = prodRes?.product || {}
          const cfg = cfgRes?.config || {}
          const cf = cfg.customerFields || {}

          const loadedBookingTypes = Array.isArray(cfg.bookingTypes) && cfg.bookingTypes.length > 0
            ? cfg.bookingTypes
            : [
                {
                  id: 'bt_default',
                  name: p.title || cfg.title || 'Book 1:1 time with me',
                  durationMinutes: cfg.durationMinutes || 30,
                  price: Number(p.price || 0),
                  currency: (p.currency || 'inr').toLowerCase(),
                  isFree: Number(p.price || 0) === 0,
                },
              ]

          const loadedState = {
            ...INITIAL_WIZARD_STATE,
            title: p.title || INITIAL_WIZARD_STATE.title,
            bookingName: p.title || INITIAL_WIZARD_STATE.bookingName,
            description: p.description || p.shortDescription || INITIAL_WIZARD_STATE.description,
            bookingImage: p.thumbnail || p.coverImage || '',
            timezone: cfg.timezone || INITIAL_WIZARD_STATE.timezone,
            availability: Array.isArray(cfg.availability) && cfg.availability.length > 0
              ? cfg.availability
              : INITIAL_WIZARD_STATE.availability,
            bufferBeforeMinutes: cfg.bufferBeforeMinutes !== undefined ? cfg.bufferBeforeMinutes : 15,
            bufferAfterMinutes: cfg.bufferAfterMinutes !== undefined ? cfg.bufferAfterMinutes : 15,
            minimumNoticeMinutes: cfg.minimumNoticeMinutes !== undefined ? cfg.minimumNoticeMinutes : 240,
            maximumAdvanceDays: cfg.maximumAdvanceDays !== undefined ? cfg.maximumAdvanceDays : 10,
            bookingTypes: loadedBookingTypes,
            customerFields: {
              name: { enabled: true, required: true },
              email: { enabled: true, required: true },
              phone: cf.phone || { enabled: false, required: false },
              message: cf.message || { enabled: true, required: false },
            },
            customFields: Array.isArray(cfg.questions) ? cfg.questions : [],
            mailingListOptIn: Boolean(cfg.mailingListOptIn || cf.mailingListOptIn),
            customTerms: cfg.customTerms || cf.customTerms || '',
            cancellationPolicy: cfg.cancellationPolicy || INITIAL_WIZARD_STATE.cancellationPolicy,
            supportEmail: cfg.supportEmail || cf.supportEmail || creatorProfile?.email || '',
          }
          setFormState(loadedState)
          setIsDirty(false)
          setLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load booking product:', err)
          toast.error('Failed to load booking details')
          setLoading(false)
        })
    } else {
      // Try restoring draft from localStorage
      try {
        const saved = localStorage.getItem(draftKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          setFormState((prev) => ({ ...prev, ...parsed }))
        }
      } catch {}
      // Autofill creator support email
      if (creatorProfile?.email) {
        setFormState((prev) => ({ ...prev, supportEmail: prev.supportEmail || creatorProfile.email }))
      }
    }
  }, [open, editProductId, creatorProfile, draftKey])

  // Save draft to localStorage on change
  const updateForm = useCallback(
    (patch) => {
      setFormState((prev) => {
        const next = { ...prev, ...patch }
        try {
          if (!editProductId) {
            localStorage.setItem(draftKey, JSON.stringify(next))
          }
        } catch {}
        return next
      })
      setIsDirty(true)
      setErrors((prev) => {
        const next = { ...prev }
        Object.keys(patch).forEach((k) => delete next[k])
        return next
      })
    },
    [draftKey, editProductId]
  )

  // Discard draft and close
  const handleDiscard = () => {
    try {
      localStorage.removeItem(draftKey)
    } catch {}
    setShowDiscardDialog(false)
    setIsDirty(false)
    onClose?.()
  }

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      onClose?.()
    }
  }

  // Navigation handlers
  const handleContinue = () => {
    const check = validateLinktreeBookingStep(step, formState)
    if (!check.valid) {
      setErrors(check.errors)
      const firstMsg = Object.values(check.errors)[0]
      if (firstMsg) toast.error(firstMsg)
      return
    }
    setErrors({})
    setStep((s) => Math.min(4, s + 1))
  }

  const handleBack = () => {
    setErrors({})
    if (step > 1) {
      setStep((s) => s - 1)
    } else {
      handleRequestClose()
    }
  }

  // Complete and save
  const handleComplete = async () => {
    const fullCheck = validateAllLinktreeBookingSteps(formState)
    if (!fullCheck.valid) {
      setStep(fullCheck.firstInvalidStep)
      setErrors(fullCheck.errors)
      const firstMsg = Object.values(fullCheck.errors)[0]
      toast.error(`Please review Step ${fullCheck.firstInvalidStep}: ${firstMsg}`)
      return
    }

    setSubmitting(true)
    try {
      let targetProductId = editProductId
      const primaryBt = formState.bookingTypes[0] || {}
      const finalPrice = primaryBt.isFree ? 0 : parseFloat(primaryBt.price || 0)

      // 1. Create product if new
      if (!targetProductId) {
        const prodRes = await api.post('/products', {
          type: 'COACHING',
          title: formState.title.trim(),
          description: formState.description.trim(),
          shortDescription: formState.description.trim().slice(0, 140),
          thumbnail: formState.bookingImage,
          coverImage: formState.bookingImage,
          price: finalPrice,
          currency: (primaryBt.currency || 'inr').toLowerCase(),
          status: 'PUBLISHED',
          addToStore: true,
          displayMode: 'classic',
        })
        targetProductId = prodRes.product?.id || prodRes.id
      } else {
        await (api.patch || api.put)(`/products/${targetProductId}`, {
          title: formState.title.trim(),
          description: formState.description.trim(),
          shortDescription: formState.description.trim().slice(0, 140),
          thumbnail: formState.bookingImage,
          coverImage: formState.bookingImage,
          price: finalPrice,
          currency: (primaryBt.currency || 'inr').toLowerCase(),
          status: 'PUBLISHED',
        })
      }

      // 2. Save Coaching Configuration
      const payload = {
        title: formState.title.trim(),
        name: formState.bookingName.trim() || formState.title.trim(),
        description: formState.description.trim(),
        shortDescription: formState.description.trim().slice(0, 140),
        thumbnail: formState.bookingImage,
        coverImage: formState.bookingImage,
        price: finalPrice,
        currency: (primaryBt.currency || 'inr').toLowerCase(),
        status: 'PUBLISHED',
        sessionType: primaryBt.name || '1:1 Session',
        durationMinutes: primaryBt.durationMinutes || 30,
        timezone: formState.timezone,
        availability: formState.availability,
        bufferBeforeMinutes: formState.bufferBeforeMinutes,
        bufferAfterMinutes: formState.bufferAfterMinutes,
        minimumNoticeMinutes: formState.minimumNoticeMinutes,
        maximumAdvanceDays: formState.maximumAdvanceDays,
        cancellationPolicy: formState.cancellationPolicy,
        bookingTypes: formState.bookingTypes,
        questions: formState.customFields,
        customerFields: {
          ...formState.customerFields,
          bookingTypes: formState.bookingTypes,
          mailingListOptIn: formState.mailingListOptIn,
          customTerms: formState.customTerms,
          supportEmail: formState.supportEmail,
        },
        mailingListOptIn: formState.mailingListOptIn,
        customTerms: formState.customTerms,
        supportEmail: formState.supportEmail,
      }

      const cfgRes = await api.post(`/coaching/config/${targetProductId}`, payload)

      // Clear local draft on success
      try {
        localStorage.removeItem(draftKey)
      } catch {}

      toast.success(editProductId ? 'Booking updated successfully!' : 'Booking created successfully!')
      setIsDirty(false)
      onSuccess?.(
        {
          id: targetProductId,
          type: 'COACHING',
          title: formState.title.trim(),
          description: formState.description.trim(),
          price: finalPrice,
          currency: primaryBt.currency || 'inr',
          thumbnail: formState.bookingImage,
          coverImage: formState.bookingImage,
          displayMode: 'classic',
          ...cfgRes?.config,
        },
        'coaching'
      )
      onClose?.()
    } catch (err) {
      console.error('Failed to save booking:', err)
      toast.error(err.message || 'Failed to save booking session. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Day Circle Click
  const toggleDay = (dayOfWeek) => {
    const nextAvailability = formState.availability.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const nextEnabled = !d.enabled
        return {
          ...d,
          enabled: nextEnabled,
          windows: nextEnabled && (!d.windows || d.windows.length === 0)
            ? [{ startTime: '09:00', endTime: '17:00' }]
            : d.windows,
        }
      }
      return d
    })
    updateForm({ availability: nextAvailability })
    setActiveDayIndex(dayOfWeek)
  }

  // Update window time for active day
  const updateDayWindow = (dayOfWeek, windowIdx, field, value) => {
    const nextAvailability = formState.availability.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const nextWindows = [...(d.windows || [])]
        nextWindows[windowIdx] = { ...nextWindows[windowIdx], [field]: value }
        return { ...d, windows: nextWindows }
      }
      return d
    })
    updateForm({ availability: nextAvailability })
  }

  // Add more availability window to a day
  const addWindowToDay = (dayOfWeek) => {
    const nextAvailability = formState.availability.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const windows = d.windows || []
        const lastEnd = windows[windows.length - 1]?.endTime || '17:00'
        return {
          ...d,
          windows: [...windows, { startTime: lastEnd, endTime: '19:00' }],
        }
      }
      return d
    })
    updateForm({ availability: nextAvailability })
  }

  // Remove window from a day
  const removeWindowFromDay = (dayOfWeek, windowIdx) => {
    const nextAvailability = formState.availability.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const nextWindows = (d.windows || []).filter((_, i) => i !== windowIdx)
        return {
          ...d,
          enabled: nextWindows.length > 0,
          windows: nextWindows,
        }
      }
      return d
    })
    updateForm({ availability: nextAvailability })
  }

  // Booking Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const res = await api.uploadFile(file)
      const url = res?.url || URL.createObjectURL(file)
      updateForm({ bookingImage: url })
      toast.success('Image uploaded successfully')
    } catch {
      const localUrl = URL.createObjectURL(file)
      updateForm({ bookingImage: localUrl })
      toast.success('Image selected')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  // Booking Type Management
  const openAddTypeModal = () => {
    setEditingTypeIndex(null)
    setTypeForm({
      name: '',
      durationMinutes: 30,
      price: 0,
      currency: 'inr',
      isFree: true,
    })
    setTypeModalOpen(true)
  }

  const openEditTypeModal = (index) => {
    const bt = formState.bookingTypes[index]
    setEditingTypeIndex(index)
    setTypeForm({
      name: bt.name,
      durationMinutes: bt.durationMinutes,
      price: bt.price,
      currency: bt.currency || 'inr',
      isFree: bt.isFree,
    })
    setTypeModalOpen(true)
  }

  const saveTypeModal = () => {
    if (!typeForm.name.trim()) {
      toast.error('Booking type name is required')
      return
    }
    const duration = parseInt(typeForm.durationMinutes, 10)
    if (isNaN(duration) || duration <= 0) {
      toast.error('Duration must be greater than 0 minutes')
      return
    }
    const isFree = Boolean(typeForm.isFree)
    const price = isFree ? 0 : parseFloat(typeForm.price || 0)
    if (!isFree) {
      if (isNaN(price) || price <= 0) {
        toast.error('Session price must be greater than 0 for paid sessions')
        return
      }
    }

    const curr = (typeForm.currency || 'INR').toUpperCase()
    const item = {
      id: editingTypeIndex !== null ? formState.bookingTypes[editingTypeIndex].id : `bt_${Date.now()}`,
      name: typeForm.name.trim(),
      durationMinutes: duration,
      price: price,
      currency: curr.toLowerCase(),
      isFree: isFree,
    }

    let nextTypes = [...formState.bookingTypes]
    if (editingTypeIndex !== null) {
      nextTypes[editingTypeIndex] = item
    } else {
      nextTypes.push(item)
    }
    updateForm({ bookingTypes: nextTypes })
    setTypeModalOpen(false)
  }

  const removeBookingType = (index) => {
    if (formState.bookingTypes.length <= 1) {
      toast.error('At least one booking type is required')
      return
    }
    const nextTypes = formState.bookingTypes.filter((_, i) => i !== index)
    updateForm({ bookingTypes: nextTypes })
  }

  // Custom Field Management
  const openAddFieldModal = () => {
    setFieldForm({
      label: '',
      type: 'SHORT_TEXT',
      required: false,
      options: '',
    })
    setFieldModalOpen(true)
  }

  const saveFieldModal = () => {
    if (!fieldForm.label.trim()) {
      toast.error('Field label is required')
      return
    }
    const newField = {
      id: `f_${Date.now()}`,
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      required: Boolean(fieldForm.required),
      options: fieldForm.type === 'SELECT'
        ? fieldForm.options.split(',').map((o) => o.trim()).filter(Boolean)
        : [],
    }
    updateForm({ customFields: [...formState.customFields, newField] })
    setFieldModalOpen(false)
  }

  const removeCustomField = (index) => {
    const nextFields = formState.customFields.filter((_, i) => i !== index)
    updateForm({ customFields: nextFields })
  }

  if (!open || !mounted) return null

  // Progress width calculation
  const progressPercent = (step / 4) * 100

  // Titles for each step
  const stepTitles = [
    'Booking information',
    'Availability',
    'Booking details',
    'Customer settings',
  ]

  // Active day object for Step 2
  const activeDay = formState.availability.find((d) => d.dayOfWeek === activeDayIndex) || formState.availability[1]

  const isProPlan = currentPlan === 'PRO' || currentPlan === 'GROWTH' || currentPlan === 'ENTERPRISE'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={stepTitles[step - 1]}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose()
      }}
    >
      {/* Centered Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[580px] h-full sm:h-auto sm:max-h-[90vh] bg-white sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden text-[#1F1F1F] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* 1. FIXED HEADER */}
        <div className="shrink-0 bg-white border-b border-[#F2F1EF] relative z-10">
          <div className="flex items-center justify-between px-5 py-4">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-[#F5F5F3] text-[#1F1F1F] transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <h2 className="text-base sm:text-lg font-bold text-[#1F1F1F] tracking-tight text-center flex-1 mx-2">
              {stepTitles[step - 1]}
            </h2>

            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 -mr-1.5 rounded-full hover:bg-[#F5F5F3] text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
              aria-label="Close setup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar & Text Indicator */}
          <div className="w-full bg-[#E5E5E3] h-1 overflow-hidden">
            <div
              className="bg-[#1F1F1F] h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="px-6 pt-2.5 pb-1">
            <span className="text-xs font-semibold text-[#6F6F6B]">
              Step {step} of 4
            </span>
          </div>
        </div>

        {/* 2. SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 subtle-scrollbar space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
              <p className="text-sm text-[#6F6F6B]">Loading booking configuration…</p>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* STEP 1: BOOKING INFORMATION */}
              {/* ======================================================== */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Title Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-[#1F1F1F]">
                        Booking title *
                      </label>
                      <span className="text-xs text-[#6F6F6B] font-mono">
                        {formState.title.length}/255
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={formState.title}
                        maxLength={255}
                        onChange={(e) => updateForm({ title: e.target.value })}
                        placeholder="Book a session"
                        className={`w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border ${
                          errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-[#D9D9D9]'
                        } text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTitleSuggestions(!showTitleSuggestions)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6F6B] hover:text-[#1F1F1F] p-1 cursor-pointer"
                        title="AI Title Suggestions"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>

                    {errors.title && (
                      <p className="text-xs text-red-500 font-medium">{errors.title}</p>
                    )}

                    {/* AI Suggestions Dropdown */}
                    {showTitleSuggestions && (
                      <div className="rounded-[14px] border border-[#E5E5E3] bg-[#FAF9F6] p-3 space-y-2 shadow-xs">
                        <p className="text-xs font-semibold text-[#6F6F6B] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          Suggested booking titles:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_TITLES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                updateForm({ title: t })
                                setShowTitleSuggestions(false)
                              }}
                              className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#E5E5E3] hover:border-[#1F1F1F] text-[#1F1F1F] font-medium transition-colors cursor-pointer text-left"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Introductory Info Box */}
                  <div className="rounded-[16px] bg-[#F5F5F3] border border-[#E5E5E3] p-4 text-sm text-[#4A4A48] space-y-2">
                    <p className="font-semibold text-[#1F1F1F]">
                      Let visitors book time directly on your store
                    </p>
                    <p className="text-xs leading-relaxed text-[#6F6F6B]">
                      Visitors will use this item to schedule 1:1 sessions, mentoring, or consultations with you.
                      Next, you will configure your recurring availability, followed by session types, duration, and pricing.
                    </p>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: AVAILABILITY */}
              {/* ======================================================== */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-[#6F6F6B]">
                      Let visitors know when you&apos;re available for bookings.
                    </p>
                  </div>

                  {/* Availability hint banner — context-aware for create vs. edit mode */}
                  <div className="rounded-[16px] border border-blue-200 bg-blue-50/70 p-3.5 flex items-start gap-3 text-blue-900 text-xs sm:text-sm">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-950">
                        {editProductId
                          ? 'Update your weekly availability windows below.'
                          : 'These are suggested defaults, edit to match your actual schedule.'}
                      </p>
                      {editProductId && (
                        <p className="text-xs text-blue-700 mt-0.5">
                          Changes apply to all new bookings going forward.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timezone Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider">
                      All times shown as
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F6F6B] pointer-events-none">
                        <Globe className="h-4 w-4" />
                      </div>
                      <select
                        value={formState.timezone}
                        onChange={(e) => updateForm({ timezone: e.target.value })}
                        className="w-full h-11 pl-10 pr-9 rounded-[14px] bg-white border border-[#D9D9D9] text-sm font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] appearance-none cursor-pointer"
                      >
                        {TIMEZONE_LIST.map((tz) => (
                          <option key={tz} value={tz}>
                            {formatTimezoneLabel(tz)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6F6F6B] pointer-events-none" />
                    </div>
                  </div>

                  {/* Weekly Availability Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                          Weekly availability
                          <Info className="h-3.5 w-3.5 text-[#999995]" />
                        </h3>
                        <p className="text-xs text-[#6F6F6B]">
                          Set recurring availability windows for bookings
                        </p>
                      </div>
                    </div>

                    {/* 7 Day Circle Buttons */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayCfg = formState.availability.find((d) => d.dayOfWeek === day.dayOfWeek)
                        const isEnabled = Boolean(dayCfg?.enabled)
                        const isSelected = activeDayIndex === day.dayOfWeek

                        return (
                          <button
                            key={day.dayOfWeek}
                            type="button"
                            onClick={() => toggleDay(day.dayOfWeek)}
                            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm font-bold transition-all flex items-center justify-center cursor-pointer ${
                              isEnabled
                                ? 'bg-[#1F1F1F] text-white shadow-xs'
                                : 'bg-white border border-[#E5E5E3] text-[#6F6F6B] hover:border-[#999995]'
                            } ${isSelected ? 'ring-2 ring-purple-600 ring-offset-2' : ''}`}
                            title={`${day.dayName} (${isEnabled ? 'Enabled' : 'Disabled'})`}
                          >
                            {day.key}
                          </button>
                        )
                      })}
                    </div>

                    {errors.availability && (
                      <p className="text-xs text-red-500 font-medium">{errors.availability}</p>
                    )}

                    {/* Configurable Windows for Current Active Day */}
                    <div className="rounded-[16px] bg-[#FAF9F6] border border-[#E5E5E3] p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                          {activeDay?.dayName || 'Selected Day'} Hours
                        </span>
                        {!activeDay?.enabled && (
                          <span className="text-xs text-[#DC2626] font-semibold">Unavailable</span>
                        )}
                      </div>

                      {activeDay?.enabled && (
                        <div className="space-y-2.5">
                          {(activeDay.windows || []).map((win, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {/* Start Time Select */}
                              <div className="relative flex-1">
                                <select
                                  value={win.startTime}
                                  onChange={(e) =>
                                    updateDayWindow(activeDay.dayOfWeek, idx, 'startTime', e.target.value)
                                  }
                                  className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] text-xs sm:text-sm font-medium appearance-none cursor-pointer focus:border-[#1F1F1F]"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {formatTime12(t)}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                              </div>

                              <span className="text-[#6F6F6B] text-sm">-</span>

                              {/* End Time Select */}
                              <div className="relative flex-1">
                                <select
                                  value={win.endTime}
                                  onChange={(e) =>
                                    updateDayWindow(activeDay.dayOfWeek, idx, 'endTime', e.target.value)
                                  }
                                  className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] text-xs sm:text-sm font-medium appearance-none cursor-pointer focus:border-[#1F1F1F]"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {formatTime12(t)}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                              </div>

                              {/* Remove Window */}
                              <button
                                type="button"
                                onClick={() => removeWindowFromDay(activeDay.dayOfWeek, idx)}
                                className="h-10 w-10 rounded-[10px] border border-[#E5E5E3] bg-white hover:bg-red-50 hover:border-red-200 text-[#6F6F6B] hover:text-[#DC2626] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Remove availability window"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addWindowToDay(activeDay.dayOfWeek)}
                            className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 pt-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add more availability
                          </button>
                        </div>
                      )}

                      {!activeDay?.enabled && (
                        <p className="text-xs text-[#6F6F6B] py-2">
                          This day is currently marked unavailable. Tap the day button above to enable recurring slots.
                        </p>
                      )}
                    </div>

                    {/* Expandable Advanced Options */}
                    <div className="border border-[#E5E5E3] rounded-[16px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="w-full px-4 py-3 bg-white hover:bg-[#FAF9F6] flex items-center justify-between text-xs sm:text-sm font-bold text-[#1F1F1F] transition-colors cursor-pointer"
                      >
                        <span>Advanced options</span>
                        {advancedOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#6F6F6B]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#6F6F6B]" />
                        )}
                      </button>

                      {advancedOpen && (
                        <div className="px-4 pb-4 pt-2 bg-[#FAF9F6] border-t border-[#E5E5E3] space-y-4 text-xs sm:text-sm">
                          {/* Buffer before start */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#6F6F6B]">
                              Buffer time before start
                            </label>
                            <div className="relative">
                              <select
                                value={formState.bufferBeforeMinutes}
                                onChange={(e) =>
                                  updateForm({ bufferBeforeMinutes: parseInt(e.target.value, 10) })
                                }
                                className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] appearance-none cursor-pointer text-xs font-medium"
                              >
                                <option value={0}>No buffer</option>
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>60 minutes</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                            </div>
                          </div>

                          {/* Buffer after start */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#6F6F6B]">
                              Buffer time after start
                            </label>
                            <div className="relative">
                              <select
                                value={formState.bufferAfterMinutes}
                                onChange={(e) =>
                                  updateForm({ bufferAfterMinutes: parseInt(e.target.value, 10) })
                                }
                                className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] appearance-none cursor-pointer text-xs font-medium"
                              >
                                <option value={0}>No buffer</option>
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>60 minutes</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                            </div>
                          </div>

                          {/* Minimum booking notice */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#6F6F6B]">
                              Minimum booking notice
                            </label>
                            <div className="relative">
                              <select
                                value={formState.minimumNoticeMinutes}
                                onChange={(e) =>
                                  updateForm({ minimumNoticeMinutes: parseInt(e.target.value, 10) })
                                }
                                className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] appearance-none cursor-pointer text-xs font-medium"
                              >
                                <option value={60}>1 hour</option>
                                <option value={120}>2 hours</option>
                                <option value={240}>4 hours</option>
                                <option value={720}>12 hours</option>
                                <option value={1440}>24 hours</option>
                                <option value={2880}>48 hours</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                            </div>
                          </div>

                          {/* Allow bookings up to */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#6F6F6B]">
                              Allow bookings up to
                            </label>
                            <div className="relative">
                              <select
                                value={formState.maximumAdvanceDays}
                                onChange={(e) =>
                                  updateForm({ maximumAdvanceDays: parseInt(e.target.value, 10) })
                                }
                                className="w-full h-10 px-3 pr-8 rounded-[10px] bg-white border border-[#D9D9D9] appearance-none cursor-pointer text-xs font-medium"
                              >
                                <option value={7}>7 days</option>
                                <option value={10}>10 days</option>
                                <option value={14}>14 days</option>
                                <option value={30}>30 days</option>
                                <option value={60}>60 days</option>
                                <option value={90}>90 days</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6F6F6B] pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: BOOKING DETAILS */}
              {/* ======================================================== */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Image Upload Box */}
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 rounded-[18px] bg-[#E5E5E3] overflow-hidden flex items-center justify-center shrink-0 border border-[#D9D9D9]">
                      {formState.bookingImage ? (
                        <img
                          src={formState.bookingImage}
                          alt="Booking preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#BDBDBD] flex items-center justify-center text-white font-bold text-sm">
                          {formState.bookingName?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="h-9 w-9 rounded-full bg-white border border-[#E5E5E3] hover:border-[#1F1F1F] text-[#1F1F1F] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        title="Upload/change image"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {formState.bookingImage && (
                        <button
                          type="button"
                          onClick={() => updateForm({ bookingImage: '' })}
                          className="h-9 w-9 rounded-full bg-white border border-[#E5E5E3] hover:border-red-500 text-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Booking Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-[#1F1F1F]">
                      Booking name *
                    </label>
                    <input
                      type="text"
                      value={formState.bookingName}
                      onChange={(e) => updateForm({ bookingName: e.target.value })}
                      placeholder="My Bookings Link"
                      className={`w-full h-12 px-4 rounded-[14px] bg-white border ${
                        errors.bookingName ? 'border-red-500' : 'border-[#D9D9D9]'
                      } text-sm font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]`}
                    />
                    {errors.bookingName && (
                      <p className="text-xs text-red-500">{errors.bookingName}</p>
                    )}
                  </div>

                  {/* Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-[#1F1F1F]">
                      Description *
                    </label>
                    <textarea
                      rows={4}
                      value={formState.description}
                      onChange={(e) => updateForm({ description: e.target.value })}
                      placeholder="Book a session with me."
                      className={`w-full p-4 rounded-[14px] bg-white border ${
                        errors.description ? 'border-red-500' : 'border-[#D9D9D9]'
                      } text-sm font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] resize-y`}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-500">{errors.description}</p>
                    )}
                  </div>

                  {/* Booking Types List (Core Linktree Feature) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#1F1F1F]">
                          Booking types *
                        </h3>
                        <p className="text-xs text-[#6F6F6B]">
                          Offer different durations or prices for this session.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddTypeModal}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1F1F1F] text-white hover:bg-[#333333] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add type
                      </button>
                    </div>

                    {errors.bookingTypes && (
                      <p className="text-xs text-red-500">{errors.bookingTypes}</p>
                    )}

                    <div className="space-y-2.5">
                      {formState.bookingTypes.map((bt, idx) => (
                        <div
                          key={bt.id || idx}
                          className="rounded-[16px] border border-[#E5E5E3] bg-white p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-[#D9D9D9] transition-all"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-bold text-[#1F1F1F] truncate">
                              {bt.name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-[#6F6F6B]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#999995]" />
                                {bt.durationMinutes} min
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-[#1F1F1F]">
                                <Tag className="h-3.5 w-3.5 text-purple-600" />
                                {bt.isFree || Number(bt.price) === 0
                                  ? 'Free'
                                  : `${(bt.currency || 'inr').toUpperCase()} ${bt.price}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditTypeModal(idx)}
                              className="p-2 rounded-full hover:bg-[#F5F5F3] text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                              title="Edit booking type"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {formState.bookingTypes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBookingType(idx)}
                                className="p-2 rounded-full hover:bg-red-50 text-[#6F6F6B] hover:text-[#DC2626] transition-colors cursor-pointer"
                                title="Delete booking type"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 4: CUSTOMER SETTINGS */}
              {/* ======================================================== */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-[#6F6F6B]">
                      Add the information you&apos;d like to collect when people book with you.
                    </p>
                  </div>

                  {/* Customer Information Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B]">
                        Information
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B]">
                        Required
                      </span>
                    </div>

                    <div className="rounded-[16px] border border-[#E5E5E3] divide-y divide-[#E5E5E3] bg-white overflow-hidden">
                      {/* Name - locked */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1F1F]">Name</p>
                          <p className="text-xs text-[#999995]">Default customer field</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Required
                        </span>
                      </div>

                      {/* Email - locked */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1F1F]">Email</p>
                          <p className="text-xs text-[#999995]">Session confirmation & calendar invite</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Required
                        </span>
                      </div>

                      {/* Custom Fields */}
                      {formState.customFields.map((cf, idx) => (
                        <div key={cf.id || idx} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1F1F1F] truncate">
                              {cf.label}
                            </p>
                            <span className="text-xs text-[#6F6F6B] font-mono">
                              {cf.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-[#6F6F6B] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(cf.required)}
                                onChange={(e) => {
                                  const next = [...formState.customFields]
                                  next[idx] = { ...next[idx], required: e.target.checked }
                                  updateForm({ customFields: next })
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              Required
                            </label>

                            <button
                              type="button"
                              onClick={() => removeCustomField(idx)}
                              className="p-1 rounded-full text-[#999995] hover:text-[#DC2626] cursor-pointer transition-colors"
                              title="Delete field"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={openAddFieldModal}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1.5 pt-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Add field
                    </button>
                  </div>

                  {/* Custom Terms & Conditions (Plan Gated) */}
                  <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#1F1F1F]" />
                        <h4 className="text-sm font-bold text-[#1F1F1F]">
                          Custom terms & conditions
                        </h4>
                      </div>
                      {!isProPlan && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          PRO
                        </span>
                      )}
                    </div>

                    {isProPlan ? (
                      <input
                        type="text"
                        value={formState.customTerms}
                        onChange={(e) => updateForm({ customTerms: e.target.value })}
                        placeholder="e.g. Terms URL or custom policy text"
                        className="w-full h-10 px-3 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-medium focus:outline-none focus:border-[#1F1F1F]"
                      />
                    ) : (
                      <p className="text-xs text-[#6F6F6B]">
                        Upgrade to Pro to add custom contractual terms, NDAs, or consultation agreements before booking.
                      </p>
                    )}
                  </div>

                  {/* Mailing List Opt-In Toggle */}
                  <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-white flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-[#1F1F1F]" />
                        Mailing-list opt-in
                      </p>
                      <p className="text-xs text-[#6F6F6B]">
                        Invite customers to join your audience newsletter upon booking.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={formState.mailingListOptIn}
                        onChange={(e) => updateForm({ mailingListOptIn: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F1F1F]"></div>
                    </label>
                  </div>

                  {/* Cancellation Policy Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-[#1F1F1F]">
                      Cancellation policy
                    </label>
                    <textarea
                      rows={3}
                      value={formState.cancellationPolicy}
                      onChange={(e) => updateForm({ cancellationPolicy: e.target.value })}
                      placeholder="Cancellations must be made at least 24 hours before the scheduled booking."
                      className="w-full p-3 rounded-[14px] bg-white border border-[#D9D9D9] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1F1F1F] resize-y"
                    />
                    <p className="text-xs text-[#6F6F6B]">
                      Displayed on your checkout and booking confirmation emails.
                    </p>
                  </div>

                  {/* Support Email from Profile */}
                  <div className="rounded-[16px] bg-[#FAF9F6] border border-[#E5E5E3] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#6F6F6B]">Support contact</p>
                      <p className="text-sm font-bold text-[#1F1F1F] font-mono">
                        {formState.supportEmail || 'support@creatorstore.com'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1F1F1F] bg-white border border-[#E5E5E3] px-2.5 py-1 rounded-full">
                      Profile Email
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. FIXED FOOTER */}
        <div className="shrink-0 px-4 sm:px-5 py-4 bg-white border-t border-[#F2F1EF] z-10">
          {step < 4 ? (
            <button
              type="button"
              onClick={handleContinue}
              className="w-full h-12 rounded-full bg-[#7B2CBF] hover:bg-[#6A24A6] text-white font-bold text-[15px] shadow-sm transition-all flex items-center justify-center cursor-pointer active:scale-[0.99]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="w-full h-12 rounded-full bg-[#1F1F1F] hover:bg-black text-white font-bold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  Saving booking…
                </>
              ) : editProductId ? (
                'Save changes'
              ) : (
                'Complete setup'
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4. MODAL: ADD / EDIT BOOKING TYPE */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-[20px] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">
                {editingTypeIndex !== null ? 'Edit Booking Type' : 'Add Booking Type'}
              </h3>
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="text-[#6F6F6B] hover:text-[#1F1F1F] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-bold text-[#1F1F1F]">Name *</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="e.g. 30 Min Consultation"
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1F1F1F]">Duration (minutes) *</label>
                <select
                  value={typeForm.durationMinutes}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, durationMinutes: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1 bg-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-[#1F1F1F] block mb-1.5">Price type</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F5F3] rounded-[12px]">
                    <button
                      type="button"
                      onClick={() => setTypeForm({ ...typeForm, isFree: true, price: 0 })}
                      className={`h-9 rounded-[9px] text-xs font-bold transition-all ${
                        typeForm.isFree
                          ? 'bg-white text-[#1F1F1F] shadow-sm'
                          : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeForm({ ...typeForm, isFree: false, price: typeForm.price > 0 ? typeForm.price : 1000 })}
                      className={`h-9 rounded-[9px] text-xs font-bold transition-all ${
                        !typeForm.isFree
                          ? 'bg-white text-[#1F1F1F] shadow-sm'
                          : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                      }`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {typeForm.isFree ? (
                  <div className="rounded-[10px] bg-[#F9F9F8] border border-[#E5E5E3] px-3.5 py-2.5 text-xs text-[#6F6F6B]">
                    Free sessions can be booked directly without attendee payment.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-[#1F1F1F]">Session price *</label>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        value={typeForm.price}
                        onChange={(e) => setTypeForm({ ...typeForm, price: e.target.value })}
                        placeholder="1000"
                        className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1 text-sm font-medium focus:outline-none focus:border-[#1F1F1F]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#1F1F1F]">Currency</label>
                      <select
                        value={(typeForm.currency || 'inr').toLowerCase()}
                        onChange={(e) => setTypeForm({ ...typeForm, currency: e.target.value })}
                        className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1 bg-white uppercase text-sm font-medium focus:outline-none focus:border-[#1F1F1F]"
                      >
                        <option value="inr">INR (₹)</option>
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="cad">CAD (CA$)</option>
                        <option value="aud">AUD (A$)</option>
                        <option value="aed">AED (AED)</option>
                        <option value="sgd">SGD (S$)</option>
                        <option value="jpy">JPY (¥)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E3]">
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#E5E5E3] text-xs font-semibold hover:bg-[#F5F5F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTypeModal}
                className="px-4 py-2 rounded-full bg-[#1F1F1F] text-white text-xs font-semibold hover:bg-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: ADD CUSTOM FIELD */}
      {fieldModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-[20px] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">Add Customer Field</h3>
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                className="text-[#6F6F6B] hover:text-[#1F1F1F] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-bold text-[#1F1F1F]">Field Label *</label>
                <input
                  type="text"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                  placeholder="e.g. Phone number or Instagram handle"
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1F1F1F]">Field Type</label>
                <select
                  value={fieldForm.type}
                  onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1 bg-white"
                >
                  <option value="SHORT_TEXT">Short Text</option>
                  <option value="LONG_TEXT">Long Text / Paragraph</option>
                  <option value="PHONE">Phone Number</option>
                  <option value="SELECT">Dropdown / Select</option>
                  <option value="CHECKBOX">Checkbox</option>
                </select>
              </div>

              {fieldForm.type === 'SELECT' && (
                <div>
                  <label className="text-xs font-bold text-[#1F1F1F]">Options (comma separated)</label>
                  <input
                    type="text"
                    value={fieldForm.options}
                    onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                    placeholder="e.g. Beginner, Intermediate, Advanced"
                    className="w-full h-10 px-3 rounded-[10px] border border-[#D9D9D9] mt-1"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-[#1F1F1F]">Mark as required</span>
                <input
                  type="checkbox"
                  checked={fieldForm.required}
                  onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E3]">
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#E5E5E3] text-xs font-semibold hover:bg-[#F5F5F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFieldModal}
                className="px-4 py-2 rounded-full bg-[#1F1F1F] text-white text-xs font-semibold hover:bg-black"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DISCARD CONFIRMATION DIALOG */}
      {showDiscardDialog && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm bg-white rounded-[20px] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1F1F1F]">Discard unsaved changes?</h3>
            <p className="text-xs text-[#6F6F6B] leading-relaxed">
              You have unsaved changes in your booking wizard. Closing now will discard your progress.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="px-4 py-2 rounded-full border border-[#E5E5E3] text-xs font-semibold hover:bg-[#F5F5F3]"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
