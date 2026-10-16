import { couponService, checkoutService } from '../lib/services.js'
import { couponsRepo, productsRepo, usersRepo, ordersRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runTests() {
  console.log('============================================================')
  console.log('RUNNING COMPREHENSIVE CREATORSTORE COUPON SYSTEM TEST SUITE')
  console.log('============================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName} ${extra ? `(${extra})` : ''}`)
      failed++
    }
  }

  const runId = uuidv4().slice(0, 6).toUpperCase()
  const creatorIdA = uuidv4()
  const creatorIdB = uuidv4()

  try {
    // 1. Setup Creator Users in DB
    await usersRepo.create({
      id: creatorIdA,
      email: `creator_a_${runId}@example.com`,
      passwordHash: 'hash',
      role: 'CREATOR',
    }).catch(() => {})

    await usersRepo.create({
      id: creatorIdB,
      email: `creator_b_${runId}@example.com`,
      passwordHash: 'hash',
      role: 'CREATOR',
    }).catch(() => {})

    // Add Pro Subscription for Creator A
    const { creatorSubscriptionsRepo } = await import('../lib/repos.js')
    await creatorSubscriptionsRepo.upsert(creatorIdA, {
      plan: 'PRO',
      status: 'ACTIVE',
      razorpayOrderId: `order_${runId}`,
      razorpayPaymentId: `pay_${runId}`,
    }).catch(() => {})

    // 2. Setup Products with valid UUIDs
    const prodA1 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorIdA,
      title: 'Course Alpha',
      slug: `course-alpha-${runId}`,
      type: 'COURSE',
      price: 1000,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    const prodA2 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorIdA,
      title: 'Ebook Beta',
      slug: `ebook-beta-${runId}`,
      type: 'DIGITAL_DOWNLOAD',
      price: 400,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    const prodB1 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorIdB,
      title: 'Creator B Masterclass',
      slug: `b-masterclass-${runId}`,
      type: 'COURSE',
      price: 2000,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    console.log('--- TEST 1: Create All-Products Percentage Coupon with Min Order & Validity ---')
    const c1 = await couponService.create(creatorIdA, {
      code: `SAVE20_${runId}`,
      type: 'PERCENTAGE',
      discount: 20,
      scope: 'ALL',
      minOrderPrice: 500,
      validityHours: 24,
    })
    assert(c1 && c1.code === `SAVE20_${runId}` && c1.type === 'PERCENTAGE' && c1.discount === 20 && c1.minOrderPrice === 500, 'TEST 1: Coupon created with correct fields')

    console.log('\n--- TEST 2: Validate Coupon for Eligible Product (Price >= 500) ---')
    const val1 = await couponService.validate(creatorIdA, `save20_${runId}`, prodA1.id, 1000)
    assert(val1.valid === true && val1.discountAmount === 200 && val1.finalAmount === 800, 'TEST 2: Coupon validates case-insensitively and computes 20% discount (₹1000 -> ₹800)')

    console.log('\n--- TEST 3: Validate Coupon for Product Below Min Order (Price = 400 < 500) ---')
    let minOrderRejected = false
    try {
      await couponService.validate(creatorIdA, `SAVE20_${runId}`, prodA2.id, 400)
    } catch (err) {
      minOrderRejected = err.message.includes('Minimum order value')
    }
    assert(minOrderRejected, 'TEST 3: Minimum order requirement enforced (₹400 < ₹500 rejected)')

    console.log('\n--- TEST 4: Create Specific Product Coupon (Only valid for Product A1) ---')
    const cSpecific = await couponService.create(creatorIdA, {
      code: `SPECIFIC50_${runId}`,
      type: 'FIXED',
      discount: 150,
      scope: 'SPECIFIC',
      productIds: [prodA1.id],
      validityHours: 12,
    })
    assert(cSpecific && cSpecific.scope === 'SPECIFIC' && cSpecific.productIds.includes(prodA1.id), 'TEST 4: Specific product coupon created')

    console.log('\n--- TEST 5: Specific Product Coupon Applied to Targeted Product ---')
    const valSpecValid = await couponService.validate(creatorIdA, `SPECIFIC50_${runId}`, prodA1.id, 1000)
    assert(valSpecValid.valid === true && valSpecValid.discountAmount === 150 && valSpecValid.finalAmount === 850, 'TEST 5: Valid for targeted product (₹1000 - ₹150 = ₹850)')

    console.log('\n--- TEST 6: Specific Product Coupon Applied to Untargeted Product ---')
    let wrongProdRejected = false
    try {
      await couponService.validate(creatorIdA, `SPECIFIC50_${runId}`, prodA2.id, 400)
    } catch (err) {
      wrongProdRejected = err.message.includes('not valid for this product')
    }
    assert(wrongProdRejected, 'TEST 6: Rejected for untargeted product')

    console.log('\n--- TEST 7: Cross-Creator Security / IDOR Protection ---')
    let crossCreatorRejected = false
    try {
      // Trying to apply Creator A's coupon to Creator B's product
      await couponService.validate(creatorIdB, `SAVE20_${runId}`, prodB1.id, 2000)
    } catch (err) {
      crossCreatorRejected = true
    }
    assert(crossCreatorRejected, 'TEST 7: Creator A coupon cannot be applied to Creator B product')

    console.log('\n--- TEST 8: Expiration & Immediate Invalidation (Layer 1) ---')
    // Create an already expired coupon (expires in the past)
    const expiredCoupon = await couponsRepo.create({
      creatorId: creatorIdA,
      code: `PASTEXP_${runId}`,
      type: 'PERCENTAGE',
      discount: 30,
      scope: 'ALL',
      expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      status: 'ACTIVE',
    })
    let expRejected = false
    try {
      await couponService.validate(creatorIdA, `PASTEXP_${runId}`, prodA1.id, 1000)
    } catch (err) {
      expRejected = err.message.includes('expired')
    }
    assert(expRejected, 'TEST 8: Expired coupon rejected immediately at runtime')

    console.log('\n--- TEST 9: Background Cleanup / Deletion of Expired Coupons (Layer 2) ---')
    await couponService.cleanupExpired(creatorIdA)
    const afterCleanup = await couponsRepo.getByCode(creatorIdA, `PASTEXP_${runId}`)
    assert(!afterCleanup, 'TEST 9: Expired coupon completely deleted from database by cleanup')

    console.log('\n--- TEST 10: Creator Coupon Listing & Deletion ---')
    const listBefore = await couponService.list(creatorIdA)
    const hasActive = listBefore.some((c) => c.code === `SAVE20_${runId}`)
    assert(hasActive, 'TEST 10a: Active coupon visible in creator list')

    await couponService.delete(creatorIdA, c1.id)
    const listAfter = await couponService.list(creatorIdA)
    const deletedInList = listAfter.some((c) => c.id === c1.id)
    assert(!deletedInList, 'TEST 10b: Creator can delete coupon and it is removed from active list')

    console.log('\n--- TEST 11: Free 100% Discount Checkout Session ---')
    const c100 = await couponService.create(creatorIdA, {
      code: `FREE100_${runId}`,
      type: 'PERCENTAGE',
      discount: 100,
      scope: 'ALL',
      validityHours: 24,
    })
    const freeCheckout = await checkoutService.createSession({
      productId: prodA1.id,
      email: `customer_${runId}@example.com`,
      customerName: 'Free Buyer',
      couponCode: `FREE100_${runId}`,
    })
    assert(freeCheckout && freeCheckout.isFree === true && freeCheckout.order?.amount === 0, 'TEST 11: 100% coupon grants free access immediately without Razorpay')

    console.log('\n============================================================')
    console.log(`COUPON TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`)
    console.log('============================================================')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runTests()
