'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { BaseModal } from '@/components/ui/base-modal'
import {
  FileDown, GraduationCap, BookOpen, Users, Layers, Sparkles,
  Video, Radio, CalendarClock, Link2, HeartHandshake, Loader2, Check,
  ArrowRight, Info, ShieldCheck, Sparkles as SparklesIcon, Store, Bot
} from 'lucide-react'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { trackProductCreated } from '@/lib/analytics'

const PRODUCT_TYPES = [
  {
    type: 'DIGITAL_DOWNLOAD',
    title: 'Digital product',
    desc: 'Any set of files to download or stream.',
    icon: FileDown,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#1F1F1F] border-[#E5E5E3]',
    available: true,
  },
  {
    type: 'EBOOK',
    title: 'E-book or guide',
    desc: 'PDF guides, cheatsheets, and digital books.',
    icon: BookOpen,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
  {
    type: 'MEMBERSHIP',
    title: 'Membership or subscription',
    desc: 'Recurring community access or content subscriptions.',
    icon: Users,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
  {
    type: 'COACHING',
    title: 'Coaching & Bookings',
    desc: 'Sell 1:1 sessions, consultations, discovery calls, and custom bookings.',
    icon: Video,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#1F1F1F] border-[#E5E5E3]',
    available: true,
  },
  {
    type: 'WEBINAR',
    title: 'Webinar or Event',
    desc: 'Live interactive masterclasses and group sessions.',
    icon: Radio,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
  {
    type: 'CUSTOM_SERVICE',
    title: 'Custom service',
    desc: 'Freelance deliverables like design, audits, or code.',
    icon: CalendarClock,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
  {
    type: 'EXTERNAL_LINK',
    title: 'External link',
    desc: 'Link to anywhere external like YouTube or Discord.',
    icon: Link2,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
  {
    type: 'TIP_JAR',
    title: 'Tip jar',
    desc: 'Let your audience support you with tips.',
    icon: HeartHandshake,
    color: '#1F1F1F',
    bg: 'bg-[#F2F1EF] text-[#6F6F6B] border-[#E5E5E3]',
    available: false,
  },
]

const CURRENCIES = [
  { code: 'inr', symbol: '₹', label: 'INR (Indian Rupee)' },
  { code: 'usd', symbol: '$', label: 'USD (US Dollar)' },
  { code: 'eur', symbol: '€', label: 'EUR (Euro)' },
  { code: 'gbp', symbol: '£', label: 'GBP (British Pound)' },
  { code: 'jpy', symbol: '¥', label: 'JPY (Japanese Yen)' },
  { code: 'aud', symbol: 'A$', label: 'AUD (Australian Dollar)' },
  { code: 'cad', symbol: 'C$', label: 'CAD (Canadian Dollar)' },
]

export default function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [productName, setProductName] = useState('')
  const [selectedType, setSelectedType] = useState('DIGITAL_DOWNLOAD')
  const [currency, setCurrency] = useState('inr')
  const [price, setPrice] = useState('1000')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [createdProduct, setCreatedProduct] = useState(null)
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  const [subStatus, setSubStatus] = useState(null)

  useEffect(() => {
    api.get('/creator/subscription/status').then((status) => {
      setSubStatus(status)
      if (status && !status.canCreateProducts && (status.isTrialExpired && !status.hasPaidPlan)) {
        toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
        window.dispatchEvent(new CustomEvent('creatorstore:open-pricing'))
        router.push('/dashboard/products')
      }
    }).catch(() => {})
  }, [router])

  function validate() {
    const errs = {}
    if (!productName.trim()) {
      errs.name = 'Product name is required'
    } else if (productName.trim().length < 2) {
      errs.name = 'Product name must be at least 2 characters'
    }

    const typeObj = PRODUCT_TYPES.find((t) => t.type === selectedType)
    if (!selectedType || !typeObj?.available) {
      errs.type = 'Please select an available product type'
    }

    if (price === '' || price === null || price === undefined) {
      errs.price = 'Price is required'
    } else if (isNaN(Number(price)) || Number(price) < 0) {
      errs.price = 'Price must be 0 or a positive number'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = useCallback(async (e) => {
    e?.preventDefault()
    if (!validate()) {
      toast.error('Please fix the validation errors before continuing')
      return
    }

    if (subStatus && !subStatus.canCreateProducts && (subStatus.isTrialExpired && !subStatus.hasPaidPlan)) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      window.dispatchEvent(new CustomEvent('creatorstore:open-pricing'))
      router.push('/dashboard/products')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: productName.trim(),
        type: selectedType,
        price: Number(price),
        currency: currency.toLowerCase(),
      }

      const res = await api.post('/products', payload)
      if (res.product) {
        setCreatedProduct(res.product)
        trackProductCreated({ product_type: selectedType || 'digital' })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('creatorstore:setup-updated'))
        }
        toast.success('Product created successfully!')

        // Route to dedicated setup or customizer
        if (selectedType === 'COACHING') {
          router.push(`/dashboard/coaching`)
        } else if (selectedType === 'WEBINAR') {
          router.push(`/dashboard/webinar/${res.product.id}/setup`)
        } else if (selectedType === 'MEMBERSHIP') {
          router.push(`/dashboard/membership/${res.product.id}/setup`)
        } else if (selectedType === 'CUSTOM_SERVICE') {
          router.push(`/dashboard/custom-service/${res.product.id}/setup`)
        } else if (selectedType === 'EXTERNAL_LINK') {
          router.push(`/dashboard/external-link/${res.product.id}/setup`)
        } else {
          router.push(`/dashboard/products/${res.product.id}`)
        }
      }
    } catch (err) {
      if (err.code === 'PLAN_UPGRADE_REQUIRED' || err.status === 403 || err.message?.includes('trial has ended')) {
        toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
        window.dispatchEvent(new CustomEvent('creatorstore:open-pricing'))
        router.push('/dashboard/products')
        return
      }
      toast.error(err.message || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }, [productName, selectedType, price, currency, router, subStatus])

  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Create new product',
      actions: (
        <div className="flex items-center gap-2">
          <Link href="/dashboard/products">
            <Button variant="outline" size="sm" className="font-medium text-xs rounded-full border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F]">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="font-bold text-xs bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-white rounded-full h-9 px-5 flex items-center gap-1.5 shadow-none cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-3.5 w-3.5 stroke-[3]" /></>}
          </Button>
        </div>
      ),
    })
  }, [setHeaderConfig, handleNext, loading])

  // Listen to top-right header action button trigger
  useEffect(() => {
    function handleExternalSubmit() {
      handleNext()
    }
    window.addEventListener('creatorzero:submit-new-product', handleExternalSubmit)
    return () => window.removeEventListener('creatorzero:submit-new-product', handleExternalSubmit)
  }, [handleNext])

  const currentSymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || '₹'

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-[#1F1F1F]">
      {/* 2-COLUMN MAIN CONTENT (LEFT: EXPLANATORY HELP, RIGHT: FORM) */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">

        {/* LEFT COLUMN: HELPFUL TIPS & OVERVIEW */}
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
              <SparklesIcon className="h-4 w-4" /> Quick Setup Guide
            </div>

            <div className="space-y-3 text-xs font-medium text-[#6F6F6B] leading-relaxed">
              <div className="p-3 bg-[#FBFBFB] rounded-[16px] border border-[#E5E5E3] space-y-1">
                <span className="font-bold text-[#1F1F1F] block text-xs">1. Product Details</span>
                <p>Pick a catchy name. You can update title, cover image, and full description anytime.</p>
              </div>

              <div className="p-3 bg-[#FBFBFB] rounded-[16px] border border-[#E5E5E3] space-y-1">
                <span className="font-bold text-[#1F1F1F] block text-xs">2. Type Selection</span>
                <p>Digital downloads and 1:1 coaching are supported natively.</p>
              </div>

              <div className="p-3 bg-[#FBFBFB] rounded-[16px] border border-[#E5E5E3] space-y-1">
                <span className="font-bold text-[#1F1F1F] block text-xs">3. Price &amp; Payouts</span>
                <p>Set price to 0 to offer free lead magnets. Payouts settle directly to your connected account.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E5E3] flex items-center gap-2 text-[11px] font-semibold text-[#6F6F6B]">
              <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
              <span>0% platform transaction fees on all sales.</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN PRODUCT FORM */}
        <form onSubmit={handleNext} className="space-y-6">

          {/* SECTION 1: BASIC INFORMATION */}
          <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 sm:p-8 space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="border-b border-[#E5E5E3] pb-4 space-y-1">
              <h2 className="text-lg font-bold text-[#1F1F1F] tracking-tight">1. Basic information</h2>
              <p className="text-xs text-[#6F6F6B] font-medium">Give your product a name. You can always change this later.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="productName" className="block text-xs font-semibold text-[#1F1F1F] uppercase tracking-wider">
                Product name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }))
                }}
                placeholder="e.g. My digital guide"
                className={`w-full h-14 bg-[#FFFFFF] border text-[#1F1F1F] font-semibold text-base px-4 rounded-[14px] outline-none transition-all placeholder:text-[#999995] placeholder:font-normal ${errors.name
                  ? 'border-[#DC2626] focus:border-[#DC2626] ring-1 ring-[#DC2626]'
                  : 'border-[#E5E5E3] focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F]'
                  }`}
                required
              />
              {errors.name && (
                <p className="text-xs font-medium text-[#DC2626] flex items-center gap-1 pt-0.5">
                  <Info className="h-3.5 w-3.5" /> {errors.name}
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: CHOOSE PRODUCT TYPE */}
          <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 sm:p-8 space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="border-b border-[#E5E5E3] pb-4 space-y-1">
              <h2 className="text-lg font-bold text-[#1F1F1F] tracking-tight">2. Choose product type</h2>
              <p className="text-xs text-[#6F6F6B] font-medium">Select the type of product you want to sell.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {PRODUCT_TYPES.map((t) => {
                const isAvailable = t.available
                const isSelected = selectedType === t.type && isAvailable
                const Icon = t.icon
                return (
                  <button
                    key={t.type}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) return
                      setSelectedType(t.type)
                      if (errors.type) setErrors((prev) => ({ ...prev, type: null }))
                    }}
                    className={`group relative text-left rounded-[18px] p-4 border transition-all duration-200 flex flex-col justify-between space-y-3 ${isAvailable
                        ? isSelected
                          ? 'border-2 border-[#1F1F1F] bg-[#F5F5F3] shadow-none cursor-pointer'
                          : 'border-[#E5E5E3] bg-[#FFFFFF] hover:border-[#1F1F1F]/40 hover:bg-[#F5F5F3] cursor-pointer'
                        : 'border-[#E5E5E3] bg-[#FBFBFB] opacity-60 cursor-not-allowed select-none'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-10 h-10 rounded-[12px] ${isAvailable ? t.bg : 'bg-[#F2F1EF] text-[#999995] border-[#E5E5E3]'} border flex items-center justify-center shrink-0`}>
                        <Icon className="h-5 w-5 stroke-[2.5]" />
                      </div>

                      {isAvailable ? (
                        isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-[10px]">
                            ✓
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#F2F1EF] text-[#6F6F6B] font-bold text-[9px] uppercase tracking-wider shrink-0 border border-[#E5E5E3]">
                          COMING SOON
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className={`text-sm font-bold transition-colors ${isAvailable
                          ? isSelected ? 'text-[#1F1F1F]' : 'text-[#1F1F1F]'
                          : 'text-[#999995]'
                        }`}>
                        {t.title}
                      </h3>
                      <p className="text-xs text-[#6F6F6B] font-medium leading-relaxed line-clamp-2">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            {errors.type && (
              <p className="text-xs font-medium text-[#DC2626] flex items-center gap-1 pt-1">
                <Info className="h-3.5 w-3.5" /> {errors.type}
              </p>
            )}
          </div>

          {/* SECTION 3: SET YOUR PRICE */}
          <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 sm:p-8 space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="border-b border-[#E5E5E3] pb-4 space-y-1">
              <h2 className="text-lg font-bold text-[#1F1F1F] tracking-tight">3. Set your price</h2>
              <p className="text-xs text-[#6F6F6B] font-medium">Choose a currency and enter the price for your product.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Currency Selector */}
              <div className="sm:col-span-5 space-y-2">
                <label htmlFor="currency" className="block text-xs font-semibold text-[#1F1F1F] uppercase tracking-wider">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-14 bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] font-semibold text-sm px-4 rounded-[14px] outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#FFFFFF] text-[#1F1F1F]">
                      {c.symbol} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Input */}
              <div className="sm:col-span-7 space-y-2">
                <label htmlFor="price" className="block text-xs font-semibold text-[#1F1F1F] uppercase tracking-wider">
                  Price ({currentSymbol}) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-bold text-base text-[#1F1F1F] select-none">
                    {currentSymbol}
                  </span>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value)
                      if (errors.price) setErrors((prev) => ({ ...prev, price: null }))
                    }}
                    placeholder="1000"
                    className={`w-full h-14 bg-[#FFFFFF] border text-[#1F1F1F] font-semibold text-base pl-9 pr-4 rounded-[14px] outline-none transition-all placeholder:text-[#999995] placeholder:font-normal ${errors.price
                      ? 'border-[#DC2626] focus:border-[#DC2626] ring-1 ring-[#DC2626]'
                      : 'border-[#E5E5E3] focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F]'
                      }`}
                    required
                  />
                </div>
                {errors.price && (
                  <p className="text-xs font-medium text-[#DC2626] flex items-center gap-1 pt-0.5">
                    <Info className="h-3.5 w-3.5" /> {errors.price}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-[#6F6F6B] font-medium pt-1">
              💡 Tip: Enter <strong className="text-[#1F1F1F]">0</strong> to offer your product for free as a lead magnet.
            </p>
          </div>

          {/* BOTTOM SUBMIT BUTTON ROW */}
          <div className="flex items-center justify-between pt-2">
            <Link href="/dashboard/products">
              <Button variant="outline" type="button" className="font-bold text-xs bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F] border-[#E5E5E3] rounded-full h-11 px-6 cursor-pointer">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={loading}
              className="font-bold text-sm bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-white rounded-full h-11 px-8 flex items-center gap-2 shadow-none cursor-pointer"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Next: Customize <ArrowRight className="h-4 w-4 stroke-[3]" /></>}
            </Button>
          </div>

        </form>

      </div>

      <BaseModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        title="Product created 🎉"
        secondaryLabel="Customize Details"
        onSecondary={() => router.push(`/dashboard/products/${createdProduct?.id}`)}
        primaryLabel="Add to My Store"
        onPrimary={() => router.push('/dashboard/store')}
      >
        <div className="bg-[#FBFBFB] p-4 rounded-[16px] border border-[#E5E5E3] space-y-1">
          <p className="font-bold text-sm text-[#1F1F1F]">{createdProduct?.title}</p>
          <p className="text-sm font-semibold text-[#1F1F1F]">
            {Number(createdProduct?.price) === 0 ? 'FREE' : `Price: ${createdProduct?.price}`}
          </p>
        </div>
      </BaseModal>
    </div>
  )
}
