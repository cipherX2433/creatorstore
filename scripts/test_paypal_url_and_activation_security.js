import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { usersRepo, creatorSubscriptionsRepo, profilesRepo, webhookEventsRepo } from '../lib/repos.js'
import { creatorSubscriptionService, webhookService, authService } from '../lib/services.js'
import { getPaymentProvider } from '../lib/payments.js'
import { paypalProvider, getPayPalBaseUrl, getPayPalReturnUrl, getPayPalCancelUrl, getPayPalWebhookUrl } from '../lib/paypal.js'
import { getAppUrl, sanitizeBrowserUrl } from '../config/site.js'
import { BILLING_REGIONS, resolveBillingConfig } from '../lib/billing/config.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    throw new Error(message)
  }
  console.log(`✅ PASS: ${message}`)
}

async function runTests() {
  console.log('====================================================================')
  console.log('🛡️  RUNNING PAYPAL URL GENERATION & SUBSCRIPTION ACTIVATION SECURITY TESTS')
  console.log('====================================================================\n')

  // ==========================================================================
  // TEST GROUP 1: Canonical URL Generation & 0.0.0.0 Elimination (Task A & D)
  // ==========================================================================
  console.log('--- GROUP 1: URL Resolution Security & 0.0.0.0 Protection ---')

  const originalEnv = { ...process.env }

  try {
    // 1.1 Local development default (no ngrok, NODE_ENV=development)
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_URL
    delete process.env.PAYPAL_RETURN_URL_BASE
    delete process.env.PAYPAL_RETURN_URL
    delete process.env.PAYPAL_CANCEL_URL
    delete process.env.PAYPAL_WEBHOOK_URL
    delete process.env.RAILWAY_ENVIRONMENT
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = 'development'

    const devAppUrl = getAppUrl()
    assert(devAppUrl === 'http://localhost:3000', `Dev getAppUrl defaults to http://localhost:3000 (was ${devAppUrl})`)
    assert(!devAppUrl.includes('0.0.0.0'), 'Dev getAppUrl does not contain 0.0.0.0')

    const devReturnUrl = getPayPalReturnUrl()
    assert(devReturnUrl === 'http://localhost:3000/api/creator/subscription/paypal/return', `Dev PayPal return URL is correct (${devReturnUrl})`)
    assert(!devReturnUrl.includes('0.0.0.0'), 'Dev PayPal return URL never contains 0.0.0.0')

    const devCancelUrl = getPayPalCancelUrl()
    assert(devCancelUrl === 'http://localhost:3000/dashboard/settings/billing?canceled=true', `Dev PayPal cancel URL is correct (${devCancelUrl})`)
    assert(!devCancelUrl.includes('0.0.0.0'), 'Dev PayPal cancel URL never contains 0.0.0.0')

    // 1.2 Ngrok testing configuration
    const ngrokDomain = 'https://enid-beadier-admonishedly.ngrok-free.dev'
    process.env.NEXT_PUBLIC_APP_URL = ngrokDomain
    process.env.APP_URL = ngrokDomain

    const ngrokAppUrl = getAppUrl()
    assert(ngrokAppUrl === ngrokDomain, `Ngrok app URL resolves to ${ngrokDomain}`)

    const ngrokReturnUrl = getPayPalReturnUrl()
    assert(ngrokReturnUrl === `${ngrokDomain}/api/creator/subscription/paypal/return`, `Ngrok PayPal return URL is ${ngrokReturnUrl}`)

    const ngrokCancelUrl = getPayPalCancelUrl()
    assert(ngrokCancelUrl === `${ngrokDomain}/dashboard/settings/billing?canceled=true`, `Ngrok PayPal cancel URL is ${ngrokCancelUrl}`)

    // 1.3 Webhook URL separate from Return/Cancel URLs
    process.env.PAYPAL_WEBHOOK_URL = `${ngrokDomain}/api/webhooks/paypal`
    const webhookUrl = getPayPalWebhookUrl()
    assert(webhookUrl === `${ngrokDomain}/api/webhooks/paypal`, `Webhook URL correctly points to dedicated endpoint (${webhookUrl})`)
    assert(webhookUrl !== ngrokReturnUrl, 'Webhook URL is strictly separated from return URL')

    // 1.4 Protection against 0.0.0.0 host binding
    process.env.NEXT_PUBLIC_APP_URL = 'http://0.0.0.0:3000'
    const sanitizedAppUrl = getAppUrl()
    assert(sanitizedAppUrl === 'http://localhost:3000', `0.0.0.0 in NEXT_PUBLIC_APP_URL is safely sanitized to localhost (${sanitizedAppUrl})`)
    assert(!sanitizedAppUrl.includes('0.0.0.0'), 'Sanitized app URL contains no 0.0.0.0')

    const sanitizedReturn = getPayPalReturnUrl()
    assert(sanitizedReturn === 'http://localhost:3000/api/creator/subscription/paypal/return', `Return URL with 0.0.0.0 base is sanitized to localhost (${sanitizedReturn})`)

    // 1.5 Production URL behavior
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_URL
    process.env.NODE_ENV = 'production'
    process.env.RAILWAY_ENVIRONMENT = 'production'

    const prodAppUrl = getAppUrl()
    assert(prodAppUrl === 'https://creatorstore.store', `Production getAppUrl defaults to https://creatorstore.store (${prodAppUrl})`)
    const prodReturnUrl = getPayPalReturnUrl()
    assert(prodReturnUrl === 'https://creatorstore.store/api/creator/subscription/paypal/return', `Production return URL is https://creatorstore.store/api/creator/subscription/paypal/return`)
  } finally {
    process.env = originalEnv
  }

  // ==========================================================================
  // TEST GROUP 2: Stop False Activation & Reject Mock Identifiers (Task B & D)
  // ==========================================================================
  console.log('\n--- GROUP 2: Stop False Activation & Strict PayPal Verification ---')

  const timestamp = Date.now()
  const testUser = await authService.signup({
    email: `sec_test_${timestamp}@example.com`,
    password: `Pass_Sec_${timestamp}!`,
    name: `Sec Test User ${timestamp}`,
    role: 'CREATOR',
    storeName: `Sec Store ${timestamp}`,
    slug: `sec-store-${timestamp}`,
  })
  const creatorId = testUser.user?.id || testUser.id
  assert(Boolean(creatorId), `Created test creator ${creatorId}`)

  // Setup pending subscription record
  await creatorSubscriptionsRepo.upsert(creatorId, {
    status: 'PENDING',
    plan: 'CREATOR',
    billingInterval: 'MONTHLY',
    currency: 'USD',
    price: 6,
    provider: 'PAYPAL',
    providerSubscriptionId: 'I-mock-CA54B29A6574',
  })

  // 2.1 Rejection of mock subscription IDs
  let mockRejected = false
  try {
    await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
      provider: 'paypal',
      orderId: 'I-mock-CA54B29A6574',
      razorpaySubscriptionId: 'I-mock-CA54B29A6574',
      region: 'INTERNATIONAL',
    })
  } catch (err) {
    mockRejected = true
    assert(err.status === 400, `Mock subscription ID rejected with HTTP 400 (got ${err.status})`)
    assert(err.message.includes('Mock subscriptions cannot be activated') || err.message.includes('Mock'), 'Clear rejection message returned')
  }
  assert(mockRejected, 'Mock subscription ID "I-mock-CA54B29A6574" was strictly rejected')

  // Verify DB state remained PENDING
  const subAfterMock = await creatorSubscriptionsRepo.getByCreator(creatorId)
  assert(subAfterMock.status !== 'ACTIVE', 'Database subscription was NOT marked ACTIVE for mock ID')

  // 2.2 Rejection when PayPal API cannot verify (unconfigured or invalid)
  let unverifiedRejected = false
  try {
    await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
      provider: 'paypal',
      orderId: 'I-FAKE-REAL-FORMAT-99999',
      razorpaySubscriptionId: 'I-FAKE-REAL-FORMAT-99999',
      region: 'INTERNATIONAL',
    })
  } catch (err) {
    unverifiedRejected = true
    assert(err.status === 400 || err.status === 503, `Unverified subscription rejected with status ${err.status}`)
  }
  assert(unverifiedRejected, 'Unverified subscription was rejected without activating access')

  // 2.3 Simulated PayPal API Verification Validation (Plan ID, Status, Custom ID)
  console.log('\n--- GROUP 3: Server-Side PayPal API Verification Checks ---')

  // Mock paypalProvider.getSubscription temporarily to test server-side validation rules
  const originalGetSubscription = paypalProvider.getSubscription
  const originalIsConfigured = paypalProvider.isConfigured

  try {
    paypalProvider.isConfigured = () => true

    // Test 3.1: Reject when subscription status is not ACTIVE or APPROVED (e.g. CANCELLED or PENDING)
    paypalProvider.getSubscription = async (id) => ({
      id,
      status: 'CANCELLED',
      plan_id: 'P-06L05256BW4479128NLFBZCA',
      custom_id: creatorId,
    })

    let statusCheckFailed = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
        provider: 'paypal',
        orderId: 'I-REAL-SUB-101',
        region: 'INTERNATIONAL',
      })
    } catch (e) {
      statusCheckFailed = true
      assert(e.status === 400, `Non-active status rejected with 400 (was ${e.status})`)
      assert(e.message.includes('not active'), 'Error message reports non-active status')
    }
    assert(statusCheckFailed, 'Subscription with status CANCELLED rejected')

    // Test 3.2: Reject when plan_id does not match expected plan ID
    paypalProvider.getSubscription = async (id) => ({
      id,
      status: 'ACTIVE',
      plan_id: 'P-WRONG-PLAN-ID-999',
      custom_id: creatorId,
    })

    let planCheckFailed = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
        provider: 'paypal',
        orderId: 'I-REAL-SUB-102',
        region: 'INTERNATIONAL',
      })
    } catch (e) {
      planCheckFailed = true
      assert(e.status === 400, `Plan mismatch rejected with 400 (was ${e.status})`)
      assert(e.message.includes('Plan mismatch'), 'Error message reports plan mismatch')
    }
    assert(planCheckFailed, 'Subscription with mismatched plan ID rejected')

    // Test 3.3: Reject when custom_id does not match creatorId (Unauthorized association)
    paypalProvider.getSubscription = async (id) => ({
      id,
      status: 'ACTIVE',
      plan_id: 'P-06L05256BW4479128NLFBZCA',
      custom_id: 'different-creator-uuid-attacker',
    })

    let creatorCheckFailed = false
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
        provider: 'paypal',
        orderId: 'I-REAL-SUB-103',
        region: 'INTERNATIONAL',
      })
    } catch (e) {
      creatorCheckFailed = true
      assert(e.status === 403, `Account association mismatch rejected with 403 (was ${e.status})`)
    }
    assert(creatorCheckFailed, 'Subscription with mismatched creator association rejected')

    // Test 3.4: Legitimate verified subscription succeeds
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    paypalProvider.getSubscription = async (id) => ({
      id,
      status: 'ACTIVE',
      plan_id: 'P-06L05256BW4479128NLFBZCA',
      custom_id: creatorId,
      billing_info: {
        next_billing_time: nextMonth.toISOString(),
        last_payment: {
          amount: { currency_code: 'USD', value: '6.00' },
          time: new Date().toISOString(),
        },
      },
    })

    const validVerification = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
      provider: 'paypal',
      orderId: 'I-REAL-VALID-SUB-200',
      region: 'INTERNATIONAL',
    })

    assert(validVerification.status === 'ACTIVE', 'Verified subscription status is ACTIVE')
    assert(validVerification.provider === 'PAYPAL', 'Verified provider is PAYPAL')

    const dbSub = await creatorSubscriptionsRepo.getByCreator(creatorId)
    assert(dbSub.status === 'ACTIVE', 'Database subscription marked ACTIVE')
    assert(dbSub.providerSubscriptionId === 'I-REAL-VALID-SUB-200', 'Database providerSubscriptionId matches valid PayPal ID')

    // Test 3.5: Idempotency (calling verify again returns active without re-processing)
    const idempotentResult = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
      provider: 'paypal',
      orderId: 'I-REAL-VALID-SUB-200',
      region: 'INTERNATIONAL',
    })
    assert(idempotentResult.status === 'ACTIVE', 'Idempotent verification returns ACTIVE')
    assert(idempotentResult.message === 'Creator subscription already active', 'Idempotent message returned')

  } finally {
    paypalProvider.getSubscription = originalGetSubscription
    paypalProvider.isConfigured = originalIsConfigured
  }

  // ==========================================================================
  // TEST GROUP 4: Razorpay Domestic INR Flow Preservation (Task D)
  // ==========================================================================
  console.log('\n--- GROUP 4: Razorpay Domestic Flow Unchanged ---')

  const rzpCheckout = await creatorSubscriptionService.createCheckoutSession(creatorId, {
    plan: 'PRO',
    interval: 'monthly',
    region: 'INDIA',
  })
  assert(rzpCheckout.provider === 'razorpay', 'India checkout routes to razorpay')
  assert(rzpCheckout.currency === 'INR', 'India currency is INR')
  assert(rzpCheckout.price === 999, 'India Pro price is ₹999')
  assert(rzpCheckout.isRecurring === true, 'India plan is recurring')

  // Cleanup test user
  await prisma.user.delete({ where: { id: creatorId } }).catch(() => { })
  console.log('✅ Cleaned up test records')

  console.log('\n====================================================================')
  console.log('🎉 ALL PAYPAL URL & ACTIVATION SECURITY TESTS PASSED!')
  console.log('====================================================================')
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err)
  process.exit(1)
})
