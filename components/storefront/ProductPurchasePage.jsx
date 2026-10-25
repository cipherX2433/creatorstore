'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { getThemeTokens } from '@/lib/themePresets'
import { Button } from '@/components/ui/button'
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
import ProductPurchaseModalFlow from '@/components/storefront/ProductPurchaseModalFlow'
import PublicBookingModal from '@/components/storefront/PublicBookingModal'
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

  const [email, setEmail] = useState('')
  const [isWizardOpen, setIsWizardOpen] = useState(true)
  const [wizardStep, setWizardStep] = useState('preview')
  const [paymentStatus, setPaymentStatus] = useState('idle') // 'idle' | 'success' | 'failed' | 'cancelled'
  const [errorMessage, setErrorMessage] = useState('')
  const [isOwned, setIsOwned] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [buying, setBuying] = useState(false)

  const [heroIndex, setHeroIndex] = useState(0)
  const [showStickyCta, setShowStickyCta] = useState(false)

  // Multi-currency state
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [currencyPreview, setCurrencyPreview] = useState(null)
  const [currencyLoading, setCurrencyLoading] = useState(false)

  const tokens = useMemo(() => {
    if (data?.store?.theme) {
      return getThemeTokens(data.store.theme)
    }
    return {}
  }, [data?.store?.theme])

  useEffect(() => {
    if (data?.product?.currency) {
      setSelectedCurrency(data.product.currency.toUpperCase())
    }
  }, [data?.product?.currency])

  useEffect(() => {
    if (data?.product?.id && Number(data.product.price) > 0) {
      let mounted = true
      setCurrencyLoading(true)
      fetch(`/api/checkout/preview-currency?productId=${encodeURIComponent(data.product.id)}&currency=${encodeURIComponent(selectedCurrency)}`)
        .then(r => r.json())
        .then(res => {
          if (mounted && res && !res.error) {
            setCurrencyPreview(res)
          }
        })
        .catch(e => console.warn('Currency preview note:', e.message))
        .finally(() => {
          if (mounted) setCurrencyLoading(false)
        })
      return () => { mounted = false }
    }
  }, [data?.product?.id, selectedCurrency, data?.product?.price])

  // Load saved customer name and email from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      if (savedEmail) {
        setEmail(savedEmail)
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

  // Auto open wizard if ?checkout=1 or ?buy=1 or ?openPurchase=1 parameter is present, otherwise open preview
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && data) {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.has('checkout') || searchParams.has('buy') || searchParams.has('openPurchase') || searchParams.has('ref')) {
        setWizardStep('customer_info')
        setIsWizardOpen(true)
      } else {
        setWizardStep('preview')
        setIsWizardOpen(true)
      }
    }
  }, [loading, data])

  // Check URL query parameters for payment results
  useEffect(() => {
    if (typeof window !== 'undefined' && data) {
      const searchParams = new URLSearchParams(window.location.search)
      const orderId = searchParams.get('order_id') || searchParams.get('orderId')
      const payment = searchParams.get('payment')
      if (payment === 'success' || orderId) {
        setPaymentStatus('success')
        setIsOwned(true)
      } else if (payment === 'cancelled') {
        setPaymentStatus('cancelled')
      } else if (payment === 'failed') {
        setPaymentStatus('failed')
      }
    }
  }, [data])

  // Load product or course data
  useEffect(() => {
    let mounted = true
    setLoading(true)

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
              This product is unavailable, private, or has been moved by the creator.
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

  const FallbackCoverIcon = getProductTypeIcon(product.type)
  const featureItems = (product.benefits || []).filter(Boolean)
  const heroImages = [...new Set([
    product.coverImage,
    product.thumbnail,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter(Boolean))]
  const ctaLabel = isFree ? 'Get Access' : 'Buy Now'

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

  async function handlePurchase() {
    if (buying) return
    try {
      setBuying(true)
      if (paymentStatus === 'success' || isOwned) {
        await handleProductAccess()
        return
      }
      setWizardStep('preview')
      setIsWizardOpen(true)
    } catch (err) {
      console.error('Purchase initiation error:', err)
      toast.error('Unable to open checkout. Please try again.')
    } finally {
      setBuying(false)
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


      {/* 2. MAIN HERO SECTION & PURCHASE CONTAINER */}
      <main className="w-full">

        {product.type === 'COACHING' ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <BookingWidget
              product={product}
              creator={creator}
              isOwned={isOwned}
              email={email}
              buying={buying || isWizardOpen}
              completedBooking={completedOrder}
              onBuyBooking={({ selectedSlot: slot }) => {
                setSelectedSlot(slot)
                if (slot.customerEmail) setEmail(slot.customerEmail)
                setWizardStep('customer_info')
                setIsWizardOpen(true)
              }}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
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

            {/* Clean Storefront Product Presentation */}
            <div className="bg-[#FFFFFF] border border-black/10 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 text-center flex flex-col items-center">
              {product.thumbnail || product.coverImage ? (
                <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/50 shadow-xs relative">
                  <img
                    src={product.thumbnail || product.coverImage}
                    alt={productTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center border border-zinc-200/60 shadow-xs">
                  <FallbackCoverIcon className="h-10 w-10 stroke-[1.5]" />
                </div>
              )}

              <div className="space-y-2 max-w-md">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000000] tracking-tight">
                  {productTitle}
                </h1>

                <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium">
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creatorName} className="h-5 w-5 rounded-full object-cover border border-zinc-200" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-zinc-200 text-zinc-700 font-bold text-[10px] flex items-center justify-center">
                      {creatorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span>by {creatorUsername.startsWith('@') ? creatorUsername : `@${creatorUsername}`}</span>
                </div>

                <div className="pt-1">
                  <span className="text-xl font-extrabold text-[#000000]">
                    {priceDisplay}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-xs pt-2">
                {(paymentStatus === 'success' || isOwned) ? (
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={handleProductAccess}
                    disabled={downloading}
                    className="w-full h-12 text-sm font-black bg-primary hover:bg-[#ff7be5] text-black rounded-full shadow-md transition-all cursor-pointer"
                  >
                    {downloading ? 'Preparing Download…' : getPostPurchaseCTA(product, isCourse).label}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={() => {
                      setWizardStep('preview')
                      setIsWizardOpen(true)
                    }}
                    className="w-full h-12 text-sm font-black bg-black hover:bg-zinc-800 text-white rounded-full shadow-md transition-all cursor-pointer"
                  >
                    {isFree ? 'Get Access Free' : 'Get Access'}
                  </Button>
                )}
              </div>

              {product.shortDescription || product.description ? (
                <div className="text-xs text-zinc-500 max-w-md leading-relaxed pt-2">
                  {product.shortDescription || (product.description.replace(/<[^>]*>?/gm, '').slice(0, 180) + '...')}
                </div>
              ) : null}

              {/* Community Widget */}
              {product.type === 'COMMUNITY' && (
                <div className="w-full pt-4">
                  <CommunityWidget productId={product.id} />
                </div>
              )}

              {/* Webinar Widget */}
              {product.type === 'WEBINAR' && (
                <div className="w-full pt-4">
                  <WebinarWidget productId={product.id} />
                </div>
              )}

              {/* Membership Widget */}
              {product.type === 'MEMBERSHIP' && (
                <div className="w-full pt-4">
                  <MembershipWidget productId={product.id} />
                </div>
              )}

              {/* Custom Service Widget */}
              {(product.type === 'CUSTOM_PRODUCT' || product.type === 'CUSTOM_SERVICE') && (
                <div className="w-full pt-4">
                  <CustomServiceWidget productId={product.id} />
                </div>
              )}

              {/* External Link Widget */}
              {product.type === 'EXTERNAL_LINK' && (
                <div className="w-full pt-4">
                  <ExternalLinkWidget productId={product.id} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. CREATORSTORE FOOTER */}
      <footer className="w-full border-t border-[#000000]/10 bg-[#FFFFFF] py-6 px-4 text-center text-xs font-medium text-[#000000]/60">
        <p>© {new Date().getFullYear()} {creatorName}. Powered by CreatorStore.</p>
      </footer>

      {/* Product Purchase Wizard Modal Flow / Dedicated Coaching Booking Modal */}
      {isWizardOpen && (
        product?.type === 'COACHING' ? (
          <PublicBookingModal
            product={product}
            creator={{
              name: creatorName,
              username: creatorUsername,
              avatarUrl: creator.avatarUrl || null,
            }}
            isOpen={isWizardOpen}
            onClose={() => {
              setIsWizardOpen(false)
              if (creatorUsername) {
                router.push(`/${creatorUsername}`)
              } else {
                router.push('/')
              }
            }}
            tokens={tokens}
          />
        ) : (
          <ProductPurchaseModalFlow
            product={product}
            creator={{
              name: creatorName,
              username: creatorUsername,
              avatarUrl: creator.avatarUrl || null,
            }}
            isOpen={isWizardOpen}
            onClose={() => {
              setIsWizardOpen(false)
              if (creatorUsername) {
                router.push(`/${creatorUsername}`)
              } else {
                router.push('/')
              }
            }}
            initialStep={wizardStep}
            tokens={tokens}
          />
        )
      )}
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
