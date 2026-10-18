'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Menu,
  Sparkles,
  FileText,
  Package,
  Loader2,
  CheckCircle2,
  Download,
  ArrowLeft
} from 'lucide-react'
import ProductPurchaseModalFlow from '@/components/storefront/ProductPurchaseModalFlow'
import PurchaseAccessVerification from '@/components/storefront/PurchaseAccessVerification'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'

function NotificationsSettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const listingId = searchParams.get('listingId') || searchParams.get('productId')
  const openPurchase = searchParams.get('openPurchase') === 'true' || searchParams.get('buy') === 'true' || searchParams.get('checkout') === 'true'

  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isVerified, setIsVerified] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Notification toggle states
  const [pauseNotifications, setPauseNotifications] = useState(false)
  const [weeklySummary, setWeeklySummary] = useState(true)

  const isExpiredLink = searchParams.get('expired') === 'true'

  // Fetch purchases from API strictly based on server verified identity
  const loadPurchases = async () => {
    if (isExpiredLink) {
      setIsVerified(false)
      setPurchases([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/purchases')
      const data = await res.json().catch(() => ({}))
      if (data?.verified) {
        setIsVerified(true)
        setPurchases(Array.isArray(data.purchases) ? data.purchases : [])
      } else {
        setIsVerified(false)
        setPurchases([])
      }
    } catch (err) {
      console.warn('Could not fetch server purchases:', err)
      setError('Unable to load your purchases.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPurchases()
  }, [])

  // Auto-open modal if listingId is in URL query parameter
  useEffect(() => {
    if (!listingId) return

    // 1. Check if already present in purchases
    if (purchases.length > 0) {
      const match = purchases.find(p => p.id === listingId || p.productId === listingId)
      if (match) {
        setSelectedProduct(match)
        setIsModalOpen(true)
        return
      }
    }

    // 2. If not found in purchases, safely fetch product details for purchase or preview
    let isMounted = true
    fetch(`/api/checkout/product?productId=${encodeURIComponent(listingId)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (isMounted && data?.product) {
          setSelectedProduct({ ...data.product, creator: data.creator })
          setIsModalOpen(true)
        }
      })
      .catch(err => {
        console.warn('[NotificationsSettings] Could not load listing:', err?.message || err)
      })

    return () => {
      isMounted = false
    }
  }, [listingId, purchases])

  // Handle clicking on a purchased product row
  const handleProductRowClick = (product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
    // Update URL query parameter
    router.replace(`/notifications/settings?listingId=${product.id || product.productId}`, { scroll: false })
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
    router.replace('/notifications/settings', { scroll: false })
  }

  const isAlreadyPurchased = Boolean(
    selectedProduct && purchases.some(p => p.id === selectedProduct.id || p.productId === selectedProduct.id)
  )
  const modalInitialStep = isAlreadyPurchased ? 'purchase_detail' : (openPurchase ? 'customer_info' : 'preview')

  // Derive active creator info from first purchase or fallback
  const firstCreator = purchases[0]?.creator || {
    name: 'mohit463',
    username: 'mohit463',
    avatarUrl: null
  }

  // If verifying access initially, show a clean loading indicator
  if (loading && isVerified === null) {
    return (
      <div className="min-h-screen bg-[#F3F3F1] text-zinc-900 font-sans flex flex-col">
        <header className="w-full bg-[#F3F3F1] border-b border-zinc-200/60 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                ✦
              </div>
              <span className="font-extrabold text-sm tracking-tight text-zinc-900">CreatorStore</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-24 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2.5 text-zinc-500 font-medium text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-800" />
            <span>Checking purchase access...</span>
          </div>
        </main>
      </div>
    )
  }

  // If user is unverified, show the email/OTP verification screen
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#F3F3F1] text-zinc-900 font-sans selection:bg-zinc-200">
        <header className="w-full bg-[#F3F3F1] border-b border-zinc-200/60 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                ✦
              </div>
              <span className="font-extrabold text-sm tracking-tight text-zinc-900">CreatorStore</span>
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xs border border-zinc-200/60">
            {isExpiredLink && (
              <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <p className="text-xs font-semibold text-amber-800">
                  Your access link has expired.
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Please verify your email address below to access your downloads.
                </p>
              </div>
            )}
            <PurchaseAccessVerification
              variant="modal"
              onSuccess={() => {
                setIsVerified(true)
                loadPurchases()
              }}
            />
          </div>
        </main>

        {selectedProduct && isModalOpen && (
          <ProductPurchaseModalFlow
            product={selectedProduct}
            creator={selectedProduct.creator}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            initialStep={modalInitialStep}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F3F1] text-zinc-900 font-sans selection:bg-zinc-200">
      {/* Top Navbar */}
      <header className="w-full bg-[#F3F3F1] border-b border-zinc-200/60 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
              ✦
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900">CreatorStore</span>
          </Link>

          <button
            type="button"
            className="h-10 w-10 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 shadow-2xs transition-colors cursor-pointer"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Notifications
          </h1>
          <Link
            href="/"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
          </Link>
        </div>

        {/* ============================================================ */}
        {/* CARD 1: Purchases (Screenshot 5)                             */}
        {/* ============================================================ */}
        <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-zinc-200/60 space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Purchases</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Access products you have purchased.
            </p>
          </div>

          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
              <span>Loading your purchases...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
              <p className="text-xs font-semibold text-zinc-700">{error}</p>
              <button
                type="button"
                onClick={loadPurchases}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
              >
                Try again
              </button>
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
              <Package className="h-8 w-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">No products available</h3>
              <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                We couldn&apos;t find any products associated with this email.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {purchases.map((item) => {
                const title = item.title || 'Digital Product'
                const cName = item.creator?.name || item.creatorName || 'Creator'
                const cUser = item.creator?.username || item.creatorUsername || 'creator'
                const thumb = item.thumbnail || item.coverImage || null

                return (
                  <button
                    key={item.id || item.productId}
                    type="button"
                    onClick={() => handleProductRowClick(item)}
                    className="w-full flex items-center justify-between gap-3 py-3.5 px-1 hover:bg-zinc-50/80 rounded-xl transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={title}
                          className="w-12 h-12 rounded-xl object-cover bg-zinc-100 border border-zinc-200/60 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-400 shrink-0">
                          <FileText className="h-6 w-6 stroke-[1.5]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-zinc-900 truncate group-hover:text-black">
                          {title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500 font-medium">
                          <div className="h-3.5 w-3.5 rounded-full bg-zinc-200 text-[8px] font-bold flex items-center justify-center text-zinc-700 overflow-hidden shrink-0">
                            {item.creator?.avatarUrl || item.creatorAvatar ? (
                              <img src={item.creator?.avatarUrl || item.creatorAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              cUser.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="truncate">{cUser.startsWith('@') ? cUser : `@${cUser}`}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* CARD 2: Subscriptions (Screenshot 5)                          */}
        {/* ============================================================ */}
        <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-zinc-200/60 space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Subscriptions</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Receive notifications about Linktrees you&apos;re subscribed to.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-full bg-zinc-200 border border-zinc-200 overflow-hidden flex items-center justify-center text-zinc-700 font-bold shrink-0">
                {firstCreator.avatarUrl ? (
                  <img src={firstCreator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{firstCreator.username?.slice(0, 1).toUpperCase() || 'M'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <h3 className="font-bold text-sm text-zinc-900 truncate">
                  {firstCreator.name || firstCreator.username || 'mohit463'}
                </h3>
                <p className="text-xs text-zinc-500 truncate">
                  @{firstCreator.username || 'mohit463'}
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0" />
          </div>
        </section>

        {/* ============================================================ */}
        {/* CARD 3: Pause all notifications (Screenshot 5)               */}
        {/* ============================================================ */}
        <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-zinc-200/60 flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1 pr-2">
            <h2 className="text-sm font-bold text-zinc-950">Pause all notifications</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              You won&apos;t receive any notifications from Linktrees you&apos;re subscribed to.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={pauseNotifications}
            onClick={() => setPauseNotifications(prev => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
              pauseNotifications ? 'bg-zinc-900' : 'bg-zinc-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pauseNotifications ? 'translate-x-6' : 'translate-x-0'
              } shadow-xs`}
            />
          </button>
        </section>

        {/* ============================================================ */}
        {/* CARD 4: Send me a weekly summary email (Screenshot 5)        */}
        {/* ============================================================ */}
        <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-zinc-200/60 flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1 pr-2">
            <h2 className="text-sm font-bold text-zinc-950">Send me a weekly summary email</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Get a curated wrap of new content added to Linktrees you&apos;re subscribed to, plus a spotlight on Linktrees you might like.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={weeklySummary}
            onClick={() => setWeeklySummary(prev => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
              weeklySummary ? 'bg-emerald-600' : 'bg-zinc-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                weeklySummary ? 'translate-x-6' : 'translate-x-0'
              } shadow-xs`}
            />
          </button>
        </section>
      </main>

      {/* Product Download Detail Modal (Screenshot 4) */}
      {selectedProduct && (
        <ProductPurchaseModalFlow
          product={selectedProduct}
          creator={selectedProduct.creator}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialStep={modalInitialStep}
        />
      )}
    </div>
  )
}

export default function NotificationsSettingsView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F3F1] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
        </div>
      }
    >
      <NotificationsSettingsContent />
    </Suspense>
  )
}
