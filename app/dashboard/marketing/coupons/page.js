'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'
import { toast } from 'sonner'
import {
  Tag, Plus, Trash2, Calendar, Sparkles, Check, Percent,
  DollarSign, Package, Layers, Clock, Shuffle, X, AlertCircle,
  Loader2, RefreshCw, ArrowRight
} from 'lucide-react'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

const VALIDITY_OPTIONS = [
  { label: '1 Hour', hours: 1 },
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours (1 Day)', hours: 24 },
  { label: '3 Days', hours: 72 },
  { label: '7 Days (1 Week)', hours: 168 },
  { label: '30 Days (1 Month)', hours: 720 },
]

export default function CreatorCouponsPage() {
  const router = useRouter()
  const { setHeaderConfig } = useDashboardHeader()
  const [coupons, setCoupons] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    discount: 20,
    scope: 'ALL',
    productIds: [],
    minOrderPrice: 0,
    validityHours: 24,
  })

  useEffect(() => {
    setHeaderConfig({
      title: 'Coupons & Discounts',
      actions: null,
    })
  }, [setHeaderConfig])

  useEffect(() => {
    fetchCoupons()
    fetchProducts()
  }, [])

  async function fetchCoupons() {
    setLoading(true)
    try {
      const res = await api.get('/coupons')
      setCoupons(Array.isArray(res?.coupons) ? res.coupons : [])
    } catch (err) {
      toast.error(err.message || 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  function fetchProducts() {
    api.get('/products')
      .then((res) => setProducts(res?.products || []))
      .catch(() => {})
  }

  function generateRandomCode() {
    const prefixes = ['SAVE', 'WELCOME', 'DEAL', 'FLASH', 'OFF', 'CREATOR', 'SPECIAL']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const num = Math.floor(Math.random() * 8 + 2) * 5
    setForm((prev) => ({ ...prev, code: `${prefix}${num}` }))
  }

  function toggleProductSelection(prodId) {
    setForm((prev) => {
      const exists = prev.productIds.includes(prodId)
      const next = exists ? prev.productIds.filter((id) => id !== prodId) : [...prev.productIds, prodId]
      return { ...prev, productIds: next }
    })
  }

  async function handleCreate(e) {
    e.preventDefault()
    const trimmedCode = form.code.toUpperCase().trim()
    if (!trimmedCode) return toast.error('Please enter a coupon code')
    if (!form.discount || Number(form.discount) <= 0) return toast.error('Discount must be greater than 0')
    if (form.type === 'PERCENTAGE' && Number(form.discount) > 100) return toast.error('Percentage discount cannot exceed 100%')

    if (form.scope === 'SPECIFIC' && form.productIds.length === 0) {
      return toast.error('Please select at least one product for specific targeting')
    }

    try {
      const res = await api.post('/coupons', {
        code: trimmedCode,
        type: form.type,
        discount: Number(form.discount),
        scope: form.scope,
        productIds: form.scope === 'SPECIFIC' ? form.productIds : null,
        minOrderPrice: Number(form.minOrderPrice || 0),
        validityHours: Number(form.validityHours || 24),
      })
      toast.success(`Coupon '${trimmedCode}' created successfully!`)
      setShowModal(false)
      setForm({
        code: '',
        type: 'PERCENTAGE',
        discount: 20,
        scope: 'ALL',
        productIds: [],
        minOrderPrice: 0,
        validityHours: 24,
      })
      
      if (res?.coupon) {
        setCoupons((prev) => {
          const list = Array.isArray(prev) ? prev : []
          const exists = list.some((c) => c.id === res.coupon.id || c.code === res.coupon.code)
          if (exists) return list.map((c) => (c.id === res.coupon.id || c.code === res.coupon.code ? res.coupon : c))
          return [res.coupon, ...list]
        })
      }
      await fetchCoupons()
    } catch (err) {
      if (err.status === 403 || err.message?.includes('Pro plan') || err.message?.includes('Upgrade')) {
        setShowModal(false)
        setShowUpgradeModal(true)
      } else {
        toast.error(err.message || 'Failed to create coupon')
      }
    }
  }

  async function handleDelete(id, code) {
    if (!window.confirm(`Are you sure you want to delete coupon '${code}'?`)) return
    setDeletingId(id)
    try {
      await api.delete(`/coupons/${id}`)
      toast.success(`Coupon '${code}' deleted`)
      setCoupons((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete coupon')
    } finally {
      setDeletingId(null)
    }
  }

  const expirationPreview = new Date(Date.now() + form.validityHours * 3600 * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Compute metrics from real coupon data
  const now = Date.now()
  const activeCount = coupons.filter(c => {
    const expDate = c.expiresAt ? new Date(c.expiresAt).getTime() : (c.expiryDate ? new Date(c.expiryDate).getTime() : null)
    return (!c.status || c.status === 'ACTIVE') && (!expDate || expDate > now)
  }).length

  const expiredCount = coupons.filter(c => {
    const expDate = c.expiresAt ? new Date(c.expiresAt).getTime() : (c.expiryDate ? new Date(c.expiryDate).getTime() : null)
    return (c.status && c.status === 'EXPIRED') || (expDate && expDate <= now)
  }).length

  const totalRedemptions = coupons.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-[#1F1F1F]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E3] bg-[#F2F1EF] px-3.5 py-1 text-xs font-bold text-[#1F1F1F] mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Promotional Discounts
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] tracking-tight">
            Coupons &amp; Discounts
          </h1>
          <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">
            Create percentage or fixed amount discounts with product targeting, minimum order rules, and validity windows.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!form.code) generateRandomCode()
            setShowModal(true)
          }}
          className="px-5 py-2.5 rounded-full bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] transition-colors flex items-center gap-1.5 shadow-none shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* METRIC CHIPS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] uppercase font-bold text-[#6F6F6B] block">Active Coupons</span>
          <span className="text-lg font-extrabold text-[#16A34A] mt-0.5 block">{activeCount}</span>
        </div>
        <div className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] uppercase font-bold text-[#6F6F6B] block">Expired</span>
          <span className="text-lg font-extrabold text-[#DC2626] mt-0.5 block">{expiredCount}</span>
        </div>
        <div className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] uppercase font-bold text-[#6F6F6B] block">Total Redemptions</span>
          <span className="text-lg font-extrabold text-[#1F1F1F] mt-0.5 block">{totalRedemptions}</span>
        </div>
        <div className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] uppercase font-bold text-[#6F6F6B] block">Total Created</span>
          <span className="text-lg font-extrabold text-[#1F1F1F] mt-0.5 block">{coupons.length}</span>
        </div>
      </div>

      {/* COUPONS LIST OR EMPTY STATE */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-44 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5E3] animate-pulse" />
          <div className="h-44 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5E3] animate-pulse" />
          <div className="h-44 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5E3] animate-pulse" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-12 text-center space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="h-12 w-12 rounded-[14px] bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center mx-auto text-[#1F1F1F]">
            <Tag className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1F1F1F]">No Active Coupons</h3>
            <p className="text-xs text-[#6F6F6B] max-w-md mx-auto mt-1">
              Create a discount code to give your customers a reason to buy.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!form.code) generateRandomCode()
                setShowModal(true)
              }}
              className="px-6 py-2.5 rounded-full bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] transition-colors shadow-none cursor-pointer"
            >
              Create Your First Coupon
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const expDate = c.expiresAt ? new Date(c.expiresAt) : (c.expiryDate ? new Date(c.expiryDate) : null)
            const isExp = expDate && expDate <= new Date()

            return (
              <div
                key={c.id}
                className="rounded-[20px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 space-y-4 hover:border-[#1F1F1F]/40 hover:bg-[#F5F5F3] transition-all flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Code + Status + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold text-[#1F1F1F] bg-[#F2F1EF] px-3 py-1 rounded-full border border-[#E5E5E3] tracking-wider">
                        {c.code}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isExp
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
                          : 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20'
                      }`}>
                        {isExp ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.code)}
                      disabled={deletingId === c.id}
                      className="text-[#6F6F6B] hover:text-[#DC2626] p-1.5 rounded-full hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <div className="text-2xl font-extrabold text-[#1F1F1F]">
                      {c.type === 'PERCENTAGE' ? `${c.discount}% OFF` : `₹${c.discount} OFF`}
                    </div>
                  </div>

                  {/* Scope & Rules */}
                  <div className="space-y-1.5 text-xs text-[#6F6F6B] pt-2 border-t border-[#E5E5E3]">
                    <div className="flex items-start gap-1.5">
                      <Package className="h-3.5 w-3.5 text-[#1F1F1F] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-[#1F1F1F]">
                        {c.scope === 'SPECIFIC' && c.productTitles && c.productTitles.length > 0
                          ? `Applies to: ${c.productTitles.join(', ')}`
                          : (c.scope === 'SPECIFIC' ? 'Specific Products' : 'Applies to: All Products')}
                      </span>
                    </div>

                    {c.minOrderPrice > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                        <span>Min. Order: ₹{c.minOrderPrice}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#6F6F6B] shrink-0" />
                      <span>{c.usedCount || 0} redemption{c.usedCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>

                {/* Expiration Footer */}
                {expDate && (
                  <div className="text-[10px] font-mono text-[#999995] pt-2.5 border-t border-[#E5E5E3] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#1F1F1F]" />
                      <span>Expires: {expDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] max-w-lg w-full rounded-[24px] p-6 sm:p-8 space-y-5 border border-[#E5E5E3] shadow-[0_20px_60px_rgba(0,0,0,0.12)] my-8 text-[#1F1F1F]">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-4">
              <h3 className="text-base font-bold text-[#1F1F1F]">Create Discount Coupon</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#6F6F6B] hover:text-[#1F1F1F] p-1.5 rounded-full hover:bg-[#F5F5F3] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Coupon Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">Coupon Code *</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-[#1F1F1F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Shuffle className="h-3 w-3" /> Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="e.g. SAVE20"
                  className="w-full text-xs font-mono font-extrabold uppercase bg-[#FFFFFF] border border-[#E5E5E3] rounded-[14px] px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">Discount Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[14px] px-3.5 py-2.5 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                  >
                    <option value="PERCENTAGE">Percentage (% OFF)</option>
                    <option value="FIXED">Fixed Amount (₹ OFF)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                    {form.type === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.type === 'PERCENTAGE' ? '100' : '1000000'}
                    required
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    className="w-full text-xs font-bold bg-[#FFFFFF] border border-[#E5E5E3] rounded-[14px] px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                  />
                </div>
              </div>

              {/* Product Scope */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">Product Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, scope: 'ALL', productIds: [] })}
                    className={`py-2 px-3 rounded-[12px] border text-xs font-bold transition-colors cursor-pointer ${
                      form.scope === 'ALL'
                        ? 'bg-[#F5F5F3] border-2 border-[#1F1F1F] text-[#1F1F1F]'
                        : 'bg-[#FFFFFF] border border-[#E5E5E3] text-[#6F6F6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    All Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, scope: 'SPECIFIC' })}
                    className={`py-2 px-3 rounded-[12px] border text-xs font-bold transition-colors cursor-pointer ${
                      form.scope === 'SPECIFIC'
                        ? 'bg-[#F5F5F3] border-2 border-[#1F1F1F] text-[#1F1F1F]'
                        : 'bg-[#FFFFFF] border border-[#E5E5E3] text-[#6F6F6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    Specific Product(s)
                  </button>
                </div>

                {/* Specific Product Selector */}
                {form.scope === 'SPECIFIC' && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] text-[#6F6F6B]">
                      Select which products this coupon can be applied to:
                    </p>
                    {products.length === 0 ? (
                      <p className="text-xs text-[#1F1F1F] bg-[#F2F1EF] p-2.5 rounded-[12px] border border-[#E5E5E3]">
                        No published products found. Create a product first or select &apos;All Products&apos;.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-[14px] border border-[#E5E5E3] bg-[#FBFBFB] divide-y divide-[#E5E5E3]">
                        {products.map((p) => {
                          const isSelected = form.productIds.includes(p.id)
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-[#F5F5F3] rounded-[8px] cursor-pointer text-xs font-medium text-[#1F1F1F]"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProductSelection(p.id)}
                                className="h-4 w-4 rounded border-[#E5E5E3] text-[#1F1F1F] accent-[#1F1F1F]"
                              />
                              <span className="truncate flex-1">{p.title}</span>
                              <span className="text-[10px] text-[#6F6F6B] shrink-0 font-mono">
                                ₹{p.price}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Minimum Order Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                  Minimum Order Price (₹0 = No Minimum)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.minOrderPrice}
                  onChange={(e) => setForm({ ...form, minOrderPrice: e.target.value })}
                  placeholder="0"
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[14px] px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                />
              </div>

              {/* Validity Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">Valid Duration</label>
                <select
                  value={form.validityHours}
                  onChange={(e) => setForm({ ...form, validityHours: Number(e.target.value) })}
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[14px] px-3.5 py-2.5 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                >
                  {VALIDITY_OPTIONS.map((opt) => (
                    <option key={opt.hours} value={opt.hours}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6F6F6B] font-medium pt-0.5">
                  Expires on: <span className="font-bold text-[#1F1F1F]">{expirationPreview}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5E5E3]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1F1F1F] text-[#FFFFFF] font-bold text-xs hover:bg-[#000000] active:bg-[#111111] transition-colors shadow-none cursor-pointer"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRO RESTRICTION UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] p-6 sm:p-8 space-y-6 text-[#1F1F1F] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors border border-[#E5E5E3]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#1F1F1F] bg-[#F2F1EF] border border-[#E5E5E3]">
                <Sparkles className="h-3.5 w-3.5" /> PRO FEATURE
              </span>
              <h3 className="text-2xl font-bold text-[#1F1F1F]">Feature requires Pro</h3>
              <p className="text-xs sm:text-sm text-[#6F6F6B] leading-relaxed">
                Creating discount and promotional coupon codes requires an active CreatorStore Pro plan (₹999/month).
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard/settings/billing')}
                className="w-full h-11 bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-[#FFFFFF] font-bold text-xs sm:text-sm rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-none transition-colors"
              >
                Upgrade to Pro <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-[#6F6F6B] hover:text-[#1F1F1F] font-medium py-1 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
