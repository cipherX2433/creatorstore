/**
 * CreatorStore — productsRepo.listByCreator & Store Update Regression Test Suite
 *
 * Verifies:
 * 1. Updating a store with valid creator-owned products.
 * 2. Updating a store with duplicate product IDs.
 * 3. Rejecting products owned by another creator.
 * 4. Updating sections with no product IDs.
 * 5. Handling a missing creator.
 * 6. Handling a Prisma/database failure without silently treating it as an empty product list.
 * 7. Confirming PATCH /api/store no longer fails because listByCreator is undefined.
 */

import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  authService,
  storeService,
} from '../lib/services.js'
import {
  productsRepo,
  storesRepo,
  usersRepo,
  creatorSubscriptionsRepo,
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
  console.log('🧪 Store Products Repo & Ownership Regression Test Suite')
  console.log('===============================================================\n')

  const testSuffix = Date.now()
  let creatorA = null
  let creatorB = null
  let prodA1 = null
  let prodA2 = null
  let prodB1 = null

  try {
    // -------------------------------------------------------------
    // Setup test creators and products
    // -------------------------------------------------------------
    console.log('--- Step 0: Setup test creators and products ---')
    const userA = await usersRepo.create({
      id: uuidv4(),
      email: `creator_a_${testSuffix}@example.com`,
      passwordHash: 'dummy_hash',
      name: 'Creator A',
      role: 'CREATOR',
      emailVerified: true,
    })
    creatorA = userA

    const userB = await usersRepo.create({
      id: uuidv4(),
      email: `creator_b_${testSuffix}@example.com`,
      passwordHash: 'dummy_hash',
      name: 'Creator B',
      role: 'CREATOR',
      emailVerified: true,
    })
    creatorB = userB

    // Grant active Pro subscription to Creator A so store_sections entitlement is active
    await creatorSubscriptionsRepo.upsert(creatorA.id, {
      plan: 'PRO',
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      billingCycle: 'MONTHLY',
      price: 1499,
      currency: 'INR',
      provider: 'DODO',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    // Initialize stores
    await storeService.getOrCreate(creatorA.id, 'Creator A Store')
    await storeService.getOrCreate(creatorB.id, 'Creator B Store')

    // Create products for Creator A
    prodA1 = await productsRepo.create({
      creatorId: creatorA.id,
      title: 'Product A1',
      slug: `prod-a1-${testSuffix}`,
      status: 'PUBLISHED',
      price: 499,
    })
    prodA2 = await productsRepo.create({
      creatorId: creatorA.id,
      title: 'Product A2',
      slug: `prod-a2-${testSuffix}`,
      status: 'PUBLISHED',
      price: 999,
    })

    // Create product for Creator B
    prodB1 = await productsRepo.create({
      creatorId: creatorB.id,
      title: 'Product B1',
      slug: `prod-b1-${testSuffix}`,
      status: 'PUBLISHED',
      price: 1499,
    })

    assert(prodA1 && prodA1.id, 'Product A1 created')
    assert(prodA2 && prodA2.id, 'Product A2 created')
    assert(prodB1 && prodB1.id, 'Product B1 created')

    // -------------------------------------------------------------
    // Test 7: Confirming listByCreator is defined and callable
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Confirming listByCreator is defined and exported ---')
    assert(typeof productsRepo.listByCreator === 'function', 'productsRepo.listByCreator is a function')

    const prodsFound = await productsRepo.listByCreator(creatorA.id)
    assert(Array.isArray(prodsFound), 'listByCreator returns an array')
    const idsFound = prodsFound.map((p) => p.id)
    assert(idsFound.includes(prodA1.id), 'listByCreator includes prodA1 for Creator A')
    assert(idsFound.includes(prodA2.id), 'listByCreator includes prodA2 for Creator A')
    assert(!idsFound.includes(prodB1.id), 'listByCreator does NOT include Creator B products')

    // -------------------------------------------------------------
    // Test 1: Updating a store with valid creator-owned products
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Updating a store with valid creator-owned products ---')
    const validSections = [
      {
        id: 'sec_coll_1',
        type: 'collection',
        props: {
          title: 'Featured Products',
          items: [
            { type: 'product', productId: prodA1.id },
            { type: 'product', productId: prodA2.id },
          ],
        },
      },
    ]

    const updatedStore1 = await storeService.update(creatorA.id, { sections: validSections })
    assert(updatedStore1, 'Store updated successfully with valid sections')
    const savedItems1 = updatedStore1.sections[0]?.props?.items || []
    assert(savedItems1.length === 2, 'Collection contains both valid products')
    assert(savedItems1[0].productId === prodA1.id, 'First item has prodA1.id')
    assert(savedItems1[1].productId === prodA2.id, 'Second item has prodA2.id')

    // -------------------------------------------------------------
    // Test 2: Updating a store with duplicate product IDs
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Updating a store with duplicate product IDs ---')
    const duplicateSections = [
      {
        id: 'sec_coll_2',
        type: 'collection',
        props: {
          title: 'Deduplicated Products',
          items: [
            { type: 'product', productId: prodA1.id },
            { type: 'product', productId: prodA1.id },
            { type: 'product', productId: prodA2.id },
            { type: 'product', productId: prodA1.id },
          ],
        },
      },
    ]

    const updatedStore2 = await storeService.update(creatorA.id, { sections: duplicateSections })
    const savedItems2 = updatedStore2.sections[0]?.props?.items || []
    assert(savedItems2.length === 2, 'Duplicate product IDs were deduplicated to 2 unique items')
    assert(savedItems2[0].productId === prodA1.id, 'Contains prodA1 once')
    assert(savedItems2[1].productId === prodA2.id, 'Contains prodA2 once')

    // -------------------------------------------------------------
    // Test 3: Rejecting products owned by another creator
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Rejecting products owned by another creator ---')
    const crossCreatorSections = [
      {
        id: 'sec_coll_3',
        type: 'collection',
        props: {
          title: 'Cross Creator Attempt',
          items: [
            { type: 'product', productId: prodA1.id },
            { type: 'product', productId: prodB1.id }, // Owned by Creator B!
            { type: 'product', productId: uuidv4() },  // Non-existent ID!
          ],
        },
      },
      {
        id: 'sec_single_prod',
        type: 'product',
        props: {
          productId: prodB1.id, // Direct reference to Creator B product
        },
      },
    ]

    const updatedStore3 = await storeService.update(creatorA.id, { sections: crossCreatorSections })
    const savedItems3 = updatedStore3.sections[0]?.props?.items || []
    assert(savedItems3.length === 1, 'Only Creator A product was kept; Creator B & invalid products filtered out')
    assert(savedItems3[0].productId === prodA1.id, 'Kept product is prodA1')
    assert(!savedItems3.some((it) => it.productId === prodB1.id), 'Creator B product rejected from collection')
    assert(updatedStore3.sections[1].props.productId === null, 'Foreign productId on single product section cleared to null')

    // -------------------------------------------------------------
    // Test 4: Updating sections with no product IDs
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Updating sections with no product IDs ---')
    const nonProductSections = [
      {
        id: 'sec_hero_1',
        type: 'hero',
        props: {
          heading: 'Welcome to Creator A Store',
          subheading: 'Digital downloads and coaching',
        },
      },
      {
        id: 'sec_empty_coll',
        type: 'collection',
        props: {
          title: 'Empty Collection',
          items: [],
        },
      },
    ]

    const updatedStore4 = await storeService.update(creatorA.id, { sections: nonProductSections })
    assert(updatedStore4.sections.length === 2, 'Both non-product sections saved')
    assert(updatedStore4.sections[0].props.heading === 'Welcome to Creator A Store', 'Hero section heading intact')
    assert(Array.isArray(updatedStore4.sections[1].props.items) && updatedStore4.sections[1].props.items.length === 0, 'Empty items array preserved')

    // Also verify non-section patch leaves existing sections unchanged
    const storeNamePatch = await storeService.update(creatorA.id, { storeName: 'Updated Name Only' })
    assert(storeNamePatch.storeName === 'Updated Name Only', 'Store name updated')
    assert(storeNamePatch.sections.length === 2, 'Sections remained untouched when not in patch')

    // -------------------------------------------------------------
    // Test 5: Handling a missing creator
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Handling a missing creator ---')
    const listEmpty1 = await productsRepo.listByCreator(null)
    assert(Array.isArray(listEmpty1) && listEmpty1.length === 0, 'productsRepo.listByCreator(null) returns empty array')

    const listEmpty2 = await productsRepo.listByCreator(undefined)
    assert(Array.isArray(listEmpty2) && listEmpty2.length === 0, 'productsRepo.listByCreator(undefined) returns empty array')

    let missingCreatorThrew = false
    try {
      await storeService.update(null, { storeName: 'Orphan' })
    } catch (e) {
      missingCreatorThrew = true
      assert(e.status === 400 || e.status === 401, `storeService.update(null) threw status ${e.status}`)
    }
    assert(missingCreatorThrew, 'storeService.update throws on missing creatorId')

    // -------------------------------------------------------------
    // Test 6: Handling a Prisma/database failure without silently treating it as an empty product list
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Handling a Prisma/database failure without silently wiping products ---')
    // Reset Creator A store to have a collection with prodA1
    await storeService.update(creatorA.id, {
      sections: [
        {
          id: 'sec_safe_coll',
          type: 'collection',
          props: {
            title: 'Critical Collection',
            items: [{ type: 'product', productId: prodA1.id }],
          },
        },
      ],
    })

    // Verify it is currently saved
    const beforeFail = await storesRepo.getByCreator(creatorA.id)
    assert(beforeFail.sections[0].props.items.length === 1, 'Initial section has 1 product item')

    // Simulate database error in productsRepo.listByCreator
    const originalListByCreator = productsRepo.listByCreator
    productsRepo.listByCreator = async () => {
      const dbError = new Error('PrismaClientKnownRequestError: Connection to PostgreSQL timed out')
      dbError.code = 'P1001'
      throw dbError
    }

    let updateFailedCleanly = false
    try {
      await storeService.update(creatorA.id, {
        sections: [
          {
            id: 'sec_safe_coll',
            type: 'collection',
            props: {
              title: 'Critical Collection',
              items: [{ type: 'product', productId: prodA1.id }],
            },
          },
        ],
      })
    } catch (e) {
      updateFailedCleanly = true
      assert(e.message.includes('PostgreSQL timed out'), 'Database failure re-thrown cleanly')
    } finally {
      // Restore method
      productsRepo.listByCreator = originalListByCreator
    }

    assert(updateFailedCleanly, 'storeService.update aborted cleanly on database failure')

    // Crucial check: verify sections in DB were NOT wiped out or overwritten with empty collection!
    const afterFail = await storesRepo.getByCreator(creatorA.id)
    assert(afterFail.sections[0].props.items.length === 1, 'Store sections in DB were NOT wiped or corrupted by DB failure')
    assert(afterFail.sections[0].props.items[0].productId === prodA1.id, 'Original product was preserved')

    // -------------------------------------------------------------
    // Test 7B: Confirming PATCH /api/store HTTP route succeeds
    // -------------------------------------------------------------
    console.log('\n--- Test 7B: Confirming HTTP PATCH /api/store succeeds without 500 ---')
    try {
      const { signToken } = await import('../lib/auth.js')
      const token = signToken({ userId: creatorA.id, role: 'CREATOR' })
      const res = await fetch('http://localhost:3000/api/store', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sections: [
            {
              id: 'sec_http_1',
              type: 'collection',
              props: {
                title: 'HTTP Tested Collection',
                items: [{ type: 'product', productId: prodA1.id }],
              },
            },
          ],
        }),
      })

      assert(res.status === 200, `PATCH /api/store returned HTTP ${res.status} (expected 200, not 500)`)
      const resData = await res.json()
      assert(resData.store && Array.isArray(resData.store.sections), 'PATCH /api/store returned updated store with sections')
      assert(resData.store.sections[0].props.items[0].productId === prodA1.id, 'HTTP PATCH correctly persisted product in collection')
    } catch (httpErr) {
      const isConnRefused = httpErr.message.includes('ECONNREFUSED') ||
        httpErr.cause?.code === 'ECONNREFUSED' ||
        (Array.isArray(httpErr.cause?.errors) && httpErr.cause.errors.some(e => e.code === 'ECONNREFUSED'))
      if (isConnRefused) {
        console.log('  ⚠️ [SKIP] Dev server not listening on localhost:3000; service update verified directly')
      } else {
        throw httpErr
      }
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n===============================================================')
    console.log(`🎉 All tests passed! Passed: ${passed}, Failed: ${failed}`)
    console.log('===============================================================\n')
  } finally {
    // Cleanup test records
    try {
      if (prodA1?.id) await prisma.product.deleteMany({ where: { id: prodA1.id } })
      if (prodA2?.id) await prisma.product.deleteMany({ where: { id: prodA2.id } })
      if (prodB1?.id) await prisma.product.deleteMany({ where: { id: prodB1.id } })
      if (creatorA?.id) {
        await prisma.storeSection.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.store.deleteMany({ where: { creatorId: creatorA.id } })
        await prisma.user.deleteMany({ where: { id: creatorA.id } })
      }
      if (creatorB?.id) {
        await prisma.storeSection.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.creatorSubscription.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.store.deleteMany({ where: { creatorId: creatorB.id } })
        await prisma.user.deleteMany({ where: { id: creatorB.id } })
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error (ignored):', cleanupErr.message)
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err)
    process.exit(1)
  })
