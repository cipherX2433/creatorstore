'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  ChevronRight,
  Upload,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Download,
  AlertCircle,
  FileText,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import StoreItemDisplaySelector from '@/components/dashboard/editors/StoreItemDisplaySelector'
import ProductBundleModal from '@/components/dashboard/ProductBundleModal'

/**
 * Normalizes bundle data from various API/store representations into a consistent shape.
 */
function normalizeBundleData(raw) {
  if (!raw) return null
  const bundle = raw.bundle || raw.product || raw
  if (!bundle || typeof bundle !== 'object') return null

  let productIds = []
  if (Array.isArray(bundle.bundleProductIds) && bundle.bundleProductIds.length > 0) {
    productIds = bundle.bundleProductIds
  } else if (Array.isArray(bundle.bundleItems) && bundle.bundleItems.length > 0) {
    productIds = bundle.bundleItems.map((bi) => bi.productId || bi.product?.id || bi.id).filter(Boolean)
  } else if (Array.isArray(bundle.bundleProducts) && bundle.bundleProducts.length > 0) {
    productIds = bundle.bundleProducts.map((p) => p.id || p.productId).filter(Boolean)
  } else if (Array.isArray(bundle.productIds) && bundle.productIds.length > 0) {
    productIds = bundle.productIds
  }

  const bundleProducts =
    bundle.bundleProducts ||
    bundle.bundleItems?.map((bi) => bi.product).filter(Boolean) ||
    []

  return {
    ...bundle,
    id: bundle.id,
    title: bundle.title || 'Product Bundle',
    description: bundle.description !== undefined ? bundle.description : (bundle.shortDescription || ''),
    thumbnail: bundle.thumbnail || bundle.coverImage || '',
    displayMode: bundle.displayMode || bundle.layout || 'classic',
    productIds: [...new Set(productIds)],
    bundleProductIds: [...new Set(productIds)],
    bundleProducts,
    productCount: productIds.length || bundleProducts.length || bundle.productCount || 0,
    price: Number(bundle.price || 0),
    currency: bundle.currency || 'USD',
  }
}

