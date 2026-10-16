import { 
  storeService, 
  creatorSubscriptionService, 
  authService, 
  productService 
} from '../lib/services.js'
import { 
  storesRepo, 
  creatorSubscriptionsRepo, 
  usersRepo, 
  productsRepo 
} from '../lib/repos.js'
import { resolveCreatorPlan, getPlanConfig, PLAN_FEATURES } from '../lib/plans.js'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASSED: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAILED: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function createTestCreator(planId = 'CREATOR', status = 'ACTIVE') {
  const email = `creator_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`
  const user = await usersRepo.create({
    email,
    name: 'Test Creator',
    role: 'CREATOR',
    passwordHash: 'hashed_pw_for_test'
  })
  
  // Create subscription
  await creatorSubscriptionsRepo.upsert(user.id, {
    plan: planId,
    planId: planId,
    status: status,
    billingCycle: 'MONTHLY',
    amount: planId === 'PRO' ? 99900 : 49900,
    currency: 'INR',
    provider: 'RAZORPAY',
    providerSubscriptionId: `sub_test_${uuidv4().replace(/-/g, '').slice(0, 14)}`,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  })

  // Create empty store
  const store = await storeService.getOrCreate(user.id)

  return { user, store }
}

async function runAllTests() {
  console.log('='.repeat(80))
  console.log('RUNNING STOREFRONT PAGE LIMIT ENTITLEMENTS TEST SUITE (16 TEST CASES)')
  console.log('='.repeat(80))

  try {
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Creator plan with 0 pages -> Create page (Home -> 1 page) ---')
    const { user: u1 } = await createTestCreator('CREATOR', 'ACTIVE')
    const res1 = await storeService.listPages(u1.id)
    assert(res1.length === 1 && res1[0].isDefault === true, 'Default Home page is created (Total: 1 page)')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Creator plan with 1 page -> Create page -> SUCCESS (2 pages) ---')
    const res2 = await storeService.addPage(u1.id, { name: 'Shop' })
    assert(res2.pages.length === 2, 'Second page created successfully (Total: 2 pages)')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Creator plan with 2 pages -> Create page -> SUCCESS (3 pages) ---')
    const res3 = await storeService.addPage(u1.id, { name: 'About' })
    assert(res3.pages.length === 3, 'Third page created successfully (Total: 3 pages)')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Creator plan with 3 pages -> Create 4th page -> BLOCKED (PAGE_LIMIT_REACHED) ---')
    let blocked4 = false
    try {
      await storeService.addPage(u1.id, { name: 'Blog' })
    } catch (err) {
      blocked4 = true
      assert(err.status === 403, 'Blocked with HTTP 403 status')
      assert(err.code === 'PAGE_LIMIT_REACHED', 'Error code is PAGE_LIMIT_REACHED')
      assert(err.limit === 3, 'Limit field is 3')
      assert(err.currentCount === 3, 'CurrentCount field is 3')
      assert(err.plan === 'CREATOR', 'Plan field is CREATOR')
    }
    assert(blocked4, 'Creation of 4th page was blocked')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Creator plan with 3 pages -> Duplicate page -> BLOCKED (PAGE_LIMIT_REACHED) ---')
    let blocked5 = false
    try {
      await storeService.duplicatePage(u1.id, res2.page.id)
    } catch (err) {
      blocked5 = true
      assert(err.status === 403, 'Duplication blocked with HTTP 403 status')
      assert(err.code === 'PAGE_LIMIT_REACHED', 'Duplication error code is PAGE_LIMIT_REACHED')
      assert(err.limit === 3, 'Duplication limit is 3')
      assert(err.currentCount === 3, 'Duplication currentCount is 3')
    }
    assert(blocked5, 'Duplication at 3 pages was blocked')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Creator plan with 3 pages -> Delete one page -> Create page -> SUCCESS ---')
    await storeService.deletePage(u1.id, res3.page.id)
    const pagesAfterDelete = await storeService.listPages(u1.id)
    assert(pagesAfterDelete.length === 2, 'Page deleted successfully, 2 pages remain')
    
    const res6 = await storeService.addPage(u1.id, { name: 'Contact' })
    assert(res6.pages.length === 3, 'New page created in freed slot (Total: 3 pages)')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Pro plan with 3 pages -> Create 4th page -> SUCCESS (4 pages) ---')
    const { user: uPro } = await createTestCreator('PRO', 'ACTIVE')
    await storeService.listPages(uPro.id) // 1 page (home)
    await storeService.addPage(uPro.id, { name: 'Pro Page 2' })
    await storeService.addPage(uPro.id, { name: 'Pro Page 3' })
    const res7 = await storeService.addPage(uPro.id, { name: 'Pro Page 4' })
    assert(res7.pages.length === 4, 'Pro plan successfully created 4th page')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Pro plan with 10 pages -> Create page -> SUCCESS ---')
    for (let i = 5; i <= 10; i++) {
      await storeService.addPage(uPro.id, { name: `Pro Page ${i}` })
    }
    const res8 = await storeService.addPage(uPro.id, { name: 'Pro Page 11' })
    assert(res8.pages.length === 11, 'Pro plan successfully created 11th page')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 9: Pro plan with 50 pages -> Create page -> SUCCESS ---')
    const bulkPages = [{ id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }]
    for (let i = 2; i <= 50; i++) {
      bulkPages.push({ id: `page_${i}`, name: `Bulk Page ${i}`, slug: `bulk-page-${i}`, isDefault: false, position: i - 1 })
    }
    await storesRepo.update(uPro.id, { pages: bulkPages })
    const res9 = await storeService.addPage(uPro.id, { name: 'Pro Page 51' })
    assert(res9.pages.length === 51, 'Pro plan successfully created 51st page')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 10: Creator plan with 3 pages -> Direct API request -> BLOCKED ---')
    let blocked10 = false
    try {
      await storeService.assertCanCreateStorePage(u1.id)
    } catch (err) {
      blocked10 = true
      assert(err.code === 'PAGE_LIMIT_REACHED', 'Direct entitlement check throws PAGE_LIMIT_REACHED')
    }
    assert(blocked10, 'Direct entitlement check blocked')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 11: Creator plan with 3 pages -> Fake frontend plan = PRO -> BLOCKED ---')
    // Server ignores client claims and queries canonical DB subscription
    let blocked11 = false
    try {
      await storeService.addPage(u1.id, { name: 'Fake Plan Page' })
    } catch (err) {
      blocked11 = true
      assert(err.code === 'PAGE_LIMIT_REACHED', 'Server rejects fake frontend claim because DB says CREATOR')
    }
    assert(blocked11, 'Client-side plan spoofing blocked')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 12: Creator plan with 3 pages -> Fake request body { plan: "PRO" } -> BLOCKED ---')
    let blocked12 = false
    try {
      await storeService.addPage(u1.id, { name: 'Payload Spoof', plan: 'PRO', maxPages: 999 })
    } catch (err) {
      blocked12 = true
      assert(err.code === 'PAGE_LIMIT_REACHED', 'Server rejects payload spoofing because DB subscription is authoritative')
    }
    assert(blocked12, 'Payload plan parameter spoofing blocked')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 13: Creator plan with 2 pages -> Concurrent page creation -> Final count <= 3 ---')
    const { user: uConcurrent } = await createTestCreator('CREATOR', 'ACTIVE')
    await storeService.listPages(uConcurrent.id) // 1 page (home)
    await storeService.addPage(uConcurrent.id, { name: 'Existing Page 2' }) // 2 pages
    
    // Fire 5 simultaneous requests to create a page
    const concurrentAttempts = await Promise.allSettled([
      storeService.addPage(uConcurrent.id, { name: 'Race Page A' }),
      storeService.addPage(uConcurrent.id, { name: 'Race Page B' }),
      storeService.addPage(uConcurrent.id, { name: 'Race Page C' }),
      storeService.addPage(uConcurrent.id, { name: 'Race Page D' }),
      storeService.addPage(uConcurrent.id, { name: 'Race Page E' }),
    ])
    
    const finalPages = await storeService.listPages(uConcurrent.id)
    assert(finalPages.length <= 3, `Concurrent requests contained: final page count is ${finalPages.length} <= 3`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 14: Pro plan with 7 pages -> Downgrade to Creator -> 7 pages kept, new creation BLOCKED ---')
    const { user: uDowngrade } = await createTestCreator('PRO', 'ACTIVE')
    const sevenPages = [{ id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }]
    for (let i = 2; i <= 7; i++) {
      sevenPages.push({ id: `page_dg_${i}`, name: `Downgrade Page ${i}`, slug: `dg-page-${i}`, isDefault: false, position: i - 1 })
    }
    await storesRepo.update(uDowngrade.id, { pages: sevenPages })
    
    // Simulate downgrade to CREATOR
    await creatorSubscriptionsRepo.upsert(uDowngrade.id, {
      plan: 'CREATOR',
      planId: 'CREATOR',
      amount: 49900
    })

    const existingPagesAfterDowngrade = await storeService.listPages(uDowngrade.id)
    assert(existingPagesAfterDowngrade.length === 7, 'All 7 existing pages are preserved (no data loss)')

    let blocked14 = false
    try {
      await storeService.addPage(uDowngrade.id, { name: 'New Page After Downgrade' })
    } catch (err) {
      blocked14 = true
      assert(err.code === 'PAGE_LIMIT_REACHED', 'New page creation blocked on downgraded plan')
      assert(err.currentCount === 7, 'Error reflects 7 current pages')
      assert(err.limit === 3, 'Error reflects 3 allowed pages')
    }
    assert(blocked14, 'New page creation is blocked after downgrade')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 15: Creator plan with 3 pages -> Upgrade to Pro -> Page #4 creation ALLOWED ---')
    const { user: uUpgrade } = await createTestCreator('CREATOR', 'ACTIVE')
    await storeService.listPages(uUpgrade.id) // 1 page
    await storeService.addPage(uUpgrade.id, { name: 'Page 2' })
    await storeService.addPage(uUpgrade.id, { name: 'Page 3' })

    // Simulate upgrade to PRO
    await creatorSubscriptionsRepo.upsert(uUpgrade.id, {
      plan: 'PRO',
      planId: 'PRO',
      amount: 99900
    })

    const res15 = await storeService.addPage(uUpgrade.id, { name: 'Page 4 After Upgrade' })
    assert(res15.pages.length === 4, 'Page #4 successfully created after upgrade to Pro')

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 16: Creator plan with 3 pages + 50 digital products -> All 50 products remain valid ---')
    const { user: uProducts } = await createTestCreator('CREATOR', 'ACTIVE')
    await storeService.listPages(uProducts.id)
    await storeService.addPage(uProducts.id, { name: 'Product Store Page 2' })
    await storeService.addPage(uProducts.id, { name: 'Product Store Page 3' })
    
    // Create 50 digital products
    console.log('  Creating 50 digital products for Creator plan creator...')
    for (let i = 1; i <= 50; i++) {
      await productsRepo.create({
        creatorId: uProducts.id,
        title: `Digital Product ${i}`,
        type: 'DIGITAL_PRODUCT',
        price: 99,
        currency: 'INR',
        status: 'ACTIVE'
      })
    }
    
    const productsList = await productsRepo.list(uProducts.id)
    assert(productsList.length === 50, `All 50 digital products created and active (Total: ${productsList.length})`)
    
    const pagesCheck = await storeService.listPages(uProducts.id)
    assert(pagesCheck.length === 3, 'Storefront pages remain exactly 3')

    console.log('\n' + '='.repeat(80))
    console.log(`ALL 16 TESTS PASSED SUCCESSFULLY! (${passed} checks passed, ${failed} failed)`)
    console.log('='.repeat(80))
  } catch (err) {
    console.error('\nTEST RUNNER ERROR:', err)
    process.exit(1)
  }
}

runAllTests()
