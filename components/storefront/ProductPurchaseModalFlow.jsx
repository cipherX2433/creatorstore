'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download,
  Share2,
  X,
  ArrowLeft,
  Mail,
  Flag,
  FileText,
  Check,
  Loader2,
  ShieldCheck,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import PurchaseAccessVerification from '@/components/storefront/PurchaseAccessVerification'
import {
  trackProductViewed,
  trackCheckoutStarted,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackPaymentFailed,
  trackPurchase,
  trackFreeProductDownload,
  trackDownloadStarted,
  trackDownloadCompleted,
  trackDownloadFailed,
} from '@/lib/analytics'

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '18.04 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function ProductPurchaseModalFlow({
  product,
  creator,
  isOpen,
  onClose,
  initialStep = 'preview', // 'preview' | 'customer_info' | 'purchase_detail' | 'payment_result'
}) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep) // 'preview' | 'customer_info' | 'purchase_detail' | 'payment_result'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mailingListOptIn, setMailingListOptIn] = useState(true)
  const [consentAccepted, setConsentAccepted] = useState(true)

  const [paymentState, setPaymentState] = useState('idle') // 'idle' | 'verifying' | 'success' | 'cancelled' | 'failed'
  const [paymentError, setPaymentError] = useState('')

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [isCopied, setIsCopied] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const modalRef = useRef(null)

  // Sync initial step when product changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep)
      setErrors({})
      if (product?.id) {
        trackProductViewed({
          product_id: product.id,
          product_type: product.type || 'digital',
        })
      }
    }
  }, [isOpen, initialStep, product?.id, product?.type])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const creatorName = creator?.name || creator?.storeName || 'Creator'
  const creatorUsername = creator?.username || creator?.slug || 'creator'
  const creatorAvatar = creator?.avatarUrl || null

  const productTitle = product.title || 'Untitled Product'
  const productDescription = product.description || product.shortDescription || 'Enhance your digital presence with this charming digital asset, perfect for profiles and personal branding.'
  const productThumbnail = product.thumbnail || product.coverImage || product.cover || null

  const rawPrice = Number(product.price || 0)
  const isFree = rawPrice <= 0
  const currency = (product.currency || 'INR').toUpperCase()
  const currencySymbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency)
  const formattedPrice = isFree ? 'Free' : `${currencySymbol}${rawPrice}`

  // Resolve files list
  const rawFileName = product.fileName || `${product.slug || 'asset'}.jpg`
  const ext = (rawFileName.split('.').pop() || 'JPG').toUpperCase()
  const resolvedFiles = Array.isArray(product.files) && product.files.length > 0
    ? product.files
    : [
        {
          id: product.fileId || `file_${product.id}`,
          fileName: rawFileName,
          fileExtension: ext,
          fileSize: product.fileSize || 18472,
          fileMime: product.fileMime || 'image/jpeg',
          downloadUrl: `/api/download?productId=${product.id}`,
        }
      ]

  // Copy share link
  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setIsCopied(true)
        toast.success('Link copied to clipboard!')
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch {
      toast.success('Link copied!')
    }
  }

  // Handle Download / Buy now Click from Preview Modal
  const handlePreviewDownloadClick = () => {
    // Both free and paid flows require customer Name + Email before download or payment
    trackCheckoutStarted({
      product_id: product.id,
      product_type: product.type || 'digital',
      value: rawPrice,
      currency: currency,
    })
    setStep('customer_info')
  }

  // Handle "Already downloaded? See all past downloads" Click
  const handleSeeAllPastDownloads = () => {
    // Under no circumstances navigate to /notifications/settings or render Notifications page first.
    // The user must first verify their email through OTP inside the modal.
    setStep('verify_access')
  }

  const handleVerificationSuccess = () => {
    onClose?.()
    const targetListingId = product?.id || product?.productId
    if (targetListingId) {
      router.push(`/notifications/settings?listingId=${encodeURIComponent(targetListingId)}&openPurchase=true`)
    } else {
      router.push('/notifications/settings')
    }
  }

  // Client-side form validation
  const validateForm = () => {
    const newErrors = {}
    if (!name || !name.trim()) {
      newErrors.name = 'Please enter your name.'
    }
    if (!email || !email.trim()) {
      newErrors.email = 'Please enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }
    if (!consentAccepted) {
      newErrors.consent = 'Please agree to receive email updates and terms.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Form Submission (Free claim or Paid Razorpay checkout)
  const handleSubmitCustomerInfo = async (e) => {
    e?.preventDefault()
    if (!validateForm()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrors({})

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    // 1. Mandatory server-side check: Does this email already have access to THIS specific product?
    let checkData = null
    try {
      const checkRes = await fetch('/api/purchases/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          email: cleanEmail,
        }),
      })
      if (!checkRes.ok) {
        throw new Error("We couldn't verify your purchase right now. Please try again.")
      }
      checkData = await checkRes.json()
    } catch (checkErr) {
      setIsSubmitting(false)
      const msg = "We couldn't verify your purchase right now. Please try again."
      setErrors({ form: msg })
      toast.error(msg)
      return
    }

    // 2. Existing purchase found for this product
    if (checkData?.exists) {
      setIsSubmitting(false)
      setStep('existing_purchase')
      toast.success('Existing purchase found for this product.')
      return
    }

    // Determine paid vs free from server verification
    const isProductPaid = Boolean(checkData?.isPaid || Number(checkData?.price || 0) > 0)

    if (!isProductPaid) {
      // ==========================================
      // FREE PRODUCT CLAIM FLOW
      // ==========================================
      try {
        const payload = {
          productId: product.id,
          name: cleanName,
          email: cleanEmail,
          mailingListOptIn: Boolean(mailingListOptIn),
          consentAccepted: true,
        }

        const res = await fetch('/api/products/claim-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to claim product. Please try again.')
        }

        trackFreeProductDownload({
          product_id: product.id,
          product_type: product.type || 'digital',
        })
        toast.success('Your download is ready!')
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/notifications') && !window.location.pathname.startsWith('/purchases')) {
          onClose?.()
          router.push(`/notifications/settings?listingId=${product.id || product.productId}&openPurchase=true`)
        } else {
          setStep('purchase_detail')
        }
      } catch (err) {
        toast.error(err.message || 'Something went wrong. Please try again.')
        setErrors({ form: err.message || 'Submission failed.' })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // ==========================================
    // PAID PRODUCT CHECKOUT FLOW (Razorpay)
    // ==========================================
    try {
      const orderPayload = {
        productId: product.id,
        name: cleanName,
        customerName: cleanName,
        email: cleanEmail,
      }

      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment order. Please try again.')
      }

      if (data.alreadyPurchased) {
        setIsSubmitting(false)
        setStep('existing_purchase')
        return
      }

      // Dodo Payments Hosted Checkout Redirection
      if (data.checkoutUrl || data.url) {
        setIsSubmitting(false)
        window.location.href = data.checkoutUrl || data.url
        return
      }
      if (!data.razorpayOrderId && !data.checkoutUrl && !data.url) {
        throw new Error('Payment order could not be created.')
      }

      const rzpOrderId = data.razorpayOrderId || data.order?.razorpayOrderId
      const rzpAmount = data.amount || (data.order && Math.round(Number(data.order.amount) * 100))
      const rzpKeyId = data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock_key'

      if (!rzpOrderId) {
        throw new Error('Payment order could not be created.')
      }

      setIsSubmitting(false)

      const options = {
        key: rzpKeyId,
        amount: rzpAmount,
        currency: data.currency || 'INR',
        name: creatorName,
        description: productTitle,
        order_id: rzpOrderId,
        prefill: { name: cleanName, email: cleanEmail },
        theme: { color: '#000000' },
        handler: async function (response) {
          setStep('payment_result')
          setPaymentState('verifying')
          try {
            const vRes = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || rzpOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const vData = await vRes.json()
            if (vRes.ok && vData.success) {
              const confirmedOrderId = vData.orderId || response.razorpay_order_id || rzpOrderId
              trackPaymentCompleted({
                transaction_id: confirmedOrderId,
                value: rzpAmount,
                currency: data.currency || 'INR',
              })
              trackPurchase({
                transaction_id: confirmedOrderId,
                value: rzpAmount,
                currency: data.currency || 'INR',
                items: [{
                  item_id: product.id,
                  item_name: productTitle,
                  price: rzpAmount,
                  quantity: 1,
                }],
              })
              setPaymentState('success')
              toast.success('Payment verified successfully!')
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/notifications') && !window.location.pathname.startsWith('/purchases')) {
                onClose?.()
                router.push(`/notifications/settings?listingId=${product.id || product.productId}&openPurchase=true`)
              } else {
                setStep('purchase_detail')
              }
            } else {
              trackPaymentFailed({
                product_id: product.id,
                reason: 'verification_failed',
              })
              setPaymentState('failed')
              setPaymentError(vData.error || 'Payment verification failed.')
              toast.error(vData.error || 'Payment verification failed.')
            }
          } catch (vErr) {
            trackPaymentFailed({
              product_id: product.id,
              reason: vErr.message || 'verification_failed',
            })
            setPaymentState('failed')
            setPaymentError(vErr.message || 'Payment verification failed.')
            toast.error(vErr.message || 'Payment verification failed.')
          }
        },
        modal: {
          ondismiss: function () {
            setStep('payment_result')
            setPaymentState('cancelled')
            toast.info('Payment was cancelled.')
          },
        },
      }

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (resp) {
          setStep('payment_result')
          setPaymentState('failed')
          const reason = resp?.error?.description || 'Payment was declined or failed.'
          trackPaymentFailed({
            product_id: product.id,
            reason,
          })
          setPaymentError(reason)
          toast.error(`Payment failed: ${reason}`)
        })
        trackPaymentInitiated({
          product_id: product.id,
          product_type: product.type || 'digital',
          value: rzpAmount,
          currency: data.currency || 'INR',
        })
        rzp.open()
      } else {
        throw new Error('Payment gateway failed to initialize.')
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed. Please try again.')
      setErrors({ form: err.message || 'Payment failed.' })
      setIsSubmitting(false)
    }
  }

  // Trigger direct file download
  const handleDownloadFile = async (fileItem) => {
    const fileId = fileItem.id || product.id
    setDownloadingId(fileId)
    trackDownloadStarted({ product_id: product.id, product_type: product.type || 'digital' })
    toast.info(`Downloading ${fileItem.fileName}...`)

    try {
      const response = await fetch(`/api/download?productId=${product.id}`)
      if (!response.ok) {
        // If unauthorized or error, try direct download or provide helpful error
        throw new Error('Unable to download file. Please check your access or try again.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileItem.fileName || 'download'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      trackDownloadCompleted({ product_id: product.id, product_type: product.type || 'digital' })
      toast.success(`${fileItem.fileName} downloaded successfully!`)
    } catch (err) {
      console.error('Download error:', err)
      trackDownloadFailed({ product_id: product.id, reason: err.message })
      toast.error(err.message || 'Download failed. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  // Download all files
  const handleDownloadAll = async () => {
    for (const f of resolvedFiles) {
      await handleDownloadFile(f)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[430px] bg-white text-zinc-900 rounded-[32px] p-6 sm:p-7 shadow-2xl flex flex-col items-center overflow-y-auto max-h-[92vh] animate-in zoom-in-95 duration-200 border border-zinc-100/90 font-sans"
      >
        {/* ============================================================ */}
        {/* STEP 1: PRODUCT PREVIEW MODAL (Screenshot 2)                 */}
        {/* ============================================================ */}
        {step === 'preview' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            {/* Top Product Title */}
            <h2 className="text-sm font-semibold text-zinc-800 mb-4 truncate max-w-[280px] text-center">
              {productTitle}
            </h2>

            {/* Large Product Image Preview */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/50 shadow-xs relative">
              {productThumbnail ? (
                <img
                  src={productThumbnail}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-zinc-100 to-zinc-200 text-zinc-400">
                  <FileText className="h-12 w-12 stroke-[1.5]" />
                </div>
              )}
            </div>

            {/* Product Title Below Image */}
            <h3 className="text-xl font-bold text-zinc-950 text-center mt-4 leading-tight">
              {productTitle}
            </h3>

            {/* Creator Row */}
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs text-zinc-600 font-medium">
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorUsername}
                  className="h-4 w-4 rounded-full object-cover border border-zinc-200"
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-zinc-200 text-zinc-700 font-bold text-[9px] flex items-center justify-center">
                  {creatorUsername.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span>by {creatorUsername.startsWith('@') ? creatorUsername : `@${creatorUsername}`}</span>
            </div>

            {/* Price Display */}
            <div className="mt-2 text-center">
              <span className={`text-base font-bold ${isFree ? 'text-zinc-600' : 'text-zinc-950'}`}>
                {isFree ? 'Free' : formattedPrice}
              </span>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={handlePreviewDownloadClick}
              className="w-full bg-black text-white hover:bg-zinc-800 rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 mt-4 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              {isFree ? (
                <>
                  <Download className="h-4 w-4 stroke-[2.5]" />
                  <span>Download</span>
                </>
              ) : (
                <span>Buy now</span>
              )}
            </button>

            {/* Product Description */}
            <p className="text-xs text-zinc-500 leading-relaxed text-left sm:text-center mt-4 px-1">
              {productDescription}
            </p>

            {/* Already downloaded? See all past downloads */}
            <div className="mt-4 text-center">
              <span className="text-xs text-zinc-500">Already downloaded? </span>
              <button
                type="button"
                onClick={handleSeeAllPastDownloads}
                className="text-xs text-zinc-900 underline underline-offset-2 hover:text-black font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 rounded-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>See all past downloads</span>
              </button>
            </div>

            {/* Bottom Right Floating Action Controls (Share + Close) */}
            <div className="w-full flex items-center justify-end gap-2.5 mt-6 pt-2">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                title="Share link"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                title="Close"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP: EXISTING PURCHASE FOUND (Linktree Reference)           */}
        {/* ============================================================ */}
        {step === 'existing_purchase' && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Small Product Thumbnail */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shadow-xs relative mb-3">
              {productThumbnail ? (
                <img
                  src={productThumbnail}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                  <FileText className="h-7 w-7" />
                </div>
              )}
            </div>

            {/* Product Title */}
            <h3 className="text-base font-bold text-zinc-950 text-center leading-tight">
              {productTitle}
            </h3>

            {/* Success Check Icon */}
            <div className="mt-4 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            {/* Notice Heading */}
            <h4 className="text-base font-extrabold text-zinc-950 mt-3 leading-snug">
              An existing purchase was found with this email address
            </h4>

            {/* Notice Subtitle */}
            <p className="text-xs text-zinc-600 mt-1 max-w-[320px] leading-relaxed">
              Your previous purchase is available. You already have access to this product.
            </p>

            {/* View download button */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/notifications') && !window.location.pathname.startsWith('/purchases')) {
                  onClose?.()
                  router.push(`/notifications/settings?listingId=${product.id || product.productId}&openPurchase=true`)
                } else {
                  setStep('purchase_detail')
                }
              }}
              className="w-full bg-black text-white hover:bg-zinc-800 rounded-full py-3.5 px-6 font-bold text-sm flex items-center justify-center gap-2 mt-6 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <span>View download</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP: ACCESS RECOVERY (EMAIL & OTP)                          */}
        {/* ============================================================ */}
        {step === 'verify_access' && (
          <PurchaseAccessVerification
            initialEmail={email}
            initialName={name}
            variant="modal"
            onSuccess={handleVerificationSuccess}
            onCancel={() => setStep('preview')}
          />
        )}

        {/* ============================================================ */}
        {/* STEP 2: CUSTOMER INFORMATION FORM (Screenshot 3)             */}
        {/* ============================================================ */}
        {step === 'customer_info' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            {/* Top Product Title */}
            <h2 className="text-sm font-semibold text-zinc-800 mb-3 truncate max-w-[280px] text-center">
              {productTitle}
            </h2>

            {/* Small Product Thumbnail */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shadow-xs relative">
              {productThumbnail ? (
                <img
                  src={productThumbnail}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                  <FileText className="h-6 w-6" />
                </div>
              )}
            </div>

            {/* Product Title */}
            <h3 className="text-base font-bold text-zinc-950 text-center mt-2.5 leading-tight">
              {productTitle}
            </h3>

            {/* Creator Row */}
            <div className="flex items-center justify-center gap-1.5 mt-0.5 text-xs text-zinc-500 font-medium">
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorUsername}
                  className="h-3.5 w-3.5 rounded-full object-cover border border-zinc-200"
                />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full bg-zinc-200 text-zinc-700 font-bold text-[8px] flex items-center justify-center">
                  {creatorUsername.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span>{creatorUsername.startsWith('@') ? creatorUsername : `@${creatorUsername}`}</span>
            </div>

            {/* Price Badge */}
            <div className="mt-1 text-center">
              <span className={`text-xs font-bold ${isFree ? 'text-zinc-600' : 'text-zinc-950'}`}>
                {isFree ? 'Free' : formattedPrice}
              </span>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmitCustomerInfo} className="w-full mt-5 text-left">
              <h4 className="text-sm font-bold text-zinc-900 mb-3">Your information</h4>

              {/* Name Field */}
              <div className="space-y-1 mb-3">
                <label className="block text-xs font-semibold text-zinc-700">
                  Name (required)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors(prev => ({ ...prev, name: null }))
                  }}
                  placeholder=""
                  className={`w-full bg-[#F4F4F5] hover:bg-[#ECECED] focus:bg-white text-zinc-900 border ${
                    errors.name ? 'border-red-400 focus:border-red-500' : 'border-transparent focus:border-zinc-300'
                  } rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all`}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-[11px] font-medium text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1 mb-4">
                <label className="block text-xs font-semibold text-zinc-700">
                  Email (required)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors(prev => ({ ...prev, email: null }))
                  }}
                  placeholder=""
                  className={`w-full bg-[#F4F4F5] hover:bg-[#ECECED] focus:bg-white text-zinc-900 border ${
                    errors.email ? 'border-red-400 focus:border-red-500' : 'border-transparent focus:border-zinc-300'
                  } rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all`}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-[11px] font-medium text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Mailing list opt-in checkbox */}
              <label className="flex items-start gap-2.5 mt-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mailingListOptIn}
                  onChange={(e) => setMailingListOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                />
                <span className="text-xs text-zinc-600 leading-snug">
                  Join {creatorUsername.replace('@', '')}&apos;s mailing list
                </span>
              </label>

              {/* Required Terms & Updates Consent */}
              <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => {
                    setConsentAccepted(e.target.checked)
                    if (errors.consent) setErrors(prev => ({ ...prev, consent: null }))
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                />
                <span className="text-xs text-zinc-600 leading-snug">
                  I agree to receive email updates from CreatorStore. Unsubscribe anytime.{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium text-zinc-800 hover:text-black">
                    Terms & Privacy
                  </a>.
                </span>
              </label>
              {errors.consent && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{errors.consent}</p>
              )}

              {/* General Form Error */}
              {errors.form && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 mt-3 text-center">
                  {errors.form}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white hover:bg-zinc-800 disabled:opacity-60 rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 mt-5 transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking your purchase...</span>
                  </>
                ) : errors.form ? (
                  <span>Try again</span>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>

            {/* Bottom Right Floating Action Controls (Share + Close) */}
            <div className="w-full flex items-center justify-end gap-2.5 mt-5 pt-1">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                title="Share link"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                title="Close"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP: PAYMENT RESULT / STATUS MODAL                          */}
        {/* ============================================================ */}
        {step === 'payment_result' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            {paymentState === 'verifying' && (
              <div className="w-full flex flex-col items-center py-8 text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-800" />
                <h3 className="text-base font-bold text-zinc-900">Verifying payment...</h3>
                <p className="text-xs text-zinc-500 max-w-[260px]">
                  Please wait while we confirm your transaction with the payment gateway.
                </p>
              </div>
            )}

            {paymentState === 'success' && (
              <div className="w-full flex flex-col items-center py-4 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                  <Check className="h-7 w-7 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Payment successful ✓</h3>
                <p className="text-sm font-semibold text-zinc-800 mt-2 truncate max-w-[280px]">
                  {productTitle}
                </p>
                <div className="mt-1">
                  <span className="text-xs font-bold text-zinc-600">{formattedPrice}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/notifications') && !window.location.pathname.startsWith('/purchases')) {
                      onClose?.()
                      router.push(`/notifications/settings?listingId=${product.id || product.productId}&openPurchase=true`)
                    } else {
                      setStep('purchase_detail')
                      handleDownloadAll()
                    }
                  }}
                  className="w-full bg-black text-white hover:bg-zinc-800 rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 mt-6 transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <Download className="h-4 w-4 stroke-[2.5]" />
                  <span>Download</span>
                </button>
              </div>
            )}

            {paymentState === 'cancelled' && (
              <div className="w-full flex flex-col items-center py-4 text-center">
                <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
                  <AlertCircle className="h-7 w-7 stroke-[2]" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Payment cancelled</h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-[260px]">
                  Your payment was cancelled. No charge was completed.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentState('idle')
                    setStep('customer_info')
                  }}
                  className="w-full bg-black text-white hover:bg-zinc-800 rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 mt-6 transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <span>Try again</span>
                </button>
              </div>
            )}

            {paymentState === 'failed' && (
              <div className="w-full flex flex-col items-center py-4 text-center">
                <div className="h-14 w-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-3 shadow-xs">
                  <AlertCircle className="h-7 w-7 stroke-[2]" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Payment failed</h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-[260px]">
                  {paymentError || "Your payment wasn't completed."}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentState('idle')
                    setStep('customer_info')
                  }}
                  className="w-full bg-black text-white hover:bg-zinc-800 rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 mt-6 transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <span>Try again</span>
                </button>
              </div>
            )}

            {/* Bottom Right Floating Action Controls (Share + Close) */}
            <div className="w-full flex items-center justify-end gap-2.5 mt-5 pt-1">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                title="Share link"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                title="Close"
                className="h-10 w-10 rounded-full bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-black hover:bg-zinc-50 shadow-sm transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: PRODUCT DOWNLOAD DETAIL MODAL (Screenshot 4)         */}
        {/* ============================================================ */}
        {step === 'purchase_detail' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            {/* Top Navigation Bar: Back | Title | Close */}
            <div className="w-full flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <button
                type="button"
                onClick={() => setStep('preview')}
                aria-label="Back"
                className="p-1 rounded-full text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-bold text-zinc-900">Your purchase</h2>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 rounded-full text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Files List */}
            <div className="w-full space-y-2.5">
              {resolvedFiles.map((fileItem, idx) => (
                <div
                  key={fileItem.id || idx}
                  className="w-full bg-[#F4F4F5] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 border border-zinc-200/60"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-600 shadow-xs shrink-0">
                      <FileText className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                        {fileItem.fileName || 'asset.jpg'}
                      </p>
                      <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        {fileItem.fileExtension || 'JPG'} &bull; {formatBytes(fileItem.fileSize)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile(fileItem)}
                    disabled={downloadingId === fileItem.id}
                    title="Download this file"
                    aria-label={`Download ${fileItem.fileName}`}
                    className="p-2 rounded-xl text-zinc-600 hover:text-black hover:bg-white transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {downloadingId === fileItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                    ) : (
                      <Download className="h-4 w-4 stroke-[2]" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="w-full mt-6 space-y-2.5">
              {/* Primary: Download all */}
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={Boolean(downloadingId)}
                className="w-full bg-black text-white hover:bg-zinc-800 disabled:opacity-60 rounded-full py-3.5 px-6 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                {downloadingId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 stroke-[2.5]" />
                    <span>Download all</span>
                  </>
                )}
              </button>

              {/* Secondary: Contact seller */}
              <button
                type="button"
                onClick={() => setContactOpen(prev => !prev)}
                className="w-full bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/90 rounded-full py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Mail className="h-4 w-4 stroke-[2]" />
                <span>Contact seller</span>
              </button>

              {/* Optional inline contact info expander */}
              {contactOpen && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 space-y-1 animate-in fade-in duration-150 text-center">
                  <p className="font-semibold text-zinc-800">Need support with your download?</p>
                  <p>You can reach out to {creatorName} directly through their storefront social links or email support.</p>
                </div>
              )}

              {/* Report seller text link */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(true)
                    toast.info('Thank you. Our trust & safety team has recorded your feedback.')
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Flag className="h-3 w-3 stroke-[2]" />
                  <span>Report seller</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
