'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  X,
  Upload,
  Trash2,
  Check,
  Loader2,
  FileDown,
  Video,
  GraduationCap,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
  Link2,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { BRAND_COLOR } from '@/components/brand/CreatorStoreBrand'

export const SUPPORTED_PRODUCT_TYPES = [
  {
    type: 'DIGITAL_DOWNLOAD',
    title: 'Digital download',
    desc: 'Sell downloadable files, PDFs, guides, templates, and ebooks',
    icon: FileDown,
    color: '#FF4B1F',
  },
  {
    type: 'COACHING',
    title: '1:1 Session or coaching',
    desc: 'Sell 1:1 consultations, strategy calls, and video sessions',
    icon: Video,
    color: '#8B5CF6',
  },
  {
    type: 'COURSE',
    title: 'Course or tutorial',
    desc: 'Teach students with structured video lessons and materials',
    icon: GraduationCap,
    color: '#3B82F6',
  },
]

export const CURRENCIES = [
  { code: 'inr', symbol: '₹', label: 'INR (₹)' },
  { code: 'usd', symbol: '$', label: 'USD ($)' },
  { code: 'eur', symbol: '€', label: 'EUR (€)' },
  { code: 'gbp', symbol: '£', label: 'GBP (£)' },
  { code: 'cad', symbol: 'CA$', label: 'CAD ($)' },
  { code: 'aud', symbol: 'AU$', label: 'AUD ($)' },
]

/**
 * MobileProductWizard — Complete, production-ready mobile product creation & edit workflow.
 * 
 * Complies with Phase 4 & Phase 5:
 * - Step 1: Select product type (DIGITAL_DOWNLOAD, COACHING, COURSE)
 * - Step 2: Product information (Title, description, price, currency)
 * - Step 3: Thumbnail upload via real /api/upload
 * - Step 4: Fulfillment (Deliverable file upload for digital, session duration for coaching)
 * - Step 5: Save draft / Publish via real /api/products
 * - Step 6: Return to store with canonical updated record
 * - Step 7: Edit existing product without duplicating
 */
