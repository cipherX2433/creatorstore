import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('=====================================================================')
console.log('🧪 CREATORSTORE BOOKING TILE EDIT ROUTING TEST SUITE')
console.log('=====================================================================\n')

let passed = 0
let failed = 0
function pass(name) { passed++; console.log(`  ✅ [PASS] ${name}`) }
function fail(name, err) { failed++; console.error(`  ❌ [FAIL] ${name}:`, err.message) }

const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js')
const bookingEditorPath = path.join(process.cwd(), 'components/dashboard/editors/BookingEditor.jsx')
const mediaEditorPath = path.join(process.cwd(), 'components/dashboard/editors/MediaEditor.jsx')

const storePageContent = fs.readFileSync(storePagePath, 'utf8')
const bookingEditorContent = fs.readFileSync(bookingEditorPath, 'utf8')
const mediaEditorContent = fs.readFileSync(mediaEditorPath, 'utf8')

// -------------------------------------------------------------------
// TEST 1: Booking Item Detection & Product Resolution
// -------------------------------------------------------------------
console.log('--- TEST 1: Booking Item Type & Product Resolution ---')
try {
  assert(storePageContent.includes('isBookingItem'), 'isBookingItem must be imported and used in store page')
  assert(storePageContent.includes('resolveSectionProduct'), 'resolveSectionProduct must be imported and used in store page')

  const utilsContent = fs.readFileSync(path.join(process.cwd(), 'lib/bookingItemUtils.js'), 'utf8')
  const detectedTypes = ['booking', 'bookings', 'coaching', 'session', 'sessions', 'calendar']
  for (const t of detectedTypes) {
    assert(utilsContent.includes(`'${t}'`), `Detection must include '${t}' identifier`)
  }

  // Import directly and test runtime behavior
  const { isBookingItem, resolveSectionProduct } = await import('../lib/bookingItemUtils.js')

  const sampleProducts = [
    { id: 'prod-coaching-1', title: 'Book a session', type: 'COACHING', price: 0 },
    { id: 'prod-digital-1', title: 'My E-Book', type: 'DIGITAL_DOWNLOAD', price: 999 },
  ]

  // Test case A: Section with type 'booking'
  assert.strictEqual(isBookingItem({ type: 'booking' }, sampleProducts), true, 'type booking must be detected as booking')

  // Test case B: Section with type 'product' and productId pointing to COACHING
  assert.strictEqual(
    isBookingItem({ type: 'product', props: { productId: 'prod-coaching-1' } }, sampleProducts),
    true,
    'product section pointing to coaching product must be detected as booking'
  )

  // Test case C: Section with type 'product' and null productId, matching title
  assert.strictEqual(
    isBookingItem({ type: 'product', props: { productId: null, title: 'Book a session' } }, sampleProducts),
    true,
    'product section with null productId but coaching title must be detected as booking'
  )

  // Test case D: Section with type 'product' pointing to regular digital download
  assert.strictEqual(
    isBookingItem({ type: 'product', props: { productId: 'prod-digital-1' } }, sampleProducts),
    false,
    'regular digital download must NOT be detected as booking'
  )

  // Test case E: Section with type 'video'
  assert.strictEqual(
    isBookingItem({ type: 'video', props: { url: 'https://youtube.com' } }, sampleProducts),
    false,
    'video section must NOT be detected as booking'
  )

  // Test product resolution
  const resolvedCoaching = resolveSectionProduct({ type: 'product', props: { productId: 'prod-coaching-1' } }, sampleProducts)
  assert.strictEqual(resolvedCoaching?.id, 'prod-coaching-1', 'Must resolve linked coaching product')

  const fallbackCoaching = resolveSectionProduct({ type: 'booking' }, sampleProducts)
  assert.strictEqual(fallbackCoaching?.id, 'prod-coaching-1', 'Must fallback to coaching product for booking type')

  pass('Booking item detection and product resolution correctly classify booking variants')
} catch (err) {
  fail('Booking Item Detection & Product Resolution', err)
}

// -------------------------------------------------------------------
// TEST 2: Dashboard StoreContentCard handleEdit Logic
// -------------------------------------------------------------------
console.log('\n--- TEST 2: StoreContentCard handleEdit Logic ---')
try {
  // StoreContentCard must check isBooking before generic media/video fallbacks
  assert(storePageContent.includes('const isBooking = isBookingItem(s, products)'), 'StoreContentCard must compute isBooking')
  assert(storePageContent.includes('} else if (isBooking || prod?.type === \'COACHING\''), 'handleEdit must route booking directly to section edit')
  assert(storePageContent.includes('setEditingSectionId?.(s.id)'), 'handleEdit must set editingSectionId')
  assert(storePageContent.includes('setEditingProductId?.(null)'), 'handleEdit must clear editingProductId for section editing')

  pass('StoreContentCard handleEdit routes booking items directly to section editor')
} catch (err) {
  fail('StoreContentCard handleEdit Logic', err)
}

