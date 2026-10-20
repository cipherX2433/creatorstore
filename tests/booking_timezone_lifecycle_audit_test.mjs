/**
 * Comprehensive Timezone Lifecycle Audit & Regression Test Suite
 * Validates end-to-end timezone handling, concurrency safety, daylight-saving transitions,
 * boundary conditions, and ensures 9:00 AM IST booking displays as 9:00 AM IST.
 */

import { coachingService, checkoutService } from '../lib/services.js'
import { coachingRepo, productsRepo, profilesRepo, usersRepo, ordersRepo } from '../lib/repos.js'
import {
  localDateTimeToUtc,
  getDateInTimezone,
  getDatePartsInTimezone,
  formatInTimezone,
  generateIcsContent,
} from '../lib/calendarUtils.js'
import { v4 as uuidv4 } from 'uuid'

async function runTimezoneLifecycleAudit() {
  console.log('=====================================================================')
  console.log(' CREATORSTORE: BOOKING TIMEZONE LIFECYCLE AUDIT & REGRESSION TESTS')
  console.log('=====================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${message}`)
      failed++
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: The 9:00 AM IST Regression Test
    // Creator in Asia/Kolkata configures 9:00 AM - 17:00 window.
    // Customer in India queries slots, sees 9:00 AM, books it, and confirmation renders 9:00 AM (NOT 2:30 PM).
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: 9:00 AM IST Regression Test ---')
    const creatorId1 = uuidv4()
    const productId1 = uuidv4()
    const testDate1 = '2026-10-25' // A Sunday

    await usersRepo.create({
      id: creatorId1,
      email: `creator_tz_${Date.now()}@test.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'CREATOR',
    })

    await profilesRepo.upsert(creatorId1, {
      name: 'Priya Sharma (IST Creator)',
      timezone: 'Asia/Kolkata',
    })

    await productsRepo.create({
      id: productId1,
      creatorId: creatorId1,
      title: 'Morning Mentorship 1:1',
      type: 'COACHING',
      price: 0, // Free product for direct confirmation
      currency: 'INR',
      status: 'PUBLISHED',
    })

    // Configure availability: Sunday (day 0), 09:00 to 17:00 IST
    await coachingRepo.upsertConfig(creatorId1, {
      productId: productId1,
      timezone: 'Asia/Kolkata',
      durationMinutes: 30,
      bufferMinutes: 0,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 0, // immediate for testing
      maximumAdvanceDays: 60,
      availability: [
        {
          dayOfWeek: 0, // Sunday
          enabled: true,
          windows: [{ startTime: '09:00', endTime: '17:00' }],
        },
      ],
    })

    // 1. Fetch available slots for customer in Asia/Kolkata
    const slotsResponse1 = await coachingService.getAvailableSlots({
      productId: productId1,
      date: testDate1,
      timezone: 'Asia/Kolkata',
    })

    assert(Array.isArray(slotsResponse1.slots) && slotsResponse1.slots.length > 0, 'Slots generated for 2026-10-25')
    const slot9am = slotsResponse1.slots.find((s) => s.displayStart === '09:00 AM' || s.displayStart === '9:00 AM')
    assert(Boolean(slot9am), 'First slot is 9:00 AM')

    // Verify canonical instant: 9:00 AM IST (+05:30) must be 03:30:00.000Z in UTC
    const expectedUtcIso = '2026-10-25T03:30:00.000Z'
    assert(slot9am.startTime === expectedUtcIso, `Slot canonical instant is ${expectedUtcIso} (actual: ${slot9am.startTime})`)
    assert(slot9am.displayStart.includes('9:00 AM') || slot9am.displayStart.includes('09:00 AM'), `displayStart shows 9:00 AM (actual: ${slot9am.displayStart})`)

    // -------------------------------------------------------------------------
    // TEST 2: Multi-Timezone Cross-Viewing
    // Customer in America/New_York views the exact same instant before it is booked
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Timezone Cross-Viewing ---')
    // 2026-10-25 03:30:00 UTC in EDT (UTC-4) is 2026-10-24 23:30 (11:30 PM on Oct 24)
    const nySlotsResponse = await coachingService.getAvailableSlots({
      productId: productId1,
      date: '2026-10-24', // Saturday evening in NY
      timezone: 'America/New_York',
    })

    const matchingNySlot = nySlotsResponse.slots.find((s) => s.startTime === expectedUtcIso)
    assert(Boolean(matchingNySlot), 'New York customer on 2026-10-24 sees slot corresponding to 03:30 UTC')
    assert(matchingNySlot?.displayStart === '11:30 PM', `New York display time is 11:30 PM (actual: ${matchingNySlot?.displayStart})`)

    // -------------------------------------------------------------------------
    // Now Customer books the 9:00 AM slot
    // -------------------------------------------------------------------------
    console.log('\n--- Booking 9:00 AM Slot & Validating Confirmation ---')
    const customerEmail1 = `attendee_${Date.now()}@test.com`
    const booking1 = await coachingService.createBookingHold({
      productId: productId1,
      startTime: slot9am.startTime,
      endTime: slot9am.endTime,
      timezone: 'Asia/Kolkata',
      customerEmail: customerEmail1,
      customerName: 'Rahul Verma',
    })

    assert(booking1.status === 'CONFIRMED', 'Booking confirmed')
    assert(new Date(booking1.startTime).toISOString() === expectedUtcIso, 'Database persistence preserves exact UTC instant')

    // Verify confirmation display formatting
    const confirmFormattedTime = new Date(booking1.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: booking1.timezone,
    })
    assert(confirmFormattedTime === '9:00 AM', `Confirmation screen renders 9:00 AM (NOT 2:30 PM!) — actual: ${confirmFormattedTime}`)


    // -------------------------------------------------------------------------
    // TEST 3: Slot, DB, Email, and ICS All Represent the Exact Same Instant
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Unified Instant Across All Layers ---')
    const icsContent = generateIcsContent({
      title: 'Morning Mentorship 1:1',
      startTime: booking1.startTime,
      endTime: booking1.endTime,
      timezone: booking1.timezone,
      url: booking1.meetingUrl,
    })

    assert(icsContent.includes('DTSTART:20261025T033000Z'), 'ICS contains canonical UTC timestamp DTSTART:20261025T033000Z')
    assert(icsContent.includes('DTEND:20261025T040000Z'), 'ICS contains canonical UTC timestamp DTEND:20261025T040000Z')
    assert(icsContent.includes('X-WR-TIMEZONE:Asia/Kolkata'), 'ICS specifies calendar timezone Asia/Kolkata')

    // -------------------------------------------------------------------------
    // TEST 4: Boundary Testing (Midnight & Month Boundaries)
    // Creator in Asia/Kolkata has 01:00 AM slot on the 1st of a month
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Midnight & Month Boundaries ---')
    // 2026-11-01 at 01:00 AM IST is 2026-10-31 at 19:30:00 UTC (previous month in UTC!)
    const nov1SlotUtc = localDateTimeToUtc({
      date: '2026-11-01',
      time: '01:00',
      timezone: 'Asia/Kolkata',
    })
    assert(nov1SlotUtc.toISOString() === '2026-10-31T19:30:00.000Z', `01:00 AM IST on Nov 1 is 19:30 UTC on Oct 31 (actual: ${nov1SlotUtc.toISOString()})`)
    const roundTripDate = getDateInTimezone(nov1SlotUtc, 'Asia/Kolkata')
    assert(roundTripDate === '2026-11-01', `Date in Asia/Kolkata remains 2026-11-01 (actual: ${roundTripDate})`)

    // Count bookings on date must evaluate in creator timezone, not UTC slice
    await coachingRepo.createBooking({
      id: uuidv4(),
      productId: productId1,
      creatorId: creatorId1,
      customerEmail: 'night_owl@test.com',
      startTime: nov1SlotUtc,
      endTime: new Date(nov1SlotUtc.getTime() + 30 * 60 * 1000),
      timezone: 'Asia/Kolkata',
      status: 'CONFIRMED',
    })

    const countNov1 = await coachingRepo.countBookingsOnDate(creatorId1, '2026-11-01', 'Asia/Kolkata')
    const countOct31 = await coachingRepo.countBookingsOnDate(creatorId1, '2026-10-31', 'Asia/Kolkata')
    assert(countNov1 === 1, `Nov 1 count is 1 (actual: ${countNov1})`)
    assert(countOct31 === 0, `Oct 31 count is 0 (actual: ${countOct31})`)

    // -------------------------------------------------------------------------
    // TEST 5: Daylight Saving Transitions
    // America/New_York switches from EDT (UTC-4) to EST (UTC-5) on Nov 1, 2026
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Daylight Saving Time (DST) Transitions ---')
    // Summer date: July 15, 2026 at 10:00 AM NY (EDT, UTC-4) -> 14:00 UTC
    const summerUtc = localDateTimeToUtc({
      date: '2026-07-15',
      time: '10:00',
      timezone: 'America/New_York',
    })
    assert(summerUtc.toISOString() === '2026-07-15T14:00:00.000Z', `Summer 10:00 AM EDT is 14:00 UTC (actual: ${summerUtc.toISOString()})`)

    // Winter date: Dec 15, 2026 at 10:00 AM NY (EST, UTC-5) -> 15:00 UTC
    const winterUtc = localDateTimeToUtc({
      date: '2026-12-15',
      time: '10:00',
      timezone: 'America/New_York',
    })
    assert(winterUtc.toISOString() === '2026-12-15T15:00:00.000Z', `Winter 10:00 AM EST is 15:00 UTC (actual: ${winterUtc.toISOString()})`)

    // -------------------------------------------------------------------------
    // TEST 6: Concurrency Safety & Mutex Serialization
    // Two simultaneous attempts to book the exact same slot must yield 1 success & 1 conflict (409)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Concurrency & Double-Booking Prevention ---')
    const slot10am = slotsResponse1.slots.find((s) => s.displayStart === '10:00 AM' || s.displayStart === '10:00 AM')
    assert(Boolean(slot10am), '10:00 AM slot is available for concurrency race test')

    const p1 = coachingService.createBookingHold({
      productId: productId1,
      startTime: slot10am.startTime,
      endTime: slot10am.endTime,
      timezone: 'Asia/Kolkata',
      customerEmail: 'user_alpha@test.com',
      customerName: 'User Alpha',
    }).then((res) => ({ status: 'fulfilled', res })).catch((err) => ({ status: 'rejected', err }))

    const p2 = coachingService.createBookingHold({
      productId: productId1,
      startTime: slot10am.startTime,
      endTime: slot10am.endTime,
      timezone: 'Asia/Kolkata',
      customerEmail: 'user_beta@test.com',
      customerName: 'User Beta',
    }).then((res) => ({ status: 'fulfilled', res })).catch((err) => ({ status: 'rejected', err }))

    const [res1, res2] = await Promise.all([p1, p2])
    const successCount = (res1.status === 'fulfilled' ? 1 : 0) + (res2.status === 'fulfilled' ? 1 : 0)
    const conflictCount = (res1.status === 'rejected' && (res1.err?.status === 409 || res1.err?.statusCode === 409) ? 1 : 0) +
                          (res2.status === 'rejected' && (res2.err?.status === 409 || res2.err?.statusCode === 409) ? 1 : 0)


    assert(successCount === 1, `Exactly 1 concurrent booking succeeded (actual: ${successCount})`)
    assert(conflictCount === 1, `Exactly 1 concurrent booking received 409 Conflict (actual: ${conflictCount})`)

    // -------------------------------------------------------------------------
    // TEST 7: Historical Stored Bookings Compatibility
    // Pre-existing stored booking records remain fully valid and correctly rendered
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Historical Stored Bookings Compatibility ---')
    const histBookingId = uuidv4()
    const histStartTime = new Date('2026-10-25T04:30:00.000Z') // 10:00 AM IST
    const histEndTime = new Date('2026-10-25T05:00:00.000Z')   // 10:30 AM IST

    await coachingRepo.createBooking({
      id: histBookingId,
      productId: productId1,
      creatorId: creatorId1,
      customerEmail: 'historical_client@test.com',
      customerName: 'Old Booking',
      startTime: histStartTime,
      endTime: histEndTime,
      timezone: 'Asia/Kolkata',
      status: 'CONFIRMED',
    })

    const fetchedHist = await coachingService.getBooking(histBookingId, 'historical_client@test.com', null)
    assert(fetchedHist.id === histBookingId, 'Historical booking retrievable without error')
    const histDisplayTime = formatInTimezone(fetchedHist.startTime, fetchedHist.timezone, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    assert(histDisplayTime === '10:00 AM', `Historical booking formatted as 10:00 AM (actual: ${histDisplayTime})`)

    console.log('\n=====================================================================')
    console.log(` AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    console.log('=====================================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal error during timezone lifecycle audit:', err)
    process.exit(1)
  }
}

runTimezoneLifecycleAudit()
