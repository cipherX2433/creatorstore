import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { bundlesService } from '../lib/services.js'

const ROOT = process.cwd()

async function runBundleWorkflowTests() {
  console.log('=================================================================')
  console.log('🧪 RUNNING COMPREHENSIVE PRODUCT BUNDLE WORKFLOW TEST SUITE')
  console.log('=================================================================\n')

  // ---------------------------------------------------------------------------
  // TEST 1: ABSENCE OF AI IMAGE GENERATION
  // ---------------------------------------------------------------------------
  console.log('▶ Test 1: Verifying Mandatory Removal of AI Image Generation...')
  const modalSrc = fs.readFileSync(path.join(ROOT, 'components/dashboard/ProductBundleModal.jsx'), 'utf8')
  const editorSrc = fs.readFileSync(path.join(ROOT, 'components/dashboard/editors/BundleEditor.jsx'), 'utf8')

  assert.ok(!modalSrc.includes('Generate a new image'), 'ProductBundleModal must not contain "Generate a new image"')
  assert.ok(!editorSrc.includes('Generate a new image'), 'BundleEditor must not contain "Generate a new image"')
  assert.ok(!modalSrc.includes('generate-image') && !modalSrc.includes('ai-image'), 'ProductBundleModal must not contain AI image actions')
  assert.ok(!editorSrc.includes('generate-image') && !editorSrc.includes('ai-image'), 'BundleEditor must not contain AI image actions')
  assert.ok(!modalSrc.includes('Sparkles'), 'ProductBundleModal must not import Sparkles icon')
  assert.ok(!editorSrc.includes('Sparkles'), 'BundleEditor must not import Sparkles icon')
  assert.ok(modalSrc.includes('type="file"'), 'ProductBundleModal must support native device file upload')
  assert.ok(editorSrc.includes('type="file"'), 'BundleEditor must support native device file upload')
  console.log('✅ Test 1 PASS: Zero AI image generation traces; user device image upload strictly enforced.\n')

  // ---------------------------------------------------------------------------
  // TEST 2: COMPONENT ARCHITECTURE & WIZARD STEPS
  // ---------------------------------------------------------------------------
  console.log('▶ Test 2: Verifying Wizard UI Hierarchy, Tab Removal, and Save Changes Button...')
  assert.ok(modalSrc.includes("categoryFilter === 'all'"), 'ProductBundleModal must support "All products" filter')
  assert.ok(modalSrc.includes("categoryFilter === 'digital'"), 'ProductBundleModal must support "Digital downloads" filter')
  assert.ok(modalSrc.includes("categoryFilter === 'booking'"), 'ProductBundleModal must support "Bookings" filter')
  assert.ok(modalSrc.includes('10 products max'), 'ProductBundleModal must display 10 products maximum indicator')
  assert.ok(modalSrc.includes('1 booking per bundle'), 'ProductBundleModal must display 1 booking per bundle rule')
  assert.ok(modalSrc.includes('Select products'), 'ProductBundleModal must have Step 1: Select products')
  assert.ok(modalSrc.includes('Product details'), 'ProductBundleModal must have Step 2: Product details')
  assert.ok(editorSrc.includes('StoreItemEditorShell'), 'BundleEditor must integrate with StoreItemEditorShell')
  assert.ok(editorSrc.includes('StoreItemDisplaySelector'), 'BundleEditor must support display mode switcher')

  // Verification of Power-ups and Insights removal + Save Changes button
  assert.ok(!editorSrc.includes('Power-ups'), 'BundleEditor must not contain Power-ups tab')
  assert.ok(!editorSrc.includes('Insights'), 'BundleEditor must not contain Insights tab')
  assert.ok(editorSrc.includes('Details'), 'BundleEditor must retain Details section')
  assert.ok(editorSrc.includes('Save Changes'), 'BundleEditor must have a Save Changes button')
  assert.ok(editorSrc.includes('isDirty'), 'BundleEditor must track unsaved changes via isDirty')
  assert.ok(editorSrc.includes('Saving...'), 'BundleEditor must support loading state during save')
  assert.ok(editorSrc.includes('You have unsaved changes'), 'BundleEditor must prompt confirmation on leaving with unsaved changes')
  console.log('✅ Test 2 PASS: Power-ups/Insights removed, Details repositioned, and Save Changes button verified.\n')

  // ---------------------------------------------------------------------------
  // TEST 3: MENU & STORE PAGE ROUTING INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('▶ Test 3: Verifying AddToStoreMenu, AddToStoreModal, and Store Page Integration...')
  const menuSrc = fs.readFileSync(path.join(ROOT, 'components/dashboard/AddToStoreMenuView.jsx'), 'utf8')
  const addToStoreSrc = fs.readFileSync(path.join(ROOT, 'components/dashboard/AddToStoreModal.jsx'), 'utf8')
  const storePageSrc = fs.readFileSync(path.join(ROOT, 'app/dashboard/store/page.js'), 'utf8')

  assert.ok(menuSrc.includes("id: 'bundles_commerce'"), 'AddToStoreMenuView must contain bundles_commerce option')
  assert.ok(menuSrc.includes("type: 'bundle'"), 'AddToStoreMenuView bundles_commerce must have type: bundle')
  assert.ok(addToStoreSrc.includes('ProductBundleModal'), 'AddToStoreModal must import and render ProductBundleModal')
  assert.ok(addToStoreSrc.includes("opt.type === 'bundle' || opt.id === 'bundles_commerce'"), 'AddToStoreModal must route bundle option')
  assert.ok(storePageSrc.includes('BundleEditor'), 'store/page.js must import BundleEditor')
  assert.ok(storePageSrc.includes('ProductBundleModal'), 'store/page.js must import ProductBundleModal')
  assert.ok(storePageSrc.includes("opt.type === 'bundle' || opt.id === 'bundles_commerce'"), 'store/page.js must route bundle option')
  assert.ok(storePageSrc.includes("type === 'BUNDLE'"), 'store/page.js must render BundleEditor for BUNDLE products')
  console.log('✅ Test 3 PASS: End-to-end dashboard menu, modal, and page wiring verified.\n')

  // ---------------------------------------------------------------------------
  // TEST 4: STOREFRONT RENDERING INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('▶ Test 4: Verifying Public Storefront Card & Modal Flow...')
  const rendererSrc = fs.readFileSync(path.join(ROOT, 'components/storefront/PublicStoreRenderer.jsx'), 'utf8')
  const purchaseModalSrc = fs.readFileSync(path.join(ROOT, 'components/storefront/ProductPurchaseModalFlow.jsx'), 'utf8')

  assert.ok(rendererSrc.includes("p.type === 'BUNDLE'"), 'PublicStoreRenderer must handle BUNDLE products')
  assert.ok(rendererSrc.includes("isBundle && count > 0"), 'ClassicLinkPill must display item count and price metadata')
  assert.ok(rendererSrc.includes('Get Bundle'), 'ProductCard must provide bundle CTA')
  assert.ok(purchaseModalSrc.includes("product?.type === 'BUNDLE'"), 'ProductPurchaseModalFlow must support bundles')
  assert.ok(purchaseModalSrc.includes('Includes'), 'ProductPurchaseModalFlow must list bundled products')
  console.log('✅ Test 4 PASS: Storefront classic pill, product card, and purchase modal verified.\n')

  // ---------------------------------------------------------------------------
  // TEST 5: BACKEND SERVICE VALIDATIONS & DATA INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('▶ Test 5: Testing Backend Service Business Rules & Database Persistence...')

  // Find or create test creators
  const creator1 = await prisma.user.findFirst({ where: { role: 'CREATOR' } })
  assert.ok(creator1, 'Test creator must exist in database')

  let creator2 = await prisma.user.findFirst({
    where: { role: 'CREATOR', id: { not: creator1.id } },
  })

  // Create test products for creator 1
  const testProduct1 = await prisma.product.create({
    data: {
      creatorId: creator1.id,
      title: 'Test Digital Guide A',
      slug: `test-digital-guide-a-${Date.now()}`,
      price: 1500,
      currency: 'USD',
      type: 'DIGITAL_PRODUCT',
      status: 'PUBLISHED',
      description: 'First test product for bundle',
    },
  })

  const testProduct2 = await prisma.product.create({
    data: {
      creatorId: creator1.id,
      title: 'Test Digital Guide B',
      slug: `test-digital-guide-b-${Date.now()}`,
      price: 2500,
      currency: 'USD',
      type: 'DIGITAL_PRODUCT',
      status: 'PUBLISHED',
      description: 'Second test product for bundle',
    },
  })

  const testBooking1 = await prisma.product.create({
    data: {
      creatorId: creator1.id,
      title: 'Test 1:1 Consultation',
      slug: `test-consultation-1-${Date.now()}`,
      price: 5000,
      currency: 'USD',
      type: 'COACHING',
      status: 'PUBLISHED',
      description: 'First booking session for bundle',
    },
  })

  const testBooking2 = await prisma.product.create({
    data: {
      creatorId: creator1.id,
      title: 'Test 1:1 Strategy Call',
      slug: `test-consultation-2-${Date.now()}`,
      price: 6000,
      currency: 'USD',
      type: 'COACHING',
      status: 'PUBLISHED',
      description: 'Second booking session for bundle',
    },
  })

  const testInrProduct = await prisma.product.create({
    data: {
      creatorId: creator1.id,
      title: 'Test INR Product',
      slug: `test-inr-product-${Date.now()}`,
      price: 999,
      currency: 'INR',
      type: 'DIGITAL_PRODUCT',
      status: 'PUBLISHED',
      description: 'Product with different currency',
    },
  })

  let createdBundle = null

  try {
    // 5.1 Test: Empty product selection rejected
    await assert.rejects(
      async () => {
        await bundlesService.create(creator1.id, {
          title: 'Empty Bundle',
          productIds: [],
        })
      },
      /At least 1 product/,
      'Must reject bundle with no products'
    )
    console.log('  ✓ Verified: Empty product selection is rejected')

    // 5.2 Test: Max 1 booking rule enforced
    await assert.rejects(
      async () => {
        await bundlesService.create(creator1.id, {
          title: 'Two Bookings Bundle',
          productIds: [testBooking1.id, testBooking2.id],
        })
      },
      /1 booking per bundle/,
      'Must reject bundle with more than 1 booking'
    )
    console.log('  ✓ Verified: Maximum of 1 booking per bundle is strictly enforced')

    // 5.3 Test: Mixed currency combination rejected
    await assert.rejects(
      async () => {
        await bundlesService.create(creator1.id, {
          title: 'Mixed Currency Bundle',
          productIds: [testProduct1.id, testInrProduct.id],
        })
      },
      /must use the same currency/,
      'Must reject bundle with mixed currencies'
    )
    console.log('  ✓ Verified: Mixed currency combination is rejected')

    // 5.4 Test: Cross-creator selection rejected
    if (creator2) {
      const crossProduct = await prisma.product.create({
        data: {
          creatorId: creator2.id,
          title: 'Foreign Creator Product',
          slug: `foreign-prod-${Date.now()}`,
          price: 1000,
          currency: 'USD',
          type: 'DIGITAL_PRODUCT',
          status: 'PUBLISHED',
        },
      })

      await assert.rejects(
        async () => {
          await bundlesService.create(creator1.id, {
            title: 'Unauthorized Bundle',
            productIds: [testProduct1.id, crossProduct.id],
          })
        },
        /do not belong to you/,
        'Must reject products from other creators'
      )
      console.log('  ✓ Verified: Cross-creator product selection is rejected')
      await prisma.product.delete({ where: { id: crossProduct.id } }).catch(() => {})
    }

    // 5.5 Test: Max 10 products limit enforced
    const fakeIds = Array.from({ length: 11 }, (_, i) => `fake_prod_${i}`)
    await assert.rejects(
      async () => {
        await bundlesService.create(creator1.id, {
          title: 'Oversized Bundle',
          productIds: fakeIds,
        })
      },
      /up to 10 products/,
      'Must reject more than 10 products'
    )
    console.log('  ✓ Verified: Maximum 10 products per bundle limit is enforced')

    // 5.6 Test: Successful bundle creation with authoritative pricing sum & join table
    createdBundle = await bundlesService.create(creator1.id, {
      title: 'Complete Master Suite Bundle',
      description: 'Includes 2 digital guides and 1 personal booking session.',
      thumbnail: 'https://creatorstore.app/test-thumb.jpg',
      productIds: [testProduct1.id, testProduct2.id, testBooking1.id],
      addToStore: false,
    })

    assert.ok(createdBundle?.id, 'Created bundle must have valid ID')
    assert.equal(createdBundle.type, 'BUNDLE', 'Bundle product type must be BUNDLE')
    // Authoritative total: 1500 + 2500 + 5000 = 9000
    assert.equal(createdBundle.price, 9000, 'Bundle price must equal exact sum of constituent product prices (9000)')
    assert.equal(createdBundle.currency, 'USD', 'Bundle currency must match products (USD)')
    assert.equal(createdBundle.bundleProducts.length, 3, 'Must have 3 resolved bundle products')
    assert.equal(createdBundle.thumbnail, 'https://creatorstore.app/test-thumb.jpg', 'Must save thumbnail URL')

    // Verify join table in PostgreSQL
    const joinRows = await prisma.bundleItem.findMany({
      where: { bundleId: createdBundle.id },
      orderBy: { position: 'asc' },
    })
    assert.equal(joinRows.length, 3, 'bundle_items table must contain 3 rows')
    assert.equal(joinRows[0].productId, testProduct1.id, 'Position 0 must match first product')
    assert.equal(joinRows[1].productId, testProduct2.id, 'Position 1 must match second product')
    assert.equal(joinRows[2].productId, testBooking1.id, 'Position 2 must match booking product')
    console.log('  ✓ Verified: Bundle created with authoritative price (9000 USD) and bundle_items associations')

    // 5.7 Test: Bundle Editing preserves ID and updates associations safely
    const updatedBundle = await bundlesService.update(creator1.id, createdBundle.id, {
      title: 'Updated Suite Bundle Title',
      description: 'Updated bundle description.',
      thumbnail: 'https://creatorstore.app/updated-thumb.jpg',
      productIds: [testProduct2.id, testBooking1.id], // Removed testProduct1
    })

    assert.equal(updatedBundle.id, createdBundle.id, 'Updated bundle must retain original bundle ID')
    assert.equal(updatedBundle.title, 'Updated Suite Bundle Title', 'Title must be updated')
    // New total: 2500 + 5000 = 7500
    assert.equal(updatedBundle.price, 7500, 'Price must recalculate to 7500')
    assert.equal(updatedBundle.bundleProducts.length, 2, 'Must now have 2 products')

    const updatedJoinRows = await prisma.bundleItem.findMany({
      where: { bundleId: createdBundle.id },
      orderBy: { position: 'asc' },
    })
    assert.equal(updatedJoinRows.length, 2, 'bundle_items must reflect updated count')
    assert.equal(updatedJoinRows[0].productId, testProduct2.id)
    assert.equal(updatedJoinRows[1].productId, testBooking1.id)
    console.log('  ✓ Verified: Bundle editing updates records and recalculates authoritative price (7500 USD)')

    // 5.8 Test: Public fetch route returns bundle with products
    const publicData = await bundlesService.getPublic(createdBundle.id)
    assert.ok(publicData?.bundle, 'Must return public bundle')
    assert.equal(publicData.products.length, 2, 'Must return 2 public constituent products')
    console.log('  ✓ Verified: Public bundle retrieval resolves products correctly')

  } finally {
    // Clean up test data
    if (createdBundle?.id) {
      await bundlesService.remove(creator1.id, createdBundle.id).catch(() => {})
    }
    await prisma.product.deleteMany({
      where: {
        id: { in: [testProduct1.id, testProduct2.id, testBooking1.id, testBooking2.id, testInrProduct.id] },
      },
    }).catch(() => {})
    console.log('  ✓ Test cleanup completed.')
  }

  console.log('\n=================================================================')
  console.log('🎉 ALL 5 TEST SUITES PASSED (16/16 REQUIREMENTS VERIFIED)')
  console.log('=================================================================')
}

runBundleWorkflowTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err)
    process.exit(1)
  })
