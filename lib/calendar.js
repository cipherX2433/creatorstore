// Helper utilities for generating Google Calendar URLs and .ics iCalendar files for Coaching sessions

function formatICSDate(date) {
  const d = new Date(date)
  return d.toISOString().replace(/-|:|\.\d+/g, '')
}

export function generateGoogleCalendarUrl({ title, description, location, startTime, endTime }) {
  const startStr = formatICSDate(startTime)
  const endStr = formatICSDate(endTime)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Coaching Session',
    dates: `${startStr}/${endStr}`,
    details: description || '',
    location: location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function generateICSData({ title, description, location, startTime, endTime }) {
  const startStr = formatICSDate(startTime)
  const endStr = formatICSDate(endTime)
  const nowStr = formatICSDate(new Date())

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CreatorStore//Coaching Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:coaching-${Date.now()}@creatorstore.local`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title || 'Coaching Session'}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location || ''}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
