'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, ArrowRight, ShieldCheck, Lock, PlayCircle, Clock, Check,
  GraduationCap, Package, Sparkles, FileText, Download,
  Users, Award, HelpCircle, CheckCircle2, Loader2, Store, Video, Globe, BookOpen,
  Calendar, Layers, MessageSquare, User, Mail, Share2, Tag, X
} from 'lucide-react'
import CoachingBookingWidget from '@/components/coaching/CoachingBookingWidget'
import CommunityWidget from '@/components/community/CommunityWidget'
import WebinarWidget from '@/components/webinar/WebinarWidget'
import MembershipWidget from '@/components/membership/MembershipWidget'
import CustomServiceWidget from '@/components/custom-service/CustomServiceWidget'
import ExternalLinkWidget from '@/components/external-link/ExternalLinkWidget'
import BookingWidget from '@/components/booking/BookingWidget'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'
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

export default function ProductPurchasePage({ username, slug, productId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [buying, setBuying] = useState(false)
  const [buyingStep, setBuyingStep] = useState('idle') // 'idle' | 'creating_order' | 'opening_razorpay' | 'verifying'
  const [paymentStatus, setPaymentStatus] = useState('idle') // 'idle' | 'success' | 'failed' | 'cancelled'
  const [errorMessage, setErrorMessage] = useState('')
  const [isOwned, setIsOwned] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const [heroIndex, setHeroIndex] = useState(0)
  const [showStickyCta, setShowStickyCta] = useState(false)

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [showCouponInput, setShowCouponInput] = useState(false)

  // Load saved customer name and email from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      const savedName = localStorage.getItem('creatorzero_customer_name') || ''
      if (savedEmail) {
        setEmail(savedEmail)
      }
      if (savedName) {
        setName(savedName)
      }
    }
  }, [])

  // Analytics event tracking helper
  useEffect(() => {
    if (data?.product?.id) {
      trackProductViewed({
        product_id: data.product.id,
        product_type: data.product.type || 'digital',
      })
    }
  }, [data?.product?.id, data?.product?.type])

  // Auto scroll & focus to checkout customer info if ?checkout=1 or ?ref= parameter is present
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && data) {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.has('checkout') || searchParams.has('ref')) {
        const timer = setTimeout(() => {
          const el = document.getElementById('checkout-customer-info')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const nameInput = document.getElementById('checkout-name')
            if (nameInput && !nameInput.value) {
              nameInput.focus({ preventScroll: true })
            }
          }
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [loading, data])

  // Load product or course data
  useEffect(() => {
    let mounted = true
    setLoading(true)

    // Load Razorpay script
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }

    if (productId) {
      api.get(`/checkout/product?productId=${productId}`)
        .then((res) => { if (mounted) { setData(res); setLoading(false) } })
        .catch(() => { if (mounted) { setNotFound(true); setLoading(false) } })
    } else if (username && slug) {
      api.get(`/public/course/${username}/${slug}`)
        .then((res) => {
          if (mounted) {
            setData(res)
            setLoading(false)
          }
        })
        .catch(() => {
          api.get(`/public/product/${username}/${slug}`)
            .then((res) => { if (mounted) { setData(res); setLoading(false) } })
            .catch(() => { if (mounted) { setNotFound(true); setLoading(false) } })
        })
    }

    return () => { mounted = false }
  }, [username, slug, productId])

  // Check entitlement persistence on page load & email change (supports guest session cookie)
  useEffect(() => {
    if (!data) return
    const prod = data.product || (data.course ? { ...data.course, price: data.product?.price } : {})
    const crs = data.course
    const targetEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : '')

    let mounted = true
    const prodId = prod.id
    const crsId = crs?.id
    const query = targetEmail
      ? `?email=${encodeURIComponent(targetEmail)}&productId=${prodId || ''}&courseId=${crsId || ''}`
      : `?productId=${prodId || ''}&courseId=${crsId || ''}`

    api.get(`/checkout/check-access${query}`)
      .then((res) => {
        if (mounted && res.hasAccess) {
          setIsOwned(true)
          if (res.email && !email) {
            setEmail(res.email)
            if (typeof window !== 'undefined') {
              localStorage.setItem('creatorzero_customer_email', res.email)
            }
          }
        }
      })
      .catch(() => { })

    return () => { mounted = false }
  }, [data, email])

  useEffect(() => {
    function onScroll() {
      setShowStickyCta(window.scrollY > 420)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return <ProductSkeleton />

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#12141c] p-6 text-center text-white selection:bg-primary selection:text-black">
        <div className="max-w-md w-full bg-[#000000] p-8 rounded-2xl border border-white/10 shadow-2xl space-y-5">
          <div className="h-16 w-16 bg-[#12141c] border border-white/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Product Not Found</h1>
            <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
              This product or course is unavailable, private, or has been moved by the creator.
            </p>
          </div>
          <div className="pt-2">
            <Link href={username ? `/${username}` : '/'}>
              <Button variant="default" size="lg" className="w-full font-black">
                Return to Storefront
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const product = data.product || (data.course ? { ...data.course, price: data.product?.price } : {})
  const course = data.course
  const creator = data.creator || {}
  const isFree = Number(product.price) === 0
  const creatorUsername = creator.username || username
  const creatorName = creator.name || creatorUsername || 'Creator'
  const isCourse = product.type === 'COURSE' || !!course
  const productTitle = product.title || course?.title || 'Product'

  // Dynamic Product Type Label Helper
  function getProductTypeLabel(type) {
    const rawType = (type || '').toUpperCase()
    if (rawType === 'DIGITAL_DOWNLOAD') return 'DIGITAL DOWNLOAD'
    if (rawType === 'COURSE' || isCourse) return 'COURSE'
    if (rawType === 'EBOOK') return 'E-BOOK'
    if (rawType === 'MEMBERSHIP') return 'MEMBERSHIP'
    if (rawType === 'COACHING') return 'BOOKING'
    if (rawType === 'CUSTOM_SERVICE' || rawType === 'CUSTOM_PRODUCT') return 'SERVICE'
    if (rawType === 'WEBINAR') return 'WEBINAR'
    if (rawType === 'COMMUNITY') return 'COMMUNITY'
    if (rawType === 'EXTERNAL_LINK') return 'EXTERNAL LINK'
    return rawType.replace('_', ' ') || 'DIGITAL ITEM'
  }

  // Dynamic Icon Helper for Fallback Product Cover
  function getProductTypeIcon(type) {
    const rawType = (type || '').toUpperCase()
    if (rawType === 'COURSE' || isCourse) return GraduationCap
    if (rawType === 'EBOOK') return BookOpen
    if (rawType === 'COACHING') return Calendar
    if (rawType === 'COMMUNITY' || rawType === 'MEMBERSHIP') return Users
    if (rawType === 'WEBINAR') return Video
    return Package
  }

  // Post-purchase dynamic CTA helper
  function getPostPurchaseCTA(prod, isCrs) {
    const type = (prod?.type || '').toUpperCase()
    if (isCrs || type === 'COURSE') {
      return { label: 'START LEARNING', icon: ArrowRight, verb: 'course' }
    }
    if (type === 'COACHING') {
      return { label: 'VIEW BOOKED SESSION', icon: Video, verb: 'coaching' }
    }
    if (type === 'COMMUNITY') {
      return { label: 'ENTER COMMUNITY FEED', icon: Users, verb: 'community' }
    }
    if (type === 'DIGITAL_DOWNLOAD') {
      return { label: 'DOWNLOAD PRODUCT', icon: Download, verb: 'download' }
    }
    if (type === 'MEMBERSHIP') {
      return { label: 'OPEN MEMBERSHIP', icon: Users, verb: 'membership' }
    }
    if (type === 'WEBINAR') {
      return { label: 'VIEW EVENT', icon: Clock, verb: 'webinar' }
    }
    if (type === 'EXTERNAL_LINK') {
      return { label: 'CONTINUE TO LINK', icon: ArrowRight, verb: 'content' }
    }
    return { label: 'DOWNLOAD PRODUCT', icon: Download, verb: 'product' }
  }

  // Discount Calculation
  const hasDiscount = product.originalPrice && Number(product.originalPrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
    : 0

  const priceDisplay = isFree ? 'FREE' : formatMoney(product.price, product.currency)
  const origPriceDisplay = product.originalPrice ? formatMoney(product.originalPrice, product.currency) : null

  // Focus & highlight Customer Info fields on validation error or mobile sticky CTA tap
  function focusCustomerInfo() {
    if (typeof window === 'undefined') return
    const container = document.getElementById('checkout-customer-info')
    const nameInput = document.getElementById('checkout-name')
    const emailInput = document.getElementById('checkout-email')

    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'center' })
      container.classList.add('ring-2', 'ring-primary', 'shadow-brand')
      setTimeout(() => {
        container.classList.remove('ring-2', 'ring-primary', 'shadow-brand')
      }, 3000)
    }

    if (nameInput && !nameInput.value.trim()) {
      setTimeout(() => nameInput.focus({ preventScroll: true }), 250)
    } else if (emailInput && !emailInput.value.trim()) {
      setTimeout(() => emailInput.focus({ preventScroll: true }), 250)
    }
  }

  // Validation function for checkout customer inputs
  function validateForm() {
    let valid = true
    setNameError('')
    setEmailError('')

    const trimmedName = name ? name.trim() : ''
    if (!trimmedName) {
      setNameError('Please enter your full name.')
      valid = false
    } else if (trimmedName.length > 100) {
      setNameError('Name is too long (maximum 100 characters).')
      valid = false
    }

    const trimmedEmail = email ? email.trim().toLowerCase() : ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail) {
      setEmailError('Please enter a valid email address.')
      valid = false
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.')
      valid = false
    }

    if (!valid) {
      focusCustomerInfo()
    }

    return valid
  }

  // Coupon Handlers
  async function handleApplyCoupon(e) {
    e?.preventDefault()
    const trimmed = couponCodeInput.toUpperCase().trim()
    if (!trimmed) {
      toast.error('Please enter a coupon code')
      return
    }
    if (!product?.id || !product?.creatorId) return

    setValidatingCoupon(true)
    try {
      const res = await api.post('/checkout/validate-coupon', {
        creatorId: product.creatorId,
        productId: product.id,
        code: trimmed,
        basePrice: Number(product.price || 0),
      })
      if (res && res.valid) {
        setAppliedCoupon(res)
        toast.success(`Coupon '${res.couponCode}' applied! You saved ${formatMoney(res.discountAmount, product.currency || 'INR')}`)
      } else {
        toast.error(res?.message || 'Invalid coupon code.')
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired coupon code.')
    } finally {
      setValidatingCoupon(false)
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponCodeInput('')
    toast.info('Coupon removed.')
  }

  // Purchase Handler (Razorpay Payment / Free Access)
  async function handlePurchase(e) {
    e?.preventDefault()

    if (!validateForm()) {
      const el = document.getElementById('checkout-customer-info')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    if (product?.type === 'COACHING' && !selectedSlot) {
      toast.error('Please select a date and time slot for your coaching session first')
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', cleanEmail)
      localStorage.setItem('creatorzero_customer_name', cleanName)
    }

    setBuying(true)
    setBuyingStep('creating_order')
    setPaymentStatus('idle')
    setErrorMessage('')

    trackCheckoutStarted({
      product_id: product.id,
      product_type: product.type,
      value: product.price,
      currency: product.currency,
    })

    try {
      const payload = {
        productId: product.id,
        email: cleanEmail,
        name: cleanName,
        customerName: cleanName,
        couponCode: appliedCoupon?.couponCode || null,
      }
      if (product?.type === 'COACHING' && selectedSlot) {
        payload.bookingDetails = {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          answers: selectedSlot.answers,
          customerName: cleanName,
        }
      }
      const res = await api.post('/checkout', payload)

      if (res.isFree) {
        trackFreeProductDownload({
          product_id: product.id,
          product_type: product.type,
        })
        setPaymentStatus('success')
        setIsOwned(true)
        setCompletedOrder(res)
        setBuying(false)
        setBuyingStep('idle')
        toast.success('Access granted! Enjoy your product.')
        return
      }

      if (res.url) {
        window.location.href = res.url
        return
      }

      if (res.razorpayOrderId) {
        setBuyingStep('opening_razorpay')

        // Ensure Razorpay script is loaded dynamically if not yet on window
        if (typeof window !== 'undefined' && !window.Razorpay) {
          await new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
          })
        }

        const options = {
          key: res.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock_key',
          amount: res.amount,
          currency: res.currency || 'INR',
          name: res.productTitle || productTitle,
          description: `Purchase: ${res.productTitle || productTitle}`,
          order_id: res.razorpayOrderId,
          prefill: { email: cleanEmail, name: cleanName },
          theme: { color: 'var(--primary)' },
          handler: async function (response) {
            setBuyingStep('verifying')
            try {
              const verifyRes = await api.post('/checkout/verify', {
                razorpay_order_id: response.razorpay_order_id || res.razorpayOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })

              if (verifyRes.success) {
                const confirmedOrderId = verifyRes.orderId || res.razorpayOrderId || response.razorpay_order_id
                trackPaymentCompleted({
                  transaction_id: confirmedOrderId,
                  value: res.amount,
                  currency: res.currency || 'INR',
                })
                trackPurchase({
                  transaction_id: confirmedOrderId,
                  value: res.amount,
                  currency: res.currency || 'INR',
                  items: [{
                    item_id: product.id,
                    item_name: product.title,
                    price: res.amount,
                    quantity: 1,
                  }],
                })
                setPaymentStatus('success')
                setIsOwned(true)
                setCompletedOrder(res)
                toast.success('Payment successful!')
              } else {
                trackPaymentFailed({
                  product_id: product.id,
                  reason: 'verification_failed',
                })
                setPaymentStatus('failed')
                setErrorMessage('Payment verification failed. Please contact support if money was deducted.')
                toast.error('Payment verification failed.')
              }
            } catch (err) {
              trackPaymentFailed({
                product_id: product.id,
                reason: err.message || 'verification_failed',
              })
              setPaymentStatus('failed')
              setErrorMessage(err.message || 'Payment verification failed.')
              toast.error(err.message || 'Payment verification failed.')
            } finally {
              setBuying(false)
              setBuyingStep('idle')
            }
          },
          modal: {
            ondismiss: function () {
              setBuying(false)
              setBuyingStep('idle')
              setPaymentStatus('cancelled')
              toast.info('Payment was cancelled. No charge was completed.')
            },
          },
        }

        if (typeof window !== 'undefined' && window.Razorpay) {
          const rzp = new window.Razorpay(options)
          rzp.on('payment.failed', function (resp) {
            setBuying(false)
            setBuyingStep('idle')
            setPaymentStatus('failed')
            const reason = resp?.error?.description || 'Payment failed or declined.'
            trackPaymentFailed({
              product_id: product.id,
              reason,
            })
            setErrorMessage(reason)
            toast.error(`Payment failed: ${reason}`)
          })
          trackPaymentInitiated({
            product_id: product.id,
            product_type: product.type,
            value: res.amount,
            currency: res.currency || 'INR',
          })
          rzp.open()
        } else {
          setBuying(false)
          setBuyingStep('idle')
          setPaymentStatus('failed')
          toast.error('Failed to load secure payment gateway. Please check your network connection.')
        }
      } else {
        // Free item or zero price order
        trackFreeProductDownload({
          product_id: product.id,
          product_type: product.type,
        })
        setPaymentStatus('success')
        setIsOwned(true)
        setCompletedOrder(res)
        toast.success('Access granted!')
        setBuying(false)
        setBuyingStep('idle')
      }
    } catch (err) {
      setBuying(false)
      setBuyingStep('idle')
      setPaymentStatus('failed')
      const msg = err.message || 'Payment is temporarily unavailable. Please try again later.'
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  const FallbackCoverIcon = getProductTypeIcon(product.type)
  const featureItems = (product.benefits || []).filter(Boolean)
  const heroImages = [...new Set([
    product.coverImage,
    product.thumbnail,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter(Boolean))]
  const effectivePrice = appliedCoupon ? appliedCoupon.finalAmount : Number(product.price || 0)
  const ctaLabel = (isFree || (appliedCoupon && appliedCoupon.finalAmount === 0))
    ? 'Get Access'
    : (appliedCoupon ? `Pay ${formatMoney(appliedCoupon.finalAmount, product.currency || 'INR')}` : (isFree ? 'Get Access' : 'Buy Now'))
  const checkoutInputClass = (hasError) =>
    `h-12 w-full rounded-control border bg-[#FFFFFF] p-3 text-body text-[#000000] placeholder:text-black/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${hasError ? 'border-error' : 'border-black/25'
    }`

  async function handleProductAccess() {
    if (downloading) return
    const targetEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : '') || ''
    const prodType = (product?.type || '').toUpperCase()

    if (isCourse || prodType === 'COURSE') {
      router.push(`/learn/${course?.id || product.id}${targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : ''}`)
      return
    }
    if (prodType === 'COMMUNITY') {
      router.push(`/community/${product.id}`)
      return
    }
    if (prodType === 'WEBINAR') {
      router.push('/account/webinars')
      return
    }
    if (prodType === 'MEMBERSHIP') {
      router.push('/account/memberships')
      return
    }
    if (prodType === 'CUSTOM_SERVICE' || prodType === 'CUSTOM_PRODUCT') {
      router.push('/account/custom-services')
      return
    }
    if (prodType === 'EXTERNAL_LINK') {
      router.push('/account/external-links')
      return
    }
    if (prodType === 'COACHING') {
      router.push('/account/coaching')
      return
    }

    // Direct digital download flow from current product page (streams binary blob directly)
    setDownloading(true)
    trackDownloadStarted({ product_id: product.id, product_type: product.type })
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ productId: product.id }),
      })

      if (!response.ok) {
        let errMessage = 'Unable to download the product. Please try again.'
        try {
          const errData = await response.json()
          errMessage = errData?.message || errData?.error || errMessage
        } catch { }
        throw new Error(errMessage)
      }

      // Extract filename from Content-Disposition header if available
      let downloadFileName = product?.fileName || `${product?.title || 'download'}.pdf`
      const disposition = response.headers.get('content-disposition')
      if (disposition && disposition.includes('filename')) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n"']*)/i)
        const regularMatch = disposition.match(/filename=['"]?([^;\r\n"']*)['"]?/i)
        if (utf8Match && utf8Match[1]) {
          downloadFileName = decodeURIComponent(utf8Match[1].trim())
        } else if (regularMatch && regularMatch[1]) {
          downloadFileName = decodeURIComponent(regularMatch[1].trim())
        }
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      // Ephemeral trigger - preserves canonical product page URL without navigation
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', downloadFileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      trackDownloadCompleted({ product_id: product.id, product_type: product.type })
      toast.success('Download started!')
    } catch (err) {
      console.error('Direct download error:', err)
      trackDownloadFailed({ product_id: product.id, reason: err.message })
      toast.error(err.message || 'Unable to download the product. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: productTitle, url })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans antialiased selection:bg-primary selection:text-black">

      {/* 1. CREATORSTORE HEADER */}
      <header className="sticky top-0 z-40 w-full bg-[#000000] border-b border-white/10 h-16 sm:h-18 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link
            href={creatorUsername ? `/${creatorUsername}` : '/'}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[rgba(244,242,236,0.68)] hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Storefront</span>
          </Link>

          <CreatorStoreBrand href="/" theme="dark" size="sm" />

          <div className="text-xs font-bold text-[rgba(244,242,236,0.68)]">
            Product by <span className="text-white font-extrabold">{creatorName}</span>
          </div>
        </div>
      </header>

      {showStickyCta && (
        <div className="fixed top-16 sm:top-[72px] left-0 right-0 z-30 hidden md:flex items-center justify-between gap-4 bg-[#FFFFFF] border-b border-[#000000] px-6 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-[#000000] shrink-0">{priceDisplay}</span>
            <span className="text-sm font-medium text-[#000000] truncate">{productTitle}</span>
          </div>
          {(paymentStatus === 'success' || isOwned) ? null : (
            <Button
              type="button"
              onClick={() => {
                if (!validateForm()) return
                handlePurchase()
              }}
              disabled={buying}
              className="h-9 px-4 rounded-control bg-brand text-brand-fg hover:bg-brand-hover text-label shrink-0"
            >
              {buying ? 'Processing…' : ctaLabel}
            </Button>
          )}
        </div>
      )}

      {/* 2. MAIN HERO SECTION & PURCHASE CONTAINER */}
      <main className="w-full">

        {product.type === 'COACHING' ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <BookingWidget
              product={product}
              creator={creator}
              isOwned={isOwned}
              email={email}
              buying={buying}
              completedBooking={completedOrder}
              onBuyBooking={({ selectedSlot: slot }) => {
                setSelectedSlot(slot)
                if (slot.customerEmail) setEmail(slot.customerEmail)
                handlePurchase()
              }}
            />
          </div>
        ) : (
          <>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
              {/* Enrolled Course Progress Banner */}
              {data.enrolled && isCourse && (
                <div className="rounded-2xl border border-white/10 bg-[#000000] p-6 text-white shadow-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> You Own This Course
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{product.title}</h2>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Your progress: {data.progress || 0}% completed</p>
                  </div>
                  <Link href={`/learn/${course?.id || product.id}`}>
                    <Button variant="default" size="lg" className="font-black">
                      Continue Learning <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Hero image / carousel */}
              <div className="relative w-full overflow-hidden rounded-card bg-surface-raised border border-edge">
                {heroImages.length > 0 ? (
                  <>
                    <img
                      src={heroImages[heroIndex] || heroImages[0]}
                      alt={productTitle}
                      className="w-full aspect-[16/7] min-h-[220px] max-h-[420px] object-cover"
                    />
                    {heroImages.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {heroImages.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Show image ${i + 1}`}
                            onClick={() => setHeroIndex(i)}
                            className={`h-2.5 w-2.5 rounded-full border border-black/40 cursor-pointer ${i === heroIndex ? 'bg-white' : 'bg-white/40'
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-[16/7] min-h-[220px] w-full flex flex-col items-center justify-center text-primary space-y-2.5 p-6 text-center bg-gradient-to-b from-[#1E1E1E] to-[#121212]">
                    <div className="h-14 w-14 rounded-2xl bg-[#000000] border border-white/10 flex items-center justify-center">
                      <FallbackCoverIcon className="h-7 w-7" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/30">
                      {getProductTypeLabel(product.type)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#FFFFFF] w-full">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                  <div className="order-1 lg:col-span-7 space-y-5 text-[#000000]">

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#000000]">
                      {product.title}
                    </h1>

                    <div className="flex items-center gap-2.5 pb-4 border-b border-[#000000]">
                      <div className="h-7 w-7 rounded-full bg-[#F2F2F2] border border-[#000000] overflow-hidden shrink-0 flex items-center justify-center">
                        {creator.avatarUrl ? (
                          <img src={creator.avatarUrl} alt={creatorName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-[#000000]">{creatorName.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <Link
                        href={creatorUsername ? `/${creatorUsername}` : '#'}
                        className="text-sm text-[#000000] underline underline-offset-2 decoration-[#000000] hover:opacity-70"
                      >
                        {creatorName}
                      </Link>
                    </div>

                    {product.shortDescription ? (
                      <p className="text-base font-normal leading-relaxed text-[#000000] max-w-2xl">
                        {product.shortDescription}
                      </p>
                    ) : null}

                    {product.description ? (
                      <div
                        className="prose max-w-none text-base font-normal leading-relaxed text-[#000000] prose-headings:text-[#000000] prose-p:text-[#000000] prose-li:text-[#000000] prose-strong:text-[#000000] prose-a:text-[#000000] prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    ) : null}

                    {featureItems.length > 0 && (
                      <div className="space-y-3 pt-1">
                        <h2 className="text-base font-bold text-[#000000]">What's included:</h2>
                        <ul className="space-y-2">
                          {featureItems.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-base text-[#000000]">
                              <Check className="h-4 w-4 mt-1 shrink-0 text-[#000000]" strokeWidth={2.5} />
                              <span>{typeof benefit === 'string' ? benefit : (benefit.title || benefit.name || '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 pb-4 text-sm text-[#000000] border-y border-[#000000]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-[#000000]" /> Lifetime Access
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Download className="h-4 w-4 text-[#000000]" /> Instant Download
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-[#000000]" /> Secure Checkout
                      </div>
                    </div>

                    {/* Digital Product Included Files / Resources Section */}
                    {product.files && product.files.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-base font-bold text-[#000000]">Included resource files</h3>
                        <div className="space-y-0 border-t border-[#000000]">
                          {product.files.map((file, idx) => (
                            <div key={file.id || idx} className="py-3 border-b border-[#000000] flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="h-5 w-5 text-[#000000] shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#000000] truncate">{file.name || file.fileName || `Resource ${idx + 1}`}</p>
                                  <p className="text-xs text-[#000000]/70">
                                    {file.mimeType || file.fileMime || 'File'} • {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Included'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coaching Interactive Booking Widget */}
                    {product.type === 'COACHING' && (
                      <div className="pt-4">
                        <CoachingBookingWidget
                          productId={product.id}
                          onSlotSelected={setSelectedSlot}
                          selectedSlot={selectedSlot}
                        />
                      </div>
                    )}

                    {/* Community Widget */}
                    {product.type === 'COMMUNITY' && (
                      <div className="pt-4">
                        <CommunityWidget productId={product.id} />
                      </div>
                    )}

                    {/* Webinar Widget */}
                    {product.type === 'WEBINAR' && (
                      <div className="pt-4">
                        <WebinarWidget productId={product.id} />
                      </div>
                    )}

                    {/* Membership Widget */}
                    {product.type === 'MEMBERSHIP' && (
                      <div className="pt-4">
                        <MembershipWidget productId={product.id} />
                      </div>
                    )}

                    {/* Custom Service Widget */}
                    {(product.type === 'CUSTOM_PRODUCT' || product.type === 'CUSTOM_SERVICE') && (
                      <div className="pt-4">
                        <CustomServiceWidget productId={product.id} />
                      </div>
                    )}

                    {/* External Link Widget */}
                    {product.type === 'EXTERNAL_LINK' && (
                      <div className="pt-4">
                        <ExternalLinkWidget productId={product.id} />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Sticky Purchase / Access Card (40% / 5 cols) */}
                  <div className="order-2 lg:col-span-5 lg:sticky lg:top-24 z-20">
                    <div className="rounded-2xl border border-[#000000] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 text-[#000000]">
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-[#000000] line-clamp-2">{productTitle}</h2>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl font-bold text-[#000000]">{priceDisplay}</span>
                          {origPriceDisplay && (
                            <span className="text-sm text-black/50 line-through">{origPriceDisplay}</span>
                          )}
                          {hasDiscount && (
                            <span className="text-xs font-semibold text-[#000000]">{discountPct}% OFF</span>
                          )}
                        </div>
                      </div>

                      {/* Post-Purchase / Owned State vs Checkout CTA Form */}
                      {(paymentStatus === 'success' || isOwned) ? (
                        <div className="bg-[#FFFFFF] border border-[#000000] p-5 sm:p-6 rounded-xl space-y-5 text-left relative overflow-hidden">
                          <div className="flex items-center gap-2.5 text-[#000000] font-extrabold text-base">
                            <div className="h-8 w-8 rounded-full bg-[#FFFFFF] text-[#000000] flex items-center justify-center shrink-0 border border-[#000000]">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span>{isOwned && paymentStatus !== 'success' ? 'You Own This Product' : 'Purchase Successful!'}</span>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-xs sm:text-sm text-[#000000] font-bold leading-snug">
                              Your access to "{productTitle}" is unlocked.
                            </p>
                            <p className="text-xs text-[#000000]/70 font-medium leading-relaxed">
                              You have lifetime access to this {isCourse ? 'course' : 'product'}. Click below to access your content.
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[#000000] space-y-2 text-xs">
                            <div className="flex justify-between items-center text-[#000000] font-medium">
                              <span>Account Email:</span>
                              <span className="font-bold text-[#000000] bg-[#FFFFFF] px-2.5 py-1 rounded-lg border border-[#000000]">
                                {email || 'Verified Owner'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#000000] font-medium">
                              <span>Entitlement Status:</span>
                              <span className="font-bold text-[#000000] flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Verified
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="default"
                            size="lg"
                            disabled={downloading}
                            onClick={handleProductAccess}
                            className="w-full h-14 text-base font-black bg-primary hover:bg-[#ff7be5] text-black rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            {downloading ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>PREPARING DOWNLOAD...</span>
                              </span>
                            ) : (
                              <>
                                <span>{getPostPurchaseCTA(product, isCourse).label}</span>
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>

                          <button
                            type="button"
                            onClick={handleShare}
                            className="w-full h-10 rounded-control border border-[#000000] bg-[#FFFFFF] text-sm text-[#000000] hover:bg-[#F5F5F5] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Share2 className="h-4 w-4" /> Share
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handlePurchase} className="space-y-4">
                          {/* Customer Information Inputs */}
                          <div id="checkout-customer-info" className="space-y-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="checkout-name" className="text-sm font-medium text-[#000000]">
                                Full Name <span className="text-primary">*</span>
                              </Label>
                              <Input
                                id="checkout-name"
                                type="text"
                                required
                                autoComplete="name"
                                inputMode="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => {
                                  setName(e.target.value)
                                  if (nameError) setNameError('')
                                }}
                                className={checkoutInputClass(!!nameError)}
                              />
                              {nameError && (
                                <p className="text-meta text-error-fg mt-1">{nameError}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="checkout-email" className="text-sm font-medium text-[#000000]">
                                Email Address <span className="text-primary">*</span>
                              </Label>
                              <Input
                                id="checkout-email"
                                type="email"
                                required
                                autoComplete="email"
                                inputMode="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value)
                                  if (emailError) setEmailError('')
                                }}
                                className={checkoutInputClass(!!emailError)}
                              />
                              {emailError && (
                                <p className="text-meta text-error-fg mt-1">{emailError}</p>
                              )}
                              <p className="text-xs text-black/60 pt-0.5">
                                {isFree ? 'Your download link will be sent to this email.' : "We'll send your purchase confirmation and download link to this email."}
                              </p>
                            </div>
                          </div>

                          {/* Have a Coupon Code Section */}
                          {!isFree && (
                            <div className="pt-2 border-t border-black/10 space-y-2.5">
                              {appliedCoupon ? (
                                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-mono font-black text-emerald-800 tracking-wider">
                                          {appliedCoupon.couponCode}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                          {appliedCoupon.discountType === 'PERCENTAGE'
                                            ? `${appliedCoupon.discountValue}% OFF`
                                            : `₹${appliedCoupon.discountValue} OFF`}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-emerald-700 font-medium">
                                        Saved {formatMoney(appliedCoupon.discountAmount, product.currency || 'INR')}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRemoveCoupon}
                                    className="text-emerald-800 hover:text-red-600 p-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                                    title="Remove Coupon"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : showCouponInput ? (
                                <div className="space-y-1.5">
                                  <div className="flex gap-2">
                                    <Input
                                      type="text"
                                      placeholder="ENTER COUPON CODE"
                                      value={couponCodeInput}
                                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                                      className="h-10 text-xs uppercase font-mono font-bold rounded-xl border border-black/20 text-black bg-white"
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleApplyCoupon}
                                      disabled={validatingCoupon || !couponCodeInput.trim()}
                                      className="h-10 px-4 text-xs font-bold rounded-xl bg-black text-white hover:bg-black/80 shrink-0 cursor-pointer"
                                    >
                                      {validatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowCouponInput(true)}
                                  className="text-xs font-bold text-black/80 hover:text-black hover:underline flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Tag className="h-3.5 w-3.5 text-black" /> Have a coupon?
                                </button>
                              )}

                              {/* Price Summary Breakdown when Coupon Applied */}
                              {appliedCoupon && (
                                <div className="space-y-1 text-xs pt-1 border-t border-black/5 font-medium">
                                  <div className="flex justify-between text-black/60">
                                    <span>Original Price:</span>
                                    <span>{formatMoney(appliedCoupon.originalAmount, product.currency || 'INR')}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-emerald-600">
                                    <span>Discount ({appliedCoupon.couponCode}):</span>
                                    <span>-{formatMoney(appliedCoupon.discountAmount, product.currency || 'INR')}</span>
                                  </div>
                                  <div className="flex justify-between font-black text-sm text-black pt-1 border-t border-black/10">
                                    <span>Final Payable:</span>
                                    <span>{appliedCoupon.finalAmount === 0 ? 'FREE' : formatMoney(appliedCoupon.finalAmount, product.currency || 'INR')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {paymentStatus === 'cancelled' && (
                            <div className="bg-[#12141c] border border-[#CBE957] p-4 rounded-xl space-y-1.5 text-left">
                              <div className="flex items-center gap-2 text-[#CBE957] font-extrabold text-xs">
                                <HelpCircle className="h-4 w-4 shrink-0" />
                                <span>Payment Cancelled</span>
                              </div>
                              <p className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
                                Your checkout was cancelled. No money was charged.
                              </p>
                            </div>
                          )}

                          {paymentStatus === 'failed' && (
                            <div className="bg-[#12141c] border border-[#F0441E] p-4 rounded-xl space-y-1.5 text-left">
                              <div className="flex items-center gap-2 text-[#F0441E] font-extrabold text-xs">
                                <HelpCircle className="h-4 w-4 shrink-0" />
                                <span>Payment Failed</span>
                              </div>
                              <p className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
                                {errorMessage || 'Payment could not be completed. Please try again.'}
                              </p>
                            </div>
                          )}

                          <Button
                            type="submit"
                            disabled={buying}
                            variant="default"
                            size="lg"
                            className="w-full h-14 text-base font-black bg-primary hover:bg-[#ff7be5] text-black rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
                          >
                            {buying ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {buyingStep === 'creating_order' && 'CREATING SECURE CHECKOUT...'}
                                {buyingStep === 'opening_razorpay' && 'OPENING SECURE PAYMENT...'}
                                {buyingStep === 'verifying' && 'CONFIRMING PAYMENT...'}
                                {buyingStep === 'idle' && 'PROCESSING...'}
                              </span>
                            ) : paymentStatus === 'cancelled' || paymentStatus === 'failed' ? (
                              <span className="flex items-center justify-center gap-2">
                                <span>TRY AGAIN</span>
                                <ArrowRight className="h-5 w-5" />
                              </span>
                            ) : (
                              <span>{ctaLabel}</span>
                            )}
                          </Button>

                          <button
                            type="button"
                            onClick={handleShare}
                            className="w-full h-10 rounded-control border border-[#000000] bg-[#FFFFFF] text-sm text-[#000000] hover:bg-[#F5F5F5] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Share2 className="h-4 w-4" /> Share
                          </button>

                          {/* Test Mode Indicator */}
                          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-black/60 p-2.5 rounded-xl border border-[#000000]">
                            <Sparkles className="h-3.5 w-3.5 text-[#000000]" />
                            <span>Test Mode — No real charge</span>
                          </div>
                        </form>
                      )}

                      {!isFree && (
                        <div className="pt-1 text-center text-xs text-black/60 flex items-center justify-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#000000] shrink-0" />
                          <span>Secure 256-bit encrypted checkout</span>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}
      </main>

      {/* 7. MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0A0A0A] border-t border-white/10 px-4 py-3 lg:hidden flex items-center justify-between shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 pr-3">
          <span className="text-[10px] font-bold text-[rgba(244,242,236,0.68)] block uppercase tracking-wider truncate max-w-[140px]">{productTitle}</span>
          <span className="text-lg font-black text-white tracking-tight">{(paymentStatus === 'success' || isOwned) ? 'OWNED' : priceDisplay}</span>
        </div>
        <Button
          onClick={(e) => {
            if (paymentStatus === 'success' || isOwned) {
              handleProductAccess()
              return
            }
            if (!validateForm()) {
              const el = document.getElementById('checkout-customer-info')
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
              return
            }
            handlePurchase(e)
          }}
          disabled={buying || downloading}
          variant="default"
          size="default"
          className="h-12 px-5 font-black bg-primary hover:bg-[#ff7be5] text-black rounded-xl shrink-0 cursor-pointer shadow-md disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {buying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : downloading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>DOWNLOADING...</span>
            </span>
          ) : (paymentStatus === 'success' || isOwned) ? (
            <span>{getPostPurchaseCTA(product, isCourse).label}</span>
          ) : (
            <span>{ctaLabel}</span>
          )}
        </Button>
      </div>

      {/* 8. CREATORSTORE FOOTER */}
      <footer className="w-full border-t border-[#000000] bg-[#FFFFFF] py-6 px-4 text-center text-xs font-medium text-[#000000] pb-24 lg:pb-8">
        <p>© {new Date().getFullYear()} {creatorName}. Powered by CreatorStore.</p>
      </footer>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] p-6 max-w-6xl mx-auto space-y-8">
      <div className="h-12 w-48 bg-black/10 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="h-6 w-32 bg-black/10 rounded-full animate-pulse" />
          <div className="h-12 w-full bg-black/10 rounded-2xl animate-pulse" />
          <div className="h-20 w-full bg-black/10 rounded-2xl animate-pulse" />
        </div>
        <div className="lg:col-span-5">
          <div className="h-96 w-full bg-black/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
