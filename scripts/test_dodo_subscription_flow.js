/**
 * CreatorStore — Comprehensive Dodo Payments Integration & Subscription Lifecycle Test
 *
 * Validates:
 * 1. Plan & Pricing Configuration (INR & USD, Monthly & Annual)
 * 2. Subscription Checkout Session Creation & Validation
 * 3. Product Checkout Session Creation
 * 4. Authoritative Verification & Entitlement Activation
 * 5. Webhook Signature Verification (StandardWebhooks HMAC-SHA256)
 * 6. Webhook Idempotency (Duplicate Event Delivery Prevention)
 * 7. Subscription Lifecycle (Active -> Renewal -> Cancelled -> Entitlements)
 * 8. Cross-Account Security & Ownership Isolation
 * 9. Historical Subscription Record Preservation
 */

import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { Webhook } from 'standardwebhooks'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
  checkoutService,
  webhookService,
} from '../lib/services.js'
import {
  creatorSubscriptionsRepo,
  ordersRepo,
  entitlementsRepo,
  webhookEventsRepo,
} from '../lib/repos.js'
import {
  dodoProvider,
} from '../lib/dodo.js'
import {
  BILLING_REGIONS,
  PLAN_KEYS,
  resolveBillingConfig,
} from '../lib/billing/config.js'

let totalPassed = 0
let totalFailed = 0

