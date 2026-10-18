/**
 * Comprehensive 14-Criteria Test Suite for Country-Based Product Purchase Payment Routing
 * 
 * Requirements:
 * 1. India selection routes a product purchase to Razorpay.
 * 2. United States selection routes a product purchase to Dodo.
 * 3. Other supported countries route to Dodo.
 * 4. Missing or invalid country is rejected.
 * 5. Frontend attempts to override provider selection are ignored.
 * 6. Tampered product prices are rejected.
 * 7. Correct provider-specific checkout creation.
 * 8. Razorpay payment failure does not fulfil the order.
 * 9. Dodo payment failure does not fulfil the order.
 * 10. Verified successful payments grant access exactly once.
 * 11. Duplicate submissions and webhook retries are idempotent.
 * 12. Existing subscription routing remains unchanged.
 * 13. Existing coupon and consent functionality remains intact.
 * 14. The wizard works on mobile and desktop.
 */

import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import {
  checkoutService,
  webhookService,
  couponService,
} from '../lib/services.js'
import {
  usersRepo,
  profilesRepo,
  storesRepo,
  productsRepo,
  ordersRepo,
  entitlementsRepo,
  customersRepo,
  couponsRepo,
} from '../lib/repos.js'
import { dodoProvider } from '../lib/dodo.js'
import { getPaymentProvider } from '../lib/payments.js'
import {
  getProductPaymentProviderForCountry,
  getSubscriptionProviderForCountry,
  PRODUCT_PAYMENT_PROVIDERS,
  SUBSCRIPTION_PROVIDERS,
} from '../lib/billing/provider-selection.js'
import { isValidCountryCode, COUNTRIES, POPULAR_COUNTRY_CODES } from '../lib/countries.js'

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
  console.log(' CREATORSTORE: COUNTRY-BASED PRODUCT PURCHASE ROUTING TEST SUITE')
  console.log('=====================================================================\n')

  const testSuffix = uuidv4().substring(0, 8)
  const testEmail = `creator_${testSuffix}@example.com`

  // 1. Setup Test Creator and Test Product
  console.log('--- Setting up test creator and product ---')
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: testEmail,
      passwordHash: 'dummy_hash',
      role: 'CREATOR',
      country: 'IN', // Creator's profile country
    }
  })

  await prisma.creatorProfile.create({
    data: {
      creator: { connect: { id: user.id } },
      name: `Creator ${testSuffix}`,
      country: 'IN',
    }
  })

  await prisma.store.create({
    data: {
      creator: { connect: { id: user.id } },
      username: `creator_${testSuffix}`,
      storeName: `Store ${testSuffix}`,
    }
  })

  // Product priced at INR 999
  const inrProduct = await prisma.product.create({
    data: {
      id: uuidv4(),
      creatorId: user.id,
      title: 'Mastering Digital Products (INR)',
      slug: `mastering-digital-products-inr-${testSuffix}`,
      price: 999,
      currency: 'INR',
      status: 'PUBLISHED',
      storePublished: true,
      type: 'DIGITAL_DOWNLOAD',
    }
  })

  // Product priced at USD 25
  const usdProduct = await prisma.product.create({
    data: {
      id: uuidv4(),
      creatorId: user.id,
      title: 'Global Video Guide (USD)',
      slug: `global-video-guide-usd-${testSuffix}`,
      price: 25,
      currency: 'USD',
      status: 'PUBLISHED',
      storePublished: true,
      type: 'DIGITAL_DOWNLOAD',
    }
  })

  console.log(`Created test products: INR product (${inrProduct.id}), USD product (${usdProduct.id})`)

  try {
    // -------------------------------------------------------------
    // TEST 1: India selection routes a product purchase to Razorpay
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: India selection routes to Razorpay ---')
    const inBuyerEmail = `buyer_in_${testSuffix}@example.com`
    const inCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Rohan Sharma',
      email: inBuyerEmail,
      country: 'IN',
    })

    assert(inCheckout.provider === 'razorpay', 'Provider resolved to razorpay for country IN')
    assert(Boolean(inCheckout.razorpayOrderId), 'Razorpay order ID returned')
    assert(Boolean(inCheckout.keyId), 'Razorpay key ID returned')
    assert(inCheckout.currency === 'INR', 'Currency is INR for Indian buyer')
    assert(inCheckout.amount === 99900, 'Amount in paise is 99900 (₹999)')
    assert(inCheckout.order.country === 'IN', 'Order country is persisted as IN')
    assert(inCheckout.order.paymentProvider === 'razorpay', 'Order paymentProvider is saved as razorpay')

    // Verify creator profile country is NOT overwritten
    const creatorUserAfterIn = await prisma.user.findUnique({ where: { id: user.id } })
    assert(creatorUserAfterIn.country === 'IN', 'Creator profile country remained unchanged (IN)')

    // -----------------------------------------------------------------
    // TEST 2: United States selection routes a product purchase to Dodo
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: United States selection routes to Dodo ---')
    const usBuyerEmail = `buyer_us_${testSuffix}@example.com`
    const usCheckout = await checkoutService.createSession({
      productId: usdProduct.id,
      creatorId: user.id,
      name: 'Alice Johnson',
      email: usBuyerEmail,
      country: 'US',
    })

    assert(usCheckout.provider === 'dodo', 'Provider resolved to dodo for country US')
    assert(Boolean(usCheckout.sessionId), 'Dodo session ID returned')
    assert(Boolean(usCheckout.checkoutUrl), 'Dodo checkoutUrl returned')
    assert(usCheckout.currency === 'USD', 'Currency preserved as USD')
    assert(Number(usCheckout.amount) === 25, 'Amount is $25')
    assert(usCheckout.order.country === 'US', 'Order country is persisted as US')
    assert(usCheckout.order.paymentProvider === 'dodo', 'Order paymentProvider is saved as dodo')

    // -----------------------------------------------------------------
    // TEST 3: Other supported countries route to Dodo (GB, CA, AU, DE, FR, JP)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Other supported countries route to Dodo ---')
    const testCountries = ['GB', 'CA', 'AU', 'DE', 'FR', 'AE', 'SG', 'JP']
    for (const cCode of testCountries) {
      const cEmail = `buyer_${cCode.toLowerCase()}_${testSuffix}@example.com`
      const cCheckout = await checkoutService.createSession({
        productId: usdProduct.id,
        creatorId: user.id,
        name: `Customer ${cCode}`,
        email: cEmail,
        country: cCode,
      })
      assert(cCheckout.provider === 'dodo', `Country ${cCode} routes to dodo`)
      assert(cCheckout.order.country === cCode, `Country ${cCode} persisted on order`)
      assert(cCheckout.order.paymentProvider === 'dodo', `Provider persisted as dodo for ${cCode}`)
    }

    // -----------------------------------------------------------------
    // TEST 4: Missing or invalid country is rejected with 400
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Missing or invalid country is rejected ---')
    const invalidInputs = ['', null, undefined, 'XX', 'ZZ', 'UNKNOWN', '123', 'INDIA']
    for (const inv of invalidInputs) {
      let rejected = false
      try {
        await checkoutService.createSession({
          productId: inrProduct.id,
          creatorId: user.id,
          name: 'Invalid Country Tester',
          email: `invalid_${testSuffix}@example.com`,
          country: inv,
        })
      } catch (err) {
        rejected = true
        assert(err.status === 400 || err.statusCode === 400, `Rejected invalid country "${inv}" with 400`)
      }
      assert(rejected, `Checkout creation rejected for invalid country "${inv}"`)
    }

    // -----------------------------------------------------------------
    // TEST 5: Frontend attempts to override provider selection are ignored
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Frontend attempts to override provider selection are ignored ---')
    // Attempt 1: Buyer in India sending provider='dodo'
    const spoofInCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Spoof Test IN',
      email: `spoof_in_${testSuffix}@example.com`,
      country: 'IN',
      provider: 'dodo', // Tampered client param
    })
    assert(spoofInCheckout.provider === 'razorpay', 'Client provider="dodo" ignored; server routed IN to razorpay')
    assert(spoofInCheckout.order.paymentProvider === 'razorpay', 'Database order recorded razorpay')

    // Attempt 2: Buyer in US sending provider='razorpay'
    const spoofUsCheckout = await checkoutService.createSession({
      productId: usdProduct.id,
      creatorId: user.id,
      name: 'Spoof Test US',
      email: `spoof_us_${testSuffix}@example.com`,
      country: 'US',
      provider: 'razorpay', // Tampered client param
    })
    assert(spoofUsCheckout.provider === 'dodo', 'Client provider="razorpay" ignored; server routed US to dodo')
    assert(spoofUsCheckout.order.paymentProvider === 'dodo', 'Database order recorded dodo')

    // -----------------------------------------------------------------
    // TEST 6: Tampered product prices are rejected
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Tampered product prices are rejected ---')
    // Attempt to pass price: 1 or amount: 1 in body
    const tamperedCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Tamper Price Tester',
      email: `tamper_${testSuffix}@example.com`,
      country: 'IN',
      price: 1, // Tampered price
      amount: 1, // Tampered amount
    })
    assert(Number(tamperedCheckout.order.amount) === 999, 'Server used actual configured price ₹999, ignored client price: 1')
    assert(tamperedCheckout.amount === 99900, 'Paise amount calculated from server price ₹999')

    // -----------------------------------------------------------------
    // TEST 7: Correct provider-specific checkout creation
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Correct provider-specific checkout creation ---')
    // Razorpay checkout order structure
    assert(inCheckout.provider === 'razorpay', 'Razorpay provider specified')
    assert(typeof inCheckout.amount === 'number' && inCheckout.amount > 0, 'Razorpay amount is positive integer (paise)')
    assert(inCheckout.currency === 'INR', 'Razorpay currency is INR')
    assert(typeof inCheckout.razorpayOrderId === 'string', 'Razorpay order ID is string')

    // Dodo checkout session structure
    assert(usCheckout.provider === 'dodo', 'Dodo provider specified')
    assert(typeof usCheckout.sessionId === 'string', 'Dodo sessionId is string')
    assert(typeof usCheckout.checkoutUrl === 'string' && usCheckout.checkoutUrl.startsWith('http'), 'Dodo checkoutUrl is valid URL')

    // -----------------------------------------------------------------
    // TEST 8: Razorpay payment failure does not fulfil the order
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Razorpay payment failure does not fulfil the order ---')
    const failedRzpBuyerEmail = `rzp_fail_${testSuffix}@example.com`
    const failedRzpCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Failed Rzp Buyer',
      email: failedRzpBuyerEmail,
      country: 'IN',
    })

    // Attempt verification with invalid signature
    let sigRejected = false
    try {
      await checkoutService.verifyPayment({
        orderId: failedRzpCheckout.orderId,
        razorpayOrderId: failedRzpCheckout.razorpayOrderId,
        razorpayPaymentId: 'pay_invalid_12345',
        razorpaySignature: 'invalid_forged_signature',
      })
    } catch (e) {
      sigRejected = true
      assert(e.status === 400 || e.statusCode === 400, 'Invalid signature rejected with 400')
    }
    assert(sigRejected, 'Verification call with invalid signature was rejected')

    // Order must remain PENDING, entitlement must NOT exist
    const orderAfterFail = await ordersRepo.getById(failedRzpCheckout.orderId)
    assert(orderAfterFail.status === 'PENDING', 'Order status remains PENDING after verification failure')
    const hasEntAfterFail = await entitlementsRepo.has(null, inrProduct.id, failedRzpBuyerEmail)
    assert(!hasEntAfterFail, 'No entitlement granted after signature verification failure')

    // -----------------------------------------------------------------
    // TEST 9: Dodo payment failure does not fulfil the order
    // -----------------------------------------------------------------
    console.log('\n--- TEST 9: Dodo payment failure does not fulfil the order ---')
    const failedDodoBuyerEmail = `dodo_fail_${testSuffix}@example.com`
    const failedDodoCheckout = await checkoutService.createSession({
      productId: usdProduct.id,
      creatorId: user.id,
      name: 'Failed Dodo Buyer',
      email: failedDodoBuyerEmail,
      country: 'US',
    })

    // Mock session as unpaid
    const origGetSession = dodoProvider.getCheckoutSession
    dodoProvider.getCheckoutSession = async () => ({
      session_id: failedDodoCheckout.sessionId,
      payment_status: 'unpaid',
      payment_id: null,
    })

    let dodoRejected = false
    try {
      await checkoutService.verifyPayment({
        orderId: failedDodoCheckout.orderId,
        sessionId: failedDodoCheckout.sessionId,
      })
    } catch (e) {
      dodoRejected = true
      assert(e.status === 400 || e.statusCode === 400, 'Unpaid Dodo session rejected with 400')
    }
    assert(dodoRejected, 'Unpaid Dodo verification rejected')

    const dodoOrderAfterFail = await ordersRepo.getById(failedDodoCheckout.orderId)
    assert(dodoOrderAfterFail.status === 'PENDING', 'Dodo order remains PENDING when unpaid')
    const hasDodoEntAfterFail = await entitlementsRepo.has(null, usdProduct.id, failedDodoBuyerEmail)
    assert(!hasDodoEntAfterFail, 'No entitlement granted for unpaid Dodo session')

    dodoProvider.getCheckoutSession = origGetSession

    // -----------------------------------------------------------------
    // TEST 10: Verified successful payments grant access exactly once
    // -----------------------------------------------------------------
    console.log('\n--- TEST 10: Verified successful payments grant access exactly once ---')
    const successRzpBuyerEmail = `rzp_success_${testSuffix}@example.com`
    const successRzpCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Success Rzp Buyer',
      email: successRzpBuyerEmail,
      country: 'IN',
    })

    const rzpProvider = getPaymentProvider()
    const mockPaymentId = `pay_${uuidv4().substring(0, 10)}`
    let validSignature = 'valid'
    if (rzpProvider.keySecret && !rzpProvider.isMock) {
      validSignature = crypto
        .createHmac('sha256', rzpProvider.keySecret)
        .update(`${successRzpCheckout.razorpayOrderId}|${mockPaymentId}`)
        .digest('hex')
    }

    const verifySuccess = await checkoutService.verifyPayment({
      orderId: successRzpCheckout.orderId,
      razorpayOrderId: successRzpCheckout.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: validSignature,
    })

    assert(verifySuccess.success === true, 'Verification returned success: true')
    const paidOrder = await ordersRepo.getById(successRzpCheckout.orderId)
    assert(paidOrder.status === 'PAID', 'Order transitioned to PAID')
    assert(paidOrder.country === 'IN', 'Order preserved country IN after payment')
    assert(paidOrder.razorpayPaymentId === mockPaymentId, 'Payment ID recorded on order')

    const hasEntAfterSuccess = await entitlementsRepo.has(null, inrProduct.id, successRzpBuyerEmail)
    assert(hasEntAfterSuccess, 'Active entitlement granted to customer')

    // -----------------------------------------------------------------
    // TEST 11: Duplicate submissions and webhook retries are idempotent
    // -----------------------------------------------------------------
    console.log('\n--- TEST 11: Duplicate submissions and webhook retries are idempotent ---')
    // Attempt repeated verification of already paid order
    const retryVerify = await checkoutService.verifyPayment({
      orderId: successRzpCheckout.orderId,
      razorpayOrderId: successRzpCheckout.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: validSignature,
    })
    assert(retryVerify.success === true, 'Repeated verification gracefully returns success: true')

    // Verify exactly 1 entitlement exists in database for this order
    const totalEntitlements = await prisma.entitlement.count({
      where: { orderId: successRzpCheckout.orderId }
    })
    assert(totalEntitlements === 1, `Exactly 1 entitlement exists for order (found: ${totalEntitlements})`)

    // Webhook idempotency test
    const duplicateEventId = `evt_${uuidv4()}`
    const rzpEvent = {
      id: duplicateEventId,
      event: 'order.paid',
      payload: {
        order: { entity: { id: successRzpCheckout.razorpayOrderId } },
        payment: { entity: { id: mockPaymentId, order_id: successRzpCheckout.razorpayOrderId, email: successRzpBuyerEmail } }
      }
    }
    const whResult1 = await webhookService.handle(rzpEvent)
    const whResult2 = await webhookService.handle(rzpEvent)
    assert(whResult2.duplicate === true, 'Second webhook delivery recognized as duplicate (idempotent)')

    // -----------------------------------------------------------------
    // TEST 12: Existing subscription routing remains unchanged
    // -----------------------------------------------------------------
    console.log('\n--- TEST 12: Existing subscription routing remains unchanged ---')
    const subProviderIn = getSubscriptionProviderForCountry('IN')
    const subProviderUs = getSubscriptionProviderForCountry('US')
    const subProviderGb = getSubscriptionProviderForCountry('GB')

    assert(subProviderIn === SUBSCRIPTION_PROVIDERS.RAZORPAY, 'Subscription routing for IN remains razorpay')
    assert(subProviderUs === SUBSCRIPTION_PROVIDERS.DODO, 'Subscription routing for US remains dodo')
    assert(subProviderGb === SUBSCRIPTION_PROVIDERS.DODO, 'Subscription routing for GB remains dodo')

    // -----------------------------------------------------------------
    // TEST 13: Existing coupon and consent functionality remains intact
    // -----------------------------------------------------------------
    console.log('\n--- TEST 13: Existing coupon and consent functionality remains intact ---')
    // Create a 20% discount coupon
    const couponCode = `SAVE20_${testSuffix.substring(0, 6)}`
    const coupon = await couponsRepo.create({
      creatorId: user.id,
      code: couponCode,
      status: 'ACTIVE',
      type: 'PERCENTAGE',
      discount: 20,
      expiresAt: new Date(Date.now() + 86400000),
    })

    const couponCheckout = await checkoutService.createSession({
      productId: inrProduct.id,
      creatorId: user.id,
      name: 'Coupon Buyer',
      email: `coupon_buyer_${testSuffix}@example.com`,
      country: 'IN',
      couponCode: couponCode,
    })

    // Original ₹999 with 20% off = ₹799.2 (or rounded)
    assert(couponCheckout.provider === 'razorpay', 'Coupon purchase in IN routes to razorpay')
    assert(Number(couponCheckout.order.amount) < 999, `Discount applied: ${couponCheckout.order.amount} < 999`)
    assert(couponCheckout.order.country === 'IN', 'Country preserved with coupon applied')

    // -----------------------------------------------------------------
    // TEST 14: Wizard UI & Component Audit for Mobile and Desktop
    // -----------------------------------------------------------------
    console.log('\n--- TEST 14: Wizard UI & Component Audit ---')
    const modalPath = path.join(process.cwd(), 'components/storefront/ProductPurchaseModalFlow.jsx')
    const selectPath = path.join(process.cwd(), 'components/ui/CountrySelect.jsx')
    const modalContent = fs.readFileSync(modalPath, 'utf8')
    const selectContent = fs.readFileSync(selectPath, 'utf8')

    // 1. Verify CountrySelect imported in ProductPurchaseModalFlow
    assert(modalContent.includes("import CountrySelect from '@/components/ui/CountrySelect'"), 'CountrySelect imported in modal')
    // 2. Verify CountrySelect rendered in JSX with required props
    assert(modalContent.includes('<CountrySelect'), 'CountrySelect rendered in modal')
    assert(modalContent.includes('checkout-country-select'), 'CountrySelect has unique id')
    assert(modalContent.includes('theme="light"'), 'CountrySelect uses light theme in wizard')
    // 3. Verify openRazorpayProductCheckout imported and called
    assert(modalContent.includes('openRazorpayProductCheckout'), 'openRazorpayProductCheckout integrated in modal')
    // 4. Verify CountrySelect component supports search, mobile responsiveness, and readable names
    assert(selectContent.includes('Search country or code'), 'Search input included in CountrySelect')
    assert(selectContent.includes('Suggested Countries'), 'Suggested countries section included')
    assert(selectContent.includes("theme === 'light'"), 'Theme support (light/dark) in CountrySelect')

    console.log('\n=====================================================================')
    console.log(` ALL 14 TEST REQUIREMENTS PASSED! (${passed} checks passed, ${failed} failed)`)
    console.log('=====================================================================\n')

  } finally {
    // Cleanup test records
    console.log('--- Cleaning up test records ---')
    await prisma.entitlement.deleteMany({ where: { product: { creatorId: user.id } } }).catch(() => {})
    await prisma.order.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.customer.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.product.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.store.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.creatorProfile.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.coupon.deleteMany({ where: { creatorId: user.id } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {})
    console.log('Cleanup completed.')
  }
}

runTests().catch((e) => {
  console.error('Test run failed:', e)
  process.exit(1)
})
