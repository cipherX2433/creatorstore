import { prisma } from './prisma.js'
import { dodoProvider, getPendingPaymentTTLMinutes, getPendingPaymentTTLMs } from './dodo.js'
import {
  creatorSubscriptionsRepo,
  ordersRepo,
  subscriptionAuditLogsRepo,
  usersRepo,
} from './repos.js'
import { identifyProductPlan } from './subscription-reconciliation.js'
import { webhookService } from './services.js'

/**
 * Payment Lifecycle Management & Stale Payment Cleanup Module
 *
 * Implements production-safe lifecycle management for Dodo Payments:
 * 1. Configurable TTL (DODO_PENDING_PAYMENT_TTL_MINUTES, default 30 min).
 * 2. Distributed locking via PostgreSQL advisory locks (preventing multi-worker race conditions).
 * 3. Authoritative provider re-verification before any state change.
 * 4. Preserves successful payments and active entitlements (never cancels confirmed subscriptions).
 * 5. Reconciles stale processing payments (>20h) and provides exact provider-side resolution paths.
 * 6. Idempotent webhook & cleanup execution with audit trails.
 */

// In-memory fallback lock map for environments where postgres advisory locks are unavailable (e.g. SQLite tests or mock Prisma)
const memoryLockMap = new Map()

export async function withPaymentLock(lockKey, fn) {
  if (!lockKey) return fn()

  // 1. Local in-process lock check (prevents same-process concurrent execution)
  if (memoryLockMap.has(lockKey)) {
    return { skipped: true, reason: 'CONCURRENT_WORKER_ACTIVE', lockKey }
  }

  // 2. Distributed Postgres advisory lock check (prevents multi-instance concurrent execution on Railway)
  let acquiredPgLock = false
  let isPostgres = false

  try {
    const res = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) as locked`
    if (res && res[0] && typeof res[0].locked === 'boolean') {
      isPostgres = true
      acquiredPgLock = res[0].locked
    }
  } catch (err) {
    isPostgres = false
  }

  if (isPostgres && !acquiredPgLock) {
    return { skipped: true, reason: 'CONCURRENT_WORKER_ACTIVE', lockKey }
  }

  memoryLockMap.set(lockKey, Date.now())
  try {
    return await fn()
  } finally {
    memoryLockMap.delete(lockKey)
    if (isPostgres && acquiredPgLock) {
      try {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`
      } catch (e) {}
    }
  }
}

/**
 * Execute an asynchronous function with bounded exponential backoff
 */
export async function withBoundedBackoff(fn, { maxAttempts = 3, initialDelay = 200, factor = 2, maxDelay = 2000 } = {}) {
  let attempt = 0
  let delay = initialDelay

  while (attempt < maxAttempts) {
    try {
      attempt++
      return await fn()
    } catch (err) {
      const status = err?.status || err?.statusCode
      const isNotFound = status === 404 || status === 400 || err?.message?.includes('404') || err?.message?.includes('could not be found')
      if (isNotFound) {
        throw err
      }
      if (attempt >= maxAttempts) {
        throw err
      }
      // Bounded delay
      const wait = Math.min(delay, maxDelay)
      await new Promise((res) => setTimeout(res, wait))
      delay *= factor
    }
  }
}

/**
 * Process a single pending CreatorSubscription (initial checkout)
 */
