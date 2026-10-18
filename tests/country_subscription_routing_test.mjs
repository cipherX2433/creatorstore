/**
 * Comprehensive 16-Criteria Test Suite for Country-Based Subscription Payment Routing
 * 
 * Verifies all 16 acceptance criteria:
 * 1. Signup with India saves 'IN'.
 * 2. Signup with United States saves 'US'.
 * 3. Signup with another supported country (e.g. 'GB') saves 'GB'.
 * 4. Missing or invalid country is rejected with 400.
 * 5. Existing user with no country must complete country collection before subscription checkout (returns 400 COUNTRY_REQUIRED).
 * 6. Indian user routes to Razorpay with INR prices (Creator: ₹499/mo, ₹4,790/yr; Pro: ₹999/mo, ₹9,590/yr).
 * 7. Non-Indian user routes to Dodo with USD prices (Creator: $6/mo, $58/yr; Pro: $12/mo, $115/yr).
 * 8. Frontend-supplied country/region/provider override cannot manipulate backend provider selection.
 * 9. Creator and Pro use correct provider-specific price IDs (Razorpay plan IDs & Dodo product IDs).
 * 10. Unauthenticated users cannot create subscription checkouts.
 * 11. Pending payments do not prematurely grant entitlements.
 * 12. Verified payments activate correct subscription (Razorpay cryptographic verification & Dodo webhook).
 * 13. Duplicate webhook events do not duplicate subscriptions (idempotency).
 * 14. Existing subscriptions remain associated with original provider.
 * 15. Existing product checkout flows remain unchanged on Dodo Payments.
 * 16. Missing country and payment provider failures return clear, actionable errors.
 */

