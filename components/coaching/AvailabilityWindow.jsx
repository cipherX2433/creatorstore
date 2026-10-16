'use client'

import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

export default function AvailabilityWindow({
  window,
  index,
  totalWindows,
  onChange,
  onRemove,
}) {
  const isInvalid = window.startTime && window.endTime && window.startTime >= window.endTime

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Input
        type="time"
        value={window.startTime || '09:00'}
        onChange={(e) => onChange(index, 'startTime', e.target.value)}
        className="h-10 w-32 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs font-semibold text-[#010619] focus:border-[#194DF5]"
      />
      <span className="text-xs text-[#666666] font-medium">to</span>
      <Input
        type="time"
        value={window.endTime || '17:00'}
        onChange={(e) => onChange(index, 'endTime', e.target.value)}
        className="h-10 w-32 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs font-semibold text-[#010619] focus:border-[#194DF5]"
      />

      {totalWindows > 1 && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 text-[#6B7399] hover:text-[#EF4444] rounded-lg hover:bg-[#E8EDFB] transition-colors cursor-pointer"
          title="Remove time window"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {isInvalid && (
        <span className="text-[11px] font-semibold text-[#EF4444]">
          Start must be before end
        </span>
      )}
    </div>
  )
}
