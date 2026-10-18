/**
 * CreatorStore — Stale Payment Lifecycle Management & Cleanup Test Suite
 *
 * Automated verification of all 12 lifecycle requirements:
 *  1. Incomplete checkout older than 30 minutes.
 *  2. Failed payment older than 30 minutes.
 *  3. Successful payment discovered during cleanup.
 *  4. Provider still reports Processing after timeout.
 *  5. Provider API unavailable during cleanup.
 *  6. Delayed success webhook after timeout.
 *  7. Duplicate webhook delivery.
 *  8. Two cleanup workers attempting the same record.
 *  9. Stale plan change that Dodo will not allow to be cancelled.
 * 10. Retry after the previous operation is safely resolved.
 * 11. No accidental cancellation of an active subscription.
 * 12. No duplicate billing or Pro entitlement grants.
 */

import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
  webhookService,
} from '../lib/services.js'
import {
  creatorSubscriptionsRepo,
  usersRepo,
  subscriptionAuditLogsRepo,
  webhookEventsRepo,
  ordersRepo,
} from '../lib/repos.js'
import { dodoProvider, getPendingPaymentTTLMinutes } from '../lib/dodo.js'
import {
  paymentLifecycleService,
  withPaymentLock,
  reconcilePendingSubscriptionCheckout,
  reconcilePendingPlanUpgrade,
  reconcilePendingOrder,
} from '../lib/payment-lifecycle.js'

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
  console.log('\n===============================================================')
  console.log('🧪 Stale Payment Lifecycle & Cleanup Automated Test Suite')
  console.log('===============================================================\n')

  const testEmail = `lifecycle_test_${Date.now()}@example.com`
  let user = null
  const originalGetCheckoutSession = dodoProvider.getCheckoutSession
  const originalGetPayment = dodoProvider.getPayment
  const originalGetSubscription = dodoProvider.getSubscription
  const originalListPayments = dodoProvider.listPayments
  const originalGetClient = dodoProvider.getClient
  const originalChangeSubscriptionPlan = dodoProvider.changeSubscriptionPlan

  try {
    // Setup test user
    const regResult = await authService.signup({
      name: 'Lifecycle Tester',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'CREATOR',
      storeName: `Lifecycle Store ${Date.now()}`,
      slug: `lifecycle-store-${Date.now()}`,
    })
    user = regResult.user
    const creatorId = user.id
    console.log(`  Initialized test user ${creatorId} (${testEmail})`)

    // ---------------------------------------------------------------------------
    // TEST 1: Incomplete checkout older than 30 minutes
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Incomplete checkout older than 30 minutes ---')
    const staleSessionId = `cks_test_stale_${Date.now()}`
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000)

    // Seed a pending checkout subscription
    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'PENDING',
      plan: 'CREATOR',
      provider: 'DODO',
      dodoSubscriptionId: staleSessionId,
      providerSubscriptionId: staleSessionId,
    })
    // Backdate timestamps directly in Postgres
    await prisma.$executeRawUnsafe(
      `UPDATE creator_subscriptions SET created_at = $1, updated_at = $1 WHERE creator_id = $2::uuid`,
      fortyFiveMinutesAgo,
      creatorId
    )

    // Mock Dodo: session exists, customer abandoned at details collection / unpaid
    dodoProvider.getCheckoutSession = async (id) => ({
      session_id: id,
      payment_status: null,
      status: 'active',
      subscription_id: null,
    })

    const res1 = await reconcilePendingSubscriptionCheckout(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res1.resolved === true, 'Cleanup resolved stale incomplete checkout')
    assert(res1.action === 'EXPIRED', 'Action was marked EXPIRED')
    const sub1 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub1.status === 'EXPIRED', 'Database subscription status transitioned to EXPIRED')

    // ---------------------------------------------------------------------------
    // TEST 2: Failed payment older than 30 minutes
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Failed payment older than 30 minutes ---')
    const failedSessionId = `cks_test_failed_${Date.now()}`
    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'PENDING',
      plan: 'CREATOR',
      provider: 'DODO',
      dodoSubscriptionId: failedSessionId,
      providerSubscriptionId: failedSessionId,
      createdAt: fortyFiveMinutesAgo,
      updatedAt: fortyFiveMinutesAgo,
    })

    dodoProvider.getCheckoutSession = async (id) => ({
      session_id: id,
      payment_status: 'failed',
      status: 'failed',
      subscription_id: null,
    })

    const res2 = await reconcilePendingSubscriptionCheckout(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res2.resolved === true, 'Failed checkout resolved')
    assert(res2.action === 'MARKED_FAILED', 'Failed checkout action recorded MARKED_FAILED')
    const sub2 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub2.status === 'FAILED', 'Database subscription status transitioned to FAILED')

    // ---------------------------------------------------------------------------
    // TEST 3: Successful payment discovered during cleanup
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Successful payment discovered during cleanup ---')
    const successSessionId = `cks_test_success_${Date.now()}`
    const successPaymentId = `pay_test_success_${Date.now()}`
    const successSubId = `sub_test_success_${Date.now()}`

    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'PENDING',
      plan: 'PRO',
      provider: 'DODO',
      dodoSubscriptionId: successSessionId,
      providerSubscriptionId: successSessionId,
      createdAt: fortyFiveMinutesAgo,
      updatedAt: fortyFiveMinutesAgo,
    })

    dodoProvider.getCheckoutSession = async (id) => ({
      session_id: id,
      payment_status: 'succeeded',
      payment_id: successPaymentId,
      subscription_id: successSubId,
      status: 'completed',
    })
    dodoProvider.getSubscription = async (id) => ({
      subscription_id: id,
      status: 'active',
      product_id: 'p_pro_monthly',
      next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    })

    const res3 = await reconcilePendingSubscriptionCheckout(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res3.resolved === true, 'Discovered successful payment resolved')
    assert(res3.action === 'ACTIVATED', 'Discovered successful payment activated subscription')
    const sub3 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub3.status === 'ACTIVE', 'Database subscription status is now ACTIVE')
    assert(sub3.plan === 'PRO', 'Database plan is authoritatively PRO')
    assert(sub3.dodoPaymentId === successPaymentId, 'dodoPaymentId is recorded')

    // ---------------------------------------------------------------------------
    // TEST 4: Provider still reports Processing after timeout
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Provider still reports Processing after timeout ---')
    const processingSessionId = `cks_test_processing_${Date.now()}`
    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'PENDING',
      plan: 'CREATOR',
      provider: 'DODO',
      dodoSubscriptionId: processingSessionId,
      providerSubscriptionId: processingSessionId,
    })
    await prisma.$executeRawUnsafe(
      `UPDATE creator_subscriptions SET created_at = $1, updated_at = $1 WHERE creator_id = $2::uuid`,
      fortyFiveMinutesAgo,
      creatorId
    )

    dodoProvider.getCheckoutSession = async (id) => ({
      session_id: id,
      payment_status: 'processing',
      status: 'active',
      subscription_id: null,
    })

    const res4 = await reconcilePendingSubscriptionCheckout(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res4.resolved === false, 'Did not falsely mark processing payment resolved')
    assert(res4.action === 'RETAIN_PROCESSING_PENDING', 'Retained pending state for reconciliation')
    const sub4 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub4.status === 'PENDING', 'Database subscription preserved PENDING status')

    // ---------------------------------------------------------------------------
    // TEST 5: Provider API unavailable during cleanup (transient 503)
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Provider API unavailable during cleanup ---')
    dodoProvider.getCheckoutSession = async () => {
      const err = new Error('503 Service Unavailable: Provider API temporary outage')
      err.status = 503
      throw err
    }

    const res5 = await reconcilePendingSubscriptionCheckout(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res5.skipped === true, 'Skipped record when API is unavailable')
    assert(res5.reason === 'API_UNAVAILABLE', 'Reason logged as API_UNAVAILABLE')
    const sub5 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub5.status === 'PENDING', 'Local record preserved without corruption')

    // ---------------------------------------------------------------------------
    // TEST 6: Delayed success webhook after timeout
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Delayed success webhook after timeout ---')
    // Reset subscription to EXPIRED (as if cleanup had expired it earlier)
    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'EXPIRED',
      plan: 'CREATOR',
      provider: 'DODO',
      dodoSubscriptionId: staleSessionId,
      providerSubscriptionId: staleSessionId,
    })

    // Now a delayed payment.succeeded webhook arrives from Dodo
    const delayedEventId = `evt_delayed_${Date.now()}`
    const delayedWebhookResult = await webhookService.processDodoEvent({
      event_id: delayedEventId,
      type: 'payment.succeeded',
      created_at: new Date().toISOString(),
      data: {
        id: `pay_delayed_${Date.now()}`,
        subscription_id: staleSessionId,
        product_id: 'p_pro_monthly',
        metadata: {
          creatorId,
          plan: 'PRO',
        },
      },
    })

    assert(delayedWebhookResult.ok === true, 'Delayed webhook processed successfully')
    const sub6 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub6.status === 'ACTIVE', 'Subscription was authoritatively revived to ACTIVE')
    assert(sub6.plan === 'PRO', 'Plan was upgraded to PRO')

    // ---------------------------------------------------------------------------
    // TEST 7: Duplicate webhook delivery
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Duplicate webhook delivery ---')
    const dupResult = await webhookService.processDodoEvent({
      event_id: delayedEventId, // same event ID
      type: 'payment.succeeded',
      created_at: new Date().toISOString(),
      data: {
        id: `pay_delayed_${Date.now()}`,
        subscription_id: staleSessionId,
        metadata: { creatorId, plan: 'PRO' },
      },
    })

    assert(dupResult.duplicate === true, 'Duplicate webhook identified and skipped idempotently')

    // ---------------------------------------------------------------------------
    // TEST 8: Two cleanup workers attempting the same record concurrently
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Two cleanup workers attempting same record ---')
    const lockKey = `lock_sub_concurrent_${Date.now()}`
    let worker1Acquired = false
    let worker2Skipped = false

    await withPaymentLock(lockKey, async () => {
      worker1Acquired = true
      // Concurrently simulate Worker 2 attempting the same lock
      const w2Res = await withPaymentLock(lockKey, async () => {
        return { executed: true }
      })
      if (w2Res && w2Res.skipped && w2Res.reason === 'CONCURRENT_WORKER_ACTIVE') {
        worker2Skipped = true
      }
    })

    assert(worker1Acquired === true, 'Worker 1 acquired distributed lock')
    assert(worker2Skipped === true, 'Worker 2 cleanly skipped due to active lock')

    // ---------------------------------------------------------------------------
    // TEST 9: Stale plan change that Dodo will not allow to be cancelled
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Stale plan change that Dodo will not allow to be cancelled ---')
    const activeSubDodoId = `sub_active_creator_${Date.now()}`
    const staleUpgradePayId = `pay_stale_upgrade_${Date.now()}`

    // Setup active Creator subscriber with a stale processing upgrade (22h old)
    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'ACTIVE',
      plan: 'CREATOR',
      provider: 'DODO',
      dodoSubscriptionId: activeSubDodoId,
      providerSubscriptionId: activeSubDodoId,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      pendingUpgradePlan: 'PRO',
      pendingUpgradePaymentId: staleUpgradePayId,
      pendingUpgradeStatus: 'PROCESSING',
      pendingUpgradeStartedAt: new Date(Date.now() - 22 * 3600 * 1000), // 22 hours ago
      pendingUpgradeAmount: 29,
      pendingUpgradeCurrency: 'USD',
    })

    // Mock Dodo: payment list returns the 22h old payment still in 'processing'
    dodoProvider.listPayments = async () => [
      {
        payment_id: staleUpgradePayId,
        charge_type: 'plan_change',
        status: 'processing',
        created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
      },
    ]

    const subForUpgrade = await creatorSubscriptionsRepo.getByCreator(creatorId)
    const res9 = await reconcilePendingPlanUpgrade(subForUpgrade, { ttlMinutes: 30 })

    assert(res9.action === 'FLAGGED_STALE_PROCESSING', 'Flagged as FLAGGED_STALE_PROCESSING')
    assert(res9.needsAttention === true, 'needsAttention set to true')

    const sub9 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub9.status === 'ACTIVE', 'Creator subscription remained ACTIVE')
    assert(sub9.plan === 'CREATOR', 'Creator plan preserved (not cancelled or prematurely PRO)')
    assert(sub9.pendingUpgradeStatus === 'STALE_PROCESSING', 'Upgrade status marked STALE_PROCESSING')

    // Inspect getStatus() response for Billing UI
    const statusObj = await creatorSubscriptionService.getStatus(creatorId)
    assert(statusObj.pendingUpgrade !== null, 'pendingUpgrade object present in status')
    assert(statusObj.pendingUpgrade.isStale === true, 'pendingUpgrade.isStale is true')
    assert(statusObj.pendingUpgrade.needsAttention === true, 'pendingUpgrade.needsAttention is true')
    assert(statusObj.pendingUpgrade.message.includes('22 hour'), 'Status message describes stale processing time')

    // Attempting checkout upgrade while Dodo reports 409 conflict
    dodoProvider.changeSubscriptionPlan = async () => {
      const err = new Error('a pending plan change already exists')
      err.status = 409
      throw err
    }

    let caught409 = null
    try {
      await creatorSubscriptionService.createCheckoutSession(creatorId, {
        plan: 'PRO',
        billingInterval: 'monthly',
      })
    } catch (e) {
      caught409 = e
    }

    assert(caught409 !== null, 'Caught 409 on upgrade attempt')
    assert(caught409.status === 409 || caught409.statusCode === 409, 'Error HTTP status is 409')
    assert(caught409.message.includes('update payment method') || caught409.message.includes('payment method'), 'Actionable resolution message provided')

    // ---------------------------------------------------------------------------
    // TEST 10: Retry after previous operation is safely resolved
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Retry after previous operation safely resolved ---')
    // Now Dodo confirms the previous payment failed (e.g. card authentication failed)
    dodoProvider.listPayments = async () => [
      {
        payment_id: staleUpgradePayId,
        charge_type: 'plan_change',
        status: 'failed',
        error_message: 'Customer 3DS authentication timed out',
        created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
      },
    ]

    const res10 = await reconcilePendingPlanUpgrade(
      await creatorSubscriptionsRepo.getByCreator(creatorId),
      { ttlMinutes: 30 }
    )

    assert(res10.action === 'UPGRADE_FAILED_RELEASED', 'Stale lock released after terminal failure')
    const sub10 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub10.pendingUpgradeStatus === 'FAILED', 'Upgrade status marked FAILED')
    assert(sub10.pendingUpgradeErrorMessage.includes('timed out'), 'Stored sanitized error message')

    // Mock Dodo succeeding on a fresh upgrade attempt
    const newPayId = `pay_new_upgrade_${Date.now()}`
    dodoProvider.changeSubscriptionPlan = async () => ({
      subscription_id: activeSubDodoId,
      payment_id: newPayId,
      status: 'pending',
      payment_link: 'https://checkout.dodopayments.com/pay_new',
    })

    const retryUpgradeRes = await creatorSubscriptionService.createCheckoutSession(creatorId, {
      plan: 'PRO',
      billingInterval: 'monthly',
    })

    assert(retryUpgradeRes.flowType === 'plan_change' || retryUpgradeRes.checkoutUrl, 'Retry upgrade succeeded after safe resolution')
    assert(retryUpgradeRes.sessionId === newPayId || (retryUpgradeRes.checkoutUrl && retryUpgradeRes.checkoutUrl.includes('pay_new')), 'Fresh payment initiated')

    // ---------------------------------------------------------------------------
    // TEST 11: No accidental cancellation of an active subscription
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 11: No accidental cancellation of an active subscription ---')
    // Ensure active subscription remains ACTIVE after entire cleanup sweep
    const cleanupSummary = await paymentLifecycleService.runStalePaymentCleanup({ ttlMinutes: 30 })
    const sub11 = await creatorSubscriptionsRepo.getByCreator(creatorId)

    assert(sub11.status === 'ACTIVE', 'Active subscription was NOT cancelled during cleanup sweep')
    assert(sub11.plan === 'CREATOR', 'Creator entitlement preserved intact')

    // ---------------------------------------------------------------------------
    // TEST 12: No duplicate billing or Pro entitlement grants
    // ---------------------------------------------------------------------------
    console.log('\n--- Scenario 12: No duplicate billing or Pro entitlement grants ---')
    // Verify single active subscription in database (no second row created)
    const allSubsForCreator = await prisma.creatorSubscription.findMany({
      where: { creatorId },
    })

    assert(allSubsForCreator.length === 1, `Exactly 1 subscription record exists for creator (found: ${allSubsForCreator.length})`)

    // Verify Pro is not granted on status query
    const status12 = await creatorSubscriptionService.getStatus(creatorId)
    assert(status12.planId === 'CREATOR', 'User is still CREATOR, Pro not granted prematurely')

    // Now send authoritative payment.succeeded webhook for newPayId
    await webhookService.processDodoEvent({
      event_id: `evt_confirm_pro_${Date.now()}`,
      type: 'payment.succeeded',
      created_at: new Date().toISOString(),
      data: {
        id: newPayId,
        subscription_id: activeSubDodoId,
        product_id: 'p_pro_monthly',
        metadata: {
          creatorId,
          plan: 'PRO',
        },
      },
    })

    const sub12 = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(sub12.plan === 'PRO', 'Authoritatively upgraded to PRO on verified payment')
    assert(sub12.pendingUpgradeStatus === null, 'Pending upgrade lock cleared after success')

    console.log('\n===============================================================')
    console.log(`🎉 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`)
    console.log('===============================================================\n')

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED with error:', err)
    process.exit(1)
  } finally {
    // Restore original mock functions
    dodoProvider.getCheckoutSession = originalGetCheckoutSession
    dodoProvider.getPayment = originalGetPayment
    dodoProvider.getSubscription = originalGetSubscription
    dodoProvider.listPayments = originalListPayments
    dodoProvider.getClient = originalGetClient
    dodoProvider.changeSubscriptionPlan = originalChangeSubscriptionPlan

    // Cleanup test user
    if (user?.id) {
      await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.order.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  }
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
