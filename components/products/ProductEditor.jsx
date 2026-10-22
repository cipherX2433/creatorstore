'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import StorePreview from '@/components/storefront/StorePreview'
import {
  ArrowLeft, Eye, EyeOff, Share2, MoreVertical, Check, Loader2,
  Upload, Trash2, Link2, FileText, Sparkles, Plus, Copy,
  ExternalLink, CheckCircle2, AlertCircle, Package, GraduationCap,
  Video, Users, Radio, Briefcase, BookOpen, Layers, Smartphone, RefreshCw, X,
  Image as ImageIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trackProductUpdated, trackProductPublished } from '@/lib/analytics'

function normalizeProductType(type) {
  const t = String(type || '').toUpperCase().trim()
  if (t === 'COURSE' || t.includes('COURSE')) return 'COURSE'
  if (t === 'COACHING' || t === 'BOOKING' || t.includes('COACH') || t.includes('BOOK')) return 'COACHING'
  if (t === 'MEMBERSHIP' || t === 'COMMUNITY' || t.includes('MEMBER') || t.includes('COMMUN')) return 'MEMBERSHIP'
  if (t === 'EBOOK' || t === 'PDF') return 'EBOOK'
  if (t === 'WEBINAR' || t.includes('WEBINAR')) return 'WEBINAR'
  if (t === 'CUSTOM_SERVICE' || t === 'CUSTOM_PRODUCT' || t === 'SERVICE') return 'CUSTOM_SERVICE'
  if (t === 'EXTERNAL_LINK' || t.includes('LINK')) return 'EXTERNAL_LINK'
  return 'DIGITAL'
}

function getProductTypeLabel(rawType) {
  const type = normalizeProductType(rawType)
  switch (type) {
    case 'COURSE': return 'Course'
    case 'COACHING': return 'Coaching & Booking'
    case 'MEMBERSHIP': return 'Membership'
    case 'EBOOK': return 'E-Book / Guide'
    case 'WEBINAR': return 'Webinar'
    case 'CUSTOM_SERVICE': return 'Custom Service'
    case 'EXTERNAL_LINK': return 'External Link'
    default: return 'Digital product'
  }
}

