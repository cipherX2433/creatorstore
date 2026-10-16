'use client'

import { useState, useEffect } from 'react'
import { formatMoney, api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar, Clock, Video, Globe, CheckCircle2, Loader2, ArrowRight,
  ShieldCheck, MapPin, Sparkles, AlertCircle, ChevronLeft, ChevronRight,
  Download, ExternalLink, User, Mail, Phone, Check, RefreshCw, Tag
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const TIMEZONES = [
  { code: 'Asia/Kolkata', label: 'India Standard Time (IST) - GMT +5:30' },
  { code: 'America/New_York', label: 'US Eastern Time (ET) - GMT -5:00 / -4:00' },
  { code: 'America/Chicago', label: 'US Central Time (CT) - GMT -6:00 / -5:00' },
  { code: 'America/Denver', label: 'US Mountain Time (MT) - GMT -7:00 / -6:00' },
  { code: 'America/Los_Angeles', label: 'US Pacific Time (PT) - GMT -8:00 / -7:00' },
  { code: 'Europe/London', label: 'UK (GMT / BST) - GMT +0:00 / +1:00' },
  { code: 'Europe/Paris', label: 'Central European Time (CET) - GMT +1:00 / +2:00' },
  { code: 'Asia/Dubai', label: 'Gulf Standard Time (GST) - GMT +4:00' },
  { code: 'Asia/Singapore', label: 'Singapore Time (SGT) - GMT +8:00' },
  { code: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - GMT +9:00' },
  { code: 'Australia/Sydney', label: 'Australian Eastern Time (AEST) - GMT +10:00 / +11:00' },
  { code: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

export default function BookingWidget({
  product,
  creator,
  isOwned = false,
  email = '',
  buying = false,
  onBuyBooking,
  completedBooking = null
}) {
  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Selected Date (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  
  // Available Slots & Timezone
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [customerTimezone, setCustomerTimezone] = useState('Asia/Kolkata')
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Customer Contact Info & Custom Question Answers
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState(email || '')
  const [customerPhone, setCustomerPhone] = useState('')
  const [answers, setAnswers] = useState({})

  // Update customerEmail when email prop changes
  useEffect(() => {
    if (email && !customerEmail) setCustomerEmail(email)
  }, [email])

  // Fetch Booking Config
  useEffect(() => {
    let mounted = true
    setLoadingConfig(true)
    api.get(`/coaching/public/${product.id}`)
      .then((res) => {
        if (!mounted) return
        if (res.config) {
          setConfig(res.config)
          setCustomerTimezone(res.config.timezone || 'Asia/Kolkata')
        }
        setLoadingConfig(false)
      })
      .catch(() => {
        if (mounted) setLoadingConfig(false)
      })
    return () => { mounted = false }
  }, [product.id])

  // Fetch Slots when Date changes
  useEffect(() => {
    if (!product.id || !selectedDate) return
    let mounted = true
    setLoadingSlots(true)
    setSelectedSlot(null)
    api.get(`/coaching/slots?productId=${product.id}&date=${selectedDate}`)
      .then((res) => {
        if (!mounted) return
        setSlots(res.slots || [])
        setLoadingSlots(false)
      })
      .catch(() => {
        if (mounted) {
          setSlots([])
          setLoadingSlots(false)
        }
      })
    return () => { mounted = false }
  }, [product.id, selectedDate])

  // Helper date options for the next days based on booking window
  const dateOptions = []
  const baseDate = new Date()
  const maxAdvance = config?.maximumAdvanceDays || 60
  for (let i = 0; i < Math.min(30, maxAdvance); i++) {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    dateOptions.push({ iso, label })
  }

  function handleAnswerChange(qId, val) {
    setAnswers((prev) => ({ ...prev, [qId]: val }))
  }

  function handleSubmitBooking(e) {
    e.preventDefault()

    if (!selectedSlot) {
      toast.error('Please select an available time slot first')
      return
    }

    if (!customerName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    if (config?.customerFields?.phone?.required && !customerPhone.trim()) {
      toast.error('Phone number is required')
      return
    }

    // Validate required questions
    if (config?.questions?.length) {
      for (const q of config.questions) {
        if (q.required && (!answers[q.id] || !String(answers[q.id]).trim())) {
          toast.error(`Please answer required question: "${q.question}"`)
          return
        }
      }
    }

    const formattedAnswers = (config?.questions || []).map((q) => ({
      questionId: q.id,
      questionText: q.question,
      answer: answers[q.id] || '',
    }))

    onBuyBooking({
      selectedSlot: {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: selectedSlot.durationMinutes,
        formattedTime: selectedSlot.formattedTime,
        date: selectedDate,
        answers: formattedAnswers,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        timezone: customerTimezone,
      }
    })
  }

  // Google Calendar URL Generator
  function getGoogleCalendarUrl(slot, title, link) {
    if (!slot?.startTime || !slot?.endTime) return '#'
    const sIso = new Date(slot.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const eIso = new Date(slot.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const text = encodeURIComponent(title || '1:1 Coaching Consultation')
    const details = encodeURIComponent(`Meeting Link: ${link || 'Will be provided in confirmation'}\nCreator: ${creator?.name || 'Creator'}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${sIso}/${eIso}&details=${details}`
  }

  // Download .ics Calendar File
  function downloadIcs(slot, title, link) {
    if (!slot?.startTime || !slot?.endTime) return
    const sIso = new Date(slot.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const eIso = new Date(slot.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${title || '1:1 Coaching Consultation'}`,
      `DTSTART:${sIso}`,
      `DTEND:${eIso}`,
      `DESCRIPTION:Meeting Link: ${link || 'Will be provided'}\\nCreator: ${creator?.name || 'Creator'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n')

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'coaching-session.ics'
    a.click()
  }

  // 1. CONFIRMED BOOKING VIEW (Section 25)
  if (isOwned || completedBooking) {
    const bookingData = completedBooking || {}
    const meetingUrl = config?.meetingUrl || bookingData.meetingUrl || (selectedSlot?.startTime ? `https://meet.google.com/call-${Math.random().toString(36).substring(2, 6)}` : '')
    const formattedDate = selectedSlot?.date || bookingData.date || todayStr

    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-[#242424] border border-[#303030] rounded-2xl space-y-6 text-[#F5F5F5]">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-full flex items-center justify-center mx-auto text-[#22C55E]">
            <Check className="h-7 w-7 stroke-[3]" />
          </div>
          <h2 className="text-2xl font-bold text-[#F5F5F5]">Booking confirmed</h2>
          <p className="text-xs text-[#22C55E] font-semibold">✓ Your session is booked.</p>
        </div>

        {/* Structured Session Summary Card */}
        <div className="p-5 bg-[#1C1C1C] border border-[#303030] rounded-xl space-y-3.5">
          <div className="border-b border-[#303030] pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F5F5F5]">{product.title}</h3>
            <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-0.5 rounded-full border border-[#22C55E]/20">
              Confirmed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">Date:</span>
              <span className="font-semibold text-[#F5F5F5]">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">Time:</span>
              <span className="font-semibold text-[#F5F5F5]">{selectedSlot?.formattedTime || '10:00 AM – 10:30 AM'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">Timezone:</span>
              <span className="font-semibold text-[#F5F5F5]">{customerTimezone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">Creator:</span>
              <span className="font-semibold text-[#F5F5F5]">{creator?.name || 'Creator'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">Customer:</span>
              <span className="font-semibold text-[#F5F5F5]">{customerName || customerEmail || 'Customer'}</span>
            </div>
          </div>

          {meetingUrl && (
            <div className="pt-3 border-t border-[#303030] flex items-center justify-between gap-3">
              <span className="text-xs text-[#A3A3A3]">Google Meet:</span>
              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-full px-4 py-2 flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                Join meeting
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons: Add to Calendar & Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href={getGoogleCalendarUrl(selectedSlot, product.title, meetingUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#303030] font-semibold text-xs px-5 py-2.5 flex items-center gap-2 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Add to Calendar
          </a>

          <Button
            type="button"
            variant="outline"
            onClick={() => downloadIcs(selectedSlot, product.title, meetingUrl)}
            className="rounded-full bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#303030] font-semibold text-xs px-5 py-2.5 flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5 text-[#A3A3A3]" />
            Download .ics
          </Button>

          <Link href="/">
            <Button
              variant="ghost"
              className="rounded-full text-[#A3A3A3] hover:text-[#F5F5F5] text-xs font-semibold px-4"
            >
              Back to Store
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // 2. MAIN PUBLIC BOOKING STEPPER WORKFLOW (Sections 18 & 19)
  const isFree = Number(product.price) === 0
  const hasDiscount = config?.discountType && config?.discountValue > 0

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 text-[#F5F5F5] items-start">
      
      {/* LEFT COLUMN: HERO & SESSION OVERVIEW */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 sm:p-6 bg-[#242424] border border-[#303030] rounded-2xl space-y-4">
          {product.cover || product.thumbnail ? (
            <div className="h-48 w-full rounded-xl bg-[#1C1C1C] border border-[#303030] overflow-hidden">
              <img src={product.cover || product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-40 w-full rounded-xl bg-[#1C1C1C] border border-[#303030] flex flex-col items-center justify-center text-[#A3A3A3]">
              <Calendar className="h-10 w-10 text-primary opacity-80" />
              <span className="text-[11px] font-semibold uppercase tracking-wider mt-2">1:1 Coaching</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary uppercase tracking-wider border border-primary/30">
                {config?.sessionType || '1:1 Consultation'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1C1C1C] text-[#A3A3A3] border border-[#303030]">
                {config?.durationMinutes || 30} Minutes
              </span>
            </div>

            <h1 className="text-xl font-bold text-[#F5F5F5] pt-1">{product.title}</h1>
            <p className="text-xs text-[#A3A3A3] leading-relaxed line-clamp-4">{product.shortDescription || product.description}</p>
          </div>

          <div className="p-3.5 bg-[#1C1C1C] border border-[#303030] rounded-xl flex items-center justify-between">
            <span className="text-xs text-[#A3A3A3]">Price:</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#F5F5F5]">
                {isFree ? 'Free' : formatMoney(product.price, product.currency)}
              </span>
              {hasDiscount && (
                <span className="text-[10px] font-bold text-[#F9B67D] bg-[#F9B67D]/10 px-2 py-0.5 rounded-full border border-[#F9B67D]/20">
                  {config.discountType === 'PERCENTAGE' ? `${config.discountValue}% OFF` : 'Discounted'}
                </span>
              )}
            </div>
          </div>

          {/* Cancellation Policy note */}
          {config?.cancellationPolicy && (
            <div className="pt-2 border-t border-[#303030] text-[11px] text-[#A3A3A3] leading-relaxed">
              <span className="font-semibold text-[#F5F5F5]">Policy: </span>
              {config.cancellationPolicy}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DATE & TIME SELECTOR + INTAKE */}
      <div className="lg:col-span-7 space-y-5">
        <form onSubmit={handleSubmitBooking} className="p-5 sm:p-7 bg-[#242424] border border-[#303030] rounded-2xl space-y-5">
          
          {/* Header & Timezone Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Select a date
              </h3>
              <p className="text-[11px] text-[#A3A3A3] mt-0.5">Pick an available day to view open session slots.</p>
            </div>

            {/* Timezone Selector */}
            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#303030] px-3 py-1.5 rounded-full text-xs shrink-0">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <select
                value={customerTimezone}
                onChange={(e) => setCustomerTimezone(e.target.value)}
                className="bg-transparent text-[#F5F5F5] font-semibold outline-none cursor-pointer text-xs"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.code} value={tz.code} className="bg-[#1C1C1C] text-[#F5F5F5]">
                    {tz.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. DATE PICKER HORIZONTAL BAR */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {dateOptions.map((d) => {
                const isSelected = selectedDate === d.iso
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-[#1C1C1C] text-[#A3A3A3] border-[#303030] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. AVAILABLE TIME SLOTS */}
          <div className="space-y-2.5 pt-1">
            <Label className="text-xs font-semibold text-[#F5F5F5]">
              Available times ({selectedDate})
            </Label>

            {loadingSlots ? (
              <div className="py-8 text-center text-xs text-[#A3A3A3] flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Checking available slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-5 text-center bg-[#1C1C1C] border border-[#303030] rounded-xl text-xs text-[#A3A3A3] space-y-1">
                <AlertCircle className="h-4 w-4 text-[#F9B67D] mx-auto mb-1" />
                <p className="font-semibold text-[#F5F5F5]">No available slots on {selectedDate}</p>
                <p>Please choose another date above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-[#1C1C1C] text-[#F5F5F5] border-[#303030] hover:border-[#404040] hover:bg-[#2A2A2A]'
                      }`}
                    >
                      {slot.displayStart || slot.formattedTime}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. CUSTOMER INFORMATION FORM */}
          {selectedSlot && (
            <div className="space-y-3.5 pt-3 border-t border-[#303030] animate-in fade-in">
              <Label className="text-xs font-bold text-[#F5F5F5]">
                Your details
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-[#A3A3A3]">Full Name *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-[#1C1C1C] border-[#303030] text-[#F5F5F5] text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-[#A3A3A3]">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="bg-[#1C1C1C] border-[#303030] text-[#F5F5F5] text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              {config?.customerFields?.phone?.enabled !== false && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-[#A3A3A3]">
                    Phone Number {config?.customerFields?.phone?.required ? '*' : '(Optional)'}
                  </Label>
                  <Input
                    type="tel"
                    required={!!config?.customerFields?.phone?.required}
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-[#1C1C1C] border-[#303030] text-[#F5F5F5] text-xs h-10 rounded-xl"
                  />
                </div>
              )}

              {/* Dynamic intake questions */}
              {(config?.questions || []).map((q) => (
                <div key={q.id} className="space-y-1">
                  <Label className="text-[11px] font-medium text-[#F5F5F5]">
                    {q.question} {q.required && <span className="text-[#EF4444]">*</span>}
                  </Label>
                  {q.type === 'TEXTAREA' || q.type === 'LONG_TEXT' ? (
                    <Textarea
                      required={q.required}
                      placeholder="Type your response..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="bg-[#1C1C1C] border-[#303030] text-[#F5F5F5] text-xs rounded-xl min-h-[70px] resize-none"
                    />
                  ) : (
                    <Input
                      type="text"
                      required={q.required}
                      placeholder="Your answer..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="bg-[#1C1C1C] border-[#303030] text-[#F5F5F5] text-xs h-10 rounded-xl"
                    />
                  )}
                </div>
              ))}

              {/* 4. SUBMIT / BOOK BUTTON */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={buying}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {buying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming reservation...
                    </>
                  ) : (
                    <>
                      {isFree ? 'Book free session' : 'Book now'}
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
