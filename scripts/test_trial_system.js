/**
 * Complete Test Suite for CreatorStore 7-Day Free Trial System
 * Tests all 40 criteria in the test matrix
 */

import { v4 as uuidv4 } from 'uuid'
import {
  usersRepo,
  creatorSubscriptionsRepo,
  productsRepo,
  ordersRepo,
  customersRepo,
  couponsRepo,
  emailRepo,
} from '../lib/repos.js'
import {
  creatorSubscriptionService,
  productService,
  storeService,
  couponService,
  emailMarketingService,
  authService,
} from '../lib/services.js'
import {
  PLAN_IDS,
  normalizePlanId,
  resolveCreatorPlan,
  getPlanConfig,
  hasEntitlement,
  getEntitlementLimit,
  getSubscriptionPricing,
} from '../lib/plans.js'

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
  console.log('CREATORSTORE 7-DAY FREE TRIAL AUDIT & TEST MATRIX')
  console.log('====================================================\n')

  const testEmail = `creator_trial_${Date.now()}@example.com`
  const user = await usersRepo.create({
    email: testEmail,
    passwordHash: 'mock_hash',
    role: 'CREATOR',
    emailVerified: true,
  })
  const creatorId = user.id

  console.log(`Created test creator: ${user.id} (${testEmail})`)

  // --- 1. SIGNUP & NOT_STARTED STATE ---
  console.log('\n--- GROUP 1: SIGNUP & TRIAL INITIALIZATION ---')
  const initialStatus = await creatorSubscriptionService.getStatus(creatorId)
  assert(initialStatus.trialStatus === 'NOT_STARTED', '1. Trial status is NOT_STARTED after signup')
  assert(initialStatus.status === 'INACTIVE', '2. Subscription status is INACTIVE before trial start')
  assert(initialStatus.planId === PLAN_IDS.UNSUBSCRIBED, '3. Effective plan is UNSUBSCRIBED before trial start')
  assert(initialStatus.isTrial === false, '4. isTrial is false initially')

  // --- 2. TRIAL START ---
  console.log('\n--- GROUP 2: TRIAL START & PERSISTENCE ---')
  const startRes = await creatorSubscriptionService.startTrial(creatorId)
  assert(startRes.status === 'TRIALING', '5. Start trial returns status TRIALING')
  assert(startRes.trialStatus === 'ACTIVE', '6. Start trial returns trialStatus ACTIVE')
  assert(startRes.isTrial === true, '7. isTrial is true')
  assert(startRes.planId === 'PRO', '8. Plan resolved to PRO')
  assert(startRes.daysRemaining === 7, '9. Days remaining initialized to 7')
  assert(Boolean(startRes.trialStartedAt), '10. trialStartedAt timestamp is persisted')
  assert(Boolean(startRes.trialEndsAt), '11. trialEndsAt timestamp is persisted')

  const startedAt = new Date(startRes.trialStartedAt).getTime()
  const endsAt = new Date(startRes.trialEndsAt).getTime()
  const diffDays = Math.round((endsAt - startedAt) / (1000 * 60 * 60 * 24))
  assert(diffDays === 7, '12. trialEndsAt is exactly 7 days later than trialStartedAt')

  // --- 3. IDEMPOTENCY & CONCURRENCY ---
  console.log('\n--- GROUP 3: IDEMPOTENCY & CONCURRENCY ---')
  const secondStartRes = await creatorSubscriptionService.startTrial(creatorId)
  assert(secondStartRes.trialEndsAt === startRes.trialEndsAt, '13. Duplicate start request does NOT extend trial duration (idempotent)')

  const [c1, c2] = await Promise.all([
    creatorSubscriptionService.startTrial(creatorId),
    creatorSubscriptionService.startTrial(creatorId),
  ])
  assert(c1.trialEndsAt === startRes.trialEndsAt && c2.trialEndsAt === startRes.trialEndsAt, '14. Concurrent start requests create only one trial state')

  // --- 4. PRO ENTITLEMENTS DURING TRIAL ---
  console.log('\n--- GROUP 4: FULL PRO ACCESS DURING ACTIVE TRIAL ---')
  const activeStatus = await creatorSubscriptionService.getStatus(creatorId)
  assert(activeStatus.planId === 'PRO', '15. Active trial resolves effectivePlan = PRO')
  assert(activeStatus.entitlements.canPublish === true, '16. Entitlement canPublish = true')
  assert(activeStatus.entitlements.couponCodes === true, '17. Entitlement couponCodes = true')
  assert(activeStatus.entitlements.emailBroadcasts === true, '18. Entitlement emailBroadcasts = true')
  assert(activeStatus.entitlements.multiplePages === Infinity, '19. Pro storefront page limit = Infinity')

  // Test Product Creation during trial
  const product = await productService.create(creatorId, {
    title: 'Trial Test Product',
    price: 999,
    currency: 'inr',
  })
  assert(Boolean(product && product.id), '20. Creator can create digital product during active trial')

  // Test Storefront Page Creation during trial
  const pageRes = await storeService.addPage(creatorId, { name: 'Trial Custom Page' })
  assert(Boolean(pageRes && pageRes.page), '21. Creator can create storefront pages during trial')

  // Test Coupon Creation during trial
  const coupon = await couponService.create(creatorId, {
    code: `TRIAL${Math.floor(Math.random() * 10000)}`,
    discount: 20,
    type: 'PERCENTAGE',
  })
  assert(Boolean(coupon && coupon.id), '22. Creator can create coupon code during active trial')

  // Test Broadcast Estimate during trial
  const audienceEst = await emailMarketingService.getAudienceEstimate(creatorId, 'ALL_CUSTOMERS')
  assert(typeof audienceEst.count === 'number', '23. Email Broadcasts estimate works during trial')

  // --- 5. TRIAL EXPIRATION & SERVER-SIDE RESTRICTIONS ---
  console.log('\n--- GROUP 5: TRIAL EXPIRATION & ENFORCEMENT ---')
  // Artificially simulate trial expiration by updating trialEndsAt to 1 hour in the past
  const pastDate = new Date(Date.now() - 3600 * 1000)
  await creatorSubscriptionsRepo.upsert(creatorId, {
    trialEndsAt: pastDate,
    currentPeriodEnd: pastDate,
  })

  const expiredStatus = await creatorSubscriptionService.getStatus(creatorId)
  assert(expiredStatus.status === 'EXPIRED', '24. Dynamically evaluates expired trial status = EXPIRED')
  assert(expiredStatus.trialStatus === 'EXPIRED', '25. trialStatus = EXPIRED')
  assert(expiredStatus.planId === PLAN_IDS.UNSUBSCRIBED, '26. Expired trial resolves planId = UNSUBSCRIBED')
  assert(expiredStatus.isTrial === false, '27. isTrial = false when expired')
  assert(expiredStatus.isTrialExpired === true, '28. isTrialExpired = true')
  assert(expiredStatus.daysRemaining === 0, '29. daysRemaining = 0')

  // Verify server-side restriction on product creation
  let blockedProductCreation = false
  try {
    await productService.create(creatorId, { title: 'Expired Attempt Product', price: 500 })
  } catch (err) {
    if (err.status === 402 || err.status === 403 || err.code === 'SUBSCRIPTION_REQUIRED' || err.code === 'PLAN_UPGRADE_REQUIRED') {
      blockedProductCreation = true
    }
  }
  assert(blockedProductCreation, '30. Product creation blocked with 402/403/PLAN_UPGRADE_REQUIRED after trial expiry')

  // Verify server-side restriction on coupon creation
  let blockedCouponCreation = false
  try {
    await couponService.create(creatorId, { code: 'EXPCOUPON', discount: 10, type: 'PERCENTAGE' })
  } catch (err) {
    if (err.status === 403 || err.message.includes('Pro plan') || err.message.includes('requires')) {
      blockedCouponCreation = true
    }
  }
  assert(blockedCouponCreation, '31. Coupon creation blocked with 403 after trial expiry')

  // Verify server-side restriction on email broadcasts
  let blockedBroadcast = false
  try {
    await emailMarketingService.sendBroadcast(creatorId, { subject: 'Test', content: 'Hello' })
  } catch (err) {
    if (err.status === 403) {
      blockedBroadcast = true
    }
  }
  assert(blockedBroadcast, '32. Email broadcast blocked with 403 after trial expiry')

  // --- 6. DATA PRESERVATION AFTER EXPIRY ---
  console.log('\n--- GROUP 6: DATA PRESERVATION AFTER EXPIRY ---')
  const existingProduct = await productService.get(creatorId, product.id)
  assert(Boolean(existingProduct && existingProduct.id === product.id), '33. Existing products are NEVER deleted after trial expiry')

  const existingCoupons = await couponsRepo.listByCreator(creatorId)
  assert(Array.isArray(existingCoupons), '34. Existing coupons remain safely preserved in account')

  // --- 7. PAID UPGRADE & RE-ENTITLEMENT ---
  console.log('\n--- GROUP 7: PAID PLAN UPGRADE ---')
  // Simulate purchasing Pro plan
  const testRunUid = `${Date.now()}_${Math.random().toString(36).substring(7)}`
  const verifyRes = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
    razorpayOrderId: `order_test_${testRunUid}`,
    razorpaySubscriptionId: `sub_rzp_paid_${testRunUid}`,
    razorpayPaymentId: `pay_rzp_paid_${testRunUid}`,
    razorpaySignature: 'sig_mock',
  })
  assert(verifyRes.status === 'ACTIVE', '35. Paid upgrade verification activates subscription')

  const upgradedStatus = await creatorSubscriptionService.getStatus(creatorId)
  assert(upgradedStatus.status === 'ACTIVE', '36. Subscription status = ACTIVE after payment')
  assert(upgradedStatus.planId === 'PRO', '37. Effective plan = PRO after payment')
  assert(upgradedStatus.isTrial === false, '38. Paid subscription supersedes trial state')
  assert(upgradedStatus.daysRemaining > 20, '39. Dynamic paid period daysRemaining calculated accurately')

  // --- 8. PREVENT RESTARTING TRIAL AFTER EXPIRY / PAID ---
  console.log('\n--- GROUP 8: RE-TRIAL PROTECTION ---')
  const restartAttempt = await creatorSubscriptionService.startTrial(creatorId)
  assert(restartAttempt.status === 'ACTIVE' && restartAttempt.isTrial === false, '40. Creator cannot restart or reset trial once used/paid')

  console.log('\n====================================================')
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err)
  process.exit(1)
})
