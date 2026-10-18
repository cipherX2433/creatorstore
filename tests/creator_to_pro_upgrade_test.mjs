/**
 * Comprehensive Test Suite for Creator-to-Pro Upgrade & Dodo Payment Integration
 * 
 * Verifies all 14 acceptance criteria:
 * 1. New Creator purchase opens Dodo checkout.
 * 2. Creator-to-Pro upgrade opens the required checkout flow.
 * 3. No Pro activation occurs before authoritative payment confirmation.
 * 4. Successful verified Pro payment activates Pro exactly once.
 * 5. Failed or cancelled upgrade retains Creator access.
 * 6. Pending payment does not activate Pro.
 * 7. A user who already has active Pro cannot accidentally purchase a duplicate Pro subscription.
 * 8. Repeated button clicks do not create duplicate charges or checkout sessions.
 * 9. Duplicate webhook delivery is idempotent.
 * 10. Invalid webhook signatures are rejected.
 * 11. A stale Creator event cannot overwrite a valid Pro upgrade.
 * 12. Old pending payments are reconciled correctly.
 * 13. Provider API errors do not cause false success or false failure.
 * 14. Initial Creator purchases continue to work.
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
import { paymentLifecycleService } from '../lib/payment-lifecycle.js'

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

async function runTests() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: FULL 14-CRITERIA REGRESSION TEST SUITE')
  console.log('=====================================================================\n')

  const testEmail = `upgrade-full-test-${Date.now()}@example.com`
  let user = null
  const originalCreateCheckout = dodoProvider.createSubscriptionCheckoutSession.bind(dodoProvider)
  const originalGetSession = dodoProvider.getCheckoutSession.bind(dodoProvider)
  const originalGetPayment = dodoProvider.getPayment.bind(dodoProvider)
  const originalGetSub = dodoProvider.getSubscription.bind(dodoProvider)
  const originalCancelSub = dodoProvider.cancelSubscription.bind(dodoProvider)

  try {
    // 0. Create test creator user
    const created = await authService.signup({
      email: testEmail,
      password: 'SecurePassword123!',
      name: 'Full Suite Tester',
      role: 'CREATOR',
      storeName: `Full Store ${Date.now()}`,
      slug: `full-store-${Date.now()}`,
      country: 'US',
    })
    const userId = created.user?.id || created.id
    user = { id: userId, email: testEmail }

    // -------------------------------------------------------------------------
    // 1. Initial Creator purchase opens Dodo checkout
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Initial Creator purchase opens Dodo checkout ---')
    dodoProvider.createSubscriptionCheckoutSession = async (params) => ({
      sessionId: `cks_creator_${Date.now()}`,
      checkoutUrl: 'https://test.checkout.dodopayments.com/session/cks_creator_init',
      provider: 'dodo',
    })

    const initCheckout = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'CREATOR',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })
    assert(initCheckout.checkoutUrl && initCheckout.checkoutUrl.includes('test.checkout.dodopayments.com'), '1: New Creator purchase returns Dodo hosted checkout URL')
    const dbSub1 = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(dbSub1.status === 'PENDING' && dbSub1.plan === 'CREATOR', '1: Database records initial purchase as PENDING, not active')

    // -------------------------------------------------------------------------
    // 14. Initial Creator purchase activation succeeds
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Initial Creator purchase activation succeeds ---')
    const creatorSubId = `sub_creator_${Date.now()}`
    const creatorPayId = `pay_creator_${Date.now()}`
    dodoProvider.getCheckoutSession = async (sid) => ({
      id: sid,
      payment_status: 'paid',
      payment_id: creatorPayId,
      subscription_id: creatorSubId,
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk', // Creator USD
      metadata: { creatorId: user.id, planId: 'CREATOR' },
    })
    dodoProvider.getPayment = async () => ({
      payment_id: creatorPayId,
      status: 'succeeded',
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk',
      subscription_id: creatorSubId,
      metadata: { creatorId: user.id },
    })
    dodoProvider.getSubscription = async () => ({
      subscription_id: creatorSubId,
      status: 'active',
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const verifyCreatorRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, {
      sessionId: initCheckout.sessionId,
    })
    assert(verifyCreatorRes.status === 'ACTIVE' && verifyCreatorRes.plan === 'CREATOR', '14: Creator subscription verified and activated')
    const activeCreatorSub = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(activeCreatorSub.status === 'ACTIVE' && activeCreatorSub.plan === 'CREATOR', '14: Database confirms active Creator subscription')

    // -------------------------------------------------------------------------
    // 2. Creator-to-Pro upgrade opens required checkout flow
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Creator-to-Pro upgrade opens required checkout flow ---')
    const proCheckoutSessionId = `cks_upgrade_pro_${Date.now()}`
    dodoProvider.createSubscriptionCheckoutSession = async (params) => {
      assert(params.productId === 'pdt_0Npr1TVXPzU3U6cXTAX8Y', '2: Upgrade uses Pro product ID')
      assert(params.metadata?.isUpgrade === 'true', '2: Upgrade metadata includes isUpgrade')
      assert(params.metadata?.previousSubscriptionId === creatorSubId, '2: Upgrade metadata tracks previous Creator subscription ID')
      return {
        sessionId: proCheckoutSessionId,
        checkoutUrl: `https://test.checkout.dodopayments.com/session/${proCheckoutSessionId}`,
        provider: 'dodo',
      }
    }

    const upgradeRes = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })
    assert(upgradeRes.checkoutUrl === `https://test.checkout.dodopayments.com/session/${proCheckoutSessionId}`, '2: Pro upgrade returns Dodo hosted checkout URL')

    // -------------------------------------------------------------------------
    // 3. No Pro activation occurs before authoritative payment confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- 3. No Pro activation occurs before authoritative payment confirmation ---')
    const subAfterUpgradeClick = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterUpgradeClick.plan === 'CREATOR', '3: Plan remains CREATOR after upgrade click')
    assert(subAfterUpgradeClick.status === 'ACTIVE', '3: Status remains ACTIVE (Creator access intact)')
    assert(subAfterUpgradeClick.pendingUpgradeStatus === 'PENDING_CHECKOUT', '3: pendingUpgradeStatus recorded as PENDING_CHECKOUT')

    // Also test return URL with unpaid status:
    dodoProvider.getCheckoutSession = async () => ({
      id: proCheckoutSessionId,
      payment_status: 'unpaid',
      metadata: { creatorId: user.id },
    })
    let unpaidThrew = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(user.id, { sessionId: proCheckoutSessionId })
    } catch (e) {
      unpaidThrew = true
    }
    assert(unpaidThrew, '3: Unpaid return URL rejected by server verification')
    const subAfterUnpaidReturn = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterUnpaidReturn.plan === 'CREATOR' && subAfterUnpaidReturn.status === 'ACTIVE', '3: Plan remains CREATOR after unpaid return attempt')

    // -------------------------------------------------------------------------
    // 8. Repeated button clicks do not create duplicate charges or checkout sessions
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Repeated button clicks do not create duplicate checkout sessions ---')
    let duplicateCreated = false
    dodoProvider.createSubscriptionCheckoutSession = async () => {
      duplicateCreated = true
      return {}
    }
    const secondClickRes = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })
    assert(!duplicateCreated, '8: Dodo API not called on repeated click; existing checkout session reused')
    assert(secondClickRes.resumed === true, '8: Repeated click returns resumed: true with existing checkoutUrl')

    // -------------------------------------------------------------------------
    // 6. Pending payment does not activate Pro
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Pending payment does not activate Pro ---')
    dodoProvider.getCheckoutSession = async () => ({
      id: proCheckoutSessionId,
      payment_id: 'pay_pending_proc',
      metadata: { creatorId: user.id },
    })
    dodoProvider.getPayment = async () => ({
      payment_id: 'pay_pending_proc',
      status: 'processing',
      metadata: { creatorId: user.id },
    })
    const verifyPendingRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, { sessionId: proCheckoutSessionId })
    assert(verifyPendingRes.pending === true && verifyPendingRes.status === 'PENDING_PAYMENT', '6: Pending payment returns PENDING_PAYMENT')
    const subAfterProc = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterProc.plan === 'CREATOR' && subAfterProc.status === 'ACTIVE', '6: User remains on CREATOR while payment is processing')

    // -------------------------------------------------------------------------
    // 5. Failed or cancelled upgrade retains Creator access
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Failed or cancelled upgrade retains Creator access ---')
    dodoProvider.getPayment = async () => ({
      payment_id: 'pay_failed_proc',
      status: 'failed',
      metadata: { creatorId: user.id },
    })
    let failedThrew = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(user.id, { sessionId: proCheckoutSessionId })
    } catch (e) {
      failedThrew = true
    }
    assert(failedThrew, '5: Failed payment verification throws error')
    const subAfterFail = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterFail.plan === 'CREATOR' && subAfterFail.status === 'ACTIVE', '5: Creator plan remains intact after payment failure')

    // -------------------------------------------------------------------------
    // 4. Successful verified Pro payment activates Pro exactly once & cancels old sub
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Successful verified Pro payment activates Pro exactly once ---')
    const proSubId = `sub_pro_${Date.now()}`
    const proPayId = `pay_pro_${Date.now()}`
    let oldSubCancelled = false
    dodoProvider.cancelSubscription = async (sid, opts) => {
      if (sid === creatorSubId) oldSubCancelled = true
      return {}
    }
    dodoProvider.getCheckoutSession = async () => ({
      id: proCheckoutSessionId,
      payment_status: 'paid',
      payment_id: proPayId,
      subscription_id: proSubId,
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      metadata: { creatorId: user.id, planId: 'PRO', isUpgrade: 'true', previousSubscriptionId: creatorSubId },
    })
    dodoProvider.getPayment = async () => ({
      payment_id: proPayId,
      status: 'succeeded',
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      subscription_id: proSubId,
      metadata: { creatorId: user.id, planId: 'PRO' },
    })
    dodoProvider.getSubscription = async () => ({
      subscription_id: proSubId,
      status: 'active',
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const verifySuccessRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, { sessionId: proCheckoutSessionId })
    assert(verifySuccessRes.status === 'ACTIVE' && verifySuccessRes.plan === 'PRO', '4: Pro plan activated upon confirmed payment')
    assert(oldSubCancelled, '4: Previous Creator subscription authoritatively cancelled on Dodo')
    const subAfterPro = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterPro.plan === 'PRO' && subAfterPro.status === 'ACTIVE', '4: Database updated to PRO')
    assert(subAfterPro.dodoSubscriptionId === proSubId, '4: Database records new Pro subscription ID')
    const totalSubs = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(totalSubs === 1, '4: Exactly ONE subscription record exists for user')

    // -------------------------------------------------------------------------
    // 7. Active Pro user cannot accidentally purchase duplicate Pro subscription
    // -------------------------------------------------------------------------
    console.log('\n--- 7. User with active Pro cannot purchase duplicate Pro subscription ---')
    let duplicateSubCreated = false
    dodoProvider.createSubscriptionCheckoutSession = async () => {
      duplicateSubCreated = true
      return {}
    }
    const alreadyProRes = await creatorSubscriptionService.createCheckoutSession(user.id, {
      plan: 'PRO',
      interval: 'MONTHLY',
      region: 'INTERNATIONAL',
    })
    assert(alreadyProRes.alreadyActive === true && alreadyProRes.currentPlan === true, '7: Returns alreadyActive without charging')
    assert(!duplicateSubCreated, '7: Dodo checkout session NOT created when already on Pro')

    // -------------------------------------------------------------------------
    // 9. Duplicate webhook delivery is idempotent
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Duplicate webhook delivery is idempotent ---')
    const dupEventId = `evt_test_dup_${Date.now()}`
    const webhookEvent = createWebhookEvent('subscription.active', {
      subscription_id: proSubId,
      product_id: 'pdt_0Npr1TVXPzU3U6cXTAX8Y',
      status: 'active',
      metadata: { creatorId: user.id },
    }, dupEventId)

    const hookRes1 = await webhookService.handle(webhookEvent)
    const hookRes2 = await webhookService.handle(webhookEvent)
    assert(hookRes1.ok === true, '9: First webhook delivery processed')
    assert(hookRes2.duplicate === true, '9: Second identical webhook claimed as duplicate')
    const countAfterHooks = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(countAfterHooks === 1, '9: Webhook idempotency preserves single subscription')

    // -------------------------------------------------------------------------
    // 10. Invalid webhook signatures are rejected
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Invalid webhook signatures are rejected ---')
    let badSigRejected = false
    try {
      webhookService.verifyDodoSignature('{"event":"subscription.active"}', {
        'webhook-id': 'msg_invalid_sig',
        'webhook-signature': 'v1,fake_signature_hash',
        'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      })
    } catch (e) {
      badSigRejected = true
    }
    assert(badSigRejected, '10: Webhook with invalid signature throws error and is rejected')

    // -------------------------------------------------------------------------
    // 11. Stale Creator event cannot overwrite a valid Pro upgrade
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Stale Creator event cannot overwrite a valid Pro upgrade ---')
    const staleCreatorEvent = createWebhookEvent('subscription.active', {
      subscription_id: creatorSubId,
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk', // Creator product
      status: 'active',
      metadata: { creatorId: user.id, plan: 'CREATOR' },
    })
    const staleRes = await webhookService.handle(staleCreatorEvent)
    assert(staleRes.ignored === true && staleRes.reason === 'out_of_order_downgrade_rejected', '11: Out-of-order Creator event rejected')
    const subAfterStale = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterStale.plan === 'PRO' && subAfterStale.status === 'ACTIVE', '11: Pro plan remains ACTIVE; not downgraded by late Creator event')

    // -------------------------------------------------------------------------
    // 12. Old pending payments are reconciled correctly
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Old pending payments are reconciled correctly ---')
    // Test reconciliation of false PRO entitlement when Dodo reports Creator
    await creatorSubscriptionsRepo.updateStatus(user.id, 'ACTIVE', {
      plan: 'PRO',
      dodoSubscriptionId: creatorSubId,
      providerSubscriptionId: creatorSubId,
      pendingUpgradeStatus: 'PROCESSING',
      pendingUpgradePaymentId: 'pay_stale_123',
    })
    dodoProvider.listPayments = async () => [
      { payment_id: 'pay_stale_123', status: 'processing', charge_type: 'plan_change', created_at: new Date(Date.now() - 3600000).toISOString() },
      { payment_id: creatorPayId, status: 'succeeded', charge_type: 'new' }
    ]
    dodoProvider.getSubscription = async () => ({
      subscription_id: creatorSubId,
      status: 'active',
      product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk', // Creator
    })

    const statusAfterRecon = await creatorSubscriptionService.getStatus(user.id)
    assert(statusAfterRecon.planId === 'CREATOR', '12: False PRO entitlement auto-reconciled back to CREATOR')
    assert(statusAfterRecon.status === 'ACTIVE', '12: Status remains ACTIVE with Creator entitlements')

    // -------------------------------------------------------------------------
    // 13. Provider API errors do not cause false success or false failure
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Provider API errors do not cause false success or false failure ---')
    dodoProvider.getSubscription = async () => {
      throw new Error('Dodo network timeout 504')
    }
    dodoProvider.createSubscriptionCheckoutSession = async () => {
      throw new Error('Dodo 503 Service Unavailable')
    }
    let errorHandledSafely = false
    try {
      await creatorSubscriptionService.createCheckoutSession(user.id, { plan: 'PRO', interval: 'MONTHLY' })
    } catch (e) {
      errorHandledSafely = true
    }
    assert(errorHandledSafely, '13: API error throws and is not treated as false success')
    const subAfterError = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterError.plan === 'CREATOR' && subAfterError.status === 'ACTIVE', '13: Database state unchanged; Creator access intact')

    console.log('\n=====================================================================')
    console.log(` ALL 14 TEST CRITERIA COMPLETED: ${passed} PASSED, ${failed} FAILED`)
    console.log('=====================================================================\n')

  } finally {
    // Restore mocks
    dodoProvider.createSubscriptionCheckoutSession = originalCreateCheckout
    dodoProvider.getCheckoutSession = originalGetSession
    dodoProvider.getPayment = originalGetPayment
    dodoProvider.getSubscription = originalGetSub
    dodoProvider.cancelSubscription = originalCancelSub

    // Cleanup test user
    if (user?.id) {
      await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.store.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.creatorProfile.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {})
    }
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err)
  process.exit(1)
})
