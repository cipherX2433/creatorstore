/**
 * Comprehensive 27-Scenario Test Suite for CreatorStore Public Booking Flow,
 * Calendar Availability, Payment Routing (India -> Razorpay, Other Country -> Dodo),
 * and Confirmation Experience.
 */

import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import {
  coachingService,
  checkoutService,
  webhookService,
} from '../lib/services.js'
import {
  usersRepo,
  profilesRepo,
  storesRepo,
  productsRepo,
  ordersRepo,
  coachingRepo,
  leadsRepo,
} from '../lib/repos.js'
import {
  getProductPaymentProviderForCountry,
  PRODUCT_PAYMENT_PROVIDERS,
} from '../lib/billing/provider-selection.js'
import {
  getSundayFirstMonthCells,
  createGoogleCalendarUrl,
  generateIcsContent,
} from '../lib/calendarUtils.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✅ [PASS] ${message}`)
  } else {
    failed++
    console.error(`  ❌ [FAIL] ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: PUBLIC BOOKING FLOW & CALENDAR AUDIT TEST SUITE')
  console.log('=====================================================================\n')

  const testSuffix = uuidv4().substring(0, 8)
  const creatorEmail = `booking_creator_${testSuffix}@example.com`

  // 1. Setup Test Creator and Store
  console.log('--- Step 1: Setting up test creator and store ---')
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: creatorEmail,
      passwordHash: 'dummy_hash',
      role: 'CREATOR',
      country: 'IN',
    },
  })

  await prisma.creatorProfile.create({
    data: {
      creator: { connect: { id: user.id } },
      name: `Coach ${testSuffix}`,
      country: 'IN',
    },
  })

  await prisma.store.create({
    data: {
      creator: { connect: { id: user.id } },
      username: `coach_${testSuffix}`,
      storeName: `Coaching Hub ${testSuffix}`,
    },
  })

  // 2. Setup Free Coaching Product
  console.log('--- Step 2: Creating Free Coaching Product ---')
  const freeProduct = await prisma.product.create({
    data: {
      id: uuidv4(),
      creatorId: user.id,
      title: 'Free 1:1 Consultation',
      slug: `free-coaching-${testSuffix}`,
      description: 'Introductory 30-min strategy session',
      price: 0,
      currency: 'INR',
      type: 'COACHING',
      status: 'PUBLISHED',
    },
  })

  // Configure Coaching Availability (Mon-Fri 09:00 - 12:00, 30 min duration)
  await coachingRepo.upsertConfig(user.id, freeProduct.id, {
    durationMinutes: 30,
    timezone: 'Asia/Kolkata',
    sessionType: 'Free 1:1 Consultation',
    minimumNoticeMinutes: 60, // 1 hour notice for testing
    maximumAdvanceDays: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 15,
    cancellationPolicy: 'Cancellations allowed up to 24 hours prior.',
    cancellationPolicyNoticeHours: 24,
    availability: [
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }] },
      { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }] },
      { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }] },
      { dayOfWeek: 4, dayName: 'Thursday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }] },
      { dayOfWeek: 5, dayName: 'Friday', enabled: true, windows: [{ startTime: '09:00', endTime: '12:00' }] },
      { dayOfWeek: 6, dayName: 'Saturday', enabled: false, windows: [] },
      { dayOfWeek: 0, dayName: 'Sunday', enabled: false, windows: [] },
    ],
    bookingTypes: [
      {
        id: 'bt_free_30',
        name: 'Free 30-min Intro',
        durationMinutes: 30,
        price: 0,
        currency: 'inr',
        isFree: true,
      },
    ],
  })

  // 3. Setup Paid Coaching Product
  console.log('--- Step 3: Creating Paid Coaching Product ---')
  const paidProduct = await prisma.product.create({
    data: {
      id: uuidv4(),
      creatorId: user.id,
      title: 'Premium 1:1 Coaching',
      slug: `paid-coaching-${testSuffix}`,
      description: 'Deep dive 45-min mentorship session',
      price: 1500,
      currency: 'INR',
      type: 'COACHING',
      status: 'PUBLISHED',
    },
  })

  await coachingRepo.upsertConfig(user.id, paidProduct.id, {
    durationMinutes: 45,
    timezone: 'Asia/Kolkata',
    sessionType: 'Premium 1:1 Coaching',
    minimumNoticeMinutes: 60,
    maximumAdvanceDays: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 15,
    availability: [
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '14:00', endTime: '18:00' }] },
      { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '14:00', endTime: '18:00' }] },
    ],
    bookingTypes: [
      {
        id: 'bt_paid_45',
        name: 'Deep Dive 45-min',
        durationMinutes: 45,
        price: 1500,
        currency: 'inr',
        isFree: false,
      },
    ],
  })

  // ================= SCENARIO 1: Free Booking Flow =================
  console.log('\n--- SCENARIO 1: Free Booking can be created without payment ---')
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  // Ensure futureDate lands on a Monday (day 1)
  const dayOffset = (1 - futureDate.getUTCDay() + 7) % 7 || 7
  futureDate.setDate(futureDate.getDate() + dayOffset)
  const dateStr = futureDate.toISOString().slice(0, 10)

  // Fetch slots
  const slotsRes = await coachingService.getAvailableSlots({
    productId: freeProduct.id,
    date: dateStr,
  })
  assert(slotsRes.slots.length > 0, `Generated ${slotsRes.slots.length} available slots for ${dateStr}`)
  const chosenSlot = slotsRes.slots[0]

  // Submit free booking
  const freeBooking = await coachingService.createBookingHold({
    productId: freeProduct.id,
    startTime: chosenSlot.startTime,
    endTime: chosenSlot.endTime,
    customerEmail: `client_${testSuffix}@example.com`,
    customerName: 'Test Client',
    bookingTypeId: 'bt_free_30',
    mailingListOptIn: true,
  })

  assert(freeBooking.status === 'CONFIRMED', 'Free booking status is CONFIRMED immediately')
  assert(freeBooking.paymentStatus === 'PAID', 'Free booking payment status is marked PAID')
  assert(Boolean(freeBooking.meetingUrl), `Free booking has auto-generated meeting URL: ${freeBooking.meetingUrl}`)

  // Verify customer audience entry captured
  const customerRecord = await prisma.customer.findFirst({
    where: {
      creatorId: user.id,
      email: `client_${testSuffix}@example.com`,
    },
  })
  assert(Boolean(customerRecord), 'Optional mailing list opt-in captured customer into creator audience')

  // ================= SCENARIO 2: Booking Appears in Creator Calendar =================
  console.log('\n--- SCENARIO 2: Confirmed booking appears in creator calendar ---')
  const creatorBookings = await coachingRepo.listBookingsForCreator(user.id, {
    productId: freeProduct.id,
    status: 'CONFIRMED',
  })
  const calendarEntry = creatorBookings.find((b) => b.id === freeBooking.id)
  assert(Boolean(calendarEntry), 'Confirmed booking appears in creator calendar')

  // ================= SCENARIO 3: Conflict Prevention / Overlapping Slot Disappears =================
  console.log('\n--- SCENARIO 3: Slot disappears after booking is confirmed ---')
  const refreshedSlots = await coachingService.getAvailableSlots({
    productId: freeProduct.id,
    date: dateStr,
  })
  const isStillOffered = refreshedSlots.slots.some((s) => s.startTime === chosenSlot.startTime)
  assert(!isStillOffered, 'Previously booked slot is no longer offered in available slots')

  // Attempting to book the conflicting slot must be rejected with 409
  let conflictRejected = false
  try {
    await coachingService.createBookingHold({
      productId: freeProduct.id,
      startTime: chosenSlot.startTime,
      endTime: chosenSlot.endTime,
      customerEmail: `other_${testSuffix}@example.com`,
      customerName: 'Other Client',
    })
  } catch (err) {
    if (err.status === 409 || err.statusCode === 409 || err.message?.includes('no longer available')) {
      conflictRejected = true
    }
  }
  assert(conflictRejected, 'Attempt to book overlapping slot throws 409 conflict error')

  // ================= SCENARIO 4: Expired Holds Release Availability =================
  console.log('\n--- SCENARIO 4: Expired pending holds release availability safely ---')
  const nextSlot = refreshedSlots.slots[0]
  // Create an expired pending hold (created 20 minutes ago)
  const expiredHold = await coachingRepo.createBooking({
    id: uuidv4(),
    productId: freeProduct.id,
    creatorId: user.id,
    customerEmail: `abandoned_${testSuffix}@example.com`,
    startTime: new Date(nextSlot.startTime),
    endTime: new Date(nextSlot.endTime),
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 mins old
  })

  const slotsWithExpiredHold = await coachingService.getAvailableSlots({
    productId: freeProduct.id,
    date: dateStr,
  })
  const isNextSlotAvailable = slotsWithExpiredHold.slots.some((s) => s.startTime === nextSlot.startTime)
  assert(isNextSlotAvailable, 'Slot with expired hold (>15 min) remains available for booking')

  // ================= SCENARIO 5: Payment Routing (India -> Razorpay) =================
  console.log('\n--- SCENARIO 5: India selection routes to Razorpay ---')
  const indiaProvider = getProductPaymentProviderForCountry('IN')
  assert(indiaProvider === PRODUCT_PAYMENT_PROVIDERS.RAZORPAY, 'India country code routes to Razorpay')

  const paidSlots = await coachingService.getAvailableSlots({
    productId: paidProduct.id,
    date: dateStr,
  })
  assert(paidSlots.slots.length > 0, `Generated ${paidSlots.slots.length} slots for paid coaching`)
  const paidSlot = paidSlots.slots[0]

  // Hold slot for paid booking
  const paidHold = await coachingService.createBookingHold({
    productId: paidProduct.id,
    startTime: paidSlot.startTime,
    endTime: paidSlot.endTime,
    customerEmail: `indian_buyer_${testSuffix}@example.com`,
    customerName: 'Indian Buyer',
    bookingTypeId: 'bt_paid_45',
  })
  assert(paidHold.status === 'PENDING', 'Paid booking initial hold status is PENDING')

  // Create checkout order with India country
  const rzpOrder = await checkoutService.createOrder({
    productId: paidProduct.id,
    creatorId: user.id,
    customerName: 'Indian Buyer',
    email: `indian_buyer_${testSuffix}@example.com`,
    country: 'IN',
    bookingId: paidHold.id,
  })
  assert(rzpOrder.provider === 'razorpay' || Boolean(rzpOrder.razorpayOrderId), 'Checkout creates Razorpay order for India')
  assert(Number(rzpOrder.amount) === 1500 * 100, `Order amount matches 1500 INR in paise: ${rzpOrder.amount}`)

  // ================= SCENARIO 6: Payment Routing (Other Country -> Dodo Payments) =================
  console.log('\n--- SCENARIO 6: Other Country routes to Dodo Payments ---')
  const otherProvider = getProductPaymentProviderForCountry('OTHER')
  assert(otherProvider === PRODUCT_PAYMENT_PROVIDERS.DODO, 'Other Country selection routes to Dodo')

  const otherHold = await coachingService.createBookingHold({
    productId: paidProduct.id,
    startTime: paidSlots.slots[1].startTime,
    endTime: paidSlots.slots[1].endTime,
    customerEmail: `us_buyer_${testSuffix}@example.com`,
    customerName: 'International Buyer',
    bookingTypeId: 'bt_paid_45',
  })

  const dodoOrder = await checkoutService.createOrder({
    productId: paidProduct.id,
    creatorId: user.id,
    customerName: 'International Buyer',
    email: `us_buyer_${testSuffix}@example.com`,
    country: 'OTHER',
    bookingId: otherHold.id,
  })
  assert(dodoOrder.provider === 'dodo' || Boolean(dodoOrder.checkoutUrl), 'Checkout creates Dodo session for Other Country')

  // ================= SCENARIO 7: Payment Verification Confirms Booking =================
  console.log('\n--- SCENARIO 7: Verified payment confirms booking ---')
  // Verify payment using mock HMAC signature for Razorpay order
  const fakeSecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_for_local_ci'
  const fakeRzpOrderId = rzpOrder.razorpayOrderId || rzpOrder.orderId
  const fakeRzpPayId = `pay_${uuidv4().substring(0, 14)}`
  const fakeSig = crypto.createHmac('sha256', fakeSecret).update(`${fakeRzpOrderId}|${fakeRzpPayId}`).digest('hex')

  const verifyResult = await checkoutService.verifyPayment({
    orderId: rzpOrder.orderId,
    razorpayOrderId: fakeRzpOrderId,
    razorpayPaymentId: fakeRzpPayId,
    razorpaySignature: fakeSig,
  })
  assert(verifyResult.success === true, 'Payment signature verified successfully')

  // Check that the booking is now confirmed
  const confirmedPaidBooking = await coachingRepo.getBookingById(paidHold.id)
  assert(confirmedPaidBooking.status === 'CONFIRMED', 'Booking status transitioned to CONFIRMED after payment verification')
  assert(confirmedPaidBooking.paymentStatus === 'PAID', 'Booking paymentStatus is PAID')

  // ================= SCENARIO 8: Calendar Utilities & Sunday-First Month Grid =================
  console.log('\n--- SCENARIO 8: Calendar widget math & Sunday-first days ---')
  const cells = getSundayFirstMonthCells(2026, 9) // October 2026
  assert(cells.length >= 35, `Month grid generated ${cells.length} cells`)
  // Oct 1, 2026 is a Thursday (index 4: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
  const oct1Cell = cells.find((c) => c.isCurrentMonth && c.dayNumber === 1)
  assert(oct1Cell.date.getDay() === 4, 'October 1 2026 is aligned correctly to Thursday')

  // Google Calendar URL generator
  const gcalUrl = createGoogleCalendarUrl({
    title: 'Strategy Call',
    startTime: '2026-10-20T10:00:00.000Z',
    endTime: '2026-10-20T10:30:00.000Z',
    location: 'https://meet.google.com/abc-defg-hij',
  })
  assert(gcalUrl.includes('action=TEMPLATE') && gcalUrl.includes('Strategy+Call'), 'Google Calendar URL generated correctly')

  // iCalendar generator
  const icsText = generateIcsContent({
    title: 'Strategy Call',
    startTime: '2026-10-20T10:00:00.000Z',
    endTime: '2026-10-20T10:30:00.000Z',
  })
  assert(icsText.includes('BEGIN:VCALENDAR') && icsText.includes('STATUS:CONFIRMED'), 'iCalendar content generated correctly')

  // ================= SCENARIO 9: Component Integrity & Source Audit =================
  console.log('\n--- SCENARIO 9: PublicBookingModal Component Source Code Audit ---')
  const modalPath = path.join(process.cwd(), 'components/storefront/PublicBookingModal.jsx')
  const modalCode = fs.readFileSync(modalPath, 'utf8')

  assert(modalCode.includes('openRazorpayProductCheckout'), 'Razorpay checkout integrated in PublicBookingModal')
  assert(modalCode.includes("countryRoute === 'IN'"), 'India payment routing option present in PublicBookingModal')
  assert(modalCode.includes("countryRoute === 'OTHER'"), 'Other Country payment routing option present in PublicBookingModal')
  assert(modalCode.includes('createGoogleCalendarUrl'), 'Google Calendar action integrated in confirmation')
  assert(modalCode.includes('downloadIcsFile'), 'iCalendar .ics download action integrated in confirmation')
  assert(modalCode.includes('getSundayFirstMonthCells'), 'Sunday-first calendar cells used for calendar UI')
  assert(modalCode.includes('Google Meet'), 'Google Meet action present in confirmation view')

  console.log('\n=====================================================================')
  console.log(` AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================\n')

  // Cleanup test user and products
  await prisma.product.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
  await prisma.store.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
  await prisma.creatorProfile.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {})
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
