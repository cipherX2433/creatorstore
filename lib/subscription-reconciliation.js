import { prisma } from './prisma.js'
import { dodoProvider } from './dodo.js'
import { usersRepo, creatorSubscriptionsRepo, subscriptionAuditLogsRepo } from './repos.js'
import { getBillingCatalog, PLAN_KEYS } from './billing/config.js'

/**
 * Subscription Reconciliation & Duplicate Detection Module
 *
 * Provides safe detection, analysis, and reconciliation of multi-subscription anomalies
 * across Dodo Payments and local database state.
 *
 * Safety Principles:
 * 1. Read-only by default (dry-run mode).
 * 2. Never cancels customer subscriptions automatically without explicit confirmation.
 * 3. Never deletes historical records.
 * 4. Preserves payment history and audit trails.
 */

// Reverse lookup mapping of Dodo product ID -> { planId, interval, currency, name }
export function getDodoProductMap() {
  const catalog = getBillingCatalog()
  const map = {}

  for (const [planKey, regions] of Object.entries(catalog)) {
    for (const [regionKey, intervals] of Object.entries(regions)) {
      if (typeof intervals === 'object') {
        for (const [intervalKey, config] of Object.entries(intervals)) {
          if (config?.dodoProductId) {
            map[config.dodoProductId] = {
              planId: planKey,
              interval: intervalKey.toUpperCase(),
              currency: config.currency,
              amount: config.amount,
              planName: planKey === 'PRO' ? 'Pro' : 'Creator',
              region: regionKey,
            }
          }
        }
      }
    }
  }

  return map
}

export function identifyProductPlan(productId) {
  const map = getDodoProductMap()
  if (productId && map[productId]) return map[productId]

  const pid = String(productId || '').toLowerCase()
  if (pid.includes('pro')) return { planId: 'PRO', planName: 'Pro', interval: 'MONTHLY', currency: 'USD' }
  if (pid.includes('creator') || pid.includes('starter')) return { planId: 'CREATOR', planName: 'Creator', interval: 'MONTHLY', currency: 'USD' }

  return { planId: 'UNKNOWN', planName: 'Unknown', interval: 'MONTHLY', currency: 'USD' }
}

/**
 * Audit a single user/customer for multiple or conflicting subscriptions.
 */