// -------------------------------------------------------------------
// TEST 3: Editor Conditional Routing — BookingEditor vs MediaEditor
// -------------------------------------------------------------------
console.log('\n--- TEST 3: Editor Conditional Routing & No Silent Video Fallback ---')
try {
  // Booking editor must be selected when isBookingItem is true
  assert(
    storePageContent.includes('isBookingItem(editingSection, products) ? (') &&
    storePageContent.includes('<BookingEditor'),
    'Router must render BookingEditor when editingSection is a booking item'
  )

  // MediaEditor must be strictly constrained to video/audio/pdf/media
  assert(
    storePageContent.includes("['video', 'youtube', 'audio', 'pdf', 'media'].includes(editingSection.type) ? (") &&
    storePageContent.includes('<MediaEditor'),
    'MediaEditor must only render for explicit video/media types'
  )

  // Generic fallback must NEVER render MediaEditor
  const mediaEditorIdx = storePageContent.indexOf('<MediaEditor')
  const afterMediaEditor = storePageContent.slice(mediaEditorIdx + 12)
  const nextEditorIdx = afterMediaEditor.indexOf('<MediaEditor')
  assert.strictEqual(nextEditorIdx, -1, 'MediaEditor must not appear as a generic fallback')

  // ProductEditor must be used for non-coaching product sections
  assert(storePageContent.includes('editingSection.type === \'product\' ? ('), 'ProductEditor must handle product sections')

  pass('Editor routing strictly selects BookingEditor for bookings and prevents silent Video editor fallback')
} catch (err) {
  fail('Editor Conditional Routing & No Silent Video Fallback', err)
}

// -------------------------------------------------------------------
// TEST 4: Dedicated Bookings Editor UI & Continue Setup
// -------------------------------------------------------------------
console.log('\n--- TEST 4: BookingEditor UI Structure ---')
try {
  assert(bookingEditorContent.includes('itemTypeLabel="Bookings"'), 'Header itemTypeLabel must be Bookings')
  assert(bookingEditorContent.includes('placeholder="Book a session"'), 'Title field placeholder must be Book a session')
  assert(bookingEditorContent.includes('StoreItemDisplaySelector'), 'Display section must exist with Classic and Featured cards')
  assert(bookingEditorContent.includes('Interaction'), 'Interaction section must exist')
  assert(bookingEditorContent.includes('Let visitors book and pay for time with you'), 'Bookings interaction description must exist')
  assert(bookingEditorContent.includes('Continue setup'), 'Continue setup button must exist')
  assert(bookingEditorContent.includes('setWizardOpen(true)'), 'Continue setup must open wizard modal')
  assert(bookingEditorContent.includes('editProductId={productId}'), 'Wizard modal must receive editProductId')

  pass('BookingEditor implements Bookings header, Info, Display, Interaction, and Continue setup button')
} catch (err) {
  fail('BookingEditor UI Structure', err)
}

// -------------------------------------------------------------------
// TEST 5: Verify Video URL Fields Are Not in BookingEditor
// -------------------------------------------------------------------
console.log('\n--- TEST 5: Verify Video Editor Fields Are Absent From BookingEditor ---')
try {
  assert(!bookingEditorContent.includes('Video URL'), 'BookingEditor must NOT include Video URL')
  assert(!bookingEditorContent.includes('Video Title'), 'BookingEditor must NOT include Video Title')
  assert(!bookingEditorContent.includes('Video Caption'), 'BookingEditor must NOT include Video Caption')
  assert(!bookingEditorContent.includes('Audio or Podcast URL'), 'BookingEditor must NOT include Audio URL')
  assert(!bookingEditorContent.includes('extractVideoEmbed'), 'BookingEditor must NOT parse video embeds')

  pass('Video URL, Title, Caption, and media parsing fields are completely absent from BookingEditor')
} catch (err) {
  fail('Verify Video Editor Fields Are Absent From BookingEditor', err)
}

// -------------------------------------------------------------------
// TEST 6: Real Database Data Integrity Check
// -------------------------------------------------------------------
console.log('\n--- TEST 6: Real Database Data Inspection ---')
try {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  const creatorId = 'fd747f7a-75f7-476c-bbf7-1c38d489cac1'
  const sections = await prisma.storeSection.findMany({ where: { creatorId } })
  const products = await prisma.product.findMany({ where: { creatorId } })

  const coachingProd = products.find(p => p.type === 'COACHING')
  assert(coachingProd, 'Creator must have a COACHING product')
  assert.strictEqual(coachingProd.title, 'Book a session', 'Coaching product title must be Book a session')

  // Find the booking section
  const bookingSec = sections.find(s => s.props?.productId === coachingProd.id || s.type === 'coaching' || s.type === 'booking')
  assert(bookingSec, 'Creator must have a store section linked to the coaching product')

  const { isBookingItem } = await import('../lib/bookingItemUtils.js')
  assert.strictEqual(
    isBookingItem(bookingSec, products),
    true,
    'isBookingItem must identify the real database booking section'
  )

  await prisma.$disconnect()
  pass('Database booking section for test creator correctly detected and linked to coaching product')
} catch (err) {
  fail('Real Database Data Inspection', err)
}

console.log('\n=====================================================================')
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`)
console.log('=====================================================================')

if (failed > 0) process.exit(1)
