'use client'

import React from 'react'
import {
  formatInTimezone,
  formatTimeRange,
  getStatusConfig,
} from '@/lib/calendarUtils'
import {
  X, Video, User, Mail, Phone, Clock, Calendar as CalendarIcon,
  ExternalLink, RotateCw, Ban, ShieldAlert, CheckCircle2, MessageSquare, AlertCircle
} from 'lucide-react'

export default function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  timezone = 'Asia/Kolkata',
  onOpenReschedule,
  onOpenCancel,
}) {
  if (!isOpen || !booking) return null

  const statusConfig = getStatusConfig(booking.status)
  const isCancelled = booking.status === 'CANCELLED'
  const isCompleted = booking.status === 'COMPLETED'
  const canReschedule = !isCancelled && !isCompleted
  const canCancel = !isCancelled && !isCompleted

  const meetingUrl = booking.meetingUrl || booking.meeting_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-none animate-in fade-in duration-150">
      
      {/* SOLID OPAQUE DIALOG CARD */}
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
            <h2 className="text-base font-bold text-[#1F1F1F] truncate">
              Session Details
            </h2>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-[5px] border ${statusConfig.badgeClass}`}>
              {statusConfig.label}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1 text-sm text-[#1F1F1F]">
          
          {/* PRODUCT / SESSION INFO */}
          <div className="p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B]">
                  Coaching Product
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mt-0.5">
                  {booking.productTitle || booking.product?.title || '1:1 Session'}
                </h3>
              </div>
              {booking.product?.price !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B]">
                    Price
                  </span>
                  <div className="text-sm font-extrabold text-[#1F1F1F] mt-0.5">
                    {Number(booking.product.price) === 0 ? 'Free' : `${booking.product.currency || 'INR'} ${booking.product.price}`}
                  </div>
                </div>
              )}
            </div>

            {/* DATE & TIME INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#E5E5E3]">
              <div className="flex items-center gap-2 text-xs">
                <CalendarIcon className="h-4 w-4 text-[#1F1F1F] shrink-0" />
                <div>
                  <span className="text-[10px] font-medium text-[#6F6F6B] block">Date</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {formatInTimezone(booking.startTime, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-4 w-4 text-[#1F1F1F] shrink-0" />
                <div>
                  <span className="text-[10px] font-medium text-[#6F6F6B] block">Time ({timezone.split('/')[1] || timezone})</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {formatTimeRange(booking.startTime, booking.endTime, timezone)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER DETAILS */}
          <div className="p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B] block">
              Customer Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs">
                <User className="h-4 w-4 text-[#6F6F6B] shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] font-medium text-[#6F6F6B] block">Name</span>
                  <span className="font-semibold text-[#1F1F1F] truncate block">
                    {booking.customerName || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-4 w-4 text-[#6F6F6B] shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] font-medium text-[#6F6F6B] block">Email</span>
                  <a
                    href={`mailto:${booking.customerEmail}`}
                    className="font-semibold text-[#1F1F1F] hover:underline truncate block"
                  >
                    {booking.customerEmail}
                  </a>
                </div>
              </div>

              {booking.customerPhone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-4 w-4 text-[#6F6F6B] shrink-0" />
                  <div>
                    <span className="text-[10px] font-medium text-[#6F6F6B] block">Phone</span>
                    <span className="font-semibold text-[#1F1F1F]">
                      {booking.customerPhone}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MEETING LINK */}
          {meetingUrl ? (
            <div className="p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[8px] bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center shrink-0">
                  <Video className="h-4 w-4 text-[#1F1F1F]" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B] block">
                    Meeting Link ({booking.meetingType || 'Video Call'})
                  </span>
                  <span className="text-xs font-mono text-[#1F1F1F] truncate block">
                    {meetingUrl}
                  </span>
                </div>
              </div>

              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-[10px] bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span>Join Session</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-3 rounded-[12px] bg-[#FBFBFB] border border-[#E5E5E3] text-xs text-[#6F6F6B] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No direct meeting link attached. Location: {booking.locationText || 'Online session'}</span>
            </div>
          )}

          {/* CANCELLATION NOTICE IF CANCELLED */}
          {isCancelled && (
            <div className="p-3 rounded-[12px] bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5 shrink-0" />
                <span>This session has been cancelled</span>
              </div>
              {booking.cancellationReason && (
                <div className="text-[11px] text-[#1F1F1F] pl-5">
                  Reason: &ldquo;{booking.cancellationReason}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* RESCHEDULE NOTICE IF RESCHEDULED */}
          {booking.rescheduledFrom && (
            <div className="p-3 rounded-[12px] bg-[#F2F1EF] border border-[#E5E5E3] text-xs text-[#1F1F1F] flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5 text-[#1F1F1F] shrink-0" />
              <span>Rescheduled from previous date/time</span>
            </div>
          )}

          {/* INTAKE ANSWERS / NOTES IF PRESENT */}
          {Array.isArray(booking.answers) && booking.answers.length > 0 && (
            <div className="p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B] block">
                Intake Questions & Answers
              </span>
              <div className="space-y-2">
                {booking.answers.map((ans, i) => (
                  <div key={i} className="text-xs bg-[#FFFFFF] p-2.5 rounded-[10px] border border-[#E5E5E3]">
                    <span className="font-semibold text-[#6F6F6B] block">{ans.question || `Question #${i + 1}`}</span>
                    <span className="text-[#1F1F1F] mt-0.5 block whitespace-pre-wrap">{ans.answer || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5E3] bg-[#FFFFFF] gap-3">
          <div>
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  onOpenCancel && onOpenCancel(booking)
                }}
                className="px-3.5 py-2 rounded-[10px] bg-[#FFFFFF] border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel Session</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canReschedule && (
              <button
                type="button"
                onClick={() => {
                  onOpenReschedule && onOpenReschedule(booking)
                }}
                className="px-4 py-2 rounded-[10px] bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5 text-[#1F1F1F]" />
                <span>Reschedule</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[10px] bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
