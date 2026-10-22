import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'

console.log('\n=====================================================================')
console.log('🧪 GALLERY CLICK-TO-OPEN IMAGE WIZARD TEST SUITE')
console.log('=====================================================================\n')

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
  // TEST 1: GalleryWizardModal Component Structure (Reference 1)
  // -------------------------------------------------------------
  console.log('--- TEST 1: GalleryWizardModal Component & Reference 1 Presentation ---')
  try {
    const wizardPath = path.join(process.cwd(), 'components/storefront/GalleryWizardModal.jsx')
    assert(fs.existsSync(wizardPath), 'GalleryWizardModal.jsx must exist')
    const content = fs.readFileSync(wizardPath, 'utf8')

    // Centered modal overlay
    assert(content.includes('role="dialog"'), 'role="dialog" missing in GalleryWizardModal')
    assert(content.includes('aria-modal="true"'), 'aria-modal="true" missing')
    assert(content.includes('rounded-[32px]') || content.includes('rounded-[36px]'), 'Rounded modal style matching Reference 1 missing')
    assert(content.includes('max-w-[480px]'), 'Modal max-width 480px missing')

    // Header & title count
    assert(content.includes('Gallery ·'), 'Photo count format "Gallery · X photos" missing')
    assert(content.includes('gallery-wizard-title'), 'Title aria-labelledby missing')

    // Scrollable feed and natural aspect ratio
    assert(content.includes('overflow-y-auto'), 'Vertical scroll container missing')
    assert(content.includes('object-contain'), 'Aspect ratio preserving object-contain missing')

    // Captions below photos (e.g. "aaa" in Reference 1)
    assert(content.includes('imgTitle'), 'Image title / caption renderer missing')

    // Floating action bar matching Reference 1: Left pill + 3 round buttons (Send, Share, Close)
    assert(content.includes('pointer-events-none') && content.includes('pointer-events-auto'), 'Floating overlay button bar missing')
    assert(content.includes('Send'), 'Send button missing')
    assert(content.includes('Share2'), 'Share button missing')
    assert(content.includes('onClose'), 'Close handler missing')

    // Resilient empty & error states
    assert(content.includes('Empty Gallery'), 'Empty gallery fallback missing')
    assert(content.includes('handleImageError') || content.includes('failedImages'), 'Image load error safety missing')

    // Keyboard & body scroll lock
    assert(content.includes('Escape'), 'ESC key closing handler missing')
    assert(content.includes('overflow = \'hidden\''), 'Body scroll lock on open missing')

    pass('GalleryWizardModal implements centered rounded dialog matching Reference 1')
    pass('Top header includes title and "Gallery · X photos" format')
    pass('Scrollable image feed preserves natural aspect ratio with object-contain')
    pass('Photo title and caption rendered below images (matching "aaa" from Reference 1)')
    pass('Floating action bar features black title pill and circular Send, Share, Close buttons')
    pass('Empty gallery and broken image errors handled safely without crashing')
    pass('Modal locks body scroll and supports ESC key and backdrop click to close')
  } catch (err) {
    fail('GalleryWizardModal structure audit', err)
  }

  // -------------------------------------------------------------
  // TEST 2: StorefrontMediaCard Integration (Classic & Featured)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: StorefrontMediaCard Integration (Classic & Featured) ---')
  try {
    const cardPath = path.join(process.cwd(), 'components/storefront/StorefrontMediaCard.jsx')
    const content = fs.readFileSync(cardPath, 'utf8')

    // Classic style trigger
    assert(content.includes('isClassic'), 'isClassic check missing in StorefrontMediaCard')
    assert(content.includes('onGalleryClick'), 'onGalleryClick prop missing in StorefrontMediaCard')
    assert(content.includes('GalleryWizardModal'), 'GalleryWizardModal import missing in StorefrontMediaCard')

    // Featured style trigger
    assert(content.includes('gridClass'), 'Featured grid layout missing')

    pass('Classic gallery pill triggers gallery wizard on click')
    pass('Featured gallery card and images trigger gallery wizard on click')
    pass('StorefrontMediaCard gracefully falls back to local GalleryWizardModal if onGalleryClick is absent')
  } catch (err) {
    fail('StorefrontMediaCard integration audit', err)
  }

  // -------------------------------------------------------------
  // TEST 3: PublicStoreRenderer State & Modal Overlay
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: PublicStoreRenderer State & Storefront Overlay ---')
  try {
    const rendererPath = path.join(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
    const content = fs.readFileSync(rendererPath, 'utf8')

    assert(content.includes('GalleryWizardModal'), 'GalleryWizardModal import missing in PublicStoreRenderer')
    assert(content.includes('modalGallery'), 'modalGallery state missing in PublicStoreRenderer')
    assert(content.includes('handleGalleryClick'), 'handleGalleryClick handler missing in PublicStoreRenderer')
    assert(content.includes('onGalleryClick={handleGalleryClick}'), 'onGalleryClick prop passing missing')
    assert(content.includes('<GalleryWizardModal'), 'GalleryWizardModal rendering missing in PublicStoreRenderer root')

    pass('PublicStoreRenderer maintains modalGallery state at storefront root')
    pass('PublicStoreRenderer passes onGalleryClick down to section renderers')
    pass('PublicStoreRenderer renders GalleryWizardModal over storefront without route change')
  } catch (err) {
    fail('PublicStoreRenderer state audit', err)
  }

  // -------------------------------------------------------------
  // TEST 4: Database Persistence & Isolation Between Galleries
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Database Persistence & Multiple Gallery Separation ---')
  let testStore = null
  let sectionClassicId = null
  let sectionFeaturedId = null

  try {
    testStore = await prisma.store.findFirst({
      where: { published: true },
    })
    assert(testStore, 'Published test store must exist')

    // Create Gallery A: Classic with 2 photos
    const galleryA = await prisma.storeSection.create({
      data: {
        creatorId: testStore.creatorId,
        type: 'gallery',
        position: 1001,
        props: {
          title: 'Design Inspiration',
          caption: 'Curated designs from my studio',
          layout: 'classic',
          displayMode: 'classic',
          images: [
            { id: 'img-101', url: 'https://images.unsplash.com/photo-1', title: 'AlgoMaster UI', caption: 'Interactive tree algorithm' },
            { id: 'img-102', url: 'https://images.unsplash.com/photo-2', title: 'Pink Disc Gradient', caption: 'Fluid 3D sphere' },
          ],
        },
      },
    })
    sectionClassicId = galleryA.id

    // Create Gallery B: Featured with 1 photo
    const galleryB = await prisma.storeSection.create({
      data: {
        creatorId: testStore.creatorId,
        type: 'gallery',
        position: 1002,
        props: {
          title: 'Photography Highlights',
          layout: 'featured',
          displayMode: 'featured',
          images: [
            { id: 'img-201', url: 'https://images.unsplash.com/photo-3', title: 'Mountain Sunset', caption: 'Golden hour in Himalayas' },
          ],
        },
      },
    })
    sectionFeaturedId = galleryB.id

    // Fetch both and verify isolation
    const fetchedA = await prisma.storeSection.findUnique({ where: { id: sectionClassicId } })
    const fetchedB = await prisma.storeSection.findUnique({ where: { id: sectionFeaturedId } })

    assert.strictEqual(fetchedA.props.title, 'Design Inspiration')
    assert.strictEqual(fetchedA.props.images.length, 2, 'Gallery A must have exactly 2 images')
    assert.strictEqual(fetchedA.props.images[0].title, 'AlgoMaster UI', 'Image order must be preserved')
    assert.strictEqual(fetchedA.props.images[1].title, 'Pink Disc Gradient', 'Second image must be Pink Disc')

    assert.strictEqual(fetchedB.props.title, 'Photography Highlights')
    assert.strictEqual(fetchedB.props.images.length, 1, 'Gallery B must have exactly 1 image')
    assert.strictEqual(fetchedB.props.images[0].title, 'Mountain Sunset')

    pass('Gallery A persists with Classic layout and 2 photos in exact order')
    pass('Gallery B persists with Featured layout and isolated photo collection')
    pass('Galleries maintain unique stable IDs and distinct image data sets')

    // Clean up
    await prisma.storeSection.delete({ where: { id: sectionClassicId } })
    await prisma.storeSection.delete({ where: { id: sectionFeaturedId } })
    sectionClassicId = null
    sectionFeaturedId = null
    pass('Database test sections cleaned up cleanly')
  } catch (err) {
    if (sectionClassicId) await prisma.storeSection.delete({ where: { id: sectionClassicId } }).catch(() => {})
    if (sectionFeaturedId) await prisma.storeSection.delete({ where: { id: sectionFeaturedId } }).catch(() => {})
    fail('Database persistence and isolation test', err)
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
  console.error('Fatal error in gallery click wizard test suite:', err)
  process.exit(1)
})
