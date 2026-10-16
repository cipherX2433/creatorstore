'use client'

import { formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Edit2, Video, Calendar, Clock, Globe, ShieldCheck, Tag } from 'lucide-react'

const DAYS_OF_WEEK = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
]

export default function BookingReviewStep({
  formState,
  onGoToStep,
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

  const duration = formState.isCustomDuration
    ? (parseInt(formState.customDuration, 10) || 30)
    : (formState.durationMinutes || 30)

  const activeDays = (formState.availability || []).filter((a) => a.enabled)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Review & Publish</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Review your complete coaching setup before publishing it to your store.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Booking Details */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Booking Details</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(1)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="flex items-start gap-4">
            {formState.thumbnail ? (
              <img
                src={formState.thumbnail}
                alt="Thumbnail"
                className="h-16 w-24 rounded-lg object-cover border border-[#D8DFFA] shrink-0"
              />
            ) : (
              <div className="h-16 w-24 rounded-lg bg-[#EEF1FB] border border-[#D8DFFA] flex items-center justify-center shrink-0">
                <Video className="h-6 w-6 text-[#194DF5]" />
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-[#010619] truncate">{formState.name || 'Untitled Booking'}</h3>
              <p className="text-xs text-[#666666] line-clamp-2">{formState.description || 'No description'}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[#666666]">
                <span className="text-[#194DF5]">{formState.sessionType || '1:1 Consultation'}</span>
                <span>•</span>
                <span>{duration} minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Calendar & Location */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Calendar & Location</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(2)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Calendar:</span>
              <span className="font-semibold text-[#16A34A]">Google Calendar (Connected)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Meeting Location:</span>
              <span className="font-semibold text-[#010619]">{formState.meetingType || 'GOOGLE_MEET'}</span>
            </div>
            <div className="flex justify-between py-1 col-span-full">
              <span className="text-[#666666]">Timezone:</span>
              <span className="font-semibold text-[#010619]">{formState.timezone || 'Asia/Kolkata'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Availability Schedule */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Weekly Availability</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(3)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="space-y-1.5 text-xs">
            {activeDays.length === 0 ? (
              <p className="text-[#EF4444] font-semibold">No active availability configured.</p>
            ) : (
              activeDays.map((d) => {
                const dayName = DAYS_OF_WEEK.find((x) => x.dayOfWeek === d.dayOfWeek)?.name
                const windowsStr = (d.windows || [])
                  .map((w) => `${w.startTime} – ${w.endTime}`)
                  .join(', ')
                return (
                  <div key={d.dayOfWeek} className="flex justify-between py-1 border-b border-[#D8DFFA] last:border-none">
                    <span className="font-semibold text-[#010619]">{dayName}</span>
                    <span className="text-[#666666]">{windowsStr}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Section 4: Booking Rules */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Booking Rules</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(4)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Buffers:</span>
              <span className="font-semibold text-[#010619]">
                {formState.bufferBeforeMinutes || 0}m before / {formState.bufferAfterMinutes || 15}m after
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Minimum Notice:</span>
              <span className="font-semibold text-[#010619]">
                {Math.round((formState.minimumNoticeMinutes || 1440) / 60)} hour(s)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Booking Window:</span>
              <span className="font-semibold text-[#010619]">
                {formState.maximumAdvanceDays || 60} days
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
              <span className="text-[#666666]">Cancellation:</span>
              <span className="font-semibold text-[#010619]">
                {formState.allowCancellation !== false ? `Up to ${formState.cancellationPolicyNoticeHours || 24}h before` : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Pricing */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Pricing</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(5)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-base font-bold text-[#010619]">
                {isFree ? 'Free' : formatMoney(finalPrice, currency)}
              </span>
              {offerDiscount && (
                <div className="text-[11px] text-[#666666] mt-0.5">
                  <span className="line-through text-[#6B7399]">{formatMoney(numericBase, currency)}</span> ({discountValue}% OFF)
                </div>
              )}
            </div>

            {offerDiscount && (
              <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded-full border border-[#FDE68A]">
                Special Offer
              </span>
            )}
          </div>
        </div>

        {/* Section 6: Customer Intake */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Customer Fields</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGoToStep(6)}
              className="h-7 text-xs font-semibold text-[#194DF5] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="space-y-1.5 text-xs text-[#666666]">
            <p>• Standard: Name & Email</p>
            {formState.customerFields?.phone?.enabled && <p>• Phone number ({formState.customerFields.phone.required ? 'Required' : 'Optional'})</p>}
            {formState.customerFields?.instagram?.enabled && <p>• Instagram ({formState.customerFields.instagram.required ? 'Required' : 'Optional'})</p>}
            {(formState.questions || []).map((q, i) => (
              <p key={i}>• Custom: {q.question} ({q.required ? 'Required' : 'Optional'})</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
