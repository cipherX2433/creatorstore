/**
 * Production-ready Calendar Utilities for CreatorStore
 * Handles timezone-aware date math, week/month generation, and status badge token mappings.
 */

export const STATUS_CONFIG = {
  CONFIRMED: {
    label: 'Confirmed',
    badgeClass: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    dotClass: 'bg-[#22C55E]',
    borderClass: 'border-l-4 border-l-[#22C55E]',
    solidBg: '#22C55E',
  },
  PENDING: {
    label: 'Pending',
    badgeClass: 'bg-[#EF6820]/10 text-[#EF6820] border-[#EF6820]/30',
    dotClass: 'bg-[#EF6820]',
    borderClass: 'border-l-4 border-l-[#EF6820]',
    solidBg: '#EF6820',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    badgeClass: 'bg-[#4D7CFF]/10 text-[#4D7CFF] border-[#4D7CFF]/30',
    dotClass: 'bg-[#4D7CFF]',
    borderClass: 'border-l-4 border-l-[#4D7CFF]',
    solidBg: '#4D7CFF',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-[#303030] text-[#A3A3A3] border-[#303030]',
    dotClass: 'bg-[#A3A3A3]',
    borderClass: 'border-l-4 border-l-[#A3A3A3]',
    solidBg: '#A3A3A3',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    dotClass: 'bg-[#EF4444]',
    borderClass: 'border-l-4 border-l-[#EF4444]',
    solidBg: '#EF4444',
  },
  NO_SHOW: {
    label: 'No Show',
    badgeClass: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    dotClass: 'bg-[#EF4444]',
    borderClass: 'border-l-4 border-l-[#EF4444]',
    solidBg: '#EF4444',
  },
}

export function getStatusConfig(status) {
  const normalized = String(status || 'PENDING').toUpperCase()
  return STATUS_CONFIG[normalized] || STATUS_CONFIG.PENDING
}

/**
 * Returns date parts in a given timezone
 */
export function getDatePartsInTimezone(dateInput, timezone = 'Asia/Kolkata') {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return null

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    const mapping = {}
    for (const p of parts) {
      mapping[p.type] = p.value
    }

    const year = parseInt(mapping.year, 10)
    const month = parseInt(mapping.month, 10) // 1-12
    const day = parseInt(mapping.day, 10)
    let hour = parseInt(mapping.hour, 10)
    if (hour === 24) hour = 0
    const minute = parseInt(mapping.minute, 10)

    return { year, month, day, hour, minute }
  } catch (e) {
    // Fallback if timezone string is invalid
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
    }
  }
}

/**
 * Convert a local calendar date ("YYYY-MM-DD") and local time ("HH:mm")
 * in an IANA timezone into the canonical UTC Date instant.
 * Handles daylight saving transitions, non-hourly offsets, and month boundaries.
 */
export function localDateTimeToUtc({ date, time, timezone = 'UTC' }) {
  if (!date || !time) return new Date()
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const parts = getDatePartsInTimezone(guessUtc, timezone)
  if (!parts) return new Date(guessUtc)

  const dateInTz = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
  let targetUtc = guessUtc + (guessUtc - dateInTz)

  // Verify and adjust for DST transitions where local offset might shift
  const verifyParts = getDatePartsInTimezone(targetUtc, timezone)
  if (verifyParts) {
    const verifyInTz = Date.UTC(verifyParts.year, verifyParts.month - 1, verifyParts.day, verifyParts.hour, verifyParts.minute, 0, 0)
    targetUtc += (guessUtc - verifyInTz)
  }

  return new Date(targetUtc)
}

/**
 * Returns "YYYY-MM-DD" representing the calendar date of dateInput in a given timezone
 */
export function getDateInTimezone(dateInput, timezone = 'Asia/Kolkata') {
  const parts = getDatePartsInTimezone(dateInput, timezone)
  if (!parts) return new Date(dateInput).toISOString().slice(0, 10)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * Format a date object/ISO string into localized string in creator timezone
 */
export function formatInTimezone(dateInput, timezone = 'Asia/Kolkata', options = {}) {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...options,
    }).format(d)
  } catch (e) {
    return d.toUTCString()
  }
}

/**
 * Format time range, e.g. "10:00 AM – 11:00 AM" in creator timezone
 */
export function formatTimeRange(startInput, endInput, timezone = 'Asia/Kolkata') {
  const startStr = formatInTimezone(startInput, timezone, { hour: 'numeric', minute: '2-digit', hour12: true })
  const endStr = formatInTimezone(endInput, timezone, { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${startStr} – ${endStr}`
}

/**
 * Given any reference Date, returns Monday–Sunday Date objects for that week
 */
export function getWeekDates(referenceDate) {
  const curr = new Date(referenceDate)
  // Get day of week: 0 is Sun, 1 is Mon, 6 is Sat
  const day = curr.getDay()
  // Distance to Monday (if day is 0/Sunday, distance is -6; else distance is 1 - day)
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(curr)
  monday.setDate(curr.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const week = []
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday)
    nextDay.setDate(monday.getDate() + i)
    week.push(nextDay)
  }
  return week
}

/**
 * Given year and monthIndex (0-11), returns full 35-42 calendar cell array starting Monday
 */
function formatYmd(year, month1Based, day) {
  return `${year}-${String(month1Based).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getMonthCalendarCells(year, monthIndex) {
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0)

  // Day of week of 1st day (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const paddingBefore = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1

  const cells = []

  // Padding days from previous month
  for (let i = paddingBefore; i > 0; i--) {
    const d = new Date(year, monthIndex, 1 - i)
    cells.push({
      date: d,
      isCurrentMonth: false,
      dayNumber: d.getDate(),
      isoDate: formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    })
  }

  // Days in current month
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const current = new Date(year, monthIndex, d)
    cells.push({
      date: current,
      isCurrentMonth: true,
      dayNumber: d,
      isoDate: formatYmd(year, monthIndex + 1, d),
    })
  }

  // Padding days for next month to complete 7-column rows
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7 && remaining > 0) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, monthIndex + 1, i)
      cells.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: d.getDate(),
        isoDate: formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      })
    }
  }

  return cells
}

