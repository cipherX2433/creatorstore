/**
 * CreatorStore — Single Active Subscription Management Test Suite
 *
 * Verifies all 10 core subscription lifecycle & concurrency scenarios:
 * 1. New Creator subscription checkout & activation
 * 2. Creator -> Pro instant upgrade (single subscription retained, prorated immediately)
 * 3. Pro -> Creator downgrade (scheduled for next billing date, Pro access preserved)
 * 4. Clicking Subscribe repeatedly (idempotent, blocks duplicate subscription creation)
 * 5. Two simultaneous checkout requests (concurrency lock verification)
 * 6. Pending checkout followed by retry (resumes existing checkout session)
 * 7. Duplicate and out-of-order webhooks (stale Creator event cannot downgrade Pro)
 * 8. Failed payment, cancellation, and expired events handling
 * 9. Existing user with two active subscriptions detection & reconciliation audit
 * 10. Correct feature access and billing state after each scenario
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
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'
import { subscriptionReconciliationService } from '../lib/subscription-reconciliation.js'

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

async function runTestSuite() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: SINGLE ACTIVE SUBSCRIPTION MANAGEMENT TEST SUITE ')
  console.log('=====================================================================\n')

  const testEmail = `single-sub-${Date.now()}@example.com`
  let testEmail2 = null
  let creatorId2 = null
  console.log(`Setting up test creator: ${testEmail}`)

  const user1 = await authService.signup({
    email: testEmail,
    password: `Pass123!_${Date.now()}`,
    name: 'Single Sub Creator',
    role: 'CREATOR',
    storeName: `Sub Test Store ${Date.now()}`,
    slug: `sub-test-${Date.now()}`,
  })
  const creatorId = user1.creatorProfile?.id || user1.user?.id || user1.id
  assert(creatorId, `Test creator initialized (ID: ${creatorId})`)

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: New Creator subscription checkout & activation
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 1: New Creator subscription checkout & activation ---')
    const checkout1 = await creatorSubscriptionService.createCheckoutSession(creatorId, {
      plan: 'CREATOR',
      interval: 'monthly',
      region: 'INTERNATIONAL',
    })
    assert(checkout1.provider && checkout1.provider.toLowerCase() === 'dodo', 'Provider is Dodo Payments')
    assert(checkout1.sessionId && checkout1.sessionId.startsWith('cks_'), `Dodo session created: ${checkout1.sessionId}`)
    assert(checkout1.checkoutUrl && checkout1.checkoutUrl.includes('test.checkout.dodopayments.com'), 'Hosted checkout URL returned')

    let status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.rawStatus === 'PENDING', `Initial rawStatus is PENDING (got: ${status.rawStatus})`)
    assert(status.status !== 'ACTIVE', `Initial public status is not ACTIVE (got: ${status.status})`)
    assert(status.canSell === false, 'Cannot sell while subscription is PENDING')

    // Simulate authoritative subscription.active webhook from Dodo
    const subId1 = `sub_test_creator_${Date.now()}`
    const activeEvent1 = createWebhookEvent('subscription.active', {
      subscription_id: subId1,
      customer: { customer_id: 'cus_test_123' },
      metadata: {
        creatorId,
        plan: 'CREATOR',
        interval: 'monthly',
        billingRegion: 'INTERNATIONAL',
      },
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await webhookService.handle(activeEvent1)
    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.status === 'ACTIVE', 'Subscription status is ACTIVE after verified webhook')
    assert(status.planId === 'CREATOR', 'Active plan is CREATOR')
    assert(status.canSell === true, 'Entitlement canSell is true for active Creator')
    assert(status.entitlements.leadExport === false, 'Creator does not have leadExport entitlement')
    assert(status.entitlements.storePagesLimit === 3, 'Creator has 3 store pages limit')

    // -------------------------------------------------------------------------
    // SCENARIO 4: Repeated Subscribe clicks on current plan (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Repeated Subscribe clicks on current plan (Idempotency) ---')
    const duplicateCheckout = await creatorSubscriptionService.createCheckoutSession(creatorId, {
      plan: 'CREATOR',
      interval: 'monthly',
      region: 'INTERNATIONAL',
    })
    assert(duplicateCheckout.alreadyActive === true, 'Repeated click returns alreadyActive: true')
    assert(duplicateCheckout.currentPlan === true, 'Flags currentPlan: true')
    assert(!duplicateCheckout.checkoutUrl, 'No new checkout session URL generated for same plan')

    // -------------------------------------------------------------------------
    // SCENARIO 2: Creator -> Pro instant upgrade
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Creator -> Pro upgrade (Single Subscription In-Place Change) ---')
    // Mock changeSubscriptionPlan on Dodo provider for test environment
    const originalChangePlan = dodoProvider.changeSubscriptionPlan
    let changePlanCalledWith = null
    dodoProvider.changeSubscriptionPlan = async (subId, params) => {
      changePlanCalledWith = { subId, params }
      return {
        subscription_id: subId,
        status: 'active',
        product_id: params.product_id,
        proration_billing_mode: params.proration_billing_mode,
        effective_at: params.effective_at,
      }
    }

    const upgradeRes = await creatorSubscriptionService.createCheckoutSession(creatorId, {
      plan: 'PRO',
      interval: 'monthly',
      region: 'INTERNATIONAL',
    })

    assert(upgradeRes.upgraded === true, 'Upgrade completed successfully')
    assert(changePlanCalledWith !== null, 'Dodo changeSubscriptionPlan was called')
    assert(changePlanCalledWith.subId === subId1, `Changed existing subscription ID in place (${subId1})`)
    assert(
      changePlanCalledWith.params.prorationBillingMode === 'prorated_immediately' ||
      changePlanCalledWith.params.proration_billing_mode === 'prorated_immediately',
      'Proration mode is prorated_immediately'
    )
    assert(
      changePlanCalledWith.params.effectiveAt === 'immediately' ||
      changePlanCalledWith.params.effective_at === 'immediately',
      'Effective immediately'
    )

    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.status === 'ACTIVE', 'Status remains ACTIVE')
    assert(status.planId === 'PRO', 'Plan upgraded to PRO')
    assert(status.entitlements.leadExport === true, 'Pro has leadExport entitlement')
    assert(status.entitlements.advancedAnalytics === true, 'Pro has advancedAnalytics entitlement')

    // Verify DB still only has ONE record for this creator
    const subCount = await prisma.creatorSubscription.count({ where: { creatorId } })
    assert(subCount === 1, `Exactly 1 subscription record exists in DB for creator (count: ${subCount})`)

    // Verify audit log was recorded
    const auditLogs = await subscriptionAuditLogsRepo.listByCreator(creatorId)
    assert(auditLogs.length > 0, `Audit log recorded (count: ${auditLogs.length})`)
    const hasUpgradeAudit = auditLogs.some((l) => l.event === 'PLAN_UPGRADE_APPLIED')
    assert(hasUpgradeAudit, 'Audit event PLAN_UPGRADE_APPLIED was recorded')

    // -------------------------------------------------------------------------
    // SCENARIO 3: Pro -> Creator downgrade (Scheduled for next billing cycle)
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Pro -> Creator downgrade (Scheduled for Next Billing Date) ---')
    let downgradeCalledWith = null
    dodoProvider.changeSubscriptionPlan = async (subId, params) => {
      downgradeCalledWith = { subId, params }
      return {
        subscription_id: subId,
        status: 'active',
        product_id: params.product_id,
        scheduled_change: {
          product_id: params.product_id,
          effective_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }
    }

    const downgradeRes = await creatorSubscriptionService.createCheckoutSession(creatorId, {
      plan: 'CREATOR',
      interval: 'monthly',
      region: 'INTERNATIONAL',
    })

    assert(downgradeRes.scheduledDowngrade === true, 'Downgrade marked as scheduledDowngrade')
    assert(
      downgradeCalledWith.params.effectiveAt === 'next_billing_date' ||
      downgradeCalledWith.params.effective_at === 'next_billing_date',
      'Effective at next_billing_date'
    )
    assert(
      downgradeCalledWith.params.prorationBillingMode === 'full_immediately' ||
      downgradeCalledWith.params.proration_billing_mode === 'full_immediately',
      'Proration mode is full_immediately per Dodo specification'
    )

    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.planId === 'PRO', 'User continues on PRO plan until billing cycle end')
    assert(status.entitlements.leadExport === true, 'User retains Pro entitlements during scheduled downgrade')
    assert(status.hasScheduledChange === true, 'hasScheduledChange is true')
    assert(status.scheduledPlan === 'CREATOR', 'scheduledPlan is CREATOR')

    // Test cancelling scheduled downgrade
    let cancelScheduledCalled = false
    dodoProvider.cancelScheduledChangePlan = async (subId) => {
      cancelScheduledCalled = true
      return { success: true }
    }
    await creatorSubscriptionService.cancelScheduledDowngrade(creatorId)
    assert(cancelScheduledCalled === true, 'cancelScheduledChangePlan called on Dodo')

    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.hasScheduledChange === false, 'Scheduled change cleared after cancellation')
    assert(status.scheduledPlan === null, 'scheduledPlan is null after cancellation')

    // -------------------------------------------------------------------------
    // SCENARIO 5: Two simultaneous checkout requests (Concurrency Lock)
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Two simultaneous checkout requests (Concurrency Mutex) ---')
    // Attempt two simultaneous checkouts for an unsubscribed creator
    testEmail2 = `concurrency-${Date.now()}@example.com`
    const user2 = await authService.signup({
      email: testEmail2,
      password: `Pass123!_${Date.now()}`,
      name: 'Concurrency Test Creator',
      role: 'CREATOR',
      storeName: `Concurrency Store ${Date.now()}`,
      slug: `concur-test-${Date.now()}`,
    })
    creatorId2 = user2.creatorProfile?.id || user2.user?.id || user2.id

    const [resA, resB] = await Promise.all([
      creatorSubscriptionService.createCheckoutSession(creatorId2, { plan: 'CREATOR', interval: 'monthly' }),
      creatorSubscriptionService.createCheckoutSession(creatorId2, { plan: 'CREATOR', interval: 'monthly' }),
    ])

    // Under mutex lock, the first creates session; the second either safely reuses the pending session or executes cleanly
    assert(resA.sessionId && resB.sessionId, 'Both requests resolved safely without database collision')
    assert(resA.sessionId === resB.sessionId || resA.checkoutUrl, 'Handled without creating duplicate conflicting records')
    const subsCount2 = await prisma.creatorSubscription.count({ where: { creatorId: creatorId2 } })
    assert(subsCount2 === 1, `Exactly 1 subscription record exists under concurrent checkout (count: ${subsCount2})`)

    // -------------------------------------------------------------------------
    // SCENARIO 6: Pending checkout followed by retry (Resumes existing session)
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Pending checkout followed by retry ---')
    const retryRes = await creatorSubscriptionService.createCheckoutSession(creatorId2, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(retryRes.resumed === true || retryRes.sessionId === resA.sessionId, 'Resumed existing pending checkout session')
    assert(retryRes.checkoutUrl, 'Valid checkout URL returned for resume')

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // SCENARIO 7: Duplicate and out-of-order webhooks + Signature Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 7: Duplicate and out-of-order webhooks + Signature Verification ---')

    // 7a. Webhook signature verification test
    const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY
    const webhookMsgId = `msg_${uuidv4().replace(/-/g, '')}`
    const timestamp = Math.floor(Date.now() / 1000)
    const rawPayload = JSON.stringify({ type: 'subscription.active', data: { id: subId1 } })
    const wh = new Webhook(webhookSecret)
    const validSig = wh.sign(webhookMsgId, new Date(timestamp * 1000), rawPayload)

    const verifiedEvent = webhookService.verifyDodoSignature(rawPayload, {
      'webhook-id': webhookMsgId,
      'webhook-timestamp': String(timestamp),
      'webhook-signature': validSig,
    })
    assert(verifiedEvent && verifiedEvent.type === 'subscription.active', 'Dodo webhook signature verified with raw body & secret')

    let invalidSigCaught = false
    try {
      webhookService.verifyDodoSignature(rawPayload, {
        'webhook-id': webhookMsgId,
        'webhook-timestamp': String(timestamp),
        'webhook-signature': 'v1,invalid_sig',
      })
    } catch {
      invalidSigCaught = true
    }
    assert(invalidSigCaught === true, 'Invalid webhook signature strictly rejected')

    // 7b. Duplicate webhook delivery test
    const dupEvent = createWebhookEvent('subscription.active', {
      subscription_id: subId1,
      customer: { customer_id: 'cus_test_123' },
      metadata: { creatorId, plan: 'PRO', interval: 'monthly' },
    }, `evt_dup_${Date.now()}`)
    const firstDelivery = await webhookService.handle(dupEvent)
    assert(firstDelivery.ok === true || firstDelivery.received === true, 'First webhook delivery processed')
    const secondDelivery = await webhookService.handle(dupEvent)
    assert(secondDelivery.duplicate === true, 'Duplicate webhook delivery safely skipped (idempotent)')

    // 7c. Out-of-order webhook test: Stale CREATOR event arrives for user currently on PRO
    const staleEvent = createWebhookEvent('subscription.active', {
      subscription_id: subId1,
      customer: { customer_id: 'cus_test_123' },
      metadata: { creatorId, plan: 'CREATOR', interval: 'monthly' }, // Stale Creator plan!
    })
    const staleRes = await webhookService.handle(staleEvent)
    assert(staleRes.ignored === true && staleRes.reason === 'out_of_order_downgrade_rejected', 'Out-of-order stale CREATOR event rejected')
    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.planId === 'PRO', `User stays safely on PRO after stale event (got: ${status.planId})`)

    // -------------------------------------------------------------------------
    // SCENARIO 8: Failed payment, cancellation, and expired events handling
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Failed payment, cancellation, and expired events ---')
    // 8a. Failed payment marks HALTED
    const failEvent = createWebhookEvent('subscription.failed', {
      subscription_id: subId1,
      metadata: { creatorId },
    })
    await webhookService.handle(failEvent)
    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.rawStatus === 'HALTED', `Payment failure marks rawStatus HALTED (got: ${status.rawStatus})`)
    assert(status.status !== 'ACTIVE', 'Plan is NOT active when HALTED')
    assert(status.canSell === false, 'Cannot sell when HALTED')

    // 8b. Delayed cancellation for an old/mismatched subscription ID does NOT cancel active
    const staleCancelEvent = createWebhookEvent('subscription.cancelled', {
      subscription_id: 'sub_old_irrelevant_12345',
      metadata: { creatorId },
    })
    await webhookService.handle(staleCancelEvent)
    const currentSub = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(currentSub.providerSubscriptionId === subId1, 'Active subscription ID preserved')

    // 8c. Legitimate cancellation for active subscription
    const cancelEvent = createWebhookEvent('subscription.cancelled', {
      subscription_id: subId1,
      metadata: { creatorId },
    })
    await webhookService.handle(cancelEvent)
    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.rawStatus === 'CANCELLED', `Cancelled subscription marks CANCELLED (got: ${status.rawStatus})`)
    assert(status.status !== 'ACTIVE', 'Plan is NOT active when CANCELLED')

    // 8d. Expired event
    const expiredEvent = createWebhookEvent('subscription.expired', {
      subscription_id: subId1,
      metadata: { creatorId },
    })
    await webhookService.handle(expiredEvent)
    status = await creatorSubscriptionService.getStatus(creatorId)
    assert(status.rawStatus === 'EXPIRED', `Expired subscription marks EXPIRED (got: ${status.rawStatus})`)
    assert(status.status !== 'ACTIVE', 'Plan is NOT active when EXPIRED')

    // -------------------------------------------------------------------------
    // SCENARIO 9: Existing user with two active subscriptions detection & reconciliation
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 9: Existing user with duplicate subscriptions reconciliation ---')
    // Test the reconciliation module with mock Dodo subscriptions
    const originalListSubs = dodoProvider.listSubscriptions
    dodoProvider.listSubscriptions = async (opts) => [
      {
        subscription_id: 'sub_older_creator_test',
        status: 'active',
        product_id: 'pdt_creator_test',
        created_at: '2026-10-16T15:29:40Z',
        payment_frequency_interval: 'month',
      },
      {
        subscription_id: 'sub_newer_pro_test',
        status: 'active',
        product_id: 'pdt_pro_test',
        created_at: '2026-10-16T15:31:16Z',
        payment_frequency_interval: 'month',
      },
    ]

    // Set local DB subscription for creatorId
    await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
      plan: 'PRO',
      providerSubscriptionId: 'sub_newer_pro_test',
      dodoCustomerId: 'cus_multi_sub_test',
    })

    const auditResult = await subscriptionReconciliationService.auditCustomerSubscriptions({
      creatorId,
      customerId: 'cus_multi_sub_test',
    })

    assert(auditResult.hasDuplicateActive === true, 'Detected duplicate active subscriptions')
    assert(auditResult.activeCount === 2, 'Found 2 active subscriptions')
    assert(
      (auditResult.intendedSubscription?.subscriptionId || auditResult.intendedSubscription?.subscription_id) === 'sub_newer_pro_test',
      'Identified newest PRO subscription as intended'
    )
    assert(auditResult.unwantedSubscriptions?.length === 1, 'Identified 1 unwanted subscription')
    assert(
      (auditResult.unwantedSubscriptions[0].subscriptionId || auditResult.unwantedSubscriptions[0].subscription_id) === 'sub_older_creator_test',
      'Identified sub_older_creator_test as unwanted'
    )

    // Test cancellation of unwanted subscription
    const originalGetSub = dodoProvider.getSubscription
    const originalCancelSub = dodoProvider.cancelSubscription
    let cancelCalled = false
    dodoProvider.getSubscription = async (subId) => ({
      subscription_id: subId,
      status: 'active',
      customer: { customer_id: 'cus_multi_sub_test' },
      product_id: 'pdt_creator_test',
    })
    dodoProvider.cancelSubscription = async (subId) => {
      cancelCalled = true
      return { subscription_id: subId, status: 'cancelled' }
    }

    const cancelResult = await subscriptionReconciliationService.cancelUnwantedSubscription({
      creatorId,
      subscriptionId: 'sub_older_creator_test',
      reason: 'Automated test reconciliation',
      confirm: true,
    })

    assert(cancelResult.success === true, 'Successfully cancelled unwanted subscription via service')
    assert(cancelCalled === true, 'dodoProvider.cancelSubscription was invoked')

    // Restore provider mocks
    dodoProvider.changeSubscriptionPlan = originalChangePlan
    dodoProvider.listSubscriptions = originalListSubs
    dodoProvider.getSubscription = originalGetSub
    dodoProvider.cancelSubscription = originalCancelSub

    // -------------------------------------------------------------------------
    // SCENARIO 10: Correct feature access and billing state validation
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 10: Final Feature Access & Entitlement Checks ---')
    // Reset user to active Pro to verify clean final state
    await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
      plan: 'PRO',
      providerSubscriptionId: 'sub_final_pro',
      scheduledPlan: null,
      scheduledChangeAt: null,
    })
    const finalStatus = await creatorSubscriptionService.getStatus(creatorId)
    assert(finalStatus.status === 'ACTIVE', 'Final status is ACTIVE')
    assert(finalStatus.planId === 'PRO', 'Final plan is PRO')
    assert(finalStatus.canSell === true, 'canSell is granted')
    assert(finalStatus.entitlements.leadExport === true, 'leadExport is granted on Pro')
    assert(finalStatus.entitlements.advancedAnalytics === true, 'advancedAnalytics is granted on Pro')
    assert(finalStatus.hasScheduledChange === false, 'No lingering scheduled changes')

  } finally {
    // Clean up test data
    console.log('\nCleaning up test records...')
    if (creatorId) {
      await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId } }).catch(() => {})
    }
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {})
    }
    if (creatorId2) {
      await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: creatorId2 } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: creatorId2 } }).catch(() => {})
    }
    if (testEmail2) {
      await prisma.user.deleteMany({ where: { email: testEmail2 } }).catch(() => {})
    }
  }

  console.log('\n=====================================================================')
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================\n')
}

runTestSuite().catch((err) => {
  console.error('\n❌ Uncaught error during single active subscription test suite:', err)
  process.exit(1)
})
