'use client'

import React, { useEffect, useRef } from 'react'
import {
  getDatePartsInTimezone,
  formatInTimezone,
  formatTimeRange,
  getStatusConfig,
  isSameDayInTz,
} from '@/lib/calendarUtils'
import { Video, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function CalendarWeekView({
  weekDates = [],
  bookings = [],
  availability = [],
  timezone = 'Asia/Kolkata',
  onSelectBooking,
  selectedBookingId,
  selectedDayIndex,
  onSelectDayIndex,
}) {
  const scrollContainerRef = useRef(null)

  // Scroll to 08:00 AM on initial load
  useEffect(() => {
    if (scrollContainerRef.current) {
      // 8 hours * 60px per hour = 480px
      scrollContainerRef.current.scrollTop = 480
    }
  }, [])

  const now = new Date()

  // Map availability to day-of-week index (0=Sun, 1=Mon, ..., 6=Sat)
  const availabilityByDay = {}
  ;(availability || []).forEach((rule) => {
    if (rule.enabled) {
      availabilityByDay[rule.dayOfWeek] = rule.windows || []
    }
  })

  return (
    <div className="flex flex-col h-full w-full bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] select-none">
      
      {/* MOBILE DAY SELECTOR PILLS */}
      <div className="md:hidden flex items-center gap-1.5 p-2 bg-[#FFFFFF] border-b border-[#E5E5E3] overflow-x-auto no-scrollbar">
        {weekDates.map((date, idx) => {
          const isToday = isSameDayInTz(date, now, timezone)
          const isSelected = selectedDayIndex === idx
          const dayName = formatInTimezone(date, timezone, { weekday: 'short' })
          const dayNum = formatInTimezone(date, timezone, { day: 'numeric' })
          const dayBookings = bookings.filter((b) => isSameDayInTz(b.startTime, date, timezone))

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDayIndex && onSelectDayIndex(idx)}
              className={`flex-1 min-w-[54px] py-2 px-1.5 flex flex-col items-center rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1F1F1F] text-[#FFFFFF]'
                  : isToday
                  ? 'bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]'
                  : 'bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] border border-[#E5E5E3]'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
              <span className="text-sm font-extrabold">{dayNum}</span>
              {dayBookings.length > 0 && (
                <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#FFFFFF]' : 'bg-[#1F1F1F]'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* DESKTOP WEEK HEADER ROW */}
      <div className="hidden md:grid grid-cols-[64px_repeat(7,1fr)] bg-[#FBFBFB] border-b border-[#E5E5E3] shrink-0 z-10 sticky top-0">
        {/* Timezone label header corner */}
        <div className="p-3 text-[10px] font-mono uppercase text-[#999995] border-r border-[#E5E5E3] flex items-center justify-center text-center truncate">
          GMT
        </div>

        {/* 7 Days Headers */}
        {weekDates.map((date, idx) => {
          const isToday = isSameDayInTz(date, now, timezone)
          const dayName = formatInTimezone(date, timezone, { weekday: 'short' })
          const dayNum = formatInTimezone(date, timezone, { day: 'numeric' })
          const monthShort = formatInTimezone(date, timezone, { month: 'short' })

          return (
            <div
              key={idx}
              className={`py-3 px-2 text-center border-r border-[#E5E5E3] last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                isToday ? 'bg-[#F5F5F3]' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6B]">
                {dayName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday
                      ? 'bg-[#1F1F1F] text-[#FFFFFF] font-extrabold shadow-xs'
                      : 'text-[#1F1F1F]'
                  }`}
                >
                  {dayNum}
                </span>
                <span className="text-[11px] text-[#6F6F6B] font-medium">
                  {monthShort}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* SCROLLABLE TIME GRID BODY */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar min-h-[500px]"
      >
        <div className="grid grid-cols-[64px_1fr] md:grid-cols-[64px_repeat(7,1fr)] relative min-h-[1440px]">
          
          {/* TIME COLUMN */}
          <div className="border-r border-[#E5E5E3] bg-[#FBFBFB] shrink-0 select-none">
            {HOURS.map((hour) => {
              const display12 = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`
              return (
                <div
                  key={hour}
                  className="h-[60px] border-b border-[#E5E5E3]/60 pr-2 pt-1 text-right text-[11px] font-mono text-[#999995]"
                >
                  {display12}
                </div>
              )
            })}
          </div>

          {/* DAY COLUMNS */}
          {weekDates.map((date, dayIdx) => {
            const isToday = isSameDayInTz(date, now, timezone)
            const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
            const workingWindows = availabilityByDay[dayOfWeek] || []
            const isDayOff = workingWindows.length === 0

            // Filter bookings occurring on this date
            const dayBookings = bookings.filter((b) => isSameDayInTz(b.startTime, date, timezone))

            // For mobile, only show the currently selected day
            const isMobileHidden = selectedDayIndex !== undefined && selectedDayIndex !== dayIdx

            return (
              <div
                key={dayIdx}
                className={`relative border-r border-[#E5E5E3] last:border-r-0 h-[1440px] transition-colors ${
                  isMobileHidden ? 'hidden md:block' : 'block'
                } ${isToday ? 'bg-[#FBFBFB]' : ''}`}
              >
                {/* Hourly grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-[#E5E5E3]/60 relative"
                  />
                ))}

                {/* Day Off Subtle Stripe Overlay */}
                {isDayOff && (
                  <div className="absolute inset-0 bg-[#F2F1EF]/60 pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#999995] rotate-[-45deg]">
                      Day Off
                    </span>
                  </div>
                )}

                {/* Current Time Indicator Line for Today */}
                {isToday && (
                  <CurrentTimeIndicator timezone={timezone} />
                )}

                {/* RENDER REAL BOOKING BLOCKS */}
                {dayBookings.map((b) => {
                  const startParts = getDatePartsInTimezone(b.startTime, timezone)
                  const endParts = getDatePartsInTimezone(b.endTime, timezone)
                  if (!startParts || !endParts) return null

                  const startMin = startParts.hour * 60 + startParts.minute
                  let endMin = endParts.hour * 60 + endParts.minute
                  if (endMin <= startMin) {
                    endMin = startMin + (b.product?.durationMinutes || 60)
                  }

                  const durationMin = Math.max(25, endMin - startMin)
                  // 1 minute = 1 pixel (60px per hour)
                  const topPx = startMin
                  const heightPx = durationMin

                  const statusConfig = getStatusConfig(b.status)
                  const isSelected = selectedBookingId === b.id

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBooking && onSelectBooking(b)}
                      style={{
                        top: `${topPx}px`,
                        height: `${Math.max(48, heightPx)}px`,
                      }}
                      className={`absolute left-1 right-1 z-20 text-left p-2 rounded-[10px] bg-[#FFFFFF] border transition-all duration-150 shadow-xs group overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'border-[#1F1F1F] ring-2 ring-[#1F1F1F]/20'
                          : 'border-[#E5E5E3] hover:border-[#1F1F1F] hover:bg-[#F5F5F3]'
                      } ${statusConfig.borderClass}`}
                    >
                      {/* Top Row: Session Title & Status Badge */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-[#1F1F1F] truncate leading-tight group-hover:text-[#000000] transition-colors">
                          {b.productTitle || b.product?.title || '1:1 Session'}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[4px] border shrink-0 ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Customer Name */}
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#6F6F6B] truncate">
                        <User className="h-3 w-3 shrink-0 text-[#999995]" />
                        <span className="truncate">{b.customerName || b.customerEmail}</span>
                      </div>

                      {/* Time Range */}
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-[#999995]">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{formatTimeRange(b.startTime, b.endTime, timezone)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CurrentTimeIndicator({ timezone }) {
  const parts = getDatePartsInTimezone(new Date(), timezone)
  if (!parts) return null
  const topPx = parts.hour * 60 + parts.minute

  return (
    <div
      style={{ top: `${topPx}px` }}
      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-[#1F1F1F] -ml-1 shadow-xs" />
      <div className="flex-1 h-[2px] bg-[#1F1F1F]" />
    </div>
  )
}
