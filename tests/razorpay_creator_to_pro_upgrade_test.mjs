/**
 * Comprehensive Automated Test Suite for CreatorStore:
 * Automatically Replace Creator Subscription with Pro on Upgrade
 *
 * Verifies all 12 required test cases:
 * 1. Creator → Pro upgrade succeeds and Pro becomes the effective plan.
 * 2. Creator subscription is cancelled after Pro activation is confirmed.
 * 3. Pro payment fails and Creator remains active.
 * 4. Pro subscription remains pending and Creator remains active.
 * 5. Creator cancellation API fails after Pro activation; reconciliation retries safely.
 * 6. Duplicate upgrade requests do not create duplicate subscriptions.
 * 7. Duplicate and out-of-order webhooks do not restore Creator over Pro.
 * 8. Billing UI/status shows "You've upgraded to Pro!" after a successful upgrade.
 * 9. Billing UI does not falsely claim Creator cancellation succeeded.
 * 10. Existing cancellation and downgrade flows retain their correct messaging.
 * 11. Subscription history and audit logs remain intact.
 * 12. International Dodo subscription behavior remains unaffected.
 */

import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
} from '../lib/services.js'
import { razorpaySubscriptionLifecycleService } from '../lib/razorpay-subscription-lifecycle.js'
import {
  creatorSubscriptionsRepo,
  subscriptionAuditLogsRepo,
  subscriptionInvoicesRepo,
  usersRepo,
} from '../lib/repos.js'
import { getPaymentProvider } from '../lib/payments.js'
import { dodoProvider } from '../lib/dodo.js'
import { retryFailedUpgradeCancellations } from '../lib/subscription-reconciliation.js'

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

