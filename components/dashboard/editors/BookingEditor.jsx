'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Clock,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
  Flame,
  Video,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Info,
} from 'lucide-react'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import StoreItemDisplaySelector from '@/components/dashboard/editors/StoreItemDisplaySelector'
import LinktreeBookingWizardModal from '@/components/coaching/LinktreeBookingWizardModal'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'

const SUPPORTED_CURRENCIES = [
  { code: 'INR', label: 'INR (₹)', symbol: '₹' },
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'CAD', label: 'CAD (CA$)', symbol: 'CA$' },
  { code: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { code: 'AED', label: 'AED (AED)', symbol: 'AED' },
  { code: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { code: 'JPY', label: 'JPY (¥)', symbol: '¥' },
]

export default function BookingEditor({
  section,
  product: initialProduct = null,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
  creatorProfile = null,
  currentPlan = 'FREE',
}) {
  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('idle')
  const [wizardOpen, setWizardOpen] = useState(false)

  const initialProps = section?.props || {}
  // Resolve the product ID: from section props, or from the passed product, or null
  const productId = initialProps.productId || initialProduct?.id || initialProps.bookingId || initialProps.coachingId || null

  const [product, setProduct] = useState(initialProduct)
  const [coachingConfig, setCoachingConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Pricing controls state
  const [priceType, setPriceType] = useState(
    initialProduct?.price && Number(initialProduct.price) > 0 ? 'paid' : 'free'
  )
  const [price, setPrice] = useState(
    initialProduct?.price !== undefined ? String(initialProduct.price) : '1000'
  )
  const [currency, setCurrency] = useState(
    (initialProduct?.currency || 'INR').toUpperCase()
  )
  const [priceError, setPriceError] = useState('')

  // State for editing individual booking type when multiple types exist
  const [editingTypeIndex, setEditingTypeIndex] = useState(null)
  const [typeEditForm, setTypeEditForm] = useState(null)

  // Auto-heal section props if productId was resolved but missing from section props
  useEffect(() => {
    if (section && !section.props?.productId && productId && onUpdateProps) {
      onUpdateProps({ productId })
    }
  }, [section, productId, onUpdateProps])

  const [title, setTitle] = useState(
    initialProps.title || initialProduct?.title || 'Book a session'
  )
  const [displayMode, setDisplayMode] = useState(
    initialProps.layout || initialProps.displayMode || initialProduct?.displayMode || 'classic'
  )

  const titleInputRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Fetch Product & Coaching Config if not provided
  useEffect(() => {
    if (productId) {
      setLoadingConfig(true)
      Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/coaching/config/${productId}`),
      ])
        .then(([pRes, cfgRes]) => {
          if (pRes?.product) {
            setProduct(pRes.product)
            setTitle(pRes.product.title || title)
            if (pRes.product.displayMode) {
              setDisplayMode(pRes.product.displayMode)
            }
            const isPaid = Number(pRes.product.price || 0) > 0
            setPriceType(isPaid ? 'paid' : 'free')
            setPrice(isPaid ? String(pRes.product.price) : '1000')
            if (pRes.product.currency) {
              setCurrency(pRes.product.currency.toUpperCase())
            }
          }
          if (cfgRes?.config) {
            setCoachingConfig(cfgRes.config)
            // If primary booking type is configured, reflect its pricing
            const bTypes = cfgRes.config.bookingTypes
            if (Array.isArray(bTypes) && bTypes.length > 0) {
              const primary = bTypes[0]
              const isPaid = !primary.isFree && Number(primary.price || 0) > 0
              setPriceType(isPaid ? 'paid' : 'free')
              if (isPaid) setPrice(String(primary.price))
              if (primary.currency) setCurrency(primary.currency.toUpperCase())
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingConfig(false))
    }
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSave = (patch) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (onUpdateProps) {
          onUpdateProps(patch)
        }
        if (productId) {
          const productUpdates = {}
          if (patch.title !== undefined) productUpdates.title = patch.title
          if (patch.displayMode !== undefined) productUpdates.displayMode = patch.displayMode
          if (patch.price !== undefined) productUpdates.price = patch.price
          if (patch.currency !== undefined) productUpdates.currency = patch.currency

          if (Object.keys(productUpdates).length > 0) {
            await api.put(`/products/${productId}`, productUpdates)
          }

          if (patch.bookingTypes || patch.price !== undefined || patch.currency !== undefined) {
            const configPayload = {
              ...(coachingConfig || {}),
              price: patch.price !== undefined ? patch.price : (priceType === 'free' ? 0 : parseFloat(price) || 0),
              currency: (patch.currency || currency).toLowerCase(),
              isFree: patch.price === 0 || priceType === 'free',
              bookingTypes: patch.bookingTypes || coachingConfig?.bookingTypes || [],
            }
            const res = await api.post(`/coaching/config/${productId}`, configPayload)
            if (res?.config) {
              setCoachingConfig(res.config)
            }
          }
        }
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1500)
      } catch (err) {
        console.error('Failed to auto-save booking:', err)
        setSaveState('error')
        toast.error(err.message || 'Failed to save changes')
      }
    }, 400)
  }

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    triggerSave({ title: val })
  }

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode)
    triggerSave({ layout: mode, displayMode: mode })
  }

  // Price type toggle handler
  const handlePriceTypeChange = (newType) => {
    setPriceType(newType)
    setPriceError('')
    if (newType === 'free') {
      let updatedTypes = coachingConfig?.bookingTypes || []
      if (updatedTypes.length > 0) {
        updatedTypes = updatedTypes.map((bt, i) =>
          i === 0 ? { ...bt, isFree: true, price: 0 } : bt
        )
      }
      triggerSave({ price: 0, currency: currency.toLowerCase(), bookingTypes: updatedTypes })
    } else {
      const num = parseFloat(price) > 0 ? parseFloat(price) : 1000
      setPrice(String(num))
      let updatedTypes = coachingConfig?.bookingTypes || []
      if (updatedTypes.length > 0) {
        updatedTypes = updatedTypes.map((bt, i) =>
          i === 0 ? { ...bt, isFree: false, price: num, currency: currency.toLowerCase() } : bt
        )
      }
      triggerSave({ price: num, currency: currency.toLowerCase(), bookingTypes: updatedTypes })
    }
  }

  // Price input change handler
  const handlePriceChange = (e) => {
    const val = e.target.value
    setPrice(val)
    if (val === '' || isNaN(Number(val)) || Number(val) <= 0) {
      setPriceError('Session price must be greater than zero')
      return
    }
    setPriceError('')
    const num = Number(val)
    let updatedTypes = coachingConfig?.bookingTypes || []
    if (updatedTypes.length > 0) {
      updatedTypes = updatedTypes.map((bt, i) =>
        i === 0 ? { ...bt, isFree: false, price: num } : bt
      )
    }
    triggerSave({ price: num, currency: currency.toLowerCase(), bookingTypes: updatedTypes })
  }

  // Currency select change handler
  const handleCurrencyChange = (e) => {
    const newCurr = e.target.value.toUpperCase()
    setCurrency(newCurr)
    let updatedTypes = coachingConfig?.bookingTypes || []
    if (updatedTypes.length > 0) {
      updatedTypes = updatedTypes.map((bt, i) =>
        i === 0 ? { ...bt, currency: newCurr.toLowerCase() } : bt
      )
    }
    triggerSave({
      price: priceType === 'free' ? 0 : (parseFloat(price) || 0),
      currency: newCurr.toLowerCase(),
      bookingTypes: updatedTypes,
    })
  }

  // Edit specific booking type
  const startEditBookingType = (index) => {
    const bt = coachingConfig.bookingTypes[index]
    setEditingTypeIndex(index)
    setTypeEditForm({
      name: bt.name,
      durationMinutes: bt.durationMinutes,
      isFree: Boolean(bt.isFree || Number(bt.price || 0) === 0),
      price: bt.price !== undefined ? String(bt.price) : '1000',
      currency: (bt.currency || currency || 'INR').toUpperCase(),
    })
  }

  const saveBookingTypeEdit = () => {
    if (!typeEditForm.name.trim()) {
      toast.error('Booking type name is required')
      return
    }
    const isFree = Boolean(typeEditForm.isFree)
    let numPrice = isFree ? 0 : parseFloat(typeEditForm.price)
    if (!isFree && (isNaN(numPrice) || numPrice <= 0)) {
      toast.error('Price must be greater than zero for paid sessions')
      return
    }
    const curr = (typeEditForm.currency || 'INR').toUpperCase()

    const updatedTypes = [...(coachingConfig?.bookingTypes || [])]
    updatedTypes[editingTypeIndex] = {
      ...updatedTypes[editingTypeIndex],
      name: typeEditForm.name.trim(),
      durationMinutes: parseInt(typeEditForm.durationMinutes, 10) || 30,
      isFree,
      price: numPrice,
      currency: curr.toLowerCase(),
    }

    // If primary was edited, sync top-level product price/currency
    const patch = { bookingTypes: updatedTypes }
    if (editingTypeIndex === 0) {
      patch.price = numPrice
      patch.currency = curr.toLowerCase()
      setPriceType(isFree ? 'free' : 'paid')
      setPrice(String(numPrice))
      setCurrency(curr)
    }

    triggerSave(patch)
    setEditingTypeIndex(null)
    setTypeEditForm(null)
    toast.success('Session type updated')
  }

  // Consider setup complete if we have an availability configuration with at least one enabled day
  const isSetupComplete = Boolean(
    coachingConfig &&
    coachingConfig.availability?.some((d) => d.enabled)
  )

  // Stats from coaching config
  const configuredTypes = coachingConfig?.bookingTypes?.length || 0
  const enabledDays = coachingConfig?.availability?.filter((d) => d.enabled)?.length || 0

  const handleWizardSuccess = (savedProduct) => {
    if (savedProduct) {
      setProduct(savedProduct)
      setTitle(savedProduct.title || title)
      const isPaid = Number(savedProduct.price || 0) > 0
      setPriceType(isPaid ? 'paid' : 'free')
      if (isPaid) setPrice(String(savedProduct.price))
      if (savedProduct.currency) setCurrency(savedProduct.currency.toUpperCase())
      if (onUpdateProps) {
        onUpdateProps({
          title: savedProduct.title || title,
          price: savedProduct.price,
          currency: savedProduct.currency,
        })
      }
    }
    // Reload coaching config after save
    if (productId || savedProduct?.id) {
      const pid = productId || savedProduct.id
      api.get(`/coaching/config/${pid}`)
        .then((cfgRes) => {
          if (cfgRes?.config) setCoachingConfig(cfgRes.config)
        })
        .catch(() => {})
    }
  }

  return (
    <>
      <StoreItemEditorShell
        itemTypeLabel="Bookings"
        title={title || 'Bookings'}
        onBack={onBack}
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'powerups', label: 'Power-ups' },
          { id: 'insights', label: 'Insights' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveState={saveState}
        isHidden={section?.hidden}
        onToggleHidden={onToggleHidden}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onOpenMobilePreview={onOpenMobilePreview}
      >
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-7">

            {/* SECTION: INFO */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Info</h3>

              {/* Title Input with character counter and sparkle icon */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    maxLength={255}
                    onChange={handleTitleChange}
                    placeholder="Book a session"
                    className="w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-[#6F6F6B] font-mono">
                    {title.length}/255
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION: SESSION PRICING */}
            <div className="space-y-4 pt-2 border-t border-[#F2F1EF]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Pricing</h3>
                <p className="text-xs text-[#6F6F6B]">
                  Set session pricing and accepted currency for your bookings.
                </p>
              </div>

              {/* Price Type Segmented Control */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1F1F1F] block">Price type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F5F3] rounded-[14px]">
                  <button
                    type="button"
                    onClick={() => handlePriceTypeChange('free')}
                    className={`h-10 rounded-[11px] text-xs font-bold transition-all ${
                      priceType === 'free'
                        ? 'bg-white text-[#1F1F1F] shadow-sm'
                        : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePriceTypeChange('paid')}
                    className={`h-10 rounded-[11px] text-xs font-bold transition-all ${
                      priceType === 'paid'
                        ? 'bg-white text-[#1F1F1F] shadow-sm'
                        : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {/* Free Mode Info */}
              {priceType === 'free' && (
                <div className="rounded-[14px] bg-[#F9F9F8] border border-[#E5E5E3] p-4 text-xs text-[#6F6F6B] flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#1F1F1F]">Free booking session</p>
                    <p className="mt-0.5 leading-relaxed">
                      Session price is set to zero. Attendees can pick a time and confirm immediately without going through payment.
                    </p>
                  </div>
                </div>
              )}

              {/* Paid Mode Controls */}
              {priceType === 'paid' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Session Price */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1F1F1F]">
                        Session price *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={price}
                          onChange={handlePriceChange}
                          placeholder="1000"
                          className={`w-full h-11 px-3.5 rounded-[12px] bg-white border text-sm font-semibold text-[#1F1F1F] focus:outline-none transition-all ${
                            priceError
                              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                              : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F]'
                          }`}
                        />
                      </div>
                      {priceError && (
                        <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {priceError}
                        </p>
                      )}
                    </div>

                    {/* Currency Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1F1F1F]">Currency</label>
                      <div className="relative">
                        <select
                          value={currency}
                          onChange={handleCurrencyChange}
                          className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-white border border-[#D9D9D9] text-sm font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all appearance-none uppercase"
                        >
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="h-4 w-4 text-[#6F6F6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6F6F6B] leading-relaxed">
                    India attendees are routed to Razorpay (INR); international attendees outside India are routed to Dodo Payments.
                  </p>
                </div>
              )}

              {/* Multiple Booking Types Configuration */}
              {coachingConfig?.bookingTypes && coachingConfig.bookingTypes.length > 1 && (
                <div className="pt-2 border-t border-[#F2F1EF] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1F1F]">Session Types ({coachingConfig.bookingTypes.length})</h4>
                      <p className="text-[11px] text-[#6F6F6B]">Each session type maintains its own price and currency.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardOpen(true)}
                      className="text-xs font-bold text-[#1F1F1F] hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add type
                    </button>
                  </div>

                  <div className="space-y-2">
                    {coachingConfig.bookingTypes.map((bt, idx) => {
                      const isFree = bt.isFree || Number(bt.price || 0) === 0
                      const isEditing = editingTypeIndex === idx
                      return (
                        <div
                          key={bt.id || idx}
                          className="rounded-[14px] border border-[#E5E5E3] bg-[#FAF9F6] p-3.5 space-y-2.5 transition-all"
                        >
                          {isEditing ? (
                            <div className="space-y-3 bg-white p-3 rounded-[10px] border border-[#D9D9D9]">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-bold text-[#1F1F1F]">Name</label>
                                  <input
                                    type="text"
                                    value={typeEditForm.name}
                                    onChange={(e) => setTypeEditForm({ ...typeEditForm, name: e.target.value })}
                                    className="w-full h-8 px-2 rounded-lg border border-[#D9D9D9] text-xs mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-[#1F1F1F]">Duration (min)</label>
                                  <select
                                    value={typeEditForm.durationMinutes}
                                    onChange={(e) => setTypeEditForm({ ...typeEditForm, durationMinutes: parseInt(e.target.value, 10) })}
                                    className="w-full h-8 px-2 rounded-lg border border-[#D9D9D9] text-xs mt-1 bg-white"
                                  >
                                    <option value={15}>15 min</option>
                                    <option value={30}>30 min</option>
                                    <option value={45}>45 min</option>
                                    <option value={60}>60 min</option>
                                    <option value={90}>90 min</option>
                                    <option value={120}>120 min</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-bold text-[#1F1F1F]">Price type</label>
                                  <select
                                    value={typeEditForm.isFree ? 'free' : 'paid'}
                                    onChange={(e) => setTypeEditForm({ ...typeEditForm, isFree: e.target.value === 'free', price: e.target.value === 'free' ? 0 : typeEditForm.price })}
                                    className="w-full h-8 px-2 rounded-lg border border-[#D9D9D9] text-xs mt-1 bg-white"
                                  >
                                    <option value="free">Free</option>
                                    <option value="paid">Paid</option>
                                  </select>
                                </div>

                                {!typeEditForm.isFree && (
                                  <div>
                                    <label className="text-[11px] font-bold text-[#1F1F1F]">Price & Currency</label>
                                    <div className="flex gap-1.5 mt-1">
                                      <input
                                        type="number"
                                        min={1}
                                        value={typeEditForm.price}
                                        onChange={(e) => setTypeEditForm({ ...typeEditForm, price: e.target.value })}
                                        className="w-2/3 h-8 px-2 rounded-lg border border-[#D9D9D9] text-xs"
                                        placeholder="1000"
                                      />
                                      <select
                                        value={typeEditForm.currency}
                                        onChange={(e) => setTypeEditForm({ ...typeEditForm, currency: e.target.value })}
                                        className="w-1/3 h-8 px-1 rounded-lg border border-[#D9D9D9] text-[10px] uppercase font-bold bg-white"
                                      >
                                        {SUPPORTED_CURRENCIES.map((c) => (
                                          <option key={c.code} value={c.code}>{c.code}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F1EF]">
                                <button
                                  type="button"
                                  onClick={() => setEditingTypeIndex(null)}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#6F6F6B] hover:text-[#1F1F1F]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveBookingTypeEdit}
                                  className="px-3 py-1 bg-[#1F1F1F] text-white rounded-lg text-xs font-bold hover:bg-black"
                                >
                                  Save type
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-[#1F1F1F]">{bt.name}</p>
                                <p className="text-[11px] text-[#6F6F6B] flex items-center gap-2">
                                  <span>{bt.durationMinutes || 30} mins</span>
                                  <span>•</span>
                                  <span className={`font-semibold ${isFree ? 'text-emerald-700' : 'text-[#1F1F1F]'}`}>
                                    {isFree ? 'Free' : `${(bt.currency || 'INR').toUpperCase()} ${bt.price}`}
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => startEditBookingType(idx)}
                                className="h-8 px-3 rounded-lg border border-[#D9D9D9] bg-white text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] flex items-center gap-1.5 transition-all"
                              >
                                <Edit2 className="h-3 w-3 text-[#6F6F6B]" />
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: DISPLAY (Classic vs Featured) */}
            <div className="space-y-2 pt-2 border-t border-[#F2F1EF]">
              <StoreItemDisplaySelector
                value={displayMode}
                onChange={handleDisplayModeChange}
                thumbnail={product?.thumbnail || product?.coverImage}
                itemType="product"
                title="Display"
                subtitle="How you display your content"
              />
            </div>

            {/* SECTION: INTERACTION */}
            <div className="space-y-4 pt-2 border-t border-[#F2F1EF]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">
                  Interaction
                </h3>
                <p className="text-xs text-[#6F6F6B]">
                  When the visitor clicks the button
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Bookings</h4>
                  <p className="text-xs leading-relaxed text-[#6F6F6B]">
                    Let visitors book and pay for time with you, right on your storefront.
                  </p>
                </div>

                {/* Setup status summary — only shown after setup */}
                {isSetupComplete && (
                  <div className="rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <div className="text-xs text-[#15803D] space-y-0.5">
                      <p className="font-semibold">Booking is set up</p>
                      <p className="text-[#166534]">
                        {enabledDays} day{enabledDays !== 1 ? 's' : ''} available
                        {configuredTypes > 0 ? ` · ${configuredTypes} session type${configuredTypes !== 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Full-width pill Continue setup button — matching reference */}
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="w-full h-12 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  Continue setup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POWER-UPS */}
        {activeTab === 'powerups' && (
          <div className="space-y-5 py-2">
            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F1F1F]">
                <Flame className="h-4 w-4 text-orange-500" />
                Booking Reminders
              </div>
              <p className="text-xs text-[#6F6F6B] leading-relaxed">
                Automated email reminders are automatically dispatched to customers 24 hours and 1 hour before scheduled booking calls.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F1F1F]">
                <Video className="h-4 w-4 text-purple-600" />
                Native Google Meet Integration
              </div>
              <p className="text-xs text-[#6F6F6B] leading-relaxed">
                Unique Google Meet links are generated and included in calendar invitations sent to both you and your customer.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-[#FAF9F6] space-y-1">
                <span className="text-xs text-[#6F6F6B]">Total Bookings</span>
                <p className="text-xl font-bold text-[#1F1F1F]">0</p>
              </div>
              <div className="rounded-[16px] border border-[#E5E5E3] p-4 bg-[#FAF9F6] space-y-1">
                <span className="text-xs text-[#6F6F6B]">Completed Sessions</span>
                <p className="text-xl font-bold text-[#1F1F1F]">0</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#E5E5E3] p-5 bg-white text-center py-8 space-y-2">
              <BarChart3 className="h-8 w-8 text-[#999995] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[#1F1F1F]">No booking traffic yet</p>
              <p className="text-xs text-[#6F6F6B]">
                Publish your store and share your booking link with your audience to start scheduling sessions.
              </p>
            </div>
          </div>
        )}
      </StoreItemEditorShell>

      {/* SETUP WIZARD MODAL */}
      <LinktreeBookingWizardModal
        open={wizardOpen}
        editProductId={productId}
        creatorProfile={creatorProfile}
        currentPlan={currentPlan}
        onClose={() => setWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />
    </>
  )
}