export async function reconcilePendingSubscriptionCheckout(subscription, { ttlMinutes } = {}) {
  const creatorId = subscription.creatorId
  const sessionId = subscription.dodoSubscriptionId || subscription.providerSubscriptionId

  if (!sessionId || !sessionId.startsWith('cks_')) {
    return { skipped: true, reason: 'NOT_CHECKOUT_SESSION' }
  }

  return await withPaymentLock(`lock_sub_${creatorId}`, async () => {
    // 1. Re-fetch current database record to confirm it is still PENDING
    const currentSub = await creatorSubscriptionsRepo.getByCreator(creatorId)
    if (!currentSub || currentSub.status !== 'PENDING') {
      return { skipped: true, reason: 'ALREADY_RESOLVED', status: currentSub?.status }
    }

    // 2. Query Dodo Payments authoritatively with bounded backoff
    let session = null
    let notFoundOnDodo = false
    try {
      session = await withBoundedBackoff(async () => {
        return await dodoProvider.getCheckoutSession(sessionId)
      })
    } catch (apiErr) {
      const is404 = apiErr?.status === 404 || apiErr?.message?.includes('404') || apiErr?.message?.includes('could not be found')
      if (is404) {
        notFoundOnDodo = true
      } else {
        console.warn(`[Payment Lifecycle] Dodo API unavailable during session retrieval (${sessionId}):`, apiErr.message)
        return { skipped: true, reason: 'API_UNAVAILABLE', error: apiErr.message }
      }
    }

    const effectiveTtlMinutes = ttlMinutes || getPendingPaymentTTLMinutes()
    const createdAt = new Date(currentSub.createdAt || currentSub.updatedAt)
    const ageMs = Date.now() - createdAt.getTime()
    const isPastTtl = ageMs > effectiveTtlMinutes * 60 * 1000

    if (notFoundOnDodo) {
      if (isPastTtl) {
        console.log(`[Payment Lifecycle] Checkout session ${sessionId} not found on Dodo and exceeded TTL (${effectiveTtlMinutes}m). Expiring local attempt...`)
        await creatorSubscriptionsRepo.updateStatus(creatorId, 'EXPIRED', { status: 'EXPIRED' })
        return { resolved: true, action: 'EXPIRED', creatorId, sessionId }
      }
      return { skipped: true, reason: 'NOT_FOUND_WITHIN_TTL' }
    }

    const paymentStatus = session?.payment_status ? String(session.payment_status).toLowerCase() : null
    const paymentId = session?.payment_id || null

    // A. Confirmed SUCCESSFUL payment on Dodo
    if (paymentStatus === 'succeeded') {
      console.log(`[Payment Lifecycle] Checkout session ${sessionId} confirmed succeeded for creator ${creatorId}. Activating subscription...`)
      
      let verifiedSub = null
      if (session.subscription_id) {
        verifiedSub = await dodoProvider.getSubscription(session.subscription_id).catch(() => null)
      }

      const verifiedPlan = identifyProductPlan(verifiedSub?.product_id)
      const targetPlan = verifiedPlan.planId === 'PRO' ? 'PRO' : (currentSub.plan || 'CREATOR')

      const updated = await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
        status: 'ACTIVE',
        plan: targetPlan,
        dodoPaymentId: paymentId || currentSub.dodoPaymentId,
        dodoSubscriptionId: session.subscription_id || currentSub.dodoSubscriptionId,
        providerSubscriptionId: session.subscription_id || currentSub.providerSubscriptionId,
        currentPeriodEnd: verifiedSub?.next_billing_date ? new Date(verifiedSub.next_billing_date) : undefined,
      })

      await subscriptionAuditLogsRepo.record(creatorId, 'STALE_PAYMENT_RECONCILED_SUCCESS', {
        sessionId,
        paymentId,
        plan: targetPlan,
        source: 'cleanup_job',
      }).catch(() => {})

      return {
        resolved: true,
        action: 'ACTIVATED',
        creatorId,
        sessionId,
        paymentId,
        status: 'ACTIVE',
        plan: targetPlan,
      }
    }

    // B. Explicitly FAILED or CANCELLED on Dodo
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      console.log(`[Payment Lifecycle] Checkout session ${sessionId} reported ${paymentStatus} for creator ${creatorId}. Marking terminal...`)
      await creatorSubscriptionsRepo.updateStatus(creatorId, 'FAILED', {
        status: 'FAILED',
      })

      await subscriptionAuditLogsRepo.record(creatorId, 'CHECKOUT_SESSION_FAILED', {
        sessionId,
        paymentId,
        paymentStatus,
        source: 'cleanup_job',
      }).catch(() => {})

      return {
        resolved: true,
        action: 'MARKED_FAILED',
        creatorId,
        sessionId,
        status: 'FAILED',
      }
    }

    // C. Payment is STILL PROCESSING on Dodo
    if (paymentStatus === 'processing') {
      if (isPastTtl) {
        console.log(`[Payment Lifecycle] Checkout session ${sessionId} still 'processing' after ${effectiveTtlMinutes}m TTL. Retaining pending state for reconciliation.`)
        return {
          resolved: false,
          action: 'RETAIN_PROCESSING_PENDING',
          creatorId,
          sessionId,
          ageMinutes: Math.round(ageMs / 60000),
        }
      }
      return { skipped: true, reason: 'PROCESSING_WITHIN_TTL' }
    }

    // D. Still unpaid / details collection stage, older than TTL -> Expire locally
    if (isPastTtl) {
      console.log(`[Payment Lifecycle] Checkout session ${sessionId} for creator ${creatorId} exceeded TTL (${effectiveTtlMinutes}m). Expiring local attempt...`)
      await creatorSubscriptionsRepo.updateStatus(creatorId, 'EXPIRED', {
        status: 'EXPIRED',
      })

      await subscriptionAuditLogsRepo.record(creatorId, 'CHECKOUT_SESSION_EXPIRED', {
        sessionId,
        ageMinutes: Math.round(ageMs / 60000),
        ttlMinutes: effectiveTtlMinutes,
        source: 'cleanup_job',
      }).catch(() => {})

      return {
        resolved: true,
        action: 'EXPIRED',
        creatorId,
        sessionId,
        status: 'EXPIRED',
      }
    }

    return { skipped: true, reason: 'STILL_WITHIN_TTL', ageMinutes: Math.round(ageMs / 60000) }
  })
}

