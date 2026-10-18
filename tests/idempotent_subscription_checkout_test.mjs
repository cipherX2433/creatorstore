/**
 * CreatorStore — Comprehensive Test Suite:
 * Idempotent Subscription Checkout Flow & Provider Reconciliation
 *
 * Verifies all 16 Phase 9 requirements:
 * 1. An active subscription prevents an unnecessary duplicate checkout.
 * 2. A valid pending Razorpay attempt is reconciled and reused where supported.
 * 3. A valid pending Dodo attempt is reconciled and reused where supported.
 * 4. An existing attempt is always checked through its recorded provider.
 * 5. A stale pending attempt is reconciled before cancellation.
 * 6. A successful provider payment with a stale database record is recovered correctly.
 * 7. Failed and cancelled attempts permit safe retry.
 * 8. Provider outages do not cause duplicate charges.
 * 9. Concurrent checkout requests cannot create duplicate subscriptions.
 * 10. Duplicate and out-of-order webhooks are safe.
 * 11. A pending Pro upgrade does not cancel Creator.
 * 12. A successful Pro upgrade cancels the previous Creator subscription when appropriate.
 * 13. An expired Pro attempt leaves the existing Creator subscription intact.
 * 14. Country-based routing remains correct for new attempts.
 * 15. Existing Razorpay fallback behavior remains intact.
 * 16. Existing Dodo subscription behavior remains intact.
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
  webhookEventsRepo,
  subscriptionAuditLogsRepo,
  usersRepo,
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'
import { getPaymentProvider } from '../lib/payments.js'

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
  console.log(' CREATORSTORE: IDEMPOTENT SUBSCRIPTION CHECKOUT FLOW TEST SUITE ')
  console.log('=====================================================================\n')

  const rzpProvider = getPaymentProvider()
  const originalRzpCreateSub = rzpProvider.createSubscription.bind(rzpProvider)
  const originalRzpFetchSub = rzpProvider.fetchSubscription.bind(rzpProvider)
  const originalRzpCancelSub = rzpProvider.cancelSubscription.bind(rzpProvider)
  const originalRzpVerifySig = rzpProvider.verifySubscriptionSignature.bind(rzpProvider)

  const originalDodoCreate = dodoProvider.createSubscriptionCheckoutSession.bind(dodoProvider)
  const originalDodoGetSession = dodoProvider.getCheckoutSession.bind(dodoProvider)
  const originalDodoGetSub = dodoProvider.getSubscription.bind(dodoProvider)
  const originalDodoCancel = dodoProvider.cancelSubscription.bind(dodoProvider)

  // Track created test users for cleanup
  const createdUserIds = []

  try {
    // -------------------------------------------------------------------------
    // 1. An active subscription prevents an unnecessary duplicate checkout
    // -------------------------------------------------------------------------
    console.log('--- 1. Active subscription prevents unnecessary duplicate checkout ---')
    const user1Email = `active-sub-${Date.now()}@example.com`
    const user1 = await authService.signup({
      email: user1Email,
      password: 'TestPassword123!',
      name: 'Active Sub User',
      role: 'CREATOR',
      storeName: `Active Store ${Date.now()}`,
      slug: `active-store-${Date.now()}`,
      country: 'IN',
    })
    const user1Id = user1.user?.id || user1.id
    createdUserIds.push(user1Id)

    // Setup active PRO subscription
    await creatorSubscriptionsRepo.upsert(user1Id, {
      plan: 'PRO',
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      currency: 'INR',
      amount: 999,
      provider: 'RAZORPAY',
      providerSubscriptionId: `sub_active_rzp_${Date.now()}`,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    // Attempt checkout for same plan (PRO monthly)
    const duplicateRes = await creatorSubscriptionService.createCheckoutSession(user1Id, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(duplicateRes.alreadyActive === true, '1.1: Same plan/interval returns alreadyActive: true')
    assert(duplicateRes.status === 'ACTIVE', '1.2: Status is ACTIVE')
    assert(!duplicateRes.subscriptionId, '1.3: No new subscription created on Razorpay')

    // Attempt checkout for lower plan (CREATOR) while active on PRO
    const lowerPlanRes = await creatorSubscriptionService.createCheckoutSession(user1Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(lowerPlanRes.alreadyActive === true, '1.4: Lower plan request returns alreadyActive: true (Pro includes Creator)')
    const currentSubUser1 = await creatorSubscriptionsRepo.getByCreator(user1Id)
    assert(currentSubUser1.status === 'ACTIVE', '1.5: Active PRO status is NOT overwritten to PENDING')
    assert(currentSubUser1.plan === 'PRO', '1.6: Active plan remains PRO')

    // -------------------------------------------------------------------------
    // 2. A valid pending Razorpay attempt is reconciled and reused where supported
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Valid pending Razorpay attempt is reconciled and reused ---')
    const user2Email = `rzp-pending-${Date.now()}@example.com`
    const user2 = await authService.signup({
      email: user2Email,
      password: 'TestPassword123!',
      name: 'Rzp Pending User',
      role: 'CREATOR',
      storeName: `Rzp Store ${Date.now()}`,
      slug: `rzp-store-${Date.now()}`,
      country: 'IN',
    })
    const user2Id = user2.user?.id || user2.id
    createdUserIds.push(user2Id)

    const pendingRzpId = `sub_pending_rzp_${Date.now()}`
    let rzpCreateCount = 0
    rzpProvider.createSubscription = async () => {
      rzpCreateCount++
      return { id: pendingRzpId, status: 'created', keyId: 'rzp_test_mock' }
    }
    rzpProvider.fetchSubscription = async (id) => ({
      id,
      status: 'created',
      plan_id: 'plan_creator_inr',
    })

    // First checkout click -> creates pending session
    const rzpCheckout1 = await creatorSubscriptionService.createCheckoutSession(user2Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(rzpCheckout1.provider === 'razorpay', '2.1: First attempt creates Razorpay checkout')
    assert(rzpCheckout1.subscriptionId === pendingRzpId, '2.2: Returns expected subscription ID')
    assert(rzpCreateCount === 1, '2.3: Provider API called once')

    // Second checkout click for same plan within TTL -> reuses existing attempt without calling createSubscription again
    const rzpCheckout2 = await creatorSubscriptionService.createCheckoutSession(user2Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(rzpCheckout2.resumed === true, '2.4: Second attempt returns resumed: true')
    assert(rzpCheckout2.subscriptionId === pendingRzpId, '2.5: Reuses same subscription ID')
    assert(rzpCreateCount === 1, '2.6: Provider createSubscription was NOT called a second time (idempotent reuse)')

    // -------------------------------------------------------------------------
    // 3. A valid pending Dodo attempt is reconciled and reused where supported
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Valid pending Dodo attempt is reconciled and reused ---')
    const user3Email = `dodo-pending-${Date.now()}@example.com`
    const user3 = await authService.signup({
      email: user3Email,
      password: 'TestPassword123!',
      name: 'Dodo Pending User',
      role: 'CREATOR',
      storeName: `Dodo Store ${Date.now()}`,
      slug: `dodo-store-${Date.now()}`,
      country: 'US',
    })
    const user3Id = user3.user?.id || user3.id
    createdUserIds.push(user3Id)

    let dodoCreateCount = 0
    let user3SessionId = null
    dodoProvider.createSubscriptionCheckoutSession = async () => {
      dodoCreateCount++
      const sid = `cks_pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      if (!user3SessionId) user3SessionId = sid
      return {
        sessionId: sid,
        checkoutUrl: `https://test.checkout.dodopayments.com/session/${sid}`,
        provider: 'dodo',
      }
    }
    dodoProvider.getCheckoutSession = async (id) => ({
      id,
      session_id: id,
      payment_status: 'unpaid',
      checkout_url: `https://test.checkout.dodopayments.com/session/${id}`,
    })

    // First checkout click -> creates Dodo session
    const dodoCheckout1 = await creatorSubscriptionService.createCheckoutSession(user3Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(dodoCheckout1.provider === 'dodo', '3.1: First attempt creates Dodo checkout')
    assert(dodoCheckout1.sessionId === user3SessionId, '3.2: Returns expected session ID')
    assert(dodoCreateCount === 1, '3.3: Dodo createSubscription called once')

    // Second checkout click within TTL -> reuses existing attempt
    const dodoCheckout2 = await creatorSubscriptionService.createCheckoutSession(user3Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(dodoCheckout2.resumed === true, '3.4: Second attempt returns resumed: true')
    assert(dodoCheckout2.sessionId === user3SessionId, '3.5: Reuses same session ID')
    assert(dodoCreateCount === 1, '3.6: Dodo provider API was NOT called a second time (idempotent reuse)')

    // -------------------------------------------------------------------------
    // 4. An existing attempt is always checked through its recorded provider
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Existing attempt is checked through its recorded provider ---')
    // User originally checked out on Dodo (provider: DODO, sessionId: cks_...).
    // Even if country is temporarily altered to IN in user profile, the existing pending checkout MUST reconcile via Dodo!
    let dodoCheckedForRecordedProvider = false
    dodoProvider.getCheckoutSession = async (id) => {
      if (id === user3SessionId) {
        dodoCheckedForRecordedProvider = true
      }
      return {
        id,
        session_id: id,
        payment_status: 'unpaid',
        checkout_url: `https://test.checkout.dodopayments.com/session/${id}`,
      }
    }

    // Alter profile country to IN
    await usersRepo.update(user3Id, { country: 'IN' })

    const providerCheckRes = await creatorSubscriptionService.createCheckoutSession(user3Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(dodoCheckedForRecordedProvider === true, '4.1: Checked via Dodo because existingSub.provider is DODO')
    assert(providerCheckRes.provider === 'dodo', '4.2: Maintained Dodo provider from recorded attempt')

    // Restore country to US
    await usersRepo.update(user3Id, { country: 'US' })

    // -------------------------------------------------------------------------
    // 5. A stale pending attempt is reconciled before cancellation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Stale pending attempt is reconciled before cancellation ---')
    const user4Email = `stale-reconcile-${Date.now()}@example.com`
    const user4 = await authService.signup({
      email: user4Email,
      password: 'TestPassword123!',
      name: 'Stale Reconcile User',
      role: 'CREATOR',
      storeName: `Stale Store ${Date.now()}`,
      slug: `stale-store-${Date.now()}`,
      country: 'IN',
    })
    const user4Id = user4.user?.id || user4.id
    createdUserIds.push(user4Id)

    const staleRzpId = `sub_stale_rzp_${Date.now()}`
    // Simulate 35-minute old pending attempt in DB
    const thirtyFiveMinutesAgo = new Date(Date.now() - 35 * 60 * 1000)
    await creatorSubscriptionsRepo.upsert(user4Id, {
      plan: 'CREATOR',
      status: 'PENDING',
      billingInterval: 'MONTHLY',
      currency: 'INR',
      amount: 499,
      provider: 'RAZORPAY',
      providerSubscriptionId: staleRzpId,
      createdAt: thirtyFiveMinutesAgo,
      updatedAt: thirtyFiveMinutesAgo,
    })

    // If Razorpay reports it became ACTIVE (e.g. user authorized it before cutoff), DO NOT CANCEL!
    let rzpCancelCalled = false
    rzpProvider.cancelSubscription = async () => {
      rzpCancelCalled = true
      return { status: 'cancelled' }
    }
    rzpProvider.fetchSubscription = async (id) => ({
      id,
      status: 'active',
      plan_id: 'plan_creator_inr',
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    })

    const staleCheckRes = await creatorSubscriptionService.createCheckoutSession(user4Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(staleCheckRes.alreadyActive === true, '5.1: Reconciles to alreadyActive: true instead of cancelling')
    assert(rzpCancelCalled === false, '5.2: cancelSubscription was NOT called because payment succeeded')
    const user4Sub = await creatorSubscriptionsRepo.getByCreator(user4Id)
    assert(user4Sub.status === 'ACTIVE', '5.3: Database subscription transitioned to ACTIVE')

    // -------------------------------------------------------------------------
    // 6. Successful provider payment with stale database record is recovered
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Successful provider payment with stale database record is recovered ---')
    const user5Email = `stale-dodo-recovery-${Date.now()}@example.com`
    const user5 = await authService.signup({
      email: user5Email,
      password: 'TestPassword123!',
      name: 'Stale Dodo Recovery User',
      role: 'CREATOR',
      storeName: `Recovery Store ${Date.now()}`,
      slug: `recovery-store-${Date.now()}`,
      country: 'US',
    })
    const user5Id = user5.user?.id || user5.id
    createdUserIds.push(user5Id)

    const staleDodoSessionId = `cks_stale_paid_${Date.now()}`
    const confirmedDodoSubId = `sub_dodo_confirmed_${Date.now()}`

    // DB still shows PENDING
    await creatorSubscriptionsRepo.upsert(user5Id, {
      plan: 'CREATOR',
      status: 'PENDING',
      billingInterval: 'MONTHLY',
      currency: 'USD',
      amount: 6,
      provider: 'DODO',
      dodoSubscriptionId: staleDodoSessionId,
      providerSubscriptionId: staleDodoSessionId,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    })

    // Dodo reports payment succeeded
    dodoProvider.getCheckoutSession = async (id) => ({
      id,
      session_id: id,
      payment_status: 'succeeded',
      subscription_id: confirmedDodoSubId,
      payment_id: `pay_dodo_${Date.now()}`,
    })
    dodoProvider.getSubscription = async (id) => ({
      subscription_id: id,
      status: 'active',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const recoveryRes = await creatorSubscriptionService.createCheckoutSession(user5Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(recoveryRes.alreadyActive === true, '6.1: Successfully recovered to alreadyActive: true')
    const user5Sub = await creatorSubscriptionsRepo.getByCreator(user5Id)
    assert(user5Sub.status === 'ACTIVE', '6.2: Database marked ACTIVE without requiring another payment')
    assert(user5Sub.dodoSubscriptionId === confirmedDodoSubId, '6.3: Confirmed subscription ID persisted')

    // -------------------------------------------------------------------------
    // 7. Failed and cancelled attempts permit safe retry
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Failed and cancelled attempts permit safe retry ---')
    const user6Email = `retry-after-fail-${Date.now()}@example.com`
    const user6 = await authService.signup({
      email: user6Email,
      password: 'TestPassword123!',
      name: 'Retry After Fail User',
      role: 'CREATOR',
      storeName: `Fail Store ${Date.now()}`,
      slug: `fail-store-${Date.now()}`,
      country: 'US',
    })
    const user6Id = user6.user?.id || user6.id
    createdUserIds.push(user6Id)

    const failedDodoSessionId = `cks_failed_${Date.now()}`
    const freshDodoSessionId = `cks_fresh_${Date.now()}`

    // DB has PENDING with a failed session
    await creatorSubscriptionsRepo.upsert(user6Id, {
      plan: 'CREATOR',
      status: 'PENDING',
      provider: 'DODO',
      dodoSubscriptionId: failedDodoSessionId,
      providerSubscriptionId: failedDodoSessionId,
    })

    dodoProvider.getCheckoutSession = async (id) => {
      if (id === failedDodoSessionId) {
        return { id, payment_status: 'failed' }
      }
      return { id, payment_status: 'unpaid', checkout_url: `https://test.checkout.dodopayments.com/session/${id}` }
    }
    dodoProvider.createSubscriptionCheckoutSession = async () => ({
      sessionId: freshDodoSessionId,
      checkoutUrl: `https://test.checkout.dodopayments.com/session/${freshDodoSessionId}`,
      provider: 'dodo',
    })

    const retryRes = await creatorSubscriptionService.createCheckoutSession(user6Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(retryRes.sessionId === freshDodoSessionId, '7.1: Fresh checkout session generated after failure')
    assert(retryRes.checkoutUrl.includes(freshDodoSessionId), '7.2: New checkout URL returned for safe retry')

    dodoProvider.createSubscriptionCheckoutSession = async () => {
      const sid = `cks_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      return {
        sessionId: sid,
        checkoutUrl: `https://test.checkout.dodopayments.com/session/${sid}`,
        provider: 'dodo',
      }
    }

    // -------------------------------------------------------------------------
    // 8. Provider outages do not cause duplicate charges
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Provider outages do not cause duplicate charges ---')
    // In-flight attempt exists. Provider API is temporarily failing (e.g. 500 / 503).
    // The resolver must NOT assume failure and create another charge; it must retain safe pending status.
    const user7Email = `outage-safety-${Date.now()}@example.com`
    const user7 = await authService.signup({
      email: user7Email,
      password: 'TestPassword123!',
      name: 'Outage Safety User',
      role: 'CREATOR',
      storeName: `Outage Store ${Date.now()}`,
      slug: `outage-store-${Date.now()}`,
      country: 'IN',
    })
    const user7Id = user7.user?.id || user7.id
    createdUserIds.push(user7Id)

    const outageSubId = `sub_outage_${Date.now()}`
    await creatorSubscriptionsRepo.upsert(user7Id, {
      plan: 'CREATOR',
      status: 'PENDING',
      provider: 'RAZORPAY',
      providerSubscriptionId: outageSubId,
    })

    let rzpCreateDuringOutageCalled = false
    rzpProvider.createSubscription = async () => {
      rzpCreateDuringOutageCalled = true
      return { id: `sub_duplicate_${Date.now()}` }
    }
    rzpProvider.fetchSubscription = async () => {
      const err = new Error('Razorpay Gateway 503 Service Unavailable')
      err.statusCode = 503
      throw err
    }

    const outageRes = await creatorSubscriptionService.createCheckoutSession(user7Id, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(outageRes.pending === true, '8.1: Returns pending: true on provider outage')
    assert(outageRes.status === 'PENDING_RECONCILIATION', '8.2: Status is PENDING_RECONCILIATION')
    assert(rzpCreateDuringOutageCalled === false, '8.3: Did NOT create duplicate subscription during outage')

    // -------------------------------------------------------------------------
    // 9. Concurrent checkout requests cannot create duplicate subscriptions
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Concurrent checkout requests cannot create duplicate subscriptions ---')
    const user8Email = `concurrency-${Date.now()}@example.com`
    const user8 = await authService.signup({
      email: user8Email,
      password: 'TestPassword123!',
      name: 'Concurrency User',
      role: 'CREATOR',
      storeName: `Concurrency Store ${Date.now()}`,
      slug: `concurrency-store-${Date.now()}`,
      country: 'IN',
    })
    const user8Id = user8.user?.id || user8.id
    createdUserIds.push(user8Id)

    let concurrentCreateCount = 0
    const concurrentRzpId = `sub_concurrent_${Date.now()}`
    rzpProvider.createSubscription = async () => {
      concurrentCreateCount++
      // Artificial delay to simulate real network request
      await new Promise(r => setTimeout(r, 100))
      return { id: concurrentRzpId, status: 'created', keyId: 'rzp_test_mock' }
    }
    rzpProvider.fetchSubscription = async (id) => ({
      id,
      status: 'created',
      plan_id: 'plan_creator_inr',
    })

    // Fire 2 simultaneous checkout calls for the same user
    const [resA, resB] = await Promise.all([
      creatorSubscriptionService.createCheckoutSession(user8Id, { plan: 'CREATOR', interval: 'monthly' }),
      creatorSubscriptionService.createCheckoutSession(user8Id, { plan: 'CREATOR', interval: 'monthly' }),
    ])

    assert(concurrentCreateCount === 1, '9.1: Exactly 1 subscription created across concurrent calls (concurrency lock verified)')
    assert(resA.subscriptionId === concurrentRzpId, '9.2: Call A received subscription ID')
    assert(resB.subscriptionId === concurrentRzpId, '9.3: Call B received same subscription ID (reused)')

    // -------------------------------------------------------------------------
    // 10. Duplicate and out-of-order webhooks are safe
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Duplicate and out-of-order webhooks are safe ---')
    const user9Email = `webhook-safety-${Date.now()}@example.com`
    const user9 = await authService.signup({
      email: user9Email,
      password: 'TestPassword123!',
      name: 'Webhook Safety User',
      role: 'CREATOR',
      storeName: `Webhook Store ${Date.now()}`,
      slug: `webhook-store-${Date.now()}`,
      country: 'US',
    })
    const user9Id = user9.user?.id || user9.id
    createdUserIds.push(user9Id)

    const activeProSubId = `sub_dodo_pro_active_${Date.now()}`
    await creatorSubscriptionsRepo.upsert(user9Id, {
      plan: 'PRO',
      status: 'ACTIVE',
      provider: 'DODO',
      dodoSubscriptionId: activeProSubId,
      providerSubscriptionId: activeProSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    // Simulate delayed Creator active event arriving for the user who is already PRO
    const delayedCreatorEvent = {
      event_id: `evt_delayed_${Date.now()}`,
      type: 'subscription.active',
      data: {
        subscription_id: `sub_old_creator_${Date.now()}`,
        metadata: { creatorId: user9Id, plan: 'CREATOR' },
      },
    }
    const delayedRes = await webhookService.handle(delayedCreatorEvent)
    assert(delayedRes.ignored === true, '10.1: Out-of-order Creator event ignored when Pro is ACTIVE')
    const user9SubAfterDelayed = await creatorSubscriptionsRepo.getByCreator(user9Id)
    assert(user9SubAfterDelayed.plan === 'PRO', '10.2: User remains on PRO plan')

    // Simulate duplicate webhook
    const dupRes = await webhookService.handle(delayedCreatorEvent)
    assert(dupRes.duplicate === true, '10.3: Duplicate webhook recognized and dropped idempotently')

    // -------------------------------------------------------------------------
    // 11. Pending Pro upgrade does not cancel Creator
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Pending Pro upgrade does not cancel Creator ---')
    const user10Email = `upgrade-safety-${Date.now()}@example.com`
    const user10 = await authService.signup({
      email: user10Email,
      password: 'TestPassword123!',
      name: 'Upgrade Safety User',
      role: 'CREATOR',
      storeName: `Upgrade Store ${Date.now()}`,
      slug: `upgrade-store-${Date.now()}`,
      country: 'IN',
    })
    const user10Id = user10.user?.id || user10.id
    createdUserIds.push(user10Id)

    const activeCreatorSubId = `sub_active_creator_${Date.now()}`
    await creatorSubscriptionsRepo.upsert(user10Id, {
      plan: 'CREATOR',
      status: 'ACTIVE',
      provider: 'RAZORPAY',
      providerSubscriptionId: activeCreatorSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    const newProRzpId = `sub_pro_upgrade_${Date.now()}`
    rzpProvider.createSubscription = async () => ({
      id: newProRzpId,
      status: 'created',
      keyId: 'rzp_test_mock',
    })

    const upgradeCheckout = await creatorSubscriptionService.createCheckoutSession(user10Id, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(upgradeCheckout.flowType === 'plan_upgrade', '11.1: Flow type is plan_upgrade')
    assert(upgradeCheckout.subscriptionId === newProRzpId, '11.2: Pro upgrade session returned')

    const user10SubPending = await creatorSubscriptionsRepo.getByCreator(user10Id)
    assert(user10SubPending.status === 'ACTIVE', '11.3: Creator subscription remains ACTIVE during checkout')
    assert(user10SubPending.plan === 'CREATOR', '11.4: Effective plan remains CREATOR until confirmed')
    assert(user10SubPending.pendingUpgradeStatus === 'PENDING_CHECKOUT', '11.5: Pending upgrade lock recorded')

    // -------------------------------------------------------------------------
    // 12. Successful Pro upgrade cancels previous Creator subscription
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Successful Pro upgrade cancels previous Creator subscription ---')
    let oldCreatorSubCancelled = false
    rzpProvider.cancelSubscription = async (id) => {
      if (id === activeCreatorSubId) {
        oldCreatorSubCancelled = true
        return { status: 'cancelled' }
      }
      return { status: 'cancelled' }
    }
    rzpProvider.verifySubscriptionSignature = () => true

    const verifyUpgradeRes = await creatorSubscriptionService.verifySubscriptionPayment(user10Id, {
      provider: 'razorpay',
      razorpaySubscriptionId: newProRzpId,
      razorpayPaymentId: `pay_pro_${Date.now()}`,
      razorpaySignature: 'valid_sig_mock',
    })
    assert(verifyUpgradeRes.status === 'ACTIVE', '12.1: Subscription status is ACTIVE after upgrade')
    assert(verifyUpgradeRes.plan === 'PRO', '12.2: Plan is now PRO')
    assert(oldCreatorSubCancelled === true, '12.3: Old Creator subscription cancelled on Razorpay API')

    const user10SubFinal = await creatorSubscriptionsRepo.getByCreator(user10Id)
    assert(user10SubFinal.plan === 'PRO', '12.4: Database record updated to PRO')
    assert(user10SubFinal.pendingUpgradeStatus === null, '12.5: Pending upgrade state cleared')
    rzpProvider.verifySubscriptionSignature = originalRzpVerifySig

    // -------------------------------------------------------------------------
    // 13. Expired Pro attempt leaves existing Creator subscription intact
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Expired Pro attempt leaves existing Creator subscription intact ---')
    const user11Email = `expired-upgrade-${Date.now()}@example.com`
    const user11 = await authService.signup({
      email: user11Email,
      password: 'TestPassword123!',
      name: 'Expired Upgrade User',
      role: 'CREATOR',
      storeName: `Expired Up Store ${Date.now()}`,
      slug: `expired-up-store-${Date.now()}`,
      country: 'IN',
    })
    const user11Id = user11.user?.id || user11.id
    createdUserIds.push(user11Id)

    const creatorBaseSubId = `sub_base_creator_${Date.now()}`
    const expiredProAttemptId = `sub_pro_expired_${Date.now()}`

    // Setup active Creator with expired Pro upgrade attempt (> 30 min)
    await creatorSubscriptionsRepo.upsert(user11Id, {
      plan: 'CREATOR',
      status: 'ACTIVE',
      provider: 'RAZORPAY',
      providerSubscriptionId: creatorBaseSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      pendingUpgradeStatus: 'PENDING_CHECKOUT',
      pendingUpgradePaymentId: expiredProAttemptId,
      pendingUpgradePlan: 'PRO',
      pendingUpgradeStartedAt: new Date(Date.now() - 40 * 60 * 1000),
    })

    let expiredProSubCancelled = false
    let baseCreatorSubCancelled = false
    rzpProvider.cancelSubscription = async (id) => {
      if (id === expiredProAttemptId) expiredProSubCancelled = true
      if (id === creatorBaseSubId) baseCreatorSubCancelled = true
      return { status: 'cancelled' }
    }
    rzpProvider.fetchSubscription = async (id) => ({
      id,
      status: 'created',
    })
    rzpProvider.createSubscription = async () => ({
      id: `sub_fresh_pro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'created',
      keyId: 'rzp_test_mock',
    })

    // User initiates upgrade again after previous attempt expired
    await creatorSubscriptionService.createCheckoutSession(user11Id, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(expiredProSubCancelled === true, '13.1: Expired Pro attempt was cancelled on provider')
    assert(baseCreatorSubCancelled === false, '13.2: Base Creator subscription was NOT cancelled')
    const user11Sub = await creatorSubscriptionsRepo.getByCreator(user11Id)
    assert(user11Sub.status === 'ACTIVE', '13.3: Creator subscription remains ACTIVE')

    // -------------------------------------------------------------------------
    // 14. Country-based routing remains correct for new attempts
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Country-based routing remains correct for new attempts ---')
    const userIn = await authService.signup({
      email: `new-in-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'New IN User',
      role: 'CREATOR',
      storeName: `Store IN ${Date.now()}`,
      slug: `store-in-${Date.now()}`,
      country: 'IN',
    })
    const userInId = userIn.user?.id || userIn.id
    createdUserIds.push(userInId)

    const userGb = await authService.signup({
      email: `new-gb-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'New GB User',
      role: 'CREATOR',
      storeName: `Store GB ${Date.now()}`,
      slug: `store-gb-${Date.now()}`,
      country: 'GB',
    })
    const userGbId = userGb.user?.id || userGb.id
    createdUserIds.push(userGbId)

    const inCheckout = await creatorSubscriptionService.createCheckoutSession(userInId, { plan: 'CREATOR' })
    assert(inCheckout.provider === 'razorpay', '14.1: Country IN routes to Razorpay')
    assert(inCheckout.currency === 'INR', '14.2: Country IN uses INR')

    const gbCheckout = await creatorSubscriptionService.createCheckoutSession(userGbId, { plan: 'CREATOR' })
    assert(gbCheckout.provider === 'dodo', '14.3: Country GB routes to Dodo')
    assert(gbCheckout.currency === 'USD', '14.4: Country GB uses USD')

    // -------------------------------------------------------------------------
    // 15. Existing Razorpay fallback behavior remains intact
    // -------------------------------------------------------------------------
    console.log('\n--- 15. Existing Razorpay fallback behavior remains intact ---')
    const configCheck = rzpProvider.validateConfiguration({ throwOnError: false })
    assert(typeof configCheck.isValid === 'boolean', '15.1: Razorpay configuration validation runs cleanly')
    const sigCheck = rzpProvider.verifySubscriptionSignature({
      razorpaySubscriptionId: 'sub_test',
      razorpayPaymentId: 'pay_test',
      razorpaySignature: 'invalid',
    })
    assert(sigCheck === false, '15.2: Invalid signature rejected safely')

    // -------------------------------------------------------------------------
    // 16. Existing Dodo subscription behavior remains intact
    // -------------------------------------------------------------------------
    console.log('\n--- 16. Existing Dodo subscription behavior remains intact ---')
    const dodoSubStatus = await creatorSubscriptionService.getStatus(userGbId)
    assert(dodoSubStatus.rawStatus === 'PENDING', '16.1: Dodo pending status recognized in getStatus')
    assert(dodoSubStatus.canSell === false, '16.2: Selling permissions locked while payment is pending')

    console.log('\n=====================================================================')
    console.log(` ALL 16 REQUIREMENTS PASSED! (${passed} checks passed, ${failed} failed)`)
    console.log('=====================================================================\n')

  } finally {
    // Restore mocks
    rzpProvider.createSubscription = originalRzpCreateSub
    rzpProvider.fetchSubscription = originalRzpFetchSub
    rzpProvider.cancelSubscription = originalRzpCancelSub
    rzpProvider.verifySubscriptionSignature = originalRzpVerifySig

    dodoProvider.createSubscriptionCheckoutSession = originalDodoCreate
    dodoProvider.getCheckoutSession = originalDodoGetSession
    dodoProvider.getSubscription = originalDodoGetSub
    dodoProvider.cancelSubscription = originalDodoCancel

    // Cleanup test users
    console.log('--- Cleaning up test records ---')
    for (const uid of createdUserIds) {
      try {
        await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: uid } })
        await prisma.subscriptionInvoice.deleteMany({ where: { creatorId: uid } })
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: uid } })
        await prisma.profile.deleteMany({ where: { creatorId: uid } })
        await prisma.user.deleteMany({ where: { id: uid } })
      } catch (e) {}
    }
    console.log('Cleanup completed.')
    await prisma.$disconnect()
  }
}

runTests().then(() => {
  if (failed > 0) process.exit(1)
  process.exit(0)
}).catch((err) => {
  console.error('\n💥 Test run failed unexpectedly with error:', err)
  process.exit(1)
})
