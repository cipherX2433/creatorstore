/**
 * Verification test script for CreatorStore Annual Billing & 20% Discount Implementation
 */
import { getSubscriptionPricing, getPlanConfig, PLAN_IDS, ANNUAL_DISCOUNT_PERCENT, hasEntitlement } from '../lib/plans.js'
import { creatorSubscriptionService } from '../lib/services.js'
import { usersRepo, creatorSubscriptionsRepo, profilesRepo } from '../lib/repos.js'
import crypto from 'crypto'

async function runTests() {
  console.log('=====================================================')
  console.log('TESTING ANNUAL BILLING & 20% DISCOUNT IMPLEMENTATION')
  console.log('=====================================================')

  // 1. Central Pricing Configuration Tests
  console.log('\n--- 1. Testing Central Pricing Configuration (lib/plans.js) ---')
  const monthlyPricing = getSubscriptionPricing('INR', 'monthly')
  const annualPricing = getSubscriptionPricing('INR', 'annual')

  console.log(`Creator Monthly Price: ${monthlyPricing.CREATOR.monthly.priceFormatted} (${monthlyPricing.CREATOR.monthly.price} INR)`)
  console.log(`Creator Annual Price: ${annualPricing.CREATOR.annual.priceFormatted} (${annualPricing.CREATOR.annual.price} INR) - Original: ${annualPricing.CREATOR.annual.originalPriceInrFormatted}`)
  console.log(`Pro Monthly Price: ${monthlyPricing.PRO.monthly.priceFormatted} (${monthlyPricing.PRO.monthly.price} INR)`)
  console.log(`Pro Annual Price: ${annualPricing.PRO.annual.priceFormatted} (${annualPricing.PRO.annual.price} INR) - Original: ${annualPricing.PRO.annual.originalPriceInrFormatted}`)

  if (monthlyPricing.CREATOR.monthly.price !== 499) throw new Error(`Expected Creator monthly = 499, got ${monthlyPricing.CREATOR.monthly.price}`)
  if (annualPricing.CREATOR.annual.price !== 4790) throw new Error(`Expected Creator annual = 4790, got ${annualPricing.CREATOR.annual.price}`)
  if (monthlyPricing.PRO.monthly.price !== 999) throw new Error(`Expected Pro monthly = 999, got ${monthlyPricing.PRO.monthly.price}`)
  if (annualPricing.PRO.annual.price !== 9590) throw new Error(`Expected Pro annual = 9590, got ${annualPricing.PRO.annual.price}`)
  if (ANNUAL_DISCOUNT_PERCENT !== 20) throw new Error(`Expected discount = 20%, got ${ANNUAL_DISCOUNT_PERCENT}`)

  console.log('✓ Canonical pricing calculations verified!')

  // 2. Entitlement Preservation Tests
  console.log('\n--- 2. Testing Entitlements Consistency Across Intervals ---')
  const creatorMonthlyConfig = getPlanConfig('CREATOR', 'ACTIVE', 'monthly')
  const creatorAnnualConfig = getPlanConfig('CREATOR', 'ACTIVE', 'annual')
  const proMonthlyConfig = getPlanConfig('PRO', 'ACTIVE', 'monthly')
  const proAnnualConfig = getPlanConfig('PRO', 'ACTIVE', 'annual')

  if (creatorMonthlyConfig.entitlements.canPublish !== creatorAnnualConfig.entitlements.canPublish) {
    throw new Error('Creator annual entitlements differ from monthly!')
  }
  if (proMonthlyConfig.entitlements.canPublish !== proAnnualConfig.entitlements.canPublish) {
    throw new Error('Pro annual entitlements differ from monthly!')
  }
  if (!proAnnualConfig.entitlements.removeBranding || !proMonthlyConfig.entitlements.removeBranding) {
    throw new Error('Pro entitlements missing removeBranding!')
  }
  console.log('✓ Plan entitlements match 1:1 between monthly and annual intervals!')

  // 3. Testing Backend Checkout Session Creation & Server-side Authorization
  console.log('\n--- 3. Testing Server-side Checkout Session Creation ---')
  const testEmail = `test_annual_${Date.now()}@example.com`
  const user = await usersRepo.create({
    email: testEmail,
    passwordHash: 'dummy_hash',
    role: 'CREATOR',
  })
  await profilesRepo.upsert(user.id, {
    name: 'Annual Tester',
    phone: '+919999999999',
  })
  const creatorId = user.id

  // Test 3a: Creator Monthly Checkout
  console.log('\n  Testing Checkout Session: Creator Monthly')
  const sessionCreatorMonthly = await creatorSubscriptionService.createCheckoutSession(creatorId, {
    plan: 'CREATOR',
    interval: 'monthly',
  })
  console.log('  Amount:', sessionCreatorMonthly.amount, 'Paise. Currency:', sessionCreatorMonthly.currency)
  if (sessionCreatorMonthly.amount !== 49900) throw new Error(`Expected 49900 paise, got ${sessionCreatorMonthly.amount}`)

  // Test 3b: Creator Annual Checkout (20% OFF)
  console.log('\n  Testing Checkout Session: Creator Annual')
  const sessionCreatorAnnual = await creatorSubscriptionService.createCheckoutSession(creatorId, {
    plan: 'CREATOR',
    interval: 'annual',
  })
  console.log('  Amount:', sessionCreatorAnnual.amount, 'Paise. Currency:', sessionCreatorAnnual.currency)
  if (sessionCreatorAnnual.amount !== 479000) throw new Error(`Expected 479000 paise (₹4,790), got ${sessionCreatorAnnual.amount}`)

  // Test 3c: Pro Monthly Checkout
  console.log('\n  Testing Checkout Session: Pro Monthly')
  const sessionProMonthly = await creatorSubscriptionService.createCheckoutSession(creatorId, {
    plan: 'PRO',
    interval: 'monthly',
  })
  console.log('  Amount:', sessionProMonthly.amount, 'Paise. Currency:', sessionProMonthly.currency)
  if (sessionProMonthly.amount !== 99900) throw new Error(`Expected 99900 paise, got ${sessionProMonthly.amount}`)

  // Test 3d: Pro Annual Checkout (20% OFF)
  console.log('\n  Testing Checkout Session: Pro Annual')
  const sessionProAnnual = await creatorSubscriptionService.createCheckoutSession(creatorId, {
    plan: 'PRO',
    interval: 'annual',
  })
  console.log('  Amount:', sessionProAnnual.amount, 'Paise. Currency:', sessionProAnnual.currency)
  if (sessionProAnnual.amount !== 959000) throw new Error(`Expected 959000 paise (₹9,590), got ${sessionProAnnual.amount}`)

  console.log('✓ All 4 checkout combinations calculate server-authoritative amounts correctly!')

  // 4. Testing Payment Verification & Period End Calculation
  console.log('\n--- 4. Testing Payment Verification & Active Status ---')
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
  const mockSubId = `sub_${Date.now()}`
  const mockPayId = `pay_${Date.now()}`
  const expectedSig = crypto.createHmac('sha256', keySecret).update(`${mockPayId}|${mockSubId}`).digest('hex')

  // Set sub to annual first
  await creatorSubscriptionService.createCheckoutSession(creatorId, { plan: 'PRO', interval: 'annual' })

  const verifyResult = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
    razorpaySubscriptionId: mockSubId,
    razorpayPaymentId: mockPayId,
    razorpaySignature: expectedSig,
  })

  console.log('  Verification status:', verifyResult.status)
  if (verifyResult.status !== 'ACTIVE') throw new Error(`Expected ACTIVE, got ${verifyResult.status}`)

  const status = await creatorSubscriptionService.getStatus(creatorId)
  console.log('  Subscription Plan:', status.plan, '| Interval:', status.billingInterval, '| Price:', status.price)
  console.log('  Current Period Start:', status.currentPeriodStart)
  console.log('  Current Period End / Next Renewal:', status.currentPeriodEnd)

  if (status.billingInterval !== 'ANNUAL') throw new Error(`Expected ANNUAL billingInterval, got ${status.billingInterval}`)
  if (!status.isAnnual) throw new Error('Expected isAnnual to be true')
  if (status.price !== 9590) throw new Error(`Expected price = 9590, got ${status.price}`)

  const periodDays = Math.round((new Date(status.currentPeriodEnd).getTime() - new Date(status.currentPeriodStart).getTime()) / (1000 * 60 * 60 * 24))
  console.log('  Calculated Period Duration (Days):', periodDays)
  if (periodDays < 360 || periodDays > 370) {
    throw new Error(`Expected annual subscription to have ~365 days period, got ${periodDays}`)
  }

  console.log('✓ Annual subscription verified with 365-day renewal cycle and canonical ₹9,590 price!')

  // Cleanup test user
  await creatorSubscriptionsRepo.deleteByCreator?.(creatorId).catch(() => {})
  
  console.log('\n=====================================================')
  console.log('ALL ANNUAL BILLING & DISCOUNT TESTS PASSED!')
  console.log('=====================================================')
}

runTests().catch((err) => {
  console.error('Test failed with error:', err)
  process.exit(1)
})