/**
 * Process a pending one-time Product Order
 */
export async function reconcilePendingOrder(order, { ttlMinutes } = {}) {
  const orderId = order.id
  const sessionId = order.dodoSessionId
  const paymentId = order.dodoPaymentId

  if (!sessionId && !paymentId) {
    return { skipped: true, reason: 'NO_PROVIDER_ID' }
  }

  return await withPaymentLock(`lock_order_${orderId}`, async () => {
    const currentOrder = await ordersRepo.getById(orderId)
    if (!currentOrder || currentOrder.status !== 'PENDING') {
      return { skipped: true, reason: 'ALREADY_RESOLVED', status: currentOrder?.status }
    }

    const effectiveTtlMinutes = ttlMinutes || getPendingPaymentTTLMinutes()
    const ageMs = Date.now() - new Date(currentOrder.updatedAt || currentOrder.createdAt).getTime()
    const isPastTtl = ageMs > effectiveTtlMinutes * 60 * 1000

    // 1. Authoritatively check Dodo state
    let dodoPayment = null
    let dodoSession = null
    let notFoundOnDodo = false

    try {
      await withBoundedBackoff(async () => {
        if (paymentId && (paymentId.startsWith('pay_') || paymentId.startsWith('py_'))) {
          dodoPayment = await dodoProvider.getPayment(paymentId)
        } else if (sessionId && sessionId.startsWith('cks_')) {
          dodoSession = await dodoProvider.getCheckoutSession(sessionId)
          if (dodoSession?.payment_id) {
            dodoPayment = await dodoProvider.getPayment(dodoSession.payment_id).catch(() => null)
          }
        } else {
          notFoundOnDodo = true
        }
      })
    } catch (apiErr) {
      const is404 = apiErr?.status === 404 || apiErr?.message?.includes('404') || apiErr?.message?.includes('could not be found')
      if (is404) {
        notFoundOnDodo = true
      } else {
        console.warn(`[Payment Lifecycle] Dodo API unavailable during order retrieval (${orderId}):`, apiErr.message)
        return { skipped: true, reason: 'API_UNAVAILABLE', error: apiErr.message }
      }
    }

    if (notFoundOnDodo) {
      if (isPastTtl) {
        console.log(`[Payment Lifecycle] Order ${orderId} not found on Dodo and exceeded TTL (${effectiveTtlMinutes}m). Marking EXPIRED...`)
        await ordersRepo.update(orderId, { status: 'EXPIRED' })
        return { resolved: true, action: 'EXPIRED', orderId }
      }
      return { skipped: true, reason: 'STILL_WITHIN_TTL' }
    }

    const isSucceeded = dodoPayment?.status === 'succeeded' || dodoSession?.payment_status === 'succeeded'
    const isFailed = dodoPayment?.status === 'failed' || dodoPayment?.status === 'cancelled' || dodoSession?.payment_status === 'failed' || dodoSession?.payment_status === 'cancelled'

    if (isSucceeded) {
      console.log(`[Payment Lifecycle] Order ${orderId} confirmed paid on Dodo. Finalizing order entitlements...`)
      await webhookService.finalizeOrder(orderId, dodoPayment?.payment_id || dodoSession?.payment_id, order.customerEmail)
      return { resolved: true, action: 'FINALIZED_PAID', orderId }
    }

    if (isFailed) {
      console.log(`[Payment Lifecycle] Order ${orderId} confirmed failed on Dodo. Marking FAILED...`)
      await ordersRepo.update(orderId, { status: 'FAILED' })
      return { resolved: true, action: 'MARKED_FAILED', orderId }
    }

    // Check expiration against TTL
    if (isPastTtl) {
      console.log(`[Payment Lifecycle] Order ${orderId} exceeded TTL (${effectiveTtlMinutes}m). Marking EXPIRED...`)
      await ordersRepo.update(orderId, { status: 'EXPIRED' })
      return { resolved: true, action: 'EXPIRED', orderId }
    }

    return { skipped: true, reason: 'STILL_WITHIN_TTL' }
  })
}

