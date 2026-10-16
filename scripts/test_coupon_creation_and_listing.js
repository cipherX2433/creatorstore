import { couponService } from '../lib/services.js'
import { couponsRepo, usersRepo, productsRepo, creatorSubscriptionsRepo } from '../lib/repos.js'
import assert from 'assert'

async function runTests() {
  console.log('============================================================')
  console.log('STARTING COUPON CREATION & LISTING VERIFICATION SUITE')
  console.log('============================================================\n')

  // Setup Test Creator A
  const runId = Date.now().toString(36)
  const userA = await usersRepo.create({
    email: `creator_coupon_a_${runId}@example.com`,
    passwordHash: 'dummy_hash',
    role: 'CREATOR'
  })
  const creatorIdA = userA.id

  // Give Creator A a Pro Plan
  await creatorSubscriptionsRepo.upsert(creatorIdA, {
    plan: 'CREATOR_PRO',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    amount: 999,
  })

  // Setup Test Creator B
  const userB = await usersRepo.create({
    email: `creator_coupon_b_${runId}@example.com`,
    passwordHash: 'dummy_hash',
    role: 'CREATOR'
  })
  const creatorIdB = userB.id

  await creatorSubscriptionsRepo.upsert(creatorIdB, {
    plan: 'CREATOR_PRO',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    amount: 999,
  })

  console.log(`Creator A ID: ${creatorIdA}`)
  console.log(`Creator B ID: ${creatorIdB}`)

  // Clean any pre-existing coupons for test users
  await couponsRepo.deleteExpired(creatorIdA).catch(() => {})
  await couponsRepo.deleteExpired(creatorIdB).catch(() => {})

  // 1. Initial State Check
  console.log('\n--- 1. Testing Initial Empty State ---')
  const initialListA = await couponService.list(creatorIdA)
  assert.strictEqual(initialListA.length, 0, 'Creator A should have 0 coupons initially')
  console.log('✅ Initial empty state verified: 0 coupons')

  // 2. Create FLASH30
  console.log('\n--- 2. Creating FLASH30 Coupon ---')
  const flash30 = await couponService.create(creatorIdA, {
    code: 'flash30',
    type: 'PERCENTAGE',
    discount: 30,
    scope: 'ALL',
    validityHours: 24,
    minOrderPrice: 0,
  })

  console.log('Created FLASH30:', flash30)

  // Verify DB record fields
  assert.ok(flash30.id, 'Coupon should have an ID')
  assert.strictEqual(flash30.creatorId, creatorIdA, 'Creator ID should match Creator A')
  assert.strictEqual(flash30.code, 'FLASH30', 'Code should be normalized to uppercase')
  assert.strictEqual(flash30.type, 'PERCENTAGE', 'Type should be PERCENTAGE')
  assert.strictEqual(flash30.discount, 30, 'Discount value should be 30')
  assert.strictEqual(flash30.scope, 'ALL', 'Scope should be ALL')
  assert.strictEqual(flash30.minOrderPrice, 0, 'Minimum order price should be 0')
  assert.strictEqual(flash30.status, 'ACTIVE', 'Status should be ACTIVE')
  assert.ok(flash30.expiresAt, 'ExpiresAt date should be set')
  assert.ok(new Date(flash30.expiresAt) > new Date(), 'ExpiresAt should be in the future')
  console.log('✅ FLASH30 DB record fields verified successfully')

  // 3. Verify List Flow immediately after creation
  console.log('\n--- 3. Verifying List / Refetch Flow ---')
  const listAfterFlash30 = await couponService.list(creatorIdA)
  assert.strictEqual(listAfterFlash30.length, 1, 'Coupon list should contain exactly 1 coupon')
  assert.strictEqual(listAfterFlash30[0].code, 'FLASH30', 'Listed coupon code should be FLASH30')
  assert.strictEqual(listAfterFlash30[0].status, 'ACTIVE', 'Listed coupon should be ACTIVE')

  // Verify Metrics calculation
  const now = Date.now()
  const activeCount = listAfterFlash30.filter(c => {
    const expDate = c.expiresAt ? new Date(c.expiresAt).getTime() : (c.expiryDate ? new Date(c.expiryDate).getTime() : null)
    return (!c.status || c.status === 'ACTIVE') && (!expDate || expDate > now)
  }).length
  const totalCreated = listAfterFlash30.length
  assert.strictEqual(activeCount, 1, 'Active Coupons count should be 1')
  assert.strictEqual(totalCreated, 1, 'Total Created count should be 1')
  console.log('✅ List and statistics immediately reflect FLASH30: Active=1, Total=1')

  // 4. Create Multiple Coupons (WELCOME20, SAVE10)
  console.log('\n--- 4. Creating Multiple Coupons (WELCOME20, SAVE10) ---')
  await couponService.create(creatorIdA, {
    code: 'WELCOME20',
    type: 'PERCENTAGE',
    discount: 20,
    scope: 'ALL',
    validityHours: 72,
  })
  await couponService.create(creatorIdA, {
    code: 'SAVE10',
    type: 'FIXED',
    discount: 10,
    scope: 'ALL',
    validityHours: 168,
  })

  const listMultiple = await couponService.list(creatorIdA)
  assert.strictEqual(listMultiple.length, 3, 'Total created coupons should be 3')
  const codes = listMultiple.map(c => c.code)
  assert.ok(codes.includes('FLASH30'), 'Should contain FLASH30')
  assert.ok(codes.includes('WELCOME20'), 'Should contain WELCOME20')
  assert.ok(codes.includes('SAVE10'), 'Should contain SAVE10')

  // Check no duplicates
  const uniqueCodes = new Set(codes)
  assert.strictEqual(uniqueCodes.size, 3, 'All 3 coupons must be unique')
  console.log('✅ Multiple coupons created without duplicates: 3 Active, 3 Total')

  // 5. Verify Creator Isolation
  console.log('\n--- 5. Verifying Creator Isolation ---')
  const listCreatorB = await couponService.list(creatorIdB)
  assert.strictEqual(listCreatorB.length, 0, 'Creator B must NOT see Creator A coupons')
  console.log('✅ Creator isolation verified: Creator B sees 0 coupons')

  // 6. Test Specific Product Targeting
  console.log('\n--- 6. Testing Product Targeting ---')
  const prod1 = await productsRepo.create({
    creatorId: creatorIdA,
    title: `Ebook Pro ${runId}`,
    type: 'DIGITAL_DOWNLOAD',
    price: 500,
    status: 'PUBLISHED',
  })
  const specCoupon = await couponService.create(creatorIdA, {
    code: `PRODSPEC_${runId}`.toUpperCase(),
    type: 'PERCENTAGE',
    discount: 50,
    scope: 'SPECIFIC',
    productIds: [prod1.id],
    validityHours: 24,
  })
  assert.strictEqual(specCoupon.scope, 'SPECIFIC')
  assert.ok(specCoupon.productTitles.includes(`Ebook Pro ${runId}`), 'Specific coupon should include product title')
  console.log('✅ Product specific targeting verified')

  // 7. Test Coupon Deletion
  console.log('\n--- 7. Testing Coupon Deletion ---')
  await couponService.delete(creatorIdA, specCoupon.id)
  const listAfterDelete = await couponService.list(creatorIdA)
  assert.strictEqual(listAfterDelete.length, 3, 'Coupon count should return to 3 after deletion')
  console.log('✅ Coupon deletion verified')

  // Cleanup created test records
  for (const c of listAfterDelete) {
    await couponService.delete(creatorIdA, c.id)
  }
  await productsRepo.remove(prod1.id, creatorIdA).catch(() => {})

  console.log('\n============================================================')
  console.log('ALL COUPON TESTS PASSED SUCCESSFULLY! (100% PASS)')
  console.log('============================================================')
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
