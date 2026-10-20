'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Share2,
  Video,
  User,
  ShieldCheck,
  Info,
  Loader2,
  Download,
  ExternalLink,
  Mail,
  Send,
  HelpCircle,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/clientApi'
import { openRazorpayProductCheckout } from '@/lib/razorpayClient'
import {
  getSundayFirstMonthCells,
  createGoogleCalendarUrl,
  downloadIcsFile,
  getDatePartsInTimezone,
  formatInTimezone,
} from '@/lib/calendarUtils'
import {
  trackProductViewed,
  trackPaymentInitiated,
  trackPaymentCompleted,
} from '@/lib/analytics'

// Supported popular timezones for visitor selection
const POPULAR_TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Calcutta (IST)', offset: 'GMT+5:30' },
  { id: 'America/New_York', label: 'New York (EDT/EST)', offset: 'GMT-4/5' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (PDT/PST)', offset: 'GMT-7/8' },
  { id: 'America/Chicago', label: 'Chicago (CDT/CST)', offset: 'GMT-5/6' },
  { id: 'Europe/London', label: 'London (BST/GMT)', offset: 'GMT+1/0' },
  { id: 'Europe/Paris', label: 'Paris (CEST/CET)', offset: 'GMT+2/1' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)', offset: 'GMT+4' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'GMT+8' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'GMT+9' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST)', offset: 'GMT+10' },
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'GMT+0' },
]

