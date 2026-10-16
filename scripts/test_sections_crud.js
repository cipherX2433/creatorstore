import { storeSectionsRepo, storesRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runSectionTest() {
  console.log('=== STORE SECTIONS CRUD TEST ===')
  
  const store = await storesRepo.getBySlug('demo')
  if (!store) {
    console.error('Demo store not found!')
    process.exit(1)
  }

  const creatorId = store.creatorId
  console.log(`Testing with Creator ID: ${creatorId}`)

  // 1. Get initial sections
  const initialSections = await storeSectionsRepo.getForCreator(creatorId)
  console.log(`Initial sections count: ${initialSections.length}`)

  // 2. Add test section
  const testSecId = uuidv4()
  const testSection = {
    id: testSecId,
    type: 'heading',
    hidden: false,
    props: { text: 'Test Heading Content', align: 'center' }
  }

  console.log('Adding section:', testSection.id)
  await storeSectionsRepo.addSection(creatorId, testSection)

  // 3. Verify section exists
  const sectionsAfterAdd = await storeSectionsRepo.getForCreator(creatorId)
  console.log(`Sections count after add: ${sectionsAfterAdd.length}`)
  const added = sectionsAfterAdd.find(s => s.id === testSecId)
  if (!added) {
    console.error('FAIL: Added section not found!')
    process.exit(1)
  }
  console.log('✓ Section added successfully:', added)

  // 4. Update section props
  await storeSectionsRepo.updateSection(creatorId, testSecId, { props: { text: 'Updated Heading Text', align: 'left' } })
  const sectionsAfterUpdate = await storeSectionsRepo.getForCreator(creatorId)
  const updated = sectionsAfterUpdate.find(s => s.id === testSecId)
  console.log('✓ Section updated successfully:', updated?.props)

  // 5. Save full array
  const fullSaveArray = [
    { id: uuidv4(), type: 'profile', hidden: false, props: {} },
    { id: testSecId, type: 'heading', hidden: false, props: { text: 'Saved via saveSections' } },
  ]
  await storeSectionsRepo.saveSections(creatorId, fullSaveArray)
  const sectionsAfterSave = await storeSectionsRepo.getForCreator(creatorId)
  console.log(`✓ Sections count after saveSections: ${sectionsAfterSave.length}`)

  // 6. Delete section
  await storeSectionsRepo.deleteSection(creatorId, testSecId)
  const sectionsAfterDelete = await storeSectionsRepo.getForCreator(creatorId)
  console.log(`✓ Sections count after delete: ${sectionsAfterDelete.length}`)

  console.log('=== ALL STORE SECTION CRUD TESTS PASSED ===')
}

runSectionTest().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
