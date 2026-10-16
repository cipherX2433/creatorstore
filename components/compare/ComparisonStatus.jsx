'use client'

import { Check, X, Minus } from 'lucide-react'

/**
 * Status pill renderer for comparison table cells
 * 
 * Supported status values:
 * - 'yes': Green pill with checkmark
 * - 'no': Red/rose pill with X
 * - 'limited': Neutral slate pill
 * - 'text': Formatted string with subtle styling
 */
export default function ComparisonStatus({ cell, isCreatorStore = false }) {
  if (!cell) {
    return <span className="text-[#858D97]">—</span>
  }

  const { status, label, note } = cell

  if (status === 'yes') {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 ${isCreatorStore ? 'text-center' : 'text-center'}`}>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
          isCreatorStore 
            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] shadow-xs' 
            : 'bg-[#DCFCE7]/70 text-[#15803D] border-[#86EFAC]/70'
        }`}>
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>{label || 'Yes'}</span>
        </div>
        {note && (
          <span className="text-[11px] font-medium text-[#5F6873] leading-tight">
            {note}
          </span>
        )}
      </div>
    )
  }

  if (status === 'no') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFE4E6] text-[#BE123C] border border-[#FDA4AF]">
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{label || 'No'}</span>
        </div>
        {note && (
          <span className="text-[11px] font-medium text-[#858D97] leading-tight max-w-[160px]">
            {note}
          </span>
        )}
      </div>
    )
  }

  if (status === 'limited') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F1F3F5] text-[#5F6873] border border-[#D4D9DE]">
          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{label || 'Limited'}</span>
        </div>
        {note && (
          <span className="text-[11px] font-medium text-[#858D97] leading-tight max-w-[160px]">
            {note}
          </span>
        )}
      </div>
    )
  }

  // Fallback / Text status (e.g. entry pricing)
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center">
      <span className={`text-sm font-extrabold tracking-tight ${
        isCreatorStore ? 'text-[#0D0D0D]' : 'text-[#26384A]'
      }`}>
        {label}
      </span>
      {note && (
        <span className={`text-[11px] font-semibold ${
          isCreatorStore ? 'text-[#194DF5]' : 'text-[#858D97]'
        }`}>
          {note}
        </span>
      )}
    </div>
  )
}
