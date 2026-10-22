'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { BaseModal, ModalFooterActions } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextInput } from '@/components/ui/text-input'
import { SelectableCard, SelectableCardGrid } from '@/components/ui/selectable-card'
import { AddOptionRow } from '@/components/ui/settings-row'
import { ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import AddFormConfig, { FORM_TYPES } from '@/components/dashboard/AddFormConfig'
import AddMediaConfig from '@/components/dashboard/AddMediaConfig'
import AddToStoreMenuView from '@/components/dashboard/AddToStoreMenuView'
import AddYouTubeModalView from '@/components/dashboard/AddYouTubeModalView'
import AddMediaModalView from '@/components/dashboard/AddMediaModalView'
import SocialDisplaySelectModalView from '@/components/dashboard/SocialDisplaySelectModalView'
import { getSocialPlatform, resolveSocialStyle } from '@/lib/socialPlatforms'
import { CoachingBookingWizardContent } from '@/components/coaching/CoachingBookingWizardModal'
import ProductBundleModal from '@/components/dashboard/ProductBundleModal'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import {
  X,
  Search,
  Link2,
  Package,
  Video,
  Layers,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Share2,
  FileText,
  Instagram,
  Play,
  Images,
  Headphones,
  Check,
  CheckCircle2,
  Upload,
  Loader2,
  ImageIcon,
} from 'lucide-react'

export function safeUrlValidate(urlStr) {
  if (!urlStr) return ''
  let cleaned = urlStr.trim()
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('file:')
  ) {
    return ''
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`
  }
  return cleaned
}

export function toPreviewProduct(p) {
  if (!p) return null
  return {
    id: p.id,
    courseId:
      p.courseId ||
      (p.type === 'COURSE' || String(p.type).toLowerCase() === 'course'
        ? p.courseId || p.id
        : null),
    creatorId: p.creatorId,
    title: p.title,
    slug: p.slug,
    type: p.type || 'DIGITAL_DOWNLOAD',
    status: p.status,
    price: Number(p.price || 0),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    currency: p.currency || 'INR',
    shortDescription: p.shortDescription || p.description || '',
    description: p.description || '',
    thumbnail: p.thumbnail || p.coverImage || null,
    fileId: p.fileId || p.files?.[0]?.id || null,
    fileName: p.fileName || p.files?.[0]?.name || null,
    fileSize: p.fileSize || p.files?.[0]?.size || null,
    files:
      p.files ||
      (p.fileId
        ? [{ id: p.fileId, name: p.fileName, size: p.fileSize }]
        : []),
    redirectUrl: p.redirectUrl || null,
  }
}

/* ---------------- ADD LINK FORM ---------------- */
export function AddLinkForm({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [layout, setLayout] = useState('classic')
  const [thumbnail, setThumbnail] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(title, url, layout, thumbnail)
      }}
      className="space-y-4"
    >
      <TextInput
        label="Link title"
        placeholder="e.g. Visit my website"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <TextInput
        label="Destination URL"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <ModalFooterActions
        hideSecondary
        primaryLabel="Add Link to Store"
        primaryType="submit"
      />
    </form>
  )
}

/* ---------------- ADD PRODUCT SELECTOR FORM ---------------- */
export function AddProductForm({
  products = [],
  existingProductIds = [],
  onSelectProduct,
}) {
  const [search, setSearch] = useState('')
  const filtered = products.filter((p) =>
    (p.title || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3 py-2">
      <div className="relative">
        <Input
          placeholder="Search your products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#FAFAFA] border-[#E8E8E8] text-[#222222] text-xs focus:border-[#222222] focus:ring-1 focus:ring-[#222222]"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-0.5">
        {filtered.length > 0 ? (
          filtered.map((p) => {
            const isAdded = existingProductIds.includes(p.id)
            const priceDisplay =
              Number(p.price) === 0
                ? 'Free'
                : formatMoney(p.price, p.currency || 'INR')

            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E8E8E8] bg-[#FFFFFF] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <div className="h-10 w-10 rounded-full border border-[#E8E8E8] bg-[#F2F2F2] flex items-center justify-center shrink-0 overflow-hidden text-[#222222]">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-[#222222]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#222222] truncate">
                      {p.title}
                    </p>
                    <p className="text-[11px] font-semibold text-[#777777] mt-0.5">
                      {priceDisplay}
                    </p>
                  </div>
                </div>

                {isAdded ? (
                  <span className="font-semibold text-xs text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/20 px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-[var(--status-success,#22C55E)]" />{' '}
                    Added
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onSelectProduct(p.id)}
                    className="font-semibold text-xs h-8 px-4 bg-[var(--accent-primary)] text-[var(--text-heading,#F5F5F5)] hover:bg-[var(--accent-primary)]/90 rounded-full shrink-0 cursor-pointer"
                  >
                    + Add
                  </Button>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-xs font-medium text-[var(--text-secondary,#A3A3A3)] text-center py-6">
            No matching products found.
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- 3-STEP DIGITAL PRODUCT FORM (INLINE CONTENT) ---------------- */
export function DigitalProductForm({
  step,
  setStep,
  product,
  saveState,
  onPatch,
  onSynced,
  onComplete,
  onDirty,
}) {
  const [deliveryType, setDeliveryType] = useState(
    product?.redirectUrl ? 'URL' : 'FILE'
  )

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urlError, setUrlError] = useState('')
  const [showUploadHint, setShowUploadHint] = useState(false)
  const [stepError, setStepError] = useState('')

  const [uploadingThumb, setUploadingThumb] = useState(false)

  const [mailingListOptIn, setMailingListOptIn] = useState(true)
  const [completing, setCompleting] = useState(false)

  const thumbInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const productId = product?.id || null
  const [titleText, setTitleText] = useState('')
  const [descText, setDescText] = useState('')
  const [priceText, setPriceText] = useState('')
  const [comparePriceText, setComparePriceText] = useState('')
  const [urlText, setUrlText] = useState('')
  const [currency, setCurrency] = useState(product?.currency || 'inr')
  const [localThumbUrl, setLocalThumbUrl] = useState('')
  const [pendingThumbFile, setPendingThumbFile] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [localFileObj, setLocalFileObj] = useState(null)
  const seededFor = useRef(null)

  useEffect(() => {
    if (!productId || seededFor.current === productId) return
    seededFor.current = productId
    setTitleText(
      product.title === 'Untitled product' ? '' : product.title || ''
    )
    setDescText(product.shortDescription || '')
    setPriceText(product.price ? String(product.price) : '')
    setComparePriceText(
      product.originalPrice ? String(product.originalPrice) : ''
    )
    setUrlText(product.redirectUrl || '')
    setDeliveryType(product.redirectUrl ? 'URL' : 'FILE')
    setCurrency(product.currency || 'inr')
  }, [productId, product])

  useEffect(() => () => {
    if (localThumbUrl && localThumbUrl.startsWith('blob:'))
      URL.revokeObjectURL(localThumbUrl)
  }, [localThumbUrl])

  const title = titleText
  const description = descText
  const price = priceText
  const originalPrice = comparePriceText
  const destinationUrl = urlText
  const thumbnail = localThumbUrl || product?.thumbnail || ''
  const fileObj =
    localFileObj ||
    (product?.fileId
      ? {
          id: product.fileId,
          name: product.fileName,
          size: product.fileSize
            ? `${(Number(product.fileSize) / 1024 / 1024).toFixed(2)} MB`
            : null,
        }
      : null)

  function markDirty() {
    onDirty?.()
  }

  useEffect(() => {
    try {
      if (!localStorage.getItem('cz_upload_hint_dismissed'))
        setShowUploadHint(true)
    } catch {
      /* storage unavailable (private mode) */
    }
  }, [])

  function dismissUploadHint() {
    setShowUploadHint(false)
    try {
      localStorage.setItem('cz_upload_hint_dismissed', '1')
    } catch {
      /* non-fatal */
    }
  }

  function validateUrl(urlStr) {
    if (!urlStr) return 'URL is required'
    const trimmed = urlStr.trim()
    if (!trimmed.startsWith('https://')) return 'URL must start with https://'
    if (
      trimmed.includes('javascript:') ||
      trimmed.includes('data:') ||
      trimmed.includes('file:') ||
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1')
    ) {
      return 'Security error: Invalid or private destination URL'
    }
    return ''
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    markDirty()
    setStepError('')

    if (!productId) {
      setPendingFile(file)
      setLocalFileObj({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      })
      return
    }

    setUploadingFile(true)
    setUploadProgress(35)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload(`/products/${product.id}/file`, fd)
      setUploadProgress(100)
      onSynced?.(res.product || res)
      toast.success('File uploaded successfully!')
    } catch (err) {
      toast.error(err.message || 'File upload failed')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleThumbUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    markDirty()
    if (!productId) {
      if (localThumbUrl && localThumbUrl.startsWith('blob:'))
        URL.revokeObjectURL(localThumbUrl)
      setPendingThumbFile(file)
      setLocalThumbUrl(URL.createObjectURL(file))
      return
    }
    setUploadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      onPatch?.({ thumbnail: res.url })
      toast.success('Thumbnail uploaded!')
    } catch (err) {
      toast.error(err.message || 'Thumbnail upload failed')
    } finally {
      setUploadingThumb(false)
    }
  }

  function step1ErrorMessage() {
    if (deliveryType === 'FILE' && !fileObj)
      return 'Please add a file or URL before continuing'
    if (deliveryType === 'URL') {
      const err = validateUrl(destinationUrl)
      if (err)
        return err === 'URL is required'
          ? 'Please add a file or URL before continuing'
          : err
    }
    return ''
  }

  function step2ErrorMessage() {
    if (!title.trim()) return 'Product name is required'
    if (price === '' || isNaN(Number(price))) return 'A valid price is required'
    if (!description.trim()) return 'Product description is required'
    return ''
  }

  function goStep2() {
    const msg = step1ErrorMessage()
    if (msg) {
      setStepError(msg)
      toast.error(msg)
      return
    }
    setStepError('')
    setStep(2)
  }

  function goStep3() {
    const msg = step2ErrorMessage()
    if (msg) {
      setStepError(msg)
      toast.error(msg)
      return
    }
    setStepError('')
    setStep(3)
  }

  async function handleComplete() {
    const first = step1ErrorMessage() || step2ErrorMessage()
    if (first) {
      setStepError(first)
      toast.error(first)
      return
    }
    setCompleting(true)
    try {
      await onComplete?.({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        originalPrice: originalPrice === '' ? null : Number(originalPrice),
        redirectUrl: deliveryType === 'URL' ? destinationUrl.trim() : null,
        thumbnailUrl: product?.thumbnail || '',
        pendingFile: deliveryType === 'FILE' ? pendingFile : null,
        pendingThumbFile,
        mailingListOptIn,
      })
    } finally {
      setCompleting(false)
    }
  }

  const inputClass =
    'bg-[#232323] border-white/[0.08] text-white text-sm rounded-xl w-full'

  return (
    <div className="flex flex-col gap-section w-full">
      {/* Step progress */}
      <div className="flex flex-col gap-field pb-2 border-b border-edge w-full">
        <div className="flex items-center justify-between">
          <span className="text-micro text-brand uppercase">
            Step {step} of 3
          </span>
          <div className="flex items-center gap-inline">
            {saveState === 'saving' && (
              <span className="text-meta text-content-muted">Saving…</span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-meta text-success">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <span className="text-meta text-content-secondary">
              {step === 1
                ? 'Delivery'
                : step === 2
                ? 'Product Details'
                : 'Collect Info'}
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        {stepError && (
          <p className="text-meta text-error-fg bg-surface-overlay border border-edge rounded-control px-3 py-2">
            {stepError}
          </p>
        )}
      </div>

      {/* STEP 1: DELIVERY */}
      {step === 1 && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1">
            <h4 className="text-section text-content-primary">Delivery</h4>
            <p className="text-meta text-content-muted">
              {deliveryType === 'FILE'
                ? 'Upload a file that customers will receive immediately after purchase.'
                : 'Redirect customers to a destination URL after purchase.'}
            </p>
          </div>

          <SelectableCardGrid>
            <SelectableCard
              selected={deliveryType === 'FILE'}
              onSelect={() => setDeliveryType('FILE')}
              title="Upload a file"
              description="Customers receive a download immediately after purchase."
            />
            <SelectableCard
              selected={deliveryType === 'URL'}
              onSelect={() => {
                setDeliveryType('URL')
                setPendingFile(null)
                setLocalFileObj(null)
                markDirty()
                onPatch?.({ fileId: null, fileName: null, files: [] })
              }}
              title="Route to a URL"
              description="Redirect customers to a destination link after purchase."
            />
          </SelectableCardGrid>

          {deliveryType === 'FILE' ? (
            <div className="flex flex-col gap-3 w-full">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />

              {showUploadHint && !fileObj && (
                <div className="flex items-start gap-inline p-3 rounded-control bg-surface-overlay border border-edge">
                  <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <p className="text-meta text-content-secondary flex-1">
                    Upload the file your customers will get instantly after
                    buying.
                  </p>
                  <button
                    type="button"
                    onClick={dismissUploadHint}
                    aria-label="Dismiss tip"
                    className="text-content-muted hover:text-content-primary shrink-0 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {fileObj ? (
                <div className="w-full p-4 rounded-control border border-[#CBE957]/30 bg-[#CBE957]/15 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-inline min-w-0 flex-1">
                    <CheckCircle2 className="h-5 w-5 text-[#CBE957] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-card-title text-content-primary truncate min-w-0">
                        {fileObj.name}
                      </p>
                      {fileObj.size && (
                        <p className="text-meta text-[#CBE957]">{fileObj.size}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-label bg-surface-raised border-edge text-content-primary hover:bg-surface-hover shrink-0 rounded-control cursor-pointer"
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-edge hover:border-edge-focus rounded-control p-6 text-center cursor-pointer transition-colors bg-surface-raised flex flex-col gap-2"
                >
                  <Upload className="h-8 w-8 text-brand mx-auto" />
                  <div>
                    <p className="text-card-title text-content-primary">
                      Upload file
                    </p>
                    <p className="text-meta text-content-muted">
                      Drag &amp; drop or click to select file (PDF, ZIP, MP4,
                      etc.)
                    </p>
                  </div>
                  {uploadingFile && (
                    <div className="flex flex-col gap-1 pt-2 w-full">
                      <p className="text-meta text-brand">
                        Uploading… {uploadProgress}%
                      </p>
                      <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <TextInput
              type="url"
              label="Destination URL *"
              placeholder="https://example.com/access-link"
              value={destinationUrl}
              error={urlError}
              onChange={(e) => {
                const val = e.target.value
                setUrlText(val)
                setUrlError(validateUrl(val))
                setStepError('')
                markDirty()
                onPatch?.({ redirectUrl: val })
              }}
            />
          )}

          <ModalFooterActions
            hideSecondary
            primaryLabel="Continue"
            onPrimary={goStep2}
          />
        </div>
      )}

      {/* STEP 2: PRODUCT DETAILS */}
      {step === 2 && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1">
            <h4 className="text-section text-content-primary">
              Product Details
            </h4>
            <p className="text-meta text-content-muted">
              Set your title, thumbnail, and pricing.
            </p>
          </div>

          {/* Thumbnail */}
          <div className="flex flex-col gap-field">
            <label className="block text-label text-content-secondary">
              Thumbnail
            </label>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbUpload}
              className="hidden"
            />
            <div className="flex items-center gap-inline">
              <div className="h-14 w-14 rounded-control border border-edge bg-surface-raised flex items-center justify-center overflow-hidden shrink-0 text-brand">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="h-8 text-label bg-surface-raised border-edge text-content-primary hover:bg-surface-hover rounded-control cursor-pointer"
                >
                  {uploadingThumb ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Upload'
                  )}
                </Button>
                {thumbnail && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      if (
                        localThumbUrl &&
                        localThumbUrl.startsWith('blob:')
                      )
                        URL.revokeObjectURL(localThumbUrl)
                      setLocalThumbUrl('')
                      setPendingThumbFile(null)
                      markDirty()
                      onPatch?.({ thumbnail: '' })
                    }}
                    className="h-8 text-label text-error-fg hover:bg-surface-hover rounded-control cursor-pointer"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>

          <TextInput
            label="Product name *"
            placeholder="e.g. Master DSA Complete Guide"
            value={title}
            onChange={(e) => {
              setTitleText(e.target.value)
              setStepError('')
              markDirty()
              onPatch?.({ title: e.target.value })
            }}
            required
          />
          <TextInput
            as="textarea"
            label="Description *"
            placeholder="Briefly describe what customers will receive..."
            value={description}
            onChange={(e) => {
              setDescText(e.target.value)
              setStepError('')
              markDirty()
              onPatch?.({
                shortDescription: e.target.value,
                description: e.target.value,
              })
            }}
            rows={2}
            required
          />

          {/* Pricing & Currency */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="flex flex-col gap-field">
              <label className="block text-label text-content-secondary">
                Price *
              </label>
              <Input
                type="number"
                min="0"
                placeholder="499"
                value={price}
                onChange={(e) => {
                  setPriceText(e.target.value)
                  setStepError('')
                  markDirty()
                  onPatch?.({
                    price: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }}
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-field">
              <label className="block text-label text-content-secondary">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  markDirty()
                  onPatch?.({ currency: e.target.value })
                }}
                className="w-full h-9 bg-surface-raised border border-edge text-content-primary text-body px-2 rounded-control"
              >
                <option value="inr">INR (₹)</option>
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Compare-at Price */}
          <div className="flex flex-col gap-field w-full">
            <label className="block text-label text-content-secondary">
              Compare-at price (optional)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="999"
              value={originalPrice}
              onChange={(e) => {
                setComparePriceText(e.target.value)
                markDirty()
                onPatch?.({
                  originalPrice:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }}
              className={inputClass}
            />
            <p className="text-meta text-content-muted">
              Shown crossed out e.g. <span className="line-through">₹999</span>{' '}
              ₹499
            </p>
          </div>

          <ModalFooterActions
            secondaryLabel="Back"
            onSecondary={() => setStep(1)}
            primaryLabel="Continue"
            onPrimary={goStep3}
          />
        </div>
      )}

      {/* STEP 3: COLLECT INFO */}
      {step === 3 && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1">
            <h4 className="text-section text-content-primary">Collect Info</h4>
            <p className="text-meta text-content-muted">
              What information would you like to collect from customers?
            </p>
          </div>

          <div className="p-card bg-surface-raised rounded-control border border-edge flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-body text-content-primary">
              <span>Name</span>
              <span className="text-meta text-success">Required ✓</span>
            </div>
            <div className="flex items-center justify-between text-body text-content-primary pt-1 border-t border-edge-subtle">
              <span>Email</span>
              <span className="text-meta text-success">Required ✓</span>
            </div>
          </div>

          {/* Mailing list opt-in */}
          <div className="p-card bg-surface-raised rounded-control border border-edge flex items-center justify-between gap-inline w-full">
            <div className="flex flex-col gap-0.5">
              <p className="text-card-title text-content-primary">
                Mailing list opt-in
              </p>
              <p className="text-meta text-content-muted">
                Ask customers to join your list when submitting form.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mailingListOptIn}
              aria-label="Mailing list opt-in"
              onClick={() => setMailingListOptIn(!mailingListOptIn)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                mailingListOptIn ? 'bg-brand' : 'bg-surface-hover'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-surface-base transition duration-200 ${
                  mailingListOptIn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <ModalFooterActions
            secondaryLabel="Back"
            onSecondary={() => setStep(2)}
            primaryLabel="Complete"
            onPrimary={handleComplete}
            primaryDisabled={completing}
            primaryLoading={completing}
          />
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   MAIN REUSABLE ADD-TO-STORE WIZARD / MODAL
   ========================================================================== */
export default function AddToStoreModal({
  open,
  isOpen,
  onClose,
  onSuccess,
  context = 'store', // 'store' | 'products'
  products = [],
  availableProducts,
  onAddProductToStore,
  store = null,
  activePageId = null,
  pages = [],
  creatorEmail = '',
  igAccount = { connected: false, username: '' },
  onConnectInstagram,
  onDisconnectInstagram,
  onAddSection,
  onUpdateSectionProps,
  onStoreUpdated,
  initialCategory = 'suggested',
  initialType = 'menu',
}) {
  const isModalOpen = Boolean(open ?? isOpen)
  const productList = availableProducts ?? products ?? []

  const [addModalType, setAddModalType] = useState(initialType)
  const [modalOrigin, setModalOrigin] = useState('menu')
  const [addModalCategory, setAddModalCategory] = useState(initialCategory)
  const [addModalSearch, setAddModalSearch] = useState('')
  const [selectedFormType, setSelectedFormType] = useState('contact')
  const [editingFormSection, setEditingFormSection] = useState(null)
  const [selectedMediaType, setSelectedMediaType] = useState('video')
  const [editingMediaSection, setEditingMediaSection] = useState(null)
  const [selectedSocialPlatform, setSelectedSocialPlatform] = useState('instagram')
  const [wizardStep, setWizardStep] = useState(1)
  const [editingProductId, setEditingProductId] = useState(null)
  const [coachingWizardProductId, setCoachingWizardProductId] = useState(null)
  const [bundleModalOpen, setBundleModalOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState(null)

  const [draftProductId, setDraftProductId] = useState(null)
  const [draftSectionId, setDraftSectionId] = useState(null)
  const [draftSaveState, setDraftSaveState] = useState('idle')
  const [wizardDirty, setWizardDirty] = useState(false)
  const [completingProduct, setCompletingProduct] = useState(false)
  const pendingCreateId = useRef(null)

  let me = null
  let setPricingModalOpen = null
  try {
    const dash = useDashboard()
    me = dash?.me
  } catch (e) {}
  try {
    const head = useDashboardHeader()
    setPricingModalOpen = head?.setPricingModalOpen
  } catch (e) {}

  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial && sub?.planId !== 'UNSUBSCRIBED' && sub?.plan !== 'UNSUBSCRIBED')
  const isTrialActive = Boolean(
    !isPaid &&
    (sub?.isTrial || sub?.status === 'TRIALING' || sub?.trialStatus === 'ACTIVE') &&
    !sub?.isTrialExpired &&
    sub?.trialStatus !== 'EXPIRED' &&
    sub?.status !== 'EXPIRED' &&
    (!sub?.trialEndsAt || new Date(sub.trialEndsAt).getTime() > Date.now())
  )
  const canCreate = isPaid || isTrialActive

  // Reset modal state when opened
  useEffect(() => {
    if (isModalOpen) {
      setAddModalType(initialType)
      setAddModalCategory(initialCategory)
      setAddModalSearch('')
      setWizardStep(1)
      setWizardDirty(false)
      setDraftProductId(null)
      setDraftSectionId(null)
      setDraftSaveState('idle')
    }
  }, [isModalOpen, initialType, initialCategory])

  const discardPendingCreate = useCallback(() => {
    const orphanId = pendingCreateId.current
    pendingCreateId.current = null
    if (orphanId) {
      api.del(`/products/${orphanId}`).catch(() => {})
    }
  }, [])

  const closeWizard = useCallback(() => {
    discardPendingCreate()
    setDraftProductId(null)
    setDraftSectionId(null)
    setDraftSaveState('idle')
    setWizardDirty(false)
    setAddModalType('menu')
    setWizardStep(1)
    onClose?.()
  }, [discardPendingCreate, onClose])

  const requestCloseModal = useCallback(() => {
    if (addModalType === 'digital_product' && wizardDirty) {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm("Discard this product? Your changes won't be saved.")
      if (!ok) return
    }
    closeWizard()
  }, [addModalType, wizardDirty, closeWizard])

  const openDigitalProductWizard = useCallback(() => {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen?.(true)
      onClose?.()
      return
    }
    discardPendingCreate()
    setDraftProductId(null)
    setDraftSectionId(null)
    setDraftSaveState('idle')
    setWizardDirty(false)
    setModalOrigin('menu')
    setAddModalType('digital_product')
    setWizardStep(1)
  }, [canCreate, discardPendingCreate, setPricingModalOpen, onClose])

  const openCoachingCreationFlow = useCallback(() => {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen?.(true)
      onClose?.()
      return
    }
    setCoachingWizardProductId(null)
    setModalOrigin('menu')
    setAddModalType('coaching')
  }, [canCreate, setPricingModalOpen, onClose])


  const openBundleCreationFlow = useCallback(() => {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen?.(true)
      onClose?.()
      return
    }
    setEditingBundle(null)
    setBundleModalOpen(true)
  }, [canCreate, setPricingModalOpen, onClose])

  // Handler for finishing Digital Product
  const finishDigitalProduct = useCallback(
    async (payload = {}) => {
      if (completingProduct) return
      setCompletingProduct(true)
      try {
        const existingId = draftProductId || pendingCreateId.current
        const isHome =
          !activePageId ||
          activePageId === 'home' ||
          Boolean(pages.find((p) => p.id === activePageId || p.slug === activePageId)?.isDefault)
        const targetPageId = isHome ? null : activePageId

        let created
        if (existingId) {
          const updated = await api.patch(`/products/${existingId}`, {
            title: payload.title,
            description: payload.description,
            shortDescription: payload.description,
            price: payload.price,
            currency: payload.currency,
            redirectUrl: payload.redirectUrl || null,
            status: 'PUBLISHED',
            storePublished: true,
          })
          created = updated.product || updated
          if (payload.pendingFile) {
            const fd = new FormData()
            fd.append('file', payload.pendingFile)
            const up = await api.upload(`/products/${existingId}/file`, fd)
            created = up.product || created
          }
          if (payload.pendingThumbFile) {
            const fd = new FormData()
            fd.append('file', payload.pendingThumbFile)
            const up = await api.upload('/upload', fd)
            const patched = await api.patch(`/products/${existingId}`, {
              thumbnail: up.url,
            })
            created = patched.product || { ...created, thumbnail: up.url }
          }
        } else {
          const title = (payload.title || '').trim() || 'Untitled product'
          const res = await api.post('/products', {
            type: 'DIGITAL_DOWNLOAD',
            title,
            description: payload.description || '',
            shortDescription: payload.description || '',
            thumbnail: payload.thumbnailUrl || '',
            price: Number(payload.price) || 0,
            currency: payload.currency || 'inr',
            status: 'DRAFT',
            storePublished: false,
          })
          created = res.product || res
          pendingCreateId.current = created.id

          if (payload.redirectUrl) {
            const patched = await api.patch(`/products/${created.id}`, {
              redirectUrl: payload.redirectUrl,
            })
            created = patched.product || patched || created
          }

          if (payload.pendingThumbFile) {
            const fd = new FormData()
            fd.append('file', payload.pendingThumbFile)
            const up = await api.upload('/upload', fd)
            const thumbPatched = await api.patch(`/products/${created.id}`, {
              thumbnail: up.url,
            })
            created =
              thumbPatched.product || thumbPatched || { ...created, thumbnail: up.url }
          }

          if (payload.pendingFile) {
            const fd = new FormData()
            fd.append('file', payload.pendingFile)
            const up = await api.upload(`/products/${created.id}/file`, fd)
            created = up.product || created
          }

          const published = await api.patch(`/products/${created.id}`, {
            status: 'PUBLISHED',
            storePublished: true,
          })
          created = published.product || published || created
        }

        const formatted = toPreviewProduct(created)

        // If in Store context, add/update store sections
        if (context === 'store') {
          if (onAddSection) {
            onAddSection('product', {
              productId: formatted.id,
              layout: 'classic',
            })
          } else {
            const section = {
              id: uuidv4(),
              type: 'product',
              hidden: false,
              pageId: targetPageId,
              props: { productId: formatted.id, layout: 'classic' },
            }
            const currentSections = [...(store?.sections || [])]
            const nextSections = [...currentSections, section]
            try {
              const storeRes = await api.patch('/store', {
                sections: nextSections,
              })
              onStoreUpdated?.(storeRes?.store || { ...store, sections: nextSections })
            } catch {
              /* ignore error */
            }
          }
        }

        pendingCreateId.current = null
        toast.success(`Product created! 🎉 ${formatted.title}`)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('creatorstore:setup-updated'))
        }
        onSuccess?.(formatted, 'digital_product')
        closeWizard()
      } catch (err) {
        toast.error(err.message || 'Failed to create product')
      } finally {
        setCompletingProduct(false)
      }
    },
    [
      completingProduct,
      draftProductId,
      activePageId,
      pages,
      context,
      onAddSection,
      store,
      onStoreUpdated,
      onSuccess,
      closeWizard,
    ]
  )

  const handleLinkSubmit = useCallback(
    async (title, url, layout, thumbnail) => {
      if (!canCreate) {
        toast.error('Your Pro trial has ended. Upgrade your plan to add links and continue selling.')
        setPricingModalOpen?.(true)
        closeWizard()
        return
      }
      const validated = safeUrlValidate(url)
      if (!validated) {
        toast.error('Invalid URL scheme. Please enter a valid web link.')
        return
      }
      if (context === 'store') {
        if (onAddSection) {
          onAddSection('button', {
            label: title || 'Follow me',
            url: validated,
            layout: layout || 'classic',
            thumbnail,
          })
        }
      }
      toast.success('Link added!')
      onSuccess?.({ title, url: validated, layout, thumbnail }, 'link')
      closeWizard()
    },
    [canCreate, context, onAddSection, onSuccess, closeWizard, setPricingModalOpen]
  )

  const handleSelectExistingProduct = useCallback(
    (prodId) => {
      if (onAddProductToStore) {
        onAddProductToStore(prodId)
      } else if (context === 'store') {
        if (onAddSection) {
          onAddSection('product', { productId: prodId, layout: 'classic' })
        }
      }
      const matched = productList.find((p) => p.id === prodId)
      onSuccess?.(matched, 'product')
      closeWizard()
    },
    [onAddProductToStore, context, onAddSection, productList, onSuccess, closeWizard]
  )

  return (
    <>
      <BaseModal
      open={isModalOpen}
      onOpenChange={(op) => {
        if (!op) requestCloseModal()
      }}
      hideFooter
      hideClose={addModalType === 'coaching'}
      className={
        addModalType === 'coaching'
          ? 'sm:max-w-4xl max-w-4xl w-[95vw] sm:w-full max-h-[90vh] p-0 gap-0 overflow-hidden'
          : ['menu', 'add_youtube', 'add_tiktok', 'add_vimeo', 'add_video', 'social_display_select'].includes(addModalType)
          ? 'sm:max-w-[780px] w-[95vw] sm:w-full h-[88vh] sm:h-[640px] max-h-[92vh] p-4 sm:p-7 rounded-[28px] bg-white border border-[#E8E8E8] shadow-[0_20px_60px_rgba(0,0,0,0.08)] gap-0 overflow-hidden flex flex-col'
          : 'sm:max-w-[700px]'
      }
      bodyClassName={
        addModalType === 'coaching'
          ? 'p-0 min-h-[500px] flex flex-col flex-1'
          : ['menu', 'add_youtube', 'add_tiktok', 'add_vimeo', 'add_video', 'social_display_select'].includes(addModalType)
          ? 'p-0 flex flex-col flex-1 min-h-0 overflow-hidden'
          : 'pt-5'
      }
      title={
        addModalType === 'coaching'
          ? null
          : addModalType === 'menu'
          ? (
            <div className="w-full text-center text-xl font-bold text-[#1F1F1F]">
              Add
            </div>
          )
          : addModalType === 'social_display_select'
          ? `Add ${getSocialPlatform(selectedSocialPlatform)?.name || 'Social'}`
          : addModalType === 'add_youtube'
          ? 'Add YouTube'
          : addModalType === 'add_tiktok'
          ? 'Add TikTok Video'
          : addModalType === 'add_vimeo'
          ? 'Add Vimeo'
          : addModalType === 'add_video'
          ? 'Add Video'
          : addModalType === 'digital_product'
          ? 'Create digital product'
          : addModalType === 'edit_product'
          ? 'Edit Digital Product'
          : addModalType === 'link'
          ? 'Add Link'
          : addModalType === 'product'
          ? 'Add Product'
          : addModalType === 'forms_menu'
          ? 'Add a Form'
          : addModalType === 'form_config'
          ? editingFormSection
            ? 'Edit Form'
            : `Configure ${
                FORM_TYPES.find((f) => f.id === selectedFormType)?.title ||
                'Form'
              }`
          : addModalType === 'media_config'
          ? editingMediaSection
            ? `Edit ${
                selectedMediaType === 'youtube'
                  ? 'YouTube'
                  : selectedMediaType === 'gallery'
                  ? 'Gallery'
                  : selectedMediaType === 'audio'
                  ? 'Audio'
                  : selectedMediaType === 'pdf'
                  ? 'PDF'
                  : 'Video'
              }`
            : selectedMediaType === 'youtube'
            ? 'Add YouTube Video'
            : selectedMediaType === 'gallery'
            ? 'Add Image Gallery'
            : selectedMediaType === 'audio'
            ? 'Add Audio Track'
            : selectedMediaType === 'pdf'
            ? 'Add PDF Document'
            : 'Add Video'
          : 'Add to your store'
      }
      headerLeft={
        addModalType === 'coaching' ? null : addModalType === 'menu' ? (
          <div className="w-9 shrink-0" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (addModalType === 'digital_product' && wizardStep > 1) {
                setWizardStep((s) => s - 1)
              } else if (addModalType === 'digital_product') {
                if (wizardDirty) {
                  const ok =
                    typeof window !== 'undefined' &&
                    window.confirm("Discard this product? Your changes won't be saved.")
                  if (!ok) return
                }
                setDraftProductId(null)
                setDraftSectionId(null)
                setDraftSaveState('idle')
                setWizardDirty(false)
                discardPendingCreate()
                if (modalOrigin === 'direct') {
                  closeWizard()
                } else {
                  setAddModalType('menu')
                  setWizardStep(1)
                }
              } else if (['add_youtube', 'add_tiktok', 'add_vimeo', 'add_video', 'social_display_select'].includes(addModalType)) {
                setAddModalType('menu')
              } else if (addModalType === 'form_config') {
                if (editingFormSection) {
                  closeWizard()
                  setEditingFormSection(null)
                } else {
                  setAddModalType('forms_menu')
                }
              } else if (addModalType === 'media_config') {
                if (editingMediaSection) {
                  closeWizard()
                  setEditingMediaSection(null)
                } else {
                  setAddModalType('menu')
                }
              } else {
                setAddModalType('menu')
                setWizardStep(1)
              }
            }}
            className="text-[#96969D] hover:text-[#D4D4D8] p-1 rounded-full transition-colors shrink-0 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )
      }
    >
      {/* 
        Unified AddToStore Menu View - Linktree style flat surface redesign
        Supported categories: ['suggested', 'ecommerce', 'social', 'media', 'document', 'forms']
        Search placeholder: Paste or search a link...
      */}
      {addModalType === 'menu' && (
        <AddToStoreMenuView
          search={addModalSearch}
          onSearchChange={setAddModalSearch}
          category={addModalCategory}
          onCategoryChange={setAddModalCategory}
          onSelectOption={(opt) => {
            if (opt.type === 'bundle' || opt.id === 'bundles_commerce') {
              openBundleCreationFlow()
            } else if (opt.type === 'digital_product') {
              openDigitalProductWizard()
            } else if (opt.type === 'coaching') {
              openCoachingCreationFlow()
            } else if (opt.type === 'link') {
              if (opt.prefillUrl) {
                handleLinkSubmit({
                  title: opt.prefillTitle || opt.prefillUrl,
                  url: opt.prefillUrl,
                })
              } else {
                setAddModalType('link')
              }
            } else if (opt.type === 'link_preset') {
              handleLinkSubmit({
                title: opt.title || 'Link',
                url: opt.presetUrl || 'https://',
              })
            } else if (opt.type === 'collection') {
              if (onAddSection) {
                onAddSection('heading', { text: 'Featured Collection' })
              }
              closeWizard()
            } else if (opt.type === 'instagram') {
              setSelectedSocialPlatform('instagram')
              setAddModalType('social_display_select')
            } else if (opt.type === 'social') {
              setSelectedSocialPlatform(opt.platform || 'generic')
              setAddModalType('social_display_select')
            } else if (opt.type === 'forms_menu') {
              setAddModalType('forms_menu')
            } else if (
              opt.type === 'form' ||
              opt.type === 'form_contact' ||
              opt.type === 'form_newsletter' ||
              opt.type === 'form_feedback' ||
              opt.type === 'form_qa'
            ) {
              const fType =
                opt.formType ||
                (opt.type === 'form_newsletter'
                  ? 'newsletter'
                  : opt.type === 'form_feedback'
                  ? 'feedback'
                  : opt.type === 'form_qa'
                  ? 'qa'
                  : 'contact')
              setSelectedFormType(fType)
              setEditingFormSection(null)
              setAddModalType('form_config')
            } else if (
              opt.type === 'youtube' ||
              opt.mediaType === 'youtube' ||
              opt.id === 'youtube_media' ||
              opt.id === 'youtube_suggested'
            ) {
              setAddModalType('add_youtube')
            } else if (
              opt.type === 'tiktok' ||
              opt.mediaType === 'tiktok' ||
              opt.id === 'tiktok_media'
            ) {
              setAddModalType('add_tiktok')
            } else if (
              opt.type === 'vimeo' ||
              opt.mediaType === 'vimeo' ||
              opt.id === 'vimeo_media'
            ) {
              setAddModalType('add_vimeo')
            } else if (
              opt.type === 'video' ||
              opt.mediaType === 'video' ||
              opt.id === 'video_media'
            ) {
              setAddModalType('add_video')
            } else if (
              opt.type === 'media' ||
              opt.type === 'gallery' ||
              opt.type === 'audio' ||
              opt.type === 'pdf'
            ) {
              const mType = opt.mediaType || opt.type
              setSelectedMediaType(mType)
              setEditingMediaSection(null)
              setAddModalType('media_config')
            } else if (opt.type === 'event' || opt.type === 'webinar') {
              if (onAddSection) {
                onAddSection('link', {
                  title: opt.title || 'Live Webinar or Event',
                  url: 'https://',
                  display_mode: 'event',
                })
              }
              closeWizard()
            } else if (opt.type === 'heading_text' || opt.type === 'heading') {
              if (onAddSection) {
                onAddSection('heading', { text: 'Section Heading' })
              }
              closeWizard()
            } else if (opt.type === 'text_block' || opt.type === 'text') {
              if (onAddSection) {
                onAddSection('text', { text: 'Add your text here...', content: 'Add your text here...' })
              }
              closeWizard()
            } else if (opt.type === 'existing_product') {
              handleSelectExistingProduct(opt.productId)
            }
          }}
          onQuickAction={(action) => {
            if (action === 'collection') {
              if (onAddSection) {
                onAddSection('heading', { text: 'Featured Collection' })
              }
              closeWizard()
            } else if (action === 'link') {
              setAddModalType('link')
            } else if (action === 'product') {
              openDigitalProductWizard()
            } else if (action === 'form') {
              setAddModalType('forms_menu')
            }
          }}
          products={productList}
          onSelectExistingProduct={handleSelectExistingProduct}
          igAccount={igAccount}
        />
      )}

      {/* Main Content Body for other wizard screens */}
      {addModalType !== 'menu' && (
        <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* ADD LINK FORM */}
        {addModalType === 'link' && (
          <div className="p-4 sm:p-6">
            <AddLinkForm onSubmit={handleLinkSubmit} />
          </div>
        )}

        {/* ADD PRODUCT SELECTOR FORM */}
        {addModalType === 'product' && (
          <div className="p-4 sm:p-6">
            <AddProductForm
              products={productList}
              existingProductIds={(store?.sections || [])
                .filter((s) => s.type === 'product')
                .map((s) => s.props?.productId)}
              onSelectProduct={handleSelectExistingProduct}
            />
          </div>
        )}

        {/* COACHING & BOOKINGS 7-STEP WIZARD */}
        {addModalType === 'coaching' && (
          <CoachingBookingWizardContent
            key={coachingWizardProductId || 'new-coaching'}
            editProductId={coachingWizardProductId}
            creatorProfile={{ email: creatorEmail }}
            onClose={closeWizard}
            onSuccess={async (createdProd) => {
              if (context === 'store' && createdProd?.id && !coachingWizardProductId) {
                if (onAddSection) {
                  onAddSection('product', {
                    productId: createdProd.id,
                    layout: 'classic',
                  })
                }
              }
              toast.success('Coaching product created!')
              onSuccess?.(createdProd, 'coaching')
              closeWizard()
            }}
          />
        )}


        {/* DIGITAL PRODUCT 3-STEP FORM */}
        {addModalType === 'digital_product' && (
          <div className="p-4 sm:p-6">
            <DigitalProductForm
              key={draftProductId || 'new-digital'}
              step={wizardStep}
              setStep={setWizardStep}
              product={productList.find((p) => p.id === draftProductId) || null}
              saveState={draftProductId ? draftSaveState : 'idle'}
              onPatch={() => setWizardDirty(true)}
              onComplete={finishDigitalProduct}
              onDirty={() => setWizardDirty(true)}
            />
          </div>
        )}

        {/* FORMS SUB-OPTIONS MENU */}
        {addModalType === 'forms_menu' && (
          <div className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-white">Select form type</p>
              <p className="text-sm text-[#96969D]">
                Choose how you want to collect responses from your audience
              </p>
            </div>
            <SelectableCardGrid>
              {FORM_TYPES.map((formItem) => {
                const FormIcon = formItem.icon
                return (
                  <SelectableCard
                    key={formItem.id}
                    selected={selectedFormType === formItem.id}
                    onSelect={() => {
                      setSelectedFormType(formItem.id)
                      setEditingFormSection(null)
                      setAddModalType('form_config')
                    }}
                    icon={<FormIcon className="h-5 w-5" />}
                    iconColor={formItem.iconHex}
                    title={formItem.title}
                    description={formItem.description}
                  />
                )
              })}
            </SelectableCardGrid>
          </div>
        )}

        {/* FORM CONFIGURATION VIEW */}
        {addModalType === 'form_config' && (
          <div className="p-card sm:p-card-lg overflow-y-auto no-scrollbar">
            <AddFormConfig
              formType={selectedFormType}
              initialProps={editingFormSection?.props}
              creatorEmail={creatorEmail}
              isEditing={Boolean(editingFormSection)}
              onCancel={() => {
                if (editingFormSection) {
                  closeWizard()
                  setEditingFormSection(null)
                } else {
                  setAddModalType('forms_menu')
                }
              }}
              onSubmit={async (formProps) => {
                if (editingFormSection) {
                  try {
                    if (editingFormSection.props?.formId) {
                      await api.patch(`/forms/${editingFormSection.props.formId}`, formProps)
                    }
                  } catch (e) {
                    console.warn('Backend form sync warning:', e)
                  }
                  onUpdateSectionProps?.(editingFormSection.id, formProps)
                  toast.success('Form updated successfully!')
                  setEditingFormSection(null)
                } else {
                  let createdForm = null
                  try {
                    const res = await api.post('/forms', {
                      ...formProps,
                      addToStore: false,
                      status: 'PUBLISHED',
                    })
                    createdForm = res?.form
                  } catch (e) {
                    console.warn('Backend form creation warning:', e)
                  }
                  const enrichedProps = createdForm ? { ...formProps, formId: createdForm.id } : formProps
                  if (onAddSection) {
                    onAddSection('form', enrichedProps)
                  }
                  toast.success('Form block added!')
                }
                onSuccess?.(formProps, 'form')
                closeWizard()
              }}
            />
          </div>
        )}

        {/* MEDIA CONFIGURATION VIEW */}
        {addModalType === 'media_config' && (
          <div className="p-card sm:p-card-lg overflow-y-auto no-scrollbar">
            <AddMediaConfig
              mediaType={selectedMediaType}
              initialProps={editingMediaSection?.props}
              isEditing={Boolean(editingMediaSection)}
              onCancel={() => {
                if (editingMediaSection) {
                  closeWizard()
                  setEditingMediaSection(null)
                } else {
                  setAddModalType('menu')
                }
              }}
              onSubmit={(mediaProps) => {
                const blockType =
                  mediaProps.mediaType || selectedMediaType
                if (editingMediaSection) {
                  onUpdateSectionProps?.(editingMediaSection.id, mediaProps)
                  toast.success('Media block updated!')
                  setEditingMediaSection(null)
                } else {
                  if (onAddSection) {
                    onAddSection(blockType, mediaProps)
                  }
                  toast.success('Media block added!')
                }
                onSuccess?.(mediaProps, 'media')
                closeWizard()
              }}
            />
          </div>
        )}

        {/* YOUTUBE MEDIA VIEW */}
        {addModalType === 'add_youtube' && (
          <AddYouTubeModalView
            onSelectVideo={(videoData) => {
              if (onAddSection) {
                onAddSection('youtube', {
                  title: videoData.title || 'YouTube Video',
                  url: videoData.canonicalUrl || videoData.url,
                  videoId: videoData.videoId || null,
                  thumbnail: videoData.thumbnailUrl || null,
                  customThumbnail: null,
                  layout: 'classic',
                  displayMode: 'classic',
                  mediaType: 'youtube',
                  embedType: 'youtube',
                })
              }
              closeWizard()
            }}
            onCancel={() => setAddModalType('menu')}
          />
        )}

        {/* TIKTOK, VIMEO & VIDEO VIEW */}
        {['add_tiktok', 'add_vimeo', 'add_video'].includes(addModalType) && (
          <AddMediaModalView
            mediaType={
              addModalType === 'add_tiktok'
                ? 'tiktok'
                : addModalType === 'add_vimeo'
                  ? 'vimeo'
                  : 'video'
            }
            onSelectVideo={(videoData) => {
              if (onAddSection) {
                const blockType = videoData.mediaType || (addModalType === 'add_tiktok' ? 'tiktok' : addModalType === 'add_vimeo' ? 'vimeo' : 'video')
                onAddSection(blockType, {
                  title: videoData.title || `${blockType.toUpperCase()} Video`,
                  url: videoData.canonicalUrl || videoData.url,
                  videoId: videoData.videoId || null,
                  thumbnail: videoData.thumbnailUrl || null,
                  customThumbnail: null,
                  layout: 'classic',
                  displayMode: 'classic',
                  mediaType: blockType,
                  embedType: blockType,
                  isUpload: Boolean(videoData.isUpload),
                  fileName: videoData.fileName || null,
                  fileSize: videoData.fileSize || null,
                })
              }
              closeWizard()
            }}
            onCancel={() => setAddModalType('menu')}
          />
        )}

        {/* SOCIAL DISPLAY SELECT VIEW */}
        {addModalType === 'social_display_select' && (
          <SocialDisplaySelectModalView
            platform={selectedSocialPlatform}
            isPro={canCreate}
            onOpenPricing={() => {
              setPricingModalOpen?.(true)
              closeWizard()
            }}
            onSelectStyle={async (styleKey) => {
              closeWizard()
              const platformInfo = getSocialPlatform(selectedSocialPlatform)
              const safeStyleKey = resolveSocialStyle(styleKey, platformInfo?.id)
              const defaultTitle = platformInfo?.name || 'Social'
              if (onAddSection) {
                onAddSection('social', {
                  platform: selectedSocialPlatform,
                  title: defaultTitle,
                  label: defaultTitle,
                  url: '',
                  layout: safeStyleKey === 'cards' ? 'image' : safeStyleKey,
                  displayMode: safeStyleKey === 'cards' ? 'featured' : safeStyleKey,
                  displayStyle: safeStyleKey,
                  thumbnail: null,
                  customThumbnail: null,
                })
              }
            }}
            onCancel={() => setAddModalType('menu')}
          />
        )}
      </div>
    )}
  </BaseModal>
  <ProductBundleModal
    isOpen={bundleModalOpen}
    existingBundle={editingBundle}
    onClose={() => setBundleModalOpen(false)}
    onSuccess={(created) => {
      setBundleModalOpen(false)
      onClose?.()
      onSuccess?.(created)
      onStoreUpdated?.()
    }}
  />
</>
)
}

export const AddToStoreWizard = AddToStoreModal
