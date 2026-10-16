// Comprehensive Email System Test Suite for Resend HTTPS API
import dotenv from 'dotenv'
dotenv.config()

import * as templates from '../lib/emailTemplates.js'
import { getEmailService, emailService, EMAIL_TYPES, ResendEmailService } from '../lib/email.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('====================================================')
  console.log('CREATORSTORE — RESEND HTTPS EMAIL SYSTEM TEST SUITE')
  console.log('====================================================\n')

  // 1. Template Generation Tests
  console.log('--- Phase 1: Template Validation ---')

  // Auth Templates
  const verTmpl = templates.verificationEmailTemplate({ name: 'Alex Creator', otp: '849201' })
  assert(verTmpl.subject.includes('verification code') || verTmpl.subject.includes('Verify'), 'Verification subject contains verification code')
  assert(verTmpl.html.includes('CreatorStore'), 'Verification HTML has CreatorStore branding')
  assert(verTmpl.html.includes('849201'), 'Verification HTML has OTP code')
  assert(!verTmpl.html.toLowerCase().includes('razorpay'), 'No Razorpay branding in verification email')
  assert(!verTmpl.html.includes('verify-email?token='), 'No verification links in OTP email')

  const resetTmpl = templates.passwordResetEmailTemplate({ name: 'Alex', resetUrl: 'https://creatorstore.store/reset-password?token=abc' })
  assert(resetTmpl.subject.includes('Reset'), 'Reset subject contains Reset')
  assert(resetTmpl.html.includes('https://creatorstore.store/reset-password?token=abc'), 'Reset HTML has reset link')

  const pwdChangedTmpl = templates.passwordChangedEmailTemplate({ name: 'Alex' })
  assert(pwdChangedTmpl.subject.includes('password has been changed'), 'Password changed subject is clear')

  // Purchase & Delivery Templates
  const purchaseTmpl = templates.purchaseConfirmationEmailTemplate({
    customerName: 'Sam Customer',
    creatorName: 'Chef John',
    productTitle: 'Pasta Masterclass',
    amount: 1499,
    currency: 'INR',
    orderId: 'ord_12345678',
    accessUrl: 'https://creatorstore.store/orders/ord_12345678',
  })
  assert(purchaseTmpl.subject.includes('Order Confirmed'), 'Purchase confirmation subject is formatted')
  assert(purchaseTmpl.html.includes('Pasta Masterclass'), 'Purchase HTML contains product title')
  assert(purchaseTmpl.html.includes('Chef John'), 'Purchase HTML contains creator name')
  assert(purchaseTmpl.html.includes('ord_12345678'), 'Purchase HTML contains order ID')
  assert(!purchaseTmpl.html.toLowerCase().includes('custom domain'), 'No custom domain messaging')

  const digitalTmpl = templates.digitalDeliveryEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: 'Recipe E-Book',
    downloadUrl: 'https://creatorstore.store/api/download?token=secure_download_token',
  })
  assert(digitalTmpl.subject.includes('download is ready'), 'Digital delivery subject is correct')
  assert(digitalTmpl.html.includes('https://creatorstore.store/api/download?token=secure_download_token'), 'Digital delivery has secure URL')

  const courseTmpl = templates.courseEnrollmentEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    courseTitle: 'Culinary Fundamentals',
    accessUrl: 'https://creatorstore.store/learn/course_1',
  })
  assert(courseTmpl.subject.includes('Course Enrollment'), 'Course enrollment subject is clear')
  assert(courseTmpl.html.includes('Culinary Fundamentals'), 'Course enrollment has course title')

  // Booking Templates
  const bookTmpl = templates.bookingConfirmationEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: '1:1 Cooking Mentorship',
    sessionTime: 'Fri, 20 Sep 2026 14:00:00 GMT',
    meetingUrl: 'https://meet.google.com/abc-def-ghi',
  })
  assert(bookTmpl.subject.includes('Booking Confirmed'), 'Booking confirmation subject')
  assert(bookTmpl.html.includes('https://meet.google.com/abc-def-ghi'), 'Booking has meeting URL')

  const cancelBookTmpl = templates.bookingCancellationEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: '1:1 Mentorship',
    sessionTime: 'Fri, 20 Sep 2026 14:00:00 GMT',
    reason: 'Emergency reschedule needed',
  })
  assert(cancelBookTmpl.subject.includes('Cancelled'), 'Booking cancellation subject')
  assert(cancelBookTmpl.html.includes('Emergency reschedule needed'), 'Booking cancellation contains reason')

  const reschedBookTmpl = templates.bookingRescheduledEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: '1:1 Mentorship',
    newSessionTime: 'Sat, 21 Sep 2026 15:00:00 GMT',
    meetingUrl: 'https://meet.google.com/abc-def-ghi',
  })
  assert(reschedBookTmpl.subject.includes('Rescheduled'), 'Booking reschedule subject')
  assert(reschedBookTmpl.html.includes('Sat, 21 Sep 2026'), 'Booking reschedule has new time')

  // Webinar Templates
  const webConfTmpl = templates.webinarConfirmationEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: 'Live Sourdough Masterclass',
    webinarTime: 'Sun, 22 Sep 2026 18:00:00 GMT',
    meetingUrl: 'https://creatorstore.store/webinar/live',
  })
  assert(webConfTmpl.subject.includes('Registered'), 'Webinar confirmation subject')

  // Membership & Community Templates
  const memActTmpl = templates.membershipActivatedEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: 'Culinary VIP Club',
    priceDisplay: '₹499',
    billingInterval: 'month',
  })
  assert(memActTmpl.subject.includes('Welcome to Culinary VIP Club'), 'Membership activated subject')

  const memCancelTmpl = templates.membershipCancelledEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    productTitle: 'Culinary VIP Club',
    currentPeriodEnd: '30 Sep 2026',
  })
  assert(memCancelTmpl.subject.includes('Membership Cancelled'), 'Membership cancelled subject')

  const commAccessTmpl = templates.communityAccessEmailTemplate({
    customerName: 'Sam',
    creatorName: 'Chef John',
    communityTitle: 'Chef John Insider Community',
    accessUrl: 'https://creatorstore.store/community/comm_123',
  })
  assert(commAccessTmpl.subject.includes('Access Granted'), 'Community access subject')

  // Creator Notification Templates
  const creatorOrderTmpl = templates.newOrderCreatorEmailTemplate({
    creatorName: 'Chef John',
    customerName: 'Sam Customer',
    customerEmail: 'sam@customer.com',
    productTitle: 'Pasta Masterclass',
    amount: 1499,
    currency: 'INR',
    orderId: 'ord_12345678',
  })
  assert(creatorOrderTmpl.subject.includes('New Sale'), 'Creator new order notification subject')
  assert(creatorOrderTmpl.html.includes('sam@customer.com'), 'Creator notification includes customer email')

  const creatorLeadTmpl = templates.newLeadCreatorEmailTemplate({
    creatorName: 'Chef John',
    leadName: 'Jane Prospect',
    leadEmail: 'jane@prospect.com',
    leadPhone: '+91 9999988888',
    formName: 'Homepage Newsletter',
    submittedAt: '17 Sep 2026, 20:00',
    dashboardUrl: 'https://creatorstore.store/dashboard/leads',
  })
  assert(creatorLeadTmpl.subject.includes('New Lead Captured'), 'Creator lead notification subject')
  assert(creatorLeadTmpl.html.includes('jane@prospect.com'), 'Creator lead notification has lead email')

  const payoutStatusTmpl = templates.payoutStatusEmailTemplate({
    creatorName: 'Chef John',
    status: 'PROCESSED',
    amount: 12500,
    currency: 'INR',
    payoutId: 'trf_987654',
    note: 'Weekly automated creator payout',
  })
  assert(payoutStatusTmpl.subject.includes('Payout Update'), 'Payout status subject')
  assert(payoutStatusTmpl.html.includes('PROCESSED'), 'Payout status content')

  const subStatusTmpl = templates.subscriptionStatusEmailTemplate({
    creatorName: 'Chef John',
    planName: 'Pro',
    status: 'ACTIVE',
    priceDisplay: '₹999/month',
    currentPeriodEnd: '17 Oct 2026',
  })
  assert(subStatusTmpl.subject.includes('CreatorStore Plan'), 'Creator subscription status subject')

  const failTmpl = templates.paymentFailureEmailTemplate({
    customerName: 'Sam',
    productTitle: 'Masterclass',
    reason: 'Insufficient funds or card decline',
    retryUrl: 'https://creatorstore.store/checkout/masterclass',
  })
  assert(failTmpl.subject.includes('Payment Failed'), 'Payment failure subject')

  // Custom Service Templates
  const customReqTmpl = templates.customServiceRequestEmailTemplate({
    productTitle: 'Custom Beat Production',
    creatorName: 'Audio Lab',
    dueAt: '25 Sep 2026',
  })
  assert(customReqTmpl.subject.includes('Service Request Received'), 'Custom service request subject')

  const customDeliveredTmpl = templates.customServiceDeliveredEmailTemplate({
    productTitle: 'Custom Beat Production',
    creatorName: 'Audio Lab',
  })
  assert(customDeliveredTmpl.subject.includes('Delivery Ready'), 'Custom service delivered subject')

  // Marketing Broadcast Template
  const broadcastTmpl = templates.marketingBroadcastEmailTemplate({
    creatorName: 'Chef John',
    subject: 'Special Weekend Announcement',
    content: 'We are launching our new seasonal culinary workshop!',
  })
  assert(broadcastTmpl.subject.includes('Special Weekend Announcement'), 'Marketing broadcast subject')
  assert(broadcastTmpl.html.includes('Chef John'), 'Marketing broadcast creator name')
  assert(broadcastTmpl.html.includes('seasonal culinary workshop'), 'Marketing broadcast content')

  // 2. Security & Credentials Check
  console.log('\n--- Phase 2: Security & Isolation Check ---')
  const emailSvc = getEmailService()
  assert(!process.env.NEXT_PUBLIC_RESEND_API_KEY, 'RESEND_API_KEY is not exposed to NEXT_PUBLIC_*')
  assert(!process.env.NEXT_PUBLIC_EMAIL_PASSWORD, 'EMAIL_PASSWORD is not exposed to NEXT_PUBLIC_*')
  assert(!process.env.NEXT_PUBLIC_EMAIL_USER, 'EMAIL_USER is not exposed to NEXT_PUBLIC_*')
  assert(emailSvc.from.includes('noreply@creatorstore.store'), 'Sender identity contains noreply@creatorstore.store')
  assert(!emailSvc.from.includes('gmail.com'), 'Sender identity does not contain gmail.com')
  assert(!emailSvc.from.includes('resend.dev'), 'Sender identity does not contain resend.dev')
  assert(!emailSvc.from.includes('onboarding@resend.dev'), 'Sender identity is not onboarding@resend.dev')

  // Email Types Enum Check
  assert(EMAIL_TYPES.VERIFICATION_OTP === 'VERIFICATION_OTP', 'EMAIL_TYPES.VERIFICATION_OTP exists')
  assert(EMAIL_TYPES.PURCHASE_CONFIRMATION === 'PURCHASE_CONFIRMATION', 'EMAIL_TYPES.PURCHASE_CONFIRMATION exists')
  assert(EMAIL_TYPES.PASSWORD_RESET === 'PASSWORD_RESET', 'EMAIL_TYPES.PASSWORD_RESET exists')

  // 3. Failure Isolation Check
  console.log('\n--- Phase 3: Failure Isolation Check ---')
  const badSend = await emailSvc.sendMail({ to: 'not_an_email', subject: 'Test' })
  assert(badSend.delivered === false, 'Invalid recipient safely returns delivered: false without throwing exception')
  assert(badSend.reason === 'invalid_recipient', 'Reason correctly identifies invalid_recipient')

  // Test unconfigured / mock service behavior
  const dummySvc = new ResendEmailService()
  dummySvc.apiKey = ''
  assert(dummySvc.isConfigured() === false, 'Empty API key reports isConfigured() === false')
  const unconfiguredSend = await dummySvc.sendMail({ to: 'user@example.com', subject: 'Test' })
  assert(unconfiguredSend.delivered === false, 'Unconfigured send safely returns delivered: false')
  assert(unconfiguredSend.reason === 'not_configured', 'Unconfigured send returns not_configured reason')

  console.log('\n====================================================')
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err)
  process.exit(1)
})