export async function auditCustomerSubscriptions({ creatorId, customerId, email } = {}) {
  let user = null
  let dbSub = null

  if (creatorId) {
    user = await usersRepo.findById(creatorId).catch(() => null)
    dbSub = await creatorSubscriptionsRepo.getByCreator(creatorId).catch(() => null)
  } else if (email) {
    user = await usersRepo.findByEmail(email).catch(() => null)
    if (user) {
      creatorId = user.id
      dbSub = await creatorSubscriptionsRepo.getByCreator(user.id).catch(() => null)
    }
  }

  const effectiveCustomerId = customerId || dbSub?.dodoCustomerId
  const effectiveEmail = email || user?.email

  let dodoSubs = []

  // 1. Query Dodo by customer ID if known
  if (effectiveCustomerId) {
    try {
      const res = await dodoProvider.listSubscriptions({ customerId: effectiveCustomerId })
      dodoSubs = Array.isArray(res) ? res : (res?.items || [])
    } catch (e) {
      console.warn(`[Reconciliation] Error querying Dodo by customer ID ${effectiveCustomerId}:`, e.message)
    }
  }

  // 2. If no customerId or 0 subs found, try matching by email
  if (dodoSubs.length === 0 && effectiveEmail) {
    try {
      const client = dodoProvider.getClient()
      for await (const sub of client.subscriptions.list()) {
        if (sub.customer?.email && sub.customer.email.toLowerCase() === effectiveEmail.toLowerCase()) {
          dodoSubs.push(sub)
        }
      }
    } catch (e) {
      console.warn(`[Reconciliation] Error scanning Dodo for email ${effectiveEmail}:`, e.message)
    }
  }

  const activeDodoSubs = dodoSubs.filter(s => String(s.status || '').toLowerCase() === 'active')
  const pendingDodoSubs = dodoSubs.filter(s => String(s.status || '').toLowerCase() === 'pending')
  const cancelledDodoSubs = dodoSubs.filter(s => ['cancelled', 'expired', 'failed'].includes(String(s.status || '').toLowerCase()))

  const hasDuplicateActive = activeDodoSubs.length > 1
  const hasDuplicatePending = pendingDodoSubs.length > 1

  // Determine intended subscription
  let intendedSubscription = null
  let unwantedSubscriptions = []
  let isAmbiguous = false
  let ambiguityReason = null

  if (activeDodoSubs.length === 1) {
    intendedSubscription = activeDodoSubs[0]
  } else if (activeDodoSubs.length > 1) {
    // Sort subscriptions:
    // Criteria:
    // 1. Pro plan takes precedence over Creator plan.
    // 2. Newer creation timestamp takes precedence.
    const enriched = activeDodoSubs.map(s => ({
      ...s,
      planInfo: identifyProductPlan(s.product_id),
      createdTime: new Date(s.created_at || 0).getTime(),
    }))

    const proSubs = enriched.filter(s => s.planInfo.planId === 'PRO')
    const creatorSubs = enriched.filter(s => s.planInfo.planId === 'CREATOR')

    if (proSubs.length === 1 && creatorSubs.length >= 1) {
      // Clear upgrade scenario! User upgraded to Pro, and older Creator was left active.
      intendedSubscription = proSubs[0]
      unwantedSubscriptions = creatorSubs
    } else if (proSubs.length > 1) {
      // Multiple Pro active subscriptions! Flag for manual review
      proSubs.sort((a, b) => b.createdTime - a.createdTime)
      intendedSubscription = proSubs[0]
      unwantedSubscriptions = proSubs.slice(1)
      isAmbiguous = true
      ambiguityReason = `Multiple active PRO subscriptions found (${proSubs.map(s => s.subscription_id).join(', ')}). Manual review required.`
    } else if (creatorSubs.length > 1) {
      // Multiple Creator active subscriptions!
      creatorSubs.sort((a, b) => b.createdTime - a.createdTime)
      intendedSubscription = creatorSubs[0]
      unwantedSubscriptions = creatorSubs.slice(1)
      isAmbiguous = true
      ambiguityReason = `Multiple active CREATOR subscriptions found (${creatorSubs.map(s => s.subscription_id).join(', ')}).`
    } else {
      isAmbiguous = true
      ambiguityReason = 'Unrecognized plan combinations detected.'
    }
  }

  return {
    creatorId: creatorId || null,
    email: effectiveEmail || null,
    dodoCustomerId: effectiveCustomerId || null,
    localDbSubscription: dbSub ? {
      id: dbSub.id,
      plan: dbSub.plan,
      status: dbSub.status,
      dodoSubscriptionId: dbSub.dodoSubscriptionId,
      amount: dbSub.amount,
      currency: dbSub.currency,
      currentPeriodEnd: dbSub.currentPeriodEnd,
      updatedAt: dbSub.updatedAt,
    } : null,
    totalDodoSubscriptions: dodoSubs.length,
    activeCount: activeDodoSubs.length,
    pendingCount: pendingDodoSubs.length,
    hasDuplicateActive,
    hasDuplicatePending,
    isAmbiguous,
    ambiguityReason,
    intendedSubscription: intendedSubscription ? {
      subscriptionId: intendedSubscription.subscription_id,
      productId: intendedSubscription.product_id,
      plan: identifyProductPlan(intendedSubscription.product_id).planName,
      status: intendedSubscription.status,
      recurringAmount: intendedSubscription.recurring_pre_tax_amount,
      currency: intendedSubscription.currency,
      createdAt: intendedSubscription.created_at,
      nextBillingDate: intendedSubscription.next_billing_date,
    } : null,
    unwantedSubscriptions: unwantedSubscriptions.map(s => ({
      subscriptionId: s.subscription_id,
      productId: s.product_id,
      plan: identifyProductPlan(s.product_id).planName,
      status: s.status,
      recurringAmount: s.recurring_pre_tax_amount,
      currency: s.currency,
      createdAt: s.created_at,
      nextBillingDate: s.next_billing_date,
    })),
    allDodoSubscriptions: dodoSubs.map(s => ({
      subscriptionId: s.subscription_id,
      productId: s.product_id,
      plan: identifyProductPlan(s.product_id).planName,
      status: s.status,
      recurringAmount: s.recurring_pre_tax_amount,
      currency: s.currency,
      createdAt: s.created_at,
      nextBillingDate: s.next_billing_date,
    })),
  }
}

/**
 * Scan all active creator subscribers in the database for Dodo subscription duplicates.
 */
export async function auditAllActiveSubscribers() {
  const creators = await prisma.creatorSubscription.findMany({
    where: {
      OR: [
        { status: 'ACTIVE' },
        { dodoSubscriptionId: { not: null } },
        { dodoCustomerId: { not: null } },
      ],
    },
    include: { creator: true },
  })

  const results = []
  const duplicates = []

  for (const sub of creators) {
    try {
      const report = await auditCustomerSubscriptions({
        creatorId: sub.creatorId,
        customerId: sub.dodoCustomerId,
        email: sub.creator?.email,
      })
      results.push(report)
      if (report.hasDuplicateActive || report.isAmbiguous) {
        duplicates.push(report)
      }
    } catch (err) {
      console.warn(`[Reconciliation] Error auditing creator ${sub.creatorId}:`, err.message)
    }
  }

  return {
    totalScanned: creators.length,
    totalWithDuplicates: duplicates.length,
    duplicates,
    results,
  }
}

/**
 * Safely cancel an unwanted duplicate subscription on Razorpay or Dodo Payments.
 * Requires explicit confirm: true to prevent accidental cancellation.
 */