export default function BundleEditor({
  product = null,
  section = null,
  creatorProfile = null,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}
  const bundle = product || initialProps
  const targetBundleId = bundle?.id || initialProps?.productId

  // 1. Initial normalized data from props
  const initialNormalized = useMemo(() => normalizeBundleData(bundle || initialProps), [bundle, initialProps])

  // Persisted baseline data to track unsaved changes
  const [persistedData, setPersistedData] = useState(() => ({
    title: initialNormalized?.title || initialProps?.title || 'Product Bundle',
    description: initialNormalized?.description || initialProps?.description || '',
    thumbnail: initialNormalized?.thumbnail || initialProps?.thumbnail || '',
    displayMode: initialNormalized?.displayMode || initialProps?.layout || 'classic',
    productIds: initialNormalized?.productIds || [],
  }))

  // 2. Working editable state
  const [title, setTitle] = useState(persistedData.title)
  const [description, setDescription] = useState(persistedData.description)
  const [thumbnail, setThumbnail] = useState(persistedData.thumbnail)
  const [displayMode, setDisplayMode] = useState(persistedData.displayMode)
  const [selectedProductIds, setSelectedProductIds] = useState(persistedData.productIds)

  // 3. Status & modal states
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBundle, setCurrentBundle] = useState(initialNormalized)
  const [isLoadingBundle, setIsLoadingBundle] = useState(false)

  const fileInputRef = useRef(null)

  // Keep a stable ref to onUpdateProps so callers never trigger unnecessary effect runs
  const onUpdatePropsRef = useRef(onUpdateProps)
  useEffect(() => {
    onUpdatePropsRef.current = onUpdateProps
  }, [onUpdateProps])

  const notifyPreview = useCallback((patch) => {
    onUpdatePropsRef.current?.(patch)
  }, [])

  // Authoritative fetch from backend to ensure canonical product associations and prices
  const fetchedBundleIdRef = useRef(null)
  useEffect(() => {
    if (!targetBundleId) return
    if (fetchedBundleIdRef.current === targetBundleId) return
    fetchedBundleIdRef.current = targetBundleId

    let isMounted = true
    setIsLoadingBundle(true)

    api.get(`/bundles/${targetBundleId}`)
      .then((res) => {
        if (!isMounted) return
        const canonical = normalizeBundleData(res)
        if (canonical) {
          setCurrentBundle(canonical)
          const newBase = {
            title: canonical.title,
            description: canonical.description,
            thumbnail: canonical.thumbnail,
            displayMode: canonical.displayMode,
            productIds: canonical.productIds,
          }
          setPersistedData(newBase)
          setTitle(newBase.title)
          setDescription(newBase.description)
          setThumbnail(newBase.thumbnail)
          setDisplayMode(newBase.displayMode)
          setSelectedProductIds(newBase.productIds)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch canonical bundle, using props:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingBundle(false)
      })

    return () => {
      isMounted = false
    }
  }, [targetBundleId])

  // Synchronize working state when bundle prop identity changes externally
  const prevBundleIdRef = useRef(targetBundleId)
  useEffect(() => {
    if (targetBundleId && targetBundleId !== prevBundleIdRef.current) {
      prevBundleIdRef.current = targetBundleId
      const normalized = normalizeBundleData(bundle)
      if (normalized) {
        const newBase = {
          title: normalized.title,
          description: normalized.description,
          thumbnail: normalized.thumbnail,
          displayMode: normalized.displayMode,
          productIds: normalized.productIds,
        }
        setPersistedData(newBase)
        setTitle(newBase.title)
        setDescription(newBase.description)
        setThumbnail(newBase.thumbnail)
        setDisplayMode(newBase.displayMode)
        setSelectedProductIds(newBase.productIds)
        setCurrentBundle(normalized)
      }
    }
  }, [targetBundleId, bundle])

  // 4. Form validation: Title is required and bundle MUST contain at least 1 product
  const isValid = useMemo(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || trimmedTitle.length > 255) return false
    if ((description || '').length > 500) return false
    if (!selectedProductIds || selectedProductIds.length === 0) return false
    if (selectedProductIds.length > 10) return false
    return true
  }, [title, description, selectedProductIds])

  // 5. Track unsaved changes against persisted baseline
  const isDirty = useMemo(() => {
    if (title.trim() !== (persistedData.title || '').trim()) return true
    if ((description || '').trim() !== (persistedData.description || '').trim()) return true
    if ((thumbnail || '') !== (persistedData.thumbnail || '')) return true
    if (displayMode !== persistedData.displayMode) return true

    // Check product IDs difference
    const currentIds = selectedProductIds || []
    const baselineIds = persistedData.productIds || []
    if (currentIds.length !== baselineIds.length) return true
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== baselineIds[i]) return true
    }
    return false
  }, [title, description, thumbnail, displayMode, selectedProductIds, persistedData])

  // 6. Save state is cleanly derived from isSaving and isDirty — no redundant state sync loops
  const saveState = isSaving ? 'saving' : isDirty ? 'dirty' : 'saved'

  // 7. Unsaved changes beforeunload protection
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 8. Navigation confirmation when leaving with unsaved changes
  const handleBack = useCallback(() => {
    if (isDirty) {
      const ok =
        typeof window !== 'undefined'
          ? window.confirm('You have unsaved changes. Discard changes and leave?')
          : true
      if (!ok) return

      // Revert parent's live preview to last persisted baseline
      notifyPreview({
        title: persistedData.title,
        description: persistedData.description,
        thumbnail: persistedData.thumbnail || null,
        layout: persistedData.displayMode,
        displayMode: persistedData.displayMode,
      })
    }
    onBack?.()
  }, [isDirty, persistedData, notifyPreview, onBack])

  // 9. Handle field changes with immediate live preview updates
  const handleTitleChange = (e) => {
    const val = e.target.value
    if (val.length > 255) return
    setTitle(val)
    notifyPreview({ title: val })
  }

  const handleDescriptionChange = (e) => {
    const val = e.target.value
    if (val.length > 500) return
    setDescription(val)
    notifyPreview({ description: val })
  }

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode)
    notifyPreview({ layout: mode, displayMode: mode })
  }

  // 10. Handle thumbnail upload from device (Strictly NO AI generation)
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        notifyPreview({ thumbnail: res.url })
        toast.success('Thumbnail selected. Click Save Changes to persist.')
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image')
      toast.error('Failed to upload thumbnail')
    } finally {
      setUploadingThumb(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnail('')
    notifyPreview({ thumbnail: null })
    toast.info('Thumbnail removed. Click Save Changes to persist.')
  }

  // 11. PERSIST ALL CHANGES TO DATABASE (Save Changes Button)
  const handleSave = async () => {
    if (isSaving) return
    if (!isDirty) {
      toast.info('No changes to save.')
      return
    }
    if (!isValid) {
      if (!selectedProductIds || selectedProductIds.length === 0) {
        toast.error('At least 1 product must be selected for the bundle')
      } else {
        toast.error('Please ensure all required fields are valid before saving.')
      }
      return
    }

    const bundleId = currentBundle?.id || targetBundleId
    if (!bundleId) {
      toast.error('Bundle ID not found.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        thumbnail: thumbnail || null,
        displayMode,
        productIds: selectedProductIds,
      }

      const res = await api.patch(`/bundles/${bundleId}`, payload)
      const updated = normalizeBundleData(res)
      if (!updated) {
        throw new Error('Failed to update bundle: invalid response from server')
      }

      // Update persisted baseline ONLY after server confirmation
      const newBase = {
        title: updated.title,
        description: updated.description,
        thumbnail: updated.thumbnail,
        displayMode: updated.displayMode,
        productIds: updated.productIds,
      }
      setPersistedData(newBase)
      setCurrentBundle(updated)

      toast.success('Bundle changes saved successfully!')

      // Sync parent store/preview with authoritative database results
      notifyPreview({
        title: newBase.title,
        description: newBase.description,
        thumbnail: newBase.thumbnail,
        layout: newBase.displayMode,
        displayMode: newBase.displayMode,
        price: updated.price,
        currency: updated.currency,
        bundleProducts: updated.bundleProducts,
        bundleProductIds: updated.productIds,
        productIds: updated.productIds,
        productCount: updated.productCount,
      })
    } catch (err) {
      console.error('Failed to save bundle:', err)
      toast.error(err.message || 'Failed to save bundle changes. Your edits have been preserved.')
    } finally {
      setIsSaving(false)
    }
  }

  // Count items strictly from the current selected products state
  const itemsCount = selectedProductIds.length
  const bundlePrice = Number(currentBundle?.price || 0)
  const bundleCurrency = currentBundle?.currency || 'USD'
  const formattedPrice = bundlePrice === 0 ? 'Free' : formatMoney(bundlePrice, bundleCurrency)

  // Natural header element for Details
  const headerItemTypeLabel = (
    <span className="inline-flex items-center gap-2">
      <span className="text-[13px] sm:text-sm font-medium text-[#6F6F6B]">Bundle</span>
      <span className="text-xs text-[#C4C4C0]">/</span>
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5F5F3] text-[#1F1F1F] text-xs font-semibold border border-[#E5E5E3]">
        <FileText className="h-3 w-3 text-[#6F6F6B]" />
        <span>Details</span>
      </span>
    </span>
  )

  // Save Changes button in header
  const headerSaveActions = (
    <div className="flex items-center gap-2">
      {/* Save Changes Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !isDirty || !isValid}
        className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer ${
          isDirty && isValid && !isSaving
            ? 'bg-[#1F1F1F] hover:bg-black text-white hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-[#F5F5F3] text-[#8E8E89] border border-[#E5E5E3] opacity-60 cursor-not-allowed'
        }`}
        title={!isDirty ? 'No unsaved changes' : !isValid ? 'Please fix validation errors' : 'Save all changes to database'}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            <span>Saving...</span>
          </>
        ) : (
          <span>Save Changes</span>
        )}
      </button>
    </div>
  )

  return (
    <StoreItemEditorShell
      itemTypeLabel={headerItemTypeLabel}
      title={title || 'Product Bundle'}
      onBack={handleBack}
      tabs={[]} // Tab navigation removed completely; Details repositioned naturally in header
      saveState={saveState}
      isHidden={section?.props?.hidden || false}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenMobilePreview={onOpenMobilePreview}
      customHeaderActions={headerSaveActions}
    >
      <div className="p-6 sm:p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-220px)]">
        {/* ========================================================================= */}
        {/* SECTION 1: INFO (Matching Linktree Reference Screenshot 5)               */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Info</h2>

          {/* TITLE INPUT WITH CHARACTER COUNTER */}
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Product Bundle Title"
                maxLength={255}
                className="w-full px-4 py-3 rounded-[14px] border border-[#E5E5E3] bg-[#FCFCFA] text-[#1F1F1F] font-semibold text-sm sm:text-base placeholder:text-[#9E9E99] focus:outline-none focus:border-[#1F1F1F] focus:bg-white transition-all pr-10"
              />
              <Pencil className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E99] pointer-events-none" />
            </div>
            <div className="flex justify-between items-center px-0.5">
              {!title.trim() ? (
                <span className="text-[11px] font-medium text-red-500">Title is required</span>
              ) : <span />}
              <span className="text-[11px] font-medium text-[#8E8E89]">
                {title.length}/255
              </span>
            </div>
          </div>

          {/* BUNDLE SUMMARY CARD (Screenshot 5: Click to open selection wizard modal) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setIsModalOpen(true)
              }
            }}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-[16px] border border-[#E5E5E3] bg-white hover:border-[#1F1F1F] hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-14 w-14 rounded-[12px] bg-[#F5F5F3] border border-[#E5E5E3] overflow-hidden shrink-0 flex items-center justify-center">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Layers className="h-6 w-6 text-[#1F1F1F]/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-[15px] font-bold text-[#1F1F1F] truncate group-hover:text-black">
                  {title || 'Untitled Bundle'}
                </p>
                <p className="text-xs text-[#6F6F6B] mt-0.5 truncate">
                  {formattedPrice} · {itemsCount} {itemsCount === 1 ? 'product' : 'products'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[#9E9E99] group-hover:text-[#1F1F1F] transition-colors ml-3">
              <span className="hidden sm:inline text-xs font-semibold text-[#6F6F6B]">Edit products</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>

          {/* Validation Warning when no products are selected */}
          {selectedProductIds.length === 0 && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626] mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">No products selected</p>
                <p className="text-[#7F1D1D]">
                  At least 1 product must be selected for the bundle. Click &ldquo;Edit products&rdquo; above to select products.
                </p>
              </div>
            </div>
          )}

          {/* DESCRIPTION TEXTAREA WITH CHARACTER COUNTER */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block">
              Description
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Give your bundle a compelling description..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-[14px] border border-[#E5E5E3] bg-[#FCFCFA] text-[#1F1F1F] text-xs sm:text-sm placeholder:text-[#9E9E99] focus:outline-none focus:border-[#1F1F1F] focus:bg-white transition-all resize-y"
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[11px] font-medium text-[#8E8E89]">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* THUMBNAIL UPLOAD (STRICTLY NO AI GENERATION) */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block">
              Thumbnail
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleThumbnailUpload}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
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
                    disabled={uploadingThumb || isSaving}
                    className="h-8 w-8 rounded-full bg-white border border-[#E5E5E3] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] transition-colors cursor-pointer"
                    title="Replace thumbnail"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    disabled={uploadingThumb || isSaving}
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
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: DISPLAY SETTINGS (Screenshot 5)                                */}
        {/* ========================================================================= */}
        <div className="pt-2">
          <StoreItemDisplaySelector
            value={displayMode}
            onChange={handleDisplayModeChange}
            thumbnail={thumbnail}
            itemType="product"
            title="Display"
            subtitle="How you display your content"
          />
        </div>
      </div>

      {/* RE-OPEN WIZARD MODAL FOR FULL EDITING (Product selection, order, details) */}
      <ProductBundleModal
        isOpen={isModalOpen}
        existingBundle={{
          ...currentBundle,
          id: targetBundleId,
          title,
          description,
          thumbnail,
          displayMode,
          bundleProductIds: selectedProductIds,
          productIds: selectedProductIds,
        }}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(updated) => {
          setIsModalOpen(false)
          if (updated) {
            const canonical = normalizeBundleData(updated)
            if (canonical) {
              setCurrentBundle(canonical)
              if (canonical.title) setTitle(canonical.title)
              if (canonical.description !== undefined) setDescription(canonical.description)
              if (canonical.thumbnail !== undefined) setThumbnail(canonical.thumbnail || '')
              if (canonical.displayMode) setDisplayMode(canonical.displayMode)
              setSelectedProductIds(canonical.productIds)

              // When modal completes an edit, update the baseline
              const newBase = {
                title: canonical.title || title,
                description: canonical.description !== undefined ? canonical.description : description,
                thumbnail: canonical.thumbnail !== undefined ? (canonical.thumbnail || '') : thumbnail,
                displayMode: canonical.displayMode || displayMode,
                productIds: canonical.productIds,
              }
              setPersistedData(newBase)

              notifyPreview({
                title: newBase.title,
                description: newBase.description,
                thumbnail: newBase.thumbnail,
                layout: newBase.displayMode,
                displayMode: newBase.displayMode,
                price: canonical.price,
                currency: canonical.currency,
                bundleProducts: canonical.bundleProducts,
                bundleProductIds: canonical.productIds,
                productIds: canonical.productIds,
                productCount: canonical.productCount,
              })
            }
          }
        }}
      />
    </StoreItemEditorShell>
  )
}
