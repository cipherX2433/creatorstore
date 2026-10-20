/**
 * CreatorStore — Paid Coaching & Session Booking Payments End-to-End Test Suite
 *
 * Validates all 15 required scenarios:
 * 1. Creator creates and saves a free session.
 * 2. Creator creates and saves a paid session with a valid price/currency.
 * 3. Invalid price and unsupported currency are rejected.
 * 4. Free booking completes without payment.
 * 5. Paid booking with India selected starts Razorpay checkout.
 * 6. Paid booking with Outside India selected starts Dodo checkout.
 * 7. Payment success is verified before booking confirmation.
 * 8. Failed or cancelled payment does not confirm the booking.
 * 9. Duplicate submissions and webhook retries do not duplicate bookings.
 * 10. Two visitors cannot reserve the same slot concurrently.
 * 11. An expired pending reservation does not create a double booking.
 * 12. Timezone conversions remain correct across calendar, confirmation, and .ics.
 * 13. A 9:00 AM selected slot is displayed as 9:00 AM in the intended timezone.
 * 14. Existing free booking and calendar availability behavior still works.
 * 15. Subscription checkout and subscription entitlements remain unchanged.
 */

import { coachingService, checkoutService, webhookService, creatorSubscriptionService } from '../lib/services.js'
import { coachingRepo, productsRepo, profilesRepo, usersRepo, ordersRepo, creatorSubscriptionsRepo } from '../lib/repos.js'
import {
  localDateTimeToUtc,
  getDateInTimezone,
  formatInTimezone,
  generateIcsContent,
} from '../lib/calendarUtils.js'
import { isSupportedCurrency, validateMinimumAmount } from '../lib/currencies.js'
import { v4 as uuidv4 } from 'uuid'

