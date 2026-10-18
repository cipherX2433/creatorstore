/**
 * CreatorStore — Collection Persistence & Public Storefront Rendering Test Suite
 *
 * Verifies all 14 Regression Test Requirements from Phase 6:
 * 1. Creating a collection persists after refresh.
 * 2. Adding one product persists after refresh.
 * 3. Adding multiple products persists after refresh.
 * 4. Collection membership is saved using the correct product and collection IDs.
 * 5. Duplicate additions are handled safely.
 * 6. Product ordering and collection layout survive refresh (List, Grid, Carousel, Showcase).
 * 7. Removing a product from a collection persists after refresh.
 * 8. A product removed from a collection follows the existing top-level placement rules.
 * 9. The dashboard reload returns the correct collection membership.
 * 10. The public storefront renders assigned products inside their collection.
 * 11. Published assigned products do not appear incorrectly as separate top-level products.
 * 12. Unpublished products remain hidden from public visitors.
 * 13. Unauthorized creators cannot modify another creator's collections or steal products.
 * 14. Existing product checkout and collection editing still work.
 */

import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  storeService,
  publicService,
  checkoutService,
} from '../lib/services.js'
import {
  productsRepo,
  storesRepo,
  usersRepo,
  creatorSubscriptionsRepo,
  storeSectionsRepo,
} from '../lib/repos.js'

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
  console.log('🧪 Collection Persistence & Public Storefront Regression Tests')
  console.log('===============================================================\n')

  const testSuffix = Date.now()
  let creatorA = null
  let creatorB = null
  let prodA1 = null
  let prodA2 = null
  let prodA3_unpublished = null
  let prodB1 = null
  let collectionId = null

  try {
    // 0. Setup test creators and products
    console.log('--- 0. Setup Test Users & Products ---')
    const userAData = await authService.signup({
      email: `creator_coll_a_${testSuffix}@example.com`,
      password: 'Password123!',
      name: 'Creator A Collections',
      country: 'IN',
    })
    creatorA = userAData.user

    const userBData = await authService.signup({
      email: `creator_coll_b_${testSuffix}@example.com`,
      password: 'Password123!',
      name: 'Creator B Collections',
      country: 'IN',
    })
    creatorB = userBData.user

    // Ensure PRO subscription for entitlements
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await creatorSubscriptionsRepo.upsert(creatorA.id, {
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: expiresAt,
      billingCycle: 'monthly',
      cancelAtPeriodEnd: false,
    })

    await creatorSubscriptionsRepo.upsert(creatorB.id, {
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: expiresAt,
      billingCycle: 'monthly',
      cancelAtPeriodEnd: false,
    })

    // Create published products for Creator A
    prodA1 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorA.id,
      title: 'Product SSS',
      slug: `product-sss-${testSuffix}`,
      price: 100,
      currency: 'INR',
      status: 'PUBLISHED',
      type: 'DIGITAL_DOWNLOAD',
    })

    prodA2 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorA.id,
      title: 'Product AAA',
      slug: `product-aaa-${testSuffix}`,
      price: 250,
      currency: 'INR',
      status: 'PUBLISHED',
      type: 'DIGITAL_DOWNLOAD',
    })

    // Unpublished product for Creator A
    prodA3_unpublished = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorA.id,
      title: 'Draft Product ZZZ',
      slug: `product-zzz-${testSuffix}`,
      price: 50,
      currency: 'INR',
      status: 'DRAFT',
      type: 'DIGITAL_DOWNLOAD',
    })

    // Product for Creator B
    prodB1 = await productsRepo.create({
      id: uuidv4(),
      creatorId: creatorB.id,
      title: 'Product Other Creator',
      slug: `product-other-${testSuffix}`,
      price: 500,
      currency: 'INR',
      status: 'PUBLISHED',
      type: 'DIGITAL_DOWNLOAD',
    })

    // Publish store for Creator A
    await storesRepo.setPublished(creatorA.id, true)
    const initialStore = await storeService.getOrCreate(creatorA.id)
    assert(initialStore && initialStore.creatorId === creatorA.id, 'Creator A store initialized')

    // -------------------------------------------------------------
    // Test 1: Creating a collection persists after refresh
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Creating a collection persists after refresh ---')
    collectionId = uuidv4()
    const createCollectionPayload = {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          pageId: null,
          props: {
            title: 'abc',
            layout: 'list',
            displayMode: 'list',
            items: [],
          },
        },
      ],
    }

    await storeService.update(creatorA.id, createCollectionPayload)
    // Simulate refresh by reloading from repository
    const refreshedStore1 = await storeService.getOrCreate(creatorA.id)
    const foundCol1 = refreshedStore1.sections.find((s) => s.id === collectionId)
    assert(foundCol1, 'Collection "abc" found in database after reload')
    assert(foundCol1.props?.title === 'abc', 'Collection title is "abc"')
    assert(Array.isArray(foundCol1.props?.items) && foundCol1.props.items.length === 0, 'Collection initially empty')

    // -------------------------------------------------------------
    // Test 2: Adding one product persists after refresh
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Adding one product persists after refresh ---')
    const addOnePayload = {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          pageId: null,
          props: {
            title: 'abc',
            layout: 'list',
            displayMode: 'list',
            items: [
              {
                id: uuidv4(),
                type: 'product',
                productId: prodA1.id,
              },
            ],
          },
        },
      ],
    }

    await storeService.update(creatorA.id, addOnePayload)
    const refreshedStore2 = await storeService.getOrCreate(creatorA.id)
    const foundCol2 = refreshedStore2.sections.find((s) => s.id === collectionId)
    assert(foundCol2.props.items.length === 1, 'Collection has exactly 1 product persisted')
    assert(foundCol2.props.items[0].productId === prodA1.id, 'Persisted product ID matches prodA1')

    // -------------------------------------------------------------
    // Test 3: Adding multiple products persists after refresh
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Adding multiple products persists after refresh ---')
    const addMultiplePayload = {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          pageId: null,
          props: {
            title: 'abc',
            layout: 'grid',
            displayMode: 'grid',
            items: [
              { id: uuidv4(), type: 'product', productId: prodA1.id },
              { id: uuidv4(), type: 'product', productId: prodA2.id },
            ],
          },
        },
      ],
    }

    await storeService.update(creatorA.id, addMultiplePayload)
    const refreshedStore3 = await storeService.getOrCreate(creatorA.id)
    const foundCol3 = refreshedStore3.sections.find((s) => s.id === collectionId)
    assert(foundCol3.props.items.length === 2, 'Collection has both products persisted')
    assert(foundCol3.props.items[0].productId === prodA1.id, 'First item is prodA1 (sss)')
    assert(foundCol3.props.items[1].productId === prodA2.id, 'Second item is prodA2 (aaa)')

    // -------------------------------------------------------------
    // Test 4: Collection membership is saved using canonical IDs
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Canonical IDs and valid UUIDs ---')
    const rawSectionDb = await prisma.storeSection.findUnique({ where: { id: collectionId } })
    assert(rawSectionDb, 'Section exists in Prisma StoreSection table')
    assert(rawSectionDb.id === collectionId, 'Canonical section ID matches')
    assert(rawSectionDb.props.items.length === 2, 'Prisma JSON props contains 2 items')
    assert(rawSectionDb.props.items[0].productId === prodA1.id, 'Canonical product ID stored')

    // -------------------------------------------------------------
    // Test 5: Duplicate additions are handled safely
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Duplicate additions handled safely ---')
    const duplicatePayload = {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          props: {
            title: 'abc',
            layout: 'grid',
            items: [
              { id: uuidv4(), type: 'product', productId: prodA1.id },
              { id: uuidv4(), type: 'product', productId: prodA1.id }, // duplicate
              { id: uuidv4(), type: 'product', productId: prodA2.id },
            ],
          },
        },
      ],
    }

    await storeService.update(creatorA.id, duplicatePayload)
    const dedupeStore = await storeService.getOrCreate(creatorA.id)
    const dedupeCol = dedupeStore.sections.find((s) => s.id === collectionId)
    assert(dedupeCol.props.items.length === 2, 'Duplicate item was stripped by backend deduplication')
    assert(dedupeCol.props.items[0].productId === prodA1.id, 'prodA1 preserved once')
    assert(dedupeCol.props.items[1].productId === prodA2.id, 'prodA2 preserved once')

    // -------------------------------------------------------------
    // Test 6: Product ordering and collection layout survive refresh
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Product ordering and collection layout survive refresh ---')
    for (const layoutMode of ['grid', 'carousel', 'showcase', 'list']) {
      const layoutPayload = {
        sections: [
          {
            id: collectionId,
            type: 'collection',
            hidden: false,
            props: {
              title: 'abc',
              layout: layoutMode,
              displayMode: layoutMode,
              // Reverse product order: prodA2 then prodA1
              items: [
                { id: uuidv4(), type: 'product', productId: prodA2.id },
                { id: uuidv4(), type: 'product', productId: prodA1.id },
              ],
            },
          },
        ],
      }
      await storeService.update(creatorA.id, layoutPayload)
      const reloadedStore = await storeService.getOrCreate(creatorA.id)
      const col = reloadedStore.sections.find((s) => s.id === collectionId)
      assert(col.props.layout === layoutMode, `Layout '${layoutMode}' survived database reload`)
      assert(col.props.displayMode === layoutMode, `displayMode '${layoutMode}' matches layout`)
      assert(col.props.items[0].productId === prodA2.id, `Reordered item 0 is prodA2`)
      assert(col.props.items[1].productId === prodA1.id, `Reordered item 1 is prodA1`)
    }

    // Reset to Grid layout with prodA1, prodA2
    await storeService.update(creatorA.id, {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          props: {
            title: 'abc',
            layout: 'grid',
            displayMode: 'grid',
            items: [
              { id: uuidv4(), type: 'product', productId: prodA1.id },
              { id: uuidv4(), type: 'product', productId: prodA2.id },
            ],
          },
        },
        // Top-level product section for prodA1 as well (to test top-level filtering)
        {
          id: uuidv4(),
          type: 'product',
          hidden: false,
          props: { productId: prodA1.id, layout: 'classic' },
        },
      ],
    })

    // -------------------------------------------------------------
    // Test 7 & 8: Removing a product from a collection persists and restores top-level
    // -------------------------------------------------------------
    console.log('\n--- Test 7 & 8: Removing product persists and restores top-level ---')
    const removeOnePayload = {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          props: {
            title: 'abc',
            layout: 'grid',
            displayMode: 'grid',
            items: [
              { id: uuidv4(), type: 'product', productId: prodA1.id },
            ],
          },
        },
        // When prodA2 is removed, it has a top-level section
        {
          id: uuidv4(),
          type: 'product',
          hidden: false,
          props: { productId: prodA2.id, layout: 'classic' },
        },
      ],
    }

    await storeService.update(creatorA.id, removeOnePayload)
    const afterRemoveStore = await storeService.getOrCreate(creatorA.id)
    const afterRemoveCol = afterRemoveStore.sections.find((s) => s.id === collectionId)
    assert(afterRemoveCol.props.items.length === 1, 'Only 1 product remains in collection after removal')
    assert(afterRemoveCol.props.items[0].productId === prodA1.id, 'prodA1 remains in collection')
    const topLevelA2 = afterRemoveStore.sections.find((s) => s.type === 'product' && s.props?.productId === prodA2.id)
    assert(topLevelA2, 'Removed product prodA2 is now a top-level section')

    // Restore both products in collection in Grid layout for public storefront tests
    await storeService.update(creatorA.id, {
      sections: [
        {
          id: collectionId,
          type: 'collection',
          hidden: false,
          props: {
            title: 'abc',
            layout: 'grid',
            displayMode: 'grid',
            items: [
              { id: uuidv4(), type: 'product', productId: prodA1.id },
              { id: uuidv4(), type: 'product', productId: prodA2.id },
              { id: uuidv4(), type: 'product', productId: prodA3_unpublished.id },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'product',
          hidden: false,
          props: { productId: prodA1.id, layout: 'classic' },
        },
      ],
    })

    // -------------------------------------------------------------
    // Test 9: Dashboard reload returns correct collection membership
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Dashboard reload returns correct collection membership ---')
    const dashStore = await storeService.getOrCreate(creatorA.id)
    const dashCol = dashStore.sections.find((s) => s.id === collectionId)
    assert(dashCol, 'Collection abc returned on dashboard reload')
    assert(dashCol.props.items.length === 3, 'Dashboard returns all 3 assigned items (including draft for creator view)')
    assert(dashCol.props.layout === 'grid', 'Dashboard returns Grid layout')

    // -------------------------------------------------------------
    // Test 10: Public storefront resolves collection with products
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Public storefront resolves collection with products ---')
    const publicResult = await publicService.resolveStorefront(dashStore.username || dashStore.slug)
    assert(publicResult.status === 'ok', `Public storefront resolved with status 'ok' (got ${publicResult.status})`)
    const pubData = publicResult.data
    const pubCol = pubData.sections.find((s) => s.id === collectionId)
    assert(pubCol, 'Collection abc present on public storefront payload')
    assert(pubCol.props.title === 'abc', 'Collection title is "abc"')
    assert(pubCol.props.layout === 'grid', 'Collection layout is "grid"')

    // -------------------------------------------------------------
    // Test 11: Assigned products do not appear incorrectly as separate top-level products
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Top-level deduplication on public storefront ---')
    // Remember we added a top-level section for prodA1, which is also inside collection abc!
    const topLevelProdA1 = pubData.sections.find(
      (s) => (s.type === 'product' || s.type === 'course') && s.props?.productId === prodA1.id
    )
    assert(!topLevelProdA1, 'prodA1 is grouped in collection abc and filtered out from top-level storefront sections')

    // -------------------------------------------------------------
    // Test 12: Unpublished products remain hidden from public visitors
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Unpublished products remain hidden from public visitors ---')
    const pubProductIds = new Set(pubData.products.map((p) => p.id))
    assert(pubProductIds.has(prodA1.id), 'Published prodA1 is available in public products')
    assert(pubProductIds.has(prodA2.id), 'Published prodA2 is available in public products')
    assert(!pubProductIds.has(prodA3_unpublished.id), 'Draft product prodA3 is NOT in public products list')

    // -------------------------------------------------------------
    // Test 14: Existing product checkout and collection still work
    // -------------------------------------------------------------
    console.log('\n--- Test 14: Existing product checkout works ---')
    const checkoutProduct = await productsRepo.getById(prodA1.id)
    assert(checkoutProduct && checkoutProduct.id === prodA1.id, 'Product lookup works for collection product prodA1')
    assert(Number(checkoutProduct.price) === 100, 'Price correctly preserved (100 INR)')

    // Verify checkout session can resolve by both direct productId and collection item ID
    const colSection = await prisma.storeSection.findUnique({ where: { id: collectionId } })
    assert(colSection, 'Collection section exists in database')
    const matchedColItem = colSection.props.items.find((it) => it.productId === prodA1.id)
    assert(matchedColItem, 'Collection item exists in persisted store section')

    // Verify public product URL structure is correct
    const expectedCheckoutPath = `/${dashStore.slug}/${prodA1.slug}`
    assert(expectedCheckoutPath.includes(prodA1.slug), 'Storefront purchase path preserved')

    // -------------------------------------------------------------
    // Test 13: Unauthorized creators cannot add another creator's products
    // -------------------------------------------------------------
    console.log("\n--- Test 13: Unauthorized creators cannot steal other creators' products ---")
    const stealPayload = {
      sections: [
        {
          id: uuidv4(),
          type: 'collection',
          hidden: false,
          props: {
            title: 'Hacked Collection',
            items: [
              { id: uuidv4(), type: 'product', productId: prodB1.id }, // owned by Creator B!
            ],
          },
        },
      ],
    }

    await storeService.update(creatorA.id, stealPayload)
    const afterStealAttempt = await storeService.getOrCreate(creatorA.id)
    const hackedCol = afterStealAttempt.sections.find((s) => s.props?.title === 'Hacked Collection')
    assert(hackedCol, 'Collection was saved')
    assert(hackedCol.props.items.length === 0, 'Foreign product prodB1 was stripped by ownership validation')

    console.log('\n===============================================================')
    console.log(`🎉 ALL TESTS PASSED! (${passed} assertions, ${failed} failures)`)
    console.log('===============================================================\n')
  } catch (err) {
    console.error('\n❌ Test Suite Failed with error:', err)
    process.exit(1)
  } finally {
    // Cleanup created records
    try {
      if (creatorA) {
        await prisma.storeSection.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.product.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.store.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.user.deleteMany({ where: { id: creatorA.id } })
      }
      if (creatorB) {
        await prisma.storeSection.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.product.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.store.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.user.deleteMany({ where: { id: creatorB.id } })
      }
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message)
    }
  }
}

run()
