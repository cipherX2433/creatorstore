'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/clientApi'
import { toast } from 'sonner'
import {
  formatInTimezone,
  formatTimeRange,
  getDatePartsInTimezone,
} from '@/lib/calendarUtils'
import {
  X, Calendar as CalendarIcon, Clock, RotateCw, Loader2, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft
} from 'lucide-react'

export default function RescheduleModal({
  booking,
  isOpen,
  onClose,
  onRescheduled,
  timezone = 'Asia/Kolkata',
}) {
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Set default selected date as tomorrow or booking date
  useEffect(() => {
    if (isOpen && booking) {
      const parts = getDatePartsInTimezone(booking.startTime, timezone)
      if (parts) {
        const defaultDate = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
        setSelectedDate(defaultDate)
        fetchSlots(booking.productId || booking.product_id, defaultDate)
      }
      setSelectedSlot(null)
      setErrorMsg('')
    }
  }, [isOpen, booking, timezone])

  async function fetchSlots(prodId, dateStr) {
    if (!prodId || !dateStr) return
    setLoadingSlots(true)
    setErrorMsg('')
    setSlots([])
    setSelectedSlot(null)
    try {
      const res = await api.get(`/coaching/slots?productId=${prodId}&date=${dateStr}`)
      setSlots(res?.slots || [])
    } catch (err) {
      console.error('Failed to load slots:', err)
      setErrorMsg(err.message || 'Unable to load slots for this date')
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleDateChange(newDate) {
    setSelectedDate(newDate)
    fetchSlots(booking.productId || booking.product_id, newDate)
  }

  async function handleConfirmReschedule() {
    if (!selectedSlot) {
      toast.error('Please select a new time slot')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/calendar/bookings/${booking.id}/reschedule`, {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      })
      toast.success('Session rescheduled successfully')
      onRescheduled && onRescheduled()
      onClose()
    } catch (err) {
      console.error('Reschedule error:', err)
      toast.error(err.message || 'Failed to reschedule session')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !booking) return null

  // Calculate next 14 days for quick date selector
  const quickDates = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isoDate = d.toISOString().slice(0, 10)
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : formatInTimezone(d, timezone, { weekday: 'short' })
    const dayNum = formatInTimezone(d, timezone, { day: 'numeric', month: 'short' })
    quickDates.push({ isoDate, dayLabel, dayNum })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-none animate-in fade-in duration-150">
      
      {/* SOLID OPAQUE DIALOG */}
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-[#1F1F1F]" />
            <h2 className="text-base font-bold text-[#1F1F1F]">
              Reschedule Session
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
        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1 text-sm text-[#1F1F1F]">
          
          {/* CURRENT BOOKING SUMMARY */}
          <div className="p-3.5 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3] text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B] block">
              Current Session
            </span>
            <div className="font-bold text-[#1F1F1F]">
              {booking.productTitle || booking.product?.title} • {booking.customerName || booking.customerEmail}
            </div>
            <div className="font-mono text-[#6F6F6B]">
              {formatInTimezone(booking.startTime, timezone, { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTimeRange(booking.startTime, booking.endTime, timezone)}
            </div>
          </div>

          {/* DATE SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B]">
                Select New Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-2.5 py-1 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
              />
            </div>

            {/* Quick date pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {quickDates.map((q) => {
                const isSelected = selectedDate === q.isoDate
                return (
                  <button
                    key={q.isoDate}
                    type="button"
                    onClick={() => handleDateChange(q.isoDate)}
                    className={`shrink-0 px-3 py-2 rounded-[10px] text-center border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1F1F1F] text-[#FFFFFF] border-[#1F1F1F] font-bold'
                        : 'bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] border-[#E5E5E3] hover:bg-[#F5F5F3] font-medium'
                    }`}
                  >
                    <span className="text-[10px] uppercase block">{q.dayLabel}</span>
                    <span className="text-xs font-bold block">{q.dayNum}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* TIME SLOTS */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-2 block">
              Available Slots ({timezone.split('/')[1] || timezone})
            </label>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 text-[#6F6F6B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#1F1F1F]" />
              </div>
            ) : errorMsg ? (
              <div className="p-3 rounded-[10px] bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 rounded-[12px] bg-[#FBFBFB] border border-[#E5E5E3] text-center text-xs text-[#6F6F6B]">
                No open slots found on this date based on creator availability & existing bookings.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto no-scrollbar p-1">
                {slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-[10px] text-xs font-mono font-semibold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#1F1F1F] text-[#FFFFFF] border-[#1F1F1F] shadow-xs'
                          : 'bg-[#FBFBFB] text-[#1F1F1F] border-[#E5E5E3] hover:border-[#1F1F1F] hover:bg-[#F5F5F3]'
                      }`}
                    >
                      {slot.displayStart || slot.formattedTime}
                    </button>
                  )
                })}
              </div>
            )}
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmReschedule}
            disabled={!selectedSlot || submitting}
            className="px-5 py-2 rounded-[10px] bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Rescheduling...</span>
              </>
            ) : (
              <>
                <RotateCw className="h-3.5 w-3.5" />
                <span>Confirm Reschedule</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
