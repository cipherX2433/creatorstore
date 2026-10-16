'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tag, AlertCircle, Clock } from 'lucide-react'
import { formatMoney } from '@/lib/clientApi'

export default function CoursePricingStep({
  formState,
  onChange,
  errors = {},
}) {
  const isFree = formState.isFree || Number(formState.price) === 0
  const currency = formState.currency || 'inr'
  const numericBase = Math.max(0, parseFloat(formState.basePrice !== undefined ? formState.basePrice : formState.price) || 0)

  const offerDiscount = !isFree && !!formState.offerDiscount
  const discountType = formState.discountType || 'PERCENTAGE'
  const discountValue = Math.max(0, parseFloat(formState.discountValue || 0))

  let discountAmount = 0
  let finalPrice = isFree ? 0 : numericBase

  if (offerDiscount) {
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
        <h2 className="text-lg font-bold text-[#010619]">Course Pricing & Access</h2>
        <p className="text-xs text-[#666666] mt-0.5 font-medium">
          Set whether this course is paid or free, promotional pricing, and student access period.
        </p>
      </div>

      <div className="space-y-5">
        {/* Free vs Paid Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => {
              onChange({ isFree: false, price: numericBase || 999, basePrice: numericBase || 999 })
            }}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              !isFree
                ? 'border-2 border-[#194DF5] bg-[#F5F7FF] shadow-xs'
                : 'border border-[#D8DFFA] bg-[#FFFFFF] hover:border-[#B0BEFA] hover:bg-[#EEF1FB]'
            }`}
          >
            <span className="text-xs font-bold text-[#010619] block">Paid Course</span>
            <span className="text-[11px] text-[#666666] block mt-0.5">Charge students a one-time enrollment fee</span>
          </div>

          <div
            onClick={() => {
              onChange({ isFree: true, price: 0, basePrice: 0 })
            }}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              isFree
                ? 'border-2 border-[#194DF5] bg-[#F5F7FF] shadow-xs'
                : 'border border-[#D8DFFA] bg-[#FFFFFF] hover:border-[#B0BEFA] hover:bg-[#EEF1FB]'
            }`}
          >
            <span className="text-xs font-bold text-[#010619] block">Free Course</span>
            <span className="text-[11px] text-[#666666] block mt-0.5">Offer free access for lead generation</span>
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
                Course Price <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formState.basePrice !== undefined ? formState.basePrice : (formState.price || '')}
                onChange={(e) => {
                  const val = e.target.value
                  onChange({ basePrice: val, price: val })
                }}
                placeholder="999"
                className={`h-11 rounded-xl bg-[#FFFFFF] text-sm font-bold text-[#010619] ${
                  errors.price ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
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
          <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-[#F59E0B]" />
                <div>
                  <span className="text-xs font-bold text-[#010619]">Offer a promotional discount</span>
                  <p className="text-[11px] text-[#666666]">Show original price with a strikethrough discount badge</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={offerDiscount}
                onChange={(e) => onChange({ offerDiscount: e.target.checked, discountType: 'PERCENTAGE' })}
                className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] cursor-pointer"
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
                      value={formState.discountValue !== undefined ? formState.discountValue : 15}
                      onChange={(e) => onChange({ discountValue: e.target.value })}
                      placeholder="15"
                      className={`h-10 rounded-xl bg-[#FFFFFF] text-xs font-bold text-[#010619] ${
                        errors.discountValue ? 'border-[#EF4444]' : 'border-[#D8DFFA]'
                      }`}
                    />
                    {errors.discountValue && (
                      <span className="text-xs font-semibold text-[#EF4444]">{errors.discountValue}</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] space-y-1.5 text-xs shadow-xs">
                  <div className="flex justify-between text-[#666666]">
                    <span>Original price:</span>
                    <span className="font-semibold text-[#010619]">{formatMoney(numericBase, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#F59E0B]">
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

        {/* Access Period */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-3">
          <Label className="text-xs font-semibold text-[#333333]">Student Access Duration</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ accessMode: 'LIFETIME' })}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                formState.accessMode !== 'FIXED_PERIOD'
                  ? 'border-2 border-[#194DF5] bg-[#F5F7FF]'
                  : 'border border-[#D8DFFA] bg-[#FFFFFF] text-[#666666] hover:bg-[#EEF1FB]'
              }`}
            >
              <span className="text-xs font-bold text-[#010619] block">Lifetime Access</span>
              <span className="text-[10px] text-[#666666] block mt-0.5">Students retain permanent access</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ accessMode: 'FIXED_PERIOD' })}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                formState.accessMode === 'FIXED_PERIOD'
                  ? 'border-2 border-[#194DF5] bg-[#F5F7FF]'
                  : 'border border-[#D8DFFA] bg-[#FFFFFF] text-[#666666] hover:bg-[#EEF1FB]'
              }`}
            >
              <span className="text-xs font-bold text-[#010619] block">Fixed Period</span>
              <span className="text-[10px] text-[#666666] block mt-0.5">Expires after a specified number of days</span>
            </button>
          </div>

          {formState.accessMode === 'FIXED_PERIOD' && (
            <div className="pt-2 flex items-center gap-3">
              <Input
                type="number"
                min="1"
                value={formState.accessExpirationDays || 365}
                onChange={(e) => onChange({ accessExpirationDays: parseInt(e.target.value, 10) || 365 })}
                className="h-10 w-28 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs font-semibold text-[#010619]"
              />
              <span className="text-xs text-[#666666]">days of access after enrollment</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
