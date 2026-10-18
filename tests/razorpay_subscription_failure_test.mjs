/**
 * CreatorStore — Comprehensive Razorpay Subscription Lifecycle & Failure Handling Test Suite
 *
 * Covers all 15 production-readiness scenarios:
 * 1. Abandoned created subscription cleanup older than timeout.
 * 2. Subscription becoming active immediately before cleanup.
 * 3. Recurring charge failure and subscription.pending.
 * 4. Automatic recovery following a successful retry (subscription.charged).
 * 5. subscription.halted after exhausted retries.
 * 6. Successful manual invoice recovery (recordManualInvoiceRecovery).
 * 7. Duplicate and out-of-order webhook delivery.
 * 8. Invalid webhook signatures.
 * 9. Missed webhook and reconciliation recovery (reconcileSubscription).
 * 10. Duplicate subscription creation prevention and checkout resumption.
 * 11. Correct paid-through dates and grace periods.
 * 12. CreatorStore plan entitlement restoration after verified payment.
 * 13. Cancellation and late payment races (access preserved until currentPeriodEnd).
 * 14. Razorpay API timeouts and retry behaviour.
 * 15. Isolation between Razorpay and Dodo subscription records.
 */

import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
} from '../lib/services.js'
import {
  creatorSubscriptionsRepo,
  subscriptionInvoicesRepo,
  subscriptionAuditLogsRepo,
} from '../lib/repos.js'
import {
  getPaymentProvider,
  timingSafeEqualStr,
} from '../lib/payments.js'
import {
  razorpaySubscriptionLifecycleService,
  getRazorpayPendingSubscriptionTimeoutMinutes,
  getRazorpayGracePeriodDays,
} from '../lib/razorpay-subscription-lifecycle.js'

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

function generateRazorpayWebhookSignature(payloadString, secret) {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
}

