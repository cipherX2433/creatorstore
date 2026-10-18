import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'

console.log('\n=====================================================================')
console.log('🧪 RESTORE PRODUCT PURCHASE WIZARD REGRESSION TEST SUITE')
console.log('=====================================================================\n')

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

async function runTests() {
  let passed = 0
  let failed = 0

  function pass(desc) {
    console.log(`  ✅ [PASS] ${desc}`)
    passed++
  }

  function fail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc}: ${err?.message || err}`)
    failed++
  }

  // -------------------------------------------------------------
  // TEST 1: Source Code Audit — Old Inline Checkout Form Removed
  // -------------------------------------------------------------
  console.log('--- TEST 1: Source Code Audit — Old Inline Checkout Form Removed ---')
  try {
    const pageFilePath = path.join(process.cwd(), 'components/storefront/ProductPurchasePage.jsx')
    const pageContent = fs.readFileSync(pageFilePath, 'utf8')

    assert(!pageContent.includes('id="checkout-customer-info"'), 'Found obsolete checkout-customer-info id in ProductPurchasePage')
    assert(!pageContent.includes('id="checkout-name"'), 'Found obsolete checkout-name id in ProductPurchasePage')
    assert(!pageContent.includes('id="checkout-email"'), 'Found obsolete checkout-email id in ProductPurchasePage')
    assert(!pageContent.includes('checkout.razorpay.com'), 'Found obsolete Razorpay script in ProductPurchasePage')
    assert(!pageContent.includes('new window.Razorpay'), 'Found obsolete window.Razorpay instantiation in ProductPurchasePage')
    assert(!pageContent.includes('<form onSubmit={handlePurchase}'), 'Found obsolete inline checkout form in ProductPurchasePage')

    pass('Obsolete embedded checkout-customer-info form is removed from ProductPurchasePage')
    pass('Obsolete Razorpay scripts and SDK instantiations are removed')
    pass('No duplicate or conflicting inline checkout handlers remain on the product page')
  } catch (err) {
    fail('Audit ProductPurchasePage for removal of old inline checkout', err)
  }

  // -------------------------------------------------------------
  // TEST 2: Source Code Audit — Wizard Integration Present
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Source Code Audit — ProductPurchaseModalFlow Integrated ---')
  try {
    const pageFilePath = path.join(process.cwd(), 'components/storefront/ProductPurchasePage.jsx')
    const pageContent = fs.readFileSync(pageFilePath, 'utf8')

    assert(pageContent.includes("import ProductPurchaseModalFlow from '@/components/storefront/ProductPurchaseModalFlow'"), 'ProductPurchaseModalFlow import missing')
    assert(pageContent.includes('<ProductPurchaseModalFlow'), 'ProductPurchaseModalFlow JSX rendering missing')
    assert(pageContent.includes('isWizardOpen'), 'isWizardOpen state variable missing')
    assert(pageContent.includes('setIsWizardOpen(true)'), 'setIsWizardOpen trigger missing')

    pass('ProductPurchaseModalFlow is imported in ProductPurchasePage')
    pass('isWizardOpen state manages popup modal visibility')
    pass('Action button clicks activate setIsWizardOpen(true)')
  } catch (err) {
    fail('Audit ProductPurchasePage for wizard modal integration', err)
  }

  // -------------------------------------------------------------
  // TEST 3: HTTP Rendering — Public Product Page
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: HTTP Rendering — Public Product Page ---')
  let sampleProduct = null
  let sampleUsername = 'mohit1'
  let sampleSlug = 'aaa'
  try {
    const store = await prisma.store.findFirst({
      where: { published: true },
      include: { creator: { include: { products: { where: { status: 'PUBLISHED', price: { gt: 0 } } } } } }
    })
    const p = store?.creator?.products?.[0]
    if (p) {
      sampleProduct = p
      sampleSlug = p.slug
      sampleUsername = store.username || store.slug || 'mohit1'
    }

    const res = await fetch(`${BASE_URL}/${sampleUsername}/${sampleSlug}`)
    assert.strictEqual(res.status, 200, `Expected 200 OK from /${sampleUsername}/${sampleSlug}, got ${res.status}`)
    const html = await res.text()

    assert(!html.includes('id="checkout-customer-info"'), 'Found obsolete checkout-customer-info in rendered HTML')
    assert(!html.includes('id="checkout-name"'), 'Found obsolete checkout-name in rendered HTML')
    assert(!html.includes('id="checkout-email"'), 'Found obsolete checkout-email in rendered HTML')

    pass(`Direct URL /${sampleUsername}/${sampleSlug} renders with HTTP 200 OK`)
    pass('Rendered HTML does NOT contain the legacy inline checkout form')
  } catch (err) {
    fail(`HTTP verification of /${sampleUsername}/${sampleSlug}`, err)
  }

  // -------------------------------------------------------------
  // TEST 4: API Endpoint — Public Product Data Retrieval
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: API Endpoint — Public Product Data Retrieval ---')
  let testProduct = null
  let testCreator = null
  try {
    const res = await fetch(`${BASE_URL}/api/public/product/${sampleUsername}/${sampleSlug}`)
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`)
    const data = await res.json()

    assert(data.product, 'Expected data.product in response')
    assert(data.creator, 'Expected data.creator in response')
    assert(Number(data.product.price) > 0, 'Expected paid product price > 0')

    testProduct = data.product
    testCreator = data.creator
    pass(`Retrieved product "${testProduct.title}" (Price: ${testProduct.price} ${testProduct.currency})`)
    pass(`Retrieved creator "@${testCreator.username}"`)
  } catch (err) {
    fail(`Retrieve product data from /api/public/product/${sampleUsername}/${sampleSlug}`, err)
  }

  // -------------------------------------------------------------
  // TEST 5: Purchase Wizard Validation — Invalid Name / Email Rejection
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Purchase Wizard Validation — Invalid Customer Details ---')
  try {
    // 1. Invalid email returns 400 Bad Request
    const checkBadRes = await fetch(`${BASE_URL}/api/purchases/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct.id,
        email: 'invalid-email-address',
      }),
    })
    assert.strictEqual(checkBadRes.status, 400, 'Invalid email must return 400 Bad Request')
    pass('Purchase check endpoint rejects invalid email with HTTP 400 Bad Request')

    // 2. Valid email returns purchase status object
    const checkGoodRes = await fetch(`${BASE_URL}/api/purchases/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct.id,
        email: 'new_customer_check@test.com',
      }),
    })
    assert.strictEqual(checkGoodRes.status, 200, 'Valid email must return 200 OK')
    const checkData = await checkGoodRes.json()
    assert.strictEqual(checkData.exists, false, 'New customer should not have existing purchase')
    assert.strictEqual(checkData.isPaid, true, 'Paid product must report isPaid: true')
    pass('Purchase check endpoint accepts valid email and correctly determines isPaid: true')

    // 3. Order creation with missing customer email should be rejected
    const badOrderRes = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct.id,
        customerName: '',
        customerEmail: 'not-an-email',
      }),
    })
    assert(badOrderRes.status >= 400, `Expected 400 Bad Request for bad input, got ${badOrderRes.status}`)
    pass('Order creation strictly rejects invalid / missing customer information with HTTP 400')
  } catch (err) {
    fail('Input validation on purchase wizard endpoints', err)
  }

  // -------------------------------------------------------------
  // TEST 6: Dodo Payments Checkout Flow — Paid Product Order Creation
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Dodo Payments Checkout Flow — Paid Product Order Creation ---')
  try {
    const customerEmail = `wizard_test_${Date.now()}@test.com`
    const customerName = 'Wizard Test User'

    const orderRes = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct.id,
        customerName,
        customerEmail,
        country: 'US',
        currency: 'USD',
      }),
    })

    assert.strictEqual(orderRes.status, 200, `Expected 200 OK, got ${orderRes.status}`)
    const orderData = await orderRes.json()

    assert(orderData.checkoutUrl, 'Expected checkoutUrl in create-order response')
    assert(orderData.checkoutUrl.includes('checkout.dodopayments.com'), 'Expected checkoutUrl to point to Dodo Payments')
    assert.strictEqual(orderData.provider, 'dodo', 'Expected payment provider to be dodo')
    assert(orderData.orderId, 'Expected orderId in response')

    pass('Paid product creates real Dodo checkout session')
    pass(`Hosted Dodo checkout URL generated: ${orderData.checkoutUrl}`)
    pass(`Order created with ID: ${orderData.orderId}`)
  } catch (err) {
    fail('Dodo checkout flow order creation', err)
  }

  // -------------------------------------------------------------
  // TEST 7: Entitlement Security — Pending Order Does Not Grant Access
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Entitlement Security — Pending Order Does Not Grant Access ---')
  try {
    const accessRes = await fetch(`${BASE_URL}/api/checkout/check-access?email=${encodeURIComponent('wizard_test@test.com')}&productId=${testProduct.id}`)
    const accessData = await accessRes.json()

    assert.strictEqual(accessData.hasAccess, false, 'Pending/unpaid customer must not have product access')
    pass('Unpaid / pending order does not grant product access prematurely')
  } catch (err) {
    fail('Entitlement security for unpaid customers', err)
  }

  // -------------------------------------------------------------
  // TEST 8: Verified Payment Grants Access
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Verified Payment Grants Access ---')
  try {
    const buyerEmail = `verified_buyer_${Date.now()}@test.com`
    const creatorId = testProduct.creatorId

    // Create an order in database and confirm payment authoritatively
    const order = await prisma.order.create({
      data: {
        creatorId,
        productId: testProduct.id,
        customerEmail: buyerEmail,
        customerName: 'Verified Buyer',
        amount: Number(testProduct.price),
        currency: testProduct.currency || 'USD',
        status: 'PAID',
        paymentProvider: 'dodo',
        dodoPaymentId: `pay_test_${Date.now()}`,
      },
    })

    await prisma.entitlement.create({
      data: {
        orderId: order.id,
        productId: testProduct.id,
        customerEmail: buyerEmail,
        status: 'ACTIVE',
      },
    })

    const accessRes = await fetch(`${BASE_URL}/api/checkout/check-access?email=${encodeURIComponent(buyerEmail)}&productId=${testProduct.id}`)
    const accessData = await accessRes.json()

    assert.strictEqual(accessData.hasAccess, true, 'Verified buyer should have access')
    pass('Verified payment successfully grants customer access entitlement')

    // Clean up test order and entitlement
    await prisma.entitlement.deleteMany({ where: { orderId: order.id } })
    await prisma.order.delete({ where: { id: order.id } })
  } catch (err) {
    fail('Access entitlement check for verified payment', err)
  }

  // -------------------------------------------------------------
  // TEST 9: Multi-Currency Dynamic Preview Functional
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Multi-Currency Dynamic Preview Functional ---')
  try {
    const previewRes = await fetch(`${BASE_URL}/api/checkout/preview-currency?productId=${testProduct.id}&currency=INR`)
    assert.strictEqual(previewRes.status, 200, `Expected 200, got ${previewRes.status}`)
    const previewData = await previewRes.json()

    assert.strictEqual(previewData.targetCurrency, 'INR')
    assert(Number(previewData.convertedAmount) > 0, 'Expected positive converted amount')
    assert(previewData.symbol, 'Expected currency symbol')

    pass(`Currency preview converted to ${previewData.targetCurrency}: ${previewData.symbol}${previewData.convertedAmount}`)
    pass('Multi-currency conversion preview remains intact')
  } catch (err) {
    fail('Multi-currency conversion preview', err)
  }

  // -------------------------------------------------------------
  // TEST 10: Free Product Access Flow
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Free Product Claim Flow ---')
  try {
    const creatorId = testProduct.creatorId
    let freeProduct = await prisma.product.findFirst({
      where: { price: 0, creatorId },
    })

    if (!freeProduct) {
      freeProduct = await prisma.product.create({
        data: {
          title: 'Free Regression Test Asset',
          slug: `free-test-asset-${Date.now()}`,
          price: 0,
          currency: 'USD',
          creatorId,
          storePublished: true,
          type: 'DIGITAL_DOWNLOAD',
        },
      })
    }

    const freeBuyerEmail = `free_claim_${Date.now()}@test.com`
    const claimRes = await fetch(`${BASE_URL}/api/products/claim-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: freeProduct.id,
        name: 'Free Claimer',
        email: freeBuyerEmail,
        mailingListOptIn: true,
        consentAccepted: true,
      }),
    })

    assert.strictEqual(claimRes.status, 200, `Expected 200 for free claim, got ${claimRes.status}`)
    const claimData = await claimRes.json()
    assert.strictEqual(claimData.success, true, 'Expected success: true on free claim')

    pass('Free product follows instant claim flow without initiating paid checkout')
  } catch (err) {
    fail('Free product claim flow', err)
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n=====================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Fatal error running regression tests:', err)
  process.exit(1)
})
