'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/clientApi'
import {
  X, GraduationCap, Video, Users, Package, BookOpen,
  Briefcase, Radio, AlertCircle, RefreshCw, Loader2
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import DigitalProductManagement from './management/DigitalProductManagement'
import CourseManagement from './management/CourseManagement'
import BookingManagement from './management/BookingManagement'
import MembershipManagement from './management/MembershipManagement'

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

function getProductTypeMeta(rawType) {
  const type = normalizeProductType(rawType)
  switch (type) {
    case 'COURSE':
      return { icon: GraduationCap, label: 'Course', badgeColor: 'text-[#194DF5]' }
    case 'MEMBERSHIP':
      return { icon: Users, label: 'Membership', badgeColor: 'text-[#22C55E]' }
    case 'COACHING':
      return { icon: Video, label: 'Booking / Coaching', badgeColor: 'text-[#194DF5]' }
    case 'WEBINAR':
      return { icon: Radio, label: 'Webinar', badgeColor: 'text-[#0284C7]' }
    case 'CUSTOM_SERVICE':
      return { icon: Briefcase, label: 'Service', badgeColor: 'text-[#F59E0B]' }
    case 'EBOOK':
      return { icon: BookOpen, label: 'E-Book', badgeColor: 'text-[#0284C7]' }
    default:
      return { icon: Package, label: 'Digital Product', badgeColor: 'text-[#194DF5]' }
  }
}

function getTabsForType(rawType) {
  const type = normalizeProductType(rawType)
  switch (type) {
    case 'COURSE':
      return [
        { id: 'overview', label: 'Overview' },
        { id: 'students', label: 'Students' },
        { id: 'curriculum', label: 'Curriculum' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'settings', label: 'Settings' },
      ]
    case 'COACHING':
      return [
        { id: 'overview', label: 'Overview' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'availability', label: 'Availability' },
        { id: 'settings', label: 'Settings' },
      ]
    case 'MEMBERSHIP':
      return [
        { id: 'overview', label: 'Overview' },
        { id: 'members', label: 'Members' },
        { id: 'content', label: 'Content' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'settings', label: 'Settings' },
      ]
    default:
      return [
        { id: 'overview', label: 'Overview' },
        { id: 'customers', label: 'Customers' },
        { id: 'orders', label: 'Orders' },
        { id: 'settings', label: 'Product Settings' },
      ]
  }
}

export default function ProductManagementModal({
  product: initialProduct,
  initialTab = 'overview',
  open,
  isOpen,
  onClose,
  onProductUpdated,
}) {
  const isModalOpen = Boolean(open ?? isOpen)
  const [activeTab, setActiveTab] = useState(initialTab || 'overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [managementData, setManagementData] = useState(null)

  const productId = initialProduct?.id

  // Load management data
  const loadData = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/products/${productId}/management`)
      setManagementData(res)
    } catch (err) {
      console.error('Failed to load product management data:', err)
      setError(err.message || 'Unable to load product details')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (isModalOpen && productId) {
      setActiveTab(initialTab || 'overview')
      loadData()
    }
  }, [isModalOpen, productId, initialTab, loadData])

  // ESC key listener to close modal
  useEffect(() => {
    if (!isModalOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, onClose])

  if (!isModalOpen || !initialProduct) return null

  const product = managementData?.product || initialProduct
  const productType = product.type || 'DIGITAL_DOWNLOAD'
  const meta = getProductTypeMeta(productType)
  const TypeIcon = meta.icon
  const tabs = getTabsForType(productType)
  const isPublished = product.status === 'PUBLISHED'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 overflow-y-auto"
      onClick={(e) => {
        // Backdrop click closes modal
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-management-title"
        className="relative flex flex-col w-[calc(100vw-24px)] md:w-[min(1200px,calc(100vw-48px))] h-[calc(100vh-24px)] md:h-[min(850px,calc(100vh-48px))] max-w-[1200px] max-h-[calc(100vh-48px)] bg-[#FFFFFF] border border-[#D8DFFA] rounded-[24px] shadow-2xl overflow-hidden text-[#010619]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8DFFA] bg-[#FFFFFF] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt=""
                className="h-10 w-10 rounded-xl object-cover shrink-0 bg-[#EEF1FB] border border-[#D8DFFA]"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[#F0F5FF] border border-[#D0E2FF] flex items-center justify-center text-[#194DF5] shrink-0">
                <TypeIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="product-management-title"
                className="text-base sm:text-lg font-bold text-[#010619] truncate leading-tight"
              >
                {product.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#666666] mt-0.5">
                <span className="font-medium">{meta.label}</span>
                <span>·</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${isPublished ? 'text-[#22C55E]' : 'text-[#6B7399]'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? 'bg-[#22C55E]' : 'bg-[#6B7399]'}`} />
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* Visible [ X ] Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product management modal"
            className="p-2 rounded-full text-[#6B7399] hover:text-[#010619] hover:bg-[#E8EDFB] transition-colors cursor-pointer shrink-0 ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-[#D8DFFA] bg-[#EEF1FB] overflow-x-auto shrink-0 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-[#010619]'
                    : 'text-[#666666] hover:text-[#010619]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#194DF5] rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#FFFFFF]">
          {loading ? (
            <div className="space-y-6">
              {/* Skeleton Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4 space-y-2">
                    <Skeleton className="h-4 w-20 bg-[#D8DFFA]" />
                    <Skeleton className="h-6 w-28 bg-[#D8DFFA]" />
                    <Skeleton className="h-3 w-32 bg-[#D8DFFA]" />
                  </div>
                ))}
              </div>

              {/* Skeleton Table */}
              <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-5 space-y-3">
                <Skeleton className="h-5 w-40 bg-[#D8DFFA]" />
                <Skeleton className="h-10 w-full bg-[#D8DFFA]" />
                <Skeleton className="h-10 w-full bg-[#D8DFFA]" />
                <Skeleton className="h-10 w-full bg-[#D8DFFA]" />
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-[#010619]">Unable to load product details</h3>
                <p className="text-xs text-[#666666]">{error}</p>
              </div>
              <Button
                onClick={loadData}
                className="bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold rounded-full px-5 h-9 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : managementData ? (
            <>
              {productType === 'COURSE' ? (
                <CourseManagement
                  data={managementData}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onProductUpdated={() => {
                    loadData()
                    onProductUpdated?.()
                  }}
                />
              ) : productType === 'COACHING' ? (
                <BookingManagement
                  data={managementData}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onProductUpdated={() => {
                    loadData()
                    onProductUpdated?.()
                  }}
                />
              ) : productType === 'MEMBERSHIP' ? (
                <MembershipManagement
                  data={managementData}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onProductUpdated={() => {
                    loadData()
                    onProductUpdated?.()
                  }}
                />
              ) : (
                <DigitalProductManagement
                  data={managementData}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onProductUpdated={() => {
                    loadData()
                    onProductUpdated?.()
                  }}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
