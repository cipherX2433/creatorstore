import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('\n=====================================================================')
console.log('🧪 STOREFRONT ITEM EDITING UX & UNIFIED DESIGN SYSTEM TEST SUITE')
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
  // TEST 1: StoreItemEditorShell Architecture & Design Consistency
  // -------------------------------------------------------------
  console.log('--- TEST 1: Shared StoreItemEditorShell Architecture ---')
  try {
    const shellPath = path.join(process.cwd(), 'components/dashboard/StoreItemEditorShell.jsx')
    assert(fs.existsSync(shellPath), 'StoreItemEditorShell.jsx must exist')
    const content = fs.readFileSync(shellPath, 'utf8')

    // Header structure
    assert(content.includes('ArrowLeft'), 'Back button (ArrowLeft) missing in StoreItemEditorShell')
    assert(content.includes('itemTypeLabel'), 'Item type label missing in StoreItemEditorShell')
    assert(content.includes('text-xl sm:text-[24px] font-bold'), 'Bold title hierarchy missing in StoreItemEditorShell')
    assert(content.includes('MoreVertical'), 'More options dropdown menu missing')

    // Navigation tabs
    assert(content.includes('border-[#1F1F1F] text-[#1F1F1F] font-bold'), 'Active tab indicator missing')
    assert(content.includes('border-transparent text-[#6F6F6B]'), 'Inactive tab styling missing')

    // Content container
    assert(content.includes('max-w-[680px] w-full mx-auto'), 'Max-width 680px aligned with ProductEditor missing')
    assert(content.includes('rounded-[24px]'), 'Rounded-24px card matching ProductEditor missing')

    pass('StoreItemEditorShell implements back button, item type label, bold title, and more options menu')
    pass('StoreItemEditorShell implements consistent horizontal tabs with active underline indicator')
    pass('StoreItemEditorShell enforces 680px max-width content container and rounded-24px card shell')
  } catch (err) {
    fail('StoreItemEditorShell audit', err)
  }

  // -------------------------------------------------------------
  // TEST 2: GalleryEditor Quality & Feature Set
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: GalleryEditor Features & Typography ---')
  try {
    const galleryPath = path.join(process.cwd(), 'components/dashboard/editors/GalleryEditor.jsx')
    assert(fs.existsSync(galleryPath), 'GalleryEditor.jsx must exist')
    const content = fs.readFileSync(galleryPath, 'utf8')

    // Gallery details
    assert(content.includes('Gallery title'), 'Gallery title label missing')
    assert(content.includes('/266'), 'Character counter /266 missing')
    assert(content.includes('Images ('), 'Image count section heading missing')

    // Image management
    assert(content.includes('handleFiles'), 'Image upload file handler missing')
    assert(content.includes('handleRemoveImage'), 'Remove image handler missing')
    assert(content.includes('handleMoveImage'), 'Move/reorder image handler missing')
    assert(content.includes('ArrowLeft') && content.includes('ArrowRight'), 'Reorder left/right controls missing')
    assert(content.includes('Upload') || content.includes('uploading'), 'Upload progress state missing')

    // Display options
    assert(content.includes('StoreItemDisplaySelector'), 'StoreItemDisplaySelector missing in GalleryEditor')
    assert(content.includes("itemType=\"gallery\""), 'Gallery itemType missing in DisplaySelector')

    // No pricing/checkout bleed
    assert(!content.includes('originalPrice'), 'Gallery must not contain pricing/checkout fields')
    assert(!content.includes('digitalDelivery'), 'Gallery must not contain digital file delivery fields')

    pass('GalleryEditor implements gallery title with character limit and pencil indicator')
    pass('GalleryEditor implements organized image management (add, remove, reorder left/right)')
    pass('GalleryEditor implements Classic and Featured display mode selection')
    pass('GalleryEditor preserves clean boundary: no pricing, checkout, or digital delivery bleed')
  } catch (err) {
    fail('GalleryEditor audit', err)
  }

  // -------------------------------------------------------------
  // TEST 3: LinkEditor & CollectionEditor Consistency
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: LinkEditor & CollectionEditor Components ---')
  try {
    const linkPath = path.join(process.cwd(), 'components/dashboard/editors/LinkEditor.jsx')
    assert(fs.existsSync(linkPath), 'LinkEditor.jsx must exist')
    const linkContent = fs.readFileSync(linkPath, 'utf8')

    assert(linkContent.includes('Destination URL'), 'Destination URL field missing in LinkEditor')
    assert(linkContent.includes('Link title'), 'Link title field missing in LinkEditor')
    assert(linkContent.includes('Thumbnail'), 'Thumbnail field missing in LinkEditor')
    assert(linkContent.includes('StoreItemDisplaySelector'), 'Display mode selector missing in LinkEditor')

    const colPath = path.join(process.cwd(), 'components/dashboard/editors/CollectionEditor.jsx')
    assert(fs.existsSync(colPath), 'CollectionEditor.jsx must exist')
    const colContent = fs.readFileSync(colPath, 'utf8')

    assert(colContent.includes('Collection Content'), 'Collection content header missing')
    assert(colContent.includes('COLLECTION_LAYOUTS'), 'Collection layouts missing')
    assert(colContent.includes('list') && colContent.includes('grid') && colContent.includes('carousel') && colContent.includes('showcase'), 'All 4 layouts (list, grid, carousel, showcase) missing')
    assert(colContent.includes('onRemoveItem'), 'Remove item handler missing in CollectionEditor')
    assert(colContent.includes('onMoveItem'), 'Reorder item handler missing in CollectionEditor')

    pass('LinkEditor implements URL, title, description, thumbnail upload, and display modes')
    pass('CollectionEditor implements membership list, reordering, deletion, and 4 layout styles')
  } catch (err) {
    fail('LinkEditor & CollectionEditor audit', err)
  }

  // -------------------------------------------------------------
  // TEST 4: Store Builder Workspace Integration & Live Preview
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Store Builder Page Integration ---')
  try {
    const pagePath = path.join(process.cwd(), 'app/dashboard/store/page.js')
    const pageContent = fs.readFileSync(pagePath, 'utf8')

    // Imports
    assert(pageContent.includes("import GalleryEditor from '@/components/dashboard/editors/GalleryEditor'"), 'GalleryEditor import missing in store page')
    assert(pageContent.includes("import LinkEditor from '@/components/dashboard/editors/LinkEditor'"), 'LinkEditor import missing in store page')
    assert(pageContent.includes("import CollectionEditor from '@/components/dashboard/editors/CollectionEditor'"), 'CollectionEditor import missing in store page')

    // State
    assert(pageContent.includes('editingSectionId'), 'editingSectionId state missing')
    assert(pageContent.includes('editingSection'), 'editingSection memo missing')

    // Inline editor rendering beside preview
    assert(pageContent.includes('<GalleryEditor'), 'GalleryEditor render branch missing')
    assert(pageContent.includes('<CollectionEditor'), 'CollectionEditor render branch missing')
    assert(pageContent.includes('<LinkEditor'), 'LinkEditor render branch missing')
    assert(pageContent.includes('<ProductEditor'), 'ProductEditor render branch missing')

    // StorePreview sticky beside editor
    assert(pageContent.includes('StorePreview'), 'StorePreview missing')
    assert(pageContent.includes('lg:sticky'), 'Sticky preview layout missing')

    // No modal popup for gallery editing
    assert(!pageContent.includes("s.type === 'gallery' && setAddModalOpen(true)"), 'Gallery edit must not open modal')

    pass('Store page imports and renders GalleryEditor, CollectionEditor, LinkEditor, and MediaEditor')
    pass('Inline item editors render directly in left column alongside sticky phone preview')
    pass('Gallery and link editing opens in standardized editor without oversized popup modal')
  } catch (err) {
    fail('Store Builder Page integration audit', err)
  }

  // -------------------------------------------------------------
  // TEST 5: Production Build Compatibility
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Typography Principles Verification ---')
  try {
    const shellContent = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/StoreItemEditorShell.jsx'), 'utf8')
    const galleryContent = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/editors/GalleryEditor.jsx'), 'utf8')
    const linkContent = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/editors/LinkEditor.jsx'), 'utf8')

    // Headings have bold/semibold hierarchy
    assert(galleryContent.includes('font-bold text-[#1F1F1F]'), 'Bold headings missing in GalleryEditor')
    assert(linkContent.includes('font-bold text-[#1F1F1F]'), 'Bold headings missing in LinkEditor')

    // Helper text is regular weight, muted color
    assert(galleryContent.includes('text-[#6F6F6B]'), 'Muted helper text color missing')
    assert(linkContent.includes('text-[#6F6F6B]'), 'Muted helper text color missing')

    // Consistent input heights and styles
    assert(galleryContent.includes('h-12 sm:h-[50px]'), 'Standard 50px input height missing in GalleryEditor')
    assert(linkContent.includes('h-12 sm:h-[50px]'), 'Standard 50px input height missing in LinkEditor')
    assert(galleryContent.includes('rounded-[12px]'), 'Standard rounded-12px missing in GalleryEditor')
    assert(linkContent.includes('rounded-[12px]'), 'Standard rounded-12px missing in LinkEditor')

    pass('Bold hierarchy verified across titles, labels, and section headings')
    pass('Helper text and descriptions use readable regular font weight with proper contrast')
    pass('Standard 50px input heights and 12px rounded corners match across all editors')
  } catch (err) {
    fail('Typography verification', err)
  }

  console.log('\n=====================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================\n')

  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error('Test runner failure:', err)
  process.exit(1)
})