/**
 * Reconcile a pending Creator -> Pro plan change upgrade
 */
export async function reconcilePendingPlanUpgrade(subscription, { ttlMinutes } = {}) {
  const creatorId = subscription.creatorId
  const activeDodoSubId = subscription.dodoSubscriptionId || subscription.providerSubscriptionId

  if (!activeDodoSubId || !activeDodoSubId.startsWith('sub_')) {
    return { skipped: true, reason: 'NOT_ACTIVE_DODO_SUB' }
  }

  return await withPaymentLock(`lock_upgrade_${creatorId}`, async () => {
    // 1. Fetch recent payments for this Dodo subscription
    let payments = []
    try {
      payments = await withBoundedBackoff(async () => {
        return await dodoProvider.listPayments({ subscriptionId: activeDodoSubId, limit: 10 })
      })
    } catch (apiErr) {
      console.warn(`[Payment Lifecycle] Dodo API unavailable during payment listing for ${activeDodoSubId}:`, apiErr.message)
      return { skipped: true, reason: 'API_UNAVAILABLE', error: apiErr.message }
    }

    // Find the latest plan change payment
    const upgradePayment = payments.find(p => p.charge_type === 'plan_change' || p.payment_id === subscription.pendingUpgradePaymentId)

    if (!upgradePayment) {
      // If no upgrade payment exists on Dodo, clear any local stale pending upgrade lock
      if (subscription.pendingUpgradeStatus) {
        await creatorSubscriptionsRepo.updateStatus(creatorId, subscription.status, {
          pendingUpgradeStatus: null,
          pendingUpgradePaymentId: null,
          pendingUpgradePlan: null,
          pendingUpgradeStartedAt: null,
          pendingUpgradeErrorMessage: null,
          pendingUpgradePaymentLink: null,
        })
      }
      return { skipped: true, reason: 'NO_PLAN_CHANGE_PAYMENT' }
    }

    const paymentId = upgradePayment.payment_id
    const paymentStatus = String(upgradePayment.status || '').toLowerCase()
    const errorMessage = upgradePayment.error_message || null
    const createdAt = upgradePayment.created_at ? new Date(upgradePayment.created_at) : new Date(subscription.updatedAt)
    const ageMs = Date.now() - createdAt.getTime()
    const effectiveTtlMinutes = ttlMinutes || getPendingPaymentTTLMinutes()
    const isPastTtl = ageMs > effectiveTtlMinutes * 60 * 1000

    const verifiedSub = await dodoProvider.getSubscription(activeDodoSubId).catch(() => null)
    const verifiedPlan = identifyProductPlan(verifiedSub?.product_id)

    // Reconcile false PRO entitlement in DB where authoritative Dodo subscription is CREATOR and no Pro payment succeeded
    if (subscription.plan === 'PRO' && verifiedPlan.planId === 'CREATOR') {
      const hasSucceededProPayment = payments.some(p => p.status === 'succeeded' && (identifyProductPlan(p.product_id).planId === 'PRO' || p.metadata?.planId === 'PRO'))
      if (!hasSucceededProPayment) {
        console.warn(`[Payment Lifecycle] Subscription for creator ${creatorId} is marked PRO in DB, but authoritative Dodo subscription ${activeDodoSubId} is CREATOR (${verifiedSub?.product_id}) and no Pro payment succeeded. Reconciling to CREATOR.`)
        await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
          plan: 'CREATOR',
          amount: 6,
          currency: 'USD',
          pendingUpgradeStatus: (upgradePayment?.status === 'processing' || upgradePayment?.status === 'pending') ? 'STALE_PROCESSING' : null,
          pendingUpgradeErrorMessage: (upgradePayment?.status === 'processing' || upgradePayment?.status === 'pending')
            ? `Upgrade payment ${upgradePayment.payment_id} is in Processing with Dodo Payments. Pro entitlements require authoritative payment confirmation.`
            : null,
        })
        await subscriptionAuditLogsRepo.record(creatorId, 'FALSE_PRO_ENTITLEMENT_RECONCILED_TO_CREATOR', {
          providerSubscriptionId: activeDodoSubId,
          dodoProductId: verifiedSub?.product_id,
          reconciledPlan: 'CREATOR',
          paymentId: upgradePayment?.payment_id || null,
          source: 'reconciliation_job',
        }).catch(() => {})
      }
    }

    // A. Confirmed SUCCEEDED payment on Dodo
    if (paymentStatus === 'succeeded') {
      console.log(`[Payment Lifecycle] Upgrade payment ${paymentId} succeeded for creator ${creatorId}. Reconciling to PRO...`)
      
      const isConfirmedPro = verifiedPlan.planId === 'PRO' || identifyProductPlan(upgradePayment.product_id).planId === 'PRO' || upgradePayment.metadata?.planId === 'PRO'

      if (isConfirmedPro) {
        await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
          plan: 'PRO',
          dodoPaymentId: paymentId,
          currentPeriodEnd: verifiedSub?.next_billing_date ? new Date(verifiedSub.next_billing_date) : undefined,
          pendingUpgradeStatus: null,
          pendingUpgradePaymentId: null,
          pendingUpgradePlan: null,
          pendingUpgradeStartedAt: null,
          pendingUpgradeErrorMessage: null,
          pendingUpgradePaymentLink: null,
        })

        await subscriptionAuditLogsRepo.record(creatorId, 'PLAN_UPGRADE_RECONCILED_SUCCESS', {
          providerSubscriptionId: activeDodoSubId,
          paymentId,
          plan: 'PRO',
          source: 'cleanup_job',
        }).catch(() => {})

        return { resolved: true, action: 'UPGRADED_PRO', creatorId, paymentId }
      }
    }

    // B. Explicitly FAILED or CANCELLED or declined with error_message
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || errorMessage) {
      console.log(`[Payment Lifecycle] Upgrade payment ${paymentId} failed/declined for creator ${creatorId}. Releasing upgrade lock...`)
      
      await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
        pendingUpgradeStatus: 'FAILED',
        pendingUpgradeErrorMessage: errorMessage || 'Payment authentication failed or was declined',
      })

      await subscriptionAuditLogsRepo.record(creatorId, 'PLAN_UPGRADE_RECONCILED_FAILED', {
        providerSubscriptionId: activeDodoSubId,
        paymentId,
        error: errorMessage || 'Declined',
        source: 'cleanup_job',
      }).catch(() => {})

      return { resolved: true, action: 'UPGRADE_FAILED_RELEASED', creatorId, paymentId }
    }

    // C. Provider reports PROCESSING or PENDING
    if (paymentStatus === 'processing' || paymentStatus === 'pending') {
      if (!isPastTtl) {
        // Still actively processing within TTL window
        return {
          skipped: true,
          reason: 'PROCESSING_WITHIN_TTL',
          ageMinutes: Math.round(ageMs / 60000),
          ttlMinutes: effectiveTtlMinutes,
        }
      }

      // Past TTL (> 30 min, e.g. 20+ hours!)
      console.warn(`[Payment Lifecycle] Upgrade payment ${paymentId} has remained in '${paymentStatus}' for ${Math.round(ageMs / 3600000)}h (Sub: ${activeDodoSubId}). Stale investigation required.`)

      // Check if Dodo subscription has a scheduled plan change that can be cancelled
      let dodoSubDetails = null
      try {
        dodoSubDetails = await dodoProvider.getSubscription(activeDodoSubId)
        if (dodoSubDetails?.scheduled_change) {
          console.log(`[Payment Lifecycle] Found scheduled plan change on Dodo for ${activeDodoSubId}. Cancelling scheduled change via Dodo API...`)
          await dodoProvider.cancelScheduledChangePlan(activeDodoSubId).catch((cancelErr) => {
            console.warn(`[Payment Lifecycle] Unable to cancel scheduled change plan for ${activeDodoSubId}:`, cancelErr.message)
          })
        }
      } catch (subErr) {
        console.warn(`[Payment Lifecycle] Error checking subscription ${activeDodoSubId}:`, subErr.message)
      }

      // Do NOT falsely mark cancelled if Dodo still reports Processing for in-flight card payment!
      // Mark local status as STALE_PROCESSING with exact provider resolution
      const staleResolutionMessage = `Payment ${paymentId} has been in Processing with Dodo Payments for ${Math.round(ageMs / 3600000)} hours. Dodo does not allow automated cancellation of in-flight card authorizations. Resolution: Please update your payment method to replace this payment, or contact Dodo Payments support quoting Payment ID ${paymentId}.`

      await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
        pendingUpgradeStatus: 'STALE_PROCESSING',
        pendingUpgradeErrorMessage: staleResolutionMessage,
        pendingUpgradePaymentId: paymentId,
      })

      await subscriptionAuditLogsRepo.record(creatorId, 'STALE_PLAN_CHANGE_FLAGGED', {
        providerSubscriptionId: activeDodoSubId,
        paymentId,
        ageHours: Math.round(ageMs / 3600000),
        status: paymentStatus,
        requiredResolution: staleResolutionMessage,
        source: 'cleanup_job',
      }).catch(() => {})

      return {
        resolved: false,
        stale: true,
        needsAttention: true,
        action: 'FLAGGED_STALE_PROCESSING',
        creatorId,
        paymentId,
        status: 'STALE_PROCESSING',
        message: staleResolutionMessage,
      }
    }

    return { skipped: true, reason: 'UNKNOWN_STATUS', paymentStatus }
  })
}

