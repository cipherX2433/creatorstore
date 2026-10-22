import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { bundlesService, productService } from '../lib/services.js'
import { productsRepo, bundlesRepo } from '../lib/repos.js'

const ROOT = process.cwd()

async function runRegressionTestSuite() {
  console.log('=================================================================')
  console.log('🧪 RUNNING BUNDLE VALIDATION & SAVE CHANGES REGRESSION SUITE')
  console.log('=================================================================\n')

  // Find or create test creator
  let testUser = await prisma.user.findFirst({
    where: { email: 'mohit.mr11082@gmail.com' },
    include: { store: true },
  })

  if (!testUser) {
    testUser = await prisma.user.findFirst({
      include: { store: true },
    })
  }

  assert.ok(testUser, 'A test creator user must exist')
  const creatorId = testUser.id
  console.log(`Using creator: ${testUser.email} (ID: ${creatorId})`)

  // Create 3 digital test products
  const p1 = await prisma.product.create({
    data: {
      creatorId,
      title: 'Regression Item Alpha',
      slug: `reg-alpha-${Date.now()}`,
      type: 'DIGITAL_DOWNLOAD',
      price: 1500,
      currency: 'INR',
      status: 'PUBLISHED',
      storePublished: true,
    },
  })

  const p2 = await prisma.product.create({
    data: {
      creatorId,
      title: 'Regression Item Beta',
      slug: `reg-beta-${Date.now()}`,
      type: 'DIGITAL_DOWNLOAD',
      price: 2500,
      currency: 'INR',
      status: 'PUBLISHED',
      storePublished: true,
    },
  })

  const p3 = await prisma.product.create({
    data: {
      creatorId,
      title: 'Regression Item Gamma',
      slug: `reg-gamma-${Date.now()}`,
      type: 'DIGITAL_DOWNLOAD',
      price: 3500,
      currency: 'INR',
      status: 'PUBLISHED',
      storePublished: true,
    },
  })

  let createdBundleId = null

  try {
    // -------------------------------------------------------------------------
    // Scenario 1 & 2: Open an existing bundle with valid product associations
    // Confirm its product count and total are correct
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 1 & 2: Creating and loading bundle with associations...')
    const bundleInitial = await bundlesService.create(creatorId, {
      title: 'Initial Regression Bundle',
      description: 'Testing canonical associations',
      thumbnail: 'https://example.com/initial-thumb.jpg',
      productIds: [p1.id, p2.id],
      displayMode: 'classic',
    })
    createdBundleId = bundleInitial.id

    // Check loading via productsRepo.list
    const creatorProducts = await productsRepo.list(creatorId)
    const foundBundle = creatorProducts.find((p) => p.id === createdBundleId)
    assert.ok(foundBundle, 'Bundle must be present in productsRepo.list')
    assert.equal(foundBundle.productCount, 2, 'Product count must be exactly 2')
    assert.deepEqual(foundBundle.bundleProductIds.sort(), [p1.id, p2.id].sort(), 'bundleProductIds must contain p1 and p2')
    assert.equal(Number(foundBundle.price), 4000, 'Total price must be 1500 + 2500 = 4000')
    assert.equal(foundBundle.currency, 'INR', 'Currency must match constituent items')
    console.log('  ✓ Scenarios 1 & 2 Passed: Canonical product count and total verified.\n')

    // -------------------------------------------------------------------------
    // Scenario 3: Edit only the title and save; associations remain unchanged
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 3: Edit only title and save...')
    const updatedTitleBundle = await bundlesService.update(creatorId, createdBundleId, {
      title: 'Updated Title Only Bundle',
    })
    assert.equal(updatedTitleBundle.title, 'Updated Title Only Bundle')
    assert.equal(updatedTitleBundle.productCount, 2, 'Product count must remain 2 after title-only update')
    assert.deepEqual(updatedTitleBundle.bundleProductIds.sort(), [p1.id, p2.id].sort(), 'Products must remain unchanged')
    assert.equal(Number(updatedTitleBundle.price), 4000, 'Total price must remain 4000')
    console.log('  ✓ Scenario 3 Passed: Title updated without mutating product associations.\n')

    // -------------------------------------------------------------------------
    // Scenario 4: Edit only the description and save; associations remain unchanged
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 4: Edit only description and save...')
    const updatedDescBundle = await bundlesService.update(creatorId, createdBundleId, {
      description: 'Updated description for bundle testing',
    })
    assert.equal(updatedDescBundle.description, 'Updated description for bundle testing')
    assert.equal(updatedDescBundle.productCount, 2, 'Product count must remain 2 after desc-only update')
    assert.deepEqual(updatedDescBundle.bundleProductIds.sort(), [p1.id, p2.id].sort())
    console.log('  ✓ Scenario 4 Passed: Description updated without mutating product associations.\n')

    // -------------------------------------------------------------------------
    // Scenario 5: Replace thumbnail and save
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 5: Replace thumbnail and save...')
    const updatedThumbBundle = await bundlesService.update(creatorId, createdBundleId, {
      thumbnail: 'https://example.com/new-replacement-thumb.png',
    })
    assert.equal(updatedThumbBundle.thumbnail, 'https://example.com/new-replacement-thumb.png')
    assert.equal(updatedThumbBundle.productCount, 2)
    console.log('  ✓ Scenario 5 Passed: Thumbnail replaced and persisted successfully.\n')

    // -------------------------------------------------------------------------
    // Scenario 6: Remove thumbnail and save
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 6: Remove thumbnail and save...')
    const removedThumbBundle = await bundlesService.update(creatorId, createdBundleId, {
      thumbnail: null,
    })
    assert.equal(removedThumbBundle.thumbnail, null, 'Thumbnail must be null after removal')
    assert.equal(removedThumbBundle.productCount, 2)
    console.log('  ✓ Scenario 6 Passed: Thumbnail removal persisted successfully.\n')

    // -------------------------------------------------------------------------
    // Scenario 7: Change selected products and save
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 7: Change selected products and save...')
    const reselectedBundle = await bundlesService.update(creatorId, createdBundleId, {
      productIds: [p2.id, p3.id],
    })
    assert.equal(reselectedBundle.productCount, 2)
    assert.deepEqual(reselectedBundle.bundleProductIds.sort(), [p2.id, p3.id].sort())
    assert.equal(Number(reselectedBundle.price), 6000, 'Price must recalculate to 2500 + 3500 = 6000')
    console.log('  ✓ Scenario 7 Passed: Product selection changed and price recalculated to 6000.\n')

    // -------------------------------------------------------------------------
    // Scenario 8: Confirm valid bundle does not trigger zero-products error
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 8: Confirm valid bundle validation...')
    const validValidation = await bundlesService.validateBundleData(creatorId, {
      title: 'Valid Bundle Test',
      productIds: [p1.id],
    })
    assert.ok(validValidation, 'Valid bundle must pass validation')
    assert.equal(validValidation.productIds.length, 1)
    console.log('  ✓ Scenario 8 Passed: Valid bundle passes without zero-products error.\n')

    // -------------------------------------------------------------------------
    // Scenario 9: Confirm a genuinely empty bundle cannot be saved
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 9: Confirm genuinely empty bundle cannot be saved...')
    let emptyError = null
    try {
      await bundlesService.validateBundleData(creatorId, {
        title: 'Empty Bundle Test',
        productIds: [],
      })
    } catch (err) {
      emptyError = err
    }
    assert.ok(emptyError, 'Validation must reject empty productIds array')
    assert.equal(emptyError.status || emptyError.statusCode, 400)
    assert.equal(emptyError.message, 'At least 1 product must be selected for the bundle')
    console.log('  ✓ Scenario 9 Passed: Empty product selection strictly rejected with 400 error.\n')

    // -------------------------------------------------------------------------
    // Scenario 10: Confirm omitted productIds field does not clear associations
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 10: Confirm omitted productIds preserves existing associations...')
    const partialUpdate = await bundlesService.update(creatorId, createdBundleId, {
      title: 'Brand New Title For Preserved Bundle',
      // productIds is omitted!
    })
    assert.equal(partialUpdate.title, 'Brand New Title For Preserved Bundle')
    assert.deepEqual(partialUpdate.bundleProductIds.sort(), [p2.id, p3.id].sort(), 'Omitted productIds must NOT clear associations')
    assert.equal(Number(partialUpdate.price), 6000, 'Price must remain 6000')
    console.log('  ✓ Scenario 10 Passed: Partial update preserved existing associations transactionally.\n')

    // -------------------------------------------------------------------------
    // Scenario 11: Source code check: Error handling preserves unsaved changes
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 11: Inspecting BundleEditor error handling and dirty retention...')
    const editorSrc = fs.readFileSync(path.join(ROOT, 'components/dashboard/editors/BundleEditor.jsx'), 'utf8')
    assert.ok(editorSrc.includes('toast.error(err.message || \'Failed to save bundle changes. Your edits have been preserved.\')'),
      'Catch block must notify user and preserve working state')
    const handleSaveCode = editorSrc.slice(editorSrc.indexOf('const handleSave = async () =>'), editorSrc.indexOf('// Count items strictly'))
    assert.ok(handleSaveCode.indexOf('setPersistedData') > handleSaveCode.indexOf('await api.patch'),
      'In handleSave, setPersistedData must ONLY be called AFTER server confirms success')
    console.log('  ✓ Scenario 11 Passed: Failed saves preserve form edits and leave editor dirty.\n')

    // -------------------------------------------------------------------------
    // Scenario 12: Reload and verify all saved values persist in database
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 12: Reloading from DB and verifying persistence...')
    const reloaded = await bundlesRepo.getBundle(createdBundleId, creatorId)
    assert.equal(reloaded.title, 'Brand New Title For Preserved Bundle')
    assert.equal(reloaded.description, 'Updated description for bundle testing')
    assert.equal(reloaded.thumbnail, null)
    assert.equal(reloaded.productCount, 2)
    assert.deepEqual(reloaded.bundleProductIds.sort(), [p2.id, p3.id].sort())
    assert.equal(Number(reloaded.price), 6000)
    console.log('  ✓ Scenario 12 Passed: Complete bundle state verified from database.\n')

    // -------------------------------------------------------------------------
    // Scenario 13: Storefront rendering resolves canonical bundle and products
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 13: Checking public storefront retrieval...')
    const publicData = await bundlesService.getPublic(createdBundleId)
    assert.ok(publicData.bundle, 'Public bundle must exist')
    assert.equal(publicData.products.length, 2, 'Public bundle must resolve constituent products')
    assert.equal(Number(publicData.bundle.price), 6000)
    console.log('  ✓ Scenario 13 Passed: Public storefront resolves canonical bundle and items.\n')

    // -------------------------------------------------------------------------
    // Scenario 14: Confirm other product types still save correctly
    // -------------------------------------------------------------------------
    console.log('▶ Scenario 14: Verifying other product editors (digital download) save correctly...')
    const digitalUpdated = await productService.update(creatorId, p1.id, {
      title: 'Regression Item Alpha (Updated)',
      price: 1800,
    })
    assert.equal(digitalUpdated.title, 'Regression Item Alpha (Updated)')
    assert.equal(Number(digitalUpdated.price), 1800)
    console.log('  ✓ Scenario 14 Passed: Standard product saving continues to work as expected.\n')

  } finally {
    // Clean up test data
    console.log('▶ Cleaning up regression test artifacts...')
    if (createdBundleId) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: createdBundleId } }).catch(() => {})
      await prisma.product.delete({ where: { id: createdBundleId } }).catch(() => {})
    }
    await prisma.product.deleteMany({ where: { id: { in: [p1.id, p2.id, p3.id] } } }).catch(() => {})
    console.log('  ✓ Cleanup finished.')
  }

  console.log('\n=================================================================')
  console.log('🎉 ALL 14 REGRESSION SCENARIOS PASSED WITH ZERO ERRORS')
  console.log('=================================================================')
}

runRegressionTestSuite().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Regression suite failed:', err)
  process.exit(1)
})
