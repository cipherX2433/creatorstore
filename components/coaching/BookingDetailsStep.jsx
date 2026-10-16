'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Image as ImageIcon, Sparkles, X, Check, Info } from 'lucide-react'

const BOOKING_TYPES = [
  { id: '1:1 Consultation', title: '1:1 Consultation', desc: 'Private advisory or consulting call with a client' },
  { id: 'Coaching Session', title: 'Coaching Session', desc: 'Structured mentorship or coaching session' },
  { id: 'Strategy Call', title: 'Strategy Call', desc: 'Deep dive roadmap or strategy session' },
  { id: 'Mentorship', title: 'Mentorship', desc: 'Career or skill development mentorship' },
  { id: 'Discovery Call', title: 'Discovery Call', desc: 'Introductory chemistry or discovery consultation' },
  { id: 'Custom', title: 'Custom', desc: 'Tailored session with custom agenda' },
]

const DURATION_PRESETS = [15, 30, 45, 60]

export default function BookingDetailsStep({
  formState,
  onChange,
  errors = {},
}) {
  const isCustomDuration = formState.isCustomDuration

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Booking Details</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Create the basic information customers will see when booking this session.
        </p>
      </div>

      <div className="space-y-5">
        {/* A. Thumbnail */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#333333]">
            Thumbnail (1200 × 630 recommended)
          </Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {formState.thumbnail ? (
              <div className="relative h-28 w-48 rounded-xl overflow-hidden border border-[#D8DFFA] bg-[#EEF1FB] shrink-0">
                <img
                  src={formState.thumbnail}
                  alt="Thumbnail preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onChange({ thumbnail: '' })}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#EF4444] transition-colors"
                  title="Remove thumbnail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-28 w-48 rounded-xl border border-dashed border-[#D8DFFA] bg-[#EEF1FB] flex flex-col items-center justify-center gap-1.5 text-[#6B7399] shrink-0">
                <ImageIcon className="h-6 w-6 opacity-60" />
                <span className="text-[10px] font-semibold">No thumbnail</span>
              </div>
            )}

            <div className="flex-1 space-y-2 w-full">
              <Input
                type="url"
                value={formState.thumbnail || ''}
                onChange={(e) => onChange({ thumbnail: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="h-10 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] placeholder:text-[#6B7399] focus:border-[#194DF5]"
              />
              <p className="text-[11px] text-[#6B7399]">
                Paste an image URL to display as the session cover on your public store.
              </p>
            </div>
          </div>
        </div>

        {/* B. Booking Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Booking Name <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            value={formState.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. 1:1 Creator Growth Consultation"
            className={`h-11 rounded-xl bg-[#FFFFFF] text-sm font-semibold text-[#010619] placeholder:text-[#6B7399] transition-colors ${
              errors.name ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.name && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.name}
            </p>
          )}
        </div>

        {/* C. Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Description <span className="text-[#EF4444]">*</span>
          </Label>
          <Textarea
            rows={3}
            value={formState.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A private 30-minute session to discuss your content strategy, audience growth and monetization."
            className={`rounded-xl bg-[#FFFFFF] text-xs text-[#010619] placeholder:text-[#6B7399] resize-none transition-colors ${
              errors.description ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.description && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.description}
            </p>
          )}
        </div>

        {/* D. Booking Type */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold text-[#333333]">Booking Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BOOKING_TYPES.map((bt) => {
              const isSelected = formState.sessionType === bt.id
              return (
                <div
                  key={bt.id}
                  onClick={() => onChange({ sessionType: bt.id })}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#194DF5] bg-[#194DF5]/10 ring-1 ring-[#194DF5]'
                      : 'border-[#D8DFFA] bg-[#FFFFFF] hover:bg-[#EEF1FB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#010619]">{bt.title}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#194DF5]" />}
                  </div>
                  <p className="text-[11px] text-[#666666] mt-1 line-clamp-2">{bt.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* E. Duration */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold text-[#333333]">Duration</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DURATION_PRESETS.map((d) => {
              const isSelected = !isCustomDuration && formState.durationMinutes === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ durationMinutes: d, isCustomDuration: false })}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#194DF5] bg-[#194DF5]/10 text-[#194DF5] font-bold'
                      : 'border-[#D8DFFA] bg-[#FFFFFF] text-[#010619] hover:bg-[#EEF1FB] text-xs font-medium'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 mx-auto mb-1 opacity-70" />
                  {d} min
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => onChange({ isCustomDuration: true })}
              className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                isCustomDuration
                  ? 'border-[#194DF5] bg-[#194DF5]/10 text-[#194DF5] font-bold'
                  : 'border-[#D8DFFA] bg-[#FFFFFF] text-[#010619] hover:bg-[#EEF1FB] text-xs font-medium'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 mx-auto mb-1 opacity-70" />
              Custom
            </button>
          </div>

          {isCustomDuration && (
            <div className="flex items-center gap-3 pt-2">
              <Input
                type="number"
                min="1"
                value={formState.customDuration || formState.durationMinutes || ''}
                onChange={(e) => {
                  const val = e.target.value
                  onChange({ customDuration: val, durationMinutes: parseInt(val, 10) || 0 })
                }}
                placeholder="e.g. 40"
                className={`h-10 w-32 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] ${
                  errors.duration ? 'border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                }`}
              />
              <span className="text-xs text-[#666666]">minutes</span>
              {errors.duration && (
                <span className="text-xs font-semibold text-[#EF4444]">{errors.duration}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
