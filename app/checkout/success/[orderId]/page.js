'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { generateGoogleCalendarUrl, generateICSData } from '@/lib/calendar'
import { CheckCircle2, Download, ArrowRight, GraduationCap, Package, ShieldCheck, Video, Calendar, Radio, Users, Link2, Sparkles, Mail, Store } from 'lucide-react'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'

function CheckoutSuccessContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.orderId || searchParams.get('session_id') || searchParams.get('order_id')
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  useEffect(() => {
    if (!orderId) return
    const emailParam = searchParams.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : '') || ''
    const query = emailParam ? `/checkout/status?order_id=${orderId}&email=${encodeURIComponent(emailParam)}` : `/checkout/status?order_id=${orderId}`
    api.get(query)
      .then((res) => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [orderId, searchParams])

  const handleDownload = async (e) => {
    if (!data?.downloadUrl) return
    setDownloadError(null)

    try {
      window.location.href = data.downloadUrl
    } catch (err) {
      console.error('Download click error:', err)
      setDownloadError("Download couldn't start. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#18191C] flex items-center justify-center p-4 sm:p-6 text-white selection:bg-primary selection:text-black">
        <div className="max-w-md w-full bg-[#0B0C0E] p-8 rounded-3xl border border-[#2D2D35] shadow-2xl space-y-5 text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto bg-[#1F2025]" />
          <Skeleton className="h-7 w-48 mx-auto rounded-xl bg-[#1F2025]" />
          <Skeleton className="h-4 w-64 mx-auto rounded-xl bg-[#1F2025]" />
          <Skeleton className="h-28 w-full rounded-2xl bg-[#1F2025]" />
          <Skeleton className="h-14 w-full rounded-2xl bg-[#1F2025]" />
        </div>
      </div>
    )
  }

  const product = data?.product
  const booking = data?.booking
  const displayEmail = data?.customerEmail || searchParams.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : '') || ''
  
  const isFreeProduct = data?.amount === 0 || Number(data?.amount) === 0
  const priceDisplay = isFreeProduct ? 'FREE' : (data?.amount != null ? formatMoney(data.amount, data.currency) : '₹0.00')

  const ProductTypeIcon = product?.type === 'COURSE' ? GraduationCap : product?.type === 'COACHING' ? Video : product?.type === 'COMMUNITY' ? Users : product?.type === 'WEBINAR' ? Radio : Package

  const gcalUrl = booking ? generateGoogleCalendarUrl({
    title: product?.title || 'Coaching Session',
    description: '1:1 Coaching session booked via CreatorStore',
    startTime: booking.startTime,
    endTime: booking.endTime,
  }) : '#'

  const icsData = booking ? generateICSData({
    title: product?.title || 'Coaching Session',
    description: '1:1 Coaching session booked via CreatorStore',
    startTime: booking.startTime,
    endTime: booking.endTime,
  }) : ''
  const icsDataUrl = icsData ? `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}` : '#'

  return (
    <div className="min-h-screen bg-[#000000] relative flex flex-col items-center justify-center p-4 sm:p-6 text-[#F4F2EC] selection:bg-primary selection:text-black overflow-hidden font-sans">
      {/* Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-1">
          <CreatorStoreBrand href="/" theme="dark" size="md" />

          <Link href="/">
            <button
              type="button"
              className="bg-[#12141c] hover:bg-[#1e222d] text-[rgba(244,242,236,0.68)] hover:text-[#F4F2EC] border border-white/10 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Back to Store</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>

        {/* Main Success Container */}
        <div className="w-full bg-[#12141c] rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl space-y-6 text-center relative overflow-hidden">
          {/* Top Pink Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />

          {/* Success Icon */}
          <div className="relative mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center shadow-md shadow-primary/10 animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>

          {/* Success Heading & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">
              {isFreeProduct ? 'Your download is ready! 🎉' : 'Order Confirmed! 🎉'}
            </h1>
            <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium leading-relaxed max-w-md mx-auto">
              {isFreeProduct ? 'Your free digital product is ready below.' : 'Thank you for your purchase. Your digital product is ready below.'}
            </p>

            {/* Receipt Email Badge */}
            {displayEmail && (
              <div className="pt-1.5">
                <span className="inline-flex items-center gap-2 bg-[#1e222d] border border-white/10 text-[rgba(244,242,236,0.68)] text-xs font-medium px-4 py-1.5 rounded-full shadow-xs">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Receipt sent to <strong className="text-[#F4F2EC] font-bold">{displayEmail}</strong></span>
                </span>
              </div>
            )}
          </div>

          {/* Order Summary Card */}
          {product && (
            <div className="bg-[#1e222d] p-4 sm:p-5 rounded-2xl border border-white/10 text-left space-y-4 shadow-inner">
              <div className="flex items-center gap-3.5">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/10" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                    <ProductTypeIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary block">
                    {product.type ? product.type.replace('_', ' ') : 'DIGITAL DOWNLOAD'}
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-[#F4F2EC] truncate leading-snug">
                    {product.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-[rgba(244,242,236,0.68)]">
                    Order #{orderId ? orderId.slice(0, 8) : 'CZ-1001'}
                  </span>
                </div>
              </div>

              {/* Coaching Session Detail */}
              {booking && (
                <div className="bg-[#12141c] p-3.5 rounded-xl border border-white/10 text-xs space-y-1">
                  <div className="font-bold text-[#F4F2EC]">
                    {new Date(booking.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-[rgba(244,242,236,0.68)] font-medium">
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({booking.timezone})
                  </div>
                </div>
              )}

              {/* Total Paid Row */}
              <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs font-bold">
                <span className="text-[rgba(244,242,236,0.68)] font-medium">Total Paid</span>
                <span className={isFreeProduct ? "text-primary font-black text-base sm:text-lg" : "text-[#F4F2EC] font-black text-base sm:text-lg"}>
                  {priceDisplay}
                </span>
              </div>
            </div>
          )}

          {/* Action CTA & Next Steps */}
          <div className="space-y-3 pt-1">
            {product?.type === 'COACHING' && booking ? (
              <>
                {booking.meetingUrl && (
                  <a href={booking.meetingUrl} target="_blank" rel="noreferrer">
                    <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                      <Video className="h-5 w-5 stroke-[2.5]" /> Join Video Call
                    </Button>
                  </a>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a href={gcalUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1.5 h-11 border-white/10 bg-[#1e222d] text-[#F4F2EC] hover:bg-[#12141c]">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Add to Google Calendar
                    </Button>
                  </a>
                  <a href={icsDataUrl} download="coaching-session.ics">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1.5 h-11 border-white/10 bg-[#1e222d] text-[#F4F2EC] hover:bg-[#12141c]">
                      <Download className="h-3.5 w-3.5 text-[rgba(244,242,236,0.68)]" /> Download .ICS
                    </Button>
                  </a>
                </div>
              </>
            ) : product?.type === 'COMMUNITY' ? (
              <Link href={`/community/${product.id}`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  <Users className="h-5 w-5 stroke-[2.5]" /> Enter Community Feed <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : product?.type === 'WEBINAR' ? (
              <Link href={`/account/webinars`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  <Radio className="h-5 w-5 stroke-[2.5]" /> View Webinar Access <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : product?.type === 'MEMBERSHIP' ? (
              <Link href={`/account/memberships`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  <Users className="h-5 w-5 stroke-[2.5]" /> View My Memberships <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : (product?.type === 'CUSTOM_PRODUCT' || product?.type === 'CUSTOM_SERVICE') ? (
              <Link href={`/account/custom-services`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  <Sparkles className="h-5 w-5 stroke-[2.5]" /> View My Service Requests <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : product?.type === 'EXTERNAL_LINK' ? (
              <Link href={`/account/external-links`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  <Link2 className="h-5 w-5 stroke-[2.5]" /> View My External Resources <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : product?.type === 'COURSE' ? (
              <Link href={`/learn/${product.id || orderId}`}>
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  Start Course Now <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            ) : data?.downloadUrl ? (
              <div className="space-y-2">
                <a href={data.downloadUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button
                    type="button"
                    className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all cursor-pointer gap-2 border-0"
                  >
                    <span>Download File</span>
                    <Download className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                </a>
                {downloadError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-between gap-2">
                    <span>Download couldn't start. Please try again.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadError(null)
                        if (typeof window !== 'undefined' && data?.downloadUrl) {
                          window.open(data.downloadUrl, '_blank')
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/">
                <Button className="w-full h-14 font-black text-base bg-[#CBE957] hover:bg-[#b8d844] text-[#000000] rounded-2xl shadow-lg shadow-[#CBE957]/20 active:scale-[0.99] transition-all gap-2 border-0">
                  Access Product <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </Link>
            )}

            {/* Email / Access Banner */}
            <div className="bg-[#0D261A]/80 border border-emerald-800/60 text-emerald-400 text-xs font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Order details & access sent to your email</span>
            </div>

            {/* Return to Storefront CTA */}
            <div className="pt-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[rgba(244,242,236,0.68)] hover:text-[#F4F2EC] hover:bg-[#1e222d] rounded-xl transition-all">
                  ← Return to Storefront
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-[11px] text-[#71717A] text-center space-x-4 font-medium pt-1">
          <span>© {new Date().getFullYear()} CreatorStore</span>
          <span>•</span>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto bg-[#1e222d]" />
          <Skeleton className="h-7 w-48 mx-auto rounded-xl bg-[#1e222d]" />
          <Skeleton className="h-4 w-64 mx-auto rounded-xl bg-[#1e222d]" />
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
