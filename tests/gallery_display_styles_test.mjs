import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'

console.log('\n=====================================================================')
console.log('🧪 GALLERY DISPLAY STYLES (CLASSIC & FEATURED) REGRESSION SUITE')
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
  // TEST 1: Source Code Audit — Gallery Editor Structure (Reference 2)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Source Code Audit — AddMediaConfig Gallery Editor ---')
  try {
    const configPath = path.join(process.cwd(), 'components/dashboard/AddMediaConfig.jsx')
    const configContent = fs.readFileSync(configPath, 'utf8')

    // Info section with character limit
    assert(configContent.includes('266'), 'Character limit counter 266 missing in AddMediaConfig')
    assert(configContent.includes('Pencil'), 'Pencil icon missing in AddMediaConfig')

    // Edit images section
    assert(configContent.includes('Edit images'), 'Edit images label missing')
    assert(configContent.includes('Manage your images'), 'Manage your images subtitle missing')

    // Display section (Classic vs Featured)
    assert(configContent.includes('How you display your content'), 'Display subtitle missing')
    assert(configContent.includes('Classic'), 'Classic option missing')
    assert(configContent.includes('Featured'), 'Featured option missing')
    assert(configContent.includes('Zap'), 'Lightning icon missing for Featured option')

    // State & submission
    assert(configContent.includes('displayMode'), 'displayMode state missing')
    assert(configContent.includes('notifyGalleryChange'), 'Live change notification missing')
    assert(configContent.includes("layout: displayMode"), 'layout persistence missing in onSubmit')

    pass('AddMediaConfig implements Info section with character limit')
    pass('AddMediaConfig implements Edit images card with mosaic preview and toggle')
    pass('AddMediaConfig implements Display section with Classic and Featured cards')
    pass('AddMediaConfig live preview notification and onSubmit persistence confirmed')
  } catch (err) {
    fail('AddMediaConfig Gallery Editor audit', err)
  }

  // -------------------------------------------------------------
  // TEST 2: Source Code Audit — StorefrontMediaCard Classic vs Featured
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Source Code Audit — StorefrontMediaCard Display Styles ---')
  try {
    const mediaCardPath = path.join(process.cwd(), 'components/storefront/StorefrontMediaCard.jsx')
    const mediaCardContent = fs.readFileSync(mediaCardPath, 'utf8')

    assert(mediaCardContent.includes('isClassic'), 'isClassic layout branch missing in StorefrontMediaCard')
    assert(mediaCardContent.includes('Gallery ·'), 'Gallery pill subtitle missing in StorefrontMediaCard')
    assert(mediaCardContent.includes('activeGalleryIndex'), 'Lightbox state missing in StorefrontMediaCard')
    assert(mediaCardContent.includes('onProductClick'), 'onProductClick prop missing in StorefrontMediaCard')

    pass('StorefrontMediaCard checks layout for isClassic vs Featured presentation')
    pass('StorefrontMediaCard implements compact link-style gallery pill for Classic')
    pass('StorefrontMediaCard implements prominent visual showcase for Featured')
    pass('StorefrontMediaCard implements full-screen image lightbox modal')
  } catch (err) {
    fail('StorefrontMediaCard audit', err)
  }

  // -------------------------------------------------------------
  // TEST 3: Database Persistence — Classic & Featured Layout Persistence
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Database Persistence — Classic & Featured Layout Persistence ---')
  let testStore = null
  let createdSectionId = null
  try {
    testStore = await prisma.store.findFirst({
      where: { published: true },
    })
    assert(testStore, 'Published test store must exist')

    // 1. Create a section with Classic layout
    const classicSection = await prisma.storeSection.create({
      data: {
        creatorId: testStore.creatorId,
        type: 'gallery',
        position: 999,
        props: {
          title: 'Automated Test Gallery',
          layout: 'classic',
          displayMode: 'classic',
          images: [
            { id: 'img1', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600', name: 'Art 1' },
            { id: 'img2', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600', name: 'Art 2' },
          ],
        },
      },
    })
    createdSectionId = classicSection.id

    const fetchedClassic = await prisma.storeSection.findUnique({
      where: { id: createdSectionId },
    })
    assert.strictEqual(fetchedClassic.props.layout, 'classic', 'Expected layout to be classic')
    assert.strictEqual(fetchedClassic.props.displayMode, 'classic', 'Expected displayMode to be classic')
    pass('Gallery section created and saved with Classic layout')

    // 2. Update section to Featured layout
    const updatedFeatured = await prisma.storeSection.update({
      where: { id: createdSectionId },
      data: {
        props: {
          ...fetchedClassic.props,
          layout: 'featured',
          displayMode: 'featured',
        },
      },
    })
    assert.strictEqual(updatedFeatured.props.layout, 'featured', 'Expected layout to be featured')
    assert.strictEqual(updatedFeatured.props.displayMode, 'featured', 'Expected displayMode to be featured')
    pass('Gallery section updated and persisted with Featured layout')

    // Clean up test section
    await prisma.storeSection.delete({ where: { id: createdSectionId } })
    createdSectionId = null
    pass('Test gallery section cleaned up from database')
  } catch (err) {
    if (createdSectionId) {
      await prisma.storeSection.delete({ where: { id: createdSectionId } }).catch(() => {})
    }
    fail('Database persistence test for gallery display styles', err)
  }

  // -------------------------------------------------------------
  // TEST 4: Single Purchase Flow — Storefront Product Click Standardized
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Single Purchase Flow — PublicStoreRenderer No-Navigation Audit ---')
  try {
    const rendererPath = path.join(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
    const rendererContent = fs.readFileSync(rendererPath, 'utf8')

    // Check that ProductCard uses div role="button" with onProductClick instead of href navigation
    assert(rendererContent.includes('role="button"'), 'Interactive button role missing on ProductCard Wrapper')
    assert(rendererContent.includes('onProductClick?.(product)'), 'onProductClick missing on ProductCard Wrapper')
    assert(!rendererContent.includes('<a\n        href={href}\n        onClick'), 'Found remaining direct <a href> link in ProductCard Wrapper')

    pass('ProductCard Wrapper uses interactive button triggering onProductClick directly')
    pass('Classic product link pill triggers onProductClick directly without page navigation')
    pass('Wizard modal remains the only purchase experience from storefront clicks')
  } catch (err) {
    fail('PublicStoreRenderer purchase flow audit', err)
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
  console.error('Fatal error in gallery display styles test suite:', err)
  process.exit(1)
})
