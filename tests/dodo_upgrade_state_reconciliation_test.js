/**
 * CreatorStore — Dodo Upgrade State Reconciliation & Regression Test Suite
 *
 * Specifically verifies:
 * 1. Successful payment: Authoritatively updates plan to PRO and grants Pro entitlements.
 * 2. Pending payment: Preserves active Creator entitlements, reports pending upgrade state, does not activate Pro prematurely.
 * 3. Failed payment: (e.g. 'authentication Failed') preserves Creator access, reports failure, provides safe card recovery path without duplicate billing.
 * 4. Delayed webhook: Out-of-order or delayed webhook delivery is handled idempotently without corrupting active status or creating duplicate records.
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
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'

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

async function run() {
  console.log('\n===============================================================')
  console.log('🧪 Dodo Upgrade State Reconciliation Regression Test Suite')
  console.log('===============================================================\n')

  const testEmail = `reconcile_test_${Date.now()}@example.com`
  let user = null
  let originalGetPayment = dodoProvider.getPayment
  let originalGetSubscription = dodoProvider.getSubscription
  let originalGetClient = dodoProvider.getClient

  try {
    // Setup test user
    const regResult = await authService.signup({
      name: 'Reconciliation Tester',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'CREATOR',
      storeName: `Recon Store ${Date.now()}`,
      slug: `recon-store-${Date.now()}`,
    })
    const userId = regResult.user?.id || regResult.id
    user = { id: userId, email: testEmail }

    const dodoSubId = `sub_test_${uuidv4().replace(/-/g, '').slice(0, 16)}`
    const dodoCustId = `cus_test_${uuidv4().replace(/-/g, '').slice(0, 16)}`
    const creatorPayId = `pay_initial_${uuidv4().replace(/-/g, '').slice(0, 14)}`
    const upgradePayId = `pay_upgrade_${uuidv4().replace(/-/g, '').slice(0, 14)}`

    // Seed active Creator subscription in database
    await creatorSubscriptionsRepo.upsert(user.id, {
      plan: 'CREATOR',
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      billingCycle: 'MONTHLY',
      price: 699.03,
      currency: 'INR',
      provider: 'DODO',
      providerSubscriptionId: dodoSubId,
      dodoSubscriptionId: dodoSubId,
      dodoCustomerId: dodoCustId,
      dodoPaymentId: creatorPayId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    console.log('📋 Test Environment initialized with Active Creator subscription:')
    console.log(`   User ID: ${user.id}`)
    console.log(`   Subscription ID: ${dodoSubId}`)
    console.log(`   Creator Payment ID: ${creatorPayId} (₹699.03)\n`)

    // =========================================================================
    // SCENARIO 1: Pending Upgrade Payment State
    // =========================================================================
    console.log('▶ Test 1: Pending Payment (Dodo reports processing)')

    // Mock Dodo client payments list returning initial succeeded payment and pending upgrade payment
    dodoProvider.getClient = () => ({
      payments: {
        list: async function* () {
          yield {
            payment_id: upgradePayId,
            status: 'processing',
            total_amount: 69904,
            currency: 'INR',
            charge_type: 'plan_change',
            created_at: new Date().toISOString(),
            error_message: null,
            payment_link: null,
          }
          yield {
            payment_id: creatorPayId,
            status: 'succeeded',
            total_amount: 69903,
            currency: 'INR',
            charge_type: 'new',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            error_message: null,
          }
        },
      },
      subscriptions: {
        retrieve: async () => ({
          subscription_id: dodoSubId,
          status: 'active',
          product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk', // CREATOR
        }),
      },
    })

    const pendingStatus = await creatorSubscriptionService.getStatus(user.id)

    assert(pendingStatus.planId === 'CREATOR', 'Pending payment keeps user on CREATOR plan')
    assert(pendingStatus.status === 'ACTIVE', 'Existing Creator subscription remains ACTIVE')
    assert(pendingStatus.pendingUpgrade !== null, 'pendingUpgrade object is populated')
    assert(pendingStatus.pendingUpgrade.paymentId === upgradePayId, 'Correlates pending payment ID')
    assert(pendingStatus.pendingUpgrade.status === 'PROCESSING', 'Reports PROCESSING status')
    assert(pendingStatus.paymentHistory.length === 2, 'Authentic payment history includes both payments')
    assert(pendingStatus.paymentHistory[0].status === 'Processing', 'Upgrade payment listed as Processing')
    assert(pendingStatus.paymentHistory[1].status === 'Successful', 'Initial payment listed as Successful')

    // Entitlement check during pending payment
    assert(pendingStatus.entitlements.canPublish === true, 'Existing Creator entitlement canPublish remains true')
    assert(pendingStatus.entitlements.advancedAnalytics === false, 'Pro entitlement advancedAnalytics is NOT granted on pending payment')
    assert(pendingStatus.entitlements.leadExport === false, 'Pro entitlement leadExport is NOT granted on pending payment')

    // =========================================================================
    // SCENARIO 2: Failed Payment with Authentication Error & Safe Recovery
    // =========================================================================
    console.log('\n▶ Test 2: Failed Payment (Authentication failed off-session)')

    dodoProvider.getClient = () => ({
      payments: {
        list: async function* () {
          yield {
            payment_id: upgradePayId,
            status: 'processing',
            total_amount: 69904,
            currency: 'INR',
            charge_type: 'plan_change',
            created_at: new Date().toISOString(),
            error_message: 'authentication Failed',
            payment_link: null,
          }
          yield {
            payment_id: creatorPayId,
            status: 'succeeded',
            total_amount: 69903,
            currency: 'INR',
            charge_type: 'new',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            error_message: null,
          }
        },
      },
      subscriptions: {
        retrieve: async () => ({
          subscription_id: dodoSubId,
          status: 'active',
          product_id: 'pdt_0Npr1TTLQxbN2SyyZFuuk',
        }),
        updatePaymentMethod: async (subId, payload) => ({
          subscription_id: subId,
          payment_link: 'https://test.dodopayments.com/update-payment-method/chk_123',
          payment_id: 'pay_update_session_123',
          expires_on: new Date(Date.now() + 1800000).toISOString(),
        }),
      },
    })

    const failedStatus = await creatorSubscriptionService.getStatus(user.id)

    assert(failedStatus.planId === 'CREATOR', 'Failed payment preserves CREATOR plan')
    assert(failedStatus.status === 'ACTIVE', 'Creator subscription remains ACTIVE despite payment error')
    assert(failedStatus.pendingUpgrade.errorMessage === 'authentication Failed', 'Surfaces error_message from Dodo')

    // Test safe recovery path without duplicate subscription
    const recoveryRes = await creatorSubscriptionService.updatePaymentMethod(user.id)
    assert(recoveryRes.success === true, 'updatePaymentMethod initiates successfully')
    assert(recoveryRes.checkoutUrl === 'https://test.dodopayments.com/update-payment-method/chk_123', 'Returns Dodo card update link')

    // Verify database still has exactly one subscription record for creator
    const subCount = await prisma.creatorSubscription.count({ where: { creatorId: user.id } })
    assert(subCount === 1, 'No duplicate subscription record was created during recovery')

    // =========================================================================
    // SCENARIO 3: Delayed / Out-of-Order Webhook Handling
    // =========================================================================
    console.log('\n▶ Test 3: Delayed Webhook (payment.processing and out-of-order events)')

    // A: Incoming payment.processing webhook
    const processingWebhookPayload = {
      event_id: `evt_proc_${Date.now()}`,
      type: 'payment.processing',
      data: {
        payment_id: upgradePayId,
        subscription_id: dodoSubId,
        customer: { customer_id: dodoCustId, email: testEmail },
        total_amount: 69904,
        currency: 'INR',
        charge_type: 'plan_change',
        error_message: 'authentication Failed',
      },
    }

    const procWebhookRes = await webhookService.handle(processingWebhookPayload)
    assert(procWebhookRes.ok === true, 'payment.processing webhook acknowledged')

    // Verify creator subscription in DB was not prematurely modified
    const subAfterProcWebhook = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(subAfterProcWebhook.plan === 'CREATOR', 'Webhook did not prematurely upgrade to PRO')
    assert(subAfterProcWebhook.status === 'ACTIVE', 'Webhook did not alter active Creator status')

    // B: Delayed webhook arriving twice (idempotency check)
    const duplicateProcRes = await webhookService.handle(processingWebhookPayload)
    assert(duplicateProcRes.duplicate === true, 'Duplicate webhook handled idempotently')

    // =========================================================================
    // SCENARIO 4: Authoritative Successful Upgrade
    // =========================================================================
    console.log('\n▶ Test 4: Successful Payment (Authoritative upgrade confirmation)')

    // Mock Dodo client returning succeeded plan change payment and updated Pro subscription
    dodoProvider.getClient = () => ({
      payments: {
        list: async function* () {
          yield {
            payment_id: upgradePayId,
            status: 'succeeded',
            total_amount: 69904,
            currency: 'INR',
            charge_type: 'plan_change',
            created_at: new Date().toISOString(),
            error_message: null,
          }
          yield {
            payment_id: creatorPayId,
            status: 'succeeded',
            total_amount: 69903,
            currency: 'INR',
            charge_type: 'new',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            error_message: null,
          }
        },
      },
      subscriptions: {
        retrieve: async () => ({
          subscription_id: dodoSubId,
          status: 'active',
          product_id: 'pdt_0Npr1TQvpN3wjhmxI9i8B', // PRO product ID from .env
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      },
    })
    dodoProvider.getSubscription = async () => ({
      subscription_id: dodoSubId,
      status: 'active',
      product_id: 'pdt_0Npr1TQvpN3wjhmxI9i8B', // PRO product ID from .env
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Calling getStatus reconciles authoritatively
    const reconciledStatus = await creatorSubscriptionService.getStatus(user.id)

    assert(reconciledStatus.planId === 'PRO', 'Reconciled plan is PRO')
    assert(reconciledStatus.status === 'ACTIVE', 'Reconciled subscription status is ACTIVE')
    assert(reconciledStatus.pendingUpgrade === null, 'pendingUpgrade cleared once confirmed')

    // Entitlement check after successful upgrade
    assert(reconciledStatus.entitlements.advancedAnalytics === true, 'Pro entitlement advancedAnalytics is authoritatively unlocked')
    assert(reconciledStatus.entitlements.leadExport === true, 'Pro entitlement leadExport is authoritatively unlocked')

    // Double check DB state
    const finalSub = await creatorSubscriptionsRepo.getByCreator(user.id)
    assert(finalSub.plan === 'PRO', 'Database updated to PRO')
    assert(finalSub.status === 'ACTIVE', 'Database status remains ACTIVE')
    assert(finalSub.dodoPaymentId === upgradePayId, 'Database records upgrade payment ID')

    console.log('\n===============================================================')
    console.log(`🎉 ALL RECONCILIATION TESTS PASSED: ${passed}/${passed + failed}`)
    console.log('===============================================================\n')
  } catch (err) {
    console.error('\n💥 Test Failed with error:', err)
    process.exit(1)
  } finally {
    // Restore mocks
    dodoProvider.getPayment = originalGetPayment
    dodoProvider.getSubscription = originalGetSubscription
    dodoProvider.getClient = originalGetClient

    // Cleanup test user
    if (user) {
      await prisma.subscriptionAuditLog.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {})
    }
  }
}

run()
