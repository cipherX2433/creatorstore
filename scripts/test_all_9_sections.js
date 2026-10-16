import { storeService, publicService } from '../lib/services.js'
import { storeSectionsRepo, storesRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function testAll9Sections() {
  console.log('=== CREATORZERO STORE BUILDER 9 SECTIONS AUDIT ===\n')

  const store = await storesRepo.getBySlug('demo')
  if (!store) {
    console.error('FAIL: Demo store not found!')
    process.exit(1)
  }
  const creatorId = store.creatorId
  console.log(`Using Creator ID: ${creatorId}, username: ${store.username}`)

  const SECTION_TYPES = [
    'profile',
    'heading',
    'text',
    'button',
    'product',
    'product_grid',
    'image',
    'social_links',
    'divider',
  ]

  // 1. Build test array with all 9 section types
  const testSections = SECTION_TYPES.map((type, idx) => ({
    id: uuidv4(),
    type,
    hidden: false,
    position: idx,
    props: {
      heading: { text: `Heading Section ${idx + 1}`, align: 'center' },
      text: { text: `Text body for section ${idx + 1}`, align: 'left' },
      button: { label: 'Click Me', url: 'https://example.com' },
      image: { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', alt: 'Test image' },
      product: { productId: 'test-product-1' },
      product_grid: { source: 'all' },
      social_links: { links: { instagram: 'https://instagram.com' } },
      profile: {},
      divider: {},
    }[type] || {}
  }))

  console.log(`--- 1. Testing Batch Save for ${testSections.length} Section Types ---`)
  const saved = await storeSectionsRepo.saveSections(creatorId, testSections)
  console.log(`✓ Saved ${saved.length} sections to store_sections table.`)

  // 2. Test Store Service Integration
  console.log('\n--- 2. Testing storeService.getOrCreate ---')
  const storeFromService = await storeService.getOrCreate(creatorId)
  const loadedSections = storeFromService.sections || []
  console.log(`✓ Loaded ${loadedSections.length} sections from storeService.`)

  const sectionTypesFound = new Set(loadedSections.map(s => String(s.type).toLowerCase()))
  let allFound = true
  SECTION_TYPES.forEach(type => {
    const pass = sectionTypesFound.has(type)
    console.log(`- Section '${type}': ${pass ? 'PASS' : 'FAIL'}`)
    if (!pass) allFound = false
  })

  if (!allFound) {
    console.error('FAIL: Not all section types were loaded from database!')
    process.exit(1)
  }

  // 3. Test Store Update API Payload
  console.log('\n--- 3. Testing storeService.update with Sections Patch ---')
  const updatedSectionList = [...testSections]
  updatedSectionList[1].props.text = 'Updated Heading Content Test'
  const storeAfterUpdate = await storeService.update(creatorId, { sections: updatedSectionList })
  const headingSection = (storeAfterUpdate.sections || []).find(s => s.type === 'heading')
  console.log(`✓ Updated heading text: "${headingSection?.props?.text}"`)
  if (headingSection?.props?.text !== 'Updated Heading Content Test') {
    console.error('FAIL: Section props update failed!')
    process.exit(1)
  }

  // 4. Test Public Storefront Rendering Integration
  console.log('\n--- 4. Testing Public Storefront publicService.getStore ---')
  const publicData = await publicService.getStore(store.username, { allowDraft: true })
  console.log(`✓ Public store username: ${publicData?.username}`)
  console.log(`✓ Public storefront active sections count: ${publicData?.sections?.length}`)
  if (!publicData?.sections || publicData.sections.length !== testSections.length) {
    console.error(`FAIL: Public storefront returned ${publicData?.sections?.length} sections instead of ${testSections.length}!`)
    process.exit(1)
  }

  // 5. Clean Up Test Sections
  console.log('\n--- 5. Cleanup Test Sections ---')
  await storeSectionsRepo.saveSections(creatorId, [])
  const postCleanup = await storeSectionsRepo.getForCreator(creatorId)
  console.log(`✓ Post cleanup sections count: ${postCleanup.length}`)

  console.log('\n=== AUDIT COMPLETE: ALL 9 SECTIONS FULLY VERIFIED & FUNCTIONAL ===')
}

testAll9Sections().catch(err => {
  console.error('Unhandled error in 9 sections test:', err)
  process.exit(1)
})
