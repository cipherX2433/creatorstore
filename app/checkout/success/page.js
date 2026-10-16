'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Download, Loader2, Mail, ArrowRight, ShieldCheck, Package } from 'lucide-react'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'
import {
  trackPurchase,
  trackPaymentCompleted,
  trackFreeProductDownload,
  trackDownloadStarted,
} from '@/lib/analytics'

function SuccessInner() {
  const search = useSearchParams()
  const sessionId = search.get('session_id') || search.get('order_id')
  const [status, setStatus] = useState(null)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    let active = true
    async function poll() {
      try {
        const res = await fetch(`/api/checkout/status?session_id=${sessionId}`)
        const data = await res.json()
        if (!active) return
        setStatus(data)
        if (data.status !== 'PAID' && tries < 15) setTimeout(() => setTries((t) => t + 1), 1500)
      } catch { if (tries < 15) setTimeout(() => setTries((t) => t + 1), 1500) }
    }
    poll()
    return () => { active = false }
  }, [sessionId, tries])

  const paid = status?.status === 'PAID'
  const pending = !paid
  const isFreeProduct = status?.amount === 0 || Number(status?.amount) === 0
  const priceDisplay = isFreeProduct ? 'FREE' : (status?.amount != null ? formatMoney(status.amount, status.currency) : '₹0.00')

  // Track purchase event idempotently once order status is confirmed PAID
  useEffect(() => {
    if (status?.status === 'PAID') {
      const orderId = status.orderId || sessionId
      if (isFreeProduct) {
        trackFreeProductDownload({
          product_id: status.product?.id,
          product_type: status.product?.type || 'digital',
        })
      } else {
        trackPaymentCompleted({
          transaction_id: orderId,
          value: Number(status.amount) || 0,
          currency: status.currency || 'INR',
        })
        trackPurchase({
          transaction_id: orderId,
          value: Number(status.amount) || 0,
          currency: status.currency || 'INR',
          items: [{
            item_id: status.product?.id,
            item_name: status.product?.title || 'Product',
            price: Number(status.amount) || 0,
            quantity: 1,
          }],
        })
      }
    }
  }, [status?.status, status?.orderId, sessionId, isFreeProduct, status?.amount, status?.currency, status?.product])

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
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />

          {pending ? (
            <div className="py-8 space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl sm:text-2xl font-black text-[#F4F2EC] tracking-tight">Confirming your order...</h1>
              <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium max-w-sm mx-auto">
                We're waiting for final payment confirmation. This usually takes just a few seconds.
              </p>
            </div>
          ) : (
            <>
              {/* Success Badge */}
              <div className="relative mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center shadow-md shadow-primary/10 animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>

              {/* Title & Subtext */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">
                  {isFreeProduct ? 'Your download is ready! 🎉' : 'Order Confirmed! 🎉'}
                </h1>
                <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium leading-relaxed max-w-md mx-auto">
                  {isFreeProduct ? 'Your free digital product is ready below.' : 'Thank you for your purchase. Your digital product is ready below.'}
                </p>
              </div>

              {/* Product Summary Box */}
              {status?.product && (
                <div className="bg-[#1e222d] p-4 sm:p-5 rounded-2xl border border-white/10 text-left space-y-3 shadow-inner">
                  <div className="flex items-center gap-3.5">
                    {status.product.thumbnail ? (
                      <img src={status.product.thumbnail} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/10" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary block">
                        {status.product.type ? status.product.type.replace('_', ' ') : 'DIGITAL DOWNLOAD'}
                      </span>
                      <h3 className="font-black text-sm sm:text-base text-[#F4F2EC] truncate">
                        {status.product.title}
                      </h3>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs font-bold">
                    <span className="text-[rgba(244,242,236,0.68)] font-medium">Total Paid</span>
                    <span className={isFreeProduct ? "text-primary font-black text-base sm:text-lg" : "text-[#F4F2EC] font-black text-base sm:text-lg"}>{priceDisplay}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-1">
                {status?.downloadUrl ? (
                  <a
                    href={status.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownloadStarted({ product_id: status?.product?.id, product_type: status?.product?.type || 'digital' })}
                    className="block w-full"
                  >
                    <Button className="w-full h-14 font-black text-base bg-primary hover:bg-primary-hover text-[#000000] rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.99] transition-all gap-2 border-0">
                      <Download className="h-5 w-5 stroke-[2.5]" /> Download File
                    </Button>
                  </a>
                ) : (
                  <Link href="/">
                    <Button className="w-full h-14 font-black text-base bg-primary hover:bg-primary-hover text-[#000000] rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.99] transition-all gap-2 border-0">
                      Access Product <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                    </Button>
                  </Link>
                )}

                <div className="bg-[#0D261A]/80 border border-emerald-800/60 text-emerald-400 text-xs font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Order details & access sent to your email</span>
                </div>

                <div className="pt-1">
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-[rgba(244,242,236,0.68)] hover:text-[#F4F2EC] hover:bg-[#1e222d] rounded-xl transition-all">
                      ← Return to Storefront
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    }>
      <SuccessInner />
    </Suspense>
  )
}
