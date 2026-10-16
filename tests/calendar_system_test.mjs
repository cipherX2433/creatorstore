import { coachingService } from '../lib/services.js'
import { coachingRepo, productsRepo, profilesRepo, usersRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runCalendarSystemTests() {
  console.log('=== STARTING CREATORSTORE CALENDAR SYSTEM TESTS ===\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // 1. Create a test creator user and profile
    const testCreatorId = uuidv4()
    const testProductId1 = uuidv4()
    const testProductId2 = uuidv4()

    console.log(`Test Creator ID: ${testCreatorId}`)

    await usersRepo.create({
      id: testCreatorId,
      email: `cal_test_${Date.now()}@example.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'CREATOR',
    })

    await profilesRepo.upsert(testCreatorId, {
      name: 'Dr. Test Creator',
    })

    // Create 2 test coaching products
    await productsRepo.create({
      id: testProductId1,
      creatorId: testCreatorId,
      title: '1:1 Career Strategy Consultation',
      type: 'COACHING',
      price: 1500,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    await productsRepo.create({
      id: testProductId2,
      creatorId: testCreatorId,
      title: 'Portfolio Review Session',
      type: 'COACHING',
      price: 2500,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    // Test 1: Creator with no bookings
    const emptyBookings = await coachingService.listCreatorBookings(testCreatorId, {})
    assert(Array.isArray(emptyBookings) && emptyBookings.length === 0, 'Creator with no bookings returns empty array')

    // Test 2: Configure availability
    const savedAvail = await coachingService.saveCreatorAvailability(testCreatorId, {
      timezone: 'Asia/Kolkata',
      bufferMinutes: 15,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 60,
      availability: [
        { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 4, dayName: 'Thursday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 5, dayName: 'Friday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 6, dayName: 'Saturday', enabled: false, windows: [] },
        { dayOfWeek: 0, dayName: 'Sunday', enabled: false, windows: [] },
      ]
    })
    assert(savedAvail.timezone === 'Asia/Kolkata', 'Availability timezone configured correctly')
    assert(savedAvail.bufferMinutes === 15, 'Availability buffer configured correctly')
    assert(savedAvail.products.length === 2, 'Availability recognizes both coaching products')

    // Test 3: Create multiple bookings on same day & across week
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 2) // 2 days ahead
    const dateStr = tomorrow.toISOString().slice(0, 10)

    const booking1 = await coachingRepo.createBooking({
      id: uuidv4(),
      productId: testProductId1,
      creatorId: testCreatorId,
      customerEmail: 'rahul.sharma@example.com',
      customerName: 'Rahul Sharma',
      customerPhone: '+919876543210',
      startTime: new Date(`${dateStr}T10:00:00.000Z`),
      endTime: new Date(`${dateStr}T11:00:00.000Z`),
      timezone: 'Asia/Kolkata',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      meetingType: 'GOOGLE_MEET',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
    })

    const booking2 = await coachingRepo.createBooking({
      id: uuidv4(),
      productId: testProductId2,
      creatorId: testCreatorId,
      customerEmail: 'ananya.verma@example.com',
      customerName: 'Ananya Verma',
      startTime: new Date(`${dateStr}T14:30:00.000Z`),
      endTime: new Date(`${dateStr}T15:30:00.000Z`),
      timezone: 'Asia/Kolkata',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      meetingType: 'GOOGLE_MEET',
    })

    // Test 4: Retrieve creator bookings enriched with product metadata
    const fetched = await coachingService.listCreatorBookings(testCreatorId, {})
    assert(fetched.length === 2, 'Fetched exactly 2 bookings for creator')
    assert(fetched[0].productTitle === '1:1 Career Strategy Consultation' || fetched[1].productTitle === '1:1 Career Strategy Consultation', 'Booking 1 enriched with product title')
    assert(fetched[0].product?.price === 1500 || fetched[1].product?.price === 1500, 'Booking enriched with product price')

    // Test 5: Filter by status
    const confirmedOnly = await coachingService.listCreatorBookings(testCreatorId, { status: 'CONFIRMED' })
    assert(confirmedOnly.length === 1 && confirmedOnly[0].customerName === 'Rahul Sharma', 'Status filter CONFIRMED returns only confirmed bookings')

    const pendingOnly = await coachingService.listCreatorBookings(testCreatorId, { status: 'PENDING' })
    assert(pendingOnly.length === 1 && pendingOnly[0].customerName === 'Ananya Verma', 'Status filter PENDING returns only pending bookings')

    // Test 6: Filter by product
    const prod1Only = await coachingService.listCreatorBookings(testCreatorId, { productId: testProductId1 })
    assert(prod1Only.length === 1 && (prod1Only[0].productId === testProductId1 || prod1Only[0].product_id === testProductId1), 'Product filter correctly isolates product 1')

    // Test 7: Date range filtering (Week view bounds)
    const weekStart = new Date(`${dateStr}T00:00:00.000Z`)
    const weekEnd = new Date(`${dateStr}T23:59:59.999Z`)
    const weekBookings = await coachingService.listCreatorBookings(testCreatorId, {
      fromDate: weekStart.toISOString(),
      toDate: weekEnd.toISOString(),
    })
    assert(weekBookings.length === 2, 'Week date range correctly captures both bookings')

    // Test 8: Reschedule booking
    const newStart = new Date(`${dateStr}T11:30:00.000Z`)
    const newEnd = new Date(`${dateStr}T12:30:00.000Z`)
    const rescheduled = await coachingService.rescheduleBooking({
      bookingId: booking1.id,
      creatorId: testCreatorId,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    })
    assert(rescheduled.status === 'CONFIRMED', 'Rescheduled booking retains CONFIRMED status')
    assert(new Date(rescheduled.startTime).getTime() === newStart.getTime(), 'Rescheduled booking has new start time')
    assert(rescheduled.rescheduledFrom !== null, 'Reschedule history preserved in booking')

    // Test 9: Cancel booking
    const cancelled = await coachingService.cancelBooking({
      bookingId: booking2.id,
      creatorId: testCreatorId,
      reason: 'Creator requested date change',
    })
    assert(cancelled.status === 'CANCELLED', 'Booking status transitioned to CANCELLED')
    assert(cancelled.cancellationReason === 'Creator requested date change', 'Cancellation reason saved')

    // Test 10: Security / IDOR Protection
    const otherCreatorId = uuidv4()
    let idorPrevented = false
    try {
      await coachingService.cancelBooking({
        bookingId: booking1.id,
        creatorId: otherCreatorId,
        reason: 'Malicious cancellation attempt',
      })
    } catch (e) {
      if (e.status === 403 || e.message.includes('denied') || e.message.includes('Access')) {
        idorPrevented = true
      }
    }
    assert(idorPrevented, 'Unauthorized creator is blocked from cancelling another creator’s booking (IDOR protected)')

    // Summary
    console.log(`\n========================================`)
    console.log(`CALENDAR SYSTEM TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unhandled test error:', err)
    process.exit(1)
  }
}

runCalendarSystemTests()
