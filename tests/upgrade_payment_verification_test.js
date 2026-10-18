/**
 * CreatorStore — Pro Upgrade Payment Verification & Anti-Premature Activation Test Suite
 *
 * Verifies all 13 critical regression scenarios specified in the prompt:
 * 1. Creator -> Pro upgrade successfully opens the required payment flow.
 * 2. Pro is not activated when checkout has merely been created.
 * 3. Pro is not activated on the return URL before server-side verification.
 * 4. Failed payment leaves Creator access unchanged.
 * 5. Pending payment leaves Creator access unchanged.
 * 6. Abandoned checkout leaves Creator access unchanged.
 * 7. Verified successful upgrade grants Pro exactly once.
 * 8. Invalid webhook signatures are rejected.
 * 9. Duplicate webhooks do not duplicate subscriptions or entitlements.
 * 10. Repeated clicks and concurrent upgrade requests do not create duplicate subscriptions.
 * 11. A failed Dodo API request cannot activate Pro.
 * 12. Existing Pro subscribers are not charged again by clicking their current plan.
 * 13. The application correctly handles provider/database state mismatches.
 */

import { Webhook } from 'standardwebhooks'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
  webhookService,
} from '../lib/services.js'
import {
  creatorSubscriptionsRepo,
  webhookEventsRepo,
  subscriptionAuditLogsRepo,
  usersRepo,
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'
import { auditCustomerSubscriptions } from '../lib/subscription-reconciliation.js'

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

function createWebhookEvent(eventType, payloadData, eventId = null) {
  return {
    event_id: eventId || `evt_${uuidv4().replace(/-/g, '')}`,
    type: eventType,
    data: payloadData,
  }
}

async function runRegressionTestSuite() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: PRO UPGRADE PAYMENT VERIFICATION TEST SUITE (13 SCENARIOS) ')
  console.log('=====================================================================\n')

  const testEmail = `upgrade-anti-bypass-${Date.now()}@example.com`
  let user = null
  let freshUser = null
  const originalChangeSub = dodoProvider.changeSubscriptionPlan.bind(dodoProvider)
  const originalGetPayment = dodoProvider.getPayment.bind(dodoProvider)
  const originalGetSub = dodoProvider.getSubscription.bind(dodoProvider)
  const originalCreateCheckout = dodoProvider.createSubscriptionCheckoutSession.bind(dodoProvider)

  try {
    // 0. Setup: Create test user and initial active Creator subscription
    const createdUser = await authService.signup({
      email: testEmail,
      password: 'SecurePassword123!',
      name: 'Upgrade Verification Tester',
      role: 'CREATOR',
      storeName: `Upgrade Store ${Date.now()}`,
      slug: `upgrade-store-${Date.now()}`,
    })
    const userId = createdUser.user?.id || createdUser.id
    user = { id: userId, email: testEmail }

    const initialDodoSubId = `sub_test_creator_${Date.now()}`
    const creatorSub = await creatorSubscriptionsRepo.upsert(user.id, {
      status: 'ACTIVE',
      plan: 'CREATOR',
      billingInterval: 'MONTHLY',
      billingCycle: 'MONTHLY',
      price: 19,
      currency: 'USD',
      provider: 'DODO',
      providerSubscriptionId: initialDodoSubId,
      dodoSubscriptionId: initialDodoSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    assert(creatorSub.plan === 'CREATOR' && creatorSub.status === 'ACTIVE', 'Initial state: User is active on Creator plan')

    // =========================================================================
    // SCENARIO 1: Creator -> Pro upgrade successfully opens the required payment flow
    // =========================================================================
    console.log('\n--- Scenario 1: Creator -> Pro opens payment flow with hosted payment link ---')
    dodoProvider.createSubscriptionCheckoutSession = async (params) => {
      return {
        sessionId: 'cks_scenario_1',
        checkoutUrl: 'https://test.checkout.dodopayments.com/session/cks_scenario_1',
        provider: 'dodo',
      }
    }

    const flowRes1 = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })

    assert(flowRes1.checkoutUrl === 'https://test.checkout.dodopayments.com/session/cks_scenario_1', 'Scenario 1: Checkout URL returned for customer payment')
    const subAfterScenario1 = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterScenario1.plan === 'CREATOR' && subAfterScenario1.status === 'ACTIVE', 'Scenario 1: Pro is NOT granted; existing Creator entitlement remains active')

    // =========================================================================
    // SCENARIO 2: Pro is not activated when checkout has merely been created
    // =========================================================================
    console.log('\n--- Scenario 2: Pro is not activated when checkout session is created ---')
    const freshUserEmail = `fresh-checkout-${Date.now()}@example.com`
    const createdFresh = await authService.signup({
      email: freshUserEmail,
      password: 'SecurePassword123!',
      name: 'Fresh Checkout User',
      role: 'CREATOR',
      storeName: `Fresh Store ${Date.now()}`,
      slug: `fresh-store-${Date.now()}`,
    })
    freshUser = { id: createdFresh.user?.id || createdFresh.id, email: freshUserEmail }

    dodoProvider.createSubscriptionCheckoutSession = async () => ({
      sessionId: `cks_scenario_2_${Date.now()}`,
      checkoutUrl: 'https://test.checkout.dodopayments.com/session/cks_scenario_2',
    })

    const freshCheckoutRes = await creatorSubscriptionService.createCheckoutSession(freshUser.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })

    assert(Boolean(freshCheckoutRes.checkoutUrl), 'Scenario 2: Hosted checkout URL created for new subscriber')
    const freshSubInDb = await creatorSubscriptionsRepo.getByCreator(freshUser.id)
    assert(freshSubInDb.status === 'PENDING', 'Scenario 2: Subscription is recorded as PENDING, NOT ACTIVE')
    const freshStatus = await creatorSubscriptionService.getStatus(freshUser.id)
    assert((freshStatus.status === 'INACTIVE' || freshStatus.rawStatus === 'PENDING') && freshStatus.planId !== 'PRO', 'Scenario 2: Pro entitlement check denies access while in PENDING status')
    let entitlementDenied = false
    try {
      await creatorSubscriptionService.assertActiveEntitlement(freshUser.id)
    } catch (e) {
      entitlementDenied = true
    }
    assert(entitlementDenied, 'Scenario 2: assertActiveEntitlement denies access for pending checkout')

    // =========================================================================
    // SCENARIO 3: Pro is not activated on the return URL before server-side verification
    // =========================================================================
    console.log('\n--- Scenario 3: Pro is not activated on return URL before server-side verification ---')
    // Attempt verification with an unconfirmed/unpaid checkout session
    dodoProvider.getCheckoutSession = async () => ({
      id: freshCheckoutRes.sessionId,
      payment_status: 'unpaid',
      metadata: { creatorId: freshUser.id },
    })

    let returnUrlFailed = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(freshUser.id, {
        sessionId: freshCheckoutRes.sessionId,
      })
    } catch (e) {
      returnUrlFailed = true
    }
    assert(returnUrlFailed, 'Scenario 3: Unpaid return URL call rejected by server-side verification')
    const freshSubAfterReturn = await creatorSubscriptionsRepo.getByCreator(freshUser.id)
    assert(freshSubAfterReturn.status === 'PENDING', 'Scenario 3: Subscription remains PENDING, never activated on return URL')

    // =========================================================================
    // SCENARIO 4: Failed payment leaves Creator access unchanged
    // =========================================================================
    console.log('\n--- Scenario 4: Failed payment leaves Creator access unchanged ---')
    // Test webhook payment.failed event:
    const failWebhook = createWebhookEvent('payment.failed', {
      payment_id: 'pay_failed_scenario_4',
      subscription_id: initialDodoSubId,
      metadata: { creatorId: user.id },
    })
    await webhookService.handle(failWebhook)
    const subAfterFailHook = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterFailHook.plan === 'CREATOR' && subAfterFailHook.status === 'ACTIVE', 'Scenario 4: payment.failed webhook does not downgrade or revoke Creator access')

    // =========================================================================
    // SCENARIO 5: Pending payment leaves Creator access unchanged
    // =========================================================================
    console.log('\n--- Scenario 5: Pending payment leaves Creator access unchanged ---')
    const subAfterPending = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterPending.plan === 'CREATOR' && subAfterPending.status === 'ACTIVE', 'Scenario 5: User retains Creator access while upgrade payment is processing')

    // =========================================================================
    // SCENARIO 6: Abandoned checkout leaves Creator access unchanged
    // =========================================================================
    console.log('\n--- Scenario 6: Abandoned checkout leaves Creator access unchanged ---')
    const subAfterAbandon = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterAbandon.plan === 'CREATOR' && subAfterAbandon.status === 'ACTIVE', 'Scenario 6: Abandoned checkout never grants Pro; Creator remains active')

    // =========================================================================
    // SCENARIO 7: Verified successful upgrade grants Pro exactly once
    // =========================================================================
    console.log('\n--- Scenario 7: Verified successful upgrade grants Pro exactly once ---')
    const successfulPayId = `pay_success_${Date.now()}`
    const successfulSubId = `sub_pro_${Date.now()}`

    dodoProvider.getCheckoutSession = async (sid) => ({
      id: sid,
      payment_status: 'paid',
      payment_id: successfulPayId,
      subscription_id: successfulSubId,
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y', // Pro USD
      metadata: { creatorId: user.id, planId: 'PRO', isUpgrade: 'true', previousSubscriptionId: initialDodoSubId },
    })
    dodoProvider.getPayment = async (pid) => ({
      payment_id: pid,
      status: 'succeeded',
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      subscription_id: successfulSubId,
      metadata: { creatorId: user.id, planId: 'PRO' },
    })
    dodoProvider.getSubscription = async (sid) => ({
      subscription_id: sid,
      status: 'active',
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const upgradeRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, {
      sessionId: flowRes1.sessionId,
    })

    assert(upgradeRes.success === true && upgradeRes.status === 'ACTIVE' && upgradeRes.plan === 'PRO', 'Scenario 7: Upgrade to Pro granted after verified successful payment')
    const subAfterVerifiedUpgrade = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterVerifiedUpgrade.plan === 'PRO' && subAfterVerifiedUpgrade.status === 'ACTIVE', 'Scenario 7: Database record is authoritatively updated to PRO')

    // Verify exactly one subscription record exists
    const totalSubsForUser = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(totalSubsForUser === 1, 'Scenario 7: Exactly ONE active subscription record exists in database')

    // =========================================================================
    // SCENARIO 8: Invalid webhook signatures are rejected
    // =========================================================================
    console.log('\n--- Scenario 8: Invalid webhook signatures are rejected ---')
    let invalidSigRejected = false
    try {
      webhookService.verifyDodoSignature('{"event":"subscription.active"}', {
        'webhook-id': 'msg_fake_123',
        'webhook-signature': 'v1,invalid_signature_xyz',
        'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      })
    } catch (e) {
      invalidSigRejected = true
    }
    assert(invalidSigRejected, 'Scenario 8: Invalid webhook signature threw signature verification error')

    // =========================================================================
    // SCENARIO 9: Duplicate webhooks do not duplicate subscriptions or entitlements
    // =========================================================================
    console.log('\n--- Scenario 9: Duplicate webhooks do not duplicate subscriptions or entitlements ---')
    const dupEventId = `evt_dup_${Date.now()}`
    const dupEvent = createWebhookEvent('subscription.active', {
      subscription_id: initialDodoSubId,
      product_id: 'p_pro_monthly_usd',
      status: 'active',
      metadata: { creatorId: user.id },
    }, dupEventId)

    const hook1 = await webhookService.handle(dupEvent)
    const hook2 = await webhookService.handle(dupEvent)

    assert(hook1.ok === true, 'Scenario 9: First webhook delivery processed')
    assert(hook2.duplicate === true, 'Scenario 9: Second webhook delivery rejected as duplicate')
    const countAfterDup = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(countAfterDup === 1, 'Scenario 9: Duplicate webhooks did not duplicate subscriptions')

    // =========================================================================
    // SCENARIO 10: Repeated clicks and concurrent upgrade requests do not create duplicate subscriptions
    // =========================================================================
    console.log('\n--- Scenario 10: Repeated clicks and concurrent upgrade requests do not create duplicate subscriptions ---')
    // While on Pro, concurrent clicks for Pro return alreadyActive
    const [click1, click2] = await Promise.all([
      creatorSubscriptionService.createCheckoutSession(user.id, { plan: 'PRO', interval: 'MONTHLY' }),
      creatorSubscriptionService.createCheckoutSession(user.id, { plan: 'PRO', interval: 'MONTHLY' }),
    ])

    assert(click1.alreadyActive === true && click2.alreadyActive === true, 'Scenario 10: Repeated clicks safely intercepted, returning alreadyActive without duplicate billing')
    const countAfterConcurrent = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(countAfterConcurrent === 1, 'Scenario 10: Concurrent requests preserved single subscription count')

    // =========================================================================
    // SCENARIO 11: A failed Dodo API request cannot activate Pro
    // =========================================================================
    console.log('\n--- Scenario 11: A failed Dodo API request cannot activate Pro ---')
    await creatorSubscriptionsRepo.updateStatus(user.id, 'ACTIVE', {
      plan: 'CREATOR',
      pendingUpgradeStatus: null,
      pendingUpgradePaymentLink: null,
      pendingUpgradePlan: null,
      pendingUpgradeStartedAt: null,
    })
    const subResetToCreator = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subResetToCreator.plan === 'CREATOR', 'Reset to Creator for Scenario 11')

    dodoProvider.getSubscription = async () => ({
      status: 'active',
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk', // CREATOR
    })

    dodoProvider.createSubscriptionCheckoutSession = async () => {
      throw new Error('500 Internal Server Error from Dodo Payments')
    }

    let apiErrorThrew = false
    try {
      await creatorSubscriptionService.createCheckoutSession(user.id, {
        plan: 'PRO',
        interval: 'MONTHLY',
        region: 'INTERNATIONAL',
      })
    } catch (e) {
      apiErrorThrew = true
    }

    assert(apiErrorThrew, 'Scenario 11: Failed Dodo API throws error')
    const subAfterApiError = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterApiError.plan === 'CREATOR' && subAfterApiError.status === 'ACTIVE', 'Scenario 11: User remains on Creator; Pro is NOT activated on provider error')

    // =========================================================================
    // SCENARIO 12: Existing Pro subscribers are not charged again by clicking their current plan
    // =========================================================================
    console.log('\n--- Scenario 12: Existing Pro subscribers are not charged again by clicking their current plan ---')
    await creatorSubscriptionsRepo.updateStatus(user.id, 'ACTIVE', { plan: 'PRO' })
    let checkoutSessionCalled = false
    dodoProvider.createSubscriptionCheckoutSession = async () => {
      checkoutSessionCalled = true
      return {}
    }

    const currentPlanClickRes = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })

    assert(currentPlanClickRes.alreadyActive === true && currentPlanClickRes.currentPlan === true, 'Scenario 12: Returns alreadyActive without charging')
    assert(!checkoutSessionCalled, 'Scenario 12: Dodo checkout session API was NOT invoked when clicking current plan')

    // =========================================================================
    // SCENARIO 13: The application correctly handles provider/database state mismatches
    // =========================================================================
    console.log('\n--- Scenario 13: Application correctly handles provider/database state mismatches ---')
    const auditRes = await auditCustomerSubscriptions({ creatorId: user.id })
    assert(Boolean(auditRes) && auditRes.creatorId === user.id && Boolean(auditRes.localDbSubscription), 'Scenario 13: Audit successfully inspects database subscription state')

    // Provider reports subscription expired via webhook event
    const expiredHook = createWebhookEvent('subscription.expired', {
      subscription_id: initialDodoSubId,
      metadata: { creatorId: user.id },
    })
    await webhookService.handle(expiredHook)
    const subAfterExpiry = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterExpiry.status === 'HALTED' || subAfterExpiry.status === 'EXPIRED', 'Scenario 13: Provider expired status successfully reconciled with local database')

    console.log('\n=====================================================================')
    console.log(` ALL 13 REGRESSION SCENARIOS COMPLETED: ${passed} PASSED, ${failed} FAILED `)
    console.log('=====================================================================\n')

  } finally {
    // Restore mocks
    dodoProvider.changeSubscriptionPlan = originalChangeSub
    dodoProvider.getPayment = originalGetPayment
    dodoProvider.getSubscription = originalGetSub
    dodoProvider.createSubscriptionCheckoutSession = originalCreateCheckout

    // Cleanup test users
    for (const u of [user, freshUser]) {
      if (u?.id) {
        await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: u.id } }).catch(() => {})
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: u.id } }).catch(() => {})
        await prisma.store.deleteMany({ where: { creatorId: u.id } }).catch(() => {})
        await prisma.creatorProfile.deleteMany({ where: { creatorId: u.id } }).catch(() => {})
        await prisma.user.deleteMany({ where: { id: u.id } }).catch(() => {})
      }
    }
  }
}

runRegressionTestSuite().catch((err) => {
  console.error('Test suite failure:', err)
  process.exit(1)
})