export default function MobileProductWizard({
  isOpen,
  onClose,
  initialProduct = null, // If provided, enters edit mode for this product
  activePageId = null,
  onSuccess, // (savedProduct, isEdit) => void
}) {
  const isEdit = Boolean(initialProduct?.id)

  // Wizard Step: 1 = Type (only in create mode), 2 = Info, 3 = Thumbnail, 4 = Fulfillment, 5 = Review
  const [step, setStep] = useState(isEdit ? 2 : 1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  // Product Fields
  const [productType, setProductType] = useState(initialProduct?.type || 'DIGITAL_DOWNLOAD')
  const [title, setTitle] = useState(initialProduct?.title || '')
  const [description, setDescription] = useState(initialProduct?.description || initialProduct?.shortDescription || '')
  const [price, setPrice] = useState(initialProduct?.price !== undefined ? String(initialProduct.price) : '499')
  const [currency, setCurrency] = useState(initialProduct?.currency?.toLowerCase() || 'inr')
  const [thumbnail, setThumbnail] = useState(initialProduct?.thumbnail || initialProduct?.coverImage || '')
  const [displayMode, setDisplayMode] = useState(initialProduct?.displayMode || 'classic')

  // Fulfillment Fields
  const [fileObj, setFileObj] = useState(
    initialProduct?.fileId || initialProduct?.fileName
      ? {
          id: initialProduct.fileId,
          name: initialProduct.fileName,
          size: initialProduct.fileSize ? `${(initialProduct.fileSize / 1024 / 1024).toFixed(2)} MB` : null,
          mime: initialProduct.fileMime || null,
        }
      : (initialProduct?.files?.[0] || null)
  )
  const [coachingDuration, setCoachingDuration] = useState(
    initialProduct?.bookingSchedule?.durationMinutes || 30
  )
  const [deliveryUrl, setDeliveryUrl] = useState(initialProduct?.redirectUrl || '')

  // Upload & Save States
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const submittingLockRef = useRef(false)
  const thumbInputRef = useRef(null)
  const deliverableInputRef = useRef(null)

  // Reset or populate fields when opening or changing initialProduct
  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setProductType(initialProduct.type || 'DIGITAL_DOWNLOAD')
        setTitle(initialProduct.title || '')
        setDescription(initialProduct.description || initialProduct.shortDescription || '')
        setPrice(initialProduct.price !== undefined ? String(initialProduct.price) : '0')
        setCurrency(initialProduct.currency?.toLowerCase() || 'inr')
        setThumbnail(initialProduct.thumbnail || initialProduct.coverImage || '')
        setDisplayMode(initialProduct.displayMode || 'classic')
        setFileObj(
          initialProduct.fileId || initialProduct.fileName
            ? {
                id: initialProduct.fileId,
                name: initialProduct.fileName,
                size: initialProduct.fileSize ? `${(initialProduct.fileSize / 1024 / 1024).toFixed(2)} MB` : null,
                mime: initialProduct.fileMime || null,
              }
            : (initialProduct.files?.[0] || null)
        )
        setCoachingDuration(initialProduct.bookingSchedule?.durationMinutes || 30)
        setDeliveryUrl(initialProduct.redirectUrl || '')
        setStep(2)
      } else {
        setProductType('DIGITAL_DOWNLOAD')
        setTitle('')
        setDescription('')
        setPrice('499')
        setCurrency('inr')
        setThumbnail('')
        setDisplayMode('classic')
        setFileObj(null)
        setCoachingDuration(30)
        setDeliveryUrl('')
        setStep(1)
      }
      setHasUnsavedChanges(false)
      setValidationErrors({})
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, initialProduct])

  // Track field changes
  function markChanged() {
    setHasUnsavedChanges(true)
  }

  function handleAttemptClose() {
    if (hasUnsavedChanges && !submitting) {
      setDiscardConfirmOpen(true)
    } else {
      onClose?.()
    }
  }

  // Thumbnail upload via /api/upload
  async function handleThumbnailUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPG, PNG, or WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.')
      return
    }

    setUploadingThumb(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.postForm('/upload', formData)
      if (res.url) {
        setThumbnail(res.url)
        markChanged()
        toast.success('Thumbnail uploaded!')
      } else {
        throw new Error(res.error || 'Failed to upload image')
      }
    } catch (err) {
      toast.error(err.message || 'Image upload failed. Please try again.')
    } finally {
      setUploadingThumb(false)
      if (thumbInputRef.current) thumbInputRef.current.value = ''
    }
  }

  // Deliverable file upload via /api/upload
  async function handleDeliverableUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Deliverable file size must be less than 50MB.')
      return
    }

    setUploadingDeliverable(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.postForm('/upload', formData)
      if (res.url || res.fileId) {
        setFileObj({
          id: res.fileId || res.url,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          mime: file.type || 'application/octet-stream',
          url: res.url,
        })
        markChanged()
        toast.success('Deliverable file attached!')
      } else {
        throw new Error(res.error || 'Failed to upload deliverable')
      }
    } catch (err) {
      toast.error(err.message || 'Deliverable upload failed. Please try again.')
    } finally {
      setUploadingDeliverable(false)
      if (deliverableInputRef.current) deliverableInputRef.current.value = ''
    }
  }

  // Form Validation
  function validateForm(targetStatus = 'PUBLISHED') {
    const errs = {}
    if (!title.trim()) {
      errs.title = 'Product title is required'
    } else if (title.trim().length < 2) {
      errs.title = 'Title must be at least 2 characters'
    }

    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice < 0) {
      errs.price = 'Please enter a valid price (0 for free)'
    }

    if (targetStatus === 'PUBLISHED' && productType === 'DIGITAL_DOWNLOAD') {
      if (!fileObj && !deliveryUrl.trim()) {
        errs.fulfillment = 'Please attach a downloadable file or enter a delivery URL before publishing.'
      }
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Save / Publish product via real API
  async function handleSave(publish = true) {
    if (submittingLockRef.current) return

    const status = publish ? 'PUBLISHED' : 'DRAFT'
    if (!validateForm(status)) {
      const firstKey = Object.keys(validationErrors)[0]
      if (firstKey) {
        toast.error(validationErrors[firstKey] || 'Please complete required fields.')
      }
      return
    }

    submittingLockRef.current = true
    setSubmitting(true)
    try {
      const numPrice = Number(price)
      const safePrice = isNaN(numPrice) ? 0 : Math.max(0, numPrice)

      const payload = {
        title: title.trim(),
        description: description.trim(),
        shortDescription: description.trim(),
        price: safePrice,
        currency: currency.toLowerCase(),
        type: productType,
        thumbnail: thumbnail || null,
        displayMode,
        status,
        storePublished: true,
        redirectUrl: deliveryUrl.trim() || null,
        fileId: fileObj?.id || null,
        fileName: fileObj?.name || null,
        fileSize: fileObj?.size ? parseFloat(fileObj.size) * 1024 * 1024 : null,
        fileMime: fileObj?.mime || null,
        files: fileObj ? [fileObj] : [],
        bookingSchedule: productType === 'COACHING' ? { durationMinutes: Number(coachingDuration) || 30 } : undefined,
      }

      let savedRecord = null
      if (isEdit) {
        // Real authenticated PATCH /api/products/[id]
        const res = await api.patch(`/products/${initialProduct.id}`, payload)
        savedRecord = res.product || res
        toast.success(publish ? 'Product published!' : 'Draft saved!')
      } else {
        // Real authenticated POST /api/products with addToStore: true
        payload.addToStore = true
        if (activePageId) payload.pageId = activePageId
        const res = await api.post('/products', payload)
        savedRecord = res.product || res
        toast.success(publish ? 'Product created and published!' : 'Draft product created!')
      }

      setHasUnsavedChanges(false)
      onSuccess?.(savedRecord, isEdit)
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Failed to save product. Please try again.')
    } finally {
      submittingLockRef.current = false
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FFFFFF] text-[#222222] md:hidden overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Product' : 'Create Product'}
    >
      {/* 1. COMPACT MOBILE HEADER */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#E8E8E8] bg-[#FFFFFF] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (step > 1 && !isEdit) {
                setStep(step - 1)
              } else {
                handleAttemptClose()
              }
            }}
            className="w-11 h-11 -ml-2 rounded-full text-[#222222] hover:bg-[#F2F2F2] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#222222] truncate">
              {isEdit ? 'Edit Product' : 'New Product'}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAttemptClose}
          className="w-11 h-11 -mr-2 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 2. SCROLLABLE FORM BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-6 pb-28">

        {/* STEP 1: SELECT PRODUCT TYPE (CREATE MODE ONLY) */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#222222]">Select product type</h2>
              <p className="text-xs text-[#777777] mt-0.5">
                Choose the kind of product you want to offer to your audience.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {SUPPORTED_PRODUCT_TYPES.map((t) => {
                const Icon = t.icon
                const isSelected = productType === t.type
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setProductType(t.type)
                      markChanged()
                      setStep(2)
                    }}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all active:scale-[0.99] cursor-pointer ${
                      isSelected
                        ? 'border-[#222222] ring-1 ring-[#222222] bg-[#FFFFFF] shadow-2xs'
                        : 'border-[#E8E8E8] bg-[#FFFFFF] hover:bg-[#F2F2F2]'
                    }`}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: t.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#222222] truncate">
                        {t.title}
                      </p>
                      <p className="text-xs text-[#777777] mt-0.5 leading-relaxed">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2+: PRODUCT DETAILS & CONFIGURATION */}
        {step >= 2 && (
          <div className="space-y-5">

            {/* PRODUCT TYPE BADGE */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F9F9F8] border border-[#E5E5E3]">
              <span className="text-xs font-semibold text-[#71717A]">Type</span>
              <span className="text-xs font-bold text-[#1F1F1F] bg-[#FFFFFF] px-2.5 py-1 rounded-full border border-[#E5E5E3] shadow-2xs">
                {SUPPORTED_PRODUCT_TYPES.find((t) => t.type === productType)?.title || productType}
              </span>
            </div>

            {/* PRODUCT TITLE */}
            <div className="space-y-1.5">
              <label htmlFor="prod-title" className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1">
                <span>Title</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="prod-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  markChanged()
                  if (validationErrors.title) {
                    setValidationErrors((prev) => ({ ...prev, title: null }))
                  }
                }}
                placeholder="e.g. Creator Growth Guide 2026"
                className={`w-full h-12 px-4 rounded-xl bg-[#FFFFFF] border text-sm text-[#1F1F1F] placeholder:text-[#A1A1AA] transition-all outline-none focus:ring-2 focus:ring-[#1F1F1F]/20 ${
                  validationErrors.title ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E5E5E3]'
                }`}
              />
              {validationErrors.title && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{validationErrors.title}</span>
                </p>
              )}
            </div>

            {/* PRICE & CURRENCY */}
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div className="space-y-1.5">
                <label htmlFor="prod-curr" className="text-xs font-bold text-[#1F1F1F]">
                  Currency
                </label>
                <select
                  id="prod-curr"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value)
                    markChanged()
                  }}
                  className="w-full h-12 px-3 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-sm font-semibold text-[#1F1F1F] outline-none focus:ring-2 focus:ring-[#1F1F1F]/20"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-price" className="text-xs font-bold text-[#1F1F1F]">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#71717A]">
                    {CURRENCIES.find((c) => c.code === currency)?.symbol || '₹'}
                  </span>
                  <input
                    id="prod-price"
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value)
                      markChanged()
                    }}
                    placeholder="0 for free"
                    className="w-full h-12 pl-8 pr-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-sm font-bold text-[#1F1F1F] placeholder:text-[#A1A1AA] outline-none focus:ring-2 focus:ring-[#1F1F1F]/20"
                  />
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-1.5">
              <label htmlFor="prod-desc" className="text-xs font-bold text-[#1F1F1F]">
                Description
              </label>
              <textarea
                id="prod-desc"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  markChanged()
                }}
                placeholder="What will buyers get from this product?"
                className="w-full p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-sm text-[#1F1F1F] placeholder:text-[#A1A1AA] resize-none outline-none focus:ring-2 focus:ring-[#1F1F1F]/20"
              />
            </div>

            {/* THUMBNAIL UPLOAD */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1F1F1F]">
                Thumbnail image
              </label>

              {thumbnail ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#E5E5E3] bg-[#F9F9F8] aspect-video flex items-center justify-center">
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
                      title="Replace image"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnail('')
                        markChanged()
                      }}
                      className="p-1.5 rounded-full text-rose-300 hover:text-rose-100 hover:bg-white/20 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingThumb}
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[#E5E5E3] hover:border-[#1F1F1F] bg-[#F9F9F8] transition-colors cursor-pointer group"
                >
                  {uploadingThumb ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#FF4B1F]" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-[#71717A] group-hover:text-[#1F1F1F] transition-colors" />
                  )}
                  <span className="text-xs font-bold text-[#1F1F1F]">
                    {uploadingThumb ? 'Uploading image...' : 'Upload thumbnail (JPG, PNG)'}
                  </span>
                  <span className="text-[11px] text-[#71717A]">
                    Recommended: 1200x630 or 1:1 square
                  </span>
                </button>
              )}

              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </div>

            {/* FULFILLMENT: DIGITAL DOWNLOAD DELIVERABLE */}
            {productType === 'DIGITAL_DOWNLOAD' && (
              <div className="space-y-3 pt-2 border-t border-[#E5E5E3]">
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                    Fulfillment / Deliverable
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Attach the digital file buyers will receive after purchase.
                  </p>
                </div>

                {fileObj ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F9F9F8] border border-[#E5E5E3]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-[#22C55E]/10 text-[#16A34A] flex items-center justify-center shrink-0">
                        <FileDown className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F1F1F] truncate">
                          {fileObj.name || 'Deliverable File'}
                        </p>
                        {fileObj.size && (
                          <p className="text-[11px] text-[#71717A]">{fileObj.size}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFileObj(null)
                        markChanged()
                      }}
                      className="p-1.5 text-[#71717A] hover:text-[#DC2626] transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={uploadingDeliverable}
                      onClick={() => deliverableInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#F9F9F8] hover:bg-[#F2F1EF] border border-[#E5E5E3] text-xs font-bold text-[#1F1F1F] transition-colors cursor-pointer"
                    >
                      {uploadingDeliverable ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#FF4B1F]" />
                          <span>Uploading deliverable...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Upload deliverable file (PDF, ZIP, EPUB)</span>
                        </>
                      )}
                    </button>

                    <div className="relative flex items-center">
                      <div className="flex-grow border-t border-[#E5E5E3]" />
                      <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-[#A1A1AA]">or redirect URL</span>
                      <div className="flex-grow border-t border-[#E5E5E3]" />
                    </div>

                    <div className="relative">
                      <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
                      <input
                        type="url"
                        value={deliveryUrl}
                        onChange={(e) => {
                          setDeliveryUrl(e.target.value)
                          markChanged()
                        }}
                        placeholder="https://drive.google.com/..."
                        className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-xs text-[#1F1F1F] placeholder:text-[#A1A1AA] outline-none focus:ring-2 focus:ring-[#1F1F1F]/20"
                      />
                    </div>
                  </div>
                )}

                {validationErrors.fulfillment && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{validationErrors.fulfillment}</span>
                  </p>
                )}

                <input
                  ref={deliverableInputRef}
                  type="file"
                  onChange={handleDeliverableUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* FULFILLMENT: COACHING SESSION SETTINGS */}
            {productType === 'COACHING' && (
              <div className="space-y-3 pt-2 border-t border-[#E5E5E3]">
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                    Session Duration
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Select the length of each 1:1 consultation session.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setCoachingDuration(mins)
                        markChanged()
                      }}
                      className={`h-11 rounded-xl text-xs font-bold transition-all border ${
                        coachingDuration === mins
                          ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white shadow-xs'
                          : 'border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F9F9F8]'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* 3. STICKY BOTTOM ACTIONS */}
      <div
        className="border-t border-[#E8E8E8] bg-[#FFFFFF] p-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <div className="flex items-center gap-2.5 max-w-md mx-auto">
          {step > 1 && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave(false)}
              className="flex-1 h-12 min-h-[44px] rounded-full border border-[#E8E8E8] bg-[#FFFFFF] hover:bg-[#F2F2F2] active:scale-[0.98] text-xs sm:text-sm font-bold text-[#222222] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              Save draft
            </button>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(true)}
            className="flex-1 h-12 min-h-[44px] rounded-full bg-[#1F1F1F] hover:bg-[#2A2A2A] active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Publish product</span>
            )}
          </button>
        </div>
      </div>

      {/* DISCARD CONFIRMATION DIALOG */}
      {discardConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#1F1F1F]">Discard unsaved changes?</h3>
            <p className="text-xs text-[#71717A]">
              You have unsaved changes in this product. If you leave now, your changes will be lost.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDiscardConfirmOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#1F1F1F] hover:bg-[#F2F1EF]"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscardConfirmOpen(false)
                  onClose?.()
                }}
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