/**
 * Checks if two dates fall on the same calendar day in the given timezone
 */
export function isSameDayInTz(date1, date2, timezone = 'Asia/Kolkata') {
  const p1 = getDatePartsInTimezone(date1, timezone)
  const p2 = getDatePartsInTimezone(date2, timezone)
  if (!p1 || !p2) return false
  return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day
}

/**
 * Returns month calendar cells starting on Sunday (Sun Mon Tue Wed Thu Fri Sat)
 */
export function getSundayFirstMonthCells(year, monthIndex) {
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0)

  // Sunday = 0, Monday = 1, ..., Saturday = 6
  const paddingBefore = firstDayOfMonth.getDay()
  const cells = []

  // Padding from previous month
  for (let i = paddingBefore; i > 0; i--) {
    const d = new Date(year, monthIndex, 1 - i)
    cells.push({
      date: d,
      isCurrentMonth: false,
      dayNumber: d.getDate(),
      isoDate: formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    })
  }

  // Days in current month
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const current = new Date(year, monthIndex, d)
    cells.push({
      date: current,
      isCurrentMonth: true,
      dayNumber: d,
      isoDate: formatYmd(year, monthIndex + 1, d),
    })
  }

  // Padding to complete grid rows
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7 && remaining > 0) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, monthIndex + 1, i)
      cells.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: d.getDate(),
        isoDate: formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      })
    }
  }

  return cells
}

/**
 * Generates a Google Calendar "Add to Calendar" URL
 */
export function createGoogleCalendarUrl({ title, description, location, startTime, endTime }) {
  const formatUtcForGCal = (dateInput) => {
    const d = new Date(dateInput)
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const startUtc = formatUtcForGCal(startTime)
  const endUtc = formatUtcForGCal(endTime)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Coaching Session',
    dates: `${startUtc}/${endUtc}`,
    details: description || 'Booked via CreatorStore',
    location: location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates an iCalendar (.ics) format string
 */
export function generateIcsContent({
  title,
  description,
  location,
  startTime,
  endTime,
  url,
  timezone,
  organizer,
  attendee,
}) {
  const formatUtcForIcs = (dateInput) => {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const startUtc = formatUtcForIcs(startTime)
  const endUtc = formatUtcForIcs(endTime)
  const stamp = formatUtcForIcs(new Date())
  const uid = `cs-booking-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@creatorstore.app`

  const cleanText = (txt) =>
    String(txt || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')

  const meetingUrl = url || (location && (String(location).startsWith('http://') || String(location).startsWith('https://')) ? location : '')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CreatorStore//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    timezone ? `X-WR-TIMEZONE:${timezone}` : '',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    startUtc ? `DTSTART:${startUtc}` : '',
    endUtc ? `DTEND:${endUtc}` : '',
    `SUMMARY:${cleanText(title || 'Coaching Session')}`,
    `DESCRIPTION:${cleanText(description || 'Booked via CreatorStore')}`,
    location ? `LOCATION:${cleanText(location)}` : (meetingUrl ? `LOCATION:${cleanText(meetingUrl)}` : ''),
    meetingUrl ? `URL:${meetingUrl}` : '',
    meetingUrl && meetingUrl.includes('meet.google.com') ? `X-GOOGLE-CONFERENCE:${meetingUrl}` : '',
  ]

  // Organizer: only when valid and available
  if (organizer && typeof organizer === 'object') {
    const orgEmail = organizer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(organizer.email).trim())
      ? String(organizer.email).trim()
      : null
    const orgName = organizer.name || organizer.displayName || organizer.username || ''
    if (orgEmail) {
      lines.push(`ORGANIZER;CN="${cleanText(orgName || orgEmail)}":mailto:${orgEmail}`)
    }
  }

  // Attendee: only when valid and available
  if (attendee && typeof attendee === 'object') {
    const attEmail = attendee.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(attendee.email).trim())
      ? String(attendee.email).trim()
      : null
    const attName = attendee.name || attendee.displayName || ''
    if (attEmail) {
      lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${cleanText(attName || attEmail)}":mailto:${attEmail}`)
    }
  }

  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR')

  return lines.filter(Boolean).join('\r\n')
}

/**
 * Triggers a browser download of the .ics file
 */
export function downloadIcsFile({
  title,
  description,
  location,
  startTime,
  endTime,
  url,
  timezone,
  organizer,
  attendee,
  filename,
}) {
  if (typeof window === 'undefined') return false
  try {
    const safeTitle = (title || 'creatorstore-booking')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const finalFilename = filename || `${safeTitle || 'creatorstore-booking'}.ics`

    const icsText = generateIcsContent({
      title,
      description,
      location,
      startTime,
      endTime,
      url,
      timezone,
      organizer,
      attendee,
    })

    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', finalFilename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(link.href)
    return true
  } catch (err) {
    console.error('Failed to generate or download ICS file:', err)
    return false
  }
}