export default function PublicBookingModal({
  product,
  creator,
  isOpen,
  onClose,
  tokens = {},
}) {
  const router = useRouter()

  // Steps: 'type_select' | 'calendar_slots' | 'customer_info' | 'payment_pending' | 'confirmation'
  const [step, setStep] = useState('type_select')

  // Config loaded from server
  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Booking type selection
  const [selectedBookingType, setSelectedBookingType] = useState(null)

  // Timezone
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Kolkata')
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false)

  // Calendar Month Navigation
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth()) // 0 - 11

  // Availability
  const [availableMonthDates, setAvailableMonthDates] = useState([])
  const [loadingMonthDates, setLoadingMonthDates] = useState(false)

  // Selected Date & Slots
  const [selectedDate, setSelectedDate] = useState(null) // 'YYYY-MM-DD'
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Customer Form Details
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [customAnswers, setCustomAnswers] = useState({})
  // Payment routing country: 'IN' (India) or 'OTHER' (Other Country)
  const [countryRoute, setCountryRoute] = useState('IN')
  const [mailingListOptIn, setMailingListOptIn] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirmed booking details
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [isDownloadingIcs, setIsDownloadingIcs] = useState(false)

  const modalRef = useRef(null)

  // 1. Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  // 2. Load stored customer details from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorstore_customer_email') || ''
      const savedName = localStorage.getItem('creatorstore_customer_name') || ''
      if (savedEmail && !email) setEmail(savedEmail)
      if (savedName && !name) setName(savedName)
    }
  }, [])

  // 3. Fetch authoritative public coaching configuration
  useEffect(() => {
    if (!isOpen || !product?.id) return

    let active = true
    setLoadingConfig(true)

    async function loadConfig() {
      try {
        const res = await fetch(`/api/coaching/public/${product.id}`)
        const data = await res.json()
        if (!active) return

        if (data.config) {
          setConfig(data.config)
          const tz = data.config.timezone || 'Asia/Kolkata'
          setSelectedTimezone(tz)

          const types = Array.isArray(data.config.bookingTypes) && data.config.bookingTypes.length > 0
            ? data.config.bookingTypes
            : [
                {
                  id: 'bt_default',
                  name: data.config.title || product.title || 'Book 1:1 time with me',
                  durationMinutes: data.config.durationMinutes || 30,
                  price: Number(product.price || 0),
                  currency: (product.currency || 'inr').toLowerCase(),
                  isFree: Number(product.price || 0) === 0,
                },
              ]
          setSelectedBookingType(types[0])

          // If there is a single booking type or default, go straight to calendar_slots
          // If multiple booking types exist, show type_select first
          setStep(types.length > 1 ? 'type_select' : 'calendar_slots')
        }
      } catch (err) {
        console.error('Failed to load coaching config:', err)
      } finally {
        if (active) setLoadingConfig(false)
      }
    }

    loadConfig()

    trackProductViewed({
      product_id: product.id,
      product_type: 'COACHING',
    })

    return () => {
      active = false
    }
  }, [isOpen, product?.id])

  // 4. Fetch available dates for the active month
  useEffect(() => {
    if (!isOpen || !product?.id || !selectedBookingType) return

    let active = true
    setLoadingMonthDates(true)

    async function fetchMonthAvailability() {
      try {
        const y = currentYear
        const m = currentMonthIndex + 1
        const duration = selectedBookingType?.durationMinutes || 30
        const btId = selectedBookingType?.id || ''
        const url = `/api/coaching/month-availability?productId=${product.id}&year=${y}&month=${m}&duration=${duration}&bookingTypeId=${btId}&timezone=${encodeURIComponent(selectedTimezone)}`
        const res = await fetch(url)
        const data = await res.json()
        if (!active) return

        if (Array.isArray(data.availableDates)) {
          setAvailableMonthDates(data.availableDates)
        } else {
          setAvailableMonthDates([])
        }
      } catch (err) {
        console.warn('Failed to load month availability:', err)
        if (active) setAvailableMonthDates([])
      } finally {
        if (active) setLoadingMonthDates(false)
      }
    }

    fetchMonthAvailability()

    return () => {
      active = false
    }
  }, [isOpen, product?.id, currentYear, currentMonthIndex, selectedBookingType, selectedTimezone])

  // 5. Fetch time slots when a date is selected
  useEffect(() => {
    if (!selectedDate || !product?.id || !selectedBookingType) return

    let active = true
    setLoadingSlots(true)
    setSelectedSlot(null)

    async function fetchSlots() {
      try {
        const duration = selectedBookingType?.durationMinutes || 30
        const btId = selectedBookingType?.id || ''
        const url = `/api/coaching/slots?productId=${product.id}&date=${selectedDate}&duration=${duration}&bookingTypeId=${btId}&timezone=${encodeURIComponent(selectedTimezone)}`
        const res = await fetch(url)
        const data = await res.json()
        if (!active) return

        if (Array.isArray(data.slots)) {
          setAvailableSlots(data.slots)
        } else {
          setAvailableSlots([])
        }
      } catch (err) {
        console.error('Failed to load time slots:', err)
        if (active) setAvailableSlots([])
      } finally {
        if (active) setLoadingSlots(false)
      }
    }

    fetchSlots()

    return () => {
      active = false
    }
  }, [selectedDate, product?.id, selectedBookingType, selectedTimezone])

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonthIndex((m) => m - 1)
    }
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonthIndex((m) => m + 1)
    }
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  // Generate calendar grid cells (Sunday first: Sun Mon Tue Wed Thu Fri Sat)
  const monthCells = useMemo(() => {
    return getSundayFirstMonthCells(currentYear, currentMonthIndex)
  }, [currentYear, currentMonthIndex])

  const monthYearLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonthIndex, 1)
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [currentYear, currentMonthIndex])

  // Format selected date header (e.g. "Tuesday, October 20, 2026")
  const selectedDateHeader = useMemo(() => {
    if (!selectedDate) return ''
    const parts = selectedDate.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }, [selectedDate])

  // Is the session free?
  const isFreeSession = useMemo(() => {
    if (!selectedBookingType) return Number(product?.price || 0) === 0
    return Boolean(selectedBookingType.isFree || Number(selectedBookingType.price || 0) === 0)
  }, [selectedBookingType, product?.price])

  const sessionPriceDisplay = useMemo(() => {
    if (isFreeSession) return 'Free'
    const price = Number(selectedBookingType?.price !== undefined ? selectedBookingType.price : product?.price || 0)
    const currency = (selectedBookingType?.currency || product?.currency || 'INR').toUpperCase()
    return formatMoney(price, currency)
  }, [isFreeSession, selectedBookingType, product])

  // Timezone display name with current local time
  const currentTimezoneInfo = useMemo(() => {
    const found = POPULAR_TIMEZONES.find((t) => t.id === selectedTimezone)
    let timeStr = ''
    try {
      timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date()).toLowerCase()
    } catch (e) { }

    const label = found ? found.label.split(' ')[0] : selectedTimezone.split('/')[1] || selectedTimezone
    return `${label} (${timeStr})`
  }, [selectedTimezone])

  // Share handler
  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedBookingType?.name || product?.title || 'Book a session',
          url: shareUrl,
        })
      } catch (e) { }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
    }
  }

  // Validate Customer Form
  const validateForm = () => {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'A valid email address is required'
    }
    if (!termsAccepted) {
      errs.terms = 'You must agree to the email updates and terms'
    }

    if (config?.customerFields?.phone?.enabled && config?.customerFields?.phone?.required && !phone.trim()) {
      errs.phone = 'Phone number is required'
    }

    if (Array.isArray(config?.questions)) {
      for (const q of config.questions) {
        if (q.required && (!customAnswers[q.id] || !String(customAnswers[q.id]).trim())) {
          errs[`q_${q.id}`] = `${q.question} is required`
        }
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Handle Free Booking Submission
  const handleFreeBookingSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()

      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorstore_customer_email', cleanEmail)
        localStorage.setItem('creatorstore_customer_name', cleanName)
      }

      const payload = {
        productId: product.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        timezone: selectedTimezone,
        customerEmail: cleanEmail,
        customerName: cleanName,
        customerPhone: phone.trim(),
        bookingTypeId: selectedBookingType?.id || 'bt_default',
        bookingTypeName: selectedBookingType?.name || product.title,
        mailingListOptIn: Boolean(mailingListOptIn),
        answers: Object.entries(customAnswers).map(([qid, val]) => ({ questionId: qid, answer: val })),
      }

      const res = await fetch('/api/coaching/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete booking. Please try another time.')
      }

      setConfirmedBooking(data.booking)
      setStep('confirmation')
      toast.success('Booking confirmed!')
    } catch (err) {
      console.error('Free booking error:', err)
      toast.error(err.message || 'Unable to confirm booking. Please select another slot.')
      // If 409 slot conflict, return user to calendar
      if (err.message?.includes('no longer available') || err.message?.includes('conflict')) {
        setSelectedSlot(null)
        setStep('calendar_slots')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Paid Booking Submission (India -> Razorpay, Other Country -> Dodo)
  const handlePaidBookingSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()

      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorstore_customer_email', cleanEmail)
        localStorage.setItem('creatorstore_customer_name', cleanName)
      }

      // Step A: Create temporary slot hold on server
      const holdRes = await fetch('/api/coaching/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          timezone: selectedTimezone,
          customerEmail: cleanEmail,
          customerName: cleanName,
          customerPhone: phone.trim(),
          bookingTypeId: selectedBookingType?.id || 'bt_default',
          bookingTypeName: selectedBookingType?.name || product.title,
          mailingListOptIn: Boolean(mailingListOptIn),
          answers: Object.entries(customAnswers).map(([qid, val]) => ({ questionId: qid, answer: val })),
        }),
      })

      const holdData = await holdRes.json()
      if (!holdRes.ok) {
        throw new Error(holdData.error || 'The selected slot is no longer available. Please choose another time.')
      }

      const holdBooking = holdData.booking

      // Step B: Route to Payment Provider (India -> IN / Razorpay, Other Country -> US / Dodo)
      const isIndia = countryRoute === 'IN'
      const targetCountry = isIndia ? 'IN' : 'US'
      const targetCurrency = isIndia ? 'INR' : 'USD'

      const orderPayload = {
        productId: product.id,
        creatorId: product.creatorId || creator?.id,
        username: creator?.username,
        name: cleanName,
        customerName: cleanName,
        email: cleanEmail,
        country: targetCountry,
        currency: targetCurrency,
        bookingId: holdBooking.id,
        bookingDetails: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          customerName: cleanName,
          bookingTypeId: selectedBookingType?.id,
        },
      }

      const orderRes = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Payment order creation failed. Please try again.')
      }

      // Route 1: India -> Razorpay Checkout Modal
      if (orderData.provider === 'razorpay' || orderData.razorpayOrderId) {
        trackPaymentInitiated({
          product_id: product.id,
          product_type: 'COACHING',
          value: orderData.amount || selectedBookingType?.price,
          currency: orderData.currency || 'INR',
        })

        await openRazorpayProductCheckout({
          keyId: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          orderId: orderData.razorpayOrderId || orderData.orderId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          productTitle: selectedBookingType?.name || product.title,
          customerEmail: cleanEmail,
          customerName: cleanName,
          onSuccess: async (rzpResp) => {
            try {
              const verifyRes = await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  razorpay_order_id: rzpResp.razorpay_order_id,
                  razorpay_payment_id: rzpResp.razorpay_payment_id,
                  razorpay_signature: rzpResp.razorpay_signature,
                }),
              })
              const verifyData = await verifyRes.json()
              if (!verifyRes.ok || !verifyData?.success) {
                throw new Error(verifyData?.error || 'Payment signature verification failed.')
              }

              trackPaymentCompleted({
                product_id: product.id,
                product_type: 'COACHING',
                value: orderData.amount || selectedBookingType?.price,
                currency: orderData.currency || 'INR',
              })

              // Fetch confirmed booking state
              const finalBookingRes = await fetch(`/api/coaching/bookings/${holdBooking.id}?email=${encodeURIComponent(cleanEmail)}`)
              const finalData = await finalBookingRes.json()
              setConfirmedBooking(finalData.booking || holdBooking)
              setStep('confirmation')
              toast.success('Payment verified! Your booking is confirmed.')
            } catch (vErr) {
              console.error('[Razorpay Verify Error]:', vErr)
              toast.error(vErr.message || 'Payment verification failed.')
            } finally {
              setIsSubmitting(false)
            }
          },
          onError: (errInfo) => {
            toast.error(errInfo?.customerMessage || 'Payment cancelled or declined.')
            setIsSubmitting(false)
          },
          onDismiss: () => {
            setIsSubmitting(false)
          },
        })
        return
      }

      // Route 2: Other Country -> Dodo Payments Hosted Checkout Redirection
      if (orderData.checkoutUrl || orderData.url) {
        setIsSubmitting(false)
        trackPaymentInitiated({
          product_id: product.id,
          product_type: 'COACHING',
          value: orderData.amount || selectedBookingType?.price,
          currency: targetCurrency,
        })
        window.location.href = orderData.checkoutUrl || orderData.url
        return
      }

      throw new Error(orderData.error || 'Payment session could not be created.')
    } catch (err) {
      console.error('Paid booking submit error:', err)
      toast.error(err.message || 'Booking payment could not be initiated.')
      setIsSubmitting(false)
      if (err.message?.includes('no longer available') || err.message?.includes('conflict')) {
        setSelectedSlot(null)
        setStep('calendar_slots')
      }
    }
  }

  if (!isOpen) return null

  const creatorAvatar = creator?.avatarUrl || product?.thumbnail || ''
  const creatorDisplayName = creator?.name || creator?.username || 'Creator'
  const creatorUsernameDisplay = creator?.username ? `by ${creator.username}` : `by ${creatorDisplayName}`

  const durationMin = selectedBookingType?.durationMinutes || config?.durationMinutes || 30
  const bookingTypesList = config?.bookingTypes || [
    {
      id: 'bt_default',
      name: config?.title || product.title || 'Book 1:1 time with me',
      durationMinutes: durationMin,
      price: Number(product.price || 0),
      isFree: Number(product.price || 0) === 0,
    },
  ]

  const bookingStartTime = confirmedBooking?.startTime || selectedSlot?.startTime
  const bookingEndTime = confirmedBooking?.endTime || selectedSlot?.endTime
  const bookingTz = confirmedBooking?.timezone || selectedTimezone || 'Asia/Kolkata'

  const formattedBookingDate = useMemo(() => {
    if (!bookingStartTime) return ''
    const d = new Date(bookingStartTime)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: bookingTz,
    })
  }, [bookingStartTime, bookingTz])

  const formattedBookingTime = useMemo(() => {
    if (!bookingStartTime || !bookingEndTime) return ''
    const startD = new Date(bookingStartTime)
    const endD = new Date(bookingEndTime)
    const startStr = startD.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: bookingTz,
    })
    const endStr = endD.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: bookingTz,
    })
    return `${startStr} — ${endStr}`
  }, [bookingStartTime, bookingEndTime, bookingTz])

  const formattedTimezoneDisplay = useMemo(() => {
    const tz = bookingTz || 'Asia/Kolkata'
    const refDate = bookingStartTime ? new Date(bookingStartTime) : new Date()
    let longName = ''
    let gmtOffset = ''

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'long',
      })
      const parts = formatter.formatToParts(refDate)
      longName = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    } catch (e) {}

    try {
      const offsetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      })
      const parts = offsetFormatter.formatToParts(refDate)
      gmtOffset = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    } catch (e) {}

    if (longName && gmtOffset) {
      return `${longName} (${gmtOffset})`
    }
    if (longName) return longName

    const found = POPULAR_TIMEZONES.find((t) => t.id === tz)
    if (found) {
      return `${found.label.split('(')[0].trim()} (${found.offset})`
    }
    return tz
  }, [bookingTz, bookingStartTime])

  const meetingProviderLabel = useMemo(() => {
    if (confirmedBooking?.meetingUrl?.includes('meet.google.com') || confirmedBooking?.meetingType === 'GOOGLE_MEET') {
      return 'Google Meet'
    }
    if (confirmedBooking?.meetingUrl?.includes('zoom.us') || confirmedBooking?.meetingType === 'ZOOM') {
      return 'Zoom'
    }
    if (confirmedBooking?.locationText) {
      return confirmedBooking.locationText
    }
    if (confirmedBooking?.meetingUrl) {
      return 'Google Meet'
    }
    return null
  }, [confirmedBooking])

  const hasMeetingInfo = Boolean(meetingProviderLabel)

  const publicHostEmail = useMemo(() => {
    return config?.supportEmail || creator?.supportEmail || (creator?.showEmail ? creator?.email : '') || ''
  }, [config?.supportEmail, creator])

  const customerEmailDisplay = confirmedBooking?.customerEmail || email || ''

  const handleAddToCalendar = () => {
    if (isDownloadingIcs) return
    setIsDownloadingIcs(true)

    try {
      const sessionTitle = confirmedBooking?.bookingTypeName || selectedBookingType?.name || product?.title || 'Coaching Session'
      const safeFilename = `${sessionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'creatorstore-booking'}.ics`

      const success = downloadIcsFile({
        title: sessionTitle,
        description: `Coaching session with ${creatorDisplayName}.${confirmedBooking?.meetingUrl ? `\nMeeting URL: ${confirmedBooking.meetingUrl}` : ''}`,
        location: confirmedBooking?.meetingUrl || confirmedBooking?.locationText || (hasMeetingInfo ? meetingProviderLabel : 'Online'),
        url: confirmedBooking?.meetingUrl || undefined,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        timezone: bookingTz,
        organizer: (publicHostEmail || creatorDisplayName) ? {
          name: creatorDisplayName,
          email: publicHostEmail || undefined,
        } : undefined,
        attendee: customerEmailDisplay ? {
          name: confirmedBooking?.customerName || name || customerEmailDisplay.split('@')[0],
          email: customerEmailDisplay,
        } : undefined,
        filename: safeFilename,
      })

      if (success !== false) {
        toast.success('Calendar event (.ics) downloaded!')
      } else {
        toast.error('Could not download calendar file. Please try again.')
      }
    } catch (err) {
      console.error('ICS download error:', err)
      toast.error('Failed to generate calendar event.')
    } finally {
      setTimeout(() => {
        setIsDownloadingIcs(false)
      }, 1200)
    }
  }

  const handleContactSeller = () => {
    const sessionName = confirmedBooking?.bookingTypeName || selectedBookingType?.name || product?.title || 'Coaching Session'
    if (publicHostEmail) {
      window.location.href = `mailto:${publicHostEmail}?subject=${encodeURIComponent(`Booking change request: ${sessionName}`)}`
    } else {
      toast.info(`Please reach out to ${creatorDisplayName} directly through their storefront profile links.`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="bg-white text-[#111827] rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative border border-gray-100 animate-in zoom-in-95 duration-200"
      >
        {/* ================= STEP 1: TYPE SELECTION (Screenshot 1) ================= */}
        {step === 'type_select' && (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Top header title */}
            <div className="pt-6 pb-2 text-center px-6">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                {config?.title || product.title || 'My Bookings Link'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {config?.description || product.shortDescription || 'Book a session with me'}
              </p>
            </div>

            {/* Avatar / Identity Circle */}
            <div className="flex flex-col items-center justify-center pt-3 pb-4 px-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center shadow-inner relative">
                {creatorAvatar ? (
                  <img src={creatorAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-12 h-12 stroke-[1.5]" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-3 tracking-tight">
                {config?.title || product.title || 'My Bookings Link'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-gray-600" />
                </div>
                <span>{creatorUsernameDisplay}</span>
              </div>
            </div>

            {/* Booking Types List */}
            <div className="px-6 space-y-3 pb-6 flex-1">
              {bookingTypesList.map((bt) => {
                const isSelected = selectedBookingType?.id === bt.id
                const isFree = bt.isFree || Number(bt.price || 0) === 0
                const pricePill = isFree ? 'Free' : formatMoney(bt.price, bt.currency || 'INR')

                return (
                  <div
                    key={bt.id}
                    onClick={() => {
                      setSelectedBookingType(bt)
                      setStep('calendar_slots')
                    }}
                    className="group border border-gray-200 hover:border-gray-900 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all bg-white hover:shadow-xs active:scale-[0.99]"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight truncate">
                        {bt.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{bt.durationMinutes || 30} min</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center justify-center bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                        {pricePill}
                      </span>
                    </div>
                  </div>
                )
              })}

              {config?.description && (
                <p className="text-xs text-gray-500 leading-relaxed pt-2">
                  {config.description}
                </p>
              )}
            </div>

            {/* Bottom floating-style utility actions */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-xs">
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DATE & TIME SELECTION (Screenshots 2 & 3) ================= */}
        {step === 'calendar_slots' && (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Top Bar with Back Arrow */}
            <div className="px-6 pt-5 pb-2 relative flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (bookingTypesList.length > 1) {
                    setStep('type_select')
                  } else {
                    onClose()
                  }
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center flex-1 pr-8">
                <h3 className="text-xs font-bold text-gray-900 tracking-tight">
                  {config?.title || product.title || 'My Bookings Link'}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {config?.description || 'Book a session with me'}
                </p>
              </div>
            </div>

            {/* Selected Booking Type Heading & Metadata */}
            <div className="px-6 text-center space-y-1.5 pt-1 pb-3">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {selectedBookingType?.name || 'Book 1:1 time with me'}
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {selectedBookingType?.durationMinutes || 30} min
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs font-bold">{sessionPriceDisplay}</span>
                </span>
              </div>
            </div>

            {/* Timezone Selector Dropdown */}
            <div className="px-6 pb-4 relative">
              <button
                type="button"
                onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                className="w-full border border-gray-200 bg-gray-50/80 hover:bg-gray-100 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs font-medium text-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-gray-500" />
                  <span>{currentTimezoneInfo}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {isTimezoneDropdownOpen && (
                <div className="absolute top-full left-6 right-6 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                  {POPULAR_TIMEZONES.map((tz) => (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => {
                        setSelectedTimezone(tz.id)
                        setIsTimezoneDropdownOpen(false)
                        setSelectedSlot(null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedTimezone === tz.id ? 'bg-black text-white font-bold' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <span>{tz.label}</span>
                      <span className="text-[10px] opacity-75">{tz.offset}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Controls & Month Navigation */}
            <div className="px-6 pb-2">
              <div className="flex items-center justify-between py-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                  {monthYearLabel}
                </h4>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 7-column weekday row: Sun Mon Tue Wed Thu Fri Sat */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 py-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-y-1.5 text-center">
                {monthCells.map((cell, idx) => {
                  const isAvailable = availableMonthDates.includes(cell.isoDate)
                  const isSelected = selectedDate === cell.isoDate
                  const todayYmd = (() => {
                    const n = new Date()
                    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
                  })()
                  const isToday = cell.isoDate === todayYmd

                  if (!cell.isCurrentMonth) {
                    return <div key={idx} className="h-9 w-9 sm:h-10 sm:w-10 mx-auto" />
                  }

                  return (
                    <div key={idx} className="flex items-center justify-center">
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          setSelectedDate(cell.isoDate)
                        }}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white font-bold shadow-md scale-105'
                            : isAvailable
                            ? 'text-gray-900 border border-gray-200 hover:border-gray-900 hover:bg-gray-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {cell.dayNumber}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time Slots Area (Screenshot 3) */}
            {selectedDate && (
              <div className="px-6 pt-4 pb-6 border-t border-gray-100 mt-3 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                  {selectedDateHeader}
                </h4>

                {loadingSlots ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                    <span className="text-xs">Finding available times...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl p-4">
                    No time slots are available on this date. Please select another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot, sIdx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot)
                            setStep('customer_info')
                          }}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {slot.displayStart || slot.formattedTime?.split('-')[0]?.trim()}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bottom floating-style utility actions */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-xs mt-auto">
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CUSTOMER INFORMATION (Screenshots 4 & 5) ================= */}
        {step === 'customer_info' && (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Top Bar with Back Arrow */}
            <div className="px-6 pt-5 pb-2 relative flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('calendar_slots')}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center flex-1 pr-8">
                <h3 className="text-xs font-bold text-gray-900 tracking-tight">
                  {config?.title || product.title || 'My Bookings Link'}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {config?.description || 'Book a session with me'}
                </p>
              </div>
            </div>

            {/* Avatar & Header Summary (Screenshot 4) */}
            <div className="flex flex-col items-center justify-center pt-2 pb-3 px-6 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center shadow-inner">
                {creatorAvatar ? (
                  <img src={creatorAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400 stroke-[1.5]" />
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-2.5 tracking-tight">
                {selectedBookingType?.name || product.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-2 h-2 text-gray-600" />
                </div>
                <span>{creatorUsernameDisplay}</span>
              </div>
            </div>

            {/* Selected Booking Details Summary Card */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs text-gray-700 font-medium">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-semibold text-gray-900">{selectedDateHeader}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>
                    {selectedSlot?.displayStart || 'Start'} — {selectedSlot?.displayEnd || 'End'} ({durationMin} min)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>{currentTimezoneInfo}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-semibold text-gray-900">{sessionPriceDisplay}</span>
                </div>
              </div>
            </div>

            {/* Form Fields: Your information */}
            <div className="px-6 space-y-4 pb-6 flex-1">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3">
                  Your information
                </h4>

                {/* Name */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-bold text-gray-700">
                    Name (required)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }))
                    }}
                    placeholder="Your full name"
                    className="w-full bg-[#F4F4F4] focus:bg-white border border-transparent focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-hidden"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-red-500 font-medium">{formErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-bold text-gray-700">
                    Email (required)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: null }))
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-[#F4F4F4] focus:bg-white border border-transparent focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-hidden"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-red-500 font-medium">{formErrors.email}</p>
                  )}
                </div>

                {/* Optional Phone if configured */}
                {config?.customerFields?.phone?.enabled && (
                  <div className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-gray-700">
                      Phone {config?.customerFields?.phone?.required ? '(required)' : '(optional)'}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="w-full bg-[#F4F4F4] focus:bg-white border border-transparent focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-hidden"
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] text-red-500 font-medium">{formErrors.phone}</p>
                    )}
                  </div>
                )}

                {/* Custom Creator Questions */}
                {Array.isArray(config?.questions) && config.questions.map((q) => (
                  <div key={q.id} className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-gray-700">
                      {q.question} {q.required ? '(required)' : ''}
                    </label>
                    {q.type === 'LONG_TEXT' ? (
                      <textarea
                        rows={3}
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                        placeholder="Write your answer..."
                        className="w-full bg-[#F4F4F4] focus:bg-white border border-transparent focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-hidden"
                      />
                    ) : (
                      <input
                        type="text"
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                        placeholder="Your answer"
                        className="w-full bg-[#F4F4F4] focus:bg-white border border-transparent focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-hidden"
                      />
                    )}
                    {formErrors[`q_${q.id}`] && (
                      <p className="text-[11px] text-red-500 font-medium">{formErrors[`q_${q.id}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* PAYMENT ROUTING STEP FOR PAID BOOKINGS */}
              {/* Critical Requirement: Exactly TWO customer-facing country options: India vs Outside India */}
              {!isFreeSession && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900">
                      Country
                    </label>
                    <span className="text-xs font-extrabold text-gray-900">
                      {sessionPriceDisplay}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Option 1: India */}
                    <div
                      onClick={() => setCountryRoute('IN')}
                      className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                        countryRoute === 'IN'
                          ? 'border-black bg-gray-50 shadow-xs'
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-900 block">India</span>
                        <span className="text-[10px] text-gray-500 font-medium">Domestic payment</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        countryRoute === 'IN' ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {countryRoute === 'IN' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>

                    {/* Option 2: Outside India */}
                    <div
                      onClick={() => setCountryRoute('OTHER')}
                      className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                        countryRoute === 'OTHER'
                          ? 'border-black bg-gray-50 shadow-xs'
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-900 block">Outside India</span>
                        <span className="text-[10px] text-gray-500 font-medium">International payment</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        countryRoute === 'OTHER' ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {countryRoute === 'OTHER' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkboxes (Screenshot 5) */}
              <div className="space-y-2.5 pt-1">
                {/* Optional Mailing list opt-in */}
                {config?.mailingListOptIn && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={mailingListOptIn}
                      onChange={(e) => setMailingListOptIn(e.target.checked)}
                      className="mt-0.5 rounded-sm border-gray-300 text-black focus:ring-black h-4 w-4"
                    />
                    <span>Join {creatorDisplayName}'s mailing list</span>
                  </label>
                )}

                {/* Email updates & terms */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded-sm border-gray-300 text-black focus:ring-black h-4 w-4"
                  />
                  <span>
                    I agree to receive email updates and confirmations from CreatorStore. Unsubscribe anytime.{' '}
                    <span className="underline font-semibold">Terms & Privacy</span>.
                  </span>
                </label>
                {formErrors.terms && (
                  <p className="text-[11px] text-red-500 font-medium">{formErrors.terms}</p>
                )}
              </div>

              {/* Cancellation Policy Notice */}
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <p>
                  {config?.cancellationPolicy || `Cancellation window ends ${config?.cancellationPolicyNoticeHours || 24}h in advance of your booking.`}
                </p>
              </div>

              {/* Submit Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={isFreeSession ? handleFreeBookingSubmit : handlePaidBookingSubmit}
                  className="w-full bg-[#E5E7EB] hover:bg-black hover:text-white text-gray-900 font-bold py-3.5 px-4 rounded-full transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isFreeSession ? 'Confirming booking...' : 'Securing your slot...'}</span>
                    </>
                  ) : (
                    <span>{isFreeSession ? 'Submit' : `Proceed to Payment (${sessionPriceDisplay})`}</span>
                  )}
                </button>
              </div>

              {/* Footnote legal agreement text */}
              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                By submitting, you agree to CreatorStore's Terms, Privacy Notice, and to sharing your information with {creatorDisplayName}.
              </p>
            </div>

            {/* Bottom floating-style utility actions */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-xs mt-auto">
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: SUCCESS CONFIRMATION (Linktree style) ================= */}
        {step === 'confirmation' && (
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Top compact centered header */}
            <div className="pt-6 pb-2 text-center px-6 border-b border-transparent">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                {config?.title || product.title || 'Book a session'}
              </h2>
              {(config?.description || product.shortDescription) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {config?.description || product.shortDescription}
                </p>
              )}
            </div>

            {/* Scrollable confirmation body */}
            <div className="flex-1 overflow-y-auto px-6 py-3 text-center relative space-y-4">
              {/* Subtle celebratory confetti accents (Linktree style) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <span className="absolute top-8 left-10 w-2 h-3.5 bg-purple-500/80 rounded-xs rotate-12" />
                <span className="absolute top-16 right-10 w-2.5 h-2 bg-pink-500/80 rounded-xs -rotate-45" />
                <span className="absolute top-44 left-12 w-2 h-3 bg-purple-600/80 rounded-xs rotate-45" />
                <span className="absolute top-52 right-14 w-2.5 h-2 bg-fuchsia-500/80 rounded-xs -rotate-12" />
                <span className="absolute bottom-28 left-14 w-2 h-3.5 bg-pink-400/80 rounded-xs rotate-12" />
                <span className="absolute bottom-36 right-10 w-1.5 h-3 bg-purple-400/80 rounded-xs rotate-45" />
              </div>

              {/* Green checkmark circle icon */}
              <div className="w-13 h-13 rounded-full bg-[#E8F8EE] flex items-center justify-center mx-auto mt-2 shadow-xs">
                <Check className="w-6 h-6 stroke-[3] text-[#12B76A]" />
              </div>

              {/* Title & subtitle */}
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  You're booked in
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Your 1:1 session is confirmed.
                </p>
              </div>

              {/* Attendee Confirmation email pill badge */}
              {customerEmailDisplay && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs mx-auto max-w-full">
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">
                    Confirmation sent to <strong className="font-semibold text-gray-900">{customerEmailDisplay}</strong>
                  </span>
                </div>
              )}

              {/* Section heading: Booking details */}
              <div className="text-left pt-2">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2">
                  Booking details
                </h4>

                {/* Bordered white card */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-4 space-y-3.5 shadow-none">
                  {/* Top row: Avatar + Title & Username */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border border-gray-100">
                      {creatorAvatar ? (
                        <img src={creatorAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-gray-400 stroke-[1.5]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-sm tracking-tight truncate">
                        {confirmedBooking?.bookingTypeName || selectedBookingType?.name || product.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{creatorUsernameDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="border-t border-gray-100" />

                  {/* Booking Date & Time */}
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-gray-900">
                      {formattedBookingDate}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {formattedBookingTime}
                    </div>
                  </div>

                  {/* Timezone name */}
                  <div>
                    <div className="text-xs font-semibold text-gray-900">
                      {formattedTimezoneDisplay}
                    </div>
                  </div>

                  {/* Meeting link / provider (only when available!) */}
                  {hasMeetingInfo && (
                    <div className="space-y-0.5 pt-0.5">
                      <div className="text-xs font-semibold text-gray-900">
                        Meeting link
                      </div>
                      <div className="text-xs text-gray-600 font-medium select-text">
                        {meetingProviderLabel}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add to calendar button — prominent, full-width black button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  disabled={isDownloadingIcs}
                  className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-full transition-all text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-75"
                >
                  {isDownloadingIcs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding to calendar...</span>
                    </>
                  ) : (
                    <span>Add to calendar</span>
                  )}
                </button>
              </div>

              {/* Host information and contact section */}
              <div className="pt-2 pb-2 text-center space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">
                  Host: {creatorDisplayName}{publicHostEmail ? ` at ${publicHostEmail}` : ''}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Need to make a change?</span>
                  <button
                    type="button"
                    onClick={handleContactSeller}
                    className="font-bold text-gray-900 hover:underline cursor-pointer ml-0.5"
                  >
                    Contact seller
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom utility actions (Send, Share, Close) */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-xs mt-auto">
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer shadow-xs"
                title="Share"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer shadow-xs"
                title="Share link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