import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService,
  webhookService,
  meService,
  checkoutService,
} from '../lib/services.js'
import {
  creatorSubscriptionsRepo,
  webhookEventsRepo,
  subscriptionAuditLogsRepo,
  usersRepo,
  profilesRepo,
  storesRepo,
  productsRepo,
  ordersRepo,
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'
import { getPaymentProvider } from '../lib/payments.js'
import { getBillingRegionForCountry } from '../lib/billing/provider-selection.js'
import { resolveBillingConfig } from '../lib/billing/config.js'

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
  console.log(' CREATORSTORE: COUNTRY-BASED SUBSCRIPTION PAYMENT ROUTING TEST SUITE')
  console.log('=====================================================================\n')

  const originalDodoCreateCheckout = dodoProvider.createSubscriptionCheckoutSession.bind(dodoProvider)
  const rzpProvider = getPaymentProvider()
  const originalRzpCreateSub = rzpProvider.createSubscription.bind(rzpProvider)

  // Mock Dodo hosted checkout session
  dodoProvider.createSubscriptionCheckoutSession = async (params) => ({
    sessionId: `cks_dodo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    checkoutUrl: `https://test.checkout.dodopayments.com/session/cks_dodo_test`,
    provider: 'dodo',
    productId: params.productId,
  })

  // Mock Razorpay subscription creation
  rzpProvider.createSubscription = async (params) => ({
    id: `sub_rzp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    entity: 'subscription',
    plan_id: params.planId,
    status: 'created',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  })

  try {
    // -------------------------------------------------------------------------
    // 1. Signup with India saves 'IN'
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Signup with India saves IN ---')
    const indiaEmail = `india-creator-${Date.now()}@example.com`
    const indiaSignup = await authService.signup({
      email: indiaEmail,
      password: 'SecurePassword123!',
      name: 'Rohan Sharma',
      role: 'CREATOR',
      storeName: `Rohan Store ${Date.now()}`,
      slug: `rohan-store-${Date.now()}`,
      country: 'IN',
    })
    const indiaUserId = indiaSignup.user?.id || indiaSignup.id
    const indiaUserInDb = await usersRepo.findById(indiaUserId)
    const indiaProfileInDb = await profilesRepo.getByCreator(indiaUserId)

    assert(indiaUserInDb.country === 'IN', '1.1: User record persists country as IN')
    assert(indiaProfileInDb.country === 'IN', '1.2: Profile record persists country as IN')

    // -------------------------------------------------------------------------
    // 2. Signup with United States saves 'US'
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Signup with United States saves US ---')
    const usEmail = `us-creator-${Date.now()}@example.com`
    const usSignup = await authService.signup({
      email: usEmail,
      password: 'SecurePassword123!',
      name: 'Sarah Connor',
      role: 'CREATOR',
      storeName: `Sarah Store ${Date.now()}`,
      slug: `sarah-store-${Date.now()}`,
      country: 'US',
    })
    const usUserId = usSignup.user?.id || usSignup.id
    const usUserInDb = await usersRepo.findById(usUserId)
    const usProfileInDb = await profilesRepo.getByCreator(usUserId)

    assert(usUserInDb.country === 'US', '2.1: User record persists country as US')
    assert(usProfileInDb.country === 'US', '2.2: Profile record persists country as US')

    // -------------------------------------------------------------------------
    // 3. Signup with another supported country (e.g. 'GB') saves 'GB'
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Signup with another supported country (GB) saves GB ---')
    const gbEmail = `gb-creator-${Date.now()}@example.com`
    const gbSignup = await authService.signup({
      email: gbEmail,
      password: 'SecurePassword123!',
      name: 'James Bond',
      role: 'CREATOR',
      storeName: `James Store ${Date.now()}`,
      slug: `james-store-${Date.now()}`,
      country: 'gb', // test case normalization
    })
    const gbUserId = gbSignup.user?.id || gbSignup.id
    const gbUserInDb = await usersRepo.findById(gbUserId)
    const gbProfileInDb = await profilesRepo.getByCreator(gbUserId)

    assert(gbUserInDb.country === 'GB', '3.1: User record normalizes and persists country as GB')
    assert(gbProfileInDb.country === 'GB', '3.2: Profile record normalizes and persists country as GB')

    // -------------------------------------------------------------------------
    // 4. Missing or invalid country is rejected with 400
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Missing or invalid country is rejected with 400 ---')
    let missingCountryFailed = false
    try {
      await authService.signup({
        email: `missing-country-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        name: 'No Country',
        role: 'CREATOR',
        country: '',
      })
    } catch (err) {
      missingCountryFailed = true
      assert(err.status === 400, '4.1: Missing country returns 400 HTTP status')
      assert(err.message.includes('Country is required'), '4.2: Missing country error message is informative')
    }
    assert(missingCountryFailed, '4.3: Signup without country rejected')

    let invalidCountryFailed = false
    try {
      await authService.signup({
        email: `invalid-country-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        name: 'Invalid Country',
        role: 'CREATOR',
        country: 'ZZ_INVALID',
      })
    } catch (err) {
      invalidCountryFailed = true
      assert(err.status === 400, '4.4: Invalid country returns 400 HTTP status')
      assert(err.message.includes('Invalid country'), '4.5: Invalid country error message is informative')
    }
    assert(invalidCountryFailed, '4.6: Signup with invalid country rejected')

    // -------------------------------------------------------------------------
    // 5. Existing user with no country must complete country collection before subscription checkout
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Existing user with no country must complete country collection ---')
    // Simulate legacy user created prior to country requirement
    const legacyEmail = `legacy-user-${Date.now()}@example.com`
    const legacyUser = await usersRepo.create({
      email: legacyEmail,
      name: 'Legacy Creator',
      passwordHash: 'dummyhash',
      role: 'CREATOR',
      country: null,
    })
    await profilesRepo.upsert(legacyUser.id, {
      creatorId: legacyUser.id,
      name: 'Legacy Creator',
      country: null,
    })

    let countryRequiredTriggered = false
    try {
      await creatorSubscriptionService.createCheckoutSession(legacyUser.id, {
        plan: 'PRO',
        interval: 'monthly',
      })
    } catch (err) {
      countryRequiredTriggered = true
      assert(err.status === 400, '5.1: Missing country returns 400 on subscription checkout')
      assert(err.code === 'COUNTRY_REQUIRED', '5.2: Missing country returns COUNTRY_REQUIRED code')
    }
    assert(countryRequiredTriggered, '5.3: Legacy user without country blocked from checkout')

    // Update country via profile update
    await meService.updateProfile(legacyUser.id, { country: 'IN' })
    const updatedLegacyUser = await usersRepo.findById(legacyUser.id)
    assert(updatedLegacyUser.country === 'IN', '5.4: User country updated to IN successfully')

    const legacyCheckout = await creatorSubscriptionService.createCheckoutSession(legacyUser.id, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(legacyCheckout.provider === 'razorpay', '5.5: Legacy user can checkout after setting country')

    // -------------------------------------------------------------------------
    // 6. Indian user routes to Razorpay with INR prices
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Indian user routes to Razorpay with INR prices ---')
    // Creator Monthly
    const inCreatorMonth = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(inCreatorMonth.provider === 'razorpay', '6.1: IN Creator Monthly routes to Razorpay')
    assert(inCreatorMonth.currency === 'INR', '6.2: IN Creator Monthly uses INR')
    assert(inCreatorMonth.price === 499, '6.3: IN Creator Monthly price is ₹499')
    assert(inCreatorMonth.amount === 49900, '6.4: IN Creator Monthly amount in paise is 49900')

    // Creator Annual
    const inCreatorYear = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: 'CREATOR',
      interval: 'annual',
    })
    assert(inCreatorYear.provider === 'razorpay', '6.5: IN Creator Annual routes to Razorpay')
    assert(inCreatorYear.price === 4790, '6.6: IN Creator Annual price is ₹4,790')
    assert(inCreatorYear.amount === 479000, '6.7: IN Creator Annual amount in paise is 479000')

    // Pro Monthly
    const inProMonth = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(inProMonth.provider === 'razorpay', '6.8: IN Pro Monthly routes to Razorpay')
    assert(inProMonth.price === 999, '6.9: IN Pro Monthly price is ₹999')
    assert(inProMonth.amount === 99900, '6.10: IN Pro Monthly amount in paise is 99900')

    // Pro Annual
    const inProYear = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: 'PRO',
      interval: 'annual',
    })
    assert(inProYear.provider === 'razorpay', '6.11: IN Pro Annual routes to Razorpay')
    assert(inProYear.price === 9590, '6.12: IN Pro Annual price is ₹9,590')
    assert(inProYear.amount === 959000, '6.13: IN Pro Annual amount in paise is 959000')

    // -------------------------------------------------------------------------
    // 7. Non-Indian user routes to Dodo with USD prices
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Non-Indian user routes to Dodo with USD prices ---')
    // Creator Monthly
    const usCreatorMonth = await creatorSubscriptionService.createCheckoutSession(usUserId, {
      plan: 'CREATOR',
      interval: 'monthly',
    })
    assert(usCreatorMonth.provider === 'dodo', '7.1: US Creator Monthly routes to Dodo Payments')
    assert(usCreatorMonth.currency === 'USD', '7.2: US Creator Monthly uses USD')
    assert(usCreatorMonth.price === 6, '7.3: US Creator Monthly price is $6')
    assert(Boolean(usCreatorMonth.checkoutUrl), '7.4: US Creator Monthly returns Dodo checkout URL')

    // Creator Annual
    const usCreatorYear = await creatorSubscriptionService.createCheckoutSession(usUserId, {
      plan: 'CREATOR',
      interval: 'annual',
    })
    assert(usCreatorYear.provider === 'dodo', '7.5: US Creator Annual routes to Dodo Payments')
    assert(usCreatorYear.price === 58, '7.6: US Creator Annual price is $58')

    // Pro Monthly
    const usProMonth = await creatorSubscriptionService.createCheckoutSession(usUserId, {
      plan: 'PRO',
      interval: 'monthly',
    })
    assert(usProMonth.provider === 'dodo', '7.7: US Pro Monthly routes to Dodo Payments')
    assert(usProMonth.price === 12, '7.8: US Pro Monthly price is $12')

    // Pro Annual
    const usProYear = await creatorSubscriptionService.createCheckoutSession(usUserId, {
      plan: 'PRO',
      interval: 'annual',
    })
    assert(usProYear.provider === 'dodo', '7.9: US Pro Annual routes to Dodo Payments')
    assert(usProYear.price === 115, '7.10: US Pro Annual price is $115')

    // -------------------------------------------------------------------------
    // 8. Frontend-supplied country/region/provider override cannot manipulate backend provider selection
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Frontend override cannot manipulate backend provider selection ---')
    // Indian user attempts to force Dodo or INTERNATIONAL region
    const maliciousIndiaCheckout = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: 'PRO',
      interval: 'monthly',
      region: 'INTERNATIONAL',
      provider: 'dodo',
      country: 'US',
    })
    assert(maliciousIndiaCheckout.provider === 'razorpay', '8.1: Indian user strictly gets Razorpay despite spoofed region/provider')
    assert(maliciousIndiaCheckout.currency === 'INR', '8.2: Indian user strictly gets INR currency')

    // US user attempts to force Razorpay or INDIA region
    const maliciousUsCheckout = await creatorSubscriptionService.createCheckoutSession(usUserId, {
      plan: 'PRO',
      interval: 'monthly',
      region: 'INDIA',
      provider: 'razorpay',
      country: 'IN',
    })
    assert(maliciousUsCheckout.provider === 'dodo', '8.3: US user strictly gets Dodo despite spoofed region/provider')
    assert(maliciousUsCheckout.currency === 'USD', '8.4: US user strictly gets USD currency')

    // -------------------------------------------------------------------------
    // 9. Creator and Pro use correct provider-specific price IDs
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Creator and Pro use correct provider-specific price IDs ---')
    const indiaConfigCreator = resolveBillingConfig({ plan: 'CREATOR', interval: 'monthly', region: getBillingRegionForCountry('IN') })
    const indiaConfigPro = resolveBillingConfig({ plan: 'PRO', interval: 'monthly', region: getBillingRegionForCountry('IN') })
    const usConfigCreator = resolveBillingConfig({ plan: 'CREATOR', interval: 'monthly', region: getBillingRegionForCountry('US') })
    const usConfigPro = resolveBillingConfig({ plan: 'PRO', interval: 'monthly', region: getBillingRegionForCountry('US') })

    assert(indiaConfigCreator.provider === 'razorpay', '9.1: India Creator config provider is razorpay')
    assert(Boolean(indiaConfigCreator.planIdRazorpay), '9.2: India Creator has Razorpay plan ID')
    assert(indiaConfigPro.provider === 'razorpay', '9.3: India Pro config provider is razorpay')
    assert(Boolean(indiaConfigPro.planIdRazorpay), '9.4: India Pro has Razorpay plan ID')

    assert(usConfigCreator.provider === 'dodo', '9.5: US Creator config provider is dodo')
    assert(Boolean(usConfigCreator.dodoProductId), '9.6: US Creator has Dodo product ID')
    assert(usConfigPro.provider === 'dodo', '9.7: US Pro config provider is dodo')
    assert(Boolean(usConfigPro.dodoProductId), '9.8: US Pro has Dodo product ID')

    // -------------------------------------------------------------------------
    // 10. Unauthenticated users cannot create subscription checkouts
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Unauthenticated users cannot create subscription checkouts ---')
    let unauthFailed = false
    try {
      await creatorSubscriptionService.createCheckoutSession(null, { plan: 'PRO' })
    } catch (err) {
      unauthFailed = true
      assert(err.status === 400 || err.status === 401, '10.1: Null creatorId returns 400/401')
    }
    assert(unauthFailed, '10.2: Null creatorId rejected')

    let invalidUserFailed = false
    try {
      await creatorSubscriptionService.createCheckoutSession('non-existent-user-id', { plan: 'PRO' })
    } catch (err) {
      invalidUserFailed = true
      assert(err.status === 404, '10.3: Non-existent user returns 404')
    }
    assert(invalidUserFailed, '10.4: Non-existent user rejected')

    // -------------------------------------------------------------------------
    // 11. Pending payments do not prematurely grant entitlements
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Pending payments do not prematurely grant entitlements ---')
    const dbSubBeforeVerification = await creatorSubscriptionsRepo.getByCreator(indiaUserId)
    const subStatusBeforeVerification = await creatorSubscriptionService.getStatus(indiaUserId)
    assert(dbSubBeforeVerification.status === 'PENDING', '11.1: Database subscription status is PENDING')
    assert(subStatusBeforeVerification.status !== 'ACTIVE', '11.2: Effective subscription status is not ACTIVE while payment is pending')
    assert(subStatusBeforeVerification.isTrial === false || !subStatusBeforeVerification.providerSubscriptionId, '11.3: No paid entitlements granted')

    // -------------------------------------------------------------------------
    // 12. Verified payments activate correct subscription
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Verified payments activate correct subscription ---')
    // Test Razorpay Verification for India
    const pendingIndiaSub = await creatorSubscriptionsRepo.getByCreator(indiaUserId)
    const rzpSubId = pendingIndiaSub.providerSubscriptionId
    const rzpPayId = `pay_${Date.now()}_test`
    
    // Test HMAC-SHA256 signature verification
    const testSecret = rzpProvider.keySecret || 'test_rzp_secret_key'
    const originalSecret = rzpProvider.keySecret
    rzpProvider.keySecret = testSecret

    const rzpSig = crypto.createHmac('sha256', testSecret).update(`${rzpPayId}|${rzpSubId}`).digest('hex')

    const verifyResult = await creatorSubscriptionService.verifySubscriptionPayment(indiaUserId, {
      razorpaySubscriptionId: rzpSubId,
      razorpayPaymentId: rzpPayId,
      razorpaySignature: rzpSig,
    })
    rzpProvider.keySecret = originalSecret

    assert(verifyResult.status === 'ACTIVE', '12.1: Razorpay verification activates subscription')
    assert(verifyResult.provider === 'RAZORPAY', '12.2: Active subscription provider is RAZORPAY')

    const activeIndiaSub = await creatorSubscriptionsRepo.getByCreator(indiaUserId)
    assert(activeIndiaSub.status === 'ACTIVE', '12.3: Database subscription status is ACTIVE')
    assert(activeIndiaSub.currency === 'INR', '12.4: Active subscription currency is INR')

    // Test Dodo Webhook Activation for US
    const pendingUsSub = await creatorSubscriptionsRepo.getByCreator(usUserId)
    const dodoSubId = `sub_dodo_${Date.now()}`
    
    const dodoWebhookEvent = {
      event_id: `evt_dodo_${Date.now()}`,
      type: 'subscription.active',
      data: {
        subscription_id: dodoSubId,
        payment_id: `pay_dodo_${Date.now()}`,
        status: 'active',
        metadata: {
          creatorId: usUserId,
          planId: 'PRO',
          billingInterval: 'ANNUAL',
        },
      },
    }

    await webhookService.handle(dodoWebhookEvent)
    const activeUsSub = await creatorSubscriptionsRepo.getByCreator(usUserId)
    assert(activeUsSub.status === 'ACTIVE', '12.5: Dodo webhook activates subscription')
    assert(activeUsSub.provider === 'DODO', '12.6: Active subscription provider is DODO')
    assert(activeUsSub.currency === 'USD', '12.7: Active subscription currency is USD')

    // -------------------------------------------------------------------------
    // 13. Duplicate webhook events do not duplicate subscriptions
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Duplicate webhook events do not duplicate subscriptions ---')
    // Send same webhook event again
    const dupResult = await webhookService.handle(dodoWebhookEvent)
    assert(dupResult.ok === true || dupResult.processed === true || dupResult.duplicate === true, '13.1: Duplicate webhook handled safely')

    // Verify there is still only 1 subscription record for this creator
    const countUsSubs = await prisma.creatorSubscription.count({
      where: { creatorId: usUserId },
    })
    assert(countUsSubs === 1, '13.2: Exactly 1 subscription record remains in database')

    // -------------------------------------------------------------------------
    // 14. Existing subscriptions remain associated with original provider
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Existing subscriptions remain associated with original provider ---')
    const finalIndiaSub = await creatorSubscriptionsRepo.getByCreator(indiaUserId)
    const finalUsSub = await creatorSubscriptionsRepo.getByCreator(usUserId)

    assert(finalIndiaSub.provider === 'RAZORPAY', '14.1: India subscription permanently associated with RAZORPAY')
    assert(finalUsSub.provider === 'DODO', '14.2: US subscription permanently associated with DODO')

    // Attempting to checkout when already active returns alreadyActive without switching provider
    const reCheckoutIndia = await creatorSubscriptionService.createCheckoutSession(indiaUserId, {
      plan: finalIndiaSub.plan,
      interval: finalIndiaSub.billingInterval,
    })
    assert(reCheckoutIndia.alreadyActive === true, '14.3: Already active subscription prevents duplicate billing')

    // -------------------------------------------------------------------------
    // 15. Existing product checkout flows remain unchanged on Dodo Payments
    // -------------------------------------------------------------------------
    console.log('\n--- 15. Existing product checkout flows remain unchanged on Dodo Payments ---')
    // Create a product for indiaUser
    const store = await storesRepo.getByCreator(indiaUserId)
    const product = await productsRepo.create({
      creatorId: indiaUserId,
      storeId: store?.id || `store_${indiaUserId}`,
      title: 'Digital Masterclass Guide',
      slug: `digital-guide-${Date.now()}`,
      price: 25.00,
      currency: 'USD',
      type: 'DIGITAL_DOWNLOAD',
      status: 'PUBLISHED',
      storePublished: true,
    })

    const productCheckout = await checkoutService.createSession({
      productId: product.id,
      email: 'buyer@example.com',
      name: 'Customer Jane',
      country: 'US',
    })

    assert(productCheckout.provider === 'dodo', '15.1: Digital product checkout still uses Dodo Payments')
    assert(Boolean(productCheckout.checkoutUrl), '15.2: Product order returns Dodo checkout URL')
    assert(Boolean(productCheckout.orderId), '15.3: Product order ID is generated')

    // -------------------------------------------------------------------------
    // 16. Missing country and payment provider failures return clear, actionable errors
    // -------------------------------------------------------------------------
    console.log('\n--- 16. Clear, actionable errors for missing country and payment errors ---')
    // Test user with missing country attempting checkout
    const noCountryUser = await usersRepo.create({
      email: `no-country-${Date.now()}@example.com`,
      name: 'No Country User',
      passwordHash: 'dummyhash',
      role: 'CREATOR',
      country: null,
    })

    let countryErrorDetails = null
    try {
      await creatorSubscriptionService.createCheckoutSession(noCountryUser.id, { plan: 'CREATOR' })
    } catch (err) {
      countryErrorDetails = err
    }
    assert(countryErrorDetails !== null, '16.1: Missing country threw error')
    assert(countryErrorDetails.status === 400, '16.2: Error status is 400')
    assert(countryErrorDetails.code === 'COUNTRY_REQUIRED', '16.3: Error code is COUNTRY_REQUIRED')
    assert(countryErrorDetails.message.includes('Country selection is required'), '16.4: Clear actionable message for country')

    // Test invalid plan
    let invalidPlanError = null
    try {
      await creatorSubscriptionService.createCheckoutSession(indiaUserId, { plan: 'SUPER_ULTRA_PLAN' })
    } catch (err) {
      invalidPlanError = err
    }
    assert(invalidPlanError !== null, '16.5: Invalid plan threw error')
    assert(invalidPlanError.status === 400, '16.6: Invalid plan error is 400')
    assert(invalidPlanError.message.includes('Allowed plans are CREATOR or PRO'), '16.7: Actionable error message for plan')

    console.log('\n=====================================================================')
    console.log(` ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`)
    console.log('=====================================================================\n')

  } finally {
    // Restore original methods
    dodoProvider.createSubscriptionCheckoutSession = originalDodoCreateCheckout
    rzpProvider.createSubscription = originalRzpCreateSub
    await prisma.$disconnect()
  }
}

runTests().then(() => {
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}).catch((err) => {
  console.error('\n💥 Test run failed unexpectedly with error:', err)
  process.exit(1)
})