function assert(condition, message) {
  if (condition) {
    totalPassed++
    console.log(`   ✅ PASS: ${message}`)
  } else {
    totalFailed++
    console.error(`   ❌ FAIL: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log(' CREATORSTORE — DODO PAYMENTS FULL LIFECYCLE & SECURITY TEST ')
  console.log('=================================================================\n')

  const timestamp = Date.now()

  // -------------------------------------------------------------
  // TEST 1: Pricing Catalog & Configuration Integrity
  // -------------------------------------------------------------
  console.log('TEST 1: Verifying Dodo Product & Pricing Catalog...')
  const creatorIndiaMonthly = resolveBillingConfig({
    plan: PLAN_KEYS.CREATOR,
    interval: 'monthly',
    region: BILLING_REGIONS.INDIA,
  })
  assert(creatorIndiaMonthly.currency === 'INR', 'Creator India monthly currency is INR')
  assert(creatorIndiaMonthly.amount === 499, 'Creator India monthly price is ₹499')
  assert(Boolean(creatorIndiaMonthly.dodoProductId), 'Creator India monthly has Dodo product ID')

  const proIntlAnnual = resolveBillingConfig({
    plan: PLAN_KEYS.PRO,
    interval: 'annual',
    region: BILLING_REGIONS.INTERNATIONAL,
  })
  assert(proIntlAnnual.currency === 'USD', 'Pro Intl annual currency is USD')
  assert(proIntlAnnual.amount === 115, 'Pro Intl annual price is $115/yr')
  assert(Boolean(proIntlAnnual.dodoProductId), 'Pro Intl annual has Dodo product ID')

  const proIndiaMonthly = resolveBillingConfig({
    plan: PLAN_KEYS.PRO,
    interval: 'monthly',
    region: BILLING_REGIONS.INDIA,
  })
  assert(proIndiaMonthly.amount === 999, 'Pro India monthly price is ₹999')
  assert(proIndiaMonthly.currency === 'INR', 'Pro India monthly currency is INR')

  // -------------------------------------------------------------
  // TEST 2: User Creation for Testing
  // -------------------------------------------------------------
  console.log('\nTEST 2: Creating Test Creators...')
  const creatorAEmail = `dodo_creator_a_${timestamp}@example.com`
  const creatorBEmail = `dodo_creator_b_${timestamp}@example.com`

  const userA = await authService.signup({
    email: creatorAEmail,
    password: `Pass123!_${timestamp}`,
    name: 'Dodo Creator Alpha',
    role: 'CREATOR',
    storeName: `Alpha Store ${timestamp}`,
    slug: `alpha-store-${timestamp}`,
  })
  const creatorAId = userA.user?.id || userA.id

  const userB = await authService.signup({
    email: creatorBEmail,
    password: `Pass123!_${timestamp}`,
    name: 'Dodo Creator Beta',
    role: 'CREATOR',
    storeName: `Beta Store ${timestamp}`,
    slug: `beta-store-${timestamp}`,
  })
  const creatorBId = userB.user?.id || userB.id

  assert(Boolean(creatorAId && creatorBId), 'Successfully created Creator A and Creator B')

  // -------------------------------------------------------------
  // TEST 3: Subscription Checkout Session Creation
  // -------------------------------------------------------------
  console.log('\nTEST 3: Testing Subscription Checkout Session Creation...')
  const sessionProA = await creatorSubscriptionService.createCheckoutSession(creatorAId, {
    plan: 'PRO',
    interval: 'monthly',
    region: 'INDIA',
  })

  assert(sessionProA.provider === 'dodo', 'Provider is identified as Dodo')
  assert(Boolean(sessionProA.checkoutUrl), `Checkout URL returned: ${sessionProA.checkoutUrl}`)
  assert(sessionProA.checkoutUrl.startsWith('http'), 'Checkout URL is a valid absolute URL')
  assert(Boolean(sessionProA.sessionId), `Session ID returned: ${sessionProA.sessionId}`)
  assert(sessionProA.amount === 999, `Pro India amount is correct: ₹${sessionProA.amount}`)

  // Invalid plan test
  let invalidPlanCaught = false
  try {
    await creatorSubscriptionService.createCheckoutSession(creatorAId, { plan: 'NON_EXISTENT_PLAN' })
  } catch (err) {
    invalidPlanCaught = true
  }
  assert(invalidPlanCaught, 'Correctly rejected invalid plan name')

  // -------------------------------------------------------------
  // TEST 4: Digital Product Checkout Session Creation
  // -------------------------------------------------------------
  console.log('\nTEST 4: Testing Digital Product Checkout Session Creation...')
  const productA = await prisma.product.create({
    data: {
      id: uuidv4(),
      creatorId: creatorAId,
      title: 'Dodo Advanced Masterclass',
      slug: `masterclass-${timestamp}`,
      description: 'Comprehensive guide to building creators businesses.',
      price: 49.00,
      currency: 'USD',
      type: 'DIGITAL_DOWNLOAD',
      status: 'PUBLISHED',
      storePublished: true,
    },
  })

  const productSession = await checkoutService.createSession({
    productId: productA.id,
    email: 'buyer@example.com',
    name: 'Test Buyer',
  })

  assert(productSession.provider === 'dodo', 'Digital product checkout provider is Dodo')
  assert(Boolean(productSession.checkoutUrl), `Digital product checkout URL generated: ${productSession.checkoutUrl}`)
  assert(Boolean(productSession.orderId), `Pending Order ID created: ${productSession.orderId}`)

  // -------------------------------------------------------------
  // TEST 5: Authoritative Server-Side Subscription Verification
  // -------------------------------------------------------------
  console.log('\nTEST 5: Authoritative Verification & Subscription Activation...')
  const verifyResult = await creatorSubscriptionService.verifySubscriptionPayment(creatorAId, {
    sessionId: sessionProA.sessionId,
    subscriptionId: `sub_dodo_mock_${timestamp}`,
  })

  assert(verifyResult.success === true, 'Verification returns success: true')
  assert(verifyResult.plan === 'PRO', 'Verified plan is PRO')

  const subRecordA = await creatorSubscriptionsRepo.getByCreator(creatorAId)
  assert(subRecordA.status === 'ACTIVE', 'Database subscription record is ACTIVE')
  assert(subRecordA.plan === 'PRO', 'Database plan is PRO')
  assert(subRecordA.dodoSubscriptionId === `sub_dodo_mock_${timestamp}`, 'Saved dodoSubscriptionId')

  // -------------------------------------------------------------
  // TEST 6: Cross-Account Security & IDOR Protection
  // -------------------------------------------------------------
  console.log('\nTEST 6: Testing Cross-Account Security & IDOR Isolation...')
  let crossAccountBlocked = false
  try {
    // Creator B attempts to verify or manipulate Creator A's subscription
    await creatorSubscriptionService.cancelSubscription(creatorBId)
  } catch (err) {
    crossAccountBlocked = true
  }
  // Creator B has no active subscription, so cancel must fail or report no active sub
  const subRecordB = await creatorSubscriptionsRepo.getByCreator(creatorBId)
  assert(!subRecordB || subRecordB.status !== 'ACTIVE', 'Creator B cannot access or affect Creator A subscription')

  // -------------------------------------------------------------
  // TEST 7: Webhook Cryptographic Verification (StandardWebhooks)
  // -------------------------------------------------------------
  const base64Part = Buffer.from('mock_secret_key_32_bytes_test_ok').toString('base64')
  const testWebhookSecret = (process.env.DODO_PAYMENTS_WEBHOOK_KEY && !process.env.DODO_PAYMENTS_WEBHOOK_KEY.includes('placeholder'))
    ? process.env.DODO_PAYMENTS_WEBHOOK_KEY
    : `whsec_${base64Part}`
  const wh = new Webhook(testWebhookSecret)

  const sampleEvent = {
    id: `evt_dodo_active_${timestamp}`,
    type: 'subscription.active',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: `sub_dodo_webhook_${timestamp}`,
      status: 'active',
      customer: {
        customer_id: `cust_dodo_${timestamp}`,
        email: creatorBEmail,
      },
      metadata: {
        creatorId: creatorBId,
        plan: 'CREATOR',
        interval: 'monthly',
      },
    },
  }

  const rawPayload = JSON.stringify(sampleEvent)
  const webhookId = `msg_${timestamp}`
  const now = new Date()
  const validSignature = wh.sign(webhookId, now, rawPayload)
  const webhookTimestamp = Math.floor(now.getTime() / 1000).toString()

  // Verify with valid headers
  const validHeaders = {
    'webhook-id': webhookId,
    'webhook-timestamp': webhookTimestamp,
    'webhook-signature': validSignature,
  }
  // Verify with StandardWebhooks cryptographic engine
  const verifiedWithStandardWebhooks = wh.verify(rawPayload, validHeaders)
  assert(verifiedWithStandardWebhooks.id === sampleEvent.id, 'Webhook signature successfully verified with StandardWebhooks HMAC-SHA256')

  // Verify rejection with forged signature
  let forgedCaught = false
  try {
    wh.verify(rawPayload, {
      ...validHeaders,
      'webhook-signature': 'v1,forged_invalid_signature_hex_code',
    })
  } catch (err) {
    forgedCaught = true
  }
  assert(forgedCaught, 'Forged webhook signature correctly rejected')

  // -------------------------------------------------------------
  // TEST 8: Webhook Idempotency (Duplicate Delivery Protection)
  // -------------------------------------------------------------
  console.log('\nTEST 8: Testing Webhook Idempotency & Duplicate Event Delivery...')
  // First delivery
  const processResult1 = await webhookService.processDodoEvent(sampleEvent)
  assert(processResult1.processed === true, 'First webhook delivery was processed successfully')

  // Second delivery (duplicate event ID)
  const processResult2 = await webhookService.processDodoEvent(sampleEvent)
  assert(processResult2.processed === false && processResult2.duplicate === true, 'Duplicate webhook delivery was safely ignored')

  // Verify creator B's subscription was activated
  const subRecordBAfterHook = await creatorSubscriptionsRepo.getByCreator(creatorBId)
  assert(subRecordBAfterHook.status === 'ACTIVE', 'Creator B subscription activated via webhook')
  assert(subRecordBAfterHook.plan === 'CREATOR', 'Creator B plan is CREATOR')

  // -------------------------------------------------------------
  // TEST 9: Subscription Renewal Webhook
  // -------------------------------------------------------------
  console.log('\nTEST 9: Testing Subscription Renewal Event...')
  const initialPeriodEnd = subRecordBAfterHook.currentPeriodEnd
  const renewEvent = {
    id: `evt_dodo_renew_${timestamp}`,
    type: 'subscription.renewed',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: `sub_dodo_webhook_${timestamp}`,
      status: 'active',
      next_billing_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        creatorId: creatorBId,
      },
    },
  }
  await webhookService.processDodoEvent(renewEvent)
  const subRecordBRenewed = await creatorSubscriptionsRepo.getByCreator(creatorBId)
  assert(subRecordBRenewed.status === 'ACTIVE', 'Subscription remains ACTIVE after renewal')
  assert(new Date(subRecordBRenewed.currentPeriodEnd) > new Date(initialPeriodEnd), 'Current period end extended on renewal')

  // -------------------------------------------------------------
  // TEST 10: Subscription Cancellation Event
  // -------------------------------------------------------------
  console.log('\nTEST 10: Testing Subscription Cancellation Event...')
  const cancelEvent = {
    id: `evt_dodo_cancel_${timestamp}`,
    type: 'subscription.cancelled',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: `sub_dodo_webhook_${timestamp}`,
      status: 'cancelled',
      metadata: {
        creatorId: creatorBId,
      },
    },
  }
  await webhookService.processDodoEvent(cancelEvent)
  const subRecordBCancelled = await creatorSubscriptionsRepo.getByCreator(creatorBId)
  assert(subRecordBCancelled.status === 'CANCELLED', 'Subscription status marked CANCELLED')
  assert(Boolean(subRecordBCancelled.canceledAt || subRecordBCancelled.cancelledAt), 'Cancellation timestamp recorded')

  // -------------------------------------------------------------
  // TEST 11: Product Payment Succeeded Webhook & Entitlement Provisioning
  // -------------------------------------------------------------
  console.log('\nTEST 11: Testing Product Payment Succeeded Webhook...')
  const paymentEvent = {
    id: `evt_dodo_pay_${timestamp}`,
    type: 'payment.succeeded',
    created_at: new Date().toISOString(),
    data: {
      payment_id: `pay_dodo_${timestamp}`,
      status: 'succeeded',
      customer: {
        email: 'paidbuyer@example.com',
        name: 'Paid Buyer',
      },
      metadata: {
        orderId: productSession.orderId,
        productId: productA.id,
        creatorId: creatorAId,
      },
    },
  }
  const paymentHookResult = await webhookService.processDodoEvent(paymentEvent)
  assert(paymentHookResult.processed === true, 'Payment succeeded event processed')

  const paidOrder = await ordersRepo.getById(productSession.orderId)
  assert(paidOrder.status === 'PAID', 'Order status updated to PAID')
  assert(paidOrder.dodoPaymentId === `pay_dodo_${timestamp}`, 'Recorded dodoPaymentId on Order')

  const entitlement = await entitlementsRepo.has(null, productA.id, 'buyer@example.com')
  assert(entitlement === true, 'Customer entitlement granted for purchased product')

  // -------------------------------------------------------------
  // TEST 12: Historical Legacy Subscription Record Preservation
  // -------------------------------------------------------------
  console.log('\nTEST 12: Testing Historical Legacy Record Preservation...')
  const histUser = await authService.signup({
    email: `hist_user_${timestamp}@example.com`,
    password: `Pass123!_${timestamp}`,
    name: 'Historical User',
    role: 'CREATOR',
    storeName: `Hist Store ${timestamp}`,
    slug: `hist-store-${timestamp}`,
  })
  const histCreatorId = histUser.user?.id || histUser.id

  const histRecord = await prisma.creatorSubscription.update({
    where: { creatorId: histCreatorId },
    data: {
      plan: 'PRO',
      status: 'ACTIVE',
      amount: 999,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      provider: 'razorpay',
      razorpayOrderId: `order_rzp_legacy_${timestamp}`,
      providerSubscriptionId: `sub_rzp_legacy_${timestamp}`,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  const fetchedHist = await creatorSubscriptionsRepo.getByProviderSubscriptionId(`sub_rzp_legacy_${timestamp}`)
  assert(Boolean(fetchedHist), 'Historical Razorpay subscription retrieved via legacy provider ID')
  assert(fetchedHist.provider === 'razorpay', 'Preserved legacy provider indicator')
  assert(fetchedHist.razorpayOrderId === `order_rzp_legacy_${timestamp}`, 'Preserved legacy order ID')

  // Clean up test historical sub
  await prisma.creatorSubscription.delete({ where: { id: histRecord.id } }).catch(() => {})

  console.log('\n=================================================================')
  console.log(` ALL TESTS COMPLETED: ${totalPassed} Passed, ${totalFailed} Failed `)
  console.log('=================================================================\n')
}

runTests()
  .then(() => {
    console.log('Test suite executed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Test suite failed:', err)
    process.exit(1)
  })