async function runTestSuite() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: RAZORPAY CREATOR → PRO UPGRADE TEST SUITE')
  console.log('=====================================================================\n')

  const rzpProvider = getPaymentProvider()
  const originalCreateSub = rzpProvider.createSubscription.bind(rzpProvider)
  const originalCancelSub = rzpProvider.cancelSubscription.bind(rzpProvider)
  const originalFetchSub = rzpProvider.fetchSubscription.bind(rzpProvider)
  const originalVerifySig = rzpProvider.verifySubscriptionSignature.bind(rzpProvider)
  const originalDodoCreate = dodoProvider.createSubscriptionCheckoutSession.bind(dodoProvider)
  const originalDodoCancel = dodoProvider.cancelSubscription.bind(dodoProvider)

  let testUser = null

  try {
    // Setup test Indian creator user
    const userEmail = `rzp-upgrade-test-${Date.now()}@example.com`
    const createdUser = await authService.signup({
      email: userEmail,
      password: 'SecurePassword123!',
      name: 'Rzp Upgrade Tester',
      role: 'CREATOR',
      storeName: `Rzp Store ${Date.now()}`,
      slug: `rzp-store-${Date.now()}`,
      country: 'IN',
    })
    const userId = createdUser.user?.id || createdUser.id
    testUser = { id: userId, email: userEmail }

    // Mock Razorpay signature verification
    rzpProvider.verifySubscriptionSignature = () => true

    // -------------------------------------------------------------------------
    // Scenario 0: Initial Creator Subscription Setup (₹499/mo)
    // -------------------------------------------------------------------------
    console.log('\n--- 0. Setup Initial Active Creator Subscription (₹499/mo) ---')
    const creatorSubId = `sub_rzp_creator_${Date.now()}`
    const creatorPayId = `pay_rzp_creator_${Date.now()}`

    rzpProvider.createSubscription = async () => ({
      id: creatorSubId,
      status: 'created',
      keyId: 'rzp_test_mock',
    })

    const initCheckout = await creatorSubscriptionService.createCheckoutSession(testUser.id, {
      plan: 'CREATOR',
      interval: 'MONTHLY',
    })
    assert(initCheckout.subscriptionId === creatorSubId, '0: Checkout created initial Creator subscription')

    // Activate initial Creator subscription via webhook
    const creatorActivateRes = await razorpaySubscriptionLifecycleService.processWebhookEvent({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: creatorSubId,
            plan_id: 'plan_creator_monthly',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            notes: { creatorId: testUser.id },
          },
        },
        payment: {
          entity: {
            id: creatorPayId,
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    })
    assert(creatorActivateRes.ok && creatorActivateRes.status === 'ACTIVE', '0: Creator subscription activated successfully')

    const dbCreatorSub = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(dbCreatorSub.status === 'ACTIVE' && dbCreatorSub.plan === 'CREATOR', '0: DB confirms active Creator subscription at ₹499/mo')
    assert(dbCreatorSub.providerSubscriptionId === creatorSubId, '0: Provider subscription ID correctly set to Creator sub')

    // -------------------------------------------------------------------------
    // Scenario 4: Pro subscription remains pending and Creator remains active
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Pro subscription remains pending and Creator remains active ---')
    const proPendingSubId = `sub_rzp_pro_pending_${Date.now()}`
    rzpProvider.createSubscription = async (params) => {
      assert(params.priceInr === 999, '4: Upgrade checkout uses Pro pricing ₹999')
      return {
        id: proPendingSubId,
        status: 'created',
        keyId: 'rzp_test_mock',
      }
    }

    const upgradeCheckoutRes = await creatorSubscriptionService.createCheckoutSession(testUser.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
    })
    assert(upgradeCheckoutRes.isUpgrade === true, '4: Checkout session identifies upgrade flow')
    assert(upgradeCheckoutRes.subscriptionId === proPendingSubId, '4: Checkout session returns new Pro subscription ID')

    // Verify creator plan and entitlement are PRESERVED while checkout is pending
    const subDuringPending = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(subDuringPending.status === 'ACTIVE' && subDuringPending.plan === 'CREATOR', '4: Creator subscription remains ACTIVE during checkout')
    assert(subDuringPending.providerSubscriptionId === creatorSubId, '4: Creator provider ID not overwritten prematurely')
    assert(subDuringPending.pendingUpgradeStatus === 'PENDING_CHECKOUT', '4: Pending upgrade state recorded')
    assert(subDuringPending.pendingUpgradePaymentId === proPendingSubId, '4: Pending upgrade ID tracked')

    const statusDuringPending = await creatorSubscriptionService.getStatus(testUser.id)
    assert(statusDuringPending.planId === 'CREATOR', '4: Effective plan remains CREATOR while checkout is pending')
    assert(statusDuringPending.pendingUpgrade !== null, '4: Pending upgrade info exposed in status')

    // -------------------------------------------------------------------------
    // Scenario 6: Duplicate upgrade requests do not create duplicate subscriptions
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Duplicate upgrade requests do not create duplicate subscriptions ---')
    let secondCreateCallCount = 0
    rzpProvider.createSubscription = async () => {
      secondCreateCallCount++
      return { id: `sub_should_not_be_created_${Date.now()}` }
    }

    const duplicateCheckoutRes = await creatorSubscriptionService.createCheckoutSession(testUser.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
    })
    assert(secondCreateCallCount === 0, '6: Duplicate click within TTL did not call Razorpay API to create duplicate subscription')
    assert(duplicateCheckoutRes.subscriptionId === proPendingSubId, '6: Reused existing pending checkout session')
    assert(duplicateCheckoutRes.resumed === true, '6: Session correctly marked as resumed')

    // -------------------------------------------------------------------------
    // Scenario 3: Pro payment fails and Creator remains active
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Pro payment fails and Creator remains active ---')
    const failedPaymentRes = await razorpaySubscriptionLifecycleService.processWebhookEvent({
      event: 'payment.failed',
      payload: {
        subscription: {
          entity: { id: proPendingSubId },
        },
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            amount: 99900,
            currency: 'INR',
            error_description: 'Card was declined by issuing bank',
          },
        },
      },
    })
    assert(failedPaymentRes.ok && failedPaymentRes.creatorRetained === true, '3: Handled upgrade payment failure safely')

    const subAfterFail = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(subAfterFail.status === 'ACTIVE' && subAfterFail.plan === 'CREATOR', '3: Creator subscription remains ACTIVE after Pro payment failure')
    assert(subAfterFail.pendingUpgradeStatus === 'FAILED', '3: Pending upgrade status marked as FAILED')

    // -------------------------------------------------------------------------
    // Scenario 1 & 2: Creator → Pro upgrade succeeds and Creator is cancelled
    // -------------------------------------------------------------------------
    console.log('\n--- 1 & 2. Creator → Pro upgrade succeeds and Creator is cancelled ---')
    const proSuccessSubId = `sub_rzp_pro_success_${Date.now()}`
    const proSuccessPayId = `pay_rzp_pro_success_${Date.now()}`

    let creatorCancelledOnRzp = false
    let cancelledSubId = null
    rzpProvider.cancelSubscription = async (id, atCycleEnd) => {
      creatorCancelledOnRzp = true
      cancelledSubId = id
      return { id, status: 'cancelled' }
    }

    // Client verifies Pro payment
    const verifyProRes = await creatorSubscriptionService.verifySubscriptionPayment(testUser.id, {
      razorpaySubscriptionId: proSuccessSubId,
      razorpayPaymentId: proSuccessPayId,
      razorpaySignature: 'valid_sig_mock',
    })
    assert(verifyProRes.status === 'ACTIVE' && verifyProRes.plan === 'PRO', '1: Pro upgrade verified and activated')
    assert(verifyProRes.upgraded === true, '1: Response confirms successful upgrade')

    const subAfterUpgrade = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(subAfterUpgrade.status === 'ACTIVE' && subAfterUpgrade.plan === 'PRO', '1: Database confirms PRO is now the active plan')
    assert(subAfterUpgrade.providerSubscriptionId === proSuccessSubId, '1: Provider subscription ID updated to Pro subscription ID')
    assert(creatorCancelledOnRzp === true, '2: Razorpay cancel API called for previous subscription')
    assert(cancelledSubId === creatorSubId, '2: Exact previous Creator subscription ID was cancelled on Razorpay')

    const supersedeAuditLog = await prisma.subscriptionAuditLog.findFirst({
      where: {
        creatorId: testUser.id,
        event: 'SUPERSEDED_SUBSCRIPTION_CANCELLED',
      },
    })
    assert(supersedeAuditLog !== null, '2: Audit log records SUPERSEDED_SUBSCRIPTION_CANCELLED')
    assert(supersedeAuditLog.metadata?.reason === 'plan_upgraded', '2: Old subscription cancellation reason recorded as plan_upgraded')
    assert(supersedeAuditLog.metadata?.newSubscriptionId === proSuccessSubId, '2: Cancellation links to replacement Pro subscription')

    // -------------------------------------------------------------------------
    // Scenario 7: Duplicate and out-of-order webhooks do not restore Creator over Pro
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Duplicate and out-of-order webhooks do not restore Creator over Pro ---')
    // A delayed webhook arrives for the old Creator subscription
    const delayedCreatorWebhookRes = await razorpaySubscriptionLifecycleService.processWebhookEvent({
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: creatorSubId,
            plan_id: 'plan_creator_monthly',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            notes: { creatorId: testUser.id },
          },
        },
        payment: {
          entity: {
            id: `pay_delayed_${Date.now()}`,
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    })
    assert(delayedCreatorWebhookRes.ignored === true, '7: Delayed Creator event ignored because user is active on Pro')
    assert(delayedCreatorWebhookRes.reason === 'secondary_subscription_ignored', '7: Ignored with secondary_subscription_ignored reason')

    const subAfterDelayedWebhook = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(subAfterDelayedWebhook.plan === 'PRO' && subAfterDelayedWebhook.status === 'ACTIVE', '7: Delayed webhook did not revert Pro plan to Creator')

    // When Razorpay delivers subscription.cancelled for the old Creator subscription
    const rzpCancelOldWebhookRes = await razorpaySubscriptionLifecycleService.processWebhookEvent({
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: creatorSubId,
            notes: { creatorId: testUser.id },
          },
        },
      },
    })
    assert(rzpCancelOldWebhookRes.status === 'SUPERSEDED_CANCELLED', '7: Cancellation event for old sub marked SUPERSEDED_CANCELLED')

    const subAfterCancelWebhook = await creatorSubscriptionsRepo.getByCreator(testUser.id)
    assert(subAfterCancelWebhook.status === 'ACTIVE' && subAfterCancelWebhook.plan === 'PRO', '7: Old sub cancellation did not cancel active Pro plan')

    // -------------------------------------------------------------------------
    // Scenario 8: Billing UI / status shows "You've upgraded to Pro!"
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Billing UI/status shows "You\'ve upgraded to Pro!" ---')
    const finalStatus = await creatorSubscriptionService.getStatus(testUser.id)
    assert(finalStatus.status === 'ACTIVE', '8: Status is ACTIVE')
    assert(finalStatus.planId === 'PRO', '8: Current Plan is PRO')
    assert(finalStatus.isUpgraded === true, '8: Status flags user as upgraded')
    assert(finalStatus.previousPlan === 'Creator', '8: Previous Plan identified as Creator')
    assert(finalStatus.previousSubscription === 'Replaced by Pro Plan', '8: Previous subscription marked as Replaced by Pro Plan')
    assert(finalStatus.isSubscriptionCancelled === false, '8: isSubscriptionCancelled is false (suppresses cancellation banner)')

    // -------------------------------------------------------------------------
    // Scenario 5: Creator cancellation API fails after Pro activation; reconciliation retries safely
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Creator cancellation API fails after Pro activation; reconciliation retries safely ---')
    const user2Email = `rzp-upgrade-fail-cancel-${Date.now()}@example.com`
    const createdUser2 = await authService.signup({
      email: user2Email,
      password: 'SecurePassword123!',
      name: 'Rzp Cancel Fail Tester',
      role: 'CREATOR',
      storeName: `Rzp Store 2 ${Date.now()}`,
      slug: `rzp-store-2-${Date.now()}`,
      country: 'IN',
    })
    const user2Id = createdUser2.user?.id || createdUser2.id

    const u2CreatorSubId = `sub_rzp_u2_creator_${Date.now()}`
    const u2ProSubId = `sub_rzp_u2_pro_${Date.now()}`

    // Start user 2 on Creator
    await creatorSubscriptionsRepo.upsert(user2Id, {
      status: 'ACTIVE',
      plan: 'CREATOR',
      provider: 'RAZORPAY',
      providerSubscriptionId: u2CreatorSubId,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      price: 499,
      amount: 499,
      currency: 'INR',
    })

    // Record pending upgrade checkout state
    await creatorSubscriptionsRepo.updateStatus(user2Id, 'ACTIVE', {
      pendingUpgradeStatus: 'PENDING_CHECKOUT',
      pendingUpgradePaymentId: u2ProSubId,
      pendingUpgradePlan: 'PRO',
    })

    // Simulate Razorpay cancel API temporarily throwing a network/503 error
    let cancelAttemptCount = 0
    rzpProvider.cancelSubscription = async (id) => {
      cancelAttemptCount++
      if (cancelAttemptCount === 1) {
        throw new Error('Razorpay 503 Service Unavailable: temporary gateway failure')
      }
      return { id, status: 'cancelled' }
    }

    // Trigger upgrade via webhook
    const u2UpgradeRes = await razorpaySubscriptionLifecycleService.processWebhookEvent({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: u2ProSubId,
            plan_id: 'plan_pro_monthly',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            notes: { creatorId: user2Id },
          },
        },
        payment: {
          entity: {
            id: `pay_u2_pro_${Date.now()}`,
            amount: 99900,
            currency: 'INR',
          },
        },
      },
    })
    assert(u2UpgradeRes.ok && u2UpgradeRes.status === 'ACTIVE', '5: Pro upgrade activated despite old sub cancellation failure')

    // Confirm User 2 retains PRO and was not downgraded
    const u2DbSub = await creatorSubscriptionsRepo.getByCreator(user2Id)
    assert(u2DbSub.plan === 'PRO' && u2DbSub.status === 'ACTIVE', '5: User retains Pro as active plan; cancellation failure did not revert')

    // Check cancellation failure audit record
    const failAudit = await prisma.subscriptionAuditLog.findFirst({
      where: {
        creatorId: user2Id,
        event: 'UPGRADE_OLD_SUBSCRIPTION_CANCEL_FAILED',
      },
    })
    assert(failAudit !== null, '5: Recorded UPGRADE_OLD_SUBSCRIPTION_CANCEL_FAILED audit log')

    // Run reconciliation retry worker
    console.log('  Running retryFailedUpgradeCancellations reconciliation job...')
    const retryResults = await retryFailedUpgradeCancellations()
    assert(retryResults.length > 0 && retryResults.some(r => r.oldSubId === u2CreatorSubId && r.success === true), '5: Reconciliation retry successfully cancelled old subscription')

    // -------------------------------------------------------------------------
    // Scenario 9: Billing UI does not falsely claim Creator cancellation succeeded
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Billing UI does not falsely claim Creator cancellation succeeded ---')
    // Before retry, previousSubscriptionCancelledConfirmed should be false if cancel failed
    const user3Email = `rzp-uncancelled-${Date.now()}@example.com`
    const createdUser3 = await authService.signup({
      email: user3Email,
      password: 'SecurePassword123!',
      name: 'Rzp UI Verification Tester',
      role: 'CREATOR',
      storeName: `Rzp Store 3 ${Date.now()}`,
      slug: `rzp-store-3-${Date.now()}`,
      country: 'IN',
    })
    const user3Id = createdUser3.user?.id || createdUser3.id

    await creatorSubscriptionsRepo.upsert(user3Id, {
      status: 'ACTIVE',
      plan: 'PRO',
      provider: 'RAZORPAY',
      providerSubscriptionId: `sub_u3_pro_${Date.now()}`,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      price: 999,
      amount: 999,
      currency: 'INR',
    })
    // Record only PLAN_UPGRADE_COMPLETED, without SUPERSEDED_SUBSCRIPTION_CANCELLED
    await subscriptionAuditLogsRepo.record(user3Id, 'PLAN_UPGRADE_COMPLETED', {
      fromPlan: 'CREATOR',
      toPlan: 'PRO',
    })
    await subscriptionAuditLogsRepo.record(user3Id, 'UPGRADE_OLD_SUBSCRIPTION_CANCEL_FAILED', {
      oldSubscriptionId: `sub_u3_creator_stuck_${Date.now()}`,
    })

    const u3Status = await creatorSubscriptionService.getStatus(user3Id)
    assert(u3Status.isUpgraded === true, '9: Shows upgraded state')
    assert(u3Status.previousSubscriptionCancelledConfirmed === false, '9: Does NOT falsely claim previous subscription was cancelled')

    // -------------------------------------------------------------------------
    // Scenario 10: Existing cancellation and downgrade flows retain correct messaging
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Existing cancellation and downgrade flows retain correct messaging ---')
    const user4Email = `rzp-cancel-flow-${Date.now()}@example.com`
    const createdUser4 = await authService.signup({
      email: user4Email,
      password: 'SecurePassword123!',
      name: 'Rzp Cancel Flow Tester',
      role: 'CREATOR',
      storeName: `Rzp Store 4 ${Date.now()}`,
      slug: `rzp-store-4-${Date.now()}`,
      country: 'IN',
    })
    const user4Id = createdUser4.user?.id || createdUser4.id
    const u4SubId = `sub_rzp_u4_active_${Date.now()}`

    await creatorSubscriptionsRepo.upsert(user4Id, {
      status: 'ACTIVE',
      plan: 'CREATOR',
      provider: 'RAZORPAY',
      providerSubscriptionId: u4SubId,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      price: 499,
      amount: 499,
      currency: 'INR',
    })

    let rzpCancelCalledForU4 = false
    rzpProvider.cancelSubscription = async (id, atCycleEnd) => {
      rzpCancelCalledForU4 = true
      return { id, status: 'cancelled' }
    }

    const cancelRes = await creatorSubscriptionService.cancelSubscription(user4Id)
    assert(cancelRes.status === 'CANCELLED', '10: Standard user cancellation returns CANCELLED')
    assert(rzpCancelCalledForU4 === true, '10: Cancelled via Razorpay API')

    const u4DbSub = await creatorSubscriptionsRepo.getByCreator(user4Id)
    assert(u4DbSub.status === 'CANCELLED', '10: Database marks subscription CANCELLED')
    assert(u4DbSub.cancellationReason === 'USER_CANCELLED', '10: Cancellation reason is USER_CANCELLED, not plan_upgraded')

    // -------------------------------------------------------------------------
    // Scenario 11: Subscription history remains intact
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Subscription history remains intact ---')
    const u1Logs = await subscriptionAuditLogsRepo.listByCreator(testUser.id)
    assert(u1Logs.length >= 3, '11: Audit log history preserved with full event trail')
    const events = u1Logs.map(l => l.event)
    assert(events.includes('PLAN_UPGRADE_CHECKOUT_CREATED'), '11: History includes PLAN_UPGRADE_CHECKOUT_CREATED')
    assert(events.includes('SUPERSEDED_SUBSCRIPTION_CANCELLED'), '11: History includes SUPERSEDED_SUBSCRIPTION_CANCELLED')
    assert(events.includes('PLAN_UPGRADE_COMPLETED'), '11: History includes PLAN_UPGRADE_COMPLETED')

    // -------------------------------------------------------------------------
    // Scenario 12: International Dodo subscription behavior is not broken
    // -------------------------------------------------------------------------
    console.log('\n--- 12. International Dodo subscription behavior is not broken ---')
    const dodoUserEmail = `dodo-intl-${Date.now()}@example.com`
    const createdDodoUser = await authService.signup({
      email: dodoUserEmail,
      password: 'SecurePassword123!',
      name: 'Dodo Intl Tester',
      role: 'CREATOR',
      storeName: `Dodo Store ${Date.now()}`,
      slug: `dodo-store-${Date.now()}`,
      country: 'US',
    })
    const dodoUserId = createdDodoUser.user?.id || createdDodoUser.id

    const dodoSessionId = `cks_dodo_${Date.now()}`
    let dodoCheckoutCreated = false
    dodoProvider.createSubscriptionCheckoutSession = async (params) => {
      dodoCheckoutCreated = true
      return {
        sessionId: dodoSessionId,
        checkoutUrl: 'https://test.checkout.dodopayments.com/session/' + dodoSessionId,
        provider: 'dodo',
      }
    }

    const dodoCheckout = await creatorSubscriptionService.createCheckoutSession(dodoUserId, {
      plan: 'CREATOR',
      interval: 'MONTHLY',
    })
    assert(dodoCheckout.provider === 'dodo', '12: International creator routes to Dodo provider')
    assert(dodoCheckoutCreated === true, '12: Dodo checkout session successfully generated')

    console.log('\n=====================================================================')
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('=====================================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('\n❌ Test suite failed with exception:', err)
    process.exit(1)
  } finally {
    // Restore mocks
    rzpProvider.createSubscription = originalCreateSub
    rzpProvider.cancelSubscription = originalCancelSub
    rzpProvider.fetchSubscription = originalFetchSub
    rzpProvider.verifySubscriptionSignature = originalVerifySig
    dodoProvider.createSubscriptionCheckoutSession = originalDodoCreate
    dodoProvider.cancelSubscription = originalDodoCancel
  }
}

runTestSuite()
