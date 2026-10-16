'use client'

import React from 'react'
import {
  getMonthCalendarCells,
  formatInTimezone,
  formatTimeRange,
  getStatusConfig,
  isSameDayInTz,
} from '@/lib/calendarUtils'
import { Video, Clock, User, Calendar as CalendarIcon, ChevronRight } from 'lucide-react'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarMonthView({
  year,
  monthIndex,
  bookings = [],
  timezone = 'Asia/Kolkata',
  onSelectBooking,
  selectedBookingId,
  onSelectDate,
  selectedDate,
}) {
  const cells = getMonthCalendarCells(year, monthIndex)
  const now = new Date()

  return (
    <div className="flex flex-col h-full w-full bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] select-none">
      
      {/* 7 DAYS OF WEEK HEADER */}
      <div className="grid grid-cols-7 bg-[#FBFBFB] border-b border-[#E5E5E3] shrink-0">
        {DAY_NAMES.map((name, i) => (
          <div
            key={i}
            className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#6F6F6B] border-r border-[#E5E5E3] last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      {/* MONTH GRID CELLS */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto no-scrollbar min-h-[500px]">
        {cells.map((cell, idx) => {
          const isToday = isSameDayInTz(cell.date, now, timezone)
          const isSelected = selectedDate && isSameDayInTz(cell.date, selectedDate, timezone)
          const dayBookings = bookings.filter((b) => isSameDayInTz(b.startTime, cell.date, timezone))

          return (
            <div
              key={idx}
              onClick={() => onSelectDate && onSelectDate(cell.date, dayBookings)}
              className={`min-h-[100px] p-2 border-b border-r border-[#E5E5E3] last:border-r-0 flex flex-col transition-colors cursor-pointer group ${
                !cell.isCurrentMonth
                  ? 'bg-[#FBFBFB] opacity-50 hover:opacity-80'
                  : isSelected
                  ? 'bg-[#F5F5F3] ring-1 ring-inset ring-[#1F1F1F]'
                  : 'bg-[#FFFFFF] hover:bg-[#F5F5F3]'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? 'bg-[#1F1F1F] text-[#FFFFFF] font-extrabold shadow-xs'
                      : cell.isCurrentMonth
                      ? 'text-[#1F1F1F]'
                      : 'text-[#999995]'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayBookings.length > 0 && (
                  <span className="text-[10px] font-bold text-[#6F6F6B] bg-[#F2F1EF] border border-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                    {dayBookings.length} {dayBookings.length === 1 ? 'session' : 'sessions'}
                  </span>
                )}
              </div>

              {/* Day Sessions List (Chips) */}
              <div className="mt-1.5 space-y-1 flex-1 overflow-hidden">
                {dayBookings.slice(0, 3).map((b) => {
                  const statusConfig = getStatusConfig(b.status)
                  const isBookingSelected = selectedBookingId === b.id
                  const timeStart = formatInTimezone(b.startTime, timezone, { hour: 'numeric', minute: '2-digit', hour12: true })

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectBooking && onSelectBooking(b)
                      }}
                      className={`w-full text-left px-1.5 py-1 rounded-[6px] text-[10px] font-medium flex items-center gap-1.5 truncate border transition-colors cursor-pointer ${
                        isBookingSelected
                          ? 'bg-[#F2F1EF] border-[#1F1F1F] text-[#1F1F1F]'
                          : 'bg-[#FBFBFB] border-[#E5E5E3] hover:border-[#1F1F1F] text-[#1F1F1F]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
                      <span className="font-mono text-[9px] text-[#999995] shrink-0">{timeStart}</span>
                      <span className="truncate font-semibold">{b.productTitle || b.product?.title || 'Session'}</span>
                    </button>
                  )
                })}

                {dayBookings.length > 3 && (
                  <div className="text-[9px] font-bold text-[#999995] pl-1">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
