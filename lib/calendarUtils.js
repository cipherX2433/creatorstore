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
      isoDate: d.toISOString().slice(0, 10),
    })
  }

  // Days in current month
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const current = new Date(year, monthIndex, d)
    cells.push({
      date: current,
      isCurrentMonth: true,
      dayNumber: d,
      isoDate: current.toISOString().slice(0, 10),
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
        isoDate: d.toISOString().slice(0, 10),
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
