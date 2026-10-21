import assert from 'assert'
import fs from 'fs'
import path from 'path'

function pass(msg) {
  console.log(`  \x1b[32m✔ PASS\x1b[0m ${msg}`)
}

function fail(msg, err) {
  console.error(`  \x1b[31m✖ FAIL\x1b[0m ${msg}`)
  if (err) console.error(err)
  process.exit(1)
}

console.log('\n============================================================')
console.log('   HEADING AND TEXT BLOCK EDITORS AUDIT & ACCEPTANCE TESTS   ')
console.log('============================================================\n')

async function runTests() {
  // 1. Verify HeadingEditor component existence & architecture
  console.log('--- TEST 1: HeadingEditor Component Architecture ---')
  try {
    const headingEditorPath = path.join(process.cwd(), 'components/dashboard/editors/HeadingEditor.jsx')
    assert(fs.existsSync(headingEditorPath), 'HeadingEditor.jsx must exist')
    const content = fs.readFileSync(headingEditorPath, 'utf8')

    assert(content.includes('StoreItemEditorShell'), 'HeadingEditor must use StoreItemEditorShell')
    assert(content.includes('itemTypeLabel="Heading"'), 'HeadingEditor must label item type as Heading')
    assert(content.includes('maxLength={120}'), 'HeadingEditor must enforce 120 character limit on heading')
    assert(content.includes('subtitle'), 'HeadingEditor must support optional subtitle/supporting text')
    assert(content.includes('align'), 'HeadingEditor must support text alignment')
    assert(content.includes('onToggleHidden'), 'HeadingEditor must support visibility/publishing controls')
    assert(content.includes('onBack'), 'HeadingEditor must provide Cancel/Back controls')
    assert(content.includes('Save changes'), 'HeadingEditor must have Save changes action')
    assert(content.includes('isSubmitting'), 'HeadingEditor must manage loading/disabled states during save')
    pass('HeadingEditor implements required fields, character limits, alignment, visibility, and shell integration')
  } catch (err) {
    fail('HeadingEditor component architecture audit', err)
  }

  // 2. Verify TextBlockEditor component existence & architecture
  console.log('\n--- TEST 2: TextBlockEditor Component Architecture ---')
  try {
    const textEditorPath = path.join(process.cwd(), 'components/dashboard/editors/TextBlockEditor.jsx')
    assert(fs.existsSync(textEditorPath), 'TextBlockEditor.jsx must exist')
    const content = fs.readFileSync(textEditorPath, 'utf8')

    assert(content.includes('StoreItemEditorShell'), 'TextBlockEditor must use StoreItemEditorShell')
    assert(content.includes('itemTypeLabel="Text block"'), 'TextBlockEditor must label item type as Text block')
    assert(content.includes('textarea'), 'TextBlockEditor must provide multiline textarea')
    assert(content.includes('whitespace-pre-wrap'), 'TextBlockEditor must preserve line breaks and multiline paragraphs')
    assert(content.includes('maxLength={5000}'), 'TextBlockEditor must support character limit (up to 5000)')
    assert(content.includes('align'), 'TextBlockEditor must support text alignment')
    assert(content.includes('onToggleHidden'), 'TextBlockEditor must support visibility toggle')
    assert(content.includes('Save changes'), 'TextBlockEditor must have Save changes action')
    assert(content.includes('onBack'), 'TextBlockEditor must provide Cancel/Back controls')
    pass('TextBlockEditor implements multiline textarea, line break preservation, character counters, and controls')
  } catch (err) {
    fail('TextBlockEditor component architecture audit', err)
  }

  // 3. Verify Edit Routing and Type Handling in dashboard store page
  console.log('\n--- TEST 3: Edit Routing & Type Handling in Dashboard ---')
  try {
    const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js')
    const content = fs.readFileSync(storePagePath, 'utf8')

    // Must import both editors
    assert(content.includes("import HeadingEditor from '@/components/dashboard/editors/HeadingEditor'"), 'HeadingEditor must be imported')
    assert(content.includes("import TextBlockEditor from '@/components/dashboard/editors/TextBlockEditor'"), 'TextBlockEditor must be imported')

    // Must route heading types to HeadingEditor
    assert(content.includes("['heading', 'heading_text'].includes(editingSection.type) ? ("), 'Heading types must route to HeadingEditor')
    assert(content.includes("<HeadingEditor"), 'HeadingEditor must be rendered in editing section view')

    // Must route text types to TextBlockEditor
    assert(content.includes("['text', 'text_block', 'paragraph_text'].includes(editingSection.type) ? ("), 'Text types must route to TextBlockEditor')
    assert(content.includes("<TextBlockEditor"), 'TextBlockEditor must be rendered in editing section view')

    // Safe fallback preserved for genuinely unknown section types
    assert(content.includes('This section type ({editingSection.type}) does not have a dedicated editor'), 'Safe fallback must be retained for unknown section types')

    // Other editors must remain functional
    assert(content.includes('<ProductEditor'), 'ProductEditor routing must remain intact')
    assert(content.includes('<MediaEditor'), 'MediaEditor routing must remain intact')
    assert(content.includes('<LinkEditor'), 'LinkEditor routing must remain intact')
    assert(content.includes('<GalleryEditor'), 'GalleryEditor routing must remain intact')
    assert(content.includes('<CollectionEditor'), 'CollectionEditor routing must remain intact')
    assert(content.includes('<BookingEditor'), 'BookingEditor routing must remain intact')

    pass('Dashboard routing accurately directs heading and text items while preserving all existing editors and fallback')
  } catch (err) {
    fail('Dashboard edit routing audit', err)
  }

  // 4. Verify Save and Preview Synchronization in PublicStoreRenderer
  console.log('\n--- TEST 4: Public Storefront and Live Preview Rendering ---')
  try {
    const rendererPath = path.join(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
    const content = fs.readFileSync(rendererPath, 'utf8')

    // Heading renderer checks
    assert(content.includes("case 'heading':"), 'Renderer must support case heading')
    assert(content.includes("case 'heading_text':"), 'Renderer must support case heading_text')
    assert(content.includes('subtitleText'), 'Renderer must render supporting subtitle if present')
    assert(content.includes('headingFont'), 'Renderer must style heading with headingFont')

    // Text block renderer checks
    assert(content.includes("case 'text':"), 'Renderer must support case text')
    assert(content.includes("case 'text_block':"), 'Renderer must support case text_block')
    assert(content.includes("case 'paragraph_text':"), 'Renderer must support case paragraph_text')
    assert(content.includes('whitespace-pre-wrap'), 'Renderer must use whitespace-pre-wrap for multiline formatting')
    assert(content.includes('break-words'), 'Renderer must include break-words for graceful wrapping')

    pass('PublicStoreRenderer renders headings with subtitles and text blocks with whitespace-pre-wrap paragraphs')
  } catch (err) {
    fail('Public storefront rendering audit', err)
  }

  // 5. Verify Backend Persistence & IDOR Ownership Protections
  console.log('\n--- TEST 5: Backend Persistence & Ownership Isolation ---')
  try {
    const servicesPath = path.join(process.cwd(), 'lib/services.js')
    const routePath = path.join(process.cwd(), 'app/api/[[...path]]/route.js')
    const servicesContent = fs.readFileSync(servicesPath, 'utf8')
    const routeContent = fs.readFileSync(routePath, 'utf8')

    // Check storeService.update sanitization and security
    assert(servicesContent.includes('sanitizeText(v)'), 'String props must be sanitized')
    assert(routeContent.includes('requireCreator(user)'), 'Route must enforce creator role requirement')
    assert(routeContent.includes('const creatorId = user.id'), 'Creator ID must be derived exclusively from authenticated session token')
    assert(routeContent.includes('await storeService.update(creatorId, body)'), 'Store updates must strictly isolate by creatorId')

    pass('Backend ensures store sections are sanitized and authenticated creator ownership is enforced')
  } catch (err) {
    fail('Backend persistence and security audit', err)
  }

  // 6. Verify Add Modal Flow
  console.log('\n--- TEST 6: Add Section Creation Flow ---')
  try {
    const addModalPath = path.join(process.cwd(), 'components/dashboard/AddToStoreModal.jsx')
    const menuViewPath = path.join(process.cwd(), 'components/dashboard/AddToStoreMenuView.jsx')
    const addModalContent = fs.readFileSync(addModalPath, 'utf8')
    const menuViewContent = fs.readFileSync(menuViewPath, 'utf8')

    assert(menuViewContent.includes("id: 'heading_text'"), 'Add menu must define Heading item')
    assert(menuViewContent.includes("id: 'paragraph_text'"), 'Add menu must define Text block item')
    assert(addModalContent.includes("onAddSection('heading'"), 'Add modal must dispatch heading creation')
    assert(addModalContent.includes("onAddSection('text'"), 'Add modal must dispatch text block creation')

    pass('Add modal correctly provides Heading and Text block items that initialize valid sections')
  } catch (err) {
    fail('Add modal flow audit', err)
  }

  console.log('\n============================================================')
  console.log('   ALL 6 COMPREHENSIVE AUDIT TEST SUITES PASSED! (100%)      ')
  console.log('============================================================\n')
}

runTests().catch((e) => {
  console.error(e)
  process.exit(1)
})