export default function ProductEditor({
  productId,
  initialProduct = null,
  onBack,
  onProductUpdated,
  isStoreContext = false,
}) {
  const router = useRouter()
  const { me } = useDashboard()
  const storeSlug = me?.store?.slug || me?.store?.username || me?.username || me?.profile?.username || ''

  // Loading & Save states
  const [loading, setLoading] = useState(!initialProduct)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState('saved') // 'saved' | 'saving' | 'dirty'
  const isDirtyRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  // Primary active tab: 'details' | 'checkout' | 'discounts'
  const [activeTab, setActiveTab] = useState('details')

  // Product Core State
  const [product, setProduct] = useState(initialProduct)
  const [title, setTitle] = useState(initialProduct?.title || '')
  const [description, setDescription] = useState(initialProduct?.description || initialProduct?.shortDescription || '')
  const [thumbnail, setThumbnail] = useState(initialProduct?.thumbnail || initialProduct?.coverImage || '')
  const [price, setPrice] = useState(initialProduct?.price !== undefined ? String(initialProduct.price) : '0')
  const [originalPrice, setOriginalPrice] = useState(initialProduct?.originalPrice ? String(initialProduct.originalPrice) : '')
  const [currency, setCurrency] = useState(initialProduct?.currency || 'inr')
  const [status, setStatus] = useState(initialProduct?.status || 'DRAFT')

  // Delivery State: 'FILE' | 'URL'
  const [deliveryType, setDeliveryType] = useState(initialProduct?.redirectUrl ? 'URL' : 'FILE')
  const [destinationUrl, setDestinationUrl] = useState(initialProduct?.redirectUrl || '')
  const [fileObj, setFileObj] = useState(
    initialProduct?.fileId || initialProduct?.fileName
      ? {
          id: initialProduct.fileId || String(Date.now()),
          name: initialProduct.fileName || 'Attached file',
          size: initialProduct.fileSize ? `${(initialProduct.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Ready',
        }
      : (initialProduct?.files?.[0] || null)
  )
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingThumb, setUploadingThumb] = useState(false)

  // Display Mode: 'classic' | 'featured'
  const [displayMode, setDisplayMode] = useState(initialProduct?.displayMode || 'classic')

  // Checkout Configuration State
  const [customFields, setCustomFields] = useState([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [newFieldOpen, setNewFieldOpen] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState('SHORT_TEXT')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [savingField, setSavingField] = useState(false)

  // Additional Checkout Settings
  const [supportEmail, setSupportEmail] = useState(initialProduct?.settings?.supportEmail || me?.email || '')
  const [editingSupportEmail, setEditingSupportEmail] = useState(false)
  const [tempSupportEmail, setTempSupportEmail] = useState('')
  const [customTermsEnabled, setCustomTermsEnabled] = useState(Boolean(initialProduct?.settings?.customTermsEnabled))
  const [customTermsText, setCustomTermsText] = useState(initialProduct?.settings?.customTermsText || '')
  const [mailingListOptIn, setMailingListOptIn] = useState(initialProduct?.settings?.mailingListOptIn !== false)

  // Discounts / Coupons State
  const [coupons, setCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [newCouponOpen, setNewCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState('20')
  const [couponType, setCouponType] = useState('PERCENTAGE')
  const [couponValidityHours, setCouponValidityHours] = useState('24')
  const [couponScope, setCouponScope] = useState('SPECIFIC')
  const [creatingCoupon, setCreatingCoupon] = useState(false)

  // Live Preview Settings
  const [previewView, setPreviewView] = useState('store') // 'store' | 'product'
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)

  const thumbInputRef = useRef(null)
  const fileInputRef = useRef(null)

  // Populate data helper
  const populateData = useCallback((p) => {
    if (!p) return
    setProduct(p)
    setTitle(p.title || '')
    setDescription(p.description || p.shortDescription || '')
    setThumbnail(p.thumbnail || p.coverImage || '')
    setPrice(p.price !== undefined && p.price !== null ? String(p.price) : '0')
    setOriginalPrice(p.originalPrice ? String(p.originalPrice) : '')
    setCurrency(p.currency || 'inr')
    setStatus(p.status || 'DRAFT')
    setDisplayMode(p.displayMode || 'classic')

    if (p.redirectUrl) {
      setDeliveryType('URL')
      setDestinationUrl(p.redirectUrl)
    } else {
      setDeliveryType('FILE')
    }

    if (p.files && p.files.length > 0) {
      const f = p.files[0]
      setFileObj({
        id: f.id || f.fileId || String(Date.now()),
        name: f.name || f.fileName || 'Attached file',
        size: f.size || (f.fileSize ? `${(f.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Ready'),
      })
    } else if (p.fileId || p.fileName) {
      setFileObj({
        id: p.fileId || String(Date.now()),
        name: p.fileName || 'Attached file',
        size: p.fileSize ? `${(p.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Ready',
      })
    }

    // Checkout settings
    if (p.settings) {
      if (p.settings.supportEmail) setSupportEmail(p.settings.supportEmail)
      setCustomTermsEnabled(Boolean(p.settings.customTermsEnabled))
      setCustomTermsText(p.settings.customTermsText || '')
      setMailingListOptIn(p.settings.mailingListOptIn !== false)
    }
  }, [])

  const initialSeededRef = useRef(false)
  const productLoadedRef = useRef(false)

  // Load product
  const loadProduct = useCallback(async () => {
    if (!productId) return
    // Only show full loading spinner if we don't have product data yet
    if (!productLoadedRef.current && !initialProduct) {
      setLoading(true)
    }
    setLoadError(null)
    try {
      const res = await api.get(`/products/${productId}`)
      const p = res.product || res
      populateData(p)
      productLoadedRef.current = true
    } catch (err) {
      if (initialProduct && !productLoadedRef.current) {
        populateData(initialProduct)
      } else if (!productLoadedRef.current) {
        setLoadError(err.message || 'Unable to load product')
      }
    } finally {
      setLoading(false)
    }
  }, [productId, populateData, initialProduct])

  useEffect(() => {
    if (initialProduct && !initialSeededRef.current) {
      initialSeededRef.current = true
      populateData(initialProduct)
      productLoadedRef.current = true
    }
    loadProduct()
  }, [productId])

  // Load Checkout Fields
  const loadCheckoutFields = useCallback(async () => {
    if (!productId) return
    setLoadingFields(true)
    try {
      const res = await api.get(`/products/${productId}/checkout-fields`)
      setCustomFields(res.fields || [])
    } catch {
      // Fallback
    } finally {
      setLoadingFields(false)
    }
  }, [productId])

  // Load Coupons
  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true)
    try {
      const res = await api.get('/coupons')
      const allCoupons = res.coupons || []
      const applicable = allCoupons.filter((c) => {
        if (c.scope === 'ALL') return true
        if (c.productId === productId) return true
        if (Array.isArray(c.productIds) && c.productIds.includes(productId)) return true
        return false
      })
      setCoupons(applicable)
    } catch {
      // Fallback
    } finally {
      setLoadingCoupons(false)
    }
  }, [productId])

  useEffect(() => {
    if (activeTab === 'checkout') {
      loadCheckoutFields()
    } else if (activeTab === 'discounts') {
      loadCoupons()
    }
  }, [activeTab, loadCheckoutFields, loadCoupons])

  // Core save function
  const performSave = useCallback(async (overrides = {}) => {
    if (!productId) return
    const currentTitle = overrides.title !== undefined ? overrides.title : title
    if (!currentTitle.trim()) return

    setSaveState('saving')
    try {
      const rawPrice = overrides.price !== undefined ? overrides.price : price
      const numPrice = Number(rawPrice)
      const safePrice = isNaN(numPrice) ? 0 : Math.max(0, numPrice)

      const rawOrig = overrides.originalPrice !== undefined ? overrides.originalPrice : originalPrice
      const numOrig = rawOrig ? Number(rawOrig) : null
      const safeOrig = numOrig && !isNaN(numOrig) ? Math.max(0, numOrig) : null

      const rawDestUrl = overrides.destinationUrl !== undefined ? overrides.destinationUrl : destinationUrl
      const safeDestUrl = rawDestUrl ? String(rawDestUrl).trim() : null

      const payload = {
        title: currentTitle.trim(),
        description: overrides.description !== undefined ? overrides.description : description,
        shortDescription: overrides.description !== undefined ? overrides.description : description,
        price: safePrice,
        originalPrice: safeOrig,
        currency: overrides.currency !== undefined ? overrides.currency : currency,
        thumbnail: overrides.thumbnail !== undefined ? overrides.thumbnail : thumbnail,
        displayMode: overrides.displayMode !== undefined ? overrides.displayMode : displayMode,
        redirectUrl: (overrides.deliveryType || deliveryType) === 'URL' ? safeDestUrl : null,
        fileId: (overrides.fileObj !== undefined ? overrides.fileObj : fileObj)?.id || null,
        fileName: (overrides.fileObj !== undefined ? overrides.fileObj : fileObj)?.name || null,
        files: (overrides.fileObj !== undefined ? overrides.fileObj : fileObj) ? [overrides.fileObj !== undefined ? overrides.fileObj : fileObj] : [],
        settings: {
          supportEmail: overrides.supportEmail !== undefined ? overrides.supportEmail : supportEmail,
          customTermsEnabled: overrides.customTermsEnabled !== undefined ? overrides.customTermsEnabled : customTermsEnabled,
          customTermsText: overrides.customTermsText !== undefined ? overrides.customTermsText : customTermsText,
          mailingListOptIn: overrides.mailingListOptIn !== undefined ? overrides.mailingListOptIn : mailingListOptIn,
        }
      }

      const res = await api.patch(`/products/${productId}`, payload)
      const updated = res.product || res
      trackProductUpdated({ product_type: updated.type })
      setProduct(updated)
      setSaveState('saved')
      isDirtyRef.current = false
      try {
        onProductUpdated?.(updated)
      } catch (cbErr) {
        console.error('Error in onProductUpdated callback:', cbErr)
      }
      return updated
    } catch (err) {
      setSaveState('dirty')
      toast.error(err.message || 'Auto-save failed')
      throw err
    }
  }, [
    productId, title, description, price, originalPrice, currency,
    thumbnail, displayMode, deliveryType, destinationUrl, fileObj,
    supportEmail, customTermsEnabled, customTermsText, mailingListOptIn, onProductUpdated
  ])

  // Debounced auto-save handler for text changes
  const triggerAutoSave = useCallback((overrides = {}) => {
    isDirtyRef.current = true
    setSaveState('dirty')
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      performSave(overrides).catch(() => {})
    }, 800)
  }, [performSave])

  // Explicit Save
  async function handleManualSave() {
    setSaving(true)
    try {
      await performSave()
      toast.success('Changes saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Thumbnail upload handler
  async function handleThumbnailUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const url = res.url
      setThumbnail(url)
      await performSave({ thumbnail: url })
      toast.success('Thumbnail updated!')
    } catch (err) {
      toast.error(err.message || 'Thumbnail upload failed')
    } finally {
      setUploadingThumb(false)
    }
  }

  // Remove Thumbnail
  async function handleRemoveThumbnail() {
    setThumbnail('')
    await performSave({ thumbnail: '' })
    toast.success('Thumbnail removed')
  }

  // Digital file upload handler
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    setUploadingFile(true)
    setUploadProgress(20)
    try {
      const fd = new FormData()
      fd.append('file', file)
      let res
      try {
        res = await api.upload(`/products/${productId}/file`, fd)
      } catch {
        res = await api.upload('/upload', fd)
      }
      setUploadProgress(100)

      const newFileObj = {
        id: res?.fileId || res?.id || res?.path || String(Date.now()),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        mime: file.type,
      }
      setFileObj(newFileObj)
      await performSave({ fileObj: newFileObj })
      toast.success('File uploaded successfully!')
    } catch (err) {
      toast.error(err.message || 'File upload failed')
    } finally {
      setUploadingFile(false)
    }
  }

  // Remove File
  async function handleRemoveFile() {
    setFileObj(null)
    await performSave({ fileObj: null })
    toast.success('File removed')
  }

  // Toggle display mode (Classic vs Featured)
  async function handleSelectDisplayMode(mode) {
    setDisplayMode(mode)
    try {
      await performSave({ displayMode: mode })
      toast.success(`Display mode set to ${mode === 'featured' ? 'Featured' : 'Classic'}`)
    } catch (err) {
      toast.error('Failed to update display mode')
    }
  }

  // Toggle delivery mode (File vs URL)
  async function handleSelectDeliveryType(type) {
    setDeliveryType(type)
    triggerAutoSave({ deliveryType: type })
  }

  // Add custom checkout field
  async function handleAddCheckoutField() {
    if (!newFieldLabel.trim()) {
      toast.error('Field label is required')
      return
    }
    setSavingField(true)
    try {
      const res = await api.post(`/products/${productId}/checkout-fields`, {
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired,
        order: customFields.length + 1,
      })
      setCustomFields((prev) => [...prev, res.field])
      setNewFieldOpen(false)
      setNewFieldLabel('')
      setNewFieldType('SHORT_TEXT')
      setNewFieldRequired(false)
      toast.success('Checkout field added!')
    } catch (err) {
      toast.error(err.message || 'Failed to add checkout field')
    } finally {
      setSavingField(false)
    }
  }

  // Delete checkout field
  async function handleDeleteCheckoutField(fieldId) {
    try {
      await api.delete(`/products/${productId}/checkout-fields/${fieldId}`)
      setCustomFields((prev) => prev.filter((f) => f.id !== fieldId))
      toast.success('Field removed')
    } catch (err) {
      toast.error(err.message || 'Failed to delete field')
    }
  }

  // Toggle checkout field required status
  async function handleToggleFieldRequired(field) {
    const updatedRequired = !field.required
    try {
      await api.patch(`/products/${productId}/checkout-fields/${field.id}`, {
        required: updatedRequired,
      })
      setCustomFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, required: updatedRequired } : f))
      )
    } catch {
      toast.error('Failed to update field requirement')
    }
  }

  // Create discount code
  async function handleCreateCoupon() {
    if (!couponCode.trim()) {
      toast.error('Coupon code is required')
      return
    }
    setCreatingCoupon(true)
    try {
      const res = await api.post('/coupons', {
        code: couponCode.trim(),
        discount: Number(couponDiscount),
        type: couponType,
        validityHours: Number(couponValidityHours),
        scope: couponScope,
        productId: couponScope === 'SPECIFIC' ? productId : null,
      })
      setCoupons((prev) => [res.coupon, ...prev])
      setNewCouponOpen(false)
      setCouponCode('')
      toast.success(`Coupon ${res.coupon.code} created!`)
    } catch (err) {
      toast.error(err.message || 'Failed to create coupon')
    } finally {
      setCreatingCoupon(false)
    }
  }

  // Delete discount code
  async function handleDeleteCoupon(couponId) {
    try {
      await api.delete(`/coupons/${couponId}`)
      setCoupons((prev) => prev.filter((c) => c.id !== couponId))
      toast.success('Coupon removed')
    } catch (err) {
      toast.error(err.message || 'Failed to delete coupon')
    }
  }

  // Toggle Publish
  async function handleTogglePublish() {
    const isPub = status === 'PUBLISHED'
    try {
      if (isPub) {
        await api.patch(`/products/${productId}`, { status: 'DRAFT' })
        setStatus('DRAFT')
        toast.success('Product unpublished')
      } else {
        await api.post(`/products/${productId}/publish`)
        trackProductPublished({ product_type: product?.type })
        setStatus('PUBLISHED')
        toast.success('Product published to store!')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update publish status')
    }
  }

  // Share link
  function handleShare() {
    const publicUrl = `${window.location.origin}/${storeSlug}/${product?.slug || ''}`
    navigator.clipboard.writeText(publicUrl)
    toast.success('Link copied to clipboard!')
  }

  // Constructed live preview product object
  const previewProduct = {
    id: productId,
    title: title || 'Untitled Product',
    slug: product?.slug || 'product',
    description: description || '',
    shortDescription: description || '',
    thumbnail: thumbnail || null,
    price: Number(price || 0),
    originalPrice: originalPrice ? Number(originalPrice) : null,
    currency,
    displayMode,
    status,
    type: product?.type || 'DIGITAL_DOWNLOAD',
    fileId: fileObj?.id,
    fileName: fileObj?.name,
    redirectUrl: deliveryType === 'URL' ? destinationUrl : null,
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-8 bg-[#FBFAF9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
          <p className="text-xs font-semibold text-[#6F6F6B]">Loading product editor...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 bg-[#FBFAF9] text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-[#DC2626]" />
        <p className="text-sm font-bold text-[#1F1F1F]">Unable to load product</p>
        <p className="text-xs text-[#6F6F6B] max-w-sm">{loadError}</p>
        <div className="flex gap-2 pt-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="rounded-full text-xs">
              Back
            </Button>
          )}
          <Button size="sm" onClick={loadProduct} className="bg-[#1F1F1F] text-white rounded-full text-xs">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={isStoreContext ? "w-full flex-1 flex flex-col min-h-0 relative bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:h-full" : "w-full flex-1 flex flex-col xl:flex-row min-h-0 relative bg-[#FBFAF9]"}>

      {/* ========================================================================= */}
      {/* LEFT COLUMN: THE FOCUSED IN-DASHBOARD PRODUCT EDITOR                     */}
      {/* ========================================================================= */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto subtle-scrollbar bg-[#FFFFFF] ${isStoreContext ? '' : 'border-r border-[#E5E5E3]'}`}>
        
        {/* TOP BAR / HEADER */}
        <div className="sticky top-0 z-20 bg-[#FFFFFF] px-6 sm:px-8 pt-6 pb-2 flex items-center justify-between gap-4">
          {/* Back button & Title Context */}
          <div className="flex items-center gap-3.5 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="h-9 w-9 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] transition-colors cursor-pointer shrink-0"
                title="Back to products"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[13px] sm:text-sm font-medium text-[#6F6F6B] truncate leading-none mb-1">
                {getProductTypeLabel(product?.type)}
              </p>
              <h1 className="text-xl sm:text-[24px] font-bold text-[#1F1F1F] truncate leading-tight tracking-tight">
                {title || 'Untitled Product'}
              </h1>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile preview toggle button */}
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(true)}
              className="xl:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-xs font-semibold text-[#1F1F1F] transition-colors cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>

            {/* More Options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] transition-colors cursor-pointer"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-[#E5E5E3] text-xs font-medium">
                <DropdownMenuItem
                  onClick={() => window.open(`/${storeSlug}/${product?.slug || ''}`, '_blank')}
                  className="cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-[#6F6F6B]" /> Open public page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePublish} className="cursor-pointer">
                  {status === 'PUBLISHED' ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-2 text-[#6F6F6B]" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-2 text-[#16A34A]" /> Publish product
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E5E5E3]" />
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                  <Copy className="h-3.5 w-3.5 mr-2 text-[#6F6F6B]" /> Copy product link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* HORIZONTAL TABS (Details, Checkout, Discounts) */}
        <div className="bg-[#FFFFFF] px-6 sm:px-8 flex items-center gap-7 pt-1">
          {[
            { id: 'details', label: 'Details' },
            { id: 'checkout', label: 'Checkout' },
            { id: 'discounts', label: 'Discounts' },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm sm:text-[15px] font-semibold transition-all relative cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#1F1F1F] text-[#1F1F1F] font-bold'
                    : 'border-transparent text-[#6F6F6B] hover:text-[#1F1F1F]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* TAB CONTENTS CONTAINER — ONE CONTINUOUS FLAT CANVAS */}
        <div className="p-6 sm:p-8 max-w-[680px] w-full mx-auto">

          {/* ================================================================= */}
          {/* TAB 1: DETAILS                                                    */}
          {/* ================================================================= */}
          {activeTab === 'details' && (
            <div className="space-y-8 sm:space-y-9">

              {/* SECTION A: THUMBNAIL */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Thumbnail</h3>
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                    Square images work best. Use 1080 × 1080px or larger.
                  </p>
                  {thumbnail && (
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="text-xs font-semibold text-[#DC2626] hover:underline pt-1 block cursor-pointer"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />

                {/* Thumbnail control box */}
                <div
                  onClick={() => thumbInputRef.current?.click()}
                  className="relative h-[68px] w-[68px] sm:h-20 sm:w-20 rounded-[14px] border border-[#D9D9D9] bg-[#F5F5F3] overflow-hidden flex items-center justify-center cursor-pointer group hover:border-[#1F1F1F] transition-all shrink-0"
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center text-[#999995] group-hover:text-[#1F1F1F]">
                      <ImageIcon className="h-7 w-7 opacity-60" />
                      <div className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-white border border-[#D9D9D9] flex items-center justify-center shadow-xs">
                        <Plus className="h-2.5 w-2.5 text-[#1F1F1F]" />
                      </div>
                    </div>
                  )}
                  {uploadingThumb && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: PRODUCT NAME */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Product name</label>
                  <span className="text-xs text-[#6F6F6B] font-mono">
                    {title.length}/120
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={title}
                    maxLength={120}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      triggerAutoSave({ title: e.target.value })
                    }}
                    placeholder="e.g. Marvel Studio template"
                    className="h-12 sm:h-[50px] rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus-visible:ring-1 focus-visible:ring-[#1F1F1F] pr-10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* SECTION C: DESCRIPTION */}
              <div className="space-y-2">
                <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Description</label>
                <Textarea
                  value={description}
                  rows={5}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    triggerAutoSave({ description: e.target.value })
                  }}
                  placeholder="Tell shoppers what they will get and how it helps them..."
                  className="min-h-[130px] rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] p-4 text-[14px] leading-relaxed text-[#1F1F1F] resize-y focus-visible:ring-1 focus-visible:ring-[#1F1F1F]"
                />
              </div>

              {/* SECTION D: PRICING */}
              <div className="space-y-2">
                <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Price</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value)
                        triggerAutoSave({ currency: e.target.value })
                      }}
                      className="h-12 sm:h-[50px] px-3.5 rounded-[12px] border border-[#D9D9D9] bg-[#FFFFFF] text-xs font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] shrink-0"
                    >
                      <option value="inr">INR (₹)</option>
                      <option value="usd">USD ($)</option>
                      <option value="eur">EUR (€)</option>
                      <option value="gbp">GBP (£)</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value)
                        triggerAutoSave({ price: e.target.value })
                      }}
                      placeholder="0"
                      className="h-12 sm:h-[50px] rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-base font-bold text-[#1F1F1F] focus-visible:ring-1 focus-visible:ring-[#1F1F1F]"
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => {
                        setOriginalPrice(e.target.value)
                        triggerAutoSave({ originalPrice: e.target.value })
                      }}
                      placeholder="Compare-at price (optional)"
                      className="h-12 sm:h-[50px] rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-sm text-[#6F6F6B] focus-visible:ring-1 focus-visible:ring-[#1F1F1F]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION E: DELIVERY */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Delivery</h3>
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                    How should shoppers receive this after they pay?
                  </p>
                </div>

                {/* Delivery options: Upload a file vs Route to a URL */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectDeliveryType('FILE')}
                    className={`h-11 sm:h-12 px-6 rounded-full border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      deliveryType === 'FILE'
                        ? 'border-[#0052FF] text-[#0052FF] bg-[#F0F5FF]/50 shadow-xs'
                        : 'border-[#D9D9D9] text-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#F5F5F3]'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload a file</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDeliveryType('URL')}
                    className={`h-11 sm:h-12 px-6 rounded-full border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      deliveryType === 'URL'
                        ? 'border-[#0052FF] text-[#0052FF] bg-[#F0F5FF]/50 shadow-xs'
                        : 'border-[#D9D9D9] text-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#F5F5F3]'
                    }`}
                  >
                    <Link2 className="h-4 w-4" />
                    <span>Route to a URL</span>
                  </button>
                </div>

                {/* Route to URL input */}
                {deliveryType === 'URL' && (
                  <div className="space-y-2 pt-2">
                    <Input
                      type="url"
                      value={destinationUrl}
                      onChange={(e) => {
                        setDestinationUrl(e.target.value)
                        triggerAutoSave({ destinationUrl: e.target.value })
                      }}
                      placeholder="https://example.com/access-link"
                      className="h-12 sm:h-[50px] rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-sm text-[#1F1F1F]"
                    />
                    <p className="text-xs text-[#6F6F6B]">
                      Shoppers are redirected securely to this link immediately after purchasing.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION F: FILES (Visible when deliveryType is FILE) */}
              {deliveryType === 'FILE' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                    Files ({fileObj ? 1 : 0})
                  </h3>

                  {fileObj ? (
                    <div className="space-y-3">
                      {/* File row */}
                      <div className="rounded-[12px] border border-[#D9D9D9] bg-[#FFFFFF] p-3.5 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-[10px] bg-[#F5F5F3] flex items-center justify-center text-[#6F6F6B] shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#1F1F1F] truncate">
                              {fileObj.name}
                            </p>
                            <p className="text-xs text-[#6F6F6B] mt-0.5">
                              {fileObj.name.split('.').pop()?.toUpperCase() || 'FILE'} · {fileObj.size || 'Attached'}
                            </p>
                          </div>
                        </div>

                        {/* Action Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-full hover:bg-[#F5F5F3] flex items-center justify-center text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors cursor-pointer shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-[#E5E5E3] text-xs font-medium">
                            <DropdownMenuItem
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer"
                            >
                              <Upload className="h-3.5 w-3.5 mr-2" /> Replace file
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#E5E5E3]" />
                            <DropdownMenuItem
                              onClick={handleRemoveFile}
                              className="text-[#DC2626] focus:text-[#DC2626] cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove file
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Upload more files button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="w-full h-11 sm:h-12 rounded-[12px] bg-[#F5F5F3] hover:bg-[#EBEBEA] border border-[#E5E5E3] text-sm font-semibold text-[#1F1F1F] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {uploadingFile ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#1F1F1F]" />
                            Uploading... {uploadProgress}%
                          </span>
                        ) : (
                          'Upload more files'
                        )}
                      </button>
                    </div>
                  ) : (
                    /* No file uploaded yet: upload control */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#D9D9D9] hover:border-[#1F1F1F] rounded-[14px] p-6 text-center cursor-pointer transition-colors bg-[#FFFFFF] space-y-2"
                    >
                      <Upload className="h-7 w-7 text-[#1F1F1F] mx-auto opacity-70" />
                      <div>
                        <p className="text-sm font-bold text-[#1F1F1F]">Upload file</p>
                        <p className="text-xs text-[#6F6F6B] mt-0.5">
                          PDF, ZIP, MP4, EPUB, or audio (up to 50MB)
                        </p>
                      </div>
                      {uploadingFile && (
                        <div className="space-y-1 pt-2 w-full max-w-xs mx-auto">
                          <p className="text-xs font-semibold text-[#1F1F1F]">
                            Uploading... {uploadProgress}%
                          </p>
                          <div className="h-1.5 w-full bg-[#E5E5E3] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1F1F1F] transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION G: DISPLAY (CLASSIC VS FEATURED) */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Display</h3>
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                    How you display your content on your storefront.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Classic */}
                  <div
                    onClick={() => handleSelectDisplayMode('classic')}
                    className={`rounded-[12px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      displayMode === 'classic'
                        ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
                        : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
                    }`}
                  >
                    {/* Visual Diagram for Classic */}
                    <div className="h-20 w-full rounded-lg bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center px-4">
                      <div className="w-full h-9 rounded-lg bg-white border border-[#E5E5E3] px-2.5 flex items-center gap-2 shadow-xs">
                        <div className="h-5 w-5 rounded-md bg-[#1F1F1F]/15 shrink-0 overflow-hidden flex items-center justify-center">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#1F1F1F]/30" />
                          )}
                        </div>
                        <div className="h-2 w-20 rounded bg-[#1F1F1F]/30" />
                        <div className="ml-auto h-2 w-6 rounded bg-[#1F1F1F]/20" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1F1F1F]">Classic</p>
                        <p className="text-xs text-[#6F6F6B]">Clean compact link pill</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          displayMode === 'classic'
                            ? 'border-[#1F1F1F] bg-[#1F1F1F]'
                            : 'border-[#999995]'
                        }`}
                      >
                        {displayMode === 'classic' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Featured */}
                  <div
                    onClick={() => handleSelectDisplayMode('featured')}
                    className={`rounded-[12px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      displayMode === 'featured'
                        ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
                        : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
                    }`}
                  >
                    {/* Visual Diagram for Featured */}
                    <div className="h-20 w-full rounded-lg bg-[#F5F5F3] border border-[#E5E5E3] flex flex-col overflow-hidden shadow-xs">
                      <div className="h-11 w-full bg-[#1F1F1F]/15 overflow-hidden flex items-center justify-center">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-[#1F1F1F]/40" />
                        )}
                      </div>
                      <div className="p-1.5 space-y-1 bg-white flex-1">
                        <div className="h-1.5 w-24 rounded bg-[#1F1F1F]/40" />
                        <div className="h-1 w-12 rounded bg-[#1F1F1F]/20" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1F1F1F]">Featured</p>
                        <p className="text-xs text-[#6F6F6B]">High-visibility card with large cover</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          displayMode === 'featured'
                            ? 'border-[#1F1F1F] bg-[#1F1F1F]'
                            : 'border-[#999995]'
                        }`}
                      >
                        {displayMode === 'featured' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: CHECKOUT                                                   */}
          {/* ================================================================= */}
          {activeTab === 'checkout' && (
            <div className="space-y-8 sm:space-y-9">

              {/* CUSTOMER INFO TABLE */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Customer info</h3>
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                    What information would you like to collect from visitors who download your product?
                  </p>
                </div>

                {/* Table Header */}
                <div className="flex items-center justify-between text-xs sm:text-[13px] font-semibold text-[#1F1F1F] pt-2 pb-2.5 border-b border-[#E5E5E3]">
                  <span>Information</span>
                  <span>Required</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#E5E5E3]">
                  {/* Locked Field: Name */}
                  <div className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-[#999995] font-mono text-sm select-none">⋮⋮</span>
                      <span className="font-semibold text-[#1F1F1F]">Name</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-[6px] bg-[#6F6F6B] flex items-center justify-center text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="text-[#999995] text-sm select-none tracking-widest pl-1">···</span>
                    </div>
                  </div>

                  {/* Locked Field: Email */}
                  <div className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-[#999995] font-mono text-sm select-none">⋮⋮</span>
                      <span className="font-semibold text-[#1F1F1F]">Email</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-[6px] bg-[#6F6F6B] flex items-center justify-center text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="text-[#999995] text-sm select-none tracking-widest pl-1">···</span>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {customFields.map((field) => (
                    <div key={field.id} className="py-3 flex items-center justify-between text-sm group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[#999995] font-mono text-sm select-none">⋮⋮</span>
                        <span className="font-semibold text-[#1F1F1F] truncate">{field.label}</span>
                        <span className="text-[11px] font-mono text-[#6F6F6B] bg-[#F5F5F3] px-2 py-0.5 rounded">
                          {field.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={() => handleToggleFieldRequired(field)}
                          className="h-4 w-4 rounded border-[#D9D9D9] text-[#1F1F1F] focus:ring-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckoutField(field.id)}
                          className="text-[#DC2626] hover:opacity-80 p-1 cursor-pointer"
                          title="Delete field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Field Button / Form */}
                {!newFieldOpen ? (
                  <button
                    type="button"
                    onClick={() => setNewFieldOpen(true)}
                    className="w-full h-11 sm:h-12 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add field
                  </button>
                ) : (
                  <div className="p-4 rounded-[12px] border border-[#D9D9D9] bg-[#FFFFFF] space-y-3 mt-3 shadow-xs">
                    <p className="text-xs font-bold text-[#1F1F1F]">New checkout field</p>
                    <Input
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="e.g. Phone number, Company, Instagram handle"
                      className="h-10 rounded-[10px] bg-white border border-[#D9D9D9] text-xs"
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value)}
                        className="h-9 px-3 rounded-[10px] border border-[#D9D9D9] bg-white text-xs font-medium text-[#1F1F1F]"
                      >
                        <option value="SHORT_TEXT">Short Text</option>
                        <option value="PHONE">Phone Number</option>
                        <option value="LONG_TEXT">Long Text / Notes</option>
                        <option value="CHECKBOX">Checkbox</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-[#1F1F1F] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="h-3.5 w-3.5"
                        />
                        Required
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewFieldOpen(false)}
                        className="h-8 text-xs rounded-full"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingField}
                        onClick={handleAddCheckoutField}
                        className="h-8 px-4 rounded-full bg-[#1F1F1F] text-white text-xs"
                      >
                        {savingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save field'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* SUPPORT EMAIL */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Support email</h3>
                {!editingSupportEmail ? (
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                    Customers will be able to reach you at{' '}
                    <span className="font-semibold text-[#1F1F1F]">{supportEmail || me?.email || 'support@email.com'}</span>.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTempSupportEmail(supportEmail || me?.email || '')
                        setEditingSupportEmail(true)
                      }}
                      className="font-semibold text-[#0052FF] underline hover:opacity-80 cursor-pointer ml-1"
                    >
                      Edit
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2 pt-1 max-w-md">
                    <Input
                      type="email"
                      value={tempSupportEmail}
                      onChange={(e) => setTempSupportEmail(e.target.value)}
                      className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSupportEmail(false)}
                        className="px-3 py-1 text-xs text-[#6F6F6B] hover:text-[#1F1F1F] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSupportEmail(tempSupportEmail)
                          setEditingSupportEmail(false)
                          triggerAutoSave({ supportEmail: tempSupportEmail })
                        }}
                        className="px-4 py-1 text-xs font-semibold rounded-full bg-[#1F1F1F] text-white hover:bg-black cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CUSTOM T&Cs TOGGLE */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Custom T&Cs</h3>
                    <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                      Add a disclaimer with your own terms linked
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={customTermsEnabled}
                      onChange={(e) => {
                        setCustomTermsEnabled(e.target.checked)
                        triggerAutoSave({ customTermsEnabled: e.target.checked })
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E5E3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16A34A]"></div>
                  </label>
                </div>
                {customTermsEnabled && (
                  <Textarea
                    value={customTermsText}
                    rows={3}
                    onChange={(e) => {
                      setCustomTermsText(e.target.value)
                      triggerAutoSave({ customTermsText: e.target.value })
                    }}
                    placeholder="Enter custom terms or link to policy (e.g. All digital sales are final...)"
                    className="text-xs sm:text-sm rounded-[12px] bg-white border border-[#D9D9D9] p-3 mt-2"
                  />
                )}
              </div>

              {/* MAILING LIST OPT-IN TOGGLE */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Mailing list opt-in</h3>
                  <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                    Ask visitors to join your mailing list when they submit the form.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={mailingListOptIn}
                    onChange={(e) => {
                      setMailingListOptIn(e.target.checked)
                      triggerAutoSave({ mailingListOptIn: e.target.checked })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E5E3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16A34A]"></div>
                </label>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: DISCOUNTS                                                  */}
          {/* ================================================================= */}
          {activeTab === 'discounts' && (
            <div className="space-y-8 sm:space-y-9">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Discount codes</h3>
                    <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                      Create promotional codes and special pricing for this product.
                    </p>
                  </div>
                  {!newCouponOpen && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setNewCouponOpen(true)}
                      className="rounded-full h-8 px-3.5 text-xs font-semibold bg-[#1F1F1F] text-white hover:bg-black cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> New code
                    </Button>
                  )}
                </div>

                {/* New Coupon Creation Form */}
                {newCouponOpen && (
                  <div className="p-4 rounded-[12px] border border-[#D9D9D9] bg-[#FFFFFF] space-y-3 shadow-xs">
                    <p className="text-xs font-bold text-[#1F1F1F]">Create coupon code</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#6F6F6B] uppercase">Code *</label>
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="e.g. FLASH50"
                          className="h-10 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-mono font-bold"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#6F6F6B] uppercase">Discount</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={couponDiscount}
                            onChange={(e) => setCouponDiscount(e.target.value)}
                            className="h-10 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-bold w-20"
                          />
                          <select
                            value={couponType}
                            onChange={(e) => setCouponType(e.target.value)}
                            className="h-10 px-2 rounded-[10px] border border-[#D9D9D9] bg-white text-xs font-semibold"
                          >
                            <option value="PERCENTAGE">% OFF</option>
                            <option value="FIXED">Flat OFF</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#6F6F6B] uppercase">Scope</label>
                        <select
                          value={couponScope}
                          onChange={(e) => setCouponScope(e.target.value)}
                          className="w-full h-10 px-2 rounded-[10px] border border-[#D9D9D9] bg-white text-xs"
                        >
                          <option value="SPECIFIC">This product only</option>
                          <option value="ALL">All store products</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#6F6F6B] uppercase">Validity</label>
                        <select
                          value={couponValidityHours}
                          onChange={(e) => setCouponValidityHours(e.target.value)}
                          className="w-full h-10 px-2 rounded-[10px] border border-[#D9D9D9] bg-white text-xs"
                        >
                          <option value="24">24 hours</option>
                          <option value="168">7 days</option>
                          <option value="720">30 days</option>
                          <option value="8760">1 year</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewCouponOpen(false)}
                        className="h-8 text-xs rounded-full"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={creatingCoupon}
                        onClick={handleCreateCoupon}
                        className="h-8 px-4 rounded-full bg-[#1F1F1F] text-white text-xs"
                      >
                        {creatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create code'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing Coupons List */}
                {loadingCoupons ? (
                  <div className="py-6 flex items-center justify-center text-xs text-[#6F6F6B]">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading discounts...
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-[#D9D9D9] rounded-[12px] text-xs text-[#6F6F6B] bg-white">
                    No discount codes created for this product yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E5E3] border border-[#D9D9D9] rounded-[12px] bg-white overflow-hidden">
                    {coupons.map((c) => (
                      <div key={c.id} className="p-3.5 bg-white flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1F1F1F] bg-[#F5F5F3] px-2 py-0.5 rounded border border-[#E5E5E3]">
                              {c.code}
                            </span>
                            <span className="font-bold text-[#16A34A]">
                              {c.type === 'PERCENTAGE' ? `${c.discount}% OFF` : `${formatMoney(c.discount, currency)} OFF`}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6F6F6B] mt-1">
                            {c.scope === 'ALL' ? 'Applies to entire store' : 'Applies to this product'}
                            {' • '}{c.usedCount || 0} uses
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(c.code)
                              toast.success('Code copied!')
                            }}
                            className="p-1 text-[#6F6F6B] hover:text-[#1F1F1F]"
                            title="Copy code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1 text-[#DC2626] hover:opacity-80"
                            title="Delete coupon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: LIVE STOREFRONT / PRODUCT PREVIEW                          */}
      {/* ========================================================================= */}
      {!isStoreContext && (
        <div className="hidden xl:flex w-[480px] 2xl:w-[540px] flex-col items-center justify-start py-6 px-4 bg-[#F2F1EF] overflow-y-auto no-scrollbar shrink-0 sticky top-0 h-screen">
          
          {/* Toggle Bar: Preview Mode Switcher */}
          <div className="mb-4 flex items-center gap-2 bg-[#FFFFFF] p-1 rounded-full border border-[#E5E5E3] shadow-xs">
            <button
              type="button"
              onClick={() => setPreviewView('store')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                previewView === 'store'
                  ? 'bg-[#1F1F1F] text-white shadow-xs'
                  : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
              }`}
            >
              Storefront
            </button>
            <button
              type="button"
              onClick={() => setPreviewView('product')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                previewView === 'product'
                  ? 'bg-[#1F1F1F] text-white shadow-xs'
                  : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
              }`}
            >
              Product page
            </button>
            <button
              type="button"
              onClick={() => window.open(`/${storeSlug}/${product?.slug || ''}`, '_blank')}
              className="p-1 text-[#6F6F6B] hover:text-[#1F1F1F] ml-1 cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* REALISTIC MOBILE PHONE FRAME (MATCHING LINKTREE EXACTLY) */}
          <div className="w-[360px] h-[740px] rounded-[38px] border-[10px] border-[#1F1F1F] bg-[#0E1514] shadow-2xl overflow-hidden flex flex-col shrink-0 relative">
            
            {/* Phone Speaker Notch Bar */}
            <div className="w-full bg-[#0E1514] py-2 flex justify-center items-center shrink-0 z-10">
              <div className="h-3.5 w-20 bg-black/40 rounded-full flex items-center justify-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-white/20"></div>
                <div className="h-1 w-8 rounded-full bg-white/20"></div>
              </div>
            </div>

            {/* Phone Screen Viewport */}
            <div className="flex-1 overflow-y-auto no-scrollbar w-full relative">
              {previewView === 'store' ? (
                /* STOREFRONT VIEW: Renders the entire live store with updated product */
                <StorePreview
                  store={me?.store || {}}
                  username={storeSlug}
                  profile={{ ...(me?.profile || {}), username: storeSlug }}
                  products={[previewProduct]}
                  pages={me?.store?.pages || []}
                  editor
                  device="mobile"
                />
              ) : (
                /* DEDICATED PRODUCT VIEW (MATCHING SCREENSHOT 3 EXACTLY) */
                <div className="p-4 space-y-4 text-white min-h-full flex flex-col justify-between">
                  <div>
                    {/* Top Product Bar Title */}
                    <p className="text-[11px] font-semibold text-white/70 truncate text-center pb-2 border-b border-white/10">
                      {previewProduct.title}
                    </p>

                    {/* Large Product Visual / Thumbnail Area */}
                    <div className="mt-3 aspect-[4/3] w-full rounded-2xl bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center">
                      {previewProduct.thumbnail ? (
                        <img src={previewProduct.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white/40 gap-2">
                          <Package className="h-12 w-12" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Digital Product</span>
                        </div>
                      )}
                    </div>

                    {/* Title & Author */}
                    <div className="mt-4 space-y-1">
                      <h1 className="text-base font-bold text-white leading-snug">
                        {previewProduct.title}
                      </h1>
                      <p className="text-xs text-white/60">by {storeSlug || 'creator'}</p>
                    </div>

                    {/* Primary Download / Buy CTA Button */}
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full h-11 rounded-full bg-white text-[#0E1514] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-white/90 transition-colors cursor-pointer shadow-md"
                      >
                        {Number(previewProduct.price) === 0 ? (
                          <>
                            <Upload className="h-3.5 w-3.5 rotate-180" /> Download
                          </>
                        ) : (
                          `Buy now — ${formatMoney(previewProduct.price, previewProduct.currency)}`
                        )}
                      </button>
                    </div>

                    {/* Description preview */}
                    {previewProduct.description && (
                      <div className="mt-4 text-xs text-white/70 leading-relaxed space-y-1">
                        <p className="line-clamp-4">{previewProduct.description}</p>
                      </div>
                    )}

                    {/* Custom Checkout Fields Preview */}
                    {customFields.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Checkout Fields</p>
                        {customFields.map((f) => (
                          <div key={f.id} className="h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-white/80">
                            <span>{f.label}</span>
                            {f.required && <span className="text-[9px] text-amber-400 font-bold">*required</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom mini actions */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-white/50 text-xs">
                    <span>CreatorStore checkout</span>
                    <div className="flex gap-2">
                      <Share2 className="h-3.5 w-3.5" />
                      <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE PREVIEW DRAWER (FOR PHONES AND TABLETS) */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 xl:hidden animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E1514] rounded-[32px] border-[8px] border-[#1F1F1F] overflow-hidden flex flex-col h-[680px] shadow-2xl relative">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="absolute top-3 right-3 z-30 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-y-auto no-scrollbar pt-6">
              <StorePreview
                store={me?.store || {}}
                username={storeSlug}
                profile={{ ...(me?.profile || {}), username: storeSlug }}
                products={[previewProduct]}
                editor
                device="mobile"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
