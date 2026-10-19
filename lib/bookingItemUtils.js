/**
 * Utilities for detecting and resolving booking sections and products in CreatorStore
 */

export function resolveSectionProduct(sec, products = []) {
  if (!sec) return null
  const prods = Array.isArray(products) ? products : []
  const targetId = sec.props?.productId || sec.props?.courseId || sec.props?.bookingId || sec.props?.coachingId || sec.props?.id
  if (targetId && prods.length) {
    const found = prods.find((p) => p.id === targetId || p.courseId === targetId)
    if (found) return found
  }
  const secType = String(sec.type || '').toLowerCase()
  if (['booking', 'bookings', 'coaching', 'session', 'sessions', 'calendar'].includes(secType)) {
    return prods.find((p) => String(p.type || '').toUpperCase() === 'COACHING' || String(p.type || '').toUpperCase() === 'BOOKING') || prods[0] || null
  }
  if (secType === 'product' && prods.length) {
    const label = sec.props?.title || sec.props?.label
    if (label) {
      const match = prods.find((p) => p.title?.toLowerCase() === label.toLowerCase())
      if (match) return match
    }
    return prods[0] || null
  }
  return null
}

export function isBookingItem(sec, products = []) {
  if (!sec) return false
  const secType = String(sec.type || '').toLowerCase()
  if (['booking', 'bookings', 'coaching', 'session', 'sessions', 'calendar'].includes(secType)) {
    return true
  }
  if (sec.props?.mediaType === 'booking' || sec.props?.bookingType || sec.props?.isBooking) {
    return true
  }
  const label = sec.props?.title || sec.props?.label || sec.title
  if (label && typeof label === 'string' && ['book a session', 'book 1:1', 'coaching session', '1:1 session'].includes(label.trim().toLowerCase())) {
    return true
  }
  const prod = resolveSectionProduct(sec, products)
  if (prod) {
    const pType = String(prod.type || '').toUpperCase()
    if (pType === 'COACHING' || pType === 'BOOKING' || pType === 'SESSION') {
      return true
    }
  }
  return false
}
