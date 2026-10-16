'use client'

import { formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import {
  Edit2, GraduationCap, Layers, Award, Clock, DollarSign,
  User, BookOpen, CheckCircle2, ShieldCheck, Tag
} from 'lucide-react'

export default function CourseReviewStep({
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

  const modules = formState.modules || []
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)
  const outcomes = formState.learningOutcomes || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Review & Publish Course</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Review your course details and curriculum before publishing to students.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Course Details */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Course Details</span>
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
                alt="Course cover"
                className="h-16 w-24 rounded-lg object-cover border border-[#D8DFFA] shrink-0"
              />
            ) : (
              <div className="h-16 w-24 rounded-lg bg-[#EEF1FB] border border-[#D8DFFA] flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6 text-[#194DF5]" />
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-[#010619] truncate">{formState.title || 'Untitled Course'}</h3>
              <p className="text-xs text-[#666666] line-clamp-2">{formState.shortDescription || formState.description || 'No description'}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[#666666]">
                <span className="text-[#194DF5]">{formState.category || 'General'}</span>
                <span>•</span>
                <span>{formState.difficulty || 'All levels'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Curriculum Structure */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Curriculum Structure</span>
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

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#EEF1FB] border border-[#D8DFFA]">
              <span className="text-[#666666] block text-[11px]">Modules</span>
              <span className="text-sm font-bold text-[#010619]">{modules.length} Modules</span>
            </div>
            <div className="p-3 rounded-lg bg-[#EEF1FB] border border-[#D8DFFA]">
              <span className="text-[#666666] block text-[11px]">Lessons</span>
              <span className="text-sm font-bold text-[#010619]">{totalLessons} Total Lessons</span>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Pricing & Access</span>
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#010619]">
                {isFree ? 'Free Course' : 'Paid Course'}
              </span>
              <p className="text-[11px] text-[#666666]">
                {formState.accessMode === 'FIXED_PERIOD' ? `${formState.accessExpirationDays || 365} Days Access` : 'Lifetime Access'}
              </p>
            </div>

            <div className="text-right">
              {isFree ? (
                <span className="text-sm font-extrabold text-[#22C55E]">FREE</span>
              ) : (
                <div className="flex items-center gap-2">
                  {offerDiscount && (
                    <span className="text-xs text-[#6B7399] line-through">
                      {formatMoney(numericBase, currency)}
                    </span>
                  )}
                  <span className="text-base font-black text-[#194DF5]">
                    {formatMoney(finalPrice, currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Instructor & Outcomes */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">Instructor & Key Outcomes</span>
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

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#666666]">Instructor:</span>
              <span className="font-semibold text-[#010619]">{formState.instructor || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#666666]">Outcomes Defined:</span>
              <span className="font-semibold text-[#22C55E]">{outcomes.length} learning outcomes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

