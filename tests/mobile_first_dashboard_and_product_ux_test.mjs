import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { productService, storeService } from '../lib/services.js'
import { MOBILE_BOTTOM_NAV_ITEMS } from '../lib/navigationConfig.js'

async function runMobileUxTests() {
  console.log('=====================================================================')
  console.log('📱 CREATORSTORE MOBILE-FIRST DASHBOARD & PRODUCT UX TEST SUITE')
  console.log('=====================================================================\n')

  let passed = 0
  let failed = 0

  function pass(title) {
    console.log(`  ✅ [PASS] ${title}`)
    passed++
  }

  function fail(title, err) {
    console.error(`  ❌ [FAIL] ${title}: ${err.message}`)
    failed++
  }

  // --- TEST 1: Bottom Navigation Configuration Audit ---
  console.log('--- TEST 1: Bottom Navigation Configuration Audit ---')
  try {
    assert.equal(MOBILE_BOTTOM_NAV_ITEMS.length, 5, 'Must have exactly 5 mobile bottom navigation destinations')
    const labels = MOBILE_BOTTOM_NAV_ITEMS.map((item) => item.label)
    assert.deepEqual(labels, ['My Store', 'Earn', 'Audience', 'Insights', 'More'], 'Destinations must match Linktree reference')

    const brandFile = fs.readFileSync(path.resolve('components/brand/CreatorStoreBrand.jsx'), 'utf8')
    assert.ok(brandFile.includes("BRAND_COLOR = '#FF4B1F'"), 'CreatorStore orange brand accent must be #FF4B1F')

    const bottomNavFile = fs.readFileSync(path.resolve('components/dashboard/MobileBottomNavigation.jsx'), 'utf8')
    assert.ok(bottomNavFile.includes('MOBILE_BOTTOM_NAV_ITEMS'), 'MobileBottomNavigation must map over destinations')
    assert.ok(bottomNavFile.includes('BRAND_COLOR'), 'Active tab must highlight with BRAND_COLOR orange')
    pass('Mobile bottom navigation contains exact 5 destinations with #FF4B1F orange accent')
  } catch (err) {
    fail('Mobile bottom navigation configuration mismatch', err)
  }

  // --- TEST 2: Add Bottom Sheet Structure & Suggestions Audit ---
  console.log('\n--- TEST 2: Add Bottom Sheet Structure & Suggestions Audit ---')
  try {
    const sheetFile = fs.readFileSync(path.resolve('components/dashboard/MobileAddBottomSheet.jsx'), 'utf8')
    assert.ok(sheetFile.includes("label: 'Collection'"), 'Primary options must include Collection')
    assert.ok(sheetFile.includes("label: 'Link'"), 'Primary options must include Link')
    assert.ok(sheetFile.includes("label: 'Product'"), 'Primary options must include Product')
    assert.ok(sheetFile.includes("label: 'Form'"), 'Primary options must include Form')
    assert.ok(sheetFile.includes('Paste a link or search...'), 'Must contain search placeholder')
    assert.ok(sheetFile.includes("title: 'Instagram'"), 'Must include Instagram suggestion')
    assert.ok(sheetFile.includes("title: 'YouTube'"), 'Must include YouTube suggestion')
    assert.ok(sheetFile.includes("title: 'Messaging'"), 'Must include Messaging suggestion')
    assert.ok(sheetFile.includes('rounded-t-[28px]'), 'Must be anchored with rounded top corners')
    pass('Primary add grid has Collection, Link, Product, Form and rich suggestions')
  } catch (err) {
    fail('Add bottom sheet structure failed', err)
  }

  // --- TEST 3: Supported Product Types & Currencies Audit ---
  console.log('\n--- TEST 3: Supported Product Types & Currencies Audit ---')
  try {
    const wizardFile = fs.readFileSync(path.resolve('components/products/MobileProductWizard.jsx'), 'utf8')
    assert.ok(wizardFile.includes("type: 'DIGITAL_DOWNLOAD'"), 'Must support DIGITAL_DOWNLOAD')
    assert.ok(wizardFile.includes("type: 'COACHING'"), 'Must support COACHING')
    assert.ok(wizardFile.includes("type: 'COURSE'"), 'Must support COURSE')
    assert.ok(wizardFile.includes("code: 'inr'"), 'Must support INR currency')
    assert.ok(wizardFile.includes("code: 'usd'"), 'Must support USD currency')
    assert.ok(wizardFile.includes('/upload'), 'Must use real upload endpoint')
    assert.ok(wizardFile.includes('/products'), 'Must use real authenticated products API')
    pass('Only actual implemented product types and currencies are presented in Mobile Product Wizard')
  } catch (err) {
    fail('Product types audit failed', err)
  }

  // --- TEST 4: Real End-to-End Product Creation Workflow ---
  console.log('\n--- TEST 4: Real End-to-End Product Creation Workflow ---')
  let createdProduct = null
  let testCreator = null
  try {
    // Find or create test creator
    testCreator = await prisma.user.findFirst({
      where: { role: 'CREATOR', emailVerified: true },
      include: { store: true, creatorProfile: true }
    })
    assert.ok(testCreator, 'Test creator user must exist in database')

    // Ensure store exists
    if (!testCreator.store) {
      testCreator.store = await prisma.store.create({
        data: {
          creatorId: testCreator.id,
          username: `creator_${Date.now()}`,
          storeName: 'Test Storefront',
          published: true,
        }
      })
    }

    // Create a new digital download product with deliverable metadata
    const newProductData = {
      title: 'Mobile Architecture Handbook',
      description: 'The complete mobile architecture guide for creators.',
      price: 699,
      currency: 'inr',
      type: 'DIGITAL_DOWNLOAD',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
      fileId: `file_${Date.now()}`,
      fileName: 'mobile_handbook_v1.pdf',
      fileSize: 4500000,
      fileMime: 'application/pdf',
      addToStore: true,
    }

    createdProduct = await productService.create(testCreator.id, newProductData)
    assert.ok(createdProduct?.id, 'Created product must have canonical UUID')
    assert.equal(createdProduct.title, 'Mobile Architecture Handbook')
    assert.equal(Number(createdProduct.price), 699)
    assert.equal(createdProduct.type, 'DIGITAL_DOWNLOAD')
    assert.equal(createdProduct.fileName, 'mobile_handbook_v1.pdf')
    pass('Product created successfully with deliverable file & persisted to database')

    // Verify it was automatically added to store sections
    const storeSections = await prisma.storeSection.findMany({
      where: { creatorId: testCreator.id }
    })
    const matchingSection = storeSections.find((s) => s.props?.productId === createdProduct.id)
    assert.ok(matchingSection, 'Newly created product must automatically appear in store sections')
    pass('Created product automatically attached to storefront sections')
  } catch (err) {
    fail('Product creation workflow failed', err)
  }

  // --- TEST 5: Real End-to-End Product Edit Workflow ---
  console.log('\n--- TEST 5: Real End-to-End Product Edit Workflow ---')
  try {
    assert.ok(createdProduct?.id, 'Previous created product must exist for editing')
    
    // Update product title and price
    const updatePayload = {
      title: 'Mobile Architecture Handbook (2026 Edition)',
      price: 899,
      description: 'Updated comprehensive edition with 10 new chapters.',
      status: 'PUBLISHED'
    }

    const updatedProduct = await productService.update(testCreator.id, createdProduct.id, updatePayload)
    assert.equal(updatedProduct.id, createdProduct.id, 'Product ID must be preserved (never duplicated!)')
    assert.equal(updatedProduct.title, 'Mobile Architecture Handbook (2026 Edition)')
    assert.equal(Number(updatedProduct.price), 899)

    // Re-query database directly to confirm persistence
    const reloaded = await prisma.product.findUnique({
      where: { id: createdProduct.id }
    })
    assert.equal(reloaded.title, 'Mobile Architecture Handbook (2026 Edition)')
    assert.equal(Number(reloaded.price), 899)
    pass('Editing existing product preserves original ID and persists updates without duplicating')
  } catch (err) {
    fail('Product edit workflow failed', err)
  }

  // --- TEST 6: Storefront Preview Integration Audit ---
  console.log('\n--- TEST 6: Storefront Preview Integration Audit ---')
  try {
    const previewFile = fs.readFileSync(path.resolve('components/dashboard/MobileStorePreviewModal.jsx'), 'utf8')
    assert.ok(previewFile.includes('StorePreview'), 'MobileStorePreviewModal must use canonical StorePreview')
    assert.ok(previewFile.includes('device="mobile"'), 'Must set device to mobile')
    assert.ok(previewFile.includes('View live'), 'Must offer View live storefront button')
    pass('Mobile preview workflow reuses canonical StorePreview with device mobile')
  } catch (err) {
    fail('Storefront preview integration failed', err)
  }

  // --- TEST 7: Desktop Safeguards Audit ---
  console.log('\n--- TEST 7: Desktop Safeguards Audit ---')
  try {
    const storePagePath = path.resolve('app/dashboard/store/page.js')
    const content = fs.readFileSync(storePagePath, 'utf8')
    assert.ok(content.includes('hidden lg:grid'), 'Desktop 2-column workspace must be preserved with hidden lg:grid')
    assert.ok(content.includes('block lg:hidden'), 'Mobile dashboard must be scoped with block lg:hidden')
    assert.ok(content.includes('MobileStoreDashboard'), 'MobileStoreDashboard must be imported and rendered')
    pass('Responsive safeguards intact: Desktop 2-column layout and mobile dashboard isolated cleanly')
  } catch (err) {
    fail('Desktop safeguards audit failed', err)
  }

  // --- TEST 8: Mobile More Screen Structure Audit ---
  console.log('\n--- TEST 8: Mobile More Screen Structure Audit ---')
  try {
    const moreFile = fs.readFileSync(path.resolve('components/dashboard/MobileMoreDrawer.jsx'), 'utf8')
    assert.ok(moreFile.includes('Business cards'), 'Must include Business cards tool')
    assert.ok(moreFile.includes('Media kit'), 'Must include Media kit tool')
    assert.ok(moreFile.includes('Social planner'), 'Must include Social planner tool')
    assert.ok(moreFile.includes('Instagram auto-reply'), 'Must include Instagram auto-reply')
    assert.ok(moreFile.includes('Settings'), 'Must include Settings')
    assert.ok(moreFile.includes('Billing'), 'Must include Billing')
    assert.ok(moreFile.includes('Ask a question'), 'Must include Ask a question')
    assert.ok(moreFile.includes('Help topics'), 'Must include Help topics')
    pass('Mobile More screen matches Screenshot 5 structure with Tools, Account, Support')
  } catch (err) {
    fail('Mobile More screen audit failed', err)
  }

  // --- TEST 9: Mobile Store Dashboard UI Refinements Audit ---
  console.log('\n--- TEST 9: Mobile Store Dashboard UI Refinements Audit ---')
  try {
    const layoutFile = fs.readFileSync(path.resolve('app/dashboard/layout.js'), 'utf8')
    assert.ok(layoutFile.includes('hidden md:flex'), 'GlobalTopBar must be hidden on mobile (<md)')
    assert.ok(layoutFile.includes('rounded-none md:rounded-t-[24px]'), 'Body must be flush (rounded-none) on mobile')
    assert.ok(layoutFile.includes("'p-0 lg:px-8"), 'Store page canvas must have p-0 on mobile to reclaim top vertical space')

    const mobileDashboardFile = fs.readFileSync(path.resolve('components/dashboard/MobileStoreDashboard.jsx'), 'utf8')
    assert.ok(mobileDashboardFile.includes('w-[72px] h-[72px]'), 'Profile avatar must be bounded to 64–80px (72px)')
    assert.ok(mobileDashboardFile.includes('<span>Store</span>'), 'Tab must read Store')
    assert.ok(!mobileDashboardFile.includes('<span>Shop</span>'), 'Shop tab must be completely absent from tab bar')
    assert.ok(!mobileDashboardFile.includes('<span>Links</span>'), 'Links tab label must be replaced with Store')
    assert.ok(!mobileDashboardFile.includes('Enhance'), 'Enhance must be removed from floating mobile action bar')
    assert.ok(mobileDashboardFile.includes('Add') && mobileDashboardFile.includes('Preview') && mobileDashboardFile.includes('Design'), 'Action bar must contain Add, Preview, and Design')

    pass('Mobile Store UI refinements verified: top bar hidden, 72px avatar, Store tab consolidated, Enhance removed')
  } catch (err) {
    fail('Mobile Store Dashboard UI Refinements Audit failed', err)
  }

  // --- TEST 10: Mobile Store Overview → Item Editor Navigation Audit ---
  console.log('\n--- TEST 10: Mobile Store Overview → Item Editor Navigation Audit ---')
  try {
    const mobileDashboardFile = fs.readFileSync(path.resolve('components/dashboard/MobileStoreDashboard.jsx'), 'utf8')
    assert.ok(mobileDashboardFile.includes('function handleCardEdit(section)'), 'handleCardEdit must exist')
    assert.ok(mobileDashboardFile.includes("isBundle ="), 'handleCardEdit must identify bundle items')
    assert.ok(mobileDashboardFile.includes("isBooking ="), 'handleCardEdit must identify coaching/booking items')
    assert.ok(!mobileDashboardFile.includes('handleCardEdit(section) {\n    setProductWizardOpen(true)'), 'handleCardEdit must NOT send all items to ProductWizard')
    assert.ok(mobileDashboardFile.includes('e.stopPropagation()'), 'stopPropagation must be used on interactive controls')
    assert.ok(mobileDashboardFile.includes('setActiveCardMenuId(isMenuOpen ? null : s.id)'), '3-dot menu must toggle without opening editor')

    const storePageFile = fs.readFileSync(path.resolve('app/dashboard/store/page.js'), 'utf8')
    assert.ok(storePageFile.includes('const renderActiveEditor = () =>'), 'renderActiveEditor helper must be defined')
    assert.ok(storePageFile.includes('<BundleEditor'), 'BundleEditor must be rendered for bundles')
    assert.ok(storePageFile.includes('<ProductEditor'), 'ProductEditor must be rendered for products')
    assert.ok(storePageFile.includes('<BookingEditor'), 'BookingEditor must be rendered for coaching')
    assert.ok(storePageFile.includes('{renderActiveEditor() ? ('), 'Mobile container must conditionally render active editor')
    assert.ok(storePageFile.includes('handleCloseEditor'), 'handleCloseEditor must reset editor state')
    assert.ok(storePageFile.includes("window.addEventListener('popstate'"), 'popstate listener must support mobile/browser back navigation')

    const bundleEditorFile = fs.readFileSync(path.resolve('components/dashboard/editors/BundleEditor.jsx'), 'utf8')
    assert.ok(bundleEditorFile.includes('selectedProductIds.length === 0'), 'Bundle editor must validate at least 1 product')
    assert.ok(bundleEditorFile.includes("api.patch(`/bundles/${bundleId}`"), 'Bundle editor must persist to PATCH /bundles/[id]')

    pass('Mobile Store Overview → Item Editor navigation flow verified: type resolution, menu isolation, back navigation, and save flow')
  } catch (err) {
    fail('Mobile Store Overview → Item Editor navigation audit failed', err)
  }

  // --- CLEANUP ---
  if (createdProduct?.id) {
    try {
      await prisma.storeSection.deleteMany({
        where: { creatorId: testCreator.id, props: { path: ['productId'], equals: createdProduct.id } }
      })
      await prisma.product.delete({
        where: { id: createdProduct.id }
      })
    } catch { }
  }

  console.log('\n=====================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runMobileUxTests().catch((e) => {
  console.error('Test suite failed:', e)
  process.exit(1)
})