/**
 * Run full automated cleanup across all eligible stale pending payments and plan changes
 */
export async function runStalePaymentCleanup({ ttlMinutes } = {}) {
  const startTime = Date.now()
  const effectiveTtl = ttlMinutes || getPendingPaymentTTLMinutes()
  const cutoffDate = new Date(Date.now() - effectiveTtl * 60 * 1000)

  console.log(`[Payment Cleanup] Starting automated stale payment cleanup (TTL: ${effectiveTtl} minutes, Cutoff: ${cutoffDate.toISOString()})...`)

  const summary = {
    ttlMinutes: effectiveTtl,
    cutoffDate: cutoffDate.toISOString(),
    scanned: 0,
    reconciledSuccess: 0,
    expired: 0,
    failedReleased: 0,
    staleProcessing: 0,
    errors: [],
    durationMs: 0,
  }

  // 1. Process stale pending initial checkout subscriptions
  try {
    const staleSubs = await creatorSubscriptionsRepo.findStalePendingCheckouts(cutoffDate)
    summary.scanned += staleSubs.length

    for (const sub of staleSubs) {
      try {
        const res = await reconcilePendingSubscriptionCheckout(sub, { ttlMinutes: effectiveTtl })
        if (res.action === 'ACTIVATED') summary.reconciledSuccess++
        if (res.action === 'EXPIRED') summary.expired++
        if (res.action === 'MARKED_FAILED') summary.failedReleased++
      } catch (subErr) {
        console.error(`[Payment Cleanup] Error reconciling sub ${sub.id}:`, subErr.message)
        summary.errors.push({ id: sub.id, error: subErr.message })
      }
    }
  } catch (err) {
    console.error('[Payment Cleanup] Error scanning stale checkout subscriptions:', err.message)
    summary.errors.push({ phase: 'subscriptions_scan', error: err.message })
  }

  // 2. Process stale pending product orders
  try {
    const staleOrders = await ordersRepo.findStalePendingOrders(cutoffDate)
    summary.scanned += staleOrders.length

    for (const order of staleOrders) {
      try {
        const res = await reconcilePendingOrder(order, { ttlMinutes: effectiveTtl })
        if (res.action === 'FINALIZED_PAID') summary.reconciledSuccess++
        if (res.action === 'EXPIRED') summary.expired++
        if (res.action === 'MARKED_FAILED') summary.failedReleased++
      } catch (orderErr) {
        console.error(`[Payment Cleanup] Error reconciling order ${order.id}:`, orderErr.message)
        summary.errors.push({ id: order.id, error: orderErr.message })
      }
    }
  } catch (err) {
    console.error('[Payment Cleanup] Error scanning stale orders:', err.message)
    summary.errors.push({ phase: 'orders_scan', error: err.message })
  }

  // 3. Process active subscriptions with pending plan upgrade payments
  try {
    // Find active subscriptions with Dodo that may have in-flight upgrade payments
    const activeCreators = await prisma.creatorSubscription.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { pendingUpgradeStatus: { in: ['PENDING', 'PROCESSING', 'STALE_PROCESSING'] } },
          { dodoSubscriptionId: { startsWith: 'sub_' } },
        ],
      },
    })

    summary.scanned += activeCreators.length

    for (const creatorSub of activeCreators) {
      try {
        const res = await reconcilePendingPlanUpgrade(creatorSub, { ttlMinutes: effectiveTtl })
        if (res.action === 'UPGRADED_PRO') summary.reconciledSuccess++
        if (res.action === 'UPGRADE_FAILED_RELEASED') summary.failedReleased++
        if (res.action === 'FLAGGED_STALE_PROCESSING') summary.staleProcessing++
      } catch (upgradeErr) {
        console.error(`[Payment Cleanup] Error checking upgrade for ${creatorSub.creatorId}:`, upgradeErr.message)
        summary.errors.push({ id: creatorSub.creatorId, error: upgradeErr.message })
      }
    }
  } catch (err) {
    console.error('[Payment Cleanup] Error scanning active upgrades:', err.message)
    summary.errors.push({ phase: 'upgrades_scan', error: err.message })
  }

  summary.durationMs = Date.now() - startTime
  console.log(`[Payment Cleanup] Finished in ${summary.durationMs}ms. Summary: ${JSON.stringify(summary)}`)
  return summary
}

export const paymentLifecycleService = {
  getTTLMinutes: getPendingPaymentTTLMinutes,
  getTTLMs: getPendingPaymentTTLMs,
  withPaymentLock,
  withBoundedBackoff,
  reconcilePendingSubscriptionCheckout,
  reconcilePendingOrder,
  reconcilePendingPlanUpgrade,
  runStalePaymentCleanup,
}

export default paymentLifecycleService
