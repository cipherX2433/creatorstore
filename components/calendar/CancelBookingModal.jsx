'use client'

import React, { useState } from 'react'
import { api } from '@/lib/clientApi'
import { toast } from 'sonner'
import {
  formatInTimezone,
  formatTimeRange,
} from '@/lib/calendarUtils'
import {
  X, Ban, Loader2, AlertTriangle, Calendar as CalendarIcon, User, Clock
} from 'lucide-react'

export default function CancelBookingModal({
  booking,
  isOpen,
  onClose,
  onCancelled,
  timezone = 'Asia/Kolkata',
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !booking) return null

  async function handleConfirmCancel() {
    setSubmitting(true)
    try {
      await api.post(`/calendar/bookings/${booking.id}/cancel`, {
        reason: reason.trim() || 'Cancelled by creator from Calendar',
      })
      toast.success('Session cancelled successfully')
      onCancelled && onCancelled()
      onClose()
    } catch (err) {
      console.error('Cancel error:', err)
      toast.error(err.message || 'Failed to cancel session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-none animate-in fade-in duration-150">
      
      {/* SOLID OPAQUE DIALOG */}
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <h2 className="text-base font-bold text-[#1F1F1F]">
              Cancel Session?
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 text-sm text-[#1F1F1F]">
          <p className="text-xs text-[#6F6F6B]">
            Are you sure you want to cancel this appointment? The customer will receive an immediate cancellation email notification.
          </p>

          {/* SESSION DETAILS CARD */}
          <div className="p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3] space-y-2.5">
            <div className="font-bold text-sm text-[#1F1F1F]">
              {booking.productTitle || booking.product?.title || '1:1 Coaching'}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6F6F6B]">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[#1F1F1F] font-semibold">{booking.customerName || booking.customerEmail}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6F6F6B]">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{formatInTimezone(booking.startTime, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6F6F6B]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatTimeRange(booking.startTime, booking.endTime, timezone)}</span>
            </div>
          </div>

          {/* OPTIONAL REASON */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
              Reason for Cancellation (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Schedule conflict, family emergency..."
              className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[10px] p-3 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5E5E3] bg-[#FFFFFF] gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-[10px] bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            Keep Session
          </button>

          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting}
            className="px-5 py-2 rounded-[10px] bg-[#DC2626] text-[#FFFFFF] text-xs font-bold hover:bg-[#B91C1C] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel Session</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