export async function cancelUnwantedSubscription({
  subscriptionId,
  creatorId,
  provider = 'DODO',
  reason = 'Duplicate subscription cleanup',
  confirm = false,
  cancelAtNextBillingDate = false, // false = cancel immediately to stop duplicate billing
} = {}) {
  if (!subscriptionId) throw new Error('subscriptionId is required')
  if (!confirm) {
    throw new Error('Safety confirmation required. Pass confirm: true to execute cancellation.')
  }

  const isRazorpay = String(provider).toUpperCase() === 'RAZORPAY' || (subscriptionId.startsWith('sub_') && !subscriptionId.startsWith('sub_dodo_') && String(provider).toUpperCase() === 'RAZORPAY')

  if (isRazorpay) {
    const { getPaymentProvider } = await import('./payments.js')
    const rzpProvider = getPaymentProvider()
    console.log(`[Reconciliation] Cancelling unwanted duplicate subscription ${subscriptionId} on Razorpay (Reason: ${reason})...`)
    const cancelRes = await rzpProvider.cancelSubscription(subscriptionId, cancelAtNextBillingDate)
    await subscriptionAuditLogsRepo.record(creatorId || null, 'DUPLICATE_SUBSCRIPTION_CANCELLED', {
      provider: 'RAZORPAY',
      providerSubscriptionId: subscriptionId,
      reason,
      cancelAtNextBillingDate,
    }).catch(() => {})
    return {
      success: true,
      subscriptionId,
      status: 'CANCELLED',
      message: `Duplicate subscription ${subscriptionId} cancelled successfully on Razorpay.`,
      providerResponse: cancelRes,
    }
  }

  // 1. Verify subscription on Dodo
  const dodoSub = await dodoProvider.getSubscription(subscriptionId)
  if (!dodoSub) {
    throw new Error(`Subscription ${subscriptionId} was not found on Dodo Payments.`)
  }

  console.log(`[Reconciliation] Cancelling unwanted duplicate subscription ${subscriptionId} on Dodo Payments (Reason: ${reason})...`)
  const cancelRes = await dodoProvider.cancelSubscription(subscriptionId, { cancelAtNextBillingDate })

  // 2. Audit log
  await subscriptionAuditLogsRepo.record(creatorId || null, 'DUPLICATE_SUBSCRIPTION_CANCELLED', {
    provider: 'DODO',
    providerSubscriptionId: subscriptionId,
    dodoCustomerId: dodoSub.customer?.customer_id,
    productId: dodoSub.product_id,
    reason,
    cancelAtNextBillingDate,
  }).catch(() => {})

  return {
    success: true,
    subscriptionId,
    status: 'CANCELLED',
    message: `Duplicate subscription ${subscriptionId} cancelled successfully on Dodo Payments.`,
    dodoResponse: cancelRes,
  }
}

/**
 * Scans for any subscriptions that upgraded to PRO where the previous Creator subscription cancellation failed,
 * and retries the cancellation safely.
 */
export async function retryFailedUpgradeCancellations() {
  const failedLogs = await prisma.subscriptionAuditLog.findMany({
    where: {
      event: 'UPGRADE_OLD_SUBSCRIPTION_CANCEL_FAILED',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const results = []
  const { getPaymentProvider } = await import('./payments.js')
  const rzpProvider = getPaymentProvider()

  for (const log of failedLogs) {
    const oldSubId = log.metadata?.oldSubscriptionId
    const newSubId = log.metadata?.newSubscriptionId
    const creatorId = log.creatorId
    if (!oldSubId) continue

    // Check if this was already successfully cancelled subsequently
    const alreadyCancelled = await prisma.subscriptionAuditLog.findFirst({
      where: {
        creatorId,
        event: 'SUPERSEDED_SUBSCRIPTION_CANCELLED',
        metadata: {
          path: ['oldSubscriptionId'],
          equals: oldSubId,
        }
      }
    }).catch(() => null)
    if (alreadyCancelled) continue

    try {
      console.log(`[Reconciliation Retry] Retrying cancellation for superseded subscription ${oldSubId}...`)
      await rzpProvider.cancelSubscription(oldSubId, false)
      await subscriptionAuditLogsRepo.record(creatorId, 'SUPERSEDED_SUBSCRIPTION_CANCELLED', {
        provider: 'RAZORPAY',
        oldSubscriptionId: oldSubId,
        newSubscriptionId: newSubId,
        reason: 'plan_upgraded_reconciliation_retry',
      })
      results.push({ oldSubId, status: 'CANCELLED', success: true })
    } catch (err) {
      console.warn(`[Reconciliation Retry] Retry failed for ${oldSubId}:`, err.message)
      results.push({ oldSubId, status: 'FAILED', error: err.message, success: false })
    }
  }

  return results
}

export const subscriptionReconciliationService = {
  getDodoProductMap,
  identifyProductPlan,
  auditCustomerSubscriptions,
  auditAllActiveSubscribers,
  cancelUnwantedSubscription,
  retryFailedUpgradeCancellations,
}

export default subscriptionReconciliationService