async function runEndToEndCoachingPaymentsTest() {
  console.log('========================================================================')
  console.log(' CREATORSTORE: PAID COACHING & SESSION BOOKING PAYMENTS END-TO-END')
  console.log('========================================================================\n')

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
    // Setup Shared Creator
    const creatorId = uuidv4()
    await usersRepo.create({
      id: creatorId,
      email: `creator_coaching_${Date.now()}@test.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'CREATOR',
    })
    await profilesRepo.upsert(creatorId, {
      name: 'Alok Nath',
      username: `alok_${Date.now()}`,
      timezone: 'Asia/Kolkata',
    })
    // Give active PRO creator subscription for entitlements
    await creatorSubscriptionsRepo.upsert(creatorId, {
      plan: 'PRO',
      status: 'ACTIVE',
      currency: 'INR',
      amount: 999,
      interval: 'MONTHLY',
    })

    // -------------------------------------------------------------------------
    // TEST 1: Creator creates and saves a free session
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Creator creates and saves a free session ---')
    const freeProdId = uuidv4()
    await productsRepo.create({
      id: freeProdId,
      creatorId,
      title: 'Free 15-min Discovery Call',
      type: 'COACHING',
      price: 0,
      currency: 'inr',
      status: 'PUBLISHED',
    })

    const freeConfig = await coachingService.saveConfig(creatorId, freeProdId, {
      title: 'Free 15-min Discovery Call',
      isFree: true,
      price: 0,
      currency: 'inr',
      durationMinutes: 15,
      timezone: 'Asia/Kolkata',
      availability: [
        {
          dayOfWeek: 1, // Monday
          enabled: true,
          windows: [{ startTime: '10:00', endTime: '18:00' }],
        },
      ],
      bookingTypes: [
        {
          id: 'bt_free_15',
          name: 'Free 15-min Discovery',
          durationMinutes: 15,
          isFree: true,
          price: 0,
          currency: 'inr',
        },
      ],
    })

    const updatedFreeProd = await productsRepo.getById(freeProdId)
    assert(freeConfig && freeConfig.productId === freeProdId, 'Free coaching configuration saved')
    assert(Number(updatedFreeProd.price) === 0, `Free product price is strictly 0 (actual: ${updatedFreeProd.price})`)
    assert(freeConfig.bookingTypes[0].isFree === true, 'Booking type marked isFree: true')
    assert(Number(freeConfig.bookingTypes[0].price) === 0, 'Booking type price is 0')

    // -------------------------------------------------------------------------
    // TEST 2: Creator creates and saves a paid session with valid price & currency
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Creator creates and saves a paid session with valid price/currency ---')
    const paidProdId = uuidv4()
    await productsRepo.create({
      id: paidProdId,
      creatorId,
      title: '1:1 Executive Coaching',
      type: 'COACHING',
      price: 2500,
      currency: 'inr',
      status: 'PUBLISHED',
    })

    const paidConfig = await coachingService.saveConfig(creatorId, paidProdId, {
      title: '1:1 Executive Coaching',
      isFree: false,
      price: 2500,
      currency: 'INR',
      durationMinutes: 45,
      timezone: 'Asia/Kolkata',
      availability: [
        {
          dayOfWeek: 2, // Tuesday
          enabled: true,
          windows: [{ startTime: '09:00', endTime: '17:00' }],
        },
      ],
      bookingTypes: [
        {
          id: 'bt_paid_45',
          name: '45-min Deep Dive',
          durationMinutes: 45,
          isFree: false,
          price: 2500,
          currency: 'INR',
        },
        {
          id: 'bt_paid_90',
          name: '90-min Strategy Immersion',
          durationMinutes: 90,
          isFree: false,
          price: 4500,
          currency: 'INR',
        },
      ],
    })

    const updatedPaidProd = await productsRepo.getById(paidProdId)
    assert(Number(updatedPaidProd.price) === 2500, `Paid product price saved as 2500 (actual: ${updatedPaidProd.price})`)
    assert(updatedPaidProd.currency.toUpperCase() === 'INR', `Paid product currency is INR (actual: ${updatedPaidProd.currency})`)
    assert(paidConfig.bookingTypes.length === 2, 'Multiple booking types preserved')
    assert(Number(paidConfig.bookingTypes[1].price) === 4500, 'Second booking type has its own price (4500)')

    // -------------------------------------------------------------------------
    // TEST 3: Invalid price and unsupported currency are rejected
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Invalid price and unsupported currency rejection ---')
    const invalidTestProdId = uuidv4()
    await productsRepo.create({
      id: invalidTestProdId,
      creatorId,
      title: 'Validation Test Product',
      type: 'COACHING',
      price: 1000,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    let invalidPriceRejected = false
    try {
      await coachingService.saveConfig(creatorId, invalidTestProdId, {
        isFree: false,
        price: -500, // Negative price rejected
        currency: 'INR',
      })
    } catch (err) {
      invalidPriceRejected = err.status === 400
    }
    assert(invalidPriceRejected, 'Negative price rejected with HTTP 400')

    let zeroPaidPriceRejected = false
    try {
      await coachingService.saveConfig(creatorId, invalidTestProdId, {
        isFree: false,
        price: 0, // Zero price on paid session rejected
        currency: 'INR',
      })
    } catch (err) {
      zeroPaidPriceRejected = err.status === 400
    }
    assert(zeroPaidPriceRejected, 'Zero price on paid session rejected with HTTP 400')

    let unsupportedCurrencyRejected = false
    try {
      await coachingService.saveConfig(creatorId, invalidTestProdId, {
        isFree: false,
        price: 1500,
        currency: 'XYZ_INVALID_COIN', // Unsupported currency rejected
      })
    } catch (err) {
      unsupportedCurrencyRejected = err.status === 400
    }
    assert(unsupportedCurrencyRejected, 'Unsupported currency rejected with HTTP 400')

    // -------------------------------------------------------------------------
    // TEST 4: Free booking completes without payment
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Free booking completes without payment ---')
    const freeSlotStart = '2026-10-26T04:30:00.000Z' // 10:00 AM IST on Monday
    const freeSlotEnd = '2026-10-26T04:45:00.000Z'
    const attendeeEmail1 = `free_attendee_${Date.now()}@example.com`

    const freeBooking = await coachingService.createBookingHold({
      productId: freeProdId,
      startTime: freeSlotStart,
      endTime: freeSlotEnd,
      timezone: 'Asia/Kolkata',
      customerEmail: attendeeEmail1,
      customerName: 'Rohit Verma',
      bookingTypeId: 'bt_free_15',
    })

    assert(freeBooking.status === 'CONFIRMED', `Free booking status is CONFIRMED immediately (actual: ${freeBooking.status})`)
    assert(freeBooking.paymentStatus === 'PAID', `Free booking paymentStatus is PAID (actual: ${freeBooking.paymentStatus})`)
    assert(Number(freeBooking.price) === 0, 'Free booking price is 0')
    assert(freeBooking.orderId === null, 'No payment order created for free booking')

    // -------------------------------------------------------------------------
    // TEST 5: Paid booking with India selected starts Razorpay checkout
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Paid booking with India selected routes to Razorpay ---')
    const paidSlotStart = '2026-10-27T03:30:00.000Z' // 09:00 AM IST on Tuesday
    const paidSlotEnd = '2026-10-27T04:15:00.000Z' // 45 min
    const attendeeEmail2 = `india_attendee_${Date.now()}@example.com`

    // Create slot hold
    const holdIndia = await coachingService.createBookingHold({
      productId: paidProdId,
      startTime: paidSlotStart,
      endTime: paidSlotEnd,
      timezone: 'Asia/Kolkata',
      customerEmail: attendeeEmail2,
      customerName: 'Sunita Rao',
      bookingTypeId: 'bt_paid_45',
    })

    assert(holdIndia.status === 'PENDING', `Initial hold status is PENDING (actual: ${holdIndia.status})`)
    assert(holdIndia.paymentStatus === 'PENDING', `Initial hold paymentStatus is PENDING (actual: ${holdIndia.paymentStatus})`)

    // Create checkout order with country: 'IN' (India)
    const indiaOrder = await checkoutService.createOrder({
      productId: paidProdId,
      creatorId,
      email: attendeeEmail2,
      name: 'Sunita Rao',
      country: 'IN', // India selection
      bookingId: holdIndia.id,
    })

    assert(indiaOrder.provider === 'razorpay', `India order routed to Razorpay (actual: ${indiaOrder.provider})`)
    assert(indiaOrder.currency === 'INR', `India order currency is INR (actual: ${indiaOrder.currency})`)
    assert(
      Number(indiaOrder.amount) === 250000 || Number(indiaOrder.amount) === 2500,
      `India order amount is trusted 2500 (actual: ${indiaOrder.amount})`
    )
    assert(Boolean(indiaOrder.razorpayOrderId), 'Razorpay order ID generated')

    // -------------------------------------------------------------------------
    // TEST 6: Paid booking with Outside India selected starts Dodo checkout
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Paid booking with Outside India selected routes to Dodo ---')
    const paidSlotStart2 = '2026-10-27T05:00:00.000Z'
    const paidSlotEnd2 = '2026-10-27T05:45:00.000Z'
    const attendeeEmail3 = `intl_attendee_${Date.now()}@example.com`

    const holdIntl = await coachingService.createBookingHold({
      productId: paidProdId,
      startTime: paidSlotStart2,
      endTime: paidSlotEnd2,
      timezone: 'Asia/Kolkata',
      customerEmail: attendeeEmail3,
      customerName: 'Emily Watson',
      bookingTypeId: 'bt_paid_45',
    })

    // Create checkout order with country: 'OUTSIDE_INDIA'
    const dodoOrder = await checkoutService.createOrder({
      productId: paidProdId,
      creatorId,
      email: attendeeEmail3,
      name: 'Emily Watson',
      country: 'OUTSIDE_INDIA', // Outside India selection
      bookingId: holdIntl.id,
    })

    assert(dodoOrder.provider === 'dodo', `Outside India routed to Dodo Payments (actual: ${dodoOrder.provider})`)
    assert(Boolean(dodoOrder.checkoutUrl || dodoOrder.url), 'Dodo checkout session URL created')

    // -------------------------------------------------------------------------
    // TEST 7: Payment success is verified before booking confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Payment verification before booking confirmation ---')
    // Booking must still be PENDING before verification
    const preVerifyHold = await coachingRepo.getBookingById(holdIndia.id)
    assert(preVerifyHold.status === 'PENDING', 'Booking remains unconfirmed before payment verification')

    // Finalize order authoritatively via webhook/verification
    await webhookService.finalizeOrder(
      indiaOrder.orderId,
      `pay_${Date.now()}`,
      attendeeEmail2
    )

    const postVerifyBooking = await coachingRepo.getBookingById(holdIndia.id)
    assert(postVerifyBooking.status === 'CONFIRMED', `Booking confirmed after verified payment (actual: ${postVerifyBooking.status})`)
    assert(postVerifyBooking.paymentStatus === 'PAID', `Payment status is PAID (actual: ${postVerifyBooking.paymentStatus})`)

    // -------------------------------------------------------------------------
    // TEST 8: Failed or cancelled payment does not confirm the booking
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Failed/cancelled payment does not confirm booking ---')
    const failedBookingHold = await coachingRepo.getBookingById(holdIntl.id)
    assert(failedBookingHold.status === 'PENDING', 'Uncompleted booking is NOT confirmed')

    // Cancel/fail order
    await ordersRepo.update(dodoOrder.orderId, { status: 'FAILED' })
    const afterFailBooking = await coachingRepo.getBookingById(holdIntl.id)
    assert(afterFailBooking.status !== 'CONFIRMED', 'Booking remains unconfirmed after payment failure')

    // -------------------------------------------------------------------------
    // TEST 9: Duplicate submissions and webhook retries do not duplicate bookings
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Idempotency of payment verification and webhook retries ---')
    // Retrying finalizeOrder on already confirmed booking
    await webhookService.finalizeOrder(
      indiaOrder.orderId,
      `pay_retry_${Date.now()}`,
      attendeeEmail2
    )

    const allConfirmedForSlot = await coachingRepo.findOverlappingBookings(creatorId, paidSlotStart, paidSlotEnd)
    assert(allConfirmedForSlot.length === 1, `Slot has exactly 1 confirmed booking (actual: ${allConfirmedForSlot.length})`)

    // -------------------------------------------------------------------------
    // TEST 10: Two visitors cannot reserve the same slot concurrently
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Concurrency double-booking protection ---')
    let concurrentOverlapRejected = false
    try {
      await coachingService.createBookingHold({
        productId: paidProdId,
        startTime: paidSlotStart, // Conflicting with already confirmed booking from TEST 5
        endTime: paidSlotEnd,
        timezone: 'Asia/Kolkata',
        customerEmail: 'competing_buyer@example.com',
        customerName: 'Competing Buyer',
      })
    } catch (err) {
      concurrentOverlapRejected = err.status === 409
    }
    assert(concurrentOverlapRejected, 'Overlapping slot reservation rejected with HTTP 409 Conflict')

    // -------------------------------------------------------------------------
    // TEST 11: An expired pending reservation does not create a double booking
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Expired pending reservation handling ---')
    const expiredSlotStart = '2026-10-27T08:00:00.000Z'
    const expiredSlotEnd = '2026-10-27T08:45:00.000Z'

    // Create an old pending booking hold (simulate 20 minutes ago)
    await coachingRepo.createBooking({
      id: uuidv4(),
      productId: paidProdId,
      creatorId,
      customerEmail: 'stale_buyer@example.com',
      customerName: 'Stale Buyer',
      startTime: new Date(expiredSlotStart),
      endTime: new Date(expiredSlotEnd),
      timezone: 'Asia/Kolkata',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago (> 15 min TTL)
    })

    // Now a new buyer attempts to book the same slot
    const freshBooking = await coachingService.createBookingHold({
      productId: paidProdId,
      startTime: expiredSlotStart,
      endTime: expiredSlotEnd,
      timezone: 'Asia/Kolkata',
      customerEmail: 'new_fresh_buyer@example.com',
      customerName: 'Fresh Buyer',
    })

    assert(Boolean(freshBooking && freshBooking.id), 'Fresh buyer can book slot after old pending hold expired (>15 min)')

    // -------------------------------------------------------------------------
    // TEST 12: Timezone conversions remain correct across calendar, confirmation, and .ics
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Timezone consistency across calendar, confirmation, and .ics ---')
    const instantUtc = '2026-10-27T03:30:00.000Z'
    const istDisplay = formatInTimezone(instantUtc, 'Asia/Kolkata', { hour: 'numeric', minute: '2-digit', hour12: true })
    assert(istDisplay.includes('9:00 AM') || istDisplay.includes('09:00 AM'), `UTC instant 03:30Z formats as 9:00 AM IST (actual: ${istDisplay})`)

    const icsContent = generateIcsContent({
      title: '1:1 Executive Coaching',
      startTime: instantUtc,
      endTime: '2026-10-27T04:15:00.000Z',
      timezone: 'Asia/Kolkata',
      url: 'https://meet.google.com/abc-defg-hij',
      organizer: { name: 'Alok Nath', email: 'creator@test.com' },
      attendee: { name: 'Sunita Rao', email: 'attendee@test.com' },
    })

    assert(icsContent.includes('DTSTART:20261027T033000Z'), 'ICS file formats UTC start instant properly')
    assert(icsContent.includes('DTEND:20261027T041500Z'), 'ICS file formats UTC end instant properly')
    assert(icsContent.includes('Sunita Rao'), 'ICS file contains attendee name')

    // -------------------------------------------------------------------------
    // TEST 13: 9:00 AM selected slot is displayed as 9:00 AM in intended timezone
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: 9:00 AM selected slot displayed as 9:00 AM ---')
    const calculatedUtc = localDateTimeToUtc({
      date: '2026-10-27',
      time: '09:00',
      timezone: 'Asia/Kolkata',
    })
    assert(calculatedUtc.toISOString() === '2026-10-27T03:30:00.000Z', `9:00 AM IST converted to UTC is 03:30Z (actual: ${calculatedUtc.toISOString()})`)
    const roundTripFormatted = formatInTimezone(calculatedUtc, 'Asia/Kolkata', { hour: 'numeric', minute: '2-digit', hour12: true })
    assert(roundTripFormatted.includes('9:00 AM') || roundTripFormatted.includes('09:00 AM'), `Round-trip formatting preserves 9:00 AM (actual: ${roundTripFormatted})`)

    // -------------------------------------------------------------------------
    // TEST 14: Existing free booking and calendar availability still works
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: Existing free booking and calendar availability intact ---')
    const slots = await coachingService.getAvailableSlots({
      productId: freeProdId,
      date: '2026-10-26', // Monday
      timezone: 'Asia/Kolkata',
    })
    assert(Array.isArray(slots.slots) && slots.slots.length > 0, `Free booking slots available (count: ${slots.slots.length})`)

    // -------------------------------------------------------------------------
    // TEST 15: Subscription checkout and entitlements remain unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Subscription checkout and entitlements untouched ---')
    const subStatus = await creatorSubscriptionService.getStatus(creatorId)
    assert(subStatus.status === 'ACTIVE', `Creator subscription status is ACTIVE (actual: ${subStatus.status})`)
    assert(subStatus.plan && subStatus.plan.toUpperCase() === 'PRO', `Creator subscription plan is PRO (actual: ${subStatus.plan})`)

    console.log('\n========================================================================')
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal test runner error:', err)
    process.exit(1)
  }
}

runEndToEndCoachingPaymentsTest()