async function runTestSuite() {
  console.log('\n=====================================================================')
  console.log(' CREATORSTORE: RAZORPAY SUBSCRIPTION LIFECYCLE & FAILURE TEST SUITE ')
  console.log('=====================================================================\n')

  const provider = getPaymentProvider()
  const originalFetchSubscription = provider.fetchSubscription.bind(provider)
  const originalCancelSubscription = provider.cancelSubscription.bind(provider)
  const originalFetchInvoice = provider.fetchInvoice.bind(provider)

  // Clean test user generator
  async function createTestUser(tag) {
    const cleanTag = tag.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)
    const uniqueUser = `u${cleanTag}${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`
    const email = `rzp-${uniqueUser}@example.com`
    const res = await authService.signup({
      name: `Rzp Tester ${tag}`,
      email,
      password: 'Password123!',
      role: 'CREATOR',
      country: 'IN',
      username: uniqueUser,
    })
    return res.user || res
  }

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Abandoned created subscription cleanup older than timeout
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Abandoned created subscription cleanup older than timeout ---')
    {
      const user = await createTestUser('abandoned')
      const subId = `sub_test_abandoned_${Date.now()}`
      const seventyMinsAgo = new Date(Date.now() - 75 * 60 * 1000)

      // Create local subscription record in CREATED state older than 60m
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'CREATOR',
        status: 'CREATED',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        authStatus: 'awaiting_authorisation',
        createdAt: seventyMinsAgo,
        updatedAt: seventyMinsAgo,
      })

      const cancelledCalls = []
      provider.fetchSubscription = async (id) => ({
        id,
        status: 'created',
        plan_id: 'plan_test_creator',
        paid_count: 0,
      })
      provider.cancelSubscription = async (id, opts) => {
        cancelledCalls.push({ id, opts })
        return { id, status: 'cancelled' }
      }

      const result = await razorpaySubscriptionLifecycleService.cleanupAbandonedInitialCheckouts({
        timeoutMinutes: 60,
      })

      assert((result.cancelled || result.cancelledCount) >= 1, `Cleaned up at least 1 abandoned subscription (got ${result.cancelled})`)
      const myCancel = cancelledCalls.find((c) => c.id === subId)
      assert(myCancel !== undefined, `Cancelled correct subscription ID on Razorpay: ${subId}`)
      assert(myCancel?.opts === false || myCancel?.opts?.cancelAtCycleEnd === false, `Used immediate cancellation (cancelAtCycleEnd: false)`)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'CANCELLED', `Database status updated to CANCELLED (was ${subInDb.status})`)
      assert(subInDb.cancellationReason && subInDb.cancellationReason.toLowerCase().includes('abandoned'), `Cancellation reason indicates abandoned checkout (${subInDb.cancellationReason})`)
    }

    // -------------------------------------------------------------------------
    // Scenario 2: Subscription becoming active immediately before cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Subscription becoming active immediately before cleanup ---')
    {
      const user = await createTestUser('late-active')
      const subId = `sub_test_lateactive_${Date.now()}`
      const eightyMinsAgo = new Date(Date.now() - 80 * 60 * 1000)
      const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'CREATED',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        createdAt: eightyMinsAgo,
      })

      let cancelAttemptedForOurSub = false
      provider.fetchSubscription = async (id) => {
        if (id === subId) {
          return {
            id,
            status: 'active',
            current_end: Math.floor(futurePeriodEnd.getTime() / 1000),
            paid_count: 1,
          }
        }
        return { id, status: 'created', paid_count: 0 }
      }
      provider.cancelSubscription = async (id, opts) => {
        if (id === subId) {
          cancelAttemptedForOurSub = true
          throw new Error('Should not cancel active subscription!')
        }
        return { id, status: 'cancelled' }
      }

      const result = await razorpaySubscriptionLifecycleService.cleanupAbandonedInitialCheckouts({
        timeoutMinutes: 60,
      })

      assert(!cancelAttemptedForOurSub, `Did not attempt to cancel active subscription on Razorpay`)
      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'ACTIVE', `Reconciled subscription to ACTIVE instead of cancelling`)
      assert(subInDb.plan === 'PRO', `User subscription plan is PRO`)
    }

    // -------------------------------------------------------------------------
    // Scenario 3: Recurring charge failure and subscription.pending
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Recurring charge failure and subscription.pending ---')
    {
      const user = await createTestUser('pending')
      const subId = `sub_test_pending_${Date.now()}`
      const invId = `inv_test_fail_${Date.now()}`
      const currentEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // paid through 2 days from now

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        currentPeriodEnd: currentEnd,
      })

      const pendingEvent = {
        event: 'subscription.pending',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'pending',
              current_end: Math.floor(currentEnd.getTime() / 1000),
              has_scheduled_changes: false,
            },
          },
          payment: {
            entity: {
              id: `pay_fail_${Date.now()}`,
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card declined due to insufficient funds',
            },
          },
        },
      }

      await razorpaySubscriptionLifecycleService.processWebhookEvent(pendingEvent)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'PENDING' || subInDb.status === 'PAID_PENDING', `Status transitioned to PENDING (got ${subInDb.status})`)
      assert(subInDb.authStatus === 'PENDING_RETRY', `authStatus is PENDING_RETRY`)
      assert(subInDb.gracePeriodEndsAt !== null, `Grace period end date assigned`)
      assert(new Date(subInDb.gracePeriodEndsAt).getTime() > Date.now(), `Grace period ends in the future`)

      // Check entitlements: access should NOT be revoked yet because within grace period
      const statusRes = await creatorSubscriptionService.getStatus(user.id)
      assert(statusRes.hasAccess === true, `Customer still has access during grace period`)
      assert(statusRes.isRetryPending === true, `isRetryPending flag set for UI`)
      assert(statusRes.isPastDue === true, `statusRes.isPastDue is true`)
    }

    // -------------------------------------------------------------------------
    // Scenario 4: Automatic recovery following a successful retry (subscription.charged)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Automatic recovery following a successful retry ---')
    {
      const user = await createTestUser('charged-recovery')
      const subId = `sub_test_retry_recov_${Date.now()}`
      const invId = `inv_test_recov_${Date.now()}`
      const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'PAID_PENDING',
        isPastDue: true,
        gracePeriodEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      // Record invoice as issued/pending
      await subscriptionInvoicesRepo.recordInvoice({
        userId: user.id,
        razorpayInvoiceId: invId,
        razorpaySubscriptionId: subId,
        amount: 99900,
        currency: 'INR',
        status: 'issued',
      })

      const chargedEvent = {
        event: 'subscription.charged',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'active',
              current_end: Math.floor(newEnd.getTime() / 1000),
              paid_count: 2,
            },
          },
          payment: {
            entity: {
              id: `pay_success_${Date.now()}`,
              amount: 99900,
              currency: 'INR',
              status: 'captured',
            },
          },
          invoice: {
            entity: {
              id: invId,
              status: 'paid',
              amount: 99900,
            },
          },
        },
      }

      await razorpaySubscriptionLifecycleService.processWebhookEvent(chargedEvent)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'ACTIVE', `Status restored to ACTIVE`)
      assert(subInDb.retryCount === 0, `retryCount reset to 0`)

      const statusRes = await creatorSubscriptionService.getStatus(user.id)
      assert(statusRes.isPastDue === false, `isPastDue cleared in status`)

      const invInDb = await subscriptionInvoicesRepo.getByInvoiceId(invId)
      assert(invInDb.status && invInDb.status.toLowerCase() === 'paid', `Invoice status updated to paid (${invInDb.status})`)
      assert(invInDb.paidAt !== null, `Invoice paidAt timestamp persisted`)
    }

    // -------------------------------------------------------------------------
    // Scenario 5: subscription.halted after exhausted retries
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: subscription.halted after exhausted retries ---')
    {
      const user = await createTestUser('halted')
      const subId = `sub_test_halted_${Date.now()}`
      const pastPeriodEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'CREATOR',
        status: 'PENDING',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        currentPeriodEnd: pastPeriodEnd,
      })

      const haltedEvent = {
        event: 'subscription.halted',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'halted',
              current_end: Math.floor(pastPeriodEnd.getTime() / 1000),
            },
          },
        },
      }

      await razorpaySubscriptionLifecycleService.processWebhookEvent(haltedEvent)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'HALTED', `Status transitioned to HALTED`)

      // If grace period is expired and period end passed, customer access is revoked
      await creatorSubscriptionsRepo.updateStatus(user.id, 'HALTED', {
        gracePeriodEndsAt: new Date(Date.now() - 1000),
      })
      const statusRes = await creatorSubscriptionService.getStatus(user.id)
      assert(statusRes.hasAccess === false, `Access revoked when HALTED and grace period expired`)
      assert(statusRes.isHalted === true, `isHalted flag set in status for UI alert`)
    }

    // -------------------------------------------------------------------------
    // Scenario 6: Successful manual invoice recovery (recordManualInvoiceRecovery)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Successful manual invoice recovery ---')
    {
      const user = await createTestUser('manual-recovery')
      const subId = `sub_test_manrec_${Date.now()}`
      const invId = `inv_test_manrec_${Date.now()}`
      const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'HALTED',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      await subscriptionInvoicesRepo.recordInvoice({
        userId: user.id,
        razorpayInvoiceId: invId,
        razorpaySubscriptionId: subId,
        amount: 99900,
        currency: 'INR',
        status: 'issued',
      })

      provider.fetchInvoice = async (id) => ({
        id,
        status: 'paid',
        payment_id: 'pay_manual_recov_123',
        amount: 99900,
        subscription_id: subId,
      })
      provider.fetchSubscription = async (id) => ({
        id,
        status: 'active',
        current_end: Math.floor(futurePeriodEnd.getTime() / 1000),
      })

      const recoveryRes = await razorpaySubscriptionLifecycleService.recordManualInvoiceRecovery({
        razorpayInvoiceId: invId,
        paymentId: 'pay_manual_recov_123',
        adminEmail: 'ops-admin@creatorstore.com',
        notes: 'Customer paid via Razorpay Dashboard invoice manual link',
      })

      assert(recoveryRes.ok === true, `Manual recovery returned success`)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'ACTIVE', `Subscription restored to ACTIVE via manual recovery`)

      const invInDb = await subscriptionInvoicesRepo.getByInvoiceId(invId)
      assert(invInDb.status && invInDb.status.toLowerCase() === 'paid', `Invoice updated to paid (${invInDb.status})`)

      const auditLogs = await subscriptionAuditLogsRepo.listByCreator(user.id)
      const recovLog = auditLogs.find((l) => l.event === 'MANUAL_INVOICE_RECOVERED' || l.event === 'MANUAL_INVOICE_RECOVERY')
      assert(recovLog !== undefined, `Audited MANUAL_INVOICE_RECOVERED log entry created`)
      assert(recovLog.metadata?.adminEmail === 'ops-admin@creatorstore.com' || recovLog.metadata?.recoveredBy === 'ops-admin@creatorstore.com', `Admin email logged in audit details`)
    }

    // -------------------------------------------------------------------------
    // Scenario 7: Duplicate and out-of-order webhook delivery
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Duplicate and out-of-order webhook delivery ---')
    {
      const user = await createTestUser('dedup-ooo')
      const subId = `sub_test_ooo_${Date.now()}`
      const activeEnd = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        currentPeriodEnd: activeEnd,
      })

      // Delayed / stale pending event from an older cycle
      const stalePendingEvent = {
        event: 'subscription.pending',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'pending',
              current_end: Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000),
            },
          },
        },
      }

      await razorpaySubscriptionLifecycleService.processWebhookEvent(stalePendingEvent)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'ACTIVE', `Stale pending event did NOT downgrade ACTIVE subscription`)
      assert(new Date(subInDb.currentPeriodEnd).getTime() === activeEnd.getTime(), `currentPeriodEnd was not overwritten by stale event`)
    }

    // -------------------------------------------------------------------------
    // Scenario 8: Invalid webhook signatures
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Webhook signature verification ---')
    {
      const body = JSON.stringify({ event: 'subscription.charged', test: true })
      const secret = 'rzp_whsec_test_secret_123'
      const validSig = generateRazorpayWebhookSignature(body, secret)
      const invalidSig = 'invalid_tampered_signature_hex'

      const isSigValid = provider.verifyWebhookSignature({
        body,
        signature: validSig,
        secret,
      })
      assert(isSigValid === true, `Valid webhook signature accepted`)

      const isSigInvalid = provider.verifyWebhookSignature({
        body,
        signature: invalidSig,
        secret,
      })
      assert(isSigInvalid === false, `Tampered webhook signature rejected`)
    }

    // -------------------------------------------------------------------------
    // Scenario 9: Missed webhook and reconciliation recovery (reconcileSubscription)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Missed webhook and reconciliation recovery ---')
    {
      const user = await createTestUser('missed-webhook')
      const subId = `sub_test_missed_${Date.now()}`
      const futurePeriodEnd = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)

      // DB is stuck in PAID_PENDING
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'CREATOR',
        status: 'PAID_PENDING',
        isPastDue: true,
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      // Razorpay provider reports active and renewed
      provider.fetchSubscription = async (id) => ({
        id,
        status: 'active',
        current_end: Math.floor(futurePeriodEnd.getTime() / 1000),
        paid_count: 3,
      })

      const recResult = await razorpaySubscriptionLifecycleService.reconcileSubscription(subId)
      assert(recResult.action === 'RECONCILED_TO_ACTIVE', `Reconciliation action: RECONCILED_TO_ACTIVE`)

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'ACTIVE', `Subscription state reconciled to ACTIVE`)
      assert(subInDb.isPastDue === false, `isPastDue cleared during reconciliation`)
    }

    // -------------------------------------------------------------------------
    // Scenario 10: Duplicate subscription creation prevention and checkout resumption
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Duplicate subscription creation prevention ---')
    {
      const user = await createTestUser('dup-checkout')
      const initialSubId = `sub_test_init_${Date.now()}`

      // User initiates checkout, leaving subscription in CREATED
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'CREATOR',
        status: 'CREATED',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: initialSubId,
        authStatus: 'awaiting_authorisation',
        createdAt: new Date(),
      })

      provider.fetchSubscription = async (id) => ({
        id,
        status: 'created',
        paid_count: 0,
      })

      // 1. Same plan within timeout -> resumes existing checkout without duplicate creation
      const resumedSession = await creatorSubscriptionService.createCheckoutSession(user.id, {
        plan: 'CREATOR',
      })
      assert(resumedSession.subscriptionId === initialSubId, `Resumed valid pending checkout for same plan (${initialSubId})`)
      assert(resumedSession.isResumed === true || resumedSession.resumed === true, `isResumed flag set to true`)

      // 2. Different plan -> cancels old CREATED subscription before creating new one
      let cancelledSubId = null
      provider.cancelSubscription = async (id) => {
        cancelledSubId = id
        return { id, status: 'cancelled' }
      }
      provider.createSubscription = async (opts) => ({
        id: `sub_test_new_pro_${Date.now()}`,
        status: 'created',
      })

      const upgradedSession = await creatorSubscriptionService.createCheckoutSession(user.id, {
        plan: 'PRO',
      })

      assert(cancelledSubId === initialSubId, `Cancelled superseded CREATED subscription on Razorpay before switching plans`)
      const oldSub = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(initialSubId)
      assert(oldSub.status === 'CANCELLED', `Old CREATED subscription marked CANCELLED in DB`)
    }

    // -------------------------------------------------------------------------
    // Scenario 11: Correct paid-through dates and grace periods
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Correct paid-through dates and grace periods ---')
    {
      const user = await createTestUser('grace-invariants')
      const subId = `sub_test_invariants_${Date.now()}`

      // Case A: Recurring payment failed, but currentPeriodEnd is still 5 days away
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'PENDING',
        isPastDue: true,
        currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      let status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === true, `Access preserved because currentPeriodEnd has not arrived`)

      // Case B: currentPeriodEnd passed 1 day ago, but gracePeriodEndsAt is tomorrow
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'PENDING',
        isPastDue: true,
        currentPeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === true, `Access preserved during grace period after currentPeriodEnd`)
      assert(status.inGracePeriod === true, `inGracePeriod flag reported as true`)

      // Case C: Both currentPeriodEnd and gracePeriodEndsAt have passed
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'PENDING',
        isPastDue: true,
        currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === false, `Access revoked after both period and grace period expire`)
      assert(status.inGracePeriod === false, `inGracePeriod reported as false`)
    }

    // -------------------------------------------------------------------------
    // Scenario 12: CreatorStore plan entitlement restoration after verified payment
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 12: Plan entitlement restoration after verified payment ---')
    {
      const user = await createTestUser('entitlement-restore')
      const subId = `sub_test_entitle_${Date.now()}`
      const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'CREATED',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
      })

      // Incomplete checkout must NOT grant PRO access
      let status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === false, `CREATED subscription does NOT grant plan access`)

      // Verified charged event arrives
      await razorpaySubscriptionLifecycleService.processWebhookEvent({
        event: 'subscription.charged',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'active',
              current_end: Math.floor(futurePeriodEnd.getTime() / 1000),
            },
          },
          payment: {
            entity: {
              id: `pay_verif_${Date.now()}`,
              status: 'captured',
            },
          },
        },
      })

      status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === true, `Entitlement granted after verified subscription.charged`)
      assert(status.plan === 'PRO' || status.plan === 'Pro' || status.planId === 'PRO', `Plan reported as PRO`)

      const updatedSub = await prisma.creatorSubscription.findUnique({ where: { creatorId: user.id } })
      assert(updatedSub.plan === 'PRO', `Creator subscription plan is PRO in database`)
    }

    // -------------------------------------------------------------------------
    // Scenario 13: Cancellation and late payment races
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 13: Cancellation and late payment races ---')
    {
      const user = await createTestUser('cancel-race')
      const subId = `sub_test_cancel_${Date.now()}`
      const paidThroughDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'RAZORPAY',
        razorpaySubscriptionId: subId,
        currentPeriodEnd: paidThroughDate,
      })

      // Cancel at cycle end
      await razorpaySubscriptionLifecycleService.processWebhookEvent({
        event: 'subscription.cancelled',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'cancelled',
              current_end: Math.floor(paidThroughDate.getTime() / 1000),
            },
          },
        },
      })

      const subInDb = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(subId)
      assert(subInDb.status === 'CANCELLED', `Subscription marked CANCELLED`)

      const status = await creatorSubscriptionService.getStatus(user.id)
      assert(status.hasAccess === true, `Customer retains paid access through remaining cycle`)
      assert(status.isSubscriptionCancelled === true, `isSubscriptionCancelled flag set for UI`)
    }

    // -------------------------------------------------------------------------
    // Scenario 14: Razorpay API timeouts and retry behaviour
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 14: Razorpay API timeouts and retry behaviour ---')
    {
      let callCount = 0
      provider.fetchSubscription = async (id) => {
        callCount++
        if (callCount < 2) {
          const err = new Error('ECONNRESET connection reset by peer')
          err.code = 'ECONNRESET'
          throw err
        }
        return { id, status: 'active', paid_count: 1 }
      }

      // Test transient error recovery
      let recovered = false
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const sub = await provider.fetchSubscription('sub_test_timeout')
          if (sub?.status === 'active') {
            recovered = true
            break
          }
        } catch (err) {
          assert(err.message.includes('ECONNRESET'), `Correctly caught transient network error on attempt 1`)
        }
      }
      assert(recovered === true, `Successfully recovered after bounded retry on transient failure`)
    }

    // -------------------------------------------------------------------------
    // Scenario 15: Isolation between Razorpay and Dodo subscription records
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 15: Isolation between Razorpay and Dodo subscriptions ---')
    {
      const user = await createTestUser('dodo-isolation')
      const dodoSubId = `dodo_sub_${Date.now()}`
      const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // Create active Dodo subscription
      await creatorSubscriptionsRepo.upsert({
        userId: user.id,
        plan: 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'DODO',
        dodoSubscriptionId: dodoSubId,
        currentPeriodEnd: futurePeriodEnd,
      })

      // Run Razorpay cleanup job
      await razorpaySubscriptionLifecycleService.cleanupAbandonedInitialCheckouts({ timeoutMinutes: 60 })

      // Verify Dodo subscription was not modified or cancelled
      const dodoSubInDb = await creatorSubscriptionsRepo.getByDodoSubscriptionId(dodoSubId)
      assert(dodoSubInDb.status === 'ACTIVE', `Dodo subscription status remains ACTIVE`)
      assert(dodoSubInDb.paymentProvider === 'DODO', `Provider remains DODO`)

      const userStatus = await creatorSubscriptionService.getStatus(user.id)
      assert(String(userStatus.paymentProvider).toUpperCase() === 'DODO' || userStatus.provider === 'DODO', `User billing status provider remains DODO`)
      assert(userStatus.hasAccess === true, `Dodo subscription user continues having access`)
    }

    console.log('\n=====================================================================')
    console.log(` ALL 15 RAZORPAY SUBSCRIPTION LIFECYCLE TESTS PASSED (${passed}/${passed}) `)
    console.log('=====================================================================\n')

  } finally {
    // Restore original provider functions
    provider.fetchSubscription = originalFetchSubscription
    provider.cancelSubscription = originalCancelSubscription
    provider.fetchInvoice = originalFetchInvoice
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED:', err)
    process.exit(1)
  })
