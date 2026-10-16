'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tag, AlertCircle } from 'lucide-react'
import { formatMoney } from '@/lib/clientApi'

export default function PricingStep({
  formState,
  onChange,
  errors = {},
}) {
  const isFree = formState.isFree || Number(formState.price) === 0
  const currency = formState.currency || 'inr'
  const numericBase = Math.max(0, parseFloat(formState.basePrice !== undefined ? formState.basePrice : formState.price) || 0)

  const offerDiscount = !!formState.offerDiscount
  const discountType = formState.discountType || 'PERCENTAGE'
  const discountValue = Math.max(0, parseFloat(formState.discountValue || 0))

  let discountAmount = 0
  let finalPrice = isFree ? 0 : numericBase

  if (!isFree && offerDiscount) {
    if (discountType === 'PERCENTAGE') {
      const clampedPct = Math.min(100, discountValue)
      discountAmount = Math.round((numericBase * clampedPct) / 100)
      finalPrice = Math.max(0, numericBase - discountAmount)
    } else {
      discountAmount = Math.min(numericBase, discountValue)
      finalPrice = Math.max(0, numericBase - discountAmount)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Pricing</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Set whether this booking is free or paid, and configure promotional discounts.
        </p>
      </div>

      <div className="space-y-5">
        {/* Free vs Paid Toggle Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => {
              onChange({ isFree: false, price: numericBase || 2000, basePrice: numericBase || 2000 })
            }}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              !isFree
                ? 'border-[#194DF5] bg-[#194DF5]/10 ring-1 ring-[#194DF5]'
                : 'border-[#D8DFFA] bg-[#FFFFFF] hover:bg-[#EEF1FB]'
            }`}
          >
            <span className="text-xs font-bold text-[#010619] block">Paid Session</span>
            <span className="text-[11px] text-[#666666] block mt-0.5">Charge clients a session fee</span>
          </div>

          <div
            onClick={() => {
              onChange({ isFree: true, price: 0, basePrice: 0 })
            }}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              isFree
                ? 'border-[#194DF5] bg-[#194DF5]/10 ring-1 ring-[#194DF5]'
                : 'border-[#D8DFFA] bg-[#FFFFFF] hover:bg-[#EEF1FB]'
            }`}
          >
            <span className="text-xs font-bold text-[#010619] block">Free Booking</span>
            <span className="text-[11px] text-[#666666] block mt-0.5">Offer discovery or free calls</span>
          </div>
        </div>

        {!isFree && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#333333]">Currency</Label>
              <select
                value={currency}
                onChange={(e) => onChange({ currency: e.target.value })}
                className="w-full h-11 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-bold text-[#010619] px-3 cursor-pointer focus:border-[#194DF5]"
              >
                <option value="inr">₹ INR (Indian Rupee)</option>
                <option value="usd">$ USD (US Dollar)</option>
                <option value="eur">€ EUR (Euro)</option>
                <option value="gbp">£ GBP (British Pound)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#333333]">
                Price <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formState.basePrice !== undefined ? formState.basePrice : (formState.price || '')}
                onChange={(e) => {
                  const val = e.target.value
                  onChange({ basePrice: val, price: val })
                }}
                placeholder="2000"
                className={`h-11 rounded-xl bg-[#FFFFFF] text-sm font-bold text-[#010619] ${
                  errors.price ? 'border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                }`}
              />
              {errors.price && (
                <span className="text-xs font-semibold text-[#EF4444]">{errors.price}</span>
              )}
            </div>
          </div>
        )}

        {/* Discount Section */}
        {!isFree && (
          <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-[#F9B67D]" />
                <div>
                  <span className="text-xs font-bold text-[#010619]">Offer a discount</span>
                  <p className="text-[11px] text-[#666666]">Provide a promotional discount percentage</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={offerDiscount}
                onChange={(e) => onChange({ offerDiscount: e.target.checked, discountType: 'PERCENTAGE' })}
                className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5] cursor-pointer"
              />
            </div>

            {offerDiscount && (
              <div className="pt-3 border-t border-[#D8DFFA] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#333333]">Discount Type</Label>
                    <select
                      value={discountType}
                      onChange={(e) => onChange({ discountType: e.target.value })}
                      className="w-full h-10 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-bold text-[#010619] px-3 focus:border-[#194DF5]"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#333333]">
                      {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount'}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={discountType === 'PERCENTAGE' ? '100' : String(numericBase)}
                      value={formState.discountValue !== undefined ? formState.discountValue : 10}
                      onChange={(e) => onChange({ discountValue: e.target.value })}
                      placeholder="10"
                      className={`h-10 rounded-xl bg-[#FFFFFF] text-xs font-bold text-[#010619] transition-colors ${
                        errors.discountValue ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                      }`}
                    />
                    {errors.discountValue && (
                      <span className="text-xs font-semibold text-[#EF4444]">{errors.discountValue}</span>
                    )}
                  </div>
                </div>

                {/* Calculation Visual Card */}
                <div className="p-4 rounded-xl bg-[#F2F5FE] border border-[#D8DFFA] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#666666]">
                    <span>Original price:</span>
                    <span className="font-semibold text-[#010619]">{formatMoney(numericBase, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#D97706]">
                    <span>− {discountType === 'PERCENTAGE' ? `${discountValue}%` : formatMoney(discountAmount, currency)} discount:</span>
                    <span className="font-semibold">− {formatMoney(discountAmount, currency)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#D8DFFA] flex justify-between text-sm font-bold text-[#010619]">
                    <span>Final price:</span>
                    <span className="text-[#194DF5]">{formatMoney(finalPrice, currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
