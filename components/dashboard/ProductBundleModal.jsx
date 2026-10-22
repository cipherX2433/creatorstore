'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Package,
  Layers,
  GraduationCap,
  AlertCircle,
  Check,
  Upload,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react'
import { api, formatMoney } from '@/lib/clientApi'
import { toast } from 'sonner'

/**
 * Product Bundle Creation & Editing Wizard Modal
 * Inspired by Linktree reference screenshots, strictly adhering to CreatorStore architecture and styling.
 * 
 * Rules:
 * - Up to 10 products max per bundle.
 * - Maximum of 1 booking per bundle.
 * - All products in bundle must share the same currency.
 * - Absolutely NO AI image generation. Upload from device only.
 */
export default function ProductBundleModal({
  isOpen = false,
  onClose,
  onSuccess,
  existingBundle = null,
  initialProducts = [],
}) {
  // Navigation: Step 1 = 'select_products', Step 2 = 'details'
  const [step, setStep] = useState(1)

  // Products from creator's catalog
  const [products, setProducts] = useState(initialProducts)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  // Step 1: Filters & Selection
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'digital' | 'booking'
  const [selectedProductIds, setSelectedProductIds] = useState(
    () => existingBundle?.bundleProductIds || existingBundle?.productIds || existingBundle?.bundleProducts?.map(p => p.id) || []
  )
  const [warningMessage, setWarningMessage] = useState(null)

  // Step 2: Bundle Details
  const [title, setTitle] = useState(existingBundle?.title || '')
  const [description, setDescription] = useState(
    existingBundle?.description || existingBundle?.shortDescription || ''
  )
  const [thumbnail, setThumbnail] = useState(existingBundle?.thumbnail || '')
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  // Reset or initialize when modal opens or existingBundle changes
  useEffect(() => {
    if (isOpen) {
      if (existingBundle) {
        setTitle(existingBundle.title || '')
        setDescription(existingBundle.description || existingBundle.shortDescription || '')
        setThumbnail(existingBundle.thumbnail || '')
        setSelectedProductIds(
          existingBundle.bundleProductIds || existingBundle.productIds || existingBundle.bundleProducts?.map(p => p.id) || []
        )
        setStep(1)
      } else {
        setTitle('')
        setDescription('')
        setThumbnail('')
        setSelectedProductIds([])
        setStep(1)
      }
      setWarningMessage(null)
      setUploadError(null)
    }
  }, [isOpen, existingBundle])

  // Load creator products if not provided
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function loadCatalog() {
      try {
        setLoadingProducts(true)
        setFetchError(null)
        const res = await api.get('/products')
        const items = Array.isArray(res?.products) ? res.products : (Array.isArray(res) ? res : [])
        // Exclude bundles themselves (cannot nest bundles) and archived products
        const eligible = items.filter(
          (p) => p.type !== 'BUNDLE' && p.status !== 'ARCHIVED' && p.id !== existingBundle?.id
        )
        if (isMounted) {
          setProducts(eligible)
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || 'Failed to load products')
        }
      } finally {
        if (isMounted) setLoadingProducts(false)
      }
    }

    loadCatalog()
    return () => { isMounted = false }
  }, [isOpen, existingBundle?.id])

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  // Resolve selected product objects
  const selectedProducts = useMemo(() => {
    return selectedProductIds
      .map((id) => products.find((p) => p.id === id) || existingBundle?.bundleProducts?.find(p => p.id === id))
      .filter(Boolean)
  }, [selectedProductIds, products, existingBundle])

  // Calculate total value & validate currency consistency
  const { totalValue, primaryCurrency, currencyMismatch } = useMemo(() => {
    if (selectedProducts.length === 0) {
      return { totalValue: 0, primaryCurrency: 'USD', currencyMismatch: false }
    }
    const curr = (selectedProducts[0]?.currency || 'USD').toUpperCase()
    let mismatch = false
    let sum = 0

    for (const p of selectedProducts) {
      const pCurr = (p.currency || 'USD').toUpperCase()
      if (pCurr !== curr) mismatch = true
      sum += Number(p.price || 0)
    }

    return { totalValue: sum, primaryCurrency: curr, currencyMismatch: mismatch }
  }, [selectedProducts])

  // Category filtering
  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return products
    if (categoryFilter === 'booking') {
      return products.filter((p) => p.type === 'COACHING')
    }
    if (categoryFilter === 'digital') {
      return products.filter(
        (p) => p.type !== 'COACHING' && p.type !== 'COURSE' && p.type !== 'BUNDLE'
      )
    }
    return products
  }, [products, categoryFilter])

  // Handle toggling product selection
  const handleToggleProduct = (product) => {
    const isAlreadySelected = selectedProductIds.includes(product.id)

    if (isAlreadySelected) {
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id))
      setWarningMessage(null)
      return
    }

    // Rule 1: Max 10 products
    if (selectedProductIds.length >= 10) {
      setWarningMessage('You can select up to 10 products per bundle.')
      return
    }

    // Rule 2: Max 1 booking
    if (product.type === 'COACHING') {
      const alreadyHasBooking = selectedProducts.some((p) => p.type === 'COACHING')
      if (alreadyHasBooking) {
        setWarningMessage('1 booking per bundle. Remove your booking to add another.')
        return
      }
    }

    // Rule 3: Currency match
    if (selectedProducts.length > 0) {
      const existingCurr = (selectedProducts[0]?.currency || 'USD').toUpperCase()
      const newCurr = (product.currency || 'USD').toUpperCase()
      if (existingCurr !== newCurr) {
        setWarningMessage(`Cannot mix currencies. All products in a bundle must use ${existingCurr}.`)
        return
      }
    }

    setWarningMessage(null)
    setSelectedProductIds((prev) => [...prev, product.id])
  }

  // Handle image upload from device (strictly NO AI generation)
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validations
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size must be less than 10MB.')
      return
    }

    setUploadingThumb(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.upload('/upload', formData)
      if (res?.url) {
        setThumbnail(res.url)
        toast.success('Thumbnail uploaded successfully')
      } else {
        throw new Error('Upload did not return an image URL')
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image')
      toast.error('Failed to upload thumbnail')
    } finally {
      setUploadingThumb(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handle final bundle submission
  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Please enter a bundle title')
      return
    }
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product')
      setStep(1)
      return
    }
    if (selectedProductIds.length > 10) {
      toast.error('You can select up to 10 products per bundle')
      setStep(1)
      return
    }
    if (currencyMismatch) {
      toast.error('All products in a bundle must use the same currency')
      setStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim(),
        thumbnail: thumbnail || null,
        productIds: selectedProductIds,
        displayMode: existingBundle?.displayMode || 'classic',
        storePublished: true,
        addToStore: true,
      }

      let result = null
      if (existingBundle?.id) {
        result = await api.patch(`/bundles/${existingBundle.id}`, payload)
        toast.success(`Bundle updated! 🎉 ${trimmedTitle}`)
      } else {
        result = await api.post('/bundles', payload)
        toast.success(`Bundle created! 🎉 ${trimmedTitle}`)
      }

      onSuccess?.(result?.bundle || result?.product || result)
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Failed to save product bundle')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bundle-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#E5E5E3] flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in fade-in-0 zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#F0F0EE] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-8 w-8 rounded-full bg-[#F5F5F3] hover:bg-[#EAEAEA] flex items-center justify-center text-[#1F1F1F] transition-colors cursor-pointer mr-1"
                aria-label="Back to select products"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h3 id="bundle-modal-title" className="text-lg sm:text-xl font-bold text-[#1F1F1F]">
              Product Bundle
            </h3>
          </div>

          {/* CLOSE BUTTON */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 w-8 rounded-full bg-[#F5F5F3] hover:bg-[#EAEAEA] flex items-center justify-center text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-center gap-2 border-b border-[#F0F0EE] bg-[#FCFCFA] shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              step === 1
                ? 'bg-[#1F1F1F] text-white shadow-xs'
                : 'bg-transparent text-[#6F6F6B] hover:text-[#1F1F1F]'
            }`}
          >
            Select products
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-[#C4C4C0]" />
          <button
            type="button"
            onClick={() => {
              if (selectedProductIds.length > 0 && !currencyMismatch) {
                setStep(2)
              }
            }}
            disabled={selectedProductIds.length === 0 || currencyMismatch}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              step === 2
                ? 'bg-[#1F1F1F] text-white shadow-xs'
                : selectedProductIds.length > 0 && !currencyMismatch
                ? 'bg-transparent text-[#6F6F6B] hover:text-[#1F1F1F] cursor-pointer'
                : 'bg-transparent text-[#BCBCB8] cursor-not-allowed'
            }`}
          >
            Product details
          </button>
        </div>

        {/* STEP 1: SELECT PRODUCTS */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div>
              <h4 className="text-lg font-bold text-[#1F1F1F]">Select products</h4>
            </div>

            {/* CATEGORY FILTERS */}
            <div className="flex items-center justify-start sm:justify-center">
              <div className="inline-flex p-1 rounded-full bg-[#F5F5F3] border border-[#E5E5E3] w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-white shadow-xs text-[#1F1F1F]'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  All products
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('digital')}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'digital'
                      ? 'bg-white shadow-xs text-[#1F1F1F]'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  Digital downloads
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('booking')}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'booking'
                      ? 'bg-white shadow-xs text-[#1F1F1F]'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  Bookings
                </button>
              </div>
            </div>

            <div className="text-xs text-[#8E8E89] font-medium">10 products max</div>

            {/* WARNING / ALERT BANNER */}
            {warningMessage && (
              <div className="p-3.5 rounded-[16px] border border-amber-300 bg-amber-50 text-amber-900 flex items-start justify-between gap-3 animate-in fade-in-0 duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold leading-tight">{warningMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWarningMessage(null)}
                  className="text-amber-700 hover:text-amber-950 p-0.5 rounded cursor-pointer"
                  aria-label="Dismiss warning"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* CURRENCY MISMATCH ALERT */}
            {currencyMismatch && (
              <div className="p-3.5 rounded-[16px] border border-red-300 bg-red-50 text-red-900 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">
                  Selected products use different currencies. Please choose products with the same currency.
                </p>
              </div>
            )}

            {/* PRODUCT LIST */}
            <div className="space-y-2.5">
              {loadingProducts ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#8E8E89] gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1F1F1F]" />
                  <p className="text-xs font-medium">Loading your products...</p>
                </div>
              ) : fetchError ? (
                <div className="py-8 text-center text-xs text-red-600 bg-red-50 rounded-xl p-4">
                  {fetchError}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-[#8E8E89] space-y-2">
                  <Package className="h-8 w-8 mx-auto opacity-40 text-[#1F1F1F]" />
                  <p className="text-sm font-semibold text-[#1F1F1F]">No products found</p>
                  <p className="text-xs">
                    {categoryFilter === 'all'
                      ? 'You have not created any eligible products yet.'
                      : `No products matching the "${categoryFilter === 'booking' ? 'Bookings' : 'Digital downloads'}" filter.`}
                  </p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id)
                  const isBooking = p.type === 'COACHING'
                  const displayTypeLabel = isBooking
                    ? 'Booking'
                    : p.type === 'COURSE'
                    ? 'Course'
                    : 'Digital Download'

                  return (
                    <div
                      key={p.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleToggleProduct(p)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          handleToggleProduct(p)
                        }
                      }}
                      className={`p-3.5 rounded-[16px] border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isSelected
                          ? 'border-[#1F1F1F] bg-white shadow-xs ring-1 ring-[#1F1F1F]'
                          : 'border-[#E5E5E3] bg-white hover:border-[#CCCCCC] hover:bg-[#FAF9F7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* CHECKBOX */}
                        <div
                          className={`h-5 w-5 rounded-[6px] flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-[#1F1F1F] border-[#1F1F1F] text-white'
                              : 'bg-white border-[#D9D9D7]'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </div>

                        {/* PRODUCT TYPE ICON / THUMBNAIL */}
                        {p.thumbnail ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-[#E5E5E3] bg-black/5">
                            <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                              isBooking
                                ? 'bg-[#881337] text-white'
                                : p.type === 'COURSE'
                                ? 'bg-[#312E81] text-white'
                                : 'bg-[#881337] text-white'
                            }`}
                          >
                            {isBooking ? (
                              <Calendar className="h-4 w-4" />
                            ) : p.type === 'COURSE' ? (
                              <GraduationCap className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </div>
                        )}

                        {/* TITLE & TYPE SUBTITLE */}
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                            {p.title}
                          </h5>
                          <p className="text-xs text-[#6F6F6B] truncate mt-0.5">
                            {displayTypeLabel}
                          </p>
                        </div>
                      </div>

                      {/* CONFIGURED PRICE */}
                      <div className="text-sm font-semibold text-[#1F1F1F] shrink-0">
                        {Number(p.price) === 0 ? '$0.00' : formatMoney(p.price, p.currency)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 1 FIXED BOTTOM ACTION BAR */}
        {step === 1 && (
          <div className="p-4 sm:p-5 border-t border-[#E5E5E3] bg-white flex items-center justify-between gap-4 shrink-0">
            {/* SELECTED SUMMARY (Stack of icons + count + total value) */}
            <div className="flex items-center gap-3 min-w-0">
              {selectedProducts.length > 0 && (
                <div className="flex items-center -space-x-2 shrink-0">
                  {selectedProducts.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="h-8 w-8 rounded-full border-2 border-white overflow-hidden bg-[#881337] text-white flex items-center justify-center text-[10px] font-bold shadow-xs"
                      title={p.title}
                    >
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : p.type === 'COACHING' ? (
                        <Calendar className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ))}
                  {selectedProducts.length > 3 && (
                    <div className="h-8 w-8 rounded-full border-2 border-white bg-[#1F1F1F] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      +{selectedProducts.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#1F1F1F] truncate">
                  {selectedProductIds.length === 0
                    ? 'No products selected'
                    : `${selectedProductIds.length} selected`}
                </p>
                {selectedProductIds.length > 0 && (
                  <p className="text-[11px] sm:text-xs text-[#6F6F6B] truncate">
                    {formatMoney(totalValue, primaryCurrency)} total value
                  </p>
                )}
              </div>
            </div>

            {/* CONTINUE BUTTON */}
            <button
              type="button"
              id="bundle-modal-continue-btn"
              onClick={() => {
                if (selectedProductIds.length > 0 && !currencyMismatch) {
                  setStep(2)
                }
              }}
              disabled={selectedProductIds.length === 0 || currencyMismatch}
              className="px-6 sm:px-7 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: PRODUCT DETAILS */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* 1. TITLE INPUT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bundle-title-input"
                  className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[#8E8E89]">
                  {title.length}/100
                </span>
              </div>
              <input
                id="bundle-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="e.g. Complete Dark Theme UI Redesign Bundle"
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#E5E5E3] bg-[#FCFCFA] text-sm text-[#1F1F1F] placeholder:text-[#8E8E89] focus:outline-none focus:border-[#1F1F1F] focus:bg-white transition-all"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* 2. DESCRIPTION TEXTAREA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bundle-description-input"
                  className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider"
                >
                  Description
                </label>
                <span className="text-[11px] text-[#8E8E89]">
                  {description.length}/250
                </span>
              </div>
              <textarea
                id="bundle-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 250))}
                rows={3}
                placeholder="Get complete dark theme UI guidelines alongside a one-on-one consultation to tailor the design system directly to your product."
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#E5E5E3] bg-[#FCFCFA] text-sm text-[#1F1F1F] placeholder:text-[#8E8E89] focus:outline-none focus:border-[#1F1F1F] focus:bg-white transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* 3. THUMBNAIL UPLOAD (STRICTLY NO AI GENERATION) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block">
                Thumbnail
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              {uploadError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{uploadError}</p>
              )}

              {thumbnail ? (
                <div className="flex items-center gap-3 p-3 rounded-[16px] border border-[#E5E5E3] bg-[#FCFCFA]">
                  <div className="h-16 w-16 rounded-[12px] overflow-hidden border border-[#E5E5E3] bg-black/5 shrink-0 relative">
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                    {uploadingThumb && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1F1F1F] truncate">Bundle Thumbnail</p>
                    <p className="text-[11px] text-[#8E8E89]">Uploaded image</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingThumb || isSubmitting}
                      className="h-8 w-8 rounded-full bg-white border border-[#E5E5E3] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] transition-colors cursor-pointer"
                      title="Replace thumbnail"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnail('')}
                      disabled={uploadingThumb || isSubmitting}
                      className="h-8 w-8 rounded-full bg-white border border-[#E5E5E3] hover:bg-red-50 hover:border-red-200 flex items-center justify-center text-red-600 transition-colors cursor-pointer"
                      title="Remove thumbnail"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  className="p-5 rounded-[16px] border-2 border-dashed border-[#D9D9D7] hover:border-[#1F1F1F] bg-[#FCFCFA] hover:bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                >
                  {uploadingThumb ? (
                    <div className="flex flex-col items-center gap-1.5 py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#1F1F1F]" />
                      <span className="text-xs font-medium text-[#6F6F6B]">Uploading image...</span>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F]">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1F1F1F]">Upload thumbnail image</p>
                        <p className="text-[11px] text-[#8E8E89] mt-0.5">JPG, PNG, or WebP up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* BUNDLE SUMMARY PREVIEW CARD */}
            <div className="p-3.5 rounded-[16px] bg-[#F5F5F3] border border-[#E5E5E3] space-y-1">
              <p className="text-[11px] font-bold text-[#6F6F6B] uppercase tracking-wider">
                Bundle summary
              </p>
              <div className="flex items-center justify-between text-xs text-[#1F1F1F] font-semibold">
                <span>{selectedProductIds.length} products included</span>
                <span className="font-bold">{formatMoney(totalValue, primaryCurrency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 FIXED BOTTOM ACTION BAR */}
        {step === 2 && (
          <div className="p-4 sm:p-5 border-t border-[#E5E5E3] bg-white flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-xs sm:text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer"
            >
              Back
            </button>

            <button
              type="button"
              id="bundle-modal-create-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="px-7 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{existingBundle ? 'Saving...' : 'Creating bundle...'}</span>
                </>
              ) : (
                <span>{existingBundle ? 'Save bundle' : 'Create bundle'}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
