import assert from 'node:assert'
import { prisma } from '../lib/prisma.js'
import { coachingRepo, productsRepo } from '../lib/repos.js'
import { coachingService } from '../lib/services.js'
import { getSundayFirstMonthCells } from '../lib/calendarUtils.js'

async function runTest() {
  console.log('=====================================================================')
  console.log(' TEST: MOHIT STOREFRONT CALENDAR AVAILABILITY & BOOKING FLOW')
  console.log('=====================================================================')

  // 1. Verify creator and product
  const store = await prisma.store.findFirst({ where: { slug: 'mohit' } })
  assert(store, 'Store with slug mohit exists')
  console.log('✅ Found store:', store.slug, 'creatorId:', store.creatorId)

  const product = await productsRepo.getById('c8a40e76-745e-461e-bfd3-fcbd0a129095')
  assert(product, 'Coaching product c8a40e76-745e-461e-bfd3-fcbd0a129095 exists')
  assert(product.type === 'COACHING', 'Product type is COACHING')
  assert(product.status === 'PUBLISHED', 'Product status is PUBLISHED')
  console.log('✅ Found product:', product.title, 'Status:', product.status, 'Price:', product.price)

  // 2. Verify config retrieval
  const config = await coachingService.getConfig(store.creatorId, product.id)
  assert(config, 'Coaching configuration exists')
  assert(config.timezone === 'Asia/Calcutta', `Timezone is Asia/Calcutta (got ${config.timezone})`)
  assert(config.minimumNoticeMinutes === 240, `minNotice is 240 min (got ${config.minimumNoticeMinutes})`)
  assert(config.maximumAdvanceDays === 10, `maxAdvance is 10 days (got ${config.maximumAdvanceDays})`)
  
  const enabledDays = config.availability.filter((a) => a.enabled)
  assert(enabledDays.length === 7, `All 7 weekdays are enabled (got ${enabledDays.length})`)
  console.log('✅ Config verified with all 7 weekdays enabled (Sunday through Saturday)')

  // 3. Month availability calculation
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthAvailability = await coachingService.getAvailableMonthDates({
    productId: product.id,
    year,
    month,
    durationMinutes: 30,
    timezone: config.timezone,
  })

  assert(Array.isArray(monthAvailability.availableDates), 'availableDates is an array')
  assert(monthAvailability.availableDates.length > 0, `availableDates has ${monthAvailability.availableDates.length} days`)
  console.log('✅ Available dates returned:', monthAvailability.availableDates)

  // Verify that dates span multiple different weekdays
  const weekdaysRepresented = new Set(
    monthAvailability.availableDates.map((dStr) => {
      const [y, m, d] = dStr.split('-').map(Number)
      return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    })
  )
  console.log('✅ Weekdays represented in upcoming 10-day window:', Array.from(weekdaysRepresented).sort())
  // 10 consecutive days must contain all 7 days of the week!
  assert(weekdaysRepresented.size === 7, `All 7 weekdays represented in 10-day booking window (got ${weekdaysRepresented.size})`)

  // 4. Verify Calendar Grid cell alignment and enabled/disabled state
  const cells = getSundayFirstMonthCells(year, month - 1)
  assert(cells.length >= 28 && cells.length <= 42, `Calendar has ${cells.length} cells`)

  // Check that available dates match cell.isoDate exactly
  const selectableCells = cells.filter((c) => c.isCurrentMonth && monthAvailability.availableDates.includes(c.isoDate))
  assert(selectableCells.length === monthAvailability.availableDates.length,
    `Selectable cells in calendar (${selectableCells.length}) match availableDates (${monthAvailability.availableDates.length})`
  )
  console.log(`✅ Calendar cells successfully enable exactly the ${selectableCells.length} available dates`)

  // 5. Test slot generation for an available date
  const testDate = monthAvailability.availableDates[1] // Pick 2nd available date to avoid notice edge
  const slotsRes = await coachingService.getAvailableSlots({
    productId: product.id,
    date: testDate,
    durationMinutes: 30,
    timezone: config.timezone,
  })

  assert(Array.isArray(slotsRes.slots), 'slots is an array')
  assert(slotsRes.slots.length > 0, `Generated ${slotsRes.slots.length} available slots for ${testDate}`)
  console.log(`✅ Slots generated for ${testDate}: ${slotsRes.slots.length} slots (e.g. ${slotsRes.slots[0].displayStart} - ${slotsRes.slots[0].displayEnd})`)

  // 6. Test Free Booking Flow creation & server-side revalidation
  const slotToBook = slotsRes.slots[0]
  const testCustomerEmail = `e2e_tester_${Date.now()}@example.com`

  const createdBooking = await coachingService.createBookingHold({
    productId: product.id,
    startTime: slotToBook.startTime,
    endTime: slotToBook.endTime,
    customerEmail: testCustomerEmail,
    customerName: 'Storefront E2E Tester',
    bookingTypeId: 'bt_default',
    mailingListOptIn: true,
  })

  assert(createdBooking, 'Booking created successfully')
  assert(createdBooking.status === 'CONFIRMED', 'Free session status is CONFIRMED')
  assert(createdBooking.paymentStatus === 'PAID', 'Free session paymentStatus is PAID')
  assert(Boolean(createdBooking.meetingUrl), `Meeting URL generated: ${createdBooking.meetingUrl}`)
  console.log('✅ Free booking created and confirmed:', createdBooking.id)

  // 7. Test Double-Booking Protection
  console.log('--- Testing Double-Booking Protection ---')
  let conflictCaught = false
  try {
    await coachingService.createBookingHold({
      productId: product.id,
      startTime: slotToBook.startTime,
      endTime: slotToBook.endTime,
      customerEmail: 'another_user@example.com',
      customerName: 'Double Booker',
      bookingTypeId: 'bt_default',
    })
  } catch (err) {
    conflictCaught = true
    assert(err.status === 409, `Expected 409 conflict, got ${err.status}: ${err.message}`)
    console.log('✅ Double-booking rejected with 409 Conflict:', err.message)
  }
  assert(conflictCaught, 'Double booking of same slot was rejected')

  // 8. Test slot disappears from available slots
  const slotsAfterBooking = await coachingService.getAvailableSlots({
    productId: product.id,
    date: testDate,
    durationMinutes: 30,
    timezone: config.timezone,
  })
  const bookedSlotStillPresent = slotsAfterBooking.slots.some((s) => s.startTime === slotToBook.startTime)
  assert(!bookedSlotStillPresent, 'Booked slot no longer appears in available slots')
  console.log('✅ Booked slot successfully removed from available slots')

  // Clean up test booking
  await prisma.coachingBooking.delete({ where: { id: createdBooking.id } }).catch(() => {})
  console.log('✅ Cleaned up test booking')

  console.log('\n=====================================================================')
  console.log(' ALL MOHIT STOREFRONT BOOKING & AVAILABILITY TESTS PASSED!')
  console.log('=====================================================================')
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
