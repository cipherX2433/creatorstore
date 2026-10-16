import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { usersRepo, creatorSubscriptionsRepo, profilesRepo, webhookEventsRepo } from '../lib/repos.js'
import { creatorSubscriptionService, webhookService, authService } from '../lib/services.js'
import { getPaymentProvider } from '../lib/payments.js'
import { paypalProvider } from '../lib/paypal.js'
import { BILLING_REGIONS, normalizeRegion, resolveBillingConfig, getBillingCatalog } from '../lib/billing/config.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    throw new Error(message)
  }
  console.log(`✅ PASS: ${message}`)
}

async function runAuditAndTests() {
  console.log('====================================================')
  console.log('🚀 RUNNING INDIA + INTERNATIONAL SUBSCRIPTION AUDIT')
  console.log('====================================================\n')

  // ====================================================================
  // TEST GROUP 1: Centralized Server-Side Billing Configuration
  // ====================================================================
  console.log('--- GROUP 1: Centralized Server-Side Billing Resolution ---')

  // Region Normalization
  assert(normalizeRegion('IN') === BILLING_REGIONS.INDIA, 'Region "IN" normalizes to INDIA')
  assert(normalizeRegion('india') === BILLING_REGIONS.INDIA, 'Region "india" normalizes to INDIA')
  assert(normalizeRegion('Domestic') === BILLING_REGIONS.INDIA, 'Region "Domestic" normalizes to INDIA')
  assert(normalizeRegion(null) === BILLING_REGIONS.INDIA, 'Null region defaults safely to INDIA')
  assert(normalizeRegion('INTERNATIONAL') === BILLING_REGIONS.INTERNATIONAL, 'Region "INTERNATIONAL" normalizes to INTERNATIONAL')
  assert(normalizeRegion('outside_india') === BILLING_REGIONS.INTERNATIONAL, 'Region "outside_india" normalizes to INTERNATIONAL')
  assert(normalizeRegion('US') === BILLING_REGIONS.INTERNATIONAL, 'Region "US" normalizes to INTERNATIONAL')
  assert(normalizeRegion('global') === BILLING_REGIONS.INTERNATIONAL, 'Region "global" normalizes to INTERNATIONAL')

  // India Domestic Plans (INR)
  const inCreatorMonthly = resolveBillingConfig({ plan: 'CREATOR', interval: 'monthly', region: 'IN' })
  assert(inCreatorMonthly.currency === 'INR', 'India Creator Monthly currency is INR')
  assert(inCreatorMonthly.amount === 499, 'India Creator Monthly amount is ₹499')
  assert(inCreatorMonthly.amountSmallestUnit === 49900, 'India Creator Monthly amount is 49900 paise')
  assert(inCreatorMonthly.flowType === 'subscription', 'India Creator Monthly flowType is subscription')

  const inCreatorAnnual = resolveBillingConfig({ plan: 'CREATOR', interval: 'annual', region: 'INDIA' })
  assert(inCreatorAnnual.currency === 'INR', 'India Creator Annual currency is INR')
  assert(inCreatorAnnual.amount === 4790, 'India Creator Annual amount is ₹4,790')
  assert(inCreatorAnnual.amountSmallestUnit === 479000, 'India Creator Annual amount is 479000 paise')

  const inProMonthly = resolveBillingConfig({ plan: 'PRO', interval: 'monthly', region: 'IN' })
  assert(inProMonthly.currency === 'INR', 'India Pro Monthly currency is INR')
  assert(inProMonthly.amount === 999, 'India Pro Monthly amount is ₹999')
  assert(inProMonthly.amountSmallestUnit === 99900, 'India Pro Monthly amount is 99900 paise')

  const inProAnnual = resolveBillingConfig({ plan: 'PRO', interval: 'annual', region: 'INDIA' })
  assert(inProAnnual.currency === 'INR', 'India Pro Annual currency is INR')
  assert(inProAnnual.amount === 9590, 'India Pro Annual amount is ₹9,590')
  assert(inProAnnual.amountSmallestUnit === 959000, 'India Pro Annual amount is 959000 paise')

  // Outside India International Plans (USD) - Routed to PayPal
  const intlCreatorMonthly = resolveBillingConfig({ plan: 'CREATOR', interval: 'monthly', region: 'INTERNATIONAL' })
  assert(intlCreatorMonthly.provider === 'paypal', 'International Creator Monthly provider is paypal')
  assert(intlCreatorMonthly.currency === 'USD', 'International Creator Monthly currency is USD')
  assert(intlCreatorMonthly.amount === 6, 'International Creator Monthly amount is $6')
  assert(intlCreatorMonthly.amountSmallestUnit === 600, 'International Creator Monthly amount is 600 cents')
  assert(intlCreatorMonthly.flowType === 'subscription', 'International Creator Monthly flowType is subscription (direct PayPal subscription)')
  assert(intlCreatorMonthly.isRecurring === true, 'International Creator Monthly is recurring')
  assert(intlCreatorMonthly.renewalType === 'AUTO_RENEWING', 'International Creator Monthly renewalType is AUTO_RENEWING')
  assert(intlCreatorMonthly.planIdPayPal === 'P-06L05256BW4479128NLFBZCA', 'International Creator Monthly planIdPayPal matches configured plan')

  const intlCreatorAnnual = resolveBillingConfig({ plan: 'CREATOR', interval: 'annual', region: 'OUTSIDE_INDIA' })
  assert(intlCreatorAnnual.provider === 'paypal', 'International Creator Annual provider is paypal')
  assert(intlCreatorAnnual.currency === 'USD', 'International Creator Annual currency is USD')
  assert(intlCreatorAnnual.amount === 58, 'International Creator Annual amount is $58')
  assert(intlCreatorAnnual.amountSmallestUnit === 5800, 'International Creator Annual amount is 5800 cents')

  const intlProMonthly = resolveBillingConfig({ plan: 'PRO', interval: 'monthly', region: 'INTERNATIONAL' })
  assert(intlProMonthly.provider === 'paypal', 'International Pro Monthly provider is paypal')
  assert(intlProMonthly.currency === 'USD', 'International Pro Monthly currency is USD')
  assert(intlProMonthly.amount === 12, 'International Pro Monthly amount is $12')
  assert(intlProMonthly.amountSmallestUnit === 1200, 'International Pro Monthly amount is 1200 cents')
  assert(intlProMonthly.flowType === 'subscription', 'International Pro Monthly flowType is subscription (direct PayPal subscription)')
  assert(intlProMonthly.isRecurring === true, 'International Pro Monthly is recurring')
  assert(intlProMonthly.renewalType === 'AUTO_RENEWING', 'International Pro Monthly renewalType is AUTO_RENEWING')
  assert(intlProMonthly.planIdPayPal === 'P-19001753VV158844WNLFB3ZA', 'International Pro Monthly planIdPayPal matches configured plan')

  const intlProAnnual = resolveBillingConfig({ plan: 'PRO', interval: 'annual', region: 'INTERNATIONAL' })
  assert(intlProAnnual.provider === 'paypal', 'International Pro Annual provider is paypal')
  assert(intlProAnnual.currency === 'USD', 'International Pro Annual currency is USD')
  assert(intlProAnnual.amount === 115, 'International Pro Annual amount is $115')
  assert(intlProAnnual.amountSmallestUnit === 11500, 'International Pro Annual amount is 11500 cents')

  // ====================================================================
  // TEST GROUP 2: Creator India Checkout & Verification Flow (Razorpay)
  // ====================================================================
  console.log('\n--- GROUP 2: India INR Subscription Flow (Razorpay) ---')

  const timestamp = Date.now()
  const testUser = await authService.signup({
    email: `india_creator_${timestamp}@example.com`,
    password: `Pass_In_${timestamp}!`,
    name: `India Creator ${timestamp}`,
    role: 'CREATOR',
    storeName: `India Store ${timestamp}`,
    slug: `india-store-${timestamp}`,
  })
  const indiaCreatorId = testUser.user?.id || testUser.id
  assert(Boolean(indiaCreatorId), `Created test creator: ${indiaCreatorId}`)

  // Create India Checkout Session
  const inCheckout = await creatorSubscriptionService.createCheckoutSession(indiaCreatorId, {
    plan: 'PRO',
    interval: 'monthly',
    region: 'INDIA',
  })

  assert(inCheckout.provider === 'razorpay', `India checkout provider is razorpay`)
  assert(inCheckout.currency === 'INR', `Checkout session currency is INR`)
  assert(inCheckout.price === 999, `Checkout price is ₹999`)
  assert(inCheckout.orderId || inCheckout.subscriptionId, `Received Razorpay session ID: ${inCheckout.orderId || inCheckout.subscriptionId}`)
  assert(inCheckout.region === 'INDIA', `Region is INDIA`)

  // Verify DB state is PENDING
  const pendingSubIn = await creatorSubscriptionsRepo.getByCreator(indiaCreatorId)
  assert(pendingSubIn.status === 'PENDING', `Database status is PENDING`)
  assert(pendingSubIn.currency === 'INR', `Database currency is INR`)
  assert(pendingSubIn.provider === 'RAZORPAY', `Database provider is RAZORPAY`)

  // Cryptographic Signature Verification & Activation
  const provider = getPaymentProvider()
  const inPaymentId = `pay_in_${Date.now().toString(36)}`
  const inSubId = inCheckout.subscriptionId || inCheckout.orderId
  const inSig = provider.keySecret
    ? crypto.createHmac('sha256', provider.keySecret).update(`${inPaymentId}|${inSubId}`).digest('hex')
    : 'sig_mock'

  const inVerify = await creatorSubscriptionService.verifySubscriptionPayment(indiaCreatorId, {
    razorpaySubscriptionId: inSubId,
    razorpayPaymentId: inPaymentId,
    razorpaySignature: inSig,
    region: 'INDIA',
  })

  assert(inVerify.status === 'ACTIVE', `India subscription successfully activated`)
  assert(inVerify.provider === 'RAZORPAY', `Verified provider is RAZORPAY`)
  assert(inVerify.currency === 'INR', `Active subscription currency is INR`)

  const activeSubIn = await creatorSubscriptionsRepo.getByCreator(indiaCreatorId)
  assert(activeSubIn.status === 'ACTIVE', `DB subscription status = ACTIVE`)
  assert(activeSubIn.currency === 'INR', `DB subscription currency = INR`)
  assert(activeSubIn.provider === 'RAZORPAY', `DB subscription provider = RAZORPAY`)
  assert(Number(activeSubIn.amount) === 999, `DB subscription amount = 999`)

  // Status check
  const statusIn = await creatorSubscriptionService.getStatus(indiaCreatorId)
  assert(statusIn.status === 'ACTIVE', `getStatus returns ACTIVE`)
  assert(statusIn.provider === 'RAZORPAY', `getStatus provider is RAZORPAY`)
  assert(statusIn.currency === 'INR', `getStatus currency is INR`)
  assert(statusIn.price === 999, `getStatus price is 999`)

  // ====================================================================
  // TEST GROUP 3: Outside India International (USD) Checkout & Verification (PayPal)
  // ====================================================================
  console.log('\n--- GROUP 3: International USD Checkout Flow (Direct PayPal, bypassing Razorpay) ---')

  const intlUser = await authService.signup({
    email: `intl_creator_${timestamp}@example.com`,
    password: `Pass_Intl_${timestamp}!`,
    name: `Global Creator ${timestamp}`,
    role: 'CREATOR',
    storeName: `Global Store ${timestamp}`,
    slug: `global-store-${timestamp}`,
  })
  const intlCreatorId = intlUser.user?.id || intlUser.id
  assert(Boolean(intlCreatorId), `Created international test creator: ${intlCreatorId}`)

  // Verify that if PayPal credentials are not configured or invalid, it fails safely
  if (!paypalProvider.isConfigured()) {
    let unconfiguredFailed = false
    try {
      await creatorSubscriptionService.createCheckoutSession(intlCreatorId, {
        plan: 'CREATOR',
        interval: 'monthly',
        region: 'INTERNATIONAL',
      })
    } catch (e) {
      unconfiguredFailed = true
      assert(e.message.includes('PayPal payment provider is not configured'), 'Fails safely when PayPal credentials are not configured')
    }
    assert(unconfiguredFailed, 'Missing PayPal credentials safely prevented subscription creation')
  }

  // Stub PayPal provider for testing the end-to-end checkout & verification flow
  const origIsConfigured = paypalProvider.isConfigured
  const origCreateSub = paypalProvider.createSubscription
  const origGetSub = paypalProvider.getSubscription

  try {
    paypalProvider.isConfigured = () => true
    paypalProvider.createSubscription = async (opts) => ({
      id: 'I-TEST-CREATOR-98765',
      status: 'APPROVAL_PENDING',
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=ba_test_token`,
    })
    paypalProvider.getSubscription = async (id) => ({
      id,
      status: 'ACTIVE',
      plan_id: 'P-06L05256BW4479128NLFBZCA',
      custom_id: intlCreatorId,
      billing_info: {
        next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_payment: {
          amount: { currency_code: 'USD', value: '6.00' },
          time: new Date().toISOString(),
        },
      },
    })

    // Create International Checkout Session (USD) -> Must route directly to PayPal
    const intlCheckout = await creatorSubscriptionService.createCheckoutSession(intlCreatorId, {
      plan: 'CREATOR',
      interval: 'monthly',
      region: 'INTERNATIONAL',
    })

    assert(intlCheckout.provider === 'paypal', `International checkout provider is paypal (bypassed Razorpay)`)
    assert(intlCheckout.currency === 'USD', `International checkout currency is USD`)
    assert(intlCheckout.price === 6, `International Creator price is $6`)
    assert(Boolean(intlCheckout.subscriptionId || intlCheckout.orderId), `Received PayPal ID: ${intlCheckout.subscriptionId || intlCheckout.orderId}`)
    assert(Boolean(intlCheckout.approvalUrl), `Received PayPal approval URL: ${intlCheckout.approvalUrl}`)
    assert(intlCheckout.region === 'INTERNATIONAL', `Checkout region is INTERNATIONAL`)
    assert(intlCheckout.flowType === 'subscription', `International monthly flowType is subscription`)
    assert(intlCheckout.isRecurring === true, `International monthly is recurring`)
    assert(intlCheckout.renewalType === 'AUTO_RENEWING', `International monthly renewalType is AUTO_RENEWING`)

    // Verify DB state is PENDING with USD and PAYPAL provider
    const pendingSubIntl = await creatorSubscriptionsRepo.getByCreator(intlCreatorId)
    assert(pendingSubIntl.status === 'PENDING', `Database status is PENDING`)
    assert(pendingSubIntl.currency === 'USD', `Database currency is USD`)
    assert(pendingSubIntl.provider === 'PAYPAL', `Database provider is PAYPAL`)
    assert(Number(pendingSubIntl.amount) === 6, `Database amount is 6`)

    // Direct PayPal Verification & Activation
    const intlTargetId = intlCheckout.subscriptionId || intlCheckout.orderId
    const intlVerify = await creatorSubscriptionService.verifySubscriptionPayment(intlCreatorId, {
      provider: 'paypal',
      orderId: intlTargetId,
      razorpaySubscriptionId: intlCheckout.subscriptionId,
      region: 'INTERNATIONAL',
    })

    assert(intlVerify.status === 'ACTIVE', `International USD subscription successfully activated via PayPal`)
    assert(intlVerify.provider === 'PAYPAL', `Active provider is PAYPAL`)
    assert(intlVerify.currency === 'USD', `Active subscription currency is USD`)

    const activeSubIntl = await creatorSubscriptionsRepo.getByCreator(intlCreatorId)
    assert(activeSubIntl.status === 'ACTIVE', `DB status = ACTIVE for international subscription`)
    assert(activeSubIntl.currency === 'USD', `DB currency = USD for international subscription`)
    assert(activeSubIntl.provider === 'PAYPAL', `DB provider = PAYPAL for international subscription`)
    assert(Number(activeSubIntl.amount) === 6, `DB amount = $6`)

    // Status check for International user
    const statusIntl = await creatorSubscriptionService.getStatus(intlCreatorId)
    assert(statusIntl.status === 'ACTIVE', `International status = ACTIVE`)
    assert(statusIntl.provider === 'PAYPAL', `International status provider = PAYPAL`)
    assert(statusIntl.currency === 'USD', `International status currency = USD`)
    assert(statusIntl.price === 6, `International status price = $6`)
    assert(statusIntl.region === 'INTERNATIONAL', `International status region = INTERNATIONAL`)
  } finally {
    paypalProvider.isConfigured = origIsConfigured
    paypalProvider.createSubscription = origCreateSub
    paypalProvider.getSubscription = origGetSub
  }

  // ====================================================================
  // TEST GROUP 4: Duplicate Subscription Prevention
  // ====================================================================
  console.log('\n--- GROUP 4: Prevent Duplicate Subscriptions ---')

  const dupAttempt = await creatorSubscriptionService.createCheckoutSession(intlCreatorId, {
    plan: 'CREATOR',
    interval: 'monthly',
    region: 'INTERNATIONAL',
  })
  assert(dupAttempt.alreadyActive === true, `Duplicate subscription request prevented!`)

  // ====================================================================
  // TEST GROUP 5: Webhook Processing & Idempotency
  // ====================================================================
  console.log('\n--- GROUP 5: Webhook Event Processing & Idempotency ---')

  const webhookEventId = `evt_test_${Date.now().toString(36)}`
  const testSubOrderId = `order_sub_wh_${Date.now().toString(36)}`

  // Create a pending subscription for webhook test
  await creatorSubscriptionsRepo.upsert(intlCreatorId, {
    status: 'PENDING',
    plan: 'PRO',
    billingInterval: 'MONTHLY',
    currency: 'USD',
    price: 12,
    razorpayOrderId: testSubOrderId,
  })

  const webhookPayload = {
    event: 'order.paid',
    event_id: webhookEventId,
    payload: {
      order: {
        entity: {
          id: testSubOrderId,
          amount: 1200,
          currency: 'USD',
          status: 'paid',
        }
      },
      payment: {
        entity: {
          id: `pay_wh_${Date.now().toString(36)}`,
          order_id: testSubOrderId,
          amount: 1200,
          currency: 'USD',
          status: 'captured',
        }
      }
    }
  }

  // First webhook delivery
  const res1 = await webhookService.handle(webhookPayload)
  assert(res1.ok === true, `First webhook delivery successfully processed`)

  const whSub = await creatorSubscriptionsRepo.getByCreator(intlCreatorId)
  assert(whSub.status === 'ACTIVE', `Subscription activated by order.paid webhook`)
  assert(whSub.currency === 'USD', `Subscription currency preserved as USD`)

  // Duplicate webhook delivery (idempotency check)
  const res2 = await webhookService.handle(webhookPayload)
  assert(res2.duplicate === true, `Duplicate webhook recognized and handled idempotently`)

  // PayPal Webhook Test
  const ppWebhookEventId = `WH_EVT_${Date.now().toString(36)}`
  const ppSubOrderId = `order_paypal_wh_${Date.now().toString(36)}`
  await creatorSubscriptionsRepo.upsert(intlCreatorId, {
    status: 'PENDING',
    plan: 'PRO',
    billingInterval: 'ANNUAL',
    currency: 'USD',
    price: 115,
    provider: 'PAYPAL',
    providerSubscriptionId: ppSubOrderId,
  })

  const ppWebhookPayload = {
    id: ppWebhookEventId,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: `capture_pp_${Date.now().toString(36)}`,
      custom_id: intlCreatorId,
      supplementary_data: {
        related_ids: {
          order_id: ppSubOrderId,
        }
      }
    }
  }

  const ppRes1 = await webhookService.handle(ppWebhookPayload)
  assert(ppRes1.ok === true, `PayPal webhook delivery successfully processed`)
  const ppWhSub = await creatorSubscriptionsRepo.getByCreator(intlCreatorId)
  assert(ppWhSub.status === 'ACTIVE', `PayPal subscription activated by PAYMENT.CAPTURE.COMPLETED webhook`)
  assert(ppWhSub.provider === 'PAYPAL', `Subscription provider is PAYPAL`)
  assert(ppWhSub.currency === 'USD', `Subscription currency is USD`)

  const ppRes2 = await webhookService.handle(ppWebhookPayload)
  assert(ppRes2.duplicate === true, `Duplicate PayPal webhook recognized idempotently`)

  // PayPal Subscription Activation and Recurring Renewal Webhook Test
  const ppSubActEventId = `WH_SUB_ACT_${Date.now().toString(36)}`
  const ppSubId = `I-test-sub-${Date.now().toString(36)}`
  await creatorSubscriptionsRepo.upsert(intlCreatorId, {
    status: 'PENDING',
    plan: 'PRO',
    billingInterval: 'MONTHLY',
    currency: 'USD',
    price: 12,
    provider: 'PAYPAL',
    providerSubscriptionId: ppSubId,
  })

  const ppSubActPayload = {
    id: ppSubActEventId,
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    resource: {
      id: ppSubId,
      custom_id: intlCreatorId,
      billing_info: {
        next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  }
  const ppActRes = await webhookService.handle(ppSubActPayload)
  assert(ppActRes.ok === true, 'BILLING.SUBSCRIPTION.ACTIVATED webhook processed successfully')

  // PayPal Recurring Sale Completed (Automatic renewal payment)
  const ppSaleEventId = `WH_SALE_${Date.now().toString(36)}`
  const ppSalePayload = {
    id: ppSaleEventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    resource: {
      id: `sale_${Date.now().toString(36)}`,
      billing_agreement_id: ppSubId,
      custom_id: intlCreatorId,
      amount: { total: '12.00', currency: 'USD' },
    },
  }
  const ppSaleRes = await webhookService.handle(ppSalePayload)
  assert(ppSaleRes.ok === true, 'PAYMENT.SALE.COMPLETED recurring renewal webhook processed successfully')

  // ====================================================================
  // TEST GROUP 6: Payment Failure Security
  // ====================================================================
  console.log('\n--- GROUP 6: Payment Failure Security ---')

  const failedOrderId = `order_fail_${Date.now().toString(36)}`
  await creatorSubscriptionsRepo.upsert(intlCreatorId, {
    status: 'PENDING',
    razorpayOrderId: failedOrderId,
  })

  await webhookService.handle({
    event: 'payment.failed',
    event_id: `evt_fail_${Date.now().toString(36)}`,
    payload: {
      payment: {
        entity: {
          id: `pay_fail_${Date.now().toString(36)}`,
          order_id: failedOrderId,
          status: 'failed',
          error_description: 'Payment was declined by card issuer',
        }
      }
    }
  })

  const failedSub = await creatorSubscriptionsRepo.getByCreator(intlCreatorId)
  assert(failedSub.status === 'FAILED', `Subscription marked FAILED upon payment.failed event`)

  // Cleanup test creators
  console.log('\n--- Cleanup ---')
  await prisma.user.delete({ where: { id: indiaCreatorId } }).catch(() => {})
  await prisma.user.delete({ where: { id: intlCreatorId } }).catch(() => {})
  console.log('✅ Cleaned up test records')

  console.log('\n====================================================')
  console.log('🎉 ALL INDIA + INTERNATIONAL TESTS PASSED SUCCESSFULLY!')
  console.log('====================================================')
}

runAuditAndTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err)
  process.exit(1)
})
